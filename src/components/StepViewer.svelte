<script lang="ts">
	import type { RuleResult } from '../algebra/types';
	import MathExpression from './MathExpression.svelte';
	import { formatToLatex } from '../algebra/formatter';

	let { steps = [] } = $props<{ steps?: RuleResult[] }>();

	function fmt(n: number): string {
		return Number.isInteger(n) ? n.toString() : parseFloat(n.toFixed(4)).toString();
	}
</script>

{#if steps.length > 0}
	<div class="mt-8 space-y-6">
		<h2 class="text-2xl font-bold text-gray-200 border-b border-gray-700 pb-2">Resolución Paso a Paso</h2>

		<div class="space-y-4">
			{#each steps as step, index}
				<div class="bg-gray-800/80 border border-gray-700 rounded-xl p-6 shadow-md hover:border-blue-500/50 transition-colors">
					<!-- Cabecera del paso -->
					<div class="flex items-center justify-between mb-4">
						<div class="flex items-center gap-3">
							<span class="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-sm shadow-sm">
								{index + 1}
							</span>
							<h3 class="text-lg font-semibold text-blue-400">{step.title}</h3>
						</div>
						<span class="text-xs font-medium px-2.5 py-1 bg-gray-700 text-gray-300 rounded-full tracking-wide">
							{step.concept}
						</span>
					</div>

					<!-- Explicación (preserva saltos de línea) -->
					<p class="text-gray-300 mb-6 text-sm leading-relaxed whitespace-pre-line">
						{step.explanation}
					</p>

					<!-- Resultado principal: expresión transformada -->
					{#if step.solutions === undefined}
						<!-- Paso normal: mostrar el after -->
						<div class="bg-gray-900 rounded-lg py-4 border border-gray-800 flex justify-center">
							<div class="text-xl">
								<MathExpression latex={formatToLatex(step.after)} />
							</div>
						</div>

					{:else if step.solutions.length === 0}
						<!-- Sin solución real -->
						<div class="bg-red-950/40 border border-red-700/50 rounded-lg py-5 flex flex-col items-center gap-2">
							<span class="text-4xl">∅</span>
							<span class="text-red-300 font-semibold text-lg">Sin solución real</span>
							<span class="text-red-400 text-sm">La ecuación no tiene raíces en ℝ</span>
						</div>

					{:else if step.solutions.length === 1}
						<!-- Una solución doble -->
						<div class="bg-gray-900 rounded-lg py-4 border border-amber-600/40 flex flex-col items-center gap-1">
							<span class="text-xs text-amber-400 font-semibold tracking-widest uppercase mb-1">Raíz doble</span>
							<MathExpression latex={`x = ${fmt(step.solutions[0])}`} />
						</div>

					{:else}
						<!-- Dos soluciones -->
						<div class="grid grid-cols-2 gap-3">
							<div class="bg-gray-900 rounded-lg py-4 border border-green-600/40 flex flex-col items-center gap-1">
								<span class="text-xs text-green-400 font-semibold tracking-widest uppercase mb-1">Solución 1</span>
								<MathExpression latex={`x_1 = ${fmt(step.solutions[0])}`} />
							</div>
							<div class="bg-gray-900 rounded-lg py-4 border border-green-600/40 flex flex-col items-center gap-1">
								<span class="text-xs text-green-400 font-semibold tracking-widest uppercase mb-1">Solución 2</span>
								<MathExpression latex={`x_2 = ${fmt(step.solutions[1])}`} />
							</div>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	</div>
{/if}
