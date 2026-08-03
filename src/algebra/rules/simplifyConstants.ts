import type { Expr, Rule, RuleResult } from '../types/index';
import { mapAST } from '../utils/ast';
import { gcd } from '../utils/fraction';

function getConstantValue(node: Expr): number | null {
	if (node.type === 'Number') return node.value;
	if (
		node.type === 'Multiply' &&
		node.left.type === 'Number' &&
		node.left.value === -1 &&
		node.right.type === 'Number'
	) {
		return -node.right.value;
	}
	if (node.type === 'Multiply' && node.left.type === 'Number' && node.right.type === 'Number') {
		return node.left.value * node.right.value;
	}
	return null;
}

function makeConstantNode(val: number): Expr {
	if (val < 0) {
		return {
			type: 'Multiply',
			left: { type: 'Number', value: -1 },
			right: { type: 'Number', value: Math.abs(val) }
		};
	}
	return { type: 'Number', value: val };
}

export class SimplifyConstantsRule implements Rule {
	readonly name = 'simplify_constants';

	applies(expr: Expr): boolean {
		let canApply = false;
		mapAST(expr, (node) => {
			if (node.type === 'Add') {
				const cL = getConstantValue(node.left);
				const cR = getConstantValue(node.right);
				if (cL !== null && cR !== null) canApply = true;
				if (node.left.type === 'Add' && cR !== null) {
					if (
						getConstantValue(node.left.left) !== null ||
						getConstantValue(node.left.right) !== null
					)
						canApply = true;
				}
				if (node.right.type === 'Add' && cL !== null) {
					if (
						getConstantValue(node.right.left) !== null ||
						getConstantValue(node.right.right) !== null
					)
						canApply = true;
				}
			}
			if (node.type === 'Multiply') {
				if (node.left.type === 'Number' && node.right.type === 'Number') canApply = true;
				if (
					node.left.type === 'Number' &&
					node.right.type === 'Multiply' &&
					node.right.left.type === 'Number'
				)
					canApply = true;
				// x * x → x²
				if (
					node.left.type === 'Variable' &&
					node.right.type === 'Variable' &&
					node.left.name === node.right.name
				)
					canApply = true;
				// n * x * x → n * x²  (Multiply(n, Multiply(x, x)))
				if (
					node.left.type === 'Number' &&
					node.right.type === 'Multiply' &&
					node.right.left.type === 'Variable' &&
					node.right.right.type === 'Variable' &&
					node.right.left.name === node.right.right.name
				)
					canApply = true;
			}
			if (node.type === 'Divide' && node.left.type === 'Number' && node.right.type === 'Number') {
				if (node.left.value % node.right.value === 0) canApply = true;
				else if (gcd(Math.abs(node.left.value), Math.abs(node.right.value)) > 1) canApply = true;
			}
			if (node.type === 'Power' && node.base.type === 'Number' && node.exponent.type === 'Number')
				canApply = true;
			if (
				node.type === 'Power' &&
				node.base.type === 'Multiply' &&
				node.base.left.type === 'Number' &&
				node.base.right.type === 'Variable' &&
				node.exponent.type === 'Number'
			)
				canApply = true;
			return null;
		});
		return canApply;
	}

