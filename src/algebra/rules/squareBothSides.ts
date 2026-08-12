import type { Expr, Rule, RuleResult } from '../types/index';
import { formatToLatex } from '../formatter/index';

/**
 * Regla: Elevar al cuadrado ambos lados.
 * Aplica en ecuaciones donde al menos uno de los lados es una raíz cuadrada sola (\sqrt{...}).
 */
function isSingleRadicalTerm(node: Expr): boolean {
	if (node.type === 'Sqrt') return true;
	if (
		node.type === 'Multiply' &&
		(node.left.type === 'Number' || node.right.type === 'Number') &&
		(node.left.type === 'Sqrt' || node.right.type === 'Sqrt')
	) {
		return true;
	}
	return false;
}

export class SquareBothSidesRule implements Rule {
	readonly name = 'square_both_sides';

	applies(expr: Expr): boolean {
		if (expr.type !== 'Equation') return false;
		return isSingleRadicalTerm(expr.left) || isSingleRadicalTerm(expr.right);
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
		} else {
			newLeft =
				expr.left.type === 'Sqrt'
					? expr.left.inner
					: { type: 'Power', base: expr.left, exponent: { type: 'Number', value: 2 } };
			newRight =
				expr.right.type === 'Sqrt'
					? expr.right.inner
					: { type: 'Power', base: expr.right, exponent: { type: 'Number', value: 2 } };
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
						'Como aparecen raíces cuadradas en la ecuación, el dominio exige que los radicandos sean no negativos (≥ 0). Elevamos al cuadrado ambos lados (las posibles soluciones se comprobarán al final en la ecuación original):'
				},
				{
					type: 'math',
					content: `${formatToLatex(expr)} \\implies ${formatToLatex(after)}`
				}
			],
			concept: 'Ecuaciones irracionales — dominio y elevación al cuadrado',
			difficulty: 5
		};
	}
}
