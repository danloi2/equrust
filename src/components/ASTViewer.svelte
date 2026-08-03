<script lang="ts">
	import type { Expr } from '../algebra/types';

	let { ast = null } = $props<{ ast?: Expr | null }>();
</script>

<div class="mt-8 overflow-hidden rounded-xl border border-gray-700 bg-gray-900 shadow-2xl">
	<div class="flex items-center justify-between border-b border-gray-700 bg-gray-800 px-4 py-2">
		<h3 class="text-sm font-semibold tracking-wider text-gray-300 uppercase">
			Árbol de Sintaxis Abstracta (AST)
		</h3>
		<span class="font-mono text-xs text-gray-500">JSON</span>
	</div>
	<div class="max-h-100 overflow-auto p-4">
		{#if ast}
			<pre class="font-mono text-sm leading-relaxed text-green-400"><code
					>{JSON.stringify(ast, null, 2)}</code
				></pre>
		{:else}
			<div class="py-4 text-center text-sm text-gray-600 italic">Esperando expresión válida...</div>
		{/if}
	</div>
</div>
