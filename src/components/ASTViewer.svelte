<script lang="ts">
	import type { Expr } from '../algebra/types';

	let { ast = null } = $props<{ ast?: Expr | null }>();
</script>

<div class="mt-8 bg-gray-900 border border-gray-700 rounded-xl overflow-hidden shadow-2xl">
	<div class="bg-gray-800 px-4 py-2 border-b border-gray-700 flex justify-between items-center">
		<h3 class="text-sm font-semibold text-gray-300 uppercase tracking-wider">Árbol de Sintaxis Abstracta (AST)</h3>
		<span class="text-xs text-gray-500 font-mono">JSON</span>
	</div>
	<div class="p-4 overflow-auto max-h-100">
		{#if ast}
			<pre class="text-sm text-green-400 font-mono leading-relaxed"><code>{JSON.stringify(ast, null, 2)}</code></pre>
		{:else}
			<div class="text-gray-600 italic text-sm text-center py-4">Esperando expresión válida...</div>
		{/if}
	</div>
</div>
