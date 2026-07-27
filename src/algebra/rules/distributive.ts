import type { Expr, Rule, RuleResult } from '../types/index';
import { mapAST } from '../utils/ast';

/**
 * Propiedad distributiva:
 * - a * (b + c) → a*b + a*c   (incluyendo cuando el Add está envuelto en Parenthesis)
 * - (b + c) * a → b*a + c*a
 */
function unwrap(expr: Expr): Expr {
	return expr.type === 'Parenthesis' ? expr.inner : expr;
}

export class DistributiveRule implements Rule {
	readonly name = 'distributive';

	applies(expr: Expr): boolean {
		let can = false;
		mapAST(expr, (node) => {
			if (this._findDistributable(node)) can = true;
			return null;
		});
		return can;
	}

	private _findDistributable(node: Expr): boolean {
		if (node.type !== 'Multiply') return false;
		const left = unwrap(node.left);
		const right = unwrap(node.right);
		return right.type === 'Add' || left.type === 'Add';
	}

	apply(expr: Expr): RuleResult {
		let applied = false;
		const after = mapAST(expr, (node) => {
			if (applied) return null;
			if (node.type !== 'Multiply') return null;

			const rawLeft = node.left;
			const rawRight = node.right;
			const left = unwrap(rawLeft);
			const right = unwrap(rawRight);

			// factor * (b + c) → factor*b + factor*c
			if (right.type === 'Add') {
				applied = true;
				return {
					type: 'Add',
					left: { type: 'Multiply', left: rawLeft, right: right.left },
					right: { type: 'Multiply', left: rawLeft, right: right.right }
				};
			}
			// (a + b) * factor → a*factor + b*factor
			if (left.type === 'Add') {
				applied = true;
				return {
					type: 'Add',
					left: { type: 'Multiply', left: left.left, right: rawRight },
					right: { type: 'Multiply', left: left.right, right: rawRight }
				};
			}
			return null;
		});

		return {
			before: expr,
			after,
			title: 'Propiedad distributiva',
			explanation: 'Se multiplica el factor externo por cada término dentro del paréntesis.',
			concept: 'Propiedad distributiva de la multiplicación',
			difficulty: 3
		};
	}
}
