<script lang="ts">
	let { value = $bindable(''), placeholder = 'Ej: 2(x+3) = 10' } = $props<{
		value?: string;
		placeholder?: string;
	}>();

	let inputRef: HTMLInputElement;
</script>

<div class="relative w-full">
	<div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
		<span class="font-mono text-lg text-gray-400">ƒ(x)</span>
	</div>
	<input
		bind:this={inputRef}
		type="text"
		bind:value
		{placeholder}
		class="w-full rounded-xl border-2 border-gray-700 bg-gray-800 py-4 pr-4 pl-14 font-mono text-xl text-white placeholder-gray-500 shadow-lg transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 focus:outline-none"
		autocomplete="off"
		spellcheck="false"
	/>
</div>
