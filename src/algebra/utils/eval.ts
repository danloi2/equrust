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
