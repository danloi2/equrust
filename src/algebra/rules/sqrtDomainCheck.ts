import type { Expr, Rule, RuleResult } from '../types/index';

/**
 * Regla: Verificar el dominio de la raíz cuadrada.
 *
 * La raíz cuadrada principal SIEMPRE produce un resultado ≥ 0.
 * Si la ecuación tiene la forma √f(x) = c con c < 0, no existe
 * ningún valor real de x que satisfaga la ecuación.
 *
 * Esta regla debe aplicarse ANTES de elevar al cuadrado ambos lados,
 * ya que elevar al cuadrado eliminaría el signo negativo y conduciría
 * a una solución falsa (solución espuria).
 */
export class SqrtDomainCheckRule implements Rule {
	readonly name = 'sqrt_domain_check';

	/**
	 * Aplica si el lado izquierdo es una raíz cuadrada y el lado derecho
	 * es un número negativo.
	 */
	applies(expr: Expr): boolean {
		if (expr.type !== 'Equation') return false;
		if (expr.left.type !== 'Sqrt') return false;
		// El lado derecho debe ser un número estrictamente negativo
		return expr.right.type === 'Number' && expr.right.value < 0;
	}

	apply(expr: Expr): RuleResult {
		if (expr.type !== 'Equation' || expr.left.type !== 'Sqrt') {
			return { before: expr, after: expr, title: '', explanation: '', concept: '', difficulty: 0 };
		}

		const rhs = expr.right.type === 'Number' ? expr.right.value : '?';

		return {
			before: expr,
			// El "después" representa la conclusión lógica: S = ∅
			after: {
				type: 'Equation',
				left: { type: 'Variable', name: 'S' },
				right: { type: 'Variable', name: '\\emptyset' }
			},
			title: 'Sin solución — dominio de la raíz cuadrada',
			explanation:
				`La raíz cuadrada principal siempre es mayor o igual que 0 (√f(x) ≥ 0). ` +
				`Sin embargo, el lado derecho de la ecuación es ${rhs}, que es negativo. ` +
				`Un número no negativo nunca puede ser igual a un número negativo, ` +
				`por lo que la ecuación no tiene solución real.`,
			concept: 'Dominio de la raíz cuadrada — radicando y resultado ≥ 0',
			difficulty: 4,
			solutions: [],
			terminal: true
		};
	}
}
