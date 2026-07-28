import type { Expr, Rule, RuleResult } from '../types/index';
import { createFractionExpr, formatFractionLatex } from '../utils/fraction';

function collectTerms(expr: Expr): Expr[] {
	if (expr.type === 'Add') return [...collectTerms(expr.left), ...collectTerms(expr.right)];
	return [expr];
}

function extractQuadraticCoefs(
	expr: Expr
): { a: number; b: number; c: number; varName: string } | null {
	const terms = collectTerms(expr);
	let a = 0, b = 0, c = 0;
	let varName: string | null = null;

	for (const term of terms) {
		// ax^2 → Multiply(Number, Power(Var, 2))
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
		// x^2 → Power(Var, 2)
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
		// bx → Multiply(Number, Var)
		if (
			term.type === 'Multiply' &&
			term.left.type === 'Number' &&
			term.right.type === 'Variable'
		) {
			varName = varName ?? term.right.name;
			b += term.left.value;
			continue;
		}
		// x → Var
		if (term.type === 'Variable') {
			varName = varName ?? term.name;
			b += 1;
			continue;
		}
		// c → Number (incluye negativos)
		if (term.type === 'Number') {
			c += term.value;
			continue;
		}
		return null;
	}

	if (varName === null || a === 0) return null;
	return { a, b, c, varName };
}

/**
 * Aplica la fórmula de Bhaskara (cuadrática) a ecuaciones de la forma ax² + bx + c = 0.
 */
export class QuadraticFormulaRule implements Rule {
	readonly name = 'quadratic_formula';

	applies(expr: Expr): boolean {
		if (expr.type !== 'Equation') return false;
		if (expr.right.type !== 'Number' || expr.right.value !== 0) return false;
		return extractQuadraticCoefs(expr.left) !== null;
	}

