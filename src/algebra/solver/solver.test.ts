import { describe, it, expect } from 'vitest';
import { Solver } from './index';
import { parse } from '../parser';
import { tokenize } from '../lexer';

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
});

