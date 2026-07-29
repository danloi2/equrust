<script lang="ts">
	import MathExpression from './MathExpression.svelte';
	import { Delete, RotateCcw, Sparkles } from '@lucide/svelte';

	let {
		onInsert,
		onBackspace,
		onClear,
		onSolve
	} = $props<{
		onInsert: (text: string, offset?: number) => void;
		onBackspace: () => void;
		onClear: () => void;
		onSolve: () => void;
	}>();

	type TabType = 'basic' | 'functions';
	let activeTab = $state<TabType>('basic');

	// ───── Pestaña 1: Básico ─────
	// Numpad: dígitos + operadores básicos + paréntesis + igual + variables
	// Layout: 4 filas × 5 columnas
	const NUMPAD_ROWS = [
		[
			{ label: '7', text: '7' },
			{ label: '8', text: '8' },
			{ label: '9', text: '9' },
			{ label: '÷', text: ' / ', variant: 'op' },
			{ label: '(', text: '(', variant: 'paren' }
		],
		[
			{ label: '4', text: '4' },
			{ label: '5', text: '5' },
			{ label: '6', text: '6' },
			{ label: '·', text: ' \\cdot ', variant: 'op' },
			{ label: ')', text: ')', variant: 'paren' }
		],
		[
			{ label: '1', text: '1' },
			{ label: '2', text: '2' },
			{ label: '3', text: '3' },
			{ label: '−', text: ' - ', variant: 'op' },
			{ label: '=', text: ' = ', variant: 'op' }
		],
		[
			{ label: '0', text: '0' },
			{ label: '.', text: '.' },
			{ label: 'x', text: 'x', variant: 'var' },
			{ label: '+', text: ' + ', variant: 'op' },
			{ label: 'y', text: 'y', variant: 'var' }
		]
	] as const;

	// ───── Pestaña 2: Funciones ─────
	// Estructuras matemáticas sin repetir nada del tab básico
	const FUNCTIONS = [
		{ label: '\\frac{a}{b}', text: '\\frac{}{}', offset: -3, title: 'Fracción' },
		{ label: '\\sqrt{}', text: '\\sqrt{}', offset: -1, title: 'Raíz cuadrada' },
		{ label: '\\sqrt[n]{}', text: '\\sqrt[]{}', offset: -3, title: 'Raíz n-ésima' },
		{ label: 'x^2', text: '^2', offset: 0, title: 'Cuadrado (x²)' },
		{ label: 'x^n', text: '^', offset: 0, title: 'Potencia n' },
		{ label: 'a', text: 'a', offset: 0, title: 'Variable a', isText: true },
		{ label: 'b', text: 'b', offset: 0, title: 'Variable b', isText: true },
		{ label: 'z', text: 'z', offset: 0, title: 'Variable z', isText: true }
	];

	type NumpadKey = { label: string; text: string; variant?: string };
	function variantClass(key: NumpadKey): string {
		if (key.variant === 'op') return 'op-btn';
		if (key.variant === 'paren') return 'paren-btn';
		if (key.variant === 'var') return 'var-btn';
		return '';
	}
</script>

