import type { Expr, Rule, RuleResult } from '../types/index';
import { mapAST } from '../utils/ast';

/**
 * Simplifica paréntesis redundantes: (x) → x, (5) → 5, etc.
 * NO elimina paréntesis que están dentro de una multiplicación con suma adentro,
 * porque esos los gestiona la regla distributiva directamente.
 * Solo elimina paréntesis de nodos atómicos (Number, Variable) o de nodos
 * que NO son Add (ya que esos son los que necesitan paréntesis en la distributiva).
 */
export class SimplifyParenthesisRule implements Rule {
	readonly name = 'simplify_parenthesis';

	applies(expr: Expr): boolean {
		let can = false;
		mapAST(expr, (node) => {
			if (this._isRedundant(node)) can = true;
			return null;
		});
		return can;
	}

	private _isRedundant(node: Expr): boolean {
		if (node.type !== 'Parenthesis') return false;
		const inner = node.inner;
		// Paréntesis alrededor de un átomo → siempre redundante
		if (inner.type === 'Number' || inner.type === 'Variable') return true;
		// Paréntesis alrededor de algo que NO es suma: (x^2) → x^2, (2x) → 2x
		if (inner.type !== 'Add') return true;
		return false;
	}

	apply(expr: Expr): RuleResult {
		let applied = false;
		const after = mapAST(expr, (node) => {
			if (applied) return null;
			if (this._isRedundant(node) && node.type === 'Parenthesis') {
				applied = true;
				return node.inner;
			}
			return null;
		});
		return {
			before: expr,
			after,
			title: 'Eliminar paréntesis redundantes',
			explanation: 'Los paréntesis no cambian el valor de la expresión en este contexto y se eliminan.',
			concept: 'Simplificación',
			difficulty: 1
		};
	}
}
