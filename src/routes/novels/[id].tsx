import {useParams} from '@solidjs/router';
import {doc, Timestamp, updateDoc} from 'firebase/firestore';
import {httpsCallable} from 'firebase/functions';
import {useFirestore} from 'solid-firebase';
import {type Component, createEffect, createSignal, onCleanup} from 'solid-js';
import Doc from '~/lib/Doc';
import {db, functions, Novels} from '~/lib/firebase';
import type {Novel} from '~/lib/schema.ts';
import styles from './[id].module.css';

interface GenerateRequest {
	novelId: string;
	model: string;
	prompt: string;
	params: {temperature: number; maxTokens: number};
}

interface GenerateResponse {
	text: string;
	generationId: string;
}

const generateCompletion = httpsCallable<GenerateRequest, GenerateResponse>(
	functions,
	'generateCompletion',
);

const Editor: Component = () => {
	const params = useParams<{id: string}>();
	const novelRef = () => doc(Novels, params.id);
	const novelData = useFirestore(() => novelRef());

	const [title, setTitle] = createSignal('');
	const [body, setBody] = createSignal('');
	const [saveStatus, setSaveStatus] = createSignal<
		'saved' | 'saving' | 'unsaved'
	>('saved');
	const [temperature, setTemperature] = createSignal(1.0);
	const [maxTokens, setMaxTokens] = createSignal(256);
	const [isGenerating, setIsGenerating] = createSignal(false);
	const [generateError, setGenerateError] = createSignal('');

	let titleInitialized = false;
	let bodyInitialized = false;
	let saveTimer: ReturnType<typeof setTimeout> | undefined;

	createEffect(() => {
		const data = novelData.data as Novel | null | undefined;
		if (!data) return;
		if (!titleInitialized) {
			setTitle(data.title ?? '');
			titleInitialized = true;
		}
		if (!bodyInitialized) {
			setBody(data.body ?? '');
			bodyInitialized = true;
		}
	});

	onCleanup(() => {
		if (saveTimer !== undefined) clearTimeout(saveTimer);
	});

	const scheduleSave = (newTitle: string, newBody: string) => {
		setSaveStatus('unsaved');
		if (saveTimer !== undefined) clearTimeout(saveTimer);
		saveTimer = setTimeout(async () => {
			setSaveStatus('saving');
			try {
				await updateDoc(doc(db, 'novels', params.id), {
					title: newTitle,
					body: newBody,
					updatedAt: Timestamp.now(),
				});
				setSaveStatus('saved');
			} catch (_e) {
				setSaveStatus('unsaved');
			}
		}, 2000);
	};

	const onTitleInput = (e: InputEvent & {currentTarget: HTMLInputElement}) => {
		const value = e.currentTarget.value;
		setTitle(value);
		scheduleSave(value, body());
	};

	const onBodyInput = (
		e: InputEvent & {currentTarget: HTMLTextAreaElement},
	) => {
		const value = e.currentTarget.value;
		setBody(value);
		scheduleSave(title(), value);
	};

	const generate = async () => {
		setIsGenerating(true);
		setGenerateError('');
		try {
			const result = await generateCompletion({
				novelId: params.id,
				model: 'gemini',
				prompt: body(),
				params: {temperature: temperature(), maxTokens: maxTokens()},
			});
			const newBody = body() + result.data.text;
			setBody(newBody);
			scheduleSave(title(), newBody);
		} catch (e) {
			setGenerateError(e instanceof Error ? e.message : '生成に失敗しました');
		} finally {
			setIsGenerating(false);
		}
	};

	return (
		<div class={styles.layout}>
			<div class={styles.editorPane}>
				<div class={styles.titleRow}>
					<input
						id="novel-title"
						class={styles.titleInput}
						type="text"
						value={title()}
						onInput={onTitleInput}
						placeholder="タイトル"
					/>
					<span class={styles.saveStatus}>
						{saveStatus() === 'saving'
							? '保存中...'
							: saveStatus() === 'unsaved'
								? '未保存'
								: '保存済み'}
					</span>
				</div>
				<Doc data={novelData} fallback={<span>読み込み中...</span>}>
					{() => (
						<textarea
							class={styles.bodyTextarea}
							value={body()}
							onInput={onBodyInput}
							placeholder="本文を入力してください..."
						/>
					)}
				</Doc>
			</div>

			<aside class={styles.sidebar}>
				<h2 class={styles.sidebarTitle}>AI設定</h2>

				<div class={styles.field}>
					<label for="model-select" class={styles.label}>
						モデル
					</label>
					<select id="model-select" class={styles.select} disabled>
						<option value="gemini">Gemini</option>
					</select>
				</div>

				<div class={styles.field}>
					<label for="temperature-range" class={styles.label}>
						Temperature: {temperature().toFixed(1)}
					</label>
					<input
						id="temperature-range"
						type="range"
						min="0"
						max="2"
						step="0.1"
						value={temperature()}
						onInput={(e) => setTemperature(Number(e.currentTarget.value))}
						class={styles.range}
					/>
				</div>

				<div class={styles.field}>
					<label for="max-tokens-input" class={styles.label}>
						最大トークン数
					</label>
					<input
						id="max-tokens-input"
						type="number"
						min="64"
						max="2048"
						step="64"
						value={maxTokens()}
						onInput={(e) => setMaxTokens(Number(e.currentTarget.value))}
						class={styles.numberInput}
					/>
				</div>

				<button
					type="button"
					class={styles.generateButton}
					onClick={generate}
					disabled={isGenerating()}
				>
					{isGenerating() ? '生成中...' : '▶ 続きを生成'}
				</button>

				{generateError() && <p class={styles.error}>{generateError()}</p>}
			</aside>
		</div>
	);
};

export default Editor;
