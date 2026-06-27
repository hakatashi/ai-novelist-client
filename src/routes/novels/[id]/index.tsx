import {For, Show, type Component, createSignal} from 'solid-js';
import {isServer} from 'solid-js/web';
import Doc from '~/lib/Doc';
import {useEditor} from '~/lib/useEditor';
import styles from './index.module.css';

type ColorTheme = 'cream' | 'light' | 'dark';
type FontKey = 'notoSerif' | 'yuGothic' | 'notoSans' | 'tsukuMin' | 'ryumin';

type CSSVars = Record<`--${string}`, string>;

const THEMES: Record<ColorTheme, CSSVars> = {
	cream: {
		'--bg': '#faf7f2',
		'--text': '#2c2416',
		'--border': '#e8e2d8',
		'--muted': '#b4a090',
		'--settings-bg': '#ffffff',
		'--settings-border': '#e8e2d8',
		'--settings-text': '#5c4c3c',
		'--gear-hover': '#ede8e0',
		'--accent': '#8a6c50',
		'--accent-hover': '#7a5c40',
		'--accent-disabled': '#c8b8a0',
		'--placeholder': '#c8b8a0',
		'--range-accent': '#8a6c50',
		'--toggle-active-text': '#ffffff',
	},
	light: {
		'--bg': '#ffffff',
		'--text': '#111827',
		'--border': '#e5e7eb',
		'--muted': '#9ca3af',
		'--settings-bg': '#ffffff',
		'--settings-border': '#e5e7eb',
		'--settings-text': '#374151',
		'--gear-hover': '#f3f4f6',
		'--accent': '#4f46e5',
		'--accent-hover': '#4338ca',
		'--accent-disabled': '#a5b4fc',
		'--placeholder': '#d1d5db',
		'--range-accent': '#4f46e5',
		'--toggle-active-text': '#ffffff',
	},
	dark: {
		'--bg': '#1e1e28',
		'--text': '#e8e3db',
		'--border': '#2e2e3e',
		'--muted': '#6b6b8a',
		'--settings-bg': '#151520',
		'--settings-border': '#2e2e3e',
		'--settings-text': '#a0a0c0',
		'--gear-hover': '#2a2a3a',
		'--accent': '#7c6dff',
		'--accent-hover': '#6c5de8',
		'--accent-disabled': '#3d3d6a',
		'--placeholder': '#4a4a60',
		'--range-accent': '#7c6dff',
		'--toggle-active-text': '#ffffff',
	},
};

const FONTS: Record<FontKey, string> = {
	notoSerif: "'Noto Serif CJK JP', 'Yu Mincho', 'ProN', serif",
	yuGothic: "'Yu Gothic', 'Hiragino Sans', 'Meiryo', sans-serif",
	notoSans: "'Noto Sans CJK JP', 'Yu Gothic UI', 'Hiragino Sans', sans-serif",
	tsukuMin: "'FOT-TsukuMin Pro', 'Hiragino Mincho Pro', 'Yu Mincho', serif",
	ryumin: "'A-OTF Ryumin Pr5 KL', 'Hiragino Mincho Pro', 'Yu Mincho', serif",
};

const THEME_LABELS: Record<ColorTheme, string> = {
	cream: 'クリーム',
	light: 'ライト',
	dark: 'ダーク',
};

const FONT_LABELS: Record<FontKey, string> = {
	notoSerif: 'Noto Serif',
	yuGothic: '游ゴシック',
	notoSans: 'Noto Sans',
	tsukuMin: '筑紫明朝',
	ryumin: 'リュウミン',
};

function loadPref<T extends string>(key: string, fallback: T): T {
	if (isServer) return fallback;
	return (localStorage.getItem(key) as T) ?? fallback;
}

function savePref(key: string, value: string): void {
	if (isServer) return;
	localStorage.setItem(key, value);
}