<div class="virtual-keyboard">
	<!-- Tab selector -->
	<div class="vk-tabs">
		<button
			type="button"
			class="vk-tab"
			class:active={activeTab === 'basic'}
			onclick={() => (activeTab = 'basic')}
		>
			Básico
		</button>
		<button
			type="button"
			class="vk-tab"
			class:active={activeTab === 'functions'}
			onclick={() => (activeTab = 'functions')}
		>
			Funciones
		</button>
	</div>

	<!-- ─── Pestaña Básico ─── -->
	{#if activeTab === 'basic'}
		<div class="vk-body">
			<div class="vk-main-grid">
				<!-- Numpad 5 columnas -->
				<div class="numpad-grid">
					{#each NUMPAD_ROWS as row}
						{#each row as key}
							<button
								type="button"
								class="vk-btn {variantClass(key)}"
								onclick={() => onInsert(key.text)}
							>
								{key.label}
							</button>
						{/each}
					{/each}
				</div>

				<!-- Columna de acciones -->
				<div class="actions-col">
					<button
						type="button"
						class="vk-btn action-btn danger"
						title="Borrar carácter"
						onclick={onBackspace}
					>
						<Delete size={16} />
					</button>
					<button
						type="button"
						class="vk-btn action-btn clear"
						title="Limpiar todo"
						onclick={onClear}
					>
						<RotateCcw size={15} />
					</button>
					<button
						type="button"
						class="vk-btn action-btn solve"
						title="Resolver"
						onclick={onSolve}
					>
						<Sparkles size={16} />
					</button>
				</div>
			</div>
		</div>

	<!-- ─── Pestaña Funciones ─── -->
	{:else}
		<div class="vk-body">
			<div class="fn-grid">
				{#each FUNCTIONS as item}
					<button
						type="button"
						class="vk-btn fn-btn"
						class:fn-var={item.isText}
						title={item.title}
						onclick={() => onInsert(item.text, item.offset)}
					>
						{#if item.isText}
							<span class="var-label">{item.label}</span>
						{:else}
							<div class="notranslate" translate="no">
								<MathExpression latex={item.label} displayMode={false} />
							</div>
						{/if}
					</button>
				{/each}
			</div>

			<!-- Acciones también disponibles aquí -->
			<div class="fn-actions">
				<button type="button" class="vk-btn action-btn danger" title="Borrar carácter" onclick={onBackspace}>
					<Delete size={16} />
				</button>
				<button type="button" class="vk-btn action-btn clear" title="Limpiar todo" onclick={onClear}>
					<RotateCcw size={15} />
				</button>
				<button type="button" class="vk-btn action-btn solve" title="Resolver" onclick={onSolve}>
					<Sparkles size={16} />
				</button>
			</div>
		</div>
	{/if}
</div>

<style>
	.virtual-keyboard {
		background: rgba(13, 13, 26, 0.95);
		border: 1px solid var(--border2);
		border-radius: var(--radius);
		padding: 12px;
		backdrop-filter: blur(20px);
		box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
		animation: vkFadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
	}

	@keyframes vkFadeIn {
		from { opacity: 0; transform: translateY(-8px); }
		to   { opacity: 1; transform: translateY(0); }
	}

	/* Tabs */
	.vk-tabs {
		display: flex;
		gap: 6px;
		margin-bottom: 10px;
		background: rgba(255, 255, 255, 0.03);
		padding: 4px;
		border-radius: 10px;
	}
	.vk-tab {
		flex: 1;
		padding: 6px 10px;
		background: transparent;
		border: none;
		border-radius: 7px;
		color: var(--text2);
		font-size: 0.72rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.18s;
	}
	.vk-tab.active {
		background: var(--accent);
		color: #fff;
		box-shadow: 0 2px 10px var(--accent-glow);
	}

	/* Body */
	.vk-body {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	/* Layout básico: numpad + actions */
	.vk-main-grid {
		display: grid;
		grid-template-columns: 1fr 48px;
		gap: 6px;
	}
	.numpad-grid {
		display: grid;
		grid-template-columns: repeat(5, 1fr);
		gap: 5px;
	}
	.actions-col {
		display: flex;
		flex-direction: column;
		gap: 5px;
	}

	/* Botón base */
	.vk-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 40px;
		background: var(--surface2);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 8px;
		color: var(--text);
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.95rem;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.15s, border-color 0.15s, transform 0.1s;
		user-select: none;
	}
	.vk-btn:hover {
		background: rgba(139, 92, 246, 0.22);
		border-color: var(--border2);
		transform: translateY(-1px);
	}
	.vk-btn:active {
		transform: translateY(0);
	}

	/* Variantes del numpad */
	.op-btn {
		background: rgba(139, 92, 246, 0.12);
		color: var(--accent-light);
		font-size: 1.1rem;
	}
	.paren-btn {
		background: rgba(34, 211, 238, 0.08);
		color: var(--cyan);
		font-size: 1.05rem;
	}
	.var-btn {
		font-style: italic;
		color: var(--cyan);
	}

	/* Acciones */
	.action-btn {
		flex: 1;
		border-radius: 8px;
		min-height: 40px;
	}
	.action-btn.danger {
		background: rgba(244, 63, 94, 0.15);
		color: #fb7185;
		border-color: rgba(244, 63, 94, 0.3);
	}
	.action-btn.clear {
		background: rgba(245, 158, 11, 0.15);
		color: #fbbf24;
		border-color: rgba(245, 158, 11, 0.3);
	}
	.action-btn.solve {
		background: linear-gradient(135deg, var(--accent), var(--accent2));
		color: #fff;
		box-shadow: 0 4px 14px var(--accent-glow);
	}

	/* Pestaña Funciones */
	.fn-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 7px;
	}
	.fn-btn {
		height: 46px;
		background: rgba(139, 92, 246, 0.12);
		border-color: rgba(139, 92, 246, 0.25);
	}
	.fn-btn.fn-var {
		background: rgba(34, 211, 238, 0.08);
		border-color: rgba(34, 211, 238, 0.2);
	}
	.var-label {
		font-style: italic;
		color: var(--cyan);
		font-size: 1.05rem;
	}
	.fn-actions {
		display: flex;
		gap: 6px;
	}
	.fn-actions .action-btn {
		min-height: 38px;
	}
</style>
