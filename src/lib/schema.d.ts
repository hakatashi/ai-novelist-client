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

export interface GenerationParams {
	temperature: number;
	maxTokens: number;
	// Gemini-specific
	geminiModel?: string;
	topP?: number;
	topK?: number;
	frequencyPenalty?: number;
	presencePenalty?: number;
	seed?: number | null;
	stopSequences?: string[];
	// AIのべりすと-specific
	ainovelModel?: string;
	topA?: number;
	minP?: number;
	typicalP?: number;
	tailfree?: number;
	repPen?: number;
	repPenRange?: number;
	repPenSlope?: number;
	repPenPres?: number;
	stopTokens?: string;
	multilingualMode?: boolean;
	// Ollama-specific
	ollamaModel?: string;
	ollamaMinP?: number;
	ollamaTfsZ?: number;
	ollamaTypicalP?: number;
	ollamaRepeatPenalty?: number;
	ollamaRepeatLastN?: number;
	ollamaPresencePenalty?: number;
	ollamaFrequencyPenalty?: number;
}

export interface Generation extends DocumentData {
	prompt: string;
	response: string;
	model: 'gemini' | 'ollama' | 'ainovel';
	params: GenerationParams;
	createdAt: Timestamp;
	durationMs: number;
}
