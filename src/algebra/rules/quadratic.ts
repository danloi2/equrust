import type { Expr, Rule, RuleResult } from '../types/index';
import { createFractionExpr, formatFractionLatex, gcd } from '../utils/fraction';
import { extractQuadraticCoefs } from '../utils/quadratic';

/**
 * Simplifica un radical √d extraiendo el mayor factor cuadrado perfecto k²:
 * √d = k * √m
 */
function simplifySquareRoot(d: number): { k: number; m: number } {
	let k = 1;
	let m = d;
	for (let i = Math.floor(Math.sqrt(d)); i >= 2; i--) {
		if (d % (i * i) === 0) {
			k = i;
			m = d / (i * i);
			break;
		}
	}
	return { k, m };
}

/**
 * Formatea una solución exacta con radicando simplificado en LaTeX:
 * x = (-b ± k√m) / (2a)
 */
function formatRadicalRoot(a: number, b: number, d: number, isPlus: boolean): string {
	const { k, m } = simplifySquareRoot(d);
	let N = -b;
	let K = k;
	let D = 2 * a;

	if (D < 0) {
		N = -N;
		D = -D;
	}

	const g = gcd(gcd(Math.abs(N), K), D);
	const Nprime = N / g;
	const Kprime = K / g;
	const Dprime = D / g;

	const sign = isPlus ? '+' : '-';
	const radStr = Kprime === 1 ? `\\sqrt{${m}}` : `${Kprime}\\sqrt{${m}}`;

	if (Nprime === 0) {
		const prefix = isPlus ? '' : '-';
		if (Dprime === 1) {
			return `${prefix}${radStr}`;
		}
		return `${prefix}\\frac{${radStr}}{${Dprime}}`;
	}

	const numStr = `${Nprime} ${sign} ${radStr}`;
	if (Dprime === 1) {
		return numStr;
	}
	return `\\frac{${numStr}}{${Dprime}}`;
}

/**
 * Aplica la fórmula de Bhaskara (cuadrática) a ecuaciones de la forma ax² + bx + c = 0.
 */
export class QuadraticFormulaRule implements Rule {
	readonly name = 'quadratic_formula';

	applies(expr: Expr): boolean {
		if (expr.type !== 'Equation') return false;
		if (expr.right.type !== 'Number' || expr.right.value !== 0) return false;
		return extractQuadraticCoefs(expr.left) !== null;
	}

