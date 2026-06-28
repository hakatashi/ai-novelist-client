import {useParams} from '@solidjs/router';
import {doc, Timestamp, updateDoc} from 'firebase/firestore';
import {httpsCallable} from 'firebase/functions';
import {useFirestore} from 'solid-firebase';
import {createEffect, createSignal, onCleanup} from 'solid-js';
import {db, functions, Novels} from '~/lib/firebase';
import type {Novel} from '~/lib/schema.ts';

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

export function useEditor() {
	const params = useParams<{id: string}>();
	const novelRef = () => doc(Novels, params.id);
	const novelData = useFirestore(() => novelRef());

	const [title, setTitle] = createSignal('');
	const [body, setBody] = createSignal('');
	const [saveStatus, setSaveStatus] = createSignal<
		'saved' | 'saving' | 'unsaved'
	>('saved');
	const [model, setModel] = createSignal<'gemini' | 'ainovel'>('gemini');
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
				model: model(),
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

	return {
		novelData,
		title,
		body,
		saveStatus,
		model,
		setModel,
		temperature,
		setTemperature,
		maxTokens,
		setMaxTokens,
		isGenerating,
		generateError,
		onTitleInput,
		onBodyInput,
		generate,
	};
}
