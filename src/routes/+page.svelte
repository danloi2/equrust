<script lang="ts">
	import { parse } from '../algebra/parser';
	import { tokenize } from '../algebra/lexer';
	import { Solver } from '../algebra/solver';
	import { formatToLatex } from '../algebra/formatter';
	import type { RuleResult } from '../algebra/types';
	import StepViewer from '../components/StepViewer.svelte';
	import MathExpression from '../components/MathExpression.svelte';
	import MathToolbar from '../components/MathToolbar.svelte';

	import { Sigma, Sparkles, AlertCircle, BookOpen, FlaskConical, Keyboard } from '@lucide/svelte';
	import pkg from '../../package.json';

	let expression = $state('');
	const solver = new Solver();

	let data = $state<{
		input_latex: string;
		steps: RuleResult[];
		result_latex: string;
		is_quadratic: boolean;
		is_no_solution: boolean;
		solutions: readonly number[];
		solutions_latex: readonly string[];
	} | null>(null);

	let isError = $state(false);
	let errorMsg = $state('');

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

	function reset() {
		data = null;
		isError = false;
		errorMsg = '';
	}

	function handleSubmit(e?: Event) {
		e?.preventDefault();
		const trimmed = expression.trim();
		if (!trimmed) return;

		try {
			isError = false;
			const tokens = tokenize(trimmed);
			const ast = parse(tokens);

			const input_latex = formatToLatex(ast);
			const steps = solver.solve(ast);

			const finalExpr = steps.length > 0 ? steps[steps.length - 1].after : ast;
			const result_latex = formatToLatex(finalExpr);

			let is_quadratic = false;
			let is_no_solution = false;
			let solutions: readonly number[] = [];
			let solutions_latex: readonly string[] = [];

			if (steps.length > 0) {
				const lastStep = steps[steps.length - 1];
				if (lastStep.title.includes('Bhaskara')) {
					is_quadratic = true;
					solutions = lastStep.solutions || [];
					solutions_latex = lastStep.solutionsLatex || [];
				}
				if (
					lastStep.terminal &&
					lastStep.solutions !== undefined &&
					lastStep.solutions.length === 0 &&
					!lastStep.title.includes('Bhaskara')
				) {
					is_no_solution = true;
				}
			}

			data = {
				input_latex,
				steps,
				result_latex,
				is_quadratic,
				is_no_solution,
				solutions,
				solutions_latex
			};
		} catch (err: unknown) {
			isError = true;
			errorMsg = err instanceof Error ? err.message : 'Error al analizar la expresión.';
			data = null;
		}
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'Enter') handleSubmit();
	}

	function handleExample(ex: string) {
		expression = ex;
		reset();
		setTimeout(() => handleSubmit(), 50);
	}

	function getLivePreviewLatex(raw: string): string {
		let str = raw.trim();
		if (!str) return '';

		// 1. Intentar parsear directamente la expresión tal como está
		try {
			const tokens = tokenize(str);
			const ast = parse(tokens);
			return formatToLatex(ast);
		} catch {
			// Asistencia reactiva de vista previa
		}

		// Función auxiliar para probar parsear una cadena candidata
		function tryParse(s: string): string | null {
			try {
				const tokens = tokenize(s);
				const ast = parse(tokens);
				return formatToLatex(ast);
			} catch {
				return null;
			}
		}

		// 2. Limpiar secuencias de barras invertidas incompletas al final (ej: "\", "\f", "\fr", "\fra")
		let cleanStr = str.replace(/\\+[a-zA-Z]*$/g, '').trim();

		// Probar con cleanStr
		if (cleanStr) {
			const res = tryParse(cleanStr);
			if (res) return res;
		}

		// 3. Completar estructuras de \frac y \sqrt incompletas (en la cadena original o limpia)
		const targetStr = str;
		let fixedStr = targetStr;
		fixedStr = fixedStr.replace(/\\frac\{([^{}]*)\}\{?$/g, '\\frac{$1}{\\text{...}}');
		fixedStr = fixedStr.replace(/\\frac\{([^{}]*)\}$/g, '\\frac{$1}{\\text{...}}');
		fixedStr = fixedStr.replace(/\\frac\{?$/g, '\\frac{\\text{...}}{\\text{...}}');
		fixedStr = fixedStr.replace(/(^|[^\w\\])frac$/g, '$1\\frac{\\text{...}}{\\text{...}}');
		fixedStr = fixedStr.replace(/\\sqrt\{?$/g, '\\sqrt{\\text{...}}');
		fixedStr = fixedStr.replace(/(^|[^\w\\])sqrt$/g, '$1\\sqrt{\\text{...}}');

		if (fixedStr !== targetStr) {
			const res = tryParse(fixedStr);
			if (res) return res;
		}

		// 4. Si la cadena (o su versión sin la barra al final) termina en operador (+, -, *, /, ^, =)
		const candidateOps = [str, cleanStr, fixedStr];
		for (const candidate of candidateOps) {
			if (!candidate) continue;
			const trailingOpMatch = candidate.match(/^(.*?)\s*([+*/^=-])\s*$/);
			if (trailingOpMatch) {
				const prefix = trailingOpMatch[1].trim();
				const op = trailingOpMatch[2];
				if (prefix) {
					const resPrefix = tryParse(prefix);
					if (resPrefix) {
						const opLatex = op === '*' ? '\\cdot ' : op;
						return `${resPrefix} ${opLatex} \\text{...}`;
					}
				}
			}
		}

		// 5. Autocompletar paréntesis/llaves no cerradas
		for (const candidate of [str, cleanStr, fixedStr]) {
			if (!candidate) continue;
			let balanced = candidate;
			const openParens = (candidate.match(/\(/g) || []).length;
			const closeParens = (candidate.match(/\)/g) || []).length;
			if (openParens > closeParens) balanced += ')'.repeat(openParens - closeParens);

			const openBraces = (candidate.match(/\{/g) || []).length;
			const closeBraces = (candidate.match(/\}/g) || []).length;
			if (openBraces > closeBraces) balanced += '}'.repeat(openBraces - closeBraces);

			if (balanced !== candidate) {
				const res = tryParse(balanced);
				if (res) return res;
			}
		}

		return '';
	}

	let livePreviewLatex = $derived(getLivePreviewLatex(expression));

	let isKeyboardOpen = $state(false);

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
		reset();
		const inputEl = document.getElementById('expression-input') as HTMLInputElement | null;
		if (inputEl) {
			inputEl.focus();
		}
	}

	let hasSteps = $derived(data && data.steps.length > 0);
	let isAlreadySimplified = $derived(data && data.steps.length === 0);
</script>

<div class="app-layout">
	<!-- ─── SIDEBAR ─────────────────────────────────── -->
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
			<form onsubmit={handleSubmit} style="display:flex;flex-direction:column;gap:12px;">
				<div class="input-card">
					<input
						id="expression-input"
						class="math-input"
						type="text"
						bind:value={expression}
						oninput={reset}
						onkeydown={handleKeyDown}
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
						onSolve={() => handleSubmit()}
					/>
				{/if}

				<button id="solve-button" type="submit" class="solve-btn" disabled={!expression.trim()}>
					<Sparkles size={15} />
					Resolver paso a paso
				</button>
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
						onclick={() => handleExample(ex)}
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

	<!-- ─── MAIN CONTENT ───────────────────────────── -->
	<main class="main-content">
		<!-- Error -->
		{#if isError}
			<div class="error-card anim-fade-up">
				<AlertCircle size={18} style="flex-shrink:0;margin-top:1px;" />
				<div>
					<div style="font-weight:600;margin-bottom:2px;">Error de sintaxis</div>
					<div style="font-size:0.82rem;opacity:.8;">{errorMsg}</div>
				</div>
			</div>
		{/if}

		{#if data}
			<!-- Expression input display -->
			<div class="expr-panel anim-fade-up" style="position:relative;">
				<div class="section-label" style="position:absolute;top:14px;left:20px;">
					Expresión de entrada
				</div>
				<div class="notranslate" translate="no" style="padding-top:12px;">
					<MathExpression latex={data.input_latex} displayMode={true} />
				</div>
			</div>

			<!-- Steps -->
			{#if hasSteps}
				<div class="steps-section">
					<div class="steps-header">
						<div class="steps-dot"></div>
						<span
							style="font-size:0.72rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--text2);"
						>
							{data.steps.length} paso{data.steps.length !== 1 ? 's' : ''} de resolución
						</span>
					</div>
					<StepViewer steps={data.steps} />
				</div>
			{/if}

			<!-- Result panel -->
			<div class="result-panel anim-fade-up anim-d2">
				<div class="result-panel-header">
					<div class="dot"></div>
					<span class="title">
						{isAlreadySimplified ? 'Expresión simplificada' : 'Resultado final'}
					</span>
				</div>
				<div class="result-panel-body notranslate" translate="no">
					{#if data.is_no_solution}
						<div class="no-real-sol">
							<div class="badge">∅ &nbsp; Sin solución</div>
							<MathExpression latex="S = \emptyset" displayMode={true} />
							<p style="font-size:0.8rem;color:var(--text2);max-width:340px;">
								No existe ningún valor real que satisfaga esta ecuación.
							</p>
						</div>
					{:else if data.is_quadratic}
						{#if data.solutions.length === 0}
							<div class="no-real-sol">
								<div class="badge">∅ &nbsp; Sin raíces reales</div>
								<p style="font-size:0.8rem;color:var(--text2);">
									El discriminante es negativo. La ecuación no tiene soluciones en ℝ.
								</p>
							</div>
						{:else if data.solutions.length === 1}
							<div class="solutions-grid" style="max-width:280px;margin:0 auto;">
								<div class="solution-box double-root">
									<span class="sol-label">Raíz doble</span>
									<MathExpression
										latex={`x = ${data.solutions_latex?.[0] ?? (Number.isInteger(data.solutions[0]) ? data.solutions[0] : parseFloat(data.solutions[0].toFixed(4)))}`}
										displayMode={false}
									/>
								</div>
							</div>
						{:else}
							<div class="solutions-grid">
								{#each data.solutions as sol, i (i)}
									<div class="solution-box">
										<span class="sol-label">Solución {i + 1}</span>
										<MathExpression
											latex={`x_{${i + 1}} = ${data.solutions_latex?.[i] ?? (Number.isInteger(sol) ? sol : parseFloat(sol.toFixed(4)))}`}
											displayMode={false}
										/>
									</div>
								{/each}
							</div>
						{/if}
					{:else}
						<MathExpression latex={data.result_latex} displayMode={true} />
						{#if isAlreadySimplified}
							<p style="font-size:0.8rem;color:var(--text3);margin-top:14px;">
								Esta expresión ya está en su forma más simple.
							</p>
						{/if}
					{/if}
				</div>
			</div>
		{:else if livePreviewLatex}
			<!-- Real-time Live Preview Panel in main workspace -->
			<div class="expr-panel anim-fade-up" style="position:relative;margin-top:20px;">
				<div
					class="section-label"
					style="position:absolute;top:14px;left:20px;display:flex;align-items:center;gap:6px;"
				>
					<span
						style="width:6px;height:6px;border-radius:50%;background:var(--accent);box-shadow:0 0 8px var(--accent);"
					></span>
					Vista previa en tiempo real
				</div>
				<div class="notranslate" translate="no" style="padding-top:16px;">
					<MathExpression latex={livePreviewLatex} displayMode={true} />
				</div>
				<div style="font-size:0.78rem;color:var(--text3);margin-top:16px;">
					Presiona <kbd
						style="background:var(--surface2);padding:2px 6px;border-radius:4px;border:1px solid var(--border);"
						>Enter</kbd
					>
					o haz clic en <strong>Resolver</strong> para ver los pasos completos
				</div>
			</div>
		{:else if !isError}
			<!-- Empty state -->
			<div class="empty-state">
				<div style="opacity:.25;font-size:3.5rem;line-height:1;">∑</div>
				<MathExpression latex="ax^2 + bx + c = 0" displayMode={true} />
				<p style="font-size:0.88rem;color:var(--text3);text-align:center;max-width:300px;">
					Escribe una ecuación en la barra lateral para empezar a resolverla paso a paso
				</p>
			</div>
		{/if}
	</main>
</div>
