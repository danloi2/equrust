<script lang="ts">
	import { Sparkles } from '@lucide/svelte';
	import MathExpression from './MathExpression.svelte';
	import type { RuleResult } from '../algebra/types';

	let {
		data,
		isAlreadySimplified
	} = $props<{
		data: {
			result_latex: string;
			is_quadratic: boolean;
			is_no_solution: boolean;
			is_irrational: boolean;
			solutions: readonly number[];
			solutions_latex: readonly string[];
			steps: RuleResult[];
		};
		isAlreadySimplified: boolean;
	}>();
</script>

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
				<div class="badge">∅ &nbsp; No tiene soluciones reales</div>
				<MathExpression latex="S = \emptyset" displayMode={true} />
				<p style="font-size:0.8rem;color:var(--text2);max-width:340px;text-align:center;">
					No existe ningún valor real que satisfaga esta ecuación.
				</p>
			</div>
		{:else if data.is_quadratic}
			{#if data.solutions.length === 0}
				<div class="no-real-sol">
					<div class="badge">∅ &nbsp; No tiene soluciones reales</div>
					<MathExpression latex="S = \emptyset" displayMode={true} />
					<p style="font-size:0.8rem;color:var(--text2);max-width:340px;text-align:center;">
						El discriminante es negativo. La ecuación no tiene soluciones en ℝ.
					</p>
				</div>
			{:else if data.solutions.length === 1}
				{#if data.is_irrational}
					<div class="irrational-badge">
						<Sparkles size={13} />
						<span>Solución irracional</span>
					</div>
				{/if}
				<div class="solutions-grid" style="max-width:280px;margin:0 auto;">
					<div class="solution-box double-root" class:irrational={data.is_irrational}>
						<span class="sol-label">
							{data.is_irrational ? 'Raíz doble irracional' : 'Raíz doble'}
						</span>
						<MathExpression
							latex={`x = ${data.solutions_latex?.[0] ?? (Number.isInteger(data.solutions[0]) ? data.solutions[0] : parseFloat(data.solutions[0].toFixed(4)))}`}
							displayMode={false}
						/>
					</div>
				</div>
			{:else}
				{#if data.is_irrational}
					<div class="irrational-badge">
						<Sparkles size={13} />
						<span>Solución irracional</span>
					</div>
				{/if}
				<div class="solutions-grid">
					{#each data.solutions as sol, i (i)}
						<div class="solution-box" class:irrational={data.is_irrational}>
							<span class="sol-label">
								{data.is_irrational ? `Solución ${i + 1} (Irracional)` : `Solución ${i + 1}`}
							</span>
							<MathExpression
								latex={`x_{${i + 1}} = ${data.solutions_latex?.[i] ?? (Number.isInteger(sol) ? sol : parseFloat(sol.toFixed(4)))}`}
								displayMode={false}
							/>
						</div>
					{/each}
				</div>
				{#if data.is_irrational}
					<p style="font-size:0.78rem;color:var(--text2);margin-top:14px;text-align:center;">
						Las soluciones son números irracionales pertenecientes a ℝ \ ℚ (expresados de
						forma exacta con radicales).
					</p>
				{/if}
			{/if}
		{:else}
			{#if data.is_irrational}
				<div class="irrational-badge">
					<Sparkles size={13} />
					<span>Solución irracional</span>
				</div>
			{/if}
			<MathExpression latex={data.result_latex} displayMode={true} />
			{#if data.is_irrational}
				<p style="font-size:0.78rem;color:var(--text2);margin-top:14px;text-align:center;">
					La solución es un número irracional perteneciente a ℝ \ ℚ.
				</p>
			{:else if isAlreadySimplified}
				<p style="font-size:0.8rem;color:var(--text3);margin-top:14px;">
					Esta expresión ya está en su forma más simple.
				</p>
			{/if}
		{/if}
	</div>
</div>
