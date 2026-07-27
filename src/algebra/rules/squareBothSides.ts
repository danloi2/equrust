import type { Expr, Rule, RuleResult } from '../types/index';

/**
 * Regla: Elevar al cuadrado ambos lados.
 * Aplica en ecuaciones donde el lado izquierdo es ÚNICAMENTE una raíz cuadrada: \sqrt{...} = C
 */
export class SquareBothSidesRule implements Rule {
	readonly name = 'square_both_sides';

	applies(expr: Expr): boolean {
		if (expr.type !== 'Equation') return false;
		return expr.left.type === 'Sqrt';
	}

	apply(expr: Expr): RuleResult {
		if (expr.type !== 'Equation' || expr.left.type !== 'Sqrt') {
			return { before: expr, after: expr, title: '', explanation: '', concept: '', difficulty: 0 };
		}

		const inner = expr.left.inner;
		
		// El lado derecho se eleva al cuadrado
		const newRight: Expr = {
			type: 'Power',
			base: expr.right,
			exponent: { type: 'Number', value: 2 }
		};

		return {
			before: expr,
			after: { type: 'Equation', left: inner, right: newRight },
			title: 'Elevar al cuadrado',
			explanation: 'Elevamos al cuadrado ambos miembros de la ecuación para eliminar la raíz cuadrada.',
			concept: 'Álgebra — despeje: potenciar ambos lados',
			difficulty: 5
		};
	}
}
