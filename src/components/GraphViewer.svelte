<script lang="ts">
	import JXG from 'jsxgraph';
	import type { Expr } from '../algebra/types';
	import { evalAST } from '../algebra/utils/eval';
	import { extractQuadraticCoefs } from '../algebra/utils/quadratic';
	import { ZoomIn, ZoomOut, RotateCcw, Activity } from '@lucide/svelte';

	let {
		ast = null,
		solutions = [],
		solutionsLatex = []
	} = $props<{
		ast?: Expr | null;
		solutions?: readonly number[];
		solutionsLatex?: readonly string[];
	}>();

	let container: HTMLDivElement | undefined = $state();
	let board: any = null;

	function initGraph() {
		if (!container || !ast) return;

		// Limpiar contenedor previo si existe
		container.innerHTML = '';

		// Calcular rango simétrico para que (0, 0) quede siempre en el centro exacto del gráfico
		const validSols = (solutions || []).filter((s: number) => typeof s === 'number' && !isNaN(s));
		let maxAbsVal = 7;
		if (validSols.length > 0) {
			const maxSolDist = Math.max(...validSols.map((s: number) => Math.abs(s)));
			maxAbsVal = Math.max(7, Math.ceil(maxSolDist * 1.5));
		}

		const minX = -maxAbsVal;
		const maxX = maxAbsVal;
		const minY = -maxAbsVal;
		const maxY = maxAbsVal;

		try {
			board = JXG.JSXGraph.initBoard(container, {
				boundingbox: [minX, maxY, maxX, minY],
				axis: false,
				showCopyright: false,
				showNavigation: false,
				keepaspectratio: false,
				pan: { enabled: true },
				zoom: { factorX: 1.25, factorY: 1.25 }
			} as any);

			// Eje X (horizontal)
			board.create('axis', [[0, 0], [1, 0]], {
				name: 'x',
				withLabel: true,
				label: {
					position: 'rt',
					offset: [-15, 15],
					color: '#94a3b8',
					fontSize: 12
				},
				strokeColor: 'rgba(255, 255, 255, 0.4)',
				strokeWidth: 2,
				ticks: {
					strokeColor: 'rgba(255, 255, 255, 0.2)',
					label: { color: '#94a3b8', fontSize: 10 }
				}
			});

			// Eje Y (vertical)
			board.create('axis', [[0, 0], [0, 1]], {
				name: 'y',
				withLabel: true,
				label: {
					position: 'rt',
					offset: [15, -15],
					color: '#94a3b8',
					fontSize: 12
				},
				strokeColor: 'rgba(255, 255, 255, 0.4)',
				strokeWidth: 2,
				ticks: {
					strokeColor: 'rgba(255, 255, 255, 0.2)',
					label: { color: '#94a3b8', fontSize: 10 }
				}
			});

			// Función a graficar: f(x)
			const fn = (x: number) => {
				const val = evalAST(ast, x);
				return isNaN(val) || !isFinite(val) ? null : val;
			};

			// Crear la curva de la función f(x)
			board.create('functiongraph', [fn, minX, maxX], {
				strokeColor: '#8b5cf6',
				strokeWidth: 3.5,
				highlight: false
			});

			// Graficar las raíces / soluciones reales (puntos de corte con el eje x)
			validSols.forEach((sol: number, idx: number) => {
				const latexLabel = solutionsLatex[idx] ?? (Number.isInteger(sol) ? sol.toString() : sol.toFixed(2));
				board.create('point', [sol, 0], {
					name: `x_${idx + 1} = ${latexLabel}`,
					size: 5,
					fillColor: '#10b981',
					strokeColor: '#ffffff',
					strokeWidth: 2,
					fixed: true,
					label: {
						fontSize: 12,
						offset: [10, 15],
						color: '#34d399'
					}
				});
			});

			// Si la ecuación es cuadrática (ax² + bx + c), marcar también el vértice
			const targetExpr = ast.type === 'Equation' ? ast.left : ast;
			const coefs = extractQuadraticCoefs(targetExpr);
			if (coefs && coefs.a !== 0) {
				const xv = -coefs.b / (2 * coefs.a);
				const yv = fn(xv);
				if (typeof yv === 'number' && !isNaN(yv)) {
					board.create('point', [xv, yv], {
						name: `Vértice (${xv.toFixed(1)}, ${yv.toFixed(1)})`,
						size: 4,
						fillColor: '#f59e0b',
						strokeColor: '#ffffff',
						strokeWidth: 2,
						fixed: true,
						label: {
							fontSize: 11,
							offset: [-30, -18],
							color: '#fbbf24'
						}
					});
				}
			}
		} catch (err) {
			console.error('Error inicializando JSXGraph:', err);
		}
	}

	$effect(() => {
		if (ast) {
			initGraph();
		}
	});

	function zoomIn() {
		if (board) board.zoomIn();
	}

	function zoomOut() {
		if (board) board.zoomOut();
	}

	function resetView() {
		initGraph();
	}
</script>

<div class="graph-card anim-fade-up">
	<div class="graph-header">
		<div class="graph-title">
			<Activity size={16} class="text-accent" />
			<span>Representación Gráfica Interactiva (JSXGraph)</span>
		</div>
		<div class="graph-controls">
			<button type="button" class="graph-ctrl-btn" title="Acercar" onclick={zoomIn}>
				<ZoomIn size={14} />
			</button>
			<button type="button" class="graph-ctrl-btn" title="Alejar" onclick={zoomOut}>
				<ZoomOut size={14} />
			</button>
			<button type="button" class="graph-ctrl-btn" title="Restablecer vista" onclick={resetView}>
				<RotateCcw size={14} />
			</button>
		</div>
	</div>

	<!-- JSXGraph Container Board -->
	<div bind:this={container} class="jxg-board-wrap"></div>

	<div class="graph-legend">
		<div class="legend-item">
			<span class="legend-dot" style="background:#8b5cf6;"></span>
			<span>Función $f(x)$</span>
		</div>
		{#if solutions.length > 0}
			<div class="legend-item">
				<span class="legend-dot" style="background:#10b981;"></span>
				<span>Raíces (Corte eje $x$)</span>
			</div>
		{/if}
		<div class="legend-item" style="margin-left:auto;color:var(--text3);font-size:0.75rem;">
			<span>Arrastra o usa la rueda para explorar la gráfica</span>
		</div>
	</div>
</div>

<style>
	.graph-card {
		background: var(--bg2);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		padding: 20px;
		margin-top: 24px;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.graph-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.graph-title {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 0.88rem;
		font-weight: 700;
		color: var(--text);
	}

	.graph-controls {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.graph-ctrl-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 30px;
		height: 30px;
		background: var(--surface2);
		border: 1px solid var(--border);
		border-radius: 6px;
		color: var(--text2);
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.graph-ctrl-btn:hover {
		background: rgba(139, 92, 246, 0.2);
		border-color: var(--accent);
		color: #ffffff;
	}

	.jxg-board-wrap {
		width: 100%;
		height: 380px;
		border-radius: var(--radius-sm);
		overflow: hidden;
		background: #090914 !important;
		border: 1px solid var(--border);
	}

	.graph-legend {
		display: flex;
		align-items: center;
		gap: 16px;
		font-size: 0.78rem;
		color: var(--text2);
	}

	.legend-item {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.legend-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
	}
</style>
