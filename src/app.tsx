import {Router} from '@solidjs/router';
import {FileRoutes} from '@solidjs/start/router';
import {FirebaseProvider} from 'solid-firebase';
import {Suspense} from 'solid-js';
import AuthGuard from '~/lib/AuthGuard';
import app from '~/lib/firebase';
import './app.css';

export default function App() {
	return (
		<FirebaseProvider app={app}>
			<AuthGuard>
				<Router root={(props) => <Suspense>{props.children}</Suspense>}>
					<FileRoutes />
				</Router>
			</AuthGuard>
		</FirebaseProvider>
	);
}
