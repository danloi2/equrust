import type { Expr } from '../types/index';

/**
 * Determina si una expresión necesita paréntesis al estar dentro de una multiplicación.
 */
function needsParens(expr: Expr): boolean {
	return expr.type === 'Add';
}

export function formatToLatex(expr: Expr): string {
	switch (expr.type) {
		case 'Number': {
			// Los números negativos se muestran con paréntesis si son standalone (el contexto Add los trata)
			return expr.value.toString();
		}

		case 'Variable':
			return expr.name;

		case 'Add': {
			const { left, right } = expr;

			// Add(a, Multiply(neg, b))  →  a - |neg| * b
			if (right.type === 'Multiply' && right.left.type === 'Number' && right.left.value < 0) {
				const inner = right.right;
				const innerStr = needsParens(inner) ? `\\left(${formatToLatex(inner)}\\right)` : formatToLatex(inner);
				
				if (right.left.value === -1) {
					return `${formatToLatex(left)} - ${innerStr}`;
				} else {
					// número * variable/potencia → sin punto (2x, 3x²)
					const needsDot = inner.type !== 'Variable' && inner.type !== 'Power';
					return `${formatToLatex(left)} - ${Math.abs(right.left.value)}${needsDot ? ' \\cdot ' : ''}${innerStr}`;
				}
			}
			// Add(a, Number(neg))  →  a - |neg|  (signo ya absorbido en el número)
			if (right.type === 'Number' && right.value < 0) {
				return `${formatToLatex(left)} - ${Math.abs(right.value)}`;
			}
			return `${formatToLatex(left)} + ${formatToLatex(right)}`;
		}

		case 'Multiply': {
			const { left, right } = expr;

			// -1 * expr  →  -expr
			if (left.type === 'Number' && left.value === -1) {
				const rightStr = needsParens(right) ? `\\left(${formatToLatex(right)}\\right)` : formatToLatex(right);
				return `-${rightStr}`;
			}
			// número * variable  →  2x  (sin operador)
			if (left.type === 'Number' && right.type === 'Variable') {
				return `${formatToLatex(left)}${formatToLatex(right)}`;
			}
			// número * (expr con suma)  →  4\left(x - 2\right)  (paréntesis implicitos)
			if (left.type === 'Number' && needsParens(right)) {
				return `${formatToLatex(left)}\\left(${formatToLatex(right)}\\right)`;
			}
			// número * potencia de variable  →  2x²  (sin operador)
			if (
				left.type === 'Number' &&
				right.type === 'Power' &&
				right.base.type === 'Variable'
			) {
				return `${formatToLatex(left)}${formatToLatex(right)}`;
			}
			// General con paréntesis si es necesario
			const leftStr = needsParens(left) ? `\\left(${formatToLatex(left)}\\right)` : formatToLatex(left);
			const rightStr = needsParens(right) ? `\\left(${formatToLatex(right)}\\right)` : formatToLatex(right);
			return `${leftStr} \\cdot ${rightStr}`;
		}

		case 'Divide': {
			if (expr.left.type === 'Number' && expr.left.value < 0) {
				return `-\\frac{${Math.abs(expr.left.value)}}{${formatToLatex(expr.right)}}`;
			}
			return `\\frac{${formatToLatex(expr.left)}}{${formatToLatex(expr.right)}}`;
		}

		case 'Power': {
			if (
				expr.exponent.type === 'Divide' &&
				expr.exponent.left.type === 'Number' &&
				expr.exponent.left.value === 1
			) {
				const rootDegree = expr.exponent.right;
				if (rootDegree.type === 'Number' && rootDegree.value === 2) {
					return `\\sqrt{${formatToLatex(expr.base)}}`;
				}
				return `\\sqrt[${formatToLatex(rootDegree)}]{${formatToLatex(expr.base)}}`;
			}
			return `${formatToLatex(expr.base)}^{${formatToLatex(expr.exponent)}}`;
		}


		case 'Equation':
			return `${formatToLatex(expr.left)} = ${formatToLatex(expr.right)}`;

		case 'Parenthesis':
			return `\\left(${formatToLatex(expr.inner)}\\right)`;

		case 'Sqrt':
			return `\\sqrt{${formatToLatex(expr.inner)}}`;

		default:
			throw new Error(`Tipo de nodo no soportado: ${(expr as any).type}`);
	}
}
