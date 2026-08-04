<script lang="ts">
	import {
		Sigma,
		Sparkles,
		BookOpen,
		FlaskConical,
		Keyboard,
		CheckCircle2,
		Activity
	} from '@lucide/svelte';
	import MathToolbar from './MathToolbar.svelte';
	import pkg from '../../package.json';

	let {
		expression = $bindable(''),
		isKeyboardOpen = $bindable(false),
		onSubmit,
		onInputReset,
		onKeyDown,
		onExampleSelect
	} = $props<{
		expression: string;
		isKeyboardOpen: boolean;
		onSubmit: (targetMode?: 'steps' | 'result' | 'graph', e?: Event) => void;
		onInputReset: () => void;
		onKeyDown: (e: KeyboardEvent) => void;
		onExampleSelect: (ex: string) => void;
	}>();

	const EXAMPLES = [
		'2(x+3)=10',
		'3x + 2 = 11',
		'x^2 - 4 = 0',
		'x^2+4x+5=0',
		'x/2 + 3 = 7',
		'3(x-1) = 2x+4',
		'2(x-3) = 2x+1',
		'x^2+5x+6=0'
	];

	function handleInsertSymbol(textToInsert: string, cursorOffset = 0) {
		const inputEl = document.getElementById('expression-input') as HTMLInputElement | null;
		if (!inputEl) {
			expression += textToInsert;
			return;
		}
		const start = inputEl.selectionStart ?? expression.length;
		const end = inputEl.selectionEnd ?? expression.length;
		expression = expression.slice(0, start) + textToInsert + expression.slice(end);

		setTimeout(() => {
			inputEl.focus();
			const newPos = start + textToInsert.length + cursorOffset;
			inputEl.setSelectionRange(newPos, newPos);
		}, 10);
	}

	function handleBackspace() {
		const inputEl = document.getElementById('expression-input') as HTMLInputElement | null;
		if (!inputEl) {
			expression = expression.slice(0, -1);
			return;
		}
		const start = inputEl.selectionStart ?? expression.length;
		const end = inputEl.selectionEnd ?? expression.length;
		if (start !== end) {
			expression = expression.slice(0, start) + expression.slice(end);
			setTimeout(() => {
				inputEl.focus();
				inputEl.setSelectionRange(start, start);
			}, 10);
		} else if (start > 0) {
			expression = expression.slice(0, start - 1) + expression.slice(start);
			setTimeout(() => {
				inputEl.focus();
				inputEl.setSelectionRange(start - 1, start - 1);
			}, 10);
		}
	}

	function handleClear() {
		expression = '';
		onInputReset();
		const inputEl = document.getElementById('expression-input') as HTMLInputElement | null;
		if (inputEl) {
			inputEl.focus();
		}
	}
</script>

<aside class="sidebar">
	<!-- Logo + title -->
	<div style="display:flex;align-items:center;gap:12px;">
		<div class="logo-mark">
			<Sigma size={22} color="white" />
		</div>
		<div>
			<div style="font-size:1rem;font-weight:800;color:#f0f0ff;line-height:1.1;">
				Algebra Tutor
			</div>
			<div style="display:flex;align-items:center;gap:6px;margin-top:3px;">
				<span class="ver-badge">v{pkg.version}</span>
			</div>
		</div>
	</div>

	<p style="font-size:0.82rem;color:var(--text2);line-height:1.6;">
		Motor algebraico propio — no calculadora. Cada transformación explicada con su razón
		matemática.
	</p>

	<!-- Input -->
	<div>
		<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
			<div class="section-label" style="margin-bottom:0;">Ecuación</div>
			<button
				type="button"
				onclick={() => (isKeyboardOpen = !isKeyboardOpen)}
				style="display:flex;align-items:center;gap:5px;background:var(--surface2);border:1px solid var(--border);border-radius:6px;padding:3px 8px;color:var(--accent-light);font-size:0.7rem;font-weight:600;cursor:pointer;transition:background 0.2s;"
			>
				<Keyboard size={12} />
				{isKeyboardOpen ? 'Ocultar teclado' : 'Teclado táctil'}
			</button>
		</div>
		<form onsubmit={(e) => onSubmit('steps', e)} style="display:flex;flex-direction:column;gap:12px;">
			<div class="input-card">
				<input
					id="expression-input"
					class="math-input"
					type="text"
					bind:value={expression}
					oninput={onInputReset}
					onkeydown={onKeyDown}
					placeholder="ej. 2(x+3)=10"
					autocomplete="off"
					spellcheck="false"
				/>
			</div>

			<!-- Visual Math Keyboard / Palette -->
			{#if isKeyboardOpen}
				<MathToolbar
					onInsert={handleInsertSymbol}
					onBackspace={handleBackspace}
					onClear={handleClear}
					onSolve={() => onSubmit('steps')}
				/>
			{/if}

			<div class="action-buttons-stack">
				<!-- Button 1: Resolver (Solo resultado) -->
				<button
					id="solve-direct-button"
					type="button"
					class="btn-solve-direct"
					disabled={!expression.trim()}
					onclick={() => onSubmit('result')}
				>
					<CheckCircle2 size={15} />
					Resolver
				</button>

				<!-- Button 2: Resolver paso a paso -->
				<button
					id="solve-button"
					type="submit"
					class="solve-btn"
					disabled={!expression.trim()}
					onclick={() => onSubmit('steps')}
				>
					<Sparkles size={15} />
					Resolver paso a paso
				</button>

				<!-- Button 3: Representar gráficamente -->
				<button
					id="graph-button"
					type="button"
					class="btn-graph"
					disabled={!expression.trim()}
					onclick={() => onSubmit('graph')}
				>
					<Activity size={15} />
					Representar gráficamente
				</button>
			</div>
		</form>
	</div>

	<!-- Examples -->
	<div>
		<div class="section-label" style="display:flex;align-items:center;gap:5px;">
			<BookOpen size={11} /> Ejemplos
		</div>
		<div class="chips-wrap">
			{#each EXAMPLES as ex (ex)}
				<button
					id={`example-${ex.replace(/[\s=^*/()+]/g, '-')}`}
					class="chip"
					onclick={() => onExampleSelect(ex)}
				>
					{ex}
				</button>
			{/each}
		</div>
	</div>

	<!-- Footer -->
	<div style="margin-top:auto;padding-top:16px;border-top:1px solid var(--border);">
		<div style="display:flex;align-items:center;gap:6px;color:var(--text3);font-size:0.75rem;">
			<FlaskConical size={13} />
			Motor algebraico con {EXAMPLES.length} tipos de ecuaciones
		</div>
	</div>
</aside>
