import type { Expr, Rule, RuleResult } from '../types/index';

/**
 * Determina el grado de un término individual:
 * - x^n o c*x^n → n
 * - x o c*x     → 1
 * - número/cte  → 0
 */
function getDegree(node: Expr): number {
	if (node.type === 'Power' && node.base.type === 'Variable' && node.exponent.type === 'Number') {
		return node.exponent.value;
	}
	if (
		node.type === 'Multiply' &&
		node.left.type === 'Number' &&
		node.right.type === 'Power' &&
		node.right.base.type === 'Variable' &&
		node.right.exponent.type === 'Number'
	) {
		return node.right.exponent.value;
	}
	if (
		node.type === 'Multiply' &&
		node.left.type === 'Number' &&
		node.left.value === -1 &&
		node.right.type === 'Power' &&
		node.right.base.type === 'Variable' &&
		node.right.exponent.type === 'Number'
	) {
		return node.right.exponent.value;
	}
	if (node.type === 'Variable') return 1;
	if (node.type === 'Multiply' && node.left.type === 'Number' && node.right.type === 'Variable')
		return 1;
	if (
		node.type === 'Multiply' &&
		node.left.type === 'Number' &&
		node.left.value === -1 &&
		node.right.type === 'Multiply' &&
		node.right.left.type === 'Number' &&
		node.right.right.type === 'Variable'
	)
		return 1;
	return 0;
}

function collectTerms(expr: Expr): Expr[] {
	if (expr.type === 'Add') {
		return [...collectTerms(expr.left), ...collectTerms(expr.right)];
	}
	return [expr];
}

function buildAdd(terms: Expr[]): Expr {
	if (terms.length === 0) return { type: 'Number', value: 0 };
	if (terms.length === 1) return terms[0];
	return terms.slice(1).reduce<Expr>((acc, t) => ({ type: 'Add', left: acc, right: t }), terms[0]);
}

function isSortedByDegree(terms: Expr[]): boolean {
	for (let i = 0; i < terms.length - 1; i++) {
		if (getDegree(terms[i]) < getDegree(terms[i + 1])) {
			return false;
		}
	}
	return true;
}

function sortByDegree(terms: Expr[]): Expr[] {
	return [...terms].sort((a, b) => getDegree(b) - getDegree(a));
}

/**
 * Regla: Ordenar términos por grado decreciente.
 *
 * Reordena los sumandos de una expresión o ecuación (ambos miembros simultáneamente)
 * en orden decreciente de exponente: Grado 2 (x²) -> Grado 1 (x) -> Grado 0 (constantes).
 *
 * Ejemplo: x² + 49 - 14x + x² = 25 + x → x² + x² - 14x + 49 = x + 25
 */
export class ReorderTermsRule implements Rule {
	readonly name = 'reorder_terms';

	applies(expr: Expr): boolean {
		if (expr.type === 'Equation') {
			const leftTerms = collectTerms(expr.left);
			const rightTerms = collectTerms(expr.right);
			const leftUnsorted = leftTerms.length > 1 && !isSortedByDegree(leftTerms);
			const rightUnsorted = rightTerms.length > 1 && !isSortedByDegree(rightTerms);
			return leftUnsorted || rightUnsorted;
		}

		const terms = collectTerms(expr);
		return terms.length > 1 && !isSortedByDegree(terms);
	}

	apply(expr: Expr): RuleResult {
		if (expr.type === 'Equation') {
			const leftTerms = collectTerms(expr.left);
			const rightTerms = collectTerms(expr.right);

			const newLeft =
				leftTerms.length > 1 && !isSortedByDegree(leftTerms)
					? buildAdd(sortByDegree(leftTerms))
					: expr.left;

			const newRight =
				rightTerms.length > 1 && !isSortedByDegree(rightTerms)
					? buildAdd(sortByDegree(rightTerms))
					: expr.right;

			return {
				before: expr,
				after: { type: 'Equation', left: newLeft, right: newRight },
				title: 'Ordenar términos por grado',
				explanation:
					'Se reordenan los términos en ambos miembros de la ecuación en orden decreciente de grado (de mayor a menor exponente).',
				concept: 'Ordenamiento de polinomios',
				difficulty: 2
			};
		}

		const terms = collectTerms(expr);
		const sorted = buildAdd(sortByDegree(terms));
		return {
			before: expr,
			after: sorted,
			title: 'Ordenar términos por grado',
			explanation: 'Se reordenan los términos en orden decreciente de grado.',
			concept: 'Ordenamiento de polinomios',
			difficulty: 2
		};
	}
}
