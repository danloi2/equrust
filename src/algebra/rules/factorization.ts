import type { Expr, Rule, RuleResult } from '../types/index';
import { gcd, createFractionExpr, formatFractionLatex } from '../utils/fraction';
import { extractQuadraticCoefs } from '../utils/quadratic';

/**
 * Datos de los dos factores lineales (den·x − num) para ax² + bx + c = 0.
 */
interface FactorData {
	num1: number;
	den1: number;
	num2: number;
	den2: number;
	discriminant: number;
	sqrtD: number;
}

/**
 * Devuelve los factores enteros para ax² + bx + c = 0, o null si no es factorizable
 * con coeficientes enteros.
 *
 * Estrategia: las raíces x₁ = (-b + √Δ)/(2a) y x₂ = (-b - √Δ)/(2a) son racionales
 * iff √Δ ∈ ℤ. En ese caso cada raíz se escribe como fracción irreducible nᵢ/dᵢ
 * y el factor lineal correspondiente es (dᵢ·x − nᵢ).
 *
 * Para que el producto (d₁·x − n₁)(d₂·x − n₂) coincida exactamente con ax² + bx + c
 * se necesita que d₁·d₂ = |a|.
 */
function getIntegerFactors(a: number, b: number, c: number): FactorData | null {
	const discriminant = b * b - 4 * a * c;
	if (discriminant < 0) return null;

	const sqrtD = Math.sqrt(discriminant);
	if (!Number.isInteger(sqrtD)) return null;

	// Numeradores y denominador común antes de simplificar
	const rawNum1 = -b + sqrtD;
	const rawNum2 = -b - sqrtD;
	const rawDen = 2 * a;

	const g1 = gcd(Math.abs(rawNum1), Math.abs(rawDen)) || 1;
	const g2 = gcd(Math.abs(rawNum2), Math.abs(rawDen)) || 1;

	let num1 = rawNum1 / g1;
	let den1 = rawDen / g1;
	let num2 = rawNum2 / g2;
	let den2 = rawDen / g2;

	// Mantener denominadores positivos
	if (den1 < 0) {
		num1 = -num1;
		den1 = -den1;
	}
	if (den2 < 0) {
		num2 = -num2;
		den2 = -den2;
	}

	// Verificación: el producto de denominadores debe igualar |a|
	// para garantizar factores con coeficientes enteros
	if (den1 * den2 !== Math.abs(a)) return null;

	return { num1, den1, num2, den2, discriminant, sqrtD };
}

/**
 * Formatea un factor lineal (den·x − num) en LaTeX.
 * Ejemplos:
 *   den=1, num=3  → (x - 3)
 *   den=2, num=1  → (2x - 1)
 *   den=1, num=-2 → (x + 2)
 *   den=1, num=0  → (x)
 */
function formatFactor(den: number, num: number, varName: string): string {
	const coeffStr = den === 1 ? '' : `${den}`;
	const term = `${coeffStr}${varName}`;
	if (num === 0) return `(${term})`;
	if (num < 0) return `(${term} + ${Math.abs(num)})`;
	return `(${term} - ${num})`;
}

/**
 * Extrae el interior del factor (sin los paréntesis exteriores) para usarlo
 * en la resolución individual: "(2x - 1)" → "2x - 1 = 0".
 */
function factorInner(den: number, num: number, varName: string): string {
	return formatFactor(den, num, varName).slice(1, -1);
}

/**
 * Regla de Factorización.
 *
 * Aplica cuando ax² + bx + c = 0 admite factorización en la forma
 * (d₁x − n₁)(d₂x − n₂) = 0 con coeficientes enteros.
 * Cubre tanto el caso a = 1 (e.g. x² − 5x + 6 = 0 → (x−2)(x−3) = 0)
 * como a ≠ 1 (e.g. 2x² − 7x + 3 = 0 → (x−3)(2x−1) = 0).
 *
 * Se sitúa antes de la fórmula de Bhaskara en el orden de prioridad,
 * ya que la factorización es un método más elegante y pedagógico cuando aplica.
 */
export class FactorizationRule implements Rule {
	readonly name = 'factorization';

