<script lang="ts">
	let { value = $bindable(''), placeholder = 'Ej: 2(x+3) = 10' } = $props<{ value?: string, placeholder?: string }>();
	
	let inputRef: HTMLInputElement;
	
	function handleInput(event: Event) {
		const target = event.target as HTMLInputElement;
		value = target.value;
	}
</script>

<div class="relative w-full">
	<div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
		<span class="text-gray-400 font-mono text-lg">ƒ(x)</span>
	</div>
	<input
		bind:this={inputRef}
		type="text"
		bind:value={value}
		{placeholder}
		class="w-full pl-14 pr-4 py-4 text-xl font-mono bg-gray-800 text-white border-2 border-gray-700 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 focus:outline-none transition-all shadow-lg placeholder-gray-500"
		autocomplete="off"
		spellcheck="false"
	/>
</div>
