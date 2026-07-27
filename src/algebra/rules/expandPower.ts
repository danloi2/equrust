import type { Expr, Rule, RuleResult } from '../types/index';
import { mapAST } from '../utils/ast';

/**
 * Regla: Expandir una potencia de una expresión.
 *
 * Para exponente 2 con una suma (binomio):
 *   (a + b)^2  →  a² + 2·a·b + b²  (fórmula del cuadrado del binomio)
 *
 * Para otros casos (exponente entero > 1, base NO atómica):
 *   (expr)^n  →  (expr) * (expr) * ...  (repetición)
 *
 * Esta regla NO aplica cuando la base es un átomo (Number, Variable),
 * ya que esos casos los maneja SimplifyConstantsRule.
 *
 * Tras esta regla, DistributiveRule / SimplifyConstants / CombineLikeTerms
 * reducen la expresión a la forma cuadrática estándar.
 */
export class ExpandPowerRule implements Rule {
	readonly name = 'expand_power';

	applies(expr: Expr): boolean {
		let can = false;
		mapAST(expr, (node) => {
			if (this._isExpandable(node)) can = true;
			return null;
		});
		return can;
	}

	private _isExpandable(node: Expr): boolean {
		if (node.type !== 'Power') return false;
		const { base, exponent } = node;
		if (exponent.type !== 'Number' || !Number.isInteger(exponent.value) || exponent.value < 2) return false;
		// La base no debe ser un átomo puro (esos los simplifica SimplifyConstants)
		if (base.type === 'Number') return false;
		if (base.type === 'Variable') return false;
		return true;
	}

	/** Desenvuelve un nodo Parenthesis. */
	private _unwrap(expr: Expr): Expr {
		return expr.type === 'Parenthesis' ? expr.inner : expr;
	}

	private _extractCoef(node: Expr): { coef: number; term: Expr } {
		if (node.type === 'Number') return { coef: node.value, term: { type: 'Number', value: 1 } };
		if (node.type === 'Multiply' && node.left.type === 'Number') {
			return { coef: node.left.value, term: node.right };
		}
		return { coef: 1, term: node };
	}

	apply(expr: Expr): RuleResult {
		let applied = false;
		const after = mapAST(expr, (node) => {
			if (applied) return null;
			if (!this._isExpandable(node) || node.type !== 'Power') return null;

			const { base, exponent } = node;
			if (exponent.type !== 'Number') return null;

			const n = exponent.value;
			const inner = this._unwrap(base);

			// Caso especial: cuadrado de un binomio (a+b)^2 → a² + 2ab + b²
			if (n === 2 && inner.type === 'Add') {
				applied = true;
				const a = inner.left;
				const b = inner.right;

				const extA = this._extractCoef(a);
				const extB = this._extractCoef(b);

				// a² = (coefA)² · (termA)²
				const aCoefSq = extA.coef * extA.coef;
				let aSq: Expr;
				if (extA.term.type === 'Number') {
					aSq = { type: 'Number', value: aCoefSq * extA.term.value * extA.term.value };
				} else if (aCoefSq === 1) {
					aSq = { type: 'Power', base: extA.term, exponent: { type: 'Number', value: 2 } };
				} else {
					aSq = {
						type: 'Multiply',
						left: { type: 'Number', value: aCoefSq },
						right: { type: 'Power', base: extA.term, exponent: { type: 'Number', value: 2 } }
					};
				}

				// b² = (coefB)² · (termB)²
				const bCoefSq = extB.coef * extB.coef;
				let bSq: Expr;
				if (extB.term.type === 'Number') {
					bSq = { type: 'Number', value: bCoefSq * extB.term.value * extB.term.value };
				} else if (bCoefSq === 1) {
					bSq = { type: 'Power', base: extB.term, exponent: { type: 'Number', value: 2 } };
				} else {
					bSq = {
						type: 'Multiply',
						left: { type: 'Number', value: bCoefSq },
						right: { type: 'Power', base: extB.term, exponent: { type: 'Number', value: 2 } }
					};
				}

				// 2ab = (2 · coefA · coefB) · termA · termB
				const total2abCoef = 2 * extA.coef * extB.coef;
				let twoAB: Expr;
				if (extA.term.type === 'Number' && extB.term.type === 'Number') {
					twoAB = { type: 'Number', value: total2abCoef * extA.term.value * extB.term.value };
				} else if (extB.term.type === 'Number') {
					twoAB = { type: 'Multiply', left: { type: 'Number', value: total2abCoef * extB.term.value }, right: extA.term };
				} else if (extA.term.type === 'Number') {
					twoAB = { type: 'Multiply', left: { type: 'Number', value: total2abCoef * extA.term.value }, right: extB.term };
				} else {
					twoAB = {
						type: 'Multiply',
						left: { type: 'Multiply', left: { type: 'Number', value: total2abCoef }, right: extA.term },
						right: extB.term
					};
				}

				return {
					type: 'Add',
					left: { type: 'Add', left: aSq, right: twoAB },
					right: bSq
				};
			}

			// Caso general: (expr)^n → (expr) * (expr) * ... n veces
			applied = true;
			const wrapped: Expr =
				base.type === 'Parenthesis'
					? base
					: { type: 'Parenthesis', inner: base };

			let result: Expr = wrapped;
			for (let i = 1; i < n; i++) {
				result = { type: 'Multiply', left: result, right: wrapped };
			}
			return result;
		});

		const inner = after !== expr ? this._describeBase(expr) : '';
		return {
			before: expr,
			after,
			title: 'Expandir potencia como producto',
			explanation:
				inner
					? `Aplicamos la identidad notable: (a + b)² = a² + 2ab + b². ` +
					  `Expandimos la expresión al cuadrado sin necesidad de multiplicar manualmente.`
					: `Una potencia es la multiplicación de la base por sí misma tantas veces como indica el exponente. ` +
					  `Reescribimos la potencia como un producto para poder aplicar la propiedad distributiva.`,
			concept: 'Identidad notable — cuadrado del binomio',
			difficulty: 3
		};
	}

	private _describeBase(expr: Expr): string {
		// Detecta si el nodo original era un cuadrado de binomio para el mensaje
		return mapAST(expr, (node) => {
			if (
				node.type === 'Power' &&
				node.exponent.type === 'Number' &&
				node.exponent.value === 2 &&
				this._unwrap(node.base).type === 'Add'
			) return { type: 'Number', value: 1 } as Expr;
			return null;
		}) !== expr ? 'binomial' : '';
	}
}
