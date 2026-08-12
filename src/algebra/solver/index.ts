import type { Expr, Rule, RuleResult } from '../types/index';
import { SimplifyConstantsRule } from '../rules/simplifyConstants';
import { SimplifyParenthesisRule } from '../rules/simplifyParenthesis';
import { SimplifySignsRule } from '../rules/simplifySigns';
import { DistributiveRule } from '../rules/distributive';
import { CombineLikeTermsRule } from '../rules/combineLikeTerms';
import { MoveTermsRule } from '../rules/moveTerms';
import { DivideBothSidesRule } from '../rules/divideBothSides';
import { QuadraticFormulaRule } from '../rules/quadratic';
import { FactorizationRule } from '../rules/factorization';
import { NoSolutionRule } from '../rules/noSolution';

import { ClearDenominatorsRule } from '../rules/clearDenominators';
import { SquareBothSidesRule } from '../rules/squareBothSides';
import { SqrtDomainCheckRule } from '../rules/sqrtDomainCheck';
import { ExpandPowerRule } from '../rules/expandPower';
import { ReorderTermsRule } from '../rules/reorderTerms';
import { formatToLatex } from '../formatter/index';
import { containsSqrt, verifyRadicalSolutions } from '../utils/eval';

export class Solver {
	private rules: Rule[];

	constructor() {
		// Orden de prioridad estricto (de mayor a menor)
		this.rules = [
			new ClearDenominatorsRule(), // 0. Eliminar denominadores (MCM) antes que nada
			new SimplifySignsRule(), // 1. Simplificar signos (-1*-1 → 1, -1*2 → -2)
			new SimplifyConstantsRule(), // 2. Operar constantes (2+3 → 5)
			new SimplifyParenthesisRule(), // 3. Eliminar paréntesis redundantes
			new DistributiveRule(), // 4a. Propiedad distributiva
			new ExpandPowerRule(), // 4b. Expandir (expr)^n → producto repetido
			new ReorderTermsRule(), // 4c. Reordenar términos por grado (x² → x → cte)
			new CombineLikeTermsRule(), // 5. Agrupar términos semejantes
			new NoSolutionRule(), // 5b. Detectar contradicción: a=b (sin incógnita, a≠b)
			new SqrtDomainCheckRule(), // 6a. Verificar dominio: √f(x)=c con c<0 → sin solución
			new SquareBothSidesRule(), // 6b. Elevar al cuadrado ambos lados para quitar raíces
			new FactorizationRule(), // 7a. Factorización entera (método pedagógico preferido)
			new QuadraticFormulaRule(), // 7b. Fórmula cuadrática (cuando no factoriza en ℤ)
			new MoveTermsRule(), // 8. Transponer términos en ecuaciones
			new DivideBothSidesRule() // 9. Dividir ambos lados por el coeficiente
		];
	}

	/**
	 * Resuelve una expresión aplicando reglas paso a paso hasta que ninguna aplique.
	 */
	solve(initialExpr: Expr): RuleResult[] {
		const steps: RuleResult[] = [];
		let currentExpr = initialExpr;
		let ruleApplied = true;
		let iterations = 0;
		const maxIterations = 50;
		const visitedStates = new Set<string>();

		while (ruleApplied && iterations < maxIterations) {
			ruleApplied = false;

			for (const rule of this.rules) {
				if (rule.applies(currentExpr)) {
					const result = rule.apply(currentExpr);
					// Prevención de bucle: ignorar si el árbol no cambió
					if (result.after === currentExpr) continue;

					// Prevención de ciclo: registrar el estado ANTES + regla aplicada
					// para evitar que la misma regla aplique al mismo estado dos veces
					const stateKey = `${rule.name}::${formatToLatex(currentExpr)}`;
					if (visitedStates.has(stateKey)) continue;
					visitedStates.add(stateKey);

					steps.push(result);
					currentExpr = result.after;
					ruleApplied = true;
					// Si la regla es terminal (sin solución, fin definitivo), detener
					if (result.terminal) {
						ruleApplied = false;
					}
					break;
				}
			}
			iterations++;
		}

		if (iterations >= maxIterations) {
			console.warn('Solver: límite máximo de iteraciones alcanzado.');
		}

		// Si la ecuación original contenía raíces cuadradas y se obtuvieron soluciones, comprobarlas en la ecuación original
		if (steps.length > 0 && containsSqrt(initialExpr)) {
			const lastIdx = steps.length - 1;
			const lastStep = steps[lastIdx];
			if (lastStep.solutions && lastStep.solutions.length > 0) {
				const { validSolutions, validSolutionsLatex, details } = verifyRadicalSolutions(
					initialExpr,
					lastStep.solutions,
					lastStep.solutionsLatex
				);
				const existingBlocks = lastStep.explanationBlocks ? [...lastStep.explanationBlocks] : [];
				existingBlocks.push({
					type: 'text',
					content: 'Comprobación de soluciones en la ecuación original (verificación de dominio):'
				});
				for (const detail of details) {
					existingBlocks.push({
						type: 'math',
						content: detail.latexText
					});
				}

				const updatedSolutions = validSolutions.length === 2
					? ([validSolutions[0], validSolutions[1]] as const)
					: validSolutions.length === 1
						? ([validSolutions[0]] as const)
						: ([] as const);

				const updatedSolutionsLatex = validSolutionsLatex.length === 2
					? ([validSolutionsLatex[0], validSolutionsLatex[1]] as const)
					: validSolutionsLatex.length === 1
						? ([validSolutionsLatex[0]] as const)
						: ([] as const);

				steps[lastIdx] = {
					...lastStep,
					solutions: updatedSolutions,
					solutionsLatex: updatedSolutionsLatex,
					explanationBlocks: existingBlocks
				};
			}
		}

		return steps;
	}
}
