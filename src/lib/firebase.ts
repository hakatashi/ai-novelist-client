import {initializeApp} from 'firebase/app';
import {
	connectAuthEmulator,
	GoogleAuthProvider,
	getAuth,
	signInWithPopup,
	signOut,
} from 'firebase/auth';
import {
	type CollectionReference,
	collection,
	connectFirestoreEmulator,
	getFirestore,
} from 'firebase/firestore';
import {connectFunctionsEmulator, getFunctions} from 'firebase/functions';
import {isServer} from 'solid-js/web';
import type {Novel} from './schema.ts';

const firebaseConfigResponse = await fetch('/__/firebase/init.json');
const firebaseConfig = await firebaseConfigResponse.json();

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

const db = getFirestore(app);

const functions = getFunctions(app);

if (import.meta.env.DEV && !isServer) {
	connectFirestoreEmulator(db, 'localhost', 9935);
	connectAuthEmulator(auth, 'http://localhost:9099');
	connectFunctionsEmulator(functions, 'localhost', 5001);
}

const Novels = collection(db, 'novels') as CollectionReference<Novel>;

export const signInWithGoogle = () =>
	signInWithPopup(auth, new GoogleAuthProvider());

export const signOutUser = () => signOut(auth);

export {app as default, auth, db, functions, Novels};