	apply(expr: Expr): RuleResult {
		if (expr.type !== 'Equation') {
			return { before: expr, after: expr, title: '', explanation: '', concept: '', difficulty: 0, solutions: [] };
		}

		const coefs = extractQuadraticCoefs(expr.left)!;
		const { a, b, c, varName } = coefs;

		const discriminant = b * b - 4 * a * c;
		const coefsStr = `a = ${a}, \\quad b = ${b}, \\quad c = ${c}`;
		const formulaStr = `${varName} = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}`;
		const subStr = `${varName} = \\frac{-(${b}) \\pm \\sqrt{(${b})^2 - 4 \\cdot (${a}) \\cdot (${c})}}{2 \\cdot (${a})}`;
		// Versión con valores ya evaluados: muestra -b y 2a calculados, y el discriminante como número
		const negB = -b;
		const twoA = 2 * a;
		const negBStr = negB < 0 ? `(${negB})` : `${negB}`;
		const computedStr = `${varName} = \\frac{${negBStr} \\pm \\sqrt{${discriminant}}}{${twoA}}`;
		const discCalcStr = `\\Delta = b^2 - 4ac = (${b})^2 - 4 \\cdot (${a}) \\cdot (${c}) = ${discriminant}`;


		if (discriminant < 0) {
			return {
				before: expr,
				after: {
					type: 'Equation',
					left: { type: 'Variable', name: varName },
					right: { type: 'Variable', name: '\\emptyset' }
				},
				title: 'Fórmula de Bhaskara — Sin solución real',
				explanation: `Para la ecuación cuadrática, identificamos los coeficientes:\na = ${a}, b = ${b}, c = ${c}\nAplicamos la fórmula de Bhaskara:\nCalculamos el discriminante: Δ = ${discriminant}.\nComo Δ < 0, la ecuación no tiene soluciones reales.`,
				explanationBlocks: [
					{ type: 'text', content: 'Identificamos los coeficientes de la ecuación cuadrática:' },
					{ type: 'math', content: coefsStr },
					{ type: 'text', content: 'Fórmula general de Bhaskara:' },
					{ type: 'math', content: formulaStr },
					{ type: 'text', content: 'Sustituimos los coeficientes:' },
					{ type: 'math', content: subStr },
					{ type: 'text', content: 'Calculamos el discriminante Δ:' },
					{ type: 'math', content: discCalcStr },
					{ type: 'text', content: 'Con los valores evaluados:' },
					{ type: 'math', content: computedStr },
					{ type: 'text', content: 'Como Δ < 0, la raíz cuadrada de un número negativo no existe en ℝ. La parábola no corta el eje x. La ecuación no tiene soluciones reales.' }
				],
				concept: 'Discriminante negativo → Sin raíces reales',
				difficulty: 9,
				solutions: [],
				solutionsLatex: [],
				terminal: true
			};
		}

		if (discriminant === 0) {
			const x = -b / (2 * a);
			const xExpr = createFractionExpr(-b, 2 * a);
			const xLatex = formatFractionLatex(-b, 2 * a);
			return {
				before: expr,
				after: {
					type: 'Equation',
					left: { type: 'Variable', name: varName },
					right: xExpr
				},
				title: 'Fórmula de Bhaskara — Una solución doble',
				explanation: `Para la ecuación cuadrática, identificamos:\na = ${a}, b = ${b}, c = ${c}\nAplicamos Bhaskara: ${varName} = ${xLatex}`,
				explanationBlocks: [
					{ type: 'text', content: 'Identificamos los coeficientes de la ecuación cuadrática:' },
					{ type: 'math', content: coefsStr },
					{ type: 'text', content: 'Fórmula general de Bhaskara:' },
					{ type: 'math', content: formulaStr },
					{ type: 'text', content: 'Sustituimos los coeficientes:' },
					{ type: 'math', content: subStr },
					{ type: 'text', content: 'Calculamos el discriminante Δ:' },
					{ type: 'math', content: discCalcStr },
					{ type: 'text', content: 'Con los valores evaluados:' },
					{ type: 'math', content: computedStr },
					{ type: 'text', content: 'Como Δ = 0, la raíz es exactamente 0. Obtenemos una única raíz doble:' },
					{ type: 'math', content: `${varName} = \\frac{${negBStr}}{${twoA}} = ${xLatex}` }
				],
				concept: 'Discriminante cero → Una raíz doble',
				difficulty: 9,
				solutions: [x],
				solutionsLatex: [xLatex],
				terminal: true
			};
		}

		// Δ > 0 → dos soluciones reales distintas
		const sqrtD = Math.sqrt(discriminant);
		const x1 = (-b + sqrtD) / (2 * a);
		const x2 = (-b - sqrtD) / (2 * a);

		let x1Expr: Expr;
		let x2Expr: Expr;
		let x1Latex: string;
		let x2Latex: string;

		// Bloques que van DESPUÉS de mostrar las fracciones sin simplificar
		const simplificationBlocks: Array<{ type: 'text' | 'math'; content: string }> = [];
		// Bloque con las soluciones finales simplificadas
		const finalResultBlocks: Array<{ type: 'text' | 'math'; content: string }> = [];

		if (Number.isInteger(sqrtD)) {
			const num1 = -b + sqrtD;
			const num2 = -b - sqrtD;
			const den = 2 * a;

			// Fracciones SIN simplificar (lo que sale directamente de la fórmula)
			const rawLatex1 = den === 1 ? `${num1}` : `\\frac{${num1}}{${den}}`;
			const rawLatex2 = den === 1 ? `${num2}` : `\\frac{${num2}}{${den}}`;

			x1Latex = formatFractionLatex(num1, den);
			x2Latex = formatFractionLatex(num2, den);
			x1Expr = createFractionExpr(num1, den);
			x2Expr = createFractionExpr(num2, den);

			const g1 = gcd(Math.abs(num1), Math.abs(den));
			const g2 = gcd(Math.abs(num2), Math.abs(den));
			const needsSimplification = (g1 > 1 && rawLatex1 !== x1Latex) || (g2 > 1 && rawLatex2 !== x2Latex);

			if (needsSimplification) {
				// Mostrar primero las fracciones en bruto
				simplificationBlocks.push({
					type: 'text',
					content: 'Como Δ > 0, obtenemos dos soluciones (sin simplificar):'
				});
				simplificationBlocks.push({
					type: 'math',
					content: `${varName}_1 = ${rawLatex1}, \\quad ${varName}_2 = ${rawLatex2}`
				});

				// Simplificación de x₁
				if (g1 > 1 && rawLatex1 !== x1Latex) {
					simplificationBlocks.push({
						type: 'text',
						content: `Simplificamos ${varName}\u2081 — MCD(${Math.abs(num1)}, ${Math.abs(den)}) = ${g1}:`
					});
					simplificationBlocks.push({
						type: 'math',
						content: `${varName}_1 = ${rawLatex1} = ${x1Latex}`
					});
				}

				// Simplificación de x₂
				if (g2 > 1 && rawLatex2 !== x2Latex) {
					simplificationBlocks.push({
						type: 'text',
						content: `Simplificamos ${varName}\u2082 — MCD(${Math.abs(num2)}, ${Math.abs(den)}) = ${g2}:`
					});
					simplificationBlocks.push({
						type: 'math',
						content: `${varName}_2 = ${rawLatex2} = ${x2Latex}`
					});
				}

				// Resultado final
				finalResultBlocks.push({ type: 'text', content: 'Soluciones definitivas:' });
				finalResultBlocks.push({
					type: 'math',
					content: `${varName}_1 = ${x1Latex}, \\quad ${varName}_2 = ${x2Latex}`
				});
			} else {
				// Sin simplificación: flujo directo
				simplificationBlocks.push({
					type: 'text',
					content: 'Como Δ > 0, obtenemos dos soluciones reales distintas:'
				});
				simplificationBlocks.push({
					type: 'math',
					content: `${varName}_1 = ${x1Latex}, \\quad ${varName}_2 = ${x2Latex}`
				});
			}
		} else {
			x1Latex = formatRadicalRoot(a, b, discriminant, true);
			x2Latex = formatRadicalRoot(a, b, discriminant, false);
			x1Expr = { type: 'Variable', name: x1Latex };
			x2Expr = { type: 'Variable', name: x2Latex };
			simplificationBlocks.push({
				type: 'text',
				content: 'Como Δ > 0, obtenemos dos soluciones reales distintas:'
			});
			simplificationBlocks.push({
				type: 'math',
				content: `${varName}_1 = ${x1Latex}, \\quad ${varName}_2 = ${x2Latex}`
			});
		}

		return {
			before: expr,
			after: {
				type: 'Equation',
				left: { type: 'Variable', name: `${varName}` },
				right: x1Expr
			},
			title: 'Fórmula de Bhaskara — Dos soluciones',
			explanation: `Para la ecuación cuadrática, identificamos los coeficientes:\na = ${a}, b = ${b}, c = ${c}\nCalculamos Δ = ${discriminant}.\nObtenemos dos soluciones reales: ${varName}_1 = ${x1Latex}, ${varName}_2 = ${x2Latex}`,
			explanationBlocks: [
				{ type: 'text', content: 'Identificamos los coeficientes de la ecuación cuadrática:' },
				{ type: 'math', content: coefsStr },
				{ type: 'text', content: 'Fórmula general de Bhaskara:' },
				{ type: 'math', content: formulaStr },
				{ type: 'text', content: 'Sustituimos los coeficientes en la fórmula:' },
				{ type: 'math', content: subStr },
				{ type: 'text', content: 'Calculamos el discriminante Δ:' },
				{ type: 'math', content: discCalcStr },
				{ type: 'text', content: 'Con los valores evaluados:' },
				{ type: 'math', content: computedStr },
				...simplificationBlocks,
				...finalResultBlocks
			],
			concept: 'Discriminante positivo → Dos raíces reales',
			difficulty: 9,
			solutions: [x1, x2],
			solutionsLatex: [x1Latex, x2Latex],
			terminal: true
		};
	}
}
