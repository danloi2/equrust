<script lang="ts">
	import { parse } from '../algebra/parser';
	import { tokenize } from '../algebra/lexer';
	import { Solver } from '../algebra/solver';
	import { formatToLatex } from '../algebra/formatter';
	import { evalAST } from '../algebra/utils/eval';
	import type { Expr, RuleResult } from '../algebra/types';
	import StepViewer from '../components/StepViewer.svelte';
	import MathExpression from '../components/MathExpression.svelte';
	import GraphViewer from '../components/GraphViewer.svelte';
	import Sidebar from '../components/Sidebar.svelte';
	import ResultPanel from '../components/ResultPanel.svelte';

	import { AlertCircle, CheckCircle2, Activity, ListOrdered } from '@lucide/svelte';

	let expression = $state('');
	let viewMode = $state<'steps' | 'result' | 'graph'>('steps');
	let isKeyboardOpen = $state(false);
	const solver = new Solver();

	let data = $state<{
		ast: Expr;
		input_latex: string;
		steps: RuleResult[];
		result_latex: string;
		is_quadratic: boolean;
		is_no_solution: boolean;
		is_irrational: boolean;
		solutions: readonly number[];
		solutions_latex: readonly string[];
	} | null>(null);

	let isError = $state(false);
	let errorMsg = $state('');

	function reset() {
		data = null;
		isError = false;
		errorMsg = '';
	}

	function handleSubmit(targetMode?: 'steps' | 'result' | 'graph', e?: Event) {
		e?.preventDefault();
		if (targetMode) {
			viewMode = targetMode;
		}
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
			let is_irrational = false;
			let solutions: readonly number[] = [];
			let solutions_latex: readonly string[] = [];

			if (steps.length > 0) {
				const lastStep = steps[steps.length - 1];

				if (lastStep.terminal && lastStep.solutions !== undefined) {
					if (lastStep.solutions.length === 0) {
						is_no_solution = true;
					} else {
						is_quadratic = true;
						solutions = lastStep.solutions;
						solutions_latex = lastStep.solutionsLatex || [];
					}
				}
			}

			// Extraer solución para ecuaciones lineales de primer grado (ej. x = C)
			if (solutions.length === 0 && !is_no_solution && finalExpr.type === 'Equation') {
				if (finalExpr.left.type === 'Variable') {
					const val = evalAST(finalExpr.right, 0);
					if (typeof val === 'number' && !isNaN(val) && isFinite(val)) {
						solutions = [val];
						solutions_latex = [formatToLatex(finalExpr.right)];
					}
				} else if (finalExpr.right.type === 'Variable') {
					const val = evalAST(finalExpr.left, 0);
					if (typeof val === 'number' && !isNaN(val) && isFinite(val)) {
						solutions = [val];
						solutions_latex = [formatToLatex(finalExpr.left)];
					}
				} else if (finalExpr.left.type === 'Number' && finalExpr.right.type === 'Number') {
					if (finalExpr.left.value !== finalExpr.right.value) {
						is_no_solution = true;
					}
				}
			}

			// Detectar si la solución es irracional (contiene radicales \sqrt)
			if (solutions_latex.some((s) => s.includes('\\sqrt')) || result_latex.includes('\\sqrt')) {
				is_irrational = true;
			}

			data = {
				ast,
				input_latex,
				steps,
				result_latex,
				is_quadratic,
				is_no_solution,
				is_irrational,
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
		if (e.key === 'Enter') handleSubmit(viewMode);
	}

	function handleExample(ex: string) {
		expression = ex;
		reset();
		setTimeout(() => handleSubmit(viewMode), 50);
	}

	function getLivePreviewLatex(raw: string): string {
		let str = raw.trim();
		if (!str) return '';

		try {
			const tokens = tokenize(str);
			const ast = parse(tokens);
			return formatToLatex(ast);
		} catch {
			// Asistencia reactiva de vista previa
		}

		function tryParse(s: string): string | null {
			try {
				const tokens = tokenize(s);
				const ast = parse(tokens);
				return formatToLatex(ast);
			} catch {
				return null;
			}
		}

		let cleanStr = str.replace(/\\+[a-zA-Z]*$/g, '').trim();

		if (cleanStr) {
			const res = tryParse(cleanStr);
			if (res) return res;
		}

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
	let hasSteps = $derived(data ? data.steps.length > 0 : false);
	let isAlreadySimplified = $derived(data ? data.steps.length === 0 : false);
</script>

<div class="app-layout">
	<!-- ─── SIDEBAR ─────────────────────────────────── -->
	<Sidebar
		bind:expression
		bind:isKeyboardOpen
		onSubmit={handleSubmit}
		onInputReset={reset}
		onKeyDown={handleKeyDown}
		onExampleSelect={handleExample}
	/>

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
			<!-- View Mode Tabs Bar -->
			<div class="view-tabs anim-fade-up">
				<button
					type="button"
					class="view-tab-btn"
					class:active={viewMode === 'result'}
					onclick={() => (viewMode = 'result')}
				>
					<CheckCircle2 size={14} />
					Resultado
				</button>

				<button
					type="button"
					class="view-tab-btn"
					class:active={viewMode === 'steps'}
					onclick={() => (viewMode = 'steps')}
				>
					<ListOrdered size={14} />
					Paso a paso ({data.steps.length})
				</button>

				<button
					type="button"
					class="view-tab-btn"
					class:active={viewMode === 'graph'}
					onclick={() => (viewMode = 'graph')}
				>
					<Activity size={14} />
					Gráfica
				</button>
			</div>

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
			{#if viewMode === 'steps' && hasSteps}
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

			<!-- Graph Viewer -->
			{#if viewMode === 'graph'}
				<GraphViewer
					ast={data.ast}
					solutions={data.solutions}
					solutionsLatex={data.solutions_latex}
				/>
			{/if}

			<!-- Result panel -->
			<ResultPanel {data} {isAlreadySimplified} />
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
