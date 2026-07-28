import type { Expr, Rule, RuleResult } from '../types/index';
import { mapAST } from '../utils/ast';

/**
 * Describe un término "semejante": tiene la misma clave (variable + exponente)
 * Ejemplos:
 *   x     → { coef: 1,  key: 'x^1', varName: 'x', exp: 1 }
 *   3x    → { coef: 3,  key: 'x^1', varName: 'x', exp: 1 }
 *   x²    → { coef: 1,  key: 'x^2', varName: 'x', exp: 2 }
 *   2x²   → { coef: 2,  key: 'x^2', varName: 'x', exp: 2 }
 *   -x²   → { coef: -1, key: 'x^2', varName: 'x', exp: 2 }
 */
interface LikeTerm {
	coef: number;
	key: string;
	varName: string;
	exp: number;
}

function extractLikeTerm(node: Expr): LikeTerm | null {
	// Variable: x → coef=1, exp=1
	if (node.type === 'Variable') {
		return { coef: 1, key: `${node.name}^1`, varName: node.name, exp: 1 };
	}

	// Power: x^n → coef=1, exp=n
	if (
		node.type === 'Power' &&
		node.base.type === 'Variable' &&
		node.exponent.type === 'Number'
	) {
		return {
			coef: 1,
			key: `${node.base.name}^${node.exponent.value}`,
			varName: node.base.name,
			exp: node.exponent.value
		};
	}

	// Multiply: c * x → coef=c, exp=1
	if (node.type === 'Multiply') {
		if (node.left.type === 'Number' && node.right.type === 'Variable') {
			return { coef: node.left.value, key: `${node.right.name}^1`, varName: node.right.name, exp: 1 };
		}
		if (node.right.type === 'Number' && node.left.type === 'Variable') {
			return { coef: node.right.value, key: `${node.left.name}^1`, varName: node.left.name, exp: 1 };
		}
		// c * x^n → coef=c, exp=n
		if (
			node.left.type === 'Number' &&
			node.right.type === 'Power' &&
			node.right.base.type === 'Variable' &&
			node.right.exponent.type === 'Number'
		) {
			return {
				coef: node.left.value,
				key: `${node.right.base.name}^${node.right.exponent.value}`,
				varName: node.right.base.name,
				exp: node.right.exponent.value
			};
		}
		// x^n * c
		if (
			node.right.type === 'Number' &&
			node.left.type === 'Power' &&
			node.left.base.type === 'Variable' &&
			node.left.exponent.type === 'Number'
		) {
			return {
				coef: node.right.value,
				key: `${node.left.base.name}^${node.left.exponent.value}`,
				varName: node.left.base.name,
				exp: node.left.exponent.value
			};
		}
	}

	return null;
}

function buildTerm(t: LikeTerm): Expr {
	const base: Expr = { type: 'Variable', name: t.varName };
	const power: Expr =
		t.exp === 1
			? base
			: { type: 'Power', base, exponent: { type: 'Number', value: t.exp } };

	if (t.coef === 1) return power;
	if (t.coef === -1) return { type: 'Multiply', left: { type: 'Number', value: -1 }, right: power };
	return { type: 'Multiply', left: { type: 'Number', value: t.coef }, right: power };
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

function combineAllLikeTermsInSide(expr: Expr): { newExpr: Expr; didCombine: boolean } {
	const terms = collectTerms(expr);
	if (terms.length <= 1) return { newExpr: expr, didCombine: false };

	const groups = new Map<string, LikeTerm[]>();

	for (const term of terms) {
		const like = extractLikeTerm(term);
		if (like) {
			const existing = groups.get(like.key) || [];
			existing.push(like);
			groups.set(like.key, existing);
		}
	}

	let didCombine = false;
	const resultTerms: Expr[] = [];

	for (const term of terms) {
		const like = extractLikeTerm(term);
		if (like) {
			const group = groups.get(like.key);
			if (group) {
				if (group.length > 1) {
					didCombine = true;
					const totalCoef = group.reduce((sum, t) => sum + t.coef, 0);
					if (totalCoef !== 0) {
						resultTerms.push(buildTerm({ ...group[0], coef: totalCoef }));
					}
				} else {
					resultTerms.push(buildTerm(group[0]));
				}
				groups.delete(like.key);
			}
		} else {
			resultTerms.push(term);
		}
	}

	if (!didCombine) {
		return { newExpr: expr, didCombine: false };
	}

	return {
		newExpr: buildAdd(resultTerms),
		didCombine: true
	};
}

/**
 * Agrupar términos semejantes en un único paso:
 * Combina todos los términos que comparten la misma variable y exponente
 * (ej: 2x² + x + x + x - 14x + 54 = x + 25 → 2x² - 11x + 54 = x + 25)
 */
export class CombineLikeTermsRule implements Rule {
	readonly name = 'combine_like_terms';

	applies(expr: Expr): boolean {
		if (expr.type === 'Equation') {
			return combineAllLikeTermsInSide(expr.left).didCombine || combineAllLikeTermsInSide(expr.right).didCombine;
		}
		return combineAllLikeTermsInSide(expr).didCombine;
	}

	apply(expr: Expr): RuleResult {
		if (expr.type === 'Equation') {
			const leftRes = combineAllLikeTermsInSide(expr.left);
			const rightRes = combineAllLikeTermsInSide(expr.right);

			return {
				before: expr,
				after: { type: 'Equation', left: leftRes.newExpr, right: rightRes.newExpr },
				title: 'Agrupar términos semejantes',
				explanation: 'Se suman los coeficientes de los términos semejantes (que comparten la misma variable y exponente) en un solo paso.',
				concept: 'Términos semejantes',
				difficulty: 3
			};
		}

		const res = combineAllLikeTermsInSide(expr);
		return {
			before: expr,
			after: res.newExpr,
			title: 'Agrupar términos semejantes',
			explanation: 'Se suman los coeficientes de todos los términos semejantes en un solo paso.',
			concept: 'Términos semejantes',
			difficulty: 3
		};
	}
}
