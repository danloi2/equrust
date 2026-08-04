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

		try {
			board = JXG.JSXGraph.initBoard(container, {
				boundingbox: [minX, maxAbsVal, maxX, -maxAbsVal],
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

			if (ast.type === 'Equation') {
				// ── Enfoque f(x) vs g(x) ──────────────────────────────────────
				// f(x) = lado izquierdo de la ecuación (violeta)
				// g(x) = lado derecho de la ecuación (cian)
				// Las intersecciones son las soluciones

				const leftExpr = ast.left;
				const rightExpr = ast.right;

				const fFn = (x: number) => {
					const val = evalAST(leftExpr, x);
					return isNaN(val) || !isFinite(val) ? null : val;
				};

				const gFn = (x: number) => {
					const val = evalAST(rightExpr, x);
					return isNaN(val) || !isFinite(val) ? null : val;
				};

				// Ajustar bounding box para que los puntos de intersección sean visibles
				if (validSols.length > 0) {
					const yAtSols = validSols.map((s: number) => fFn(s)).filter((y: number | null) => y !== null) as number[];
					if (yAtSols.length > 0) {
						const maxAbsY = Math.max(...yAtSols.map(Math.abs));
						if (maxAbsY > maxAbsVal) {
							const newRange = Math.ceil(maxAbsY * 1.3);
							board.setBoundingBox([minX, newRange, maxX, -newRange], true);
						}
					}
				}

				// Curva f(x) — lado izquierdo (violeta)
				board.create('functiongraph', [fFn, minX, maxX], {
					strokeColor: '#8b5cf6',
					strokeWidth: 3,
					highlight: false
				});

				// Curva g(x) — lado derecho (cian, discontinua)
				board.create('functiongraph', [gFn, minX, maxX], {
					strokeColor: '#06b6d4',
					strokeWidth: 3,
					highlight: false,
					dash: 2
				});

				// Puntos de intersección (soluciones)
				validSols.forEach((sol: number, idx: number) => {
					const yIntersect = fFn(sol) ?? 0;
					const latexLabel =
						solutionsLatex[idx] ??
						(Number.isInteger(sol) ? sol.toString() : sol.toFixed(2));
					board.create('point', [sol, yIntersect], {
						name: `x${validSols.length > 1 ? `_${idx + 1}` : ''} = ${latexLabel}`,
						size: 5,
						fillColor: '#10b981',
						strokeColor: '#ffffff',
						strokeWidth: 2,
						fixed: true,
						label: {
							fontSize: 12,
							offset: [10, 12],
							color: '#34d399'
						}
					});
				});

				// Vértice si la parte izquierda es cuadrática
				const coefs = extractQuadraticCoefs(leftExpr);
				if (coefs && coefs.a !== 0) {
					const xv = -coefs.b / (2 * coefs.a);
					const yv = fFn(xv);
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
			} else {
				// ── Expresión simple: graficar y = f(x) ──────────────────────
				const fn = (x: number) => {
					const val = evalAST(ast, x);
					return isNaN(val) || !isFinite(val) ? null : val;
				};

				board.create('functiongraph', [fn, minX, maxX], {
					strokeColor: '#8b5cf6',
					strokeWidth: 3,
					highlight: false
				});

				// Puntos donde f(x) = 0 (corte con eje x)
				validSols.forEach((sol: number, idx: number) => {
					const latexLabel =
						solutionsLatex[idx] ??
						(Number.isInteger(sol) ? sol.toString() : sol.toFixed(2));
					board.create('point', [sol, 0], {
						name: `x = ${latexLabel}`,
						size: 5,
						fillColor: '#10b981',
						strokeColor: '#ffffff',
						strokeWidth: 2,
						fixed: true,
						label: {
							fontSize: 12,
							offset: [10, 12],
							color: '#34d399'
						}
					});
				});
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
		{#if ast && (ast as any).type === 'Equation'}
			<div class="legend-item">
				<span class="legend-line solid" style="background:#8b5cf6;"></span>
				<span>f(x) — lado izquierdo</span>
			</div>
			<div class="legend-item">
				<span class="legend-line dashed" style="border-color:#06b6d4;"></span>
				<span>g(x) — lado derecho</span>
			</div>
		{:else}
			<div class="legend-item">
				<span class="legend-dot" style="background:#8b5cf6;"></span>
				<span>f(x)</span>
			</div>
		{/if}
		{#if solutions.length > 0}
			<div class="legend-item">
				<span class="legend-dot" style="background:#10b981;"></span>
				<span
					>{ast && (ast as any).type === 'Equation'
						? 'Intersecciones (soluciones)'
						: 'Raíces'}</span
				>
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

	.legend-line {
		display: inline-block;
		width: 20px;
		height: 3px;
		border-radius: 2px;
	}

	.legend-line.dashed {
		background: transparent;
		border-top: 3px dashed currentColor;
		height: 0;
	}
</style>
