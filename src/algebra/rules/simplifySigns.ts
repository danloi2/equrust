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
		// Variable * (-Number) → -n * Variable
		if (left.type === 'Variable' && right.type === 'Number' && right.value < 0) return true;
		// Number * (-Number) → -(n*m)
		if (left.type === 'Number' && left.value > 0 && right.type === 'Number' && right.value < 0) return true;
		// Variable * ((-1) * Number) → -n * Variable  (patrón de ExpandPowerRule)
		if (left.type === 'Variable' && right.type === 'Multiply' &&
			right.left.type === 'Number' && right.left.value === -1 && right.right.type === 'Number') return true;
		// Number * ((-1) * Number) → -(n*m)  (patrón de ExpandPowerRule: 5*(-1*5))
		if (left.type === 'Number' && left.value > 0 && right.type === 'Multiply' &&
			right.left.type === 'Number' && right.left.value === -1 && right.right.type === 'Number') return true;
		// 1 * expr → expr
		if (left.type === 'Number' && left.value === 1) return true;
		// expr * 1 → expr
		if (right.type === 'Number' && right.value === 1) return true;
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

			// 1 * expr → expr
			if (left.type === 'Number' && left.value === 1) {
				return right;
			}
			// expr * 1 → expr
			if (right.type === 'Number' && right.value === 1) {
				return left;
			}
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
			// Variable * (-Number) → Multiply(-n, Variable)  ej: x * (-5) → -5x
			if (left.type === 'Variable' && right.type === 'Number' && right.value < 0) {
				return { type: 'Multiply', left: { type: 'Number', value: right.value }, right: left };
			}
			// Number * (-Number) → Number  ej: 5 * (-5) → -25
			if (left.type === 'Number' && left.value > 0 && right.type === 'Number' && right.value < 0) {
				return { type: 'Number', value: left.value * right.value };
			}
			// Variable * ((-1) * Number) → (-n) * Variable  ej: x * (-1*5) → -5x
			if (left.type === 'Variable' && right.type === 'Multiply' &&
				right.left.type === 'Number' && right.left.value === -1 && right.right.type === 'Number') {
				return { type: 'Multiply', left: { type: 'Number', value: -right.right.value }, right: left };
			}
			// Number * ((-1) * Number) → Number  ej: 5 * (-1*5) → -25
			if (left.type === 'Number' && left.value > 0 && right.type === 'Multiply' &&
				right.left.type === 'Number' && right.left.value === -1 && right.right.type === 'Number') {
				return { type: 'Number', value: -(left.value * right.right.value) };
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
