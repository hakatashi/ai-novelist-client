import {render, waitFor} from '@solidjs/testing-library';
import {expect, test} from 'vitest';
import Index from './index.js';

test('has create novel button', async () => {
	const {getByRole} = render(() => <Index />);
	const createButton = getByRole('button');
	expect(createButton).toHaveTextContent('新規作成');
});

test('shows empty state when no novels exist', async () => {
	const {findByText} = render(() => <Index />);
	const emptyMessage = await waitFor(
		() => findByText('作品がありません。新規作成してみましょう。'),
		{timeout: 5000},
	);
	expect(emptyMessage).toBeTruthy();
});
