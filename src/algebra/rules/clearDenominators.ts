import type { Expr, Rule, RuleResult } from '../types/index';
import { formatToLatex } from '../formatter/index';

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

function isASTEqual(a: Expr, b: Expr): boolean {
	if (a.type !== b.type) return false;
	switch (a.type) {
		case 'Number':
			return b.type === 'Number' && a.value === b.value;
		case 'Variable':
			return b.type === 'Variable' && a.name === b.name;
		case 'Sqrt':
			return b.type === 'Sqrt' && isASTEqual(a.inner, b.inner);
		case 'Add':
		case 'Multiply':
		case 'Divide':
			return b.type === a.type && isASTEqual(a.left, b.left) && isASTEqual(a.right, b.right);
		case 'Power':
			return b.type === 'Power' && isASTEqual(a.base, b.base) && isASTEqual(a.exponent, b.exponent);
		case 'Parenthesis':
			return b.type === 'Parenthesis' && isASTEqual(a.inner, b.inner);
		default:
			return false;
	}
}

function collectExprDenoms(expr: Expr, out: Expr[]) {
	if (expr.type === 'Divide' && expr.right.type !== 'Number') {
		if (!out.some((d) => isASTEqual(d, expr.right))) {
			out.push(expr.right);
		}
	}

	switch (expr.type) {
		case 'Add':
		case 'Multiply':
		case 'Divide':
			collectExprDenoms(expr.left, out);
			collectExprDenoms(expr.right, out);
			break;
		case 'Power':
			collectExprDenoms(expr.base, out);
			collectExprDenoms(expr.exponent, out);
			break;
		case 'Parenthesis':
		case 'Sqrt':
			collectExprDenoms(expr.inner, out);
			break;
	}
}

function multiplyByExpr(expr: Expr, factor: Expr): Expr {
	switch (expr.type) {
		case 'Add':
			return {
				type: 'Add',
				left: multiplyByExpr(expr.left, factor),
				right: multiplyByExpr(expr.right, factor)
			};
		case 'Divide':
			if (isASTEqual(expr.right, factor)) {
				return expr.left;
			}
			return { type: 'Multiply', left: expr, right: factor };
		case 'Parenthesis':
			return { type: 'Parenthesis', inner: multiplyByExpr(expr.inner, factor) };
		default:
			return { type: 'Multiply', left: expr, right: factor };
	}
}

export class ClearDenominatorsRule implements Rule {
	readonly name = 'clear_denominators';

	applies(expr: Expr): boolean {
		if (expr.type !== 'Equation') return false;
		if (expr.left.type === 'Variable') return false;

		const denoms = new Set<number>();
		collectDenomsInner(expr.left, denoms);
		collectDenomsInner(expr.right, denoms);

		if (denoms.size > 0) return true;

		const exprDenoms: Expr[] = [];
		collectExprDenoms(expr.left, exprDenoms);
		collectExprDenoms(expr.right, exprDenoms);

		return exprDenoms.length > 0;
	}

	apply(expr: Expr): RuleResult {
		if (expr.type !== 'Equation')
			return { before: expr, after: expr, title: '', explanation: '', concept: '', difficulty: 0 };

		const denoms = new Set<number>();
		collectDenomsInner(expr.left, denoms);
		collectDenomsInner(expr.right, denoms);

		if (denoms.size > 0) {
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

		const exprDenoms: Expr[] = [];
		collectExprDenoms(expr.left, exprDenoms);
		collectExprDenoms(expr.right, exprDenoms);

		if (exprDenoms.length > 0) {
			const factor = exprDenoms[0];
			const newLeft = multiplyByExpr(expr.left, factor);
			const newRight = multiplyByExpr(expr.right, factor);

			const factorLatex = formatToLatex(factor);

			return {
				before: expr,
				after: { type: 'Equation', left: newLeft, right: newRight },
				title: 'Eliminar denominadores',
				explanation: `Multiplicamos ambos miembros de la ecuación por ${factorLatex} para eliminar la fracción en el denominador.`,
				concept: 'Álgebra — Multiplicación por denominador para despejar fracciones',
				difficulty: 7
			};
		}

		return { before: expr, after: expr, title: '', explanation: '', concept: '', difficulty: 0 };
	}
}
