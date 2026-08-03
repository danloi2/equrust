import type { Expr, Rule, RuleResult } from '../types/index';

function collectDenomsInner(expr: Expr, out: Set<number>) {
	if (expr.type === 'Divide' && expr.right.type === 'Number') {
		const absDenom = Math.abs(expr.right.value);
		if (absDenom > 0 && Number.isInteger(absDenom)) {
			out.add(absDenom);
		}
	}

	switch (expr.type) {
		case 'Add':
		case 'Multiply':
		case 'Divide':
			collectDenomsInner(expr.left, out);
			collectDenomsInner(expr.right, out);
			break;
		case 'Power':
			collectDenomsInner(expr.base, out);
			collectDenomsInner(expr.exponent, out);
			break;
		case 'Parenthesis':
		case 'Sqrt':
			collectDenomsInner(expr.inner, out);
			break;
	}
}

function gcd(a: number, b: number): number {
	return b === 0 ? a : gcd(b, a % b);
}

function lcm(a: number, b: number): number {
	if (a === 0 || b === 0) return 0;
	return (a / gcd(a, b)) * b;
}

function hasDenom(expr: Expr): boolean {
	const denoms = new Set<number>();
	collectDenomsInner(expr, denoms);
	return denoms.size > 0;
}

function multiplyBy(expr: Expr, factor: number): Expr {
	if (factor === 1) return expr;

	switch (expr.type) {
		case 'Add':
			return {
				type: 'Add',
				left: multiplyBy(expr.left, factor),
				right: multiplyBy(expr.right, factor)
			};
		case 'Divide':
			if (expr.right.type === 'Number') {
				const newFactor = factor / expr.right.value;
				return multiplyBy(expr.left, newFactor);
			}
			return { type: 'Multiply', left: expr, right: { type: 'Number', value: factor } };
		case 'Multiply':
			if (hasDenom(expr.left)) {
				return { type: 'Multiply', left: multiplyBy(expr.left, factor), right: expr.right };
			}
			if (hasDenom(expr.right)) {
				return { type: 'Multiply', left: expr.left, right: multiplyBy(expr.right, factor) };
			}
			if (expr.left.type === 'Number') {
				return {
					type: 'Multiply',
					left: { type: 'Number', value: expr.left.value * factor },
					right: expr.right
				};
			} else if (expr.right.type === 'Number') {
				return {
					type: 'Multiply',
					left: expr.left,
					right: { type: 'Number', value: expr.right.value * factor }
				};
			} else {
				return { type: 'Multiply', left: { type: 'Number', value: factor }, right: expr };
			}
		case 'Number':
			return { type: 'Number', value: expr.value * factor };
		case 'Parenthesis':
			if (hasDenom(expr.inner)) {
				return { type: 'Parenthesis', inner: multiplyBy(expr.inner, factor) };
			}
			return { type: 'Multiply', left: { type: 'Number', value: factor }, right: expr };
		default:
			return { type: 'Multiply', left: { type: 'Number', value: factor }, right: expr };
	}
}

export class ClearDenominatorsRule implements Rule {
	readonly name = 'clear_denominators';

	applies(expr: Expr): boolean {
		if (expr.type !== 'Equation') return false;
		// Si la variable ya está aislada (ej. x = 2/3), no se deben eliminar denominadores
		if (expr.left.type === 'Variable') return false;

		const denoms = new Set<number>();
		collectDenomsInner(expr.left, denoms);
		collectDenomsInner(expr.right, denoms);

		return denoms.size > 0;
	}

	apply(expr: Expr): RuleResult {
		if (expr.type !== 'Equation')
			return { before: expr, after: expr, title: '', explanation: '', concept: '', difficulty: 0 };

		const denoms = new Set<number>();
		collectDenomsInner(expr.left, denoms);
		collectDenomsInner(expr.right, denoms);

		let mcm = 1;
		for (const d of denoms) {
			mcm = lcm(mcm, d);
		}

		const newLeft = multiplyBy(expr.left, mcm);
		const newRight = multiplyBy(expr.right, mcm);

		return {
			before: expr,
			after: { type: 'Equation', left: newLeft, right: newRight },
			title: 'Eliminar denominadores',
			explanation: `Se multiplica cada término de ambos miembros por ${mcm} (MCM de los denominadores) para eliminar las fracciones.`,
			concept: 'Álgebra — MCM: multiplicar para eliminar denominadores',
			difficulty: 7
		};
	}
}