	apply(expr: Expr): RuleResult {
		let applied = false;
		let isFractionReduction = false;
		let fractionGcd = 0;
		let fractionNum = 0;
		let fractionDen = 0;

		const after = mapAST(expr, (node) => {
			if (applied) return null;

			if (node.type === 'Add') {
				const cL = getConstantValue(node.left);
				const cR = getConstantValue(node.right);
				if (cL !== null && cR !== null) {
					applied = true;
					return makeConstantNode(cL + cR);
				}
				if (node.left.type === 'Add' && cR !== null) {
					const l = node.left.left;
					const r = node.left.right;
					const valR = getConstantValue(r);
					const valL = getConstantValue(l);
					if (valR !== null) {
						applied = true;
						const sum = valR + cR;
						return sum === 0 ? l : { type: 'Add', left: l, right: makeConstantNode(sum) };
					} else if (valL !== null) {
						applied = true;
						const sum = valL + cR;
						return sum === 0 ? r : { type: 'Add', left: r, right: makeConstantNode(sum) };
					}
				}
				if (node.right.type === 'Add' && cL !== null) {
					const l = node.right.left;
					const r = node.right.right;
					const valR = getConstantValue(r);
					const valL = getConstantValue(l);
					if (valR !== null) {
						applied = true;
						const sum = cL + valR;
						return sum === 0 ? l : { type: 'Add', left: makeConstantNode(sum), right: l };
					} else if (valL !== null) {
						applied = true;
						const sum = cL + valL;
						return sum === 0 ? r : { type: 'Add', left: makeConstantNode(sum), right: r };
					}
				}
			}
			if (node.type === 'Multiply') {
				if (node.left.type === 'Number' && node.right.type === 'Number') {
					applied = true;
					return { type: 'Number', value: node.left.value * node.right.value };
				}
				if (
					node.left.type === 'Number' &&
					node.right.type === 'Multiply' &&
					node.right.left.type === 'Number'
				) {
					applied = true;
					return {
						type: 'Multiply',
						left: { type: 'Number', value: node.left.value * node.right.left.value },
						right: node.right.right
					};
				}
				// x * x → x²
				if (
					node.left.type === 'Variable' &&
					node.right.type === 'Variable' &&
					node.left.name === node.right.name
				) {
					applied = true;
					return { type: 'Power', base: node.left, exponent: { type: 'Number', value: 2 } };
				}
				// n * (x * x) → n * x²
				if (
					node.left.type === 'Number' &&
					node.right.type === 'Multiply' &&
					node.right.left.type === 'Variable' &&
					node.right.right.type === 'Variable' &&
					node.right.left.name === node.right.right.name
				) {
					applied = true;
					return {
						type: 'Multiply',
						left: node.left,
						right: { type: 'Power', base: node.right.left, exponent: { type: 'Number', value: 2 } }
					};
				}
			}
			if (node.type === 'Divide' && node.left.type === 'Number' && node.right.type === 'Number') {
				const num = node.left.value;
				const den = node.right.value;
				if (num % den === 0) {
					applied = true;
					return { type: 'Number', value: num / den };
				}
				const g = gcd(Math.abs(num), Math.abs(den));
				if (g > 1) {
					applied = true;
					isFractionReduction = true;
					fractionGcd = g;
					fractionNum = num;
					fractionDen = den;
					const newNum = num / g;
					const newDen = den / g;
					if (newDen === 1) return { type: 'Number', value: newNum };
					return {
						type: 'Divide',
						left: { type: 'Number', value: newNum },
						right: { type: 'Number', value: newDen }
					};
				}
			}
			if (node.type === 'Power' && node.base.type === 'Number' && node.exponent.type === 'Number') {
				applied = true;
				return { type: 'Number', value: Math.pow(node.base.value, node.exponent.value) };
			}
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
				if (coef === 1) return varPow;
				return { type: 'Multiply', left: { type: 'Number', value: coef }, right: varPow };
			}
			return null;
		});

		return {
			before: expr,
			after,
			title: isFractionReduction ? 'Simplificar fracción' : 'Simplificar constantes',
			explanation: isFractionReduction
				? `El MCD de ${Math.abs(fractionNum)} y ${Math.abs(fractionDen)} es ${fractionGcd}. Dividimos numerador y denominador por ${fractionGcd} para obtener la fracción en su mínima expresión.`
				: 'Se ha realizado la operación aritmética entre las dos constantes.',
			concept: isFractionReduction ? 'Simplificación de fracciones' : 'Aritmética básica',
			difficulty: isFractionReduction ? 2 : 1
		};
	}
}
