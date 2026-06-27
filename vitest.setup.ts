import {beforeEach, vi} from 'vitest';

const TEST_EMAIL = 'hakatasiloving@gmail.com';
const TEST_PASSWORD = 'testpassword123';

const originalFetch = global.fetch;
const fetchMock = vi.fn<typeof fetch>((...args) => {
	const [url] = args;
	if (url === '/__/firebase/init.json') {
		return Promise.resolve(
			new Response(
				JSON.stringify({
					apiKey: 'fakeApiKey',
					projectId: 'ai-novelist-client',
				}),
			),
		);
	}
	return originalFetch(...args);
});
vi.stubGlobal('fetch', fetchMock);

beforeEach(async () => {
	// Reset firestore data
	await originalFetch(
		'http://localhost:9935/emulator/v1/projects/ai-novelist-client/databases/(default)/documents',
		{method: 'DELETE'},
	);
	// Reset auth emulator data
	await originalFetch(
		'http://localhost:9099/emulator/v1/projects/ai-novelist-client/accounts',
		{method: 'DELETE'},
	);
	// Wait a bit for the deletion to complete
	await new Promise((resolve) => setTimeout(resolve, 100));

	// Sign in as the test user (dynamic import to avoid running firebase.ts before fetch mock is set up)
	const [{auth}, {createUserWithEmailAndPassword}] = await Promise.all([
		import('~/lib/firebase'),
		import('firebase/auth'),
	]);
	await createUserWithEmailAndPassword(auth, TEST_EMAIL, TEST_PASSWORD);
});
