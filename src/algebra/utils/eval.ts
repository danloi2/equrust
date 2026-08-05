import type { Expr } from '../types/index';

/**
 * Evalúa un nodo AST para un valor dado de la incógnita x.
 * Si el nodo es una Equation(left, right), devuelve left(x) - right(x),
 * de modo que f(x) = 0 corresponde a las soluciones de la ecuación.
 */
export function evalAST(expr: Expr, xVal: number): number {
	switch (expr.type) {
		case 'Number':
			return expr.value;

		case 'Variable':
			return xVal;

		case 'Add':
			return evalAST(expr.left, xVal) + evalAST(expr.right, xVal);

		case 'Multiply':
			return evalAST(expr.left, xVal) * evalAST(expr.right, xVal);

		case 'Divide': {
			const den = evalAST(expr.right, xVal);
			if (den === 0) return NaN;
			return evalAST(expr.left, xVal) / den;
		}

		case 'Power': {
			const base = evalAST(expr.base, xVal);
			const exp = evalAST(expr.exponent, xVal);
			return Math.pow(base, exp);
		}

		case 'Equation':
			return evalAST(expr.left, xVal) - evalAST(expr.right, xVal);

		case 'Parenthesis':
			return evalAST(expr.inner, xVal);

		case 'Sqrt': {
			const inner = evalAST(expr.inner, xVal);
			if (inner < 0) return NaN;
			return Math.sqrt(inner);
		}

		default:
			return NaN;
	}
}

export interface VerificationDetail {
	val: number;
	isValid: boolean;
	leftVal: number;
	rightVal: number;
	latexText: string;
}

export function containsSqrt(expr: Expr): boolean {
	switch (expr.type) {
		case 'Sqrt':
			return true;
		case 'Add':
		case 'Multiply':
		case 'Divide':
		case 'Equation':
			return containsSqrt(expr.left) || containsSqrt(expr.right);
		case 'Power':
			return containsSqrt(expr.base) || containsSqrt(expr.exponent);
		case 'Parenthesis':
			return containsSqrt(expr.inner);
		default:
			return false;
	}
}

export function verifyRadicalSolutions(
	initialExpr: Expr,
	solutions: readonly number[]
): { validSolutions: number[]; details: VerificationDetail[] } {
	if (initialExpr.type !== 'Equation') {
		return { validSolutions: [...solutions], details: [] };
	}

	const validSolutions: number[] = [];
	const details: VerificationDetail[] = [];

	for (const sol of solutions) {
		const leftVal = evalAST(initialExpr.left, sol);
		const rightVal = evalAST(initialExpr.right, sol);

		const isValid =
			!isNaN(leftVal) &&
			!isNaN(rightVal) &&
			Math.abs(leftVal - rightVal) < 1e-5;

		if (isValid) {
			validSolutions.push(sol);
		}

		const formatVal = (v: number) =>
			Number.isInteger(v) ? `${v}` : v.toFixed(2);

		const leftStr = isNaN(leftVal) ? '\\text{indefinido}' : formatVal(leftVal);
		const rightStr = isNaN(rightVal) ? '\\text{indefinido}' : formatVal(rightVal);

		const symbol = isValid
			? '\\checkmark \\text{ (Es solución)}'
			: '\\boldsymbol{\\times} \\text{ (Solución espuria, se descarta)}';
		const latexText = `\\text{Para } x = ${sol}: \\quad \\text{MIEMBRO IZQ} = ${leftStr}, \\quad \\text{MIEMBRO DER} = ${rightStr} \\quad ${symbol}`;

		details.push({ val: sol, isValid, leftVal, rightVal, latexText });
	}

	return { validSolutions, details };
}
