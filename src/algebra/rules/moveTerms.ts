import type { Expr, Rule, RuleResult } from '../types/index';

/**
 * Determina si una expresión contiene una variable.
 */
function containsVariable(expr: Expr): boolean {
	switch (expr.type) {
		case 'Variable': return true;
		case 'Number': return false;
		case 'Add':
		case 'Multiply':
		case 'Divide':
		case 'Equation':
			return containsVariable(expr.left) || containsVariable(expr.right);
		case 'Power':
			return containsVariable(expr.base) || containsVariable(expr.exponent);
		case 'Parenthesis':
		case 'Sqrt':
			return containsVariable(expr.inner);
	}
}

/**
 * Determina si una expresión es puramente constante (sin variables).
 */
function isConstant(expr: Expr): boolean {
	return !containsVariable(expr);
}

/**
 * Recoge los sumandos de una expresión Add en un array plano.
 * Add(Add(a, b), c) → [a, b, c]
 */
function collectTerms(expr: Expr): Expr[] {
	if (expr.type === 'Add') {
		return [...collectTerms(expr.left), ...collectTerms(expr.right)];
	}
	return [expr];
}

/**
 * Construye un Add encadenado a partir de un array de términos.
 * [a, b, c] → Add(Add(a, b), c)
 */
function buildAdd(terms: Expr[]): Expr {
	if (terms.length === 0) return { type: 'Number', value: 0 };
	if (terms.length === 1) return terms[0];
	return terms.slice(1).reduce<Expr>((acc, t) => ({ type: 'Add', left: acc, right: t }), terms[0]);
}

function hasQuadraticTerm(expr: Expr): boolean {
	const terms = collectTerms(expr);
	return terms.some((term) => {
		if (term.type === 'Power' && term.base.type === 'Variable' && term.exponent.type === 'Number' && term.exponent.value === 2) return true;
		if (term.type === 'Multiply' && term.left.type === 'Number' && term.right.type === 'Power' && term.right.base.type === 'Variable' && term.right.exponent.type === 'Number' && term.right.exponent.value === 2) return true;
		return false;
	});
}

/**
 * Regla: Mover términos en ecuaciones.
 * 
 * En una ecuación A = B:
 * - Los términos constantes del lado izquierdo se pasan al derecho (cambiando signo).
 * - Los términos con variable del lado derecho se pasan al izquierdo (cambiando signo).
 * - Si hay término cuadrático (x^2) en la izquierda, las constantes de la derecha se pasan a la izquierda para igualar a 0.
 * 
 * Esto se hace UN ÚNICO TÉRMINO a la vez para respetar la filosofía pedagógica.
 */
export class MoveTermsRule implements Rule {
	readonly name = 'move_terms';

	applies(expr: Expr): boolean {
		if (expr.type !== 'Equation') return false;
		const leftTerms = collectTerms(expr.left);
		const rightTerms = collectTerms(expr.right);
		// ¿Hay constante en la izquierda que no sea el único término?
		const hasConstantLeft = leftTerms.length > 1 && leftTerms.some(isConstant);
		// ¿Hay variable en la derecha?
		const hasVarRight = rightTerms.some(containsVariable);
		// ¿Hay constante en la derecha cuando la izquierda es cuadrática (x^2)?
		const hasConstRightForQuad = hasQuadraticTerm(expr.left) && rightTerms.some(isConstant) && !(rightTerms.length === 1 && rightTerms[0].type === 'Number' && rightTerms[0].value === 0);
		return hasConstantLeft || hasVarRight || hasConstRightForQuad;
	}

