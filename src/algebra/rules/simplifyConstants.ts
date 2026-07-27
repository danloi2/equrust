import type { Expr, Rule, RuleResult } from '../types/index';
import { mapAST } from '../utils/ast';

export class SimplifyConstantsRule implements Rule {
	readonly name = 'simplify_constants';

	applies(expr: Expr): boolean {
		let canApply = false;
		mapAST(expr, (node) => {
			if (node.type === 'Add') {
				if (node.left.type === 'Number' && node.right.type === 'Number') canApply = true;
				if (node.left.type === 'Add' && node.right.type === 'Number') {
					if (node.left.left.type === 'Number' || node.left.right.type === 'Number') canApply = true;
				}
				if (node.right.type === 'Add' && node.left.type === 'Number') {
					if (node.right.left.type === 'Number' || node.right.right.type === 'Number') canApply = true;
				}
			}
			if (node.type === 'Multiply') {
				if (node.left.type === 'Number' && node.right.type === 'Number') canApply = true;
				if (node.left.type === 'Number' && node.right.type === 'Multiply' && node.right.left.type === 'Number') canApply = true;
			}
			if (node.type === 'Divide' && node.left.type === 'Number' && node.right.type === 'Number') {
				if (node.left.value % node.right.value === 0) canApply = true;
			}
			if (node.type === 'Power' && node.base.type === 'Number' && node.exponent.type === 'Number') canApply = true;
			// (n * x)^k → n^k * x^k cuando la base es un producto de número y variable
			if (
				node.type === 'Power' &&
				node.base.type === 'Multiply' &&
				node.base.left.type === 'Number' &&
				node.base.right.type === 'Variable' &&
				node.exponent.type === 'Number'
			) canApply = true;
			return null;
		});
		return canApply;
	}

	apply(expr: Expr): RuleResult {
		let applied = false;
		
		const after = mapAST(expr, (node) => {
			if (applied) return null; // Solo aplicamos un paso a la vez

			if (node.type === 'Add') {
				if (node.left.type === 'Number' && node.right.type === 'Number') {
					applied = true;
					return { type: 'Number', value: node.left.value + node.right.value };
				}
				if (node.left.type === 'Add' && node.right.type === 'Number') {
					const l = node.left.left;
					const r = node.left.right;
					if (r.type === 'Number') {
						applied = true;
						const sum = r.value + node.right.value;
						return sum === 0 ? l : { type: 'Add', left: l, right: { type: 'Number', value: sum } };
					} else if (l.type === 'Number') {
						applied = true;
						const sum = l.value + node.right.value;
						return sum === 0 ? r : { type: 'Add', left: r, right: { type: 'Number', value: sum } };
					}
				}
				if (node.right.type === 'Add' && node.left.type === 'Number') {
					const l = node.right.left;
					const r = node.right.right;
					if (r.type === 'Number') {
						applied = true;
						const sum = node.left.value + r.value;
						return sum === 0 ? l : { type: 'Add', left: { type: 'Number', value: sum }, right: l };
					} else if (l.type === 'Number') {
						applied = true;
						const sum = node.left.value + l.value;
						return sum === 0 ? r : { type: 'Add', left: { type: 'Number', value: sum }, right: r };
					}
				}
			}
			if (node.type === 'Multiply') {
				if (node.left.type === 'Number' && node.right.type === 'Number') {
					applied = true;
					return { type: 'Number', value: node.left.value * node.right.value };
				}
				if (node.left.type === 'Number' && node.right.type === 'Multiply' && node.right.left.type === 'Number') {
					applied = true;
					return {
						type: 'Multiply',
						left: { type: 'Number', value: node.left.value * node.right.left.value },
						right: node.right.right
					};
				}
			}
			if (node.type === 'Divide' && node.left.type === 'Number' && node.right.type === 'Number') {
				// Cuidado con dividir por cero o dejar fracciones exactas. Por ahora resolvemos todo a flotante.
				if (node.left.value % node.right.value === 0) {
					applied = true;
					return { type: 'Number', value: node.left.value / node.right.value };
				}
				// Si no es entero, tal vez deberíamos dejarlo como fracción (Simplificar fracciones es otra regla).
			}
			if (node.type === 'Power' && node.base.type === 'Number' && node.exponent.type === 'Number') {
				applied = true;
				return { type: 'Number', value: Math.pow(node.base.value, node.exponent.value) };
			}
			// (n * x)^k → n^k * x^k — propiedad de la potencia de un producto
			if (
				node.type === 'Power' &&
				node.base.type === 'Multiply' &&
				node.base.left.type === 'Number' &&
				node.base.right.type === 'Variable' &&
				node.exponent.type === 'Number'
			) {
				applied = true;
				const coef = Math.pow(node.base.left.value, node.exponent.value);
				const varPow: Expr = { type: 'Power', base: node.base.right, exponent: node.exponent };
				// Si el coeficiente es 1, eliminar el factor numérico
				if (coef === 1) return varPow;
				return { type: 'Multiply', left: { type: 'Number', value: coef }, right: varPow };
			}
			return null;
		});

		return {
			before: expr,
			after,
			title: 'Simplificar constantes',
			explanation: 'Se ha realizado la operación aritmética entre las dos constantes.',
			concept: 'Aritmética básica',
			difficulty: 1
		};
	}
}
