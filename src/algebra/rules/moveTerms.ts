import type { Expr, Rule, RuleResult } from '../types/index';
import { formatToLatex } from '../formatter/index';

function containsVariable(expr: Expr): boolean {
	switch (expr.type) {
		case 'Variable':
			return true;
		case 'Number':
			return false;
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

function isConstant(expr: Expr): boolean {
	return !containsVariable(expr);
}

function isZero(expr: Expr): boolean {
	return expr.type === 'Number' && expr.value === 0;
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

function negateExpr(term: Expr): Expr {
	if (term.type === 'Number') {
		return { type: 'Number', value: -term.value };
	}
	if (term.type === 'Multiply') {
		if (term.left.type === 'Number') {
			if (term.left.value === -1) return term.right;
			return {
				type: 'Multiply',
				left: { type: 'Number', value: -term.left.value },
				right: term.right
			};
		}
	}
	return { type: 'Multiply', left: { type: 'Number', value: -1 }, right: term };
}

function containsSqrt(expr: Expr): boolean {
	switch (expr.type) {
		case 'Sqrt':
			return true;
		case 'Add':
		case 'Multiply':
		case 'Divide':
		case 'Equation':
			return containsSqrt(expr.left) || containsSqrt(expr.right);
		case 'Power':
			return containsSqrt(expr.base) || containsSqrt(expr.exponent);
		case 'Parenthesis':
			return containsSqrt(expr.inner);
		default:
			return false;
	}
}

/**
 * Regla: Transponer términos en ecuaciones (método pedagógico de dos pasos).
 *
 * Muestra el paso intermedio ("se suma/resta lo mismo a ambos lados")
 * mediante explanationBlocks, pero el after es la expresión ya simplificada
 * para no crear ciclos infinitos.
 *
 * Ejemplo: x - 2 = 4
 *   explanationBlocks muestra: x - 2 + 2 = 4 + 2
 *   after: x = 6
 *
 * Solo mueve UN término a la vez.
 */
export class MoveTermsRule implements Rule {
	readonly name = 'move_terms';

	applies(expr: Expr): boolean {
		if (expr.type !== 'Equation') return false;

		// Si alguno de los lados es una raíz pura, dejar que SquareBothSidesRule actúe
		if (expr.left.type === 'Sqrt' || expr.right.type === 'Sqrt') return false;

		const leftTerms = collectTerms(expr.left);
		const rightTerms = collectTerms(expr.right);

		// Si un lado contiene ÚNICAMENTE raíces y el otro NO contiene raíces, la raíz ya está aislada
		const leftPureSqrt = leftTerms.every(containsSqrt);
		const rightNoSqrt = rightTerms.every((t) => !containsSqrt(t));
		if (leftPureSqrt && rightNoSqrt) return false;

		const rightPureSqrt = rightTerms.every(containsSqrt);
		const leftNoSqrt = leftTerms.every((t) => !containsSqrt(t));
		if (rightPureSqrt && leftNoSqrt) return false;

		// Si hay multiplicaciones sin simplificar en cualquier parte del árbol
		// (ej: x·(-5), 5·(-5), n·(-1·m)), esperar a que SimplifySigns/Constants actúen
		const hasUnsimplifiedNode = (node: Expr): boolean => {
			if (node.type === 'Multiply') {
				const { left, right } = node;
				// n * (-m) → números directos negativos
				if (left.type === 'Number' && left.value > 0 && right.type === 'Number' && right.value < 0)
					return true;
				// x * (-n)
				if (left.type === 'Variable' && right.type === 'Number' && right.value < 0) return true;
				// n * ((-1) * m)  — patrón generado por ExpandPowerRule
				if (
					left.type === 'Number' &&
					right.type === 'Multiply' &&
					right.left.type === 'Number' &&
					right.left.value === -1 &&
					right.right.type === 'Number'
				)
					return true;
				// x * ((-1) * m)  — patrón de x·(-5) via ExpandPowerRule
				if (
					left.type === 'Variable' &&
					right.type === 'Multiply' &&
					right.left.type === 'Number' &&
					right.left.value === -1
				)
					return true;
			}
			if (node.type === 'Add')
				return hasUnsimplifiedNode(node.left) || hasUnsimplifiedNode(node.right);
			return false;
		};
		if (hasUnsimplifiedNode(expr.left) || hasUnsimplifiedNode(expr.right)) return false;

		// Si el lado izquierdo contiene un término con raíz y otro sin raíz, aislar la raíz
		const leftHasSqrt = leftTerms.some(containsSqrt);
		const leftHasNonSqrtVar = leftTerms.some((t) => containsVariable(t) && !containsSqrt(t));
		if (leftHasSqrt && leftHasNonSqrtVar) return true;

		// Constante en la izquierda junto con variable(s) → mover la constante al derecho
		const hasConstantLeft = leftTerms.length > 1 && leftTerms.some(isConstant);

		// Variable en la derecha (excluyendo raíces puras) → mover la variable al izquierdo
		const hasVarRight = rightTerms.some((t) => containsVariable(t) && !containsSqrt(t));

		// Constante no-cero en la derecha, SOLO si la izquierda tiene cuadrático sin constante
		const leftHasQuadratic = leftTerms.some(
			(t) =>
				(t.type === 'Power' &&
					t.base.type === 'Variable' &&
					t.exponent.type === 'Number' &&
					t.exponent.value === 2) ||
				(t.type === 'Multiply' &&
					t.left.type === 'Number' &&
					t.right.type === 'Power' &&
					t.right.base.type === 'Variable' &&
					t.right.exponent.type === 'Number' &&
					t.right.exponent.value === 2)
		);
		const leftHasNoConst = !leftTerms.some(isConstant);
		const hasConstRightToMoveForQuad =
			leftHasQuadratic && leftHasNoConst && rightTerms.some((t) => isConstant(t) && !isZero(t));

		return hasConstantLeft || hasVarRight || hasConstRightToMoveForQuad;
	}

	apply(expr: Expr): RuleResult {
		if (expr.type !== 'Equation')
			return { before: expr, after: expr, title: '', explanation: '', concept: '', difficulty: 0 };

		const leftTerms = collectTerms(expr.left);
		const rightTerms = collectTerms(expr.right);

		// 0. Aislar término con raíz: mover variable sin raíz del lado izquierdo al lado derecho
		const leftHasSqrt = leftTerms.some(containsSqrt);
		const nonSqrtVarIdx = leftTerms.findIndex((t) => containsVariable(t) && !containsSqrt(t));
		if (leftHasSqrt && nonSqrtVarIdx !== -1) {
			const termToMove = leftTerms[nonSqrtVarIdx];
			const negated = negateExpr(termToMove);

			const remainingLeft = leftTerms.filter((_, i) => i !== nonSqrtVarIdx);
			const newLeft = buildAdd(remainingLeft);
			const newRight = buildAdd([...rightTerms, negated]);

			const intermediate: Expr = {
				type: 'Equation',
				left: { type: 'Add', left: expr.left, right: negated },
				right: { type: 'Add', left: expr.right, right: negated }
			};

			return {
				before: expr,
				after: { type: 'Equation', left: newLeft, right: newRight },
				title: `Restar ${formatToLatex(termToMove)} a ambos lados`,
				explanation: `Restamos ${formatToLatex(termToMove)} a ambos miembros para aislar el término con raíz cuadrada.`,
				explanationBlocks: [
					{ type: 'text', content: 'Aplicamos la misma operación a ambos lados:' },
					{ type: 'math', content: formatToLatex(intermediate) }
				],
				concept: 'Propiedad uniforme de la igualdad — aislamiento del radical',
				difficulty: 4
			};
		}

		// 1. Mover constante del lado izquierdo al lado derecho
		const constLeftIdx = leftTerms.findIndex(isConstant);
		if (constLeftIdx !== -1 && leftTerms.length > 1) {
			const termToMove = leftTerms[constLeftIdx];
			const negated = negateExpr(termToMove);

			const remainingLeft = leftTerms.filter((_, i) => i !== constLeftIdx);
			const newLeft = buildAdd(remainingLeft);
			const newRight = buildAdd([...rightTerms, negated]);

			const opText =
				termToMove.type === 'Number' && termToMove.value > 0
					? `Restar ${termToMove.value} a ambos lados`
					: termToMove.type === 'Number' && termToMove.value < 0
						? `Sumar ${Math.abs(termToMove.value)} a ambos lados`
						: `Aplicar la opuesta de ${formatToLatex(termToMove)} a ambos lados`;

			const intermediate: Expr = {
				type: 'Equation',
				left: { type: 'Add', left: expr.left, right: negated },
				right: { type: 'Add', left: expr.right, right: negated }
			};

			return {
				before: expr,
				after: { type: 'Equation', left: newLeft, right: newRight },
				title: opText,
				explanation: `Aplicamos la propiedad de igualdad: lo mismo que hacemos en un lado, lo hacemos en el otro. Restamos ${formatToLatex(termToMove)} a ambos miembros y simplificamos.`,
				explanationBlocks: [
					{ type: 'text', content: 'Aplicamos la misma operación a ambos lados:' },
					{ type: 'math', content: formatToLatex(intermediate) }
				],
				concept: 'Propiedad uniforme de la igualdad',
				difficulty: 4
			};
		}

		// 2. Mover variable del lado derecho al lado izquierdo
		const varRightIdx = rightTerms.findIndex((t) => containsVariable(t) && !containsSqrt(t));
		if (varRightIdx !== -1) {
			const termToMove = rightTerms[varRightIdx];
			const negated = negateExpr(termToMove);

			const remainingRight = rightTerms.filter((_, i) => i !== varRightIdx);
			const newLeft = buildAdd([...leftTerms, negated]);
			const newRight = buildAdd(
				remainingRight.length > 0 ? remainingRight : [{ type: 'Number', value: 0 }]
			);

			const intermediate: Expr = {
				type: 'Equation',
				left: { type: 'Add', left: expr.left, right: negated },
				right: { type: 'Add', left: expr.right, right: negated }
			};

			return {
				before: expr,
				after: { type: 'Equation', left: newLeft, right: newRight },
				title: `Restar ${formatToLatex(termToMove)} a ambos lados`,
				explanation: `Restamos ${formatToLatex(termToMove)} en ambos miembros para agrupar las variables en el lado izquierdo.`,
				explanationBlocks: [
					{ type: 'text', content: 'Aplicamos la misma operación a ambos lados:' },
					{ type: 'math', content: formatToLatex(intermediate) }
				],
				concept: 'Propiedad uniforme de la igualdad',
				difficulty: 4
			};
		}

		// 3. Mover constante del lado derecho al izquierdo (caso cuadrático)
		const leftHasNoConst = !leftTerms.some(isConstant);
		if (leftHasNoConst) {
			const constRightIdx = rightTerms.findIndex((t) => isConstant(t) && !isZero(t));
			if (constRightIdx !== -1) {
				const termToMove = rightTerms[constRightIdx];
				const negated = negateExpr(termToMove);

				const remainingRight = rightTerms.filter((_, i) => i !== constRightIdx);
				const newLeft = buildAdd([...leftTerms, negated]);
				const newRight = buildAdd(
					remainingRight.length > 0 ? remainingRight : [{ type: 'Number', value: 0 }]
				);

				const intermediate: Expr = {
					type: 'Equation',
					left: { type: 'Add', left: expr.left, right: negated },
					right: { type: 'Add', left: expr.right, right: negated }
				};

				const opText =
					termToMove.type === 'Number' && termToMove.value > 0
						? `Restar ${termToMove.value} a ambos lados`
						: termToMove.type === 'Number' && termToMove.value < 0
							? `Sumar ${Math.abs(termToMove.value)} a ambos lados`
							: `Aplicar la opuesta de ${formatToLatex(termToMove)} a ambos lados`;

				return {
					before: expr,
					after: { type: 'Equation', left: newLeft, right: newRight },
					title: opText,
					explanation: `Pasamos la constante ${formatToLatex(termToMove)} al lado izquierdo cambiando su signo.`,
					explanationBlocks: [
						{ type: 'text', content: 'Aplicamos la misma operación a ambos lados:' },
						{ type: 'math', content: formatToLatex(intermediate) }
					],
					concept: 'Propiedad uniforme de la igualdad',
					difficulty: 4
				};
			}
		}

		return { before: expr, after: expr, title: '', explanation: '', concept: '', difficulty: 0 };
	}
}
