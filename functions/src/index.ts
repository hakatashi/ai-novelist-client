import {GoogleGenerativeAI} from '@google/generative-ai';
import {initializeApp} from 'firebase-admin/app';
import {
	type CollectionReference,
	getFirestore,
	Timestamp,
} from 'firebase-admin/firestore';
import {info as loggerInfo} from 'firebase-functions/logger';
import {defineSecret} from 'firebase-functions/params';
import {HttpsError, onCall} from 'firebase-functions/v2/https';
import type {Generation} from '../../src/lib/schema.ts';

if (process.env.FUNCTIONS_EMULATOR === 'true') {
	process.env.FIRESTORE_EMULATOR_HOST = 'localhost:9935';
}

const app = initializeApp();
const db = getFirestore(app);

const geminiApiKey = defineSecret('GEMINI_API_KEY');

const ALLOWED_EMAIL = 'hakatasiloving@gmail.com';

export const generateCompletion = onCall(
	{secrets: [geminiApiKey]},
	async (request) => {
		if (!request.auth || request.auth.token.email !== ALLOWED_EMAIL) {
			throw new HttpsError('permission-denied', 'Unauthorized');
		}

		const {novelId, model, prompt, params} = request.data as {
			novelId: string;
			model: string;
			prompt: string;
			params: {temperature: number; maxTokens: number};
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
			const genAI = new GoogleGenerativeAI(geminiApiKey.value());
			const geminiModel = genAI.getGenerativeModel({
				model: 'gemini-3.1-flash-lite',
				systemInstruction:
					'あなたは小説の文章補完エンジンです。' +
					'ユーザーが入力した小説の本文の続きを、同じ文体・語り口・視点で自然に書き続けてください。' +
					'解説・感想・コメント・提案は一切出力しないでください。' +
					'続きの本文のみを出力してください。',
				generationConfig: {
					temperature: params.temperature,
					maxOutputTokens: params.maxTokens,
				},
			});
			const result = await geminiModel.generateContent(prompt);
			text = result.response.text();
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
