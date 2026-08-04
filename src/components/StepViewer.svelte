<script lang="ts">
	import type { RuleResult } from '../algebra/types';
	import MathExpression from './MathExpression.svelte';
	import { formatToLatex } from '../algebra/formatter';

	let { steps = [] } = $props<{ steps?: RuleResult[] }>();

	function fmt(n: number): string {
		return Number.isInteger(n) ? n.toString() : parseFloat(n.toFixed(4)).toString();
	}
</script>

{#each steps as step, i (i)}
	<div class="step-card anim-fade-up" style="animation-delay: {i * 0.06}s">
		<!-- Number column -->
		<div class="step-number-col">{i + 1}</div>

		<!-- Body -->
		<div class="step-body">
			<!-- Rule name + concept -->
			<div class="step-rule-name">{step.title}</div>
			{#if step.concept}
				<div class="step-concept">💡 {step.concept}</div>
			{/if}

			<!-- Transformation: before → after (only for non-terminal or normal steps) -->
			{#if step.solutions === undefined}
				<div class="step-transform notranslate" translate="no">
					<div class="before">
						<MathExpression latex={formatToLatex(step.before)} displayMode={false} />
					</div>
					<div class="arrow">⟶</div>
					<div class="after">
						<MathExpression latex={formatToLatex(step.after)} displayMode={false} />
					</div>
				</div>
			{:else if step.solutions.length === 0}
				<!-- No solution: standard transform row before ⟶ S = \emptyset -->
				<div class="step-transform notranslate" translate="no">
					<div class="before">
						<MathExpression latex={formatToLatex(step.before)} displayMode={false} />
					</div>
					<div class="arrow">⟶</div>
					<div class="after">
						<MathExpression latex="S = \emptyset" displayMode={false} />
					</div>
				</div>
			{:else if step.solutions.length === 1}
				<!-- One double root -->
				<div class="step-transform notranslate" translate="no">
					<div class="before">
						<MathExpression latex={formatToLatex(step.before)} displayMode={false} />
					</div>
					<div class="arrow">⟶</div>
					<div class="after">
						<MathExpression
							latex={`x = ${step.solutionsLatex?.[0] ?? fmt(step.solutions[0])}`}
							displayMode={false}
						/>
					</div>
				</div>
			{:else}
				<!-- Two solutions -->
				<div class="step-transform notranslate" translate="no">
					<div class="before">
						<MathExpression latex={formatToLatex(step.before)} displayMode={false} />
					</div>
					<div class="arrow">⟶</div>
					<div class="after" style="display:flex;flex-direction:column;gap:4px;">
						<MathExpression
							latex={`x_1 = ${step.solutionsLatex?.[0] ?? fmt(step.solutions[0])}`}
							displayMode={false}
						/>
						<MathExpression
							latex={`x_2 = ${step.solutionsLatex?.[1] ?? fmt(step.solutions[1])}`}
							displayMode={false}
						/>
					</div>
				</div>
			{/if}

			<!-- Explanation blocks -->
			{#if step.explanationBlocks && step.explanationBlocks.length > 0}
				<div class="step-explanation-blocks">
					{#each step.explanationBlocks as block, blockIndex (blockIndex)}
						{#if block.type === 'text'}
							<p class="block-text">{block.content}</p>
						{:else if block.type === 'math'}
							<div class="block-math notranslate" translate="no">
								<MathExpression latex={block.content} displayMode={false} />
							</div>
						{/if}
					{/each}
				</div>
			{:else if step.explanation}
				<p class="block-text" style="margin-top:8px;">{step.explanation}</p>
			{/if}
		</div>
	</div>
{/each}
