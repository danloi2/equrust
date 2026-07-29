import { describe, it, expect } from 'vitest';
import { Solver } from './index';
import { parse } from '../parser';
import { tokenize } from '../lexer';
import { formatToLatex } from '../formatter';

describe('Solver', () => {
	it('solves 2 + 3 * 4 step by step', () => {
		const solver = new Solver();
		// Primero evalúa 3 * 4 = 12, luego 2 + 12 = 14
		// El orden del AST para 2 + 3 * 4 es Add(2, Multiply(3, 4))
		const ast = parse(tokenize('2 + 3 * 4'));
		
		const steps = solver.solve(ast);
		
		expect(steps.length).toBe(2);
		expect(steps[0].after).toEqual({
			type: 'Add',
			left: { type: 'Number', value: 2 },
			right: { type: 'Number', value: 12 }
		});
		
		expect(steps[1].after).toEqual({
			type: 'Number',
			value: 14
		});
	});

	it('returns empty array if no rules apply', () => {
		const solver = new Solver();
		const ast = parse(tokenize('x + y'));
		const steps = solver.solve(ast);
		expect(steps.length).toBe(0);
	});

	it('detects sqrt(x+2)=-2 has no real solution (domain check)', () => {
		const solver = new Solver();
		const ast = parse(tokenize('sqrt(x+2) = -2'));
		const steps = solver.solve(ast);

		// El último paso debe ser el de dominio de raíz cuadrada
		const last = steps[steps.length - 1];
		expect(last.title).toContain('Sin solución');
		expect(last.solutions).toEqual([]);
	});

	it('solves (x+2)^2=4 by expanding and applying quadratic formula', () => {
		const solver = new Solver();
		const ast = parse(tokenize('(x+2)^2 = 4'));
		const steps = solver.solve(ast);

		// Debe haber al menos un paso de expansión de potencia
		const expandStep = steps.find(s => s.title.includes('potencia'));
		expect(expandStep).toBeDefined();

		// El último paso debe ser Bhaskara con 2 soluciones: x=0 y x=-4
		const last = steps[steps.length - 1];
		expect(last.title).toContain('Bhaskara');
		expect(last.solutions).toHaveLength(2);
		const sols = [...(last.solutions as unknown as number[])].sort((a, b) => a - b);
		expect(sols[0]).toBeCloseTo(-4, 4);
		expect(sols[1]).toBeCloseTo(0, 4);
	});

	it('solves (-x+2)^2=4 correctly (solutions x=0 and x=4)', () => {
		const solver = new Solver();
		const ast = parse(tokenize('(-x+2)^2 = 4'));
		const steps = solver.solve(ast);

		const last = steps[steps.length - 1];
		expect(last.title).toContain('Bhaskara');
		expect(last.solutions).toHaveLength(2);
		const sols = [...(last.solutions as unknown as number[])].sort((a, b) => a - b);
		expect(sols[0]).toBeCloseTo(0, 4);
		expect(sols[1]).toBeCloseTo(4, 4);
	});

	it('solves (-x+1)^2=4 correctly (solutions x=-1 and x=3)', () => {
		const solver = new Solver();
		const ast = parse(tokenize('(-x+1)^2 = 4'));
		const steps = solver.solve(ast);

		const last = steps[steps.length - 1];
		expect(last.title).toContain('Bhaskara');
		expect(last.solutions).toHaveLength(2);
		const sols = [...(last.solutions as unknown as number[])].sort((a, b) => a - b);
		expect(sols[0]).toBeCloseTo(-1, 4);
		expect(sols[1]).toBeCloseTo(3, 4);
	});

	it('solves x^2 - \\frac{7}{6}x + \\frac{1}{3} = 0 without infinite loop', () => {
		const solver = new Solver();
		const ast = parse(tokenize('x^2 - \\frac{7}{6}x + \\frac{1}{3} = 0'));
		const steps = solver.solve(ast);

		expect(steps.length).toBeGreaterThan(0);
		const last = steps[steps.length - 1];
		expect(last.title).toContain('Bhaskara');
		expect(last.solutions).toHaveLength(2);
		const sols = [...(last.solutions as unknown as number[])].sort((a, b) => a - b);
		// x^2 - 7/6 x + 1/3 = 0 -> 6x^2 - 7x + 2 = 0 -> (2x-1)(3x-2) = 0 -> x = 1/2 (0.5) and x = 2/3 (0.666666...)
		expect(sols[0]).toBeCloseTo(0.5, 4);
		expect(sols[1]).toBeCloseTo(2 / 3, 4);
	});

	it('solves x^2 - 7/6x + 1/3 = 0 (plain division syntax)', () => {
		const solver = new Solver();
		const ast = parse(tokenize('x^2 - 7/6*x + 1/3 = 0'));
		const steps = solver.solve(ast);

		expect(steps.length).toBeGreaterThan(0);
		const last = steps[steps.length - 1];
		expect(last.title).toContain('Bhaskara');
		expect(last.solutions).toHaveLength(2);
		const sols = [...(last.solutions as unknown as number[])].sort((a, b) => a - b);
		expect(sols[0]).toBeCloseTo(0.5, 4);
		expect(sols[1]).toBeCloseTo(2 / 3, 4);
	});

	it('solves x - 2 = 4 showing equality property in explanation blocks', () => {
		const solver = new Solver();
		const ast = parse(tokenize('x - 2 = 4'));
		const steps = solver.solve(ast);

		expect(steps.length).toBeGreaterThanOrEqual(1);
		const moveStep = steps.find((s) => s.title.includes('Sumar 2 a ambos lados'));
		expect(moveStep).toBeDefined();
		expect(moveStep?.explanationBlocks).toBeDefined();
		expect(moveStep?.explanationBlocks?.length).toBeGreaterThan(0);
	});

	it('reorders polynomial terms by degree before combining', () => {
		const solver = new Solver();
		const ast = parse(tokenize('x^2 + 49 - 14x + x^2 = 25'));
		const steps = solver.solve(ast);

		const reorderStep = steps.find((s) => s.title.includes('Ordenar términos por grado'));
		expect(reorderStep).toBeDefined();
		expect(formatToLatex(reorderStep!.after)).toBe('x^{2} + x^{2} - 14x + 49 = 25');
	});

	it('returns exact radical roots for quadratic equations with irrational solutions', () => {
		const solver = new Solver();
		const ast = parse(tokenize('x^2 + 4x + 3 = 4'));
		const steps = solver.solve(ast);

		const lastStep = steps[steps.length - 1];
		expect(lastStep.title).toContain('Bhaskara');
		expect(lastStep.solutionsLatex).toEqual(['-2 + \\sqrt{5}', '-2 - \\sqrt{5}']);
	});

	it('formats negative fractions with the minus sign in front of the fraction', () => {
		const solver = new Solver();
		const ast = parse(tokenize('4x = -5'));
		const steps = solver.solve(ast);

		const lastStep = steps[steps.length - 1];
		expect(formatToLatex(lastStep.after)).toBe('x = -\\frac{5}{4}');
	});

	it('detects 2(x-3)=2x+1 has no solution (contradiction)', () => {
		const solver = new Solver();
		const ast = parse(tokenize('2(x-3) = 2x+1'));
		const steps = solver.solve(ast);

		const last = steps[steps.length - 1];
		expect(last.title).toContain('Contradicción');
		expect(last.solutions).toEqual([]);
		expect(last.terminal).toBe(true);
	});

	it('detects x+5=x+10 has no solution (contradiction)', () => {
		const solver = new Solver();
		const ast = parse(tokenize('x+5 = x+10'));
		const steps = solver.solve(ast);

		const last = steps[steps.length - 1];
		expect(last.title).toContain('Contradicción');
		expect(last.solutions).toEqual([]);
		expect(last.terminal).toBe(true);
	});
});

