<script lang="ts">
	import { parse } from '../algebra/parser';
	import { tokenize } from '../algebra/lexer';
	import { Solver } from '../algebra/solver';
	import { formatToLatex } from '../algebra/formatter';
	import type { RuleResult } from '../algebra/types';
	import StepViewer from '../components/StepViewer.svelte';
	import MathExpression from '../components/MathExpression.svelte';

	import { Sigma, Sparkles, ArrowRight, AlertCircle, BookOpen, ChevronRight, ArrowDown } from 'lucide-svelte';

	let expression = $state('');
	let solver = new Solver();
	
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
		'x^2 - 4 = 0',
		'3x + 2 = 11',
		'2x + 5 = 9',
		'x/2 + 3 = 7',
		'3(x-1) = 2x+4'
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
			
			// Si la última regla aplicada fue quadratic, extraer la información
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
				if (lastStep.title.includes('Sin solución — dominio')) {
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
		} catch (err: any) {
			isError = true;
			errorMsg = err.message || 'Error al analizar la expresión.';
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

	let hasSteps = $derived(data && data.steps.length > 0);
	let isAlreadySimplified = $derived(data && data.steps.length === 0);
</script>

<div style="min-height: 100vh; position: relative; overflow: hidden;">
	<!-- Background orbs -->
	<div class="bg-orb" style="width: 600px; height: 600px; top: -200px; left: -200px; background: radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%);"></div>
	<div class="bg-orb" style="width: 500px; height: 500px; bottom: -150px; right: -150px; background: radial-gradient(circle, rgba(96,165,250,0.1) 0%, transparent 70%);"></div>

	<div style="position: relative; z-index: 1; max-width: 820px; margin: 0 auto; padding: 80px 24px 120px;">
		<!-- Header -->
		<div class="animate-fade-in-up" style="text-align: center; margin-bottom: 56px;">
			<div style="display: inline-flex; align-items: center; gap: 10px; margin-bottom: 24px;">
				<div style="width: 48px; height: 48px; background: linear-gradient(135deg, #8b5cf6, #7c3aed); border-radius: 14px; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 32px rgba(139,92,246,0.4);">
					<Sigma size={24} color="white" />
				</div>
				<span style="font-size: 1rem; font-weight: 600; color: var(--accent-light); letter-spacing: 2px; text-transform: uppercase;">
					Algebra Tutor
				</span>
			</div>
			<h1 style="font-size: clamp(2.4rem, 6vw, 3.5rem); font-weight: 700; line-height: 1.1; margin-bottom: 16px;">
				Aprende matemáticas{' '}
				<span class="gradient-text">paso a paso</span>
			</h1>
			<p style="color: var(--text-secondary); font-size: 1.1rem; max-width: 500px; margin: 0 auto; line-height: 1.6;">
				Motor algebraico propio. No calculadora — tutor. Cada transformación explicada con su razón matemática.
			</p>
		</div>

		<!-- Input -->
		<div class="glass-card animate-fade-in-up-delay-1" style="padding: 28px 32px; margin-bottom: 16px;">
			<form onsubmit={handleSubmit}>
				<div style="display: flex; align-items: center; gap: 16px;">
					<div style="flex: 1; display: flex; align-items: center; gap: 12px;">
						<ChevronRight size={20} color="var(--accent)" style="flex-shrink: 0;" />
						<input
							id="expression-input"
							class="math-input"
							type="text"
							bind:value={expression}
							oninput={reset}
							onkeydown={handleKeyDown}
							placeholder="Escribe una expresión… p.ej. 2(x+3)=10"
							autocomplete="off"
							spellcheck="false"
						/>
					</div>
					<button
						id="solve-button"
						type="submit"
						class="solve-button"
						disabled={!expression.trim()}
					>
						<Sparkles size={16} />
						Resolver
					</button>
				</div>
			</form>
		</div>

		<!-- Examples -->
		<div class="animate-fade-in-up-delay-2" style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 48px; padding-left: 4px;">
			<span style="color: var(--text-muted); font-size: 0.8rem; display: flex; align-items: center; gap: 4px; margin-right: 4px;">
				<BookOpen size={13} /> Ejemplos:
			</span>
			{#each EXAMPLES as ex}
				<button
					id={`example-${ex.replace(/[\s=^*/()+]/g, '-')}`}
					class="example-chip"
					onclick={() => handleExample(ex)}
				>
					{ex} <ArrowRight size={11} />
				</button>
			{/each}
		</div>

		<!-- Error -->
		{#if isError}
			<div class="error-badge result-container" style="margin-bottom: 24px;">
				<AlertCircle size={16} />
				<span>{errorMsg}</span>
			</div>
		{/if}

		<!-- Result -->
		{#if data}
			<div class="result-container">
				<!-- Input expression -->
				<div class="glass-card" style="padding: 28px 32px; margin-bottom: 16px;">
					<p style="color: var(--text-muted); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px;">
						Expresión de entrada
					</p>
					<div class="notranslate" translate="no" style="text-align: center;">
						<MathExpression latex={data.input_latex} displayMode={true} />
					</div>
				</div>

				<!-- Steps -->
				{#if hasSteps}
					<div style="margin-bottom: 16px;">
						<div style="display: flex; align-items: center; gap: 8px; padding: 0 4px; margin-bottom: 12px;">
							<div style="width: 6px; height: 6px; border-radius: 50%; background: var(--accent); box-shadow: 0 0 8px var(--accent);"></div>
							<span style="color: var(--text-secondary); font-size: 0.8rem; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
								{data.steps.length} paso{data.steps.length !== 1 ? 's' : ''} de simplificación
							</span>
						</div>
						<div style="display: flex; flex-direction: column; gap: 10px;">
							<StepViewer steps={data.steps} />
						</div>
						<div style="display: flex; justify-content: center; padding: 12px 0;">
							<ArrowDown size={18} color="var(--accent)" style="opacity: 0.5;" />
						</div>
					</div>
				{/if}

				<!-- Result -->
				<div class="glass-card" style="padding: 32px 40px; text-align: center;">
					<p style="color: var(--text-muted); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 16px;">
						{isAlreadySimplified ? 'Expresión (ya simplificada)' : 'Resultado final'}
					</p>
					<div class="notranslate" translate="no" style="
						padding: 28px 20px;
						background: rgba(139,92,246,0.06);
						border-radius: 16px;
						border: 1px solid rgba(139,92,246,0.2);
						overflow-x: auto;
						display: flex;
						flex-direction: column;
						gap: 12px;
					">
						{#if data.is_no_solution}
							<div style="color: var(--text-secondary); font-size: 1.1rem; font-weight: 500; display: flex; flex-direction: column; align-items: center; gap: 8px;">
								<span>La ecuación no tiene solución en</span>
								<MathExpression latex={"S = \\emptyset"} displayMode={true} />
							</div>
						{:else if data.is_quadratic}
							{#if data.solutions.length === 0}
								<div style="color: var(--text-secondary); font-size: 1.1rem; font-weight: 500;">
									La ecuación no tiene soluciones reales en <MathExpression latex={"\\mathbb{R}"} displayMode={false} />
								</div>
							{:else}
								{#each data.solutions as sol, i}
									<MathExpression
										latex={`x_${i + 1} = ${data.solutions_latex?.[i] ?? (Number.isInteger(sol) ? sol : parseFloat(sol.toFixed(4)))}`}
										displayMode={true}
									/>
								{/each}
							{/if}
						{:else}
							<MathExpression latex={data.result_latex} displayMode={true} />
						{/if}
					</div>
					{#if isAlreadySimplified}
						<p style="color: var(--text-muted); font-size: 0.82rem; margin-top: 14px;">
							Esta expresión ya está en su forma más simple.
							<br />
							Prueba ecuaciones como <code>2(x+3)=10</code>, <code>3x+2x=10</code> o <code>x/2+3=7</code>.
						</p>
					{/if}
				</div>
			</div>
		{/if}

		<!-- Empty state -->
		{#if !data && !isError}
			<div class="animate-fade-in-up-delay-3" style="text-align: center; padding: 40px 20px;">
				<div style="margin-bottom: 20px; opacity: 0.4; display: flex; justify-content: center;">
					<MathExpression latex="\int_a^b f(x)\,dx = F(b) - F(a)" displayMode={false} />
				</div>
				<p style="color: var(--text-muted); font-size: 0.9rem;">
					Introduce cualquier expresión o ecuación algebraica para comenzar
				</p>
			</div>
		{/if}
	</div>
</div>