	apply(expr: Expr): RuleResult {
		if (expr.type !== 'Equation') return { before: expr, after: expr, title: '', explanation: '', concept: '', difficulty: 0 };

		const leftTerms = collectTerms(expr.left);
		const rightTerms = collectTerms(expr.right);

		// Primero intentar mover una constante de la izquierda a la derecha
		const constIdx = leftTerms.findIndex(isConstant);
		if (constIdx !== -1 && leftTerms.length > 1) {
			const termToMove = leftTerms[constIdx];
			const remainingLeft = leftTerms.filter((_, i) => i !== constIdx);

			// Negar el término: si es Number, negar su valor; si no, envolverlo en Multiply(-1, ...)
			const negated: Expr =
				termToMove.type === 'Number'
					? { type: 'Number', value: -termToMove.value }
					: { type: 'Multiply', left: { type: 'Number', value: -1 }, right: termToMove };

			const newLeft = buildAdd(remainingLeft);
			const newRight = buildAdd([...rightTerms, negated]);

			const termLatex = termToMove.type === 'Number' && termToMove.value > 0
				? `+${termToMove.value}`
				: termToMove.type === 'Number'
					? `${termToMove.value}`
					: 'término';

			return {
				before: expr,
				after: { type: 'Equation', left: newLeft, right: newRight },
				title: 'Mover constante al otro lado',
				explanation: `Se pasa el término ${termLatex} al lado derecho cambiando su signo. Lo que está en un lado de la ecuación, pasa al otro con signo contrario.`,
				concept: 'Transposición de términos',
				difficulty: 4
			};
		}

		// Luego intentar mover una variable de la derecha a la izquierda
		const varIdx = rightTerms.findIndex(containsVariable);
		if (varIdx !== -1) {
			const termToMove = rightTerms[varIdx];
			const remainingRight = rightTerms.filter((_, i) => i !== varIdx);

			const negated: Expr =
				termToMove.type === 'Multiply' && termToMove.left.type === 'Number'
					? { type: 'Multiply', left: { type: 'Number', value: -termToMove.left.value }, right: termToMove.right }
					: termToMove.type === 'Variable'
						? { type: 'Multiply', left: { type: 'Number', value: -1 }, right: termToMove }
						: { type: 'Multiply', left: { type: 'Number', value: -1 }, right: termToMove };

			const newLeft = buildAdd([...leftTerms, negated]);
			const newRight = buildAdd(remainingRight.length > 0 ? remainingRight : [{ type: 'Number', value: 0 }]);

			return {
				before: expr,
				after: { type: 'Equation', left: newLeft, right: newRight },
				title: 'Mover variable al lado izquierdo',
				explanation: `Se pasa el término con variable al lado izquierdo cambiando su signo.`,
				concept: 'Transposición de términos',
				difficulty: 4
			};
		}

		// Si hay un término cuadrático en la izquierda, mover la constante de la derecha a la izquierda para igualar a 0
		if (hasQuadraticTerm(expr.left)) {
			const constRightIdx = rightTerms.findIndex(isConstant);
			if (constRightIdx !== -1) {
				const termToMove = rightTerms[constRightIdx];
				if (!(rightTerms.length === 1 && termToMove.type === 'Number' && termToMove.value === 0)) {
					const remainingRight = rightTerms.filter((_, i) => i !== constRightIdx);
					const negated: Expr =
						termToMove.type === 'Number'
							? { type: 'Number', value: -termToMove.value }
							: { type: 'Multiply', left: { type: 'Number', value: -1 }, right: termToMove };

					const newLeft = buildAdd([...leftTerms, negated]);
					const newRight = buildAdd(remainingRight.length > 0 ? remainingRight : [{ type: 'Number', value: 0 }]);

					return {
						before: expr,
						after: { type: 'Equation', left: newLeft, right: newRight },
						title: 'Mover constante al lado izquierdo',
						explanation: 'Para igualar la ecuación cuadrática a cero y aplicar la fórmula de Bhaskara, pasamos la constante al lado izquierdo cambiando su signo.',
						concept: 'Ecuación cuadrática en forma general (ax² + bx + c = 0)',
						difficulty: 4
					};
				}
			}
		}

		return { before: expr, after: expr, title: '', explanation: '', concept: '', difficulty: 0 };
	}
}
