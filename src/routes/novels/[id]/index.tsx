import {For, Show, type Component, createSignal} from 'solid-js';
import {isServer} from 'solid-js/web';
import Doc from '~/lib/Doc';
import type {
	AiNovelAdvancedSettings,
	GeminiAdvancedSettings,
} from '~/lib/useEditor';
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

const TOKEN_STEPS = [64, 128, 256, 512, 1024, 2048] as const;
type TokenStep = (typeof TOKEN_STEPS)[number];

const GEMINI_MODELS = [
	{value: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash Lite'},
	{value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash'},
	{value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash'},
	{value: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite'},
	{value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash'},
] as const;

const AINOVEL_MODELS = [
	{value: 'derrida_03', label: 'Derrida 03 (文学的)'},
	{value: 'damsel_ray', label: 'Damsel Ray (一般向け)'},
	{value: 'spiko', label: 'Spiko (汎用)'},
	{value: 'spiko_solid', label: 'Spiko Solid (安定)'},
	{value: 'spiko_max', label: 'Spiko Max (高性能)'},
	{value: 'spiko_ultra', label: 'Spiko Ultra (超高性能)'},
	{value: 'supertrin_highpres', label: 'SuperTrin HighPres'},
	{value: 'supertrin_maxpres', label: 'SuperTrin MaxPres'},
] as const;

function loadPref<T extends string>(key: string, fallback: T): T {
	if (isServer) return fallback;
	return (localStorage.getItem(key) as T) ?? fallback;
}

function savePref(key: string, value: string): void {
	if (isServer) return;
	localStorage.setItem(key, value);
}

function SliderRow(props: {
	label: string;
	value: number;
	min: number;
	max: number;
	step: number;
	format?: (v: number) => string;
	onInput: (v: number) => void;
}) {
	const fmt = props.format ?? ((v: number) => v.toFixed(2));
	return (
		<div class={styles.settingGroup}>
			<div class={styles.settingLabelRow}>
				<span class={styles.settingLabel}>{props.label}</span>
				<span class={styles.settingValue}>{fmt(props.value)}</span>
			</div>
			<input
				type="range"
				min={props.min}
				max={props.max}
				step={props.step}
				value={props.value}
				onInput={(e) => props.onInput(Number(e.currentTarget.value))}
				class={styles.range}
			/>
		</div>
	);
}

const Editor: Component = () => {
	const {
		novelData,
		title,
		body,
		saveStatus,
		model,
		setModel,
		temperature,
		setTemperature,
		maxTokens,
		setMaxTokens,
		geminiAdvanced,
		setGeminiAdvanced,
		ainovelAdvanced,
		setAinovelAdvanced,
		isGenerating,
		generateError,
		onTitleInput,
		onBodyInput,
		generate,
	} = useEditor();

	const [settingsOpen, setSettingsOpen] = createSignal(false);
	const [advancedOpen, setAdvancedOpen] = createSignal(false);
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

	const maxTokensIdx = () => TOKEN_STEPS.indexOf(maxTokens() as TokenStep);

	const patchGemini = (patch: Partial<GeminiAdvancedSettings>) => {
		setGeminiAdvanced((prev) => ({...prev, ...patch}));
	};

	const patchAinovel = (patch: Partial<AiNovelAdvancedSettings>) => {
		setAinovelAdvanced((prev) => ({...prev, ...patch}));
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
							{/* ── AI 生成設定 ── */}
							<p class={styles.sectionLabel}>AI 生成</p>

							<div class={styles.settingGroup}>
								<span class={styles.settingLabel}>モデル</span>
								<div class={styles.toggleGroup}>
									<button
										type="button"
										class={`${styles.toggleBtn} ${model() === 'gemini' ? styles.toggleBtnActive : ''}`}
										onClick={() => setModel('gemini')}
									>
										Gemini
									</button>
									<button
										type="button"
										class={`${styles.toggleBtn} ${model() === 'ainovel' ? styles.toggleBtnActive : ''}`}
										onClick={() => setModel('ainovel')}
									>
										AIのべりすと
									</button>
								</div>
							</div>

							<SliderRow
								label="Temperature"
								value={temperature()}
								min={0}
								max={model() === 'ainovel' ? 2.5 : 2}
								step={0.05}
								onInput={setTemperature}
							/>

							<div class={styles.settingGroup}>
								<div class={styles.settingLabelRow}>
									<span class={styles.settingLabel}>最大トークン数</span>
									<span class={styles.settingValue}>{maxTokens()}</span>
								</div>
								<input
									type="range"
									min={0}
									max={TOKEN_STEPS.length - 1}
									step={1}
									value={maxTokensIdx()}
									onInput={(e) =>
										setMaxTokens(TOKEN_STEPS[Number(e.currentTarget.value)]!)
									}
									class={styles.range}
								/>
								<div class={styles.tokenTicks}>
									<For each={[...TOKEN_STEPS]}>{(v) => <span>{v}</span>}</For>
								</div>
							</div>

							{/* ── 詳細設定 (折りたたみ) ── */}
							<div class={styles.advancedSection}>
								<button
									type="button"
									class={styles.advancedToggle}
									onClick={() => setAdvancedOpen(!advancedOpen())}
								>
									詳細設定
									<span class={styles.advancedArrow}>
										{advancedOpen() ? '▲' : '▼'}
									</span>
								</button>
								<Show when={advancedOpen()}>
									<div class={styles.advancedContent}>
										<Show when={model() === 'gemini'}>
											<div class={styles.settingGroup}>
												<span class={styles.settingLabel}>Gemini モデル</span>
												<select
													class={styles.selectInput}
													value={geminiAdvanced().geminiModel}
													onChange={(e) =>
														patchGemini({geminiModel: e.currentTarget.value})
													}
												>
													<For each={[...GEMINI_MODELS]}>
														{(m) => <option value={m.value}>{m.label}</option>}
													</For>
												</select>
											</div>

											<SliderRow
												label="Top P"
												value={geminiAdvanced().topP}
												min={0}
												max={1}
												step={0.01}
												onInput={(v) => patchGemini({topP: v})}
											/>

											<SliderRow
												label="Top K"
												value={geminiAdvanced().topK}
												min={1}
												max={100}
												step={1}
												format={(v) => String(Math.round(v))}
												onInput={(v) => patchGemini({topK: v})}
											/>

											<SliderRow
												label="Frequency Penalty"
												value={geminiAdvanced().frequencyPenalty}
												min={0}
												max={2}
												step={0.05}
												onInput={(v) => patchGemini({frequencyPenalty: v})}
											/>

											<SliderRow
												label="Presence Penalty"
												value={geminiAdvanced().presencePenalty}
												min={0}
												max={2}
												step={0.05}
												onInput={(v) => patchGemini({presencePenalty: v})}
											/>

											<div class={styles.settingGroup}>
												<span class={styles.settingLabel}>
													シード (空欄 = ランダム)
												</span>
												<input
													type="number"
													class={styles.numberInput}
													value={
														geminiAdvanced().seed !== null
															? (geminiAdvanced().seed ?? '')
															: ''
													}
													placeholder="ランダム"
													min={0}
													onInput={(e) => {
														const val = e.currentTarget.value;
														patchGemini({
															seed: val === '' ? null : Number(val),
														});
													}}
												/>
											</div>

											<div class={styles.settingGroup}>
												<span class={styles.settingLabel}>
													停止シーケンス (1 行 1 つ)
												</span>
												<textarea
													class={styles.textareaInput}
													value={geminiAdvanced().stopSequences.join('\n')}
													rows={3}
													placeholder={'例：\n「\n」'}
													onInput={(e) =>
														patchGemini({
															stopSequences: e.currentTarget.value
																.split('\n')
																.map((s) => s.trim())
																.filter((s) => s.length > 0),
														})
													}
												/>
											</div>
										</Show>

										<Show when={model() === 'ainovel'}>
											<div class={styles.settingGroup}>
												<span class={styles.settingLabel}>
													AIのべりすと モデル
												</span>
												<select
													class={styles.selectInput}
													value={ainovelAdvanced().ainovelModel}
													onChange={(e) =>
														patchAinovel({ainovelModel: e.currentTarget.value})
													}
												>
													<For each={[...AINOVEL_MODELS]}>
														{(m) => <option value={m.value}>{m.label}</option>}
													</For>
												</select>
											</div>

											<SliderRow
												label="Top P"
												value={ainovelAdvanced().topP}
												min={0.01}
												max={1}
												step={0.01}
												onInput={(v) => patchAinovel({topP: v})}
											/>

											<SliderRow
												label="Top K"
												value={ainovelAdvanced().topK}
												min={1}
												max={500}
												step={1}
												format={(v) => String(Math.round(v))}
												onInput={(v) => patchAinovel({topK: v})}
											/>

											<SliderRow
												label="Top A"
												value={ainovelAdvanced().topA}
												min={0}
												max={1}
												step={0.01}
												onInput={(v) => patchAinovel({topA: v})}
											/>

											<SliderRow
												label="Min P"
												value={ainovelAdvanced().minP}
												min={0}
												max={1}
												step={0.01}
												onInput={(v) => patchAinovel({minP: v})}
											/>

											<SliderRow
												label="Typical P"
												value={ainovelAdvanced().typicalP}
												min={0.01}
												max={1}
												step={0.01}
												onInput={(v) => patchAinovel({typicalP: v})}
											/>

											<SliderRow
												label="Tail Free Sampling"
												value={ainovelAdvanced().tailfree}
												min={0.01}
												max={1}
												step={0.01}
												onInput={(v) => patchAinovel({tailfree: v})}
											/>

											<SliderRow
												label="繰り返しペナルティ"
												value={ainovelAdvanced().repPen}
												min={1}
												max={2}
												step={0.01}
												onInput={(v) => patchAinovel({repPen: v})}
											/>

											<SliderRow
												label="ペナルティ適用範囲"
												value={ainovelAdvanced().repPenRange}
												min={0}
												max={2048}
												step={64}
												format={(v) => String(Math.round(v))}
												onInput={(v) => patchAinovel({repPenRange: v})}
											/>

											<SliderRow
												label="ペナルティ傾き"
												value={ainovelAdvanced().repPenSlope}
												min={0.01}
												max={10}
												step={0.05}
												onInput={(v) => patchAinovel({repPenSlope: v})}
											/>

											<SliderRow
												label="文脈依存ペナルティ"
												value={ainovelAdvanced().repPenPres}
												min={0}
												max={100}
												step={1}
												format={(v) => String(Math.round(v))}
												onInput={(v) => patchAinovel({repPenPres: v})}
											/>

											<div class={styles.settingGroup}>
												<span class={styles.settingLabel}>
													停止トークン (「{'<<|>>'}」区切り)
												</span>
												<textarea
													class={styles.textareaInput}
													value={ainovelAdvanced().stopTokens}
													rows={2}
													placeholder={'例：。<<|>>！'}
													onInput={(e) =>
														patchAinovel({stopTokens: e.currentTarget.value})
													}
												/>
											</div>

											<div class={styles.settingGroup}>
												<label class={styles.checkboxLabel}>
													<input
														type="checkbox"
														class={styles.checkbox}
														checked={ainovelAdvanced().multilingualMode}
														onChange={(e) =>
															patchAinovel({
																multilingualMode: e.currentTarget.checked,
															})
														}
													/>
													多言語モード
												</label>
											</div>
										</Show>
									</div>
								</Show>
							</div>

							<hr class={styles.divider} />

							{/* ── エディタ設定 ── */}
							<p class={styles.sectionLabel}>エディタ</p>

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

			<main class={styles.main}>
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
							ref={(el) => {
								void document.fonts.ready.then(() => {
									requestAnimationFrame(() => {
										el.scrollTop = el.scrollHeight;
									});
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
