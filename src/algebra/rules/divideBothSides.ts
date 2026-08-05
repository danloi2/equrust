import type { Expr, Rule, RuleResult } from '../types/index';
import { formatToLatex } from '../formatter/index';

/**
 * Extrae el coeficiente de un término (variable o raíz): 3x → 3, 2\sqrt{x} → 2, x → 1, -x → -1
 */
function extractLinearCoef(expr: Expr): number | null {
	if (expr.type === 'Variable' || expr.type === 'Sqrt') return 1;
	if (expr.type === 'Multiply') {
		if (expr.left.type === 'Number') return expr.left.value;
		if (expr.right.type === 'Number') return expr.right.value;
	}
	return null;
}

/**
 * Regla: Dividir ambos lados por el coeficiente.
 * Aplica en ecuaciones de la forma: kx = C → x = C/k o k\sqrt{x} = kx → \sqrt{x} = x
 */
export class DivideBothSidesRule implements Rule {
	readonly name = 'divide_both_sides';

	applies(expr: Expr): boolean {
		if (expr.type !== 'Equation') return false;
		const coef = extractLinearCoef(expr.left);
		return coef !== null && coef !== 1 && coef !== 0;
	}

	apply(expr: Expr): RuleResult {
		if (expr.type !== 'Equation')
			return { before: expr, after: expr, title: '', explanation: '', concept: '', difficulty: 0 };

		const coef = extractLinearCoef(expr.left)!;

		// Izquierda: el término sin el coeficiente numérico
		const varNode: Expr =
			expr.left.type === 'Multiply' && expr.left.left.type === 'Number'
				? expr.left.right
				: expr.left.type === 'Multiply' && expr.left.right.type === 'Number'
					? expr.left.left
					: expr.left;

		// Derecha: simplificar si el lado derecho también es Multiply con el mismo coeficiente
		let newRight: Expr;
		if (
			expr.right.type === 'Multiply' &&
			expr.right.left.type === 'Number' &&
			expr.right.left.value === coef
		) {
			newRight = expr.right.right;
		} else if (
			expr.right.type === 'Multiply' &&
			expr.right.right.type === 'Number' &&
			expr.right.right.value === coef
		) {
			newRight = expr.right.left;
		} else if (
			expr.right.type === 'Number' &&
			Number.isInteger(expr.right.value) &&
			Number.isInteger(coef)
		) {
			const num = expr.right.value;
			const den = coef;
			if (num % den === 0) {
				newRight = { type: 'Number', value: num / den };
			} else {
				newRight = {
					type: 'Divide',
					left: { type: 'Number', value: num },
					right: { type: 'Number', value: den }
				};
			}
		} else if (expr.right.type === 'Number') {
			const result = expr.right.value / coef;
			newRight = { type: 'Number', value: result };
		} else {
			newRight = { type: 'Divide', left: expr.right, right: { type: 'Number', value: coef } };
		}

		const leftLatex = formatToLatex(expr.left);
		const rightLatex = formatToLatex(expr.right);

		return {
			before: expr,
			after: { type: 'Equation', left: varNode, right: newRight },
			title: `Dividir ambos lados por ${coef}`,
			explanation: `Para aislar la variable, dividimos ambos lados de la ecuación por ${coef}, el coeficiente que acompaña a la incógnita.`,
			explanationBlocks: [
				{ type: 'text', content: 'Aplicamos la misma operación a ambos lados:' },
				{ type: 'math', content: `\\frac{${leftLatex}}{${coef}} = \\frac{${rightLatex}}{${coef}}` }
			],
			concept: 'Propiedad uniforme de la división',
			difficulty: 5
		};
	}
}
