import type {DocumentData, FirestoreError, Timestamp} from 'firebase/firestore';

export interface UseFireStoreReturn<T> {
	data: T;
	loading: boolean;
	error: FirestoreError | null;
}

export interface Novel extends DocumentData {
	novelId: string;
	uid: string;
	title: string;
	body: string;
	createdAt: Timestamp;
	updatedAt: Timestamp;
}

export interface Generation extends DocumentData {
	prompt: string;
	response: string;
	model: 'gemini' | 'ollama' | 'ainovel';
	params: {
		temperature: number;
		maxTokens: number;
	};
	createdAt: Timestamp;
	durationMs: number;
}
