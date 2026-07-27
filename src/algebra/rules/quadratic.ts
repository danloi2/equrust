import type { Expr, Rule, RuleResult } from '../types/index';

function collectTerms(expr: Expr): Expr[] {
	if (expr.type === 'Add') return [...collectTerms(expr.left), ...collectTerms(expr.right)];
	return [expr];
}

function extractQuadraticCoefs(
	expr: Expr
): { a: number; b: number; c: number; varName: string } | null {
	const terms = collectTerms(expr);
	let a = 0, b = 0, c = 0;
	let varName: string | null = null;

	for (const term of terms) {
		// ax^2 → Multiply(Number, Power(Var, 2))
		if (
			term.type === 'Multiply' &&
			term.left.type === 'Number' &&
			term.right.type === 'Power' &&
			term.right.base.type === 'Variable' &&
			term.right.exponent.type === 'Number' &&
			term.right.exponent.value === 2
		) {
			varName = varName ?? term.right.base.name;
			a += term.left.value;
			continue;
		}
		// x^2 → Power(Var, 2)
		if (
			term.type === 'Power' &&
			term.base.type === 'Variable' &&
			term.exponent.type === 'Number' &&
			term.exponent.value === 2
		) {
			varName = varName ?? term.base.name;
			a += 1;
			continue;
		}
		// bx → Multiply(Number, Var)
		if (
			term.type === 'Multiply' &&
			term.left.type === 'Number' &&
			term.right.type === 'Variable'
		) {
			varName = varName ?? term.right.name;
			b += term.left.value;
			continue;
		}
		// x → Var
		if (term.type === 'Variable') {
			varName = varName ?? term.name;
			b += 1;
			continue;
		}
		// c → Number (incluye negativos)
		if (term.type === 'Number') {
			c += term.value;
			continue;
		}
		return null;
	}

	if (varName === null || a === 0) return null;
	return { a, b, c, varName };
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
		const discriminantStr = `${b}² - 4·(${a})·(${c}) = ${b * b} - ${4 * a * c} = ${discriminant}`;

		if (discriminant < 0) {
			return {
				before: expr,
				after: {
					type: 'Equation',
					left: { type: 'Variable', name: varName },
					right: { type: 'Variable', name: '\\emptyset' }
				},
				title: 'Fórmula de Bhaskara — Sin solución real',
				explanation: `Calculamos el discriminante: Δ = ${discriminantStr}. Como Δ < 0, la parábola no corta el eje x. La ecuación no tiene soluciones reales.`,
				concept: 'Discriminante negativo → Sin raíces reales',
				difficulty: 9,
				solutions: []
			};
		}

		if (discriminant === 0) {
			const x = -b / (2 * a);
			const xFormatted = Number.isInteger(x) ? x.toString() : x.toFixed(4);
			return {
				before: expr,
				after: {
					type: 'Equation',
					left: { type: 'Variable', name: varName },
					right: { type: 'Number', value: x }
				},
				title: 'Fórmula de Bhaskara — Una solución doble',
				explanation: `Calculamos el discriminante: Δ = ${discriminantStr}. Como Δ = 0, la parábola es tangente al eje x. Hay una única solución (raíz doble):\n${varName} = −b / 2a = ${-b} / ${2 * a} = ${xFormatted}`,
				concept: 'Discriminante cero → Una raíz doble',
				difficulty: 9,
				solutions: [x]
			};
		}

		// Δ > 0 → dos soluciones reales distintas
		const sqrtD = Math.sqrt(discriminant);
		const x1 = (-b + sqrtD) / (2 * a);
		const x2 = (-b - sqrtD) / (2 * a);
		const fmt = (n: number) => Number.isInteger(n) ? n.toString() : n.toFixed(4);

		return {
			before: expr,
			after: {
				type: 'Equation',
				left: { type: 'Variable', name: `${varName}` },
				right: { type: 'Number', value: parseFloat(x1.toFixed(6)) }
			},
			title: 'Fórmula de Bhaskara — Dos soluciones',
			explanation: `Calculamos el discriminante: Δ = ${discriminantStr}. Como Δ > 0, la parábola corta el eje x en dos puntos. Aplicamos la fórmula:\n${varName} = (−b ± √Δ) / 2a = (${-b} ± √${discriminant}) / ${2 * a}`,
			concept: 'Discriminante positivo → Dos raíces reales',
			difficulty: 9,
			solutions: [x1, x2]
		};
	}
}
