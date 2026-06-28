import {ApiError, GoogleGenAI} from '@google/genai';
import {initializeApp} from 'firebase-admin/app';
import {
	type CollectionReference,
	getFirestore,
	Timestamp,
} from 'firebase-admin/firestore';
import {info as loggerInfo} from 'firebase-functions/logger';
import {defineSecret} from 'firebase-functions/params';
import {HttpsError, onCall} from 'firebase-functions/v2/https';
import {z} from 'zod';
import type {Generation, GenerationParams} from '../../src/lib/schema.ts';

if (process.env.FUNCTIONS_EMULATOR === 'true') {
	process.env.FIRESTORE_EMULATOR_HOST = 'localhost:9935';
}

const app = initializeApp();
const db = getFirestore(app);

const geminiApiKey = defineSecret('GEMINI_API_KEY');
const ainovelApiKey = defineSecret('AINOBEL_API_KEY');

const ALLOWED_EMAIL = 'hakatasiloving@gmail.com';

const AINOVEL_API_URL = 'https://api.tringpt.com/api';

const aiNovelResponseSchema = z.object({
	data: z.object({
		'0': z.string(),
		choices: z.array(
			z.object({
				finish_reason: z.string(),
				index: z.number(),
				logprobs: z.null(),
				prompt_logprobs: z.null(),
				stop_reason: z.null(),
				text: z.string(),
			}),
		),
		created: z.number(),
		id: z.string(),
		model: z.string(),
		object: z.string(),
		usage: z.object({
			completion_tokens: z.number(),
			prompt_tokens: z.number(),
			total_tokens: z.number(),
		}),
	}),
});

const aiNovelErrorSchema = z.object({error: z.string()});

export const generateCompletion = onCall(
	{secrets: [geminiApiKey, ainovelApiKey]},
	async (request) => {
		if (!request.auth || request.auth.token.email !== ALLOWED_EMAIL) {
			throw new HttpsError('permission-denied', 'Unauthorized');
		}

		const {novelId, model, prompt, params} = request.data as {
			novelId: string;
			model: string;
			prompt: string;
			params: GenerationParams;
		};

		if (!novelId || !prompt) {
			throw new HttpsError(
				'invalid-argument',
				'novelId and prompt are required',
			);
		}

		loggerInfo('Generating completion', {novelId, model});
		const startMs = Date.now();

		let text: string;

		if (model === 'gemini') {
			const ai = new GoogleGenAI({apiKey: geminiApiKey.value()});
			try {
				const response = await ai.models.generateContent({
					model: params.geminiModel ?? 'gemini-3.1-flash-lite',
					contents: prompt,
					config: {
						systemInstruction:
							'あなたは小説の文章補完エンジンです。' +
							'ユーザーが入力した小説の本文の続きを、同じ文体・語り口・視点で自然に書き続けてください。' +
							'解説・感想・コメント・提案は一切出力しないでください。' +
							'続きの本文のみを出力してください。',
						temperature: params.temperature,
						maxOutputTokens: params.maxTokens,
						topP: params.topP,
						topK: params.topK,
						frequencyPenalty: params.frequencyPenalty,
						presencePenalty: params.presencePenalty,
						...(params.seed !== null &&
							params.seed !== undefined && {seed: params.seed}),
						...(params.stopSequences?.length && {
							stopSequences: params.stopSequences,
						}),
					},
				});
				text = response.text ?? '';
			} catch (e) {
				if (e instanceof ApiError && e.status === 400) {
					throw new HttpsError(
						'invalid-argument',
						'入力内容がGoogleのポリシーに違反しているため、補完できませんでした。本文を修正してから再試行してください。',
					);
				}
				throw new HttpsError(
					'internal',
					'生成中にエラーが発生しました。しばらく経ってから再試行してください。',
				);
			}
		} else if (model === 'ainovel') {
			const body: Record<string, unknown> = {
				text: prompt,
				length: params.maxTokens,
				model: params.ainovelModel ?? 'derrida_03',
				temperature: params.temperature,
				top_p: params.topP,
				top_k: params.topK,
			};
			if (params.topA !== undefined) body.top_a = params.topA;
			if (params.minP !== undefined) body.min_p = params.minP;
			if (params.typicalP !== undefined) body.typical_p = params.typicalP;
			if (params.tailfree !== undefined) body.tailfree = params.tailfree;
			if (params.repPen !== undefined) body.rep_pen = params.repPen;
			if (params.repPenRange !== undefined)
				body.rep_pen_range = params.repPenRange;
			if (params.repPenSlope !== undefined)
				body.rep_pen_slope = params.repPenSlope;
			if (params.repPenPres !== undefined)
				body.rep_pen_pres = params.repPenPres;
			if (params.stopTokens) body.stoptokens = params.stopTokens;
			if (params.multilingualMode !== undefined)
				body.multilingual_mode = params.multilingualMode;

			const res = await fetch(AINOVEL_API_URL, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${ainovelApiKey.value()}`,
				},
				body: JSON.stringify(body),
			});
			if (!res.ok) {
				throw new HttpsError(
					'internal',
					`AIのべりすとAPIエラー: ${res.status} ${res.statusText}`,
				);
			}
			const rawJson: unknown = await res.json();
			const errorResult = aiNovelErrorSchema.safeParse(rawJson);
			if (errorResult.success) {
				throw new HttpsError(
					'internal',
					`AIのべりすとAPIエラー: ${errorResult.data.error}`,
				);
			}
			const parsed = aiNovelResponseSchema.safeParse(rawJson);
			if (!parsed.success) {
				throw new HttpsError(
					'internal',
					`AIのべりすとAPIレスポンスの形式が不正です: ${parsed.error.message}`,
				);
			}
			text = parsed.data.data['0'] ?? '';
		} else {
			throw new HttpsError('invalid-argument', `Unsupported model: ${model}`);
		}

		const durationMs = Date.now() - startMs;

		const generations = db
			.collection('novels')
			.doc(novelId)
			.collection('generations') as CollectionReference<Generation>;

		const genRef = generations.doc();
		await genRef.set({
			prompt,
			response: text,
			model: model as Generation['model'],
			params,
			createdAt: Timestamp.now(),
			durationMs,
		});

		loggerInfo('Generation complete', {genId: genRef.id, durationMs});

		return {text, generationId: genRef.id};
	},
);
