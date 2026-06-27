import {useAuth} from 'solid-firebase';
import {type ParentComponent, Show} from 'solid-js';
import {auth, signInWithGoogle, signOutUser} from './firebase.ts';

const ALLOWED_EMAIL = 'hakatasiloving@gmail.com';

const AuthGuard: ParentComponent = (props) => {
	const authState = useAuth(auth);

	return (
		<Show when={!authState.loading} fallback={<div class="auth-loading" />}>
			<Show
				when={authState.data}
				fallback={
					<div class="auth-screen">
						<div class="auth-card">
							<h1>AI小説執筆支援</h1>
							<p>続けるにはGoogleアカウントでログインしてください。</p>
							<button
								type="button"
								class="sign-in-button"
								onClick={signInWithGoogle}
							>
								Googleでログイン
							</button>
						</div>
					</div>
				}
			>
				{(user) => (
					<Show
						when={user().email === ALLOWED_EMAIL}
						fallback={
							<div class="auth-screen">
								<div class="auth-card">
									<h1>アクセス拒否</h1>
									<p>このアプリにアクセスする権限がありません。</p>
									<p class="auth-email">{user().email}</p>
									<button
										type="button"
										class="sign-out-button"
										onClick={signOutUser}
									>
										ログアウト
									</button>
								</div>
							</div>
						}
					>
						{props.children}
					</Show>
				)}
			</Show>
		</Show>
	);
};

export default AuthGuard;
