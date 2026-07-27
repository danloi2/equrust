<script lang="ts">
	import katex from 'katex';
	import 'katex/dist/katex.min.css';
	let { latex = '', displayMode = true, error = null } = $props<{ latex?: string, displayMode?: boolean, error?: string | null }>();

	let container: HTMLDivElement | undefined = $state();

	$effect(() => {
		if (!container) return;
		// Limpiar siempre antes de renderizar para evitar duplicados
		container.innerHTML = '';
		if (latex && !error) {
			try {
				katex.render(latex, container, {
					displayMode,
					throwOnError: false,
					strict: false
				});
			} catch (err) {
				console.error("KaTeX Error:", err);
			}
		}
	});
</script>

<div class="w-full flex justify-center items-center py-8 min-h-30">
	{#if error}
		<div class="text-red-400 bg-red-900/30 border border-red-500/50 rounded-lg px-6 py-4 flex items-center gap-3">
			<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
			</svg>
			<span class="font-medium">{error}</span>
		</div>
	{:else if !latex}
		<div class="text-gray-500 italic">La expresión aparecerá aquí...</div>
	{:else}
		<!-- El div siempre existe en el DOM; KaTeX lo rellena via $effect -->
		<div bind:this={container} class="text-3xl text-gray-100 transition-all duration-300"></div>
	{/if}
</div>