	apply(expr: Expr): RuleResult {
		if (expr.type !== 'Equation') {
			return { before: expr, after: expr, title: '', explanation: '', concept: '', difficulty: 0, solutions: [] };
		}

		const coefs = extractQuadraticCoefs(expr.left)!;
		const { a, b, c, varName } = coefs;

		const discriminant = b * b - 4 * a * c;
		const coefsStr = `a = ${a}, \\quad b = ${b}, \\quad c = ${c}`;
		const formulaStr = `${varName} = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}`;
		const subStr = `${varName} = \\frac{-(${b}) \\pm \\sqrt{(${b})^2 - 4 \\cdot (${a}) \\cdot (${c})}}{2 \\cdot (${a})}`;
		const discCalcStr = `\\Delta = b^2 - 4ac = (${b})^2 - 4 \\cdot (${a}) \\cdot (${c}) = ${discriminant}`;

		if (discriminant < 0) {
			return {
				before: expr,
				after: {
					type: 'Equation',
					left: { type: 'Variable', name: varName },
					right: { type: 'Variable', name: '\\emptyset' }
				},
				title: 'Fórmula de Bhaskara — Sin solución real',
				explanation: `Para la ecuación cuadrática, identificamos los coeficientes:\na = ${a}, b = ${b}, c = ${c}\nAplicamos la fórmula de Bhaskara:\nCalculamos el discriminante: Δ = ${discriminant}.\nComo Δ < 0, la ecuación no tiene soluciones reales.`,
				explanationBlocks: [
					{ type: 'text', content: 'Identificamos los coeficientes de la ecuación cuadrática:' },
					{ type: 'math', content: coefsStr },
					{ type: 'text', content: 'Fórmula general de Bhaskara:' },
					{ type: 'math', content: formulaStr },
					{ type: 'text', content: 'Sustituimos los coeficientes:' },
					{ type: 'math', content: subStr },
					{ type: 'text', content: 'Calculamos el discriminante Δ:' },
					{ type: 'math', content: discCalcStr },
					{ type: 'text', content: 'Como Δ < 0, la parábola no corta el eje x. La ecuación no tiene soluciones reales.' }
				],
				concept: 'Discriminante negativo → Sin raíces reales',
				difficulty: 9,
				solutions: [],
				solutionsLatex: [],
				terminal: true
			};
		}

		if (discriminant === 0) {
			const x = -b / (2 * a);
			const xExpr = createFractionExpr(-b, 2 * a);
			const xLatex = formatFractionLatex(-b, 2 * a);
			return {
				before: expr,
				after: {
					type: 'Equation',
					left: { type: 'Variable', name: varName },
					right: xExpr
				},
				title: 'Fórmula de Bhaskara — Una solución doble',
				explanation: `Para la ecuación cuadrática, identificamos:\na = ${a}, b = ${b}, c = ${c}\nAplicamos Bhaskara: ${varName} = ${xLatex}`,
				explanationBlocks: [
					{ type: 'text', content: 'Identificamos los coeficientes de la ecuación cuadrática:' },
					{ type: 'math', content: coefsStr },
					{ type: 'text', content: 'Fórmula general de Bhaskara:' },
					{ type: 'math', content: formulaStr },
					{ type: 'text', content: 'Sustituimos los coeficientes:' },
					{ type: 'math', content: subStr },
					{ type: 'text', content: 'Calculamos el discriminante Δ:' },
					{ type: 'math', content: discCalcStr },
					{ type: 'text', content: 'Como Δ = 0, obtenemos una única raíz doble:' },
					{ type: 'math', content: `${varName} = \\frac{-(${b})}{2 \\cdot (${a})} = ${xLatex}` }
				],
				concept: 'Discriminante cero → Una raíz doble',
				difficulty: 9,
				solutions: [x],
				solutionsLatex: [xLatex],
				terminal: true
			};
		}

		// Δ > 0 → dos soluciones reales distintas
		const sqrtD = Math.sqrt(discriminant);
		const x1 = (-b + sqrtD) / (2 * a);
		const x2 = (-b - sqrtD) / (2 * a);

		let x1Expr: Expr;
		let x2Expr: Expr;
		let x1Latex: string;
		let x2Latex: string;

		if (Number.isInteger(sqrtD)) {
			const num1 = -b + sqrtD;
			const num2 = -b - sqrtD;
			const den = 2 * a;
			x1Expr = createFractionExpr(num1, den);
			x2Expr = createFractionExpr(num2, den);
			x1Latex = formatFractionLatex(num1, den);
			x2Latex = formatFractionLatex(num2, den);
		} else {
			x1Expr = { type: 'Number', value: parseFloat(x1.toFixed(6)) };
			x2Expr = { type: 'Number', value: parseFloat(x2.toFixed(6)) };
			x1Latex = parseFloat(x1.toFixed(4)).toString();
			x2Latex = parseFloat(x2.toFixed(4)).toString();
		}

		return {
			before: expr,
			after: {
				type: 'Equation',
				left: { type: 'Variable', name: `${varName}` },
				right: x1Expr
			},
			title: 'Fórmula de Bhaskara — Dos soluciones',
			explanation: `Para la ecuación cuadrática, identificamos los coeficientes:\na = ${a}, b = ${b}, c = ${c}\nCalculamos Δ = ${discriminant}.\nObtenemos dos soluciones reales: ${varName}_1 = ${x1Latex}, ${varName}_2 = ${x2Latex}`,
			explanationBlocks: [
				{ type: 'text', content: 'Identificamos los coeficientes de la ecuación cuadrática:' },
				{ type: 'math', content: coefsStr },
				{ type: 'text', content: 'Fórmula general de Bhaskara:' },
				{ type: 'math', content: formulaStr },
				{ type: 'text', content: 'Sustituimos los coeficientes en la fórmula:' },
				{ type: 'math', content: subStr },
				{ type: 'text', content: 'Calculamos el discriminante Δ:' },
				{ type: 'math', content: discCalcStr },
				{ type: 'text', content: 'Como Δ > 0, obtenemos dos soluciones reales distintas:' },
				{ type: 'math', content: `${varName}_1 = ${x1Latex}, \\quad ${varName}_2 = ${x2Latex}` }
			],
			concept: 'Discriminante positivo → Dos raíces reales',
			difficulty: 9,
			solutions: [x1, x2],
			solutionsLatex: [x1Latex, x2Latex],
			terminal: true
		};
	}
}
