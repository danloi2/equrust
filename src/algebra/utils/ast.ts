import type { Expr } from '../types/index';

/**
 * Recorre el árbol y permite reemplazar nodos de forma inmutable.
 * La función transformadora `fn` se ejecuta de forma POST-ORDEN (primero los hijos, luego los padres).
 * Si `fn` devuelve un nuevo nodo, se reconstruye esa rama.
 */
export function mapAST(expr: Expr, fn: (node: Expr) => Expr | null): Expr {
	let mappedNode = expr;

	switch (expr.type) {
		case 'Add':
		case 'Multiply':
		case 'Divide':
		case 'Equation': {
			const left = mapAST(expr.left, fn);
			const right = mapAST(expr.right, fn);
			if (left !== expr.left || right !== expr.right) {
				mappedNode = { ...expr, left, right } as Expr;
			}
			break;
		}
		case 'Power': {
			const base = mapAST(expr.base, fn);
			const exponent = mapAST(expr.exponent, fn);
			if (base !== expr.base || exponent !== expr.exponent) {
				mappedNode = { ...expr, base, exponent };
			}
			break;
		}
		case 'Parenthesis':
		case 'Sqrt': {
			const inner = mapAST(expr.inner, fn);
			if (inner !== expr.inner) {
				mappedNode = { ...expr, inner };
			}
			break;
		}
		case 'Number':
		case 'Variable':
			break;
	}

	const result = fn(mappedNode);
	return result ? result : mappedNode;
}

/**
 * Busca un nodo en el árbol según un predicado.
 */
export function findNode(expr: Expr, predicate: (node: Expr) => boolean): Expr | null {
	if (predicate(expr)) return expr;

	switch (expr.type) {
		case 'Add':
		case 'Multiply':
		case 'Divide':
		case 'Equation':
			return findNode(expr.left, predicate) || findNode(expr.right, predicate);
		case 'Power':
			return findNode(expr.base, predicate) || findNode(expr.exponent, predicate);
		case 'Parenthesis':
		case 'Sqrt':
			return findNode(expr.inner, predicate);
	}
	return null;
}
