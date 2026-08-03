<script lang="ts">
	import katex from 'katex';
	import 'katex/dist/katex.min.css';

	let {
		latex = '',
		displayMode = true,
		error = null
	} = $props<{ latex?: string; displayMode?: boolean; error?: string | null }>();

	let html = $derived.by(() => {
		if (!latex || error) return '';
		try {
			return katex.renderToString(latex, {
				displayMode,
				throwOnError: false,
				strict: false
			});
		} catch (err) {
			console.error('KaTeX Error:', err);
			return '';
		}
	});
</script>

<div class="katex-wrap" class:display={displayMode}>
	{#if error}
		<span class="katex-error">{error}</span>
	{:else if !latex}
		<span class="katex-placeholder">—</span>
	{:else}
		<!-- eslint-disable-next-line svelte/no-at-html-tags -->
		{@html html}
	{/if}
</div>

<style>
	.katex-wrap {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: 1.4em;
	}
	.katex-wrap.display {
		width: 100%;
	}
	.katex-error {
		color: #fb7185;
		font-size: 0.8rem;
	}
	.katex-placeholder {
		color: #50507a;
		font-size: 0.9rem;
	}
</style>
