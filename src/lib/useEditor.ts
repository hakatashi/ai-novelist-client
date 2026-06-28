import {useParams} from '@solidjs/router';
import {doc, Timestamp, updateDoc} from 'firebase/firestore';
import {httpsCallable} from 'firebase/functions';
import {useFirestore} from 'solid-firebase';
import {createEffect, createSignal, onCleanup} from 'solid-js';
import {isServer} from 'solid-js/web';
import {db, functions, Novels} from '~/lib/firebase';
import type {GenerationParams, Novel} from '~/lib/schema.ts';

export interface GeminiAdvancedSettings {
	geminiModel: string;
	topP: number;
	topK: number;
	frequencyPenalty: number;
	presencePenalty: number;
	seed: number | null;
	stopSequences: string[];
}

export interface AiNovelAdvancedSettings {
	ainovelModel: string;
	topP: number;
	topK: number;
	topA: number;
	minP: number;
	typicalP: number;
	tailfree: number;
	repPen: number;
	repPenRange: number;
	repPenSlope: number;
	repPenPres: number;
	stopTokens: string;
	multilingualMode: boolean;
}

interface NovelSettings {
	model: 'gemini' | 'ainovel';
	temperature: number;
	maxTokens: number;
	geminiAdvanced: GeminiAdvancedSettings;
	ainovelAdvanced: AiNovelAdvancedSettings;
}

const DEFAULT_GEMINI_ADVANCED: GeminiAdvancedSettings = {
	geminiModel: 'gemini-3.1-flash-lite',
	topP: 0.95,
	topK: 40,
	frequencyPenalty: 0,
	presencePenalty: 0,
	seed: null,
	stopSequences: [],
};

const DEFAULT_AINOVEL_ADVANCED: AiNovelAdvancedSettings = {
	ainovelModel: 'derrida_03',
	topP: 0.9,
	topK: 40,
	topA: 0,
	minP: 0,
	typicalP: 1.0,
	tailfree: 1.0,
	repPen: 1.1,
	repPenRange: 512,
	repPenSlope: 0.7,
	repPenPres: 0,
	stopTokens: '',
	multilingualMode: false,
};

function loadNovelSettings(novelId: string): Partial<NovelSettings> {
	if (isServer) return {};
	try {
		const raw = localStorage.getItem(`novel-settings-${novelId}`);
		return raw ? (JSON.parse(raw) as Partial<NovelSettings>) : {};
	} catch {
		return {};
	}
}

function saveNovelSettings(novelId: string, settings: NovelSettings): void {
	if (isServer) return;
	localStorage.setItem(`novel-settings-${novelId}`, JSON.stringify(settings));
}

interface GenerateRequest {
	novelId: string;
	model: string;
	prompt: string;
	params: GenerationParams;
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

	const savedSettings = loadNovelSettings(params.id);
	const [model, setModel] = createSignal<'gemini' | 'ainovel'>(
		savedSettings.model ?? 'gemini',
	);
	const [temperature, setTemperature] = createSignal(
		savedSettings.temperature ?? 1.0,
	);
	const [maxTokens, setMaxTokens] = createSignal(
		savedSettings.maxTokens ?? 256,
	);
	const [geminiAdvanced, setGeminiAdvanced] =
		createSignal<GeminiAdvancedSettings>({
			...DEFAULT_GEMINI_ADVANCED,
			...(savedSettings.geminiAdvanced ?? {}),
		});
	const [ainovelAdvanced, setAinovelAdvanced] =
		createSignal<AiNovelAdvancedSettings>({
			...DEFAULT_AINOVEL_ADVANCED,
			...(savedSettings.ainovelAdvanced ?? {}),
		});

	const [isGenerating, setIsGenerating] = createSignal(false);
	const [generateError, setGenerateError] = createSignal('');

	createEffect(() => {
		saveNovelSettings(params.id, {
			model: model(),
			temperature: temperature(),
			maxTokens: maxTokens(),
			geminiAdvanced: geminiAdvanced(),
			ainovelAdvanced: ainovelAdvanced(),
		});
	});

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
			const gAdv = geminiAdvanced();
			const aAdv = ainovelAdvanced();
			const genParams: GenerationParams =
				model() === 'gemini'
					? {
							temperature: temperature(),
							maxTokens: maxTokens(),
							geminiModel: gAdv.geminiModel,
							topP: gAdv.topP,
							topK: gAdv.topK,
							frequencyPenalty: gAdv.frequencyPenalty,
							presencePenalty: gAdv.presencePenalty,
							seed: gAdv.seed,
							stopSequences: gAdv.stopSequences,
						}
					: {
							temperature: temperature(),
							maxTokens: maxTokens(),
							ainovelModel: aAdv.ainovelModel,
							topP: aAdv.topP,
							topK: aAdv.topK,
							topA: aAdv.topA,
							minP: aAdv.minP,
							typicalP: aAdv.typicalP,
							tailfree: aAdv.tailfree,
							repPen: aAdv.repPen,
							repPenRange: aAdv.repPenRange,
							repPenSlope: aAdv.repPenSlope,
							repPenPres: aAdv.repPenPres,
							stopTokens: aAdv.stopTokens,
							multilingualMode: aAdv.multilingualMode,
						};

			const result = await generateCompletion({
				novelId: params.id,
				model: model(),
				prompt: body(),
				params: genParams,
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
		geminiAdvanced,
		setGeminiAdvanced,
		ainovelAdvanced,
		setAinovelAdvanced,
		isGenerating,
		generateError,
		onTitleInput,
		onBodyInput,
		generate,
	};
}
