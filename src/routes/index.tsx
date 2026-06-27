import {A, useNavigate} from '@solidjs/router';
import {
	doc,
	orderBy,
	query,
	setDoc,
	Timestamp,
	where,
} from 'firebase/firestore';
import {useAuth, useFirestore} from 'solid-firebase';
import {type Component, createMemo} from 'solid-js';
import Collection from '~/lib/Collection';
import {auth, Novels} from '~/lib/firebase';
import styles from './index.module.css';

const Index: Component = () => {
	const authState = useAuth(auth);
	const navigate = useNavigate();

	const novelsData = useFirestore(
		createMemo(() =>
			query(
				Novels,
				where('uid', '==', authState.data?.uid ?? ''),
				orderBy('updatedAt', 'desc'),
			),
		),
	);

	const createNovel = async () => {
		const user = authState.data;
		if (!user) return;
		const newRef = doc(Novels);
		await setDoc(newRef, {
			novelId: newRef.id,
			title: '無題',
			body: '',
			uid: user.uid,
			createdAt: Timestamp.now(),
			updatedAt: Timestamp.now(),
		});
		navigate(`/novels/${newRef.id}`);
	};

	const formatDate = (ts: {toDate(): Date} | undefined) => {
		if (!ts) return '';
		return ts.toDate().toLocaleString('ja-JP', {
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
		});
	};

	return (
		<div class={styles.container}>
			<header class={styles.header}>
				<h1 class={styles.title}>作品一覧</h1>
				<button type="button" class={styles.createButton} onClick={createNovel}>
					＋ 新規作成
				</button>
			</header>
			<Collection
				data={novelsData}
				empty={
					<p class={styles.empty}>作品がありません。新規作成してみましょう。</p>
				}
			>
				{(novel) => (
					<A href={`/novels/${novel.novelId}`} class={styles.novelCard}>
						<span class={styles.novelTitle}>{novel.title || '無題'}</span>
						<span class={styles.novelDate}>{formatDate(novel.updatedAt)}</span>
					</A>
				)}
			</Collection>
		</div>
	);
};

export default Index;
