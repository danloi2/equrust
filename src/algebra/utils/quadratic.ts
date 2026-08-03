import type { Expr } from '../types/index';
import { gcd } from './fraction';

export interface QuadraticCoefs {
	a: number;
	b: number;
	c: number;
	varName: string;
}

/**
 * Extrae coeficientes a, b, c de una expresión ax² + bx + c.
 * Devuelve null si la expresión no es un polinomio cuadrático reconocible.
 */
export function extractQuadraticCoefs(left: Expr): QuadraticCoefs | null {
	function collectTerms(expr: Expr): Expr[] {
		if (expr.type === 'Add') {
			return [...collectTerms(expr.left), ...collectTerms(expr.right)];
		}
		return [expr];
	}

	const terms = collectTerms(left);
	let a = 0;
	let b = 0;
	let c = 0;
	let varName: string | null = null;

	for (const term of terms) {
		// c puro
		if (term.type === 'Number') {
			c += term.value;
			continue;
		}
		// x puro
		if (term.type === 'Variable') {
			varName = varName ?? term.name;
			b += 1;
			continue;
		}
		// x^2 puro
		if (
			term.type === 'Power' &&
			term.base.type === 'Variable' &&
			term.exponent.type === 'Number' &&
			term.exponent.value === 2
		) {
			varName = varName ?? term.base.name;
			a += 1;
			continue;
		}
		// bx
		if (term.type === 'Multiply' && term.left.type === 'Number' && term.right.type === 'Variable') {
			varName = varName ?? term.right.name;
			b += term.left.value;
			continue;
		}
		// -x → Multiply(-1, Variable)
		if (
			term.type === 'Multiply' &&
			term.left.type === 'Number' &&
			term.left.value === -1 &&
			term.right.type === 'Variable'
		) {
			varName = varName ?? term.right.name;
			b += -1;
			continue;
		}
		// ax^2
		if (
			term.type === 'Multiply' &&
			term.left.type === 'Number' &&
			term.right.type === 'Power' &&
			term.right.base.type === 'Variable' &&
			term.right.exponent.type === 'Number' &&
			term.right.exponent.value === 2
		) {
			varName = varName ?? term.right.base.name;
			a += term.left.value;
			continue;
		}
		// -ax^2 → Multiply(-1, Multiply(Number, Power(Var, 2)))
		if (
			term.type === 'Multiply' &&
			term.left.type === 'Number' &&
			term.left.value === -1 &&
			term.right.type === 'Multiply' &&
			term.right.left.type === 'Number' &&
			term.right.right.type === 'Power' &&
			term.right.right.base.type === 'Variable' &&
			term.right.right.exponent.type === 'Number' &&
			term.right.right.exponent.value === 2
		) {
			varName = varName ?? term.right.right.base.name;
			a += -term.right.left.value;
			continue;
		}
		// -x^2 → Multiply(-1, Power(Var, 2))
		if (
			term.type === 'Multiply' &&
			term.left.type === 'Number' &&
			term.left.value === -1 &&
			term.right.type === 'Power' &&
			term.right.base.type === 'Variable' &&
			term.right.exponent.type === 'Number' &&
			term.right.exponent.value === 2
		) {
			varName = varName ?? term.right.base.name;
			a += -1;
			continue;
		}
		// -c → Multiply(-1, Number)
		if (
			term.type === 'Multiply' &&
			term.left.type === 'Number' &&
			term.left.value === -1 &&
			term.right.type === 'Number'
		) {
			c += -term.right.value;
			continue;
		}
		return null;
	}

	if (varName === null || a === 0) return null;
	return { a, b, c, varName };
}