	applies(expr: Expr): boolean {
		if (expr.type !== 'Equation') return false;
		if (expr.right.type !== 'Number' || expr.right.value !== 0) return false;
		const coefs = extractQuadraticCoefs(expr.left);
		if (coefs === null) return false;
		return getIntegerFactors(coefs.a, coefs.b, coefs.c) !== null;
	}

	apply(expr: Expr): RuleResult {
		if (expr.type !== 'Equation') {
			return { before: expr, after: expr, title: '', explanation: '', concept: '', difficulty: 0 };
		}

		const coefs = extractQuadraticCoefs(expr.left)!;
		const { a, b, c, varName } = coefs;
		const { num1, den1, num2, den2, discriminant, sqrtD } = getIntegerFactors(a, b, c)!;

		// Soluciones numéricas
		const x1 = num1 / den1;
		const x2 = num2 / den2;

		// LaTeX de cada factor y de la forma factorizada
		const factor1Latex = formatFactor(den1, num1, varName);
		const factor2Latex = formatFactor(den2, num2, varName);
		const factoredFormLatex = `${factor1Latex}${factor2Latex} = 0`;

		// Soluciones en LaTeX (fracciones simplificadas)
		const sol1Latex = formatFractionLatex(num1, den1);
		const sol2Latex = formatFractionLatex(num2, den2);

		// Nodo AST para la ecuación final (x = x₁)
		const x1Expr = createFractionExpr(num1, den1);

		// Bloques de explicación pedagógicos
		const coefsStr = `a = ${a}, \\quad b = ${b}, \\quad c = ${c}`;
		const discCalcStr = `\\Delta = b^2 - 4ac = (${b})^2 - 4 \\cdot ${a} \\cdot ${c} = ${discriminant}`;

		// Descripción compacta del método de factorización
		// Se separa en dos bloques para evitar mezclar texto y LaTeX en un único bloque 'text'
		const methodDescText =
			discriminant === 0
				? 'Como el discriminante es nulo, la ecuación tiene una raíz doble:'
				: `Como √Δ = ${sqrtD} es número entero, la ecuación admite factorización:`;
		const methodDescMath =
			discriminant === 0
				? `\\sqrt{\\Delta} = 0`
				: `\\sqrt{\\Delta} = ${sqrtD} \\in \\mathbb{Z}`;

		return {
			before: expr,
			after: {
				type: 'Equation',
				left: { type: 'Variable', name: varName },
				right: x1Expr
			},
			title: 'Factorización — Producto nulo',
			explanation:
				`Factorizamos como ${factoredFormLatex}. ` +
				`Por la propiedad del producto nulo: ${varName} = ${sol1Latex} o ${varName} = ${sol2Latex}.`,
			explanationBlocks: [
				{ type: 'text', content: 'Identificamos los coeficientes de la ecuación cuadrática:' },
				{ type: 'math', content: coefsStr },
				{
					type: 'text',
					content: 'Calculamos el discriminante para comprobar si admite factorización entera:'
				},
				{ type: 'math', content: discCalcStr },
				{ type: 'math', content: methodDescMath },
				{ type: 'text', content: methodDescText },
				{ type: 'math', content: factoredFormLatex },
				{ type: 'text', content: 'Propiedad del producto nulo: si A · B = 0, entonces A = 0 o B = 0:' },
				{ type: 'math', content: 'A \\cdot B = 0 \\implies A = 0 \\text{ o } B = 0' },
				{
					type: 'math',
					content: `${factorInner(den1, num1, varName)} = 0 \\quad \\Rightarrow \\quad ${varName} = ${sol1Latex}`
				},
				{
					type: 'math',
					content: `${factorInner(den2, num2, varName)} = 0 \\quad \\Rightarrow \\quad ${varName} = ${sol2Latex}`
				},
				{ type: 'text', content: 'Soluciones:' },
				{
					type: 'math',
					content: `${varName}_1 = ${sol1Latex}, \\quad ${varName}_2 = ${sol2Latex}`
				}
			],
			concept: 'Factorización y propiedad del producto nulo',
			difficulty: 7,
			solutions: [x1, x2],
			solutionsLatex: [sol1Latex, sol2Latex],
			terminal: true
		};
	}
}
