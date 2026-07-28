import type { Expr, Rule, RuleResult } from '../types/index';
import { createFractionExpr } from '../utils/fraction';

/**
 * Extrae el coeficiente de un término lineal en x: 3x → 3, x → 1, -x → -1
 */
function extractLinearCoef(expr: Expr): number | null {
	if (expr.type === 'Variable') return 1;
	if (expr.type === 'Multiply') {
		if (expr.left.type === 'Number' && expr.right.type === 'Variable') return expr.left.value;
		if (expr.right.type === 'Number' && expr.left.type === 'Variable') return expr.right.value;
	}
	return null;
}

/**
 * Regla: Dividir ambos lados por el coeficiente.
 * Aplica en ecuaciones de la forma: kx = C → x = C/k
 * 
 * Para aplicar, el lado izquierdo debe ser ÚNICAMENTE un término con variable (sin sumas).
 */
export class DivideBothSidesRule implements Rule {
	readonly name = 'divide_both_sides';

	applies(expr: Expr): boolean {
		if (expr.type !== 'Equation') return false;
		const coef = extractLinearCoef(expr.left);
		return coef !== null && coef !== 1 && coef !== 0;
	}

	apply(expr: Expr): RuleResult {
		if (expr.type !== 'Equation') return { before: expr, after: expr, title: '', explanation: '', concept: '', difficulty: 0 };

		const coef = extractLinearCoef(expr.left)!;

		// Izquierda: la variable sola
		const varNode: Expr =
			expr.left.type === 'Multiply' && expr.left.right.type === 'Variable'
				? expr.left.right
				: expr.left.type === 'Multiply' && expr.left.left.type === 'Variable'
					? expr.left.left
					: expr.left;

		// Derecha: C / coef — si son enteros, convertir a fracción simplificada
		let newRight: Expr;
		if (expr.right.type === 'Number' && Number.isInteger(expr.right.value) && Number.isInteger(coef)) {
			newRight = createFractionExpr(expr.right.value, coef);
		} else if (expr.right.type === 'Number') {
			const result = expr.right.value / coef;
			newRight = { type: 'Number', value: result };
		} else {
			newRight = { type: 'Divide', left: expr.right, right: { type: 'Number', value: coef } };
		}

		return {
			before: expr,
			after: { type: 'Equation', left: varNode, right: newRight },
			title: `Dividir ambos lados por ${coef}`,
			explanation: `Para aislar la variable, dividimos ambos lados de la ecuación por ${coef}, el coeficiente que acompaña a la incógnita.`,
			concept: 'Propiedad de igualdad de la división',
			difficulty: 5,
			terminal: true
		};
	}
}
