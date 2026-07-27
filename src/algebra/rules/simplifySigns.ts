import type { Expr, Rule, RuleResult } from '../types/index';
import { mapAST } from '../utils/ast';

/**
 * Simplifica signos negativos redundantes:
 * - (-1) * (-1) → 1
 * - (-1) * N  → (-N)  cuando N es número
 * - N * (-1)  → (-N)
 * - Multiply(-1, Multiply(-1, x)) → x
 */
export class SimplifySignsRule implements Rule {
	readonly name = 'simplify_signs';

	applies(expr: Expr): boolean {
		let can = false;
		mapAST(expr, (node) => {
			if (this._match(node)) can = true;
			return null;
		});
		return can;
	}

	private _match(node: Expr): boolean {
		if (node.type !== 'Multiply') return false;
		const { left, right } = node;
		// (-1) * (-1) → 1
		if (left.type === 'Number' && left.value === -1 && right.type === 'Number' && right.value === -1) return true;
		// (-1) * número → número negativo
		if (left.type === 'Number' && left.value === -1 && right.type === 'Number') return true;
		// número * (-1) → número negativo
		if (right.type === 'Number' && right.value === -1 && left.type === 'Number') return true;
		// (-1) * (-1 * expr) → expr (doble negativo)
		if (
			left.type === 'Number' && left.value === -1 &&
			right.type === 'Multiply' && right.left.type === 'Number' && right.left.value === -1
		) return true;
		return false;
	}

	apply(expr: Expr): RuleResult {
		let applied = false;
		const after = mapAST(expr, (node) => {
			if (applied) return null;
			if (!this._match(node)) return null;
			if (node.type !== 'Multiply') return null;

			const { left, right } = node;
			applied = true;

			// (-1) * (-1) → 1
			if (left.type === 'Number' && left.value === -1 && right.type === 'Number' && right.value === -1) {
				return { type: 'Number', value: 1 };
			}
			// (-1) * N → número negativo directo
			if (left.type === 'Number' && left.value === -1 && right.type === 'Number') {
				return { type: 'Number', value: -right.value };
			}
			// N * (-1) → número negativo
			if (right.type === 'Number' && right.value === -1 && left.type === 'Number') {
				return { type: 'Number', value: -left.value };
			}
			// (-1) * (-1 * expr) → expr
			if (
				left.type === 'Number' && left.value === -1 &&
				right.type === 'Multiply' && right.left.type === 'Number' && right.left.value === -1
			) {
				return right.right;
			}
			return null;
		});
		return {
			before: expr,
			after,
			title: 'Simplificar signos',
			explanation: 'Un negativo multiplicado por otro negativo resulta en positivo, o se simplifica el signo.',
			concept: 'Regla de los signos',
			difficulty: 1
		};
	}
}
