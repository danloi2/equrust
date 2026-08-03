import type { Expr, Rule, RuleResult } from '../types/index';
import { formatToLatex } from '../formatter/index';

/**
 * Regla: Detectar contradicción — ecuación sin solución.
 *
 * Cuando ambos lados de la ecuación son constantes numéricas distintas,
 * la ecuación es una contradicción: ningún valor de x puede satisfacerla.
 *
 * Ejemplo: 2(x-3) = 2x+1
 *   tras distributiva y combinar: 2x - 6 = 2x + 1
 *   tras mover 2x: -6 = 1  →  CONTRADICCIÓN
 *
 * También detecta el caso inmediato sin variables: 0 = 1, -6 = 1, etc.
 *
 * Esta regla tiene prioridad entre CombineLikeTerms y MoveTerms
 * para capturar el momento exacto en que la contradicción es visible.
 */
export class NoSolutionRule implements Rule {
	readonly name = 'no_solution';

	applies(expr: Expr): boolean {
		if (expr.type !== 'Equation') return false;
		const { left, right } = expr;
		// Ambos lados deben ser constantes numéricas con valores distintos
		return left.type === 'Number' && right.type === 'Number' && left.value !== right.value;
	}

	apply(expr: Expr): RuleResult {
		if (expr.type !== 'Equation' || expr.left.type !== 'Number' || expr.right.type !== 'Number') {
			return { before: expr, after: expr, title: '', explanation: '', concept: '', difficulty: 0 };
		}

		const lhs = expr.left.value;
		const rhs = expr.right.value;
		const lhsLatex = formatToLatex(expr.left);
		const rhsLatex = formatToLatex(expr.right);

		return {
			before: expr,
			after: {
				type: 'Equation',
				left: { type: 'Variable', name: 'S' },
				right: { type: 'Variable', name: '\\emptyset' }
			},
			title: 'Contradicción — Sin solución',
			explanation:
				`Al simplificar la ecuación hemos llegado a ${lhs} = ${rhs}, ` +
				`que es una afirmación falsa: ${lhs} nunca puede ser igual a ${rhs}. ` +
				`Esto significa que no existe ningún valor de la variable que satisfaga la ecuación original. ` +
				`El conjunto solución es vacío.`,
			explanationBlocks: [
				{
					type: 'text',
					content: 'La ecuación se ha reducido a una igualdad entre dos constantes distintas:'
				},
				{ type: 'math', content: `${lhsLatex} = ${rhsLatex}` },
				{
					type: 'text',
					content: 'Esta afirmación es siempre falsa, independientemente del valor de x.'
				},
				{
					type: 'text',
					content:
						'Conclusión: la ecuación no tiene solución. El conjunto solución es el conjunto vacío.'
				},
				{ type: 'math', content: 'S = \\emptyset' }
			],
			concept: 'Ecuación inconsistente — conjunto solución vacío',
			difficulty: 3,
			solutions: [],
			solutionsLatex: [],
			terminal: true
		};
	}
}
