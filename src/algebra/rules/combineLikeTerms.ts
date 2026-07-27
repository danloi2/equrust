import type { Expr, Rule, RuleResult } from '../types/index';
import { mapAST } from '../utils/ast';

/**
 * Extrae el coeficiente de un término de variable:
 * - 3x → {coef: 3, varName: 'x'}
 * - x  → {coef: 1, varName: 'x'}
 * - (-1)*x → {coef: -1, varName: 'x'}
 * - -x → (Multiply(-1, x)) → {coef: -1, varName: 'x'}
 */
function extractVarTerm(node: Expr): { coef: number; varName: string } | null {
	if (node.type === 'Variable') return { coef: 1, varName: node.name };
	if (node.type === 'Multiply') {
		if (node.left.type === 'Number' && node.right.type === 'Variable') {
			return { coef: node.left.value, varName: node.right.name };
		}
		if (node.right.type === 'Number' && node.left.type === 'Variable') {
			return { coef: node.right.value, varName: node.left.name };
		}
	}
	return null;
}

/**
 * Combinar términos semejantes: 2x + 3x → 5x, x - x → 0
 * Solo opera en nodos Add de primer nivel (no anidados) para respetar la pedagogía de un paso a la vez.
 */
export class CombineLikeTermsRule implements Rule {
	readonly name = 'combine_like_terms';

	applies(expr: Expr): boolean {
		let can = false;
		mapAST(expr, (node) => {
			if (this._findCombineable(node)) can = true;
			return null;
		});
		return can;
	}

	private _findCombineable(node: Expr): 'simple' | 'left_nested_1' | 'left_nested_2' | 'right_nested_1' | 'right_nested_2' | null {
		if (node.type !== 'Add') return null;
		
		const leftTerm = extractVarTerm(node.left);
		const rightTerm = extractVarTerm(node.right);
		
		// Caso simple: ax + bx
		if (leftTerm && rightTerm && leftTerm.varName === rightTerm.varName) return 'simple';

		// Casos anidados: Add(Add(L1, L2), R)
		if (node.left.type === 'Add' && rightTerm) {
			const l1Term = extractVarTerm(node.left.left);
			if (l1Term && l1Term.varName === rightTerm.varName) return 'left_nested_1';
			
			const l2Term = extractVarTerm(node.left.right);
			if (l2Term && l2Term.varName === rightTerm.varName) return 'left_nested_2';
		}

		// Casos anidados: Add(L, Add(R1, R2))
		if (node.right.type === 'Add' && leftTerm) {
			const r1Term = extractVarTerm(node.right.left);
			if (r1Term && r1Term.varName === leftTerm.varName) return 'right_nested_1';
			
			const r2Term = extractVarTerm(node.right.right);
			if (r2Term && r2Term.varName === leftTerm.varName) return 'right_nested_2';
		}

		return null;
	}

	private _combine(t1: ReturnType<typeof extractVarTerm>, t2: ReturnType<typeof extractVarTerm>): Expr {
		const newCoef = t1!.coef + t2!.coef;
		if (newCoef === 0) return { type: 'Number', value: 0 };
		if (newCoef === 1) return { type: 'Variable', name: t1!.varName };
		return { type: 'Multiply', left: { type: 'Number', value: newCoef }, right: { type: 'Variable', name: t1!.varName } };
	}

	apply(expr: Expr): RuleResult {
		let applied = false;
		const after = mapAST(expr, (node) => {
			if (applied) return null;
			const matchType = this._findCombineable(node);
			if (!matchType) return null;
			if (node.type !== 'Add') return null;

			applied = true;

			if (matchType === 'simple') {
				return this._combine(extractVarTerm(node.left), extractVarTerm(node.right));
			}

			if (matchType === 'left_nested_1') {
				const innerAdd = node.left as Extract<Expr, { type: 'Add' }>;
				return { type: 'Add', left: this._combine(extractVarTerm(innerAdd.left), extractVarTerm(node.right)), right: innerAdd.right };
			}
			if (matchType === 'left_nested_2') {
				const innerAdd = node.left as Extract<Expr, { type: 'Add' }>;
				return { type: 'Add', left: innerAdd.left, right: this._combine(extractVarTerm(innerAdd.right), extractVarTerm(node.right)) };
			}
			if (matchType === 'right_nested_1') {
				const innerAdd = node.right as Extract<Expr, { type: 'Add' }>;
				return { type: 'Add', left: this._combine(extractVarTerm(node.left), extractVarTerm(innerAdd.left)), right: innerAdd.right };
			}
			if (matchType === 'right_nested_2') {
				const innerAdd = node.right as Extract<Expr, { type: 'Add' }>;
				return { type: 'Add', left: innerAdd.left, right: this._combine(extractVarTerm(node.left), extractVarTerm(innerAdd.right)) };
			}

			return null;
		});

		return {
			before: expr,
			after,
			title: 'Agrupar términos semejantes',
			explanation: `Se suman los coeficientes de los términos que contienen la misma variable.`,
			concept: 'Términos semejantes',
			difficulty: 3
		};
	}
}