const Editor: Component = () => {
	const {
		novelData,
		title,
		body,
		saveStatus,
		temperature,
		setTemperature,
		maxTokens,
		setMaxTokens,
		isGenerating,
		generateError,
		onTitleInput,
		onBodyInput,
		generate,
	} = useEditor();

	const [settingsOpen, setSettingsOpen] = createSignal(false);
	let mainRef: HTMLElement | undefined;
	const [colorTheme, setColorTheme] = createSignal<ColorTheme>(
		loadPref<ColorTheme>('editor-theme', 'cream'),
	);
	const [fontFamily, setFontFamily] = createSignal<FontKey>(
		loadPref<FontKey>('editor-font', 'notoSerif'),
	);

	const updateTheme = (t: ColorTheme) => {
		setColorTheme(t);
		savePref('editor-theme', t);
	};

	const updateFont = (f: FontKey) => {
		setFontFamily(f);
		savePref('editor-font', f);
	};

	return (
		<div
			class={styles.layout}
			style={{...THEMES[colorTheme()], '--font': FONTS[fontFamily()]}}
		>
			<header class={styles.header}>
				<input
					class={styles.titleInput}
					type="text"
					value={title()}
					onInput={onTitleInput}
					placeholder="タイトル"
				/>
				<span class={styles.saveStatus}>
					{saveStatus() === 'saving'
						? '保存中...'
						: saveStatus() === 'unsaved'
							? '未保存'
							: '保存済み'}
				</span>
				<div class={styles.settingsWrap}>
					<button
						type="button"
						class={styles.settingsBtn}
						onClick={() => setSettingsOpen(!settingsOpen())}
						aria-label="設定"
					>
						⚙
					</button>
					<Show when={settingsOpen()}>
						<div class={styles.settingsDropdown}>
							<div class={styles.settingGroup}>
								<span class={styles.settingLabel}>
									Temperature: {temperature().toFixed(1)}
								</span>
								<input
									type="range"
									min="0"
									max="2"
									step="0.1"
									value={temperature()}
									onInput={(e) => setTemperature(Number(e.currentTarget.value))}
									class={styles.range}
								/>
							</div>
							<div class={styles.settingGroup}>
								<span class={styles.settingLabel}>最大トークン数</span>
								<input
									type="number"
									min="64"
									max="2048"
									step="64"
									value={maxTokens()}
									onInput={(e) => setMaxTokens(Number(e.currentTarget.value))}
									class={styles.numberInput}
								/>
							</div>
							<div class={styles.settingGroup}>
								<span class={styles.settingLabel}>カラーテーマ</span>
								<div class={styles.toggleGroup}>
									<For each={Object.keys(THEMES) as ColorTheme[]}>
										{(t) => (
											<button
												type="button"
												class={`${styles.toggleBtn} ${colorTheme() === t ? styles.toggleBtnActive : ''}`}
												onClick={() => updateTheme(t)}
											>
												{THEME_LABELS[t]}
											</button>
										)}
									</For>
								</div>
							</div>
							<div class={styles.settingGroup}>
								<span class={styles.settingLabel}>フォント</span>
								<div class={styles.toggleGroup}>
									<For each={Object.keys(FONTS) as FontKey[]}>
										{(f) => (
											<button
												type="button"
												class={`${styles.toggleBtn} ${fontFamily() === f ? styles.toggleBtnActive : ''}`}
												onClick={() => updateFont(f)}
											>
												{FONT_LABELS[f]}
											</button>
										)}
									</For>
								</div>
							</div>
						</div>
					</Show>
				</div>
			</header>

			<main
				class={styles.main}
				ref={(el) => {
					mainRef = el;
				}}
			>
				<Doc
					data={novelData}
					fallback={<span class={styles.loading}>読み込み中...</span>}
				>
					{() => (
						<textarea
							class={styles.bodyTextarea}
							value={body()}
							onInput={onBodyInput}
							placeholder="ここに物語を..."
							ref={() => {
								requestAnimationFrame(() => {
									if (mainRef) mainRef.scrollTop = mainRef.scrollHeight;
								});
							}}
						/>
					)}
				</Doc>
			</main>

			<div class={styles.footer}>
				<Show when={generateError()}>
					<p class={styles.error}>{generateError()}</p>
				</Show>
				<button
					type="button"
					class={styles.generateButton}
					onClick={generate}
					disabled={isGenerating()}
				>
					{isGenerating() ? '生成中...' : '▶ 続きを生成'}
				</button>
			</div>
		</div>
	);
};

export default Editor;
