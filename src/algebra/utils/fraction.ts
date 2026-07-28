import type { Expr } from '../types/index';

export function gcd(a: number, b: number): number {
	a = Math.abs(a);
	b = Math.abs(b);
	while (b) {
		const t = b;
		b = a % b;
		a = t;
	}
	return a;
}

/**
 * Crea una expresión AST inmutable (Number o Divide) a partir de un numerador y denominador.
 * Simplifica automáticamente la fracción por su MCD.
 */
export function createFractionExpr(num: number, den: number): Expr {
	if (den === 0) throw new Error('División por cero');
	if (den < 0) {
		num = -num;
		den = -den;
	}
	const g = gcd(num, den);
	const n = num / g;
	const d = den / g;

	if (d === 1) {
		return { type: 'Number', value: n };
	}
	return {
		type: 'Divide',
		left: { type: 'Number', value: n },
		right: { type: 'Number', value: d }
	};
}

/**
 * Retorna la representación en cadena LaTeX de una fracción simplificada (ej. \frac{2}{3} o 5).
 */
export function formatFractionLatex(num: number, den: number): string {
	if (den === 0) return '\\text{indefinido}';
	if (den < 0) {
		num = -num;
		den = -den;
	}
	const g = gcd(num, den);
	const n = num / g;
	const d = den / g;

	if (d === 1) return `${n}`;
	if (n < 0) {
		return `-\\frac{${Math.abs(n)}}{${d}}`;
	}
	return `\\frac{${n}}{${d}}`;
}
