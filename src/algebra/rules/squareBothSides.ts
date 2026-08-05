import type { Expr, Rule, RuleResult } from '../types/index';
import { formatToLatex } from '../formatter/index';

/**
 * Regla: Elevar al cuadrado ambos lados.
 * Aplica en ecuaciones donde al menos uno de los lados es una raíz cuadrada sola (\sqrt{...}).
 */
export class SquareBothSidesRule implements Rule {
	readonly name = 'square_both_sides';

	applies(expr: Expr): boolean {
		if (expr.type !== 'Equation') return false;
		return expr.left.type === 'Sqrt' || expr.right.type === 'Sqrt';
	}

	apply(expr: Expr): RuleResult {
		if (expr.type !== 'Equation') {
			return { before: expr, after: expr, title: '', explanation: '', concept: '', difficulty: 0 };
		}

		let newLeft: Expr;
		let newRight: Expr;

		if (expr.left.type === 'Sqrt' && expr.right.type === 'Sqrt') {
			newLeft = expr.left.inner;
			newRight = expr.right.inner;
		} else if (expr.left.type === 'Sqrt') {
			newLeft = expr.left.inner;
			newRight = {
				type: 'Power',
				base: expr.right,
				exponent: { type: 'Number', value: 2 }
			};
		} else if (expr.right.type === 'Sqrt') {
			newLeft = {
				type: 'Power',
				base: expr.left,
				exponent: { type: 'Number', value: 2 }
			};
			newRight = expr.right.inner;
		} else {
			return { before: expr, after: expr, title: '', explanation: '', concept: '', difficulty: 0 };
		}

		const after: Expr = { type: 'Equation', left: newLeft, right: newRight };

		return {
			before: expr,
			after,
			title: 'Elevar al cuadrado ambos lados',
			explanation:
				'Elevamos al cuadrado ambos miembros de la ecuación para eliminar la raíz cuadrada.',
			explanationBlocks: [
				{
					type: 'text',
					content:
						'Elevamos al cuadrado ambos lados de la ecuación (al hacerlo, verificaremos las posibles soluciones en la ecuación original al final):'
				},
				{
					type: 'math',
					content: `${formatToLatex(expr)} \\implies ${formatToLatex(after)}`
				}
			],
			concept: 'Ecuaciones irracionales — elevación al cuadrado',
			difficulty: 5
		};
	}
}
