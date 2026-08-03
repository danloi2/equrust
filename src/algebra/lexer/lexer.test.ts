import { describe, it, expect } from 'vitest';
import { tokenize } from './index';

describe('Lexer', () => {
	it('tokenizes a simple expression', () => {
		const tokens = tokenize('2x + 3');
		expect(tokens).toEqual([
			{ type: 'Number', value: '2' },
			{ type: 'Variable', value: 'x' },
			{ type: 'Operator', value: '+' },
			{ type: 'Number', value: '3' }
		]);
	});

	it('tokenizes an equation with parentheses and power', () => {
		const tokens = tokenize('4(x - 2)^2 = 16');
		expect(tokens).toEqual([
			{ type: 'Number', value: '4' },
			{ type: 'LParen', value: '(' },
			{ type: 'Variable', value: 'x' },
			{ type: 'Operator', value: '-' },
			{ type: 'Number', value: '2' },
			{ type: 'RParen', value: ')' },
			{ type: 'Operator', value: '^' },
			{ type: 'Number', value: '2' },
			{ type: 'Equals', value: '=' },
			{ type: 'Number', value: '16' }
		]);
	});

	it('ignores whitespace', () => {
		const tokens = tokenize('  x   +   y  ');
		expect(tokens).toEqual([
			{ type: 'Variable', value: 'x' },
			{ type: 'Operator', value: '+' },
			{ type: 'Variable', value: 'y' }
		]);
	});

	it('tokenizes decimal numbers', () => {
		const tokens = tokenize('3.14 * r^2');
		expect(tokens).toEqual([
			{ type: 'Number', value: '3.14' },
			{ type: 'Operator', value: '*' },
			{ type: 'Variable', value: 'r' },
			{ type: 'Operator', value: '^' },
			{ type: 'Number', value: '2' }
		]);
	});

	it('tokenizes Unicode superscripts x²..x⁹ to ^n', () => {
		const tokens = tokenize('x² + x³ + x⁴ + x⁵ + x⁶ + x⁷ + x⁸ + x⁹');
		expect(tokens).toContainEqual({ type: 'Operator', value: '^' });
		expect(tokens).toContainEqual({ type: 'Number', value: '2' });
		expect(tokens).toContainEqual({ type: 'Number', value: '3' });
		expect(tokens).toContainEqual({ type: 'Number', value: '9' });
	});

	it('tokenizes \\cdot, \\times, · and × as multiplication operator', () => {
		const tokens1 = tokenize('2 \\cdot x');
		const tokens2 = tokenize('2 \\times x');
		const tokens3 = tokenize('2 · x');
		const tokens4 = tokenize('2 × x');
		expect(tokens1).toEqual(tokens2);
		expect(tokens2).toEqual(tokens3);
		expect(tokens3).toEqual(tokens4);
		expect(tokens1[1]).toEqual({ type: 'Operator', value: '*' });
	});

	it('throws on unexpected characters', () => {
		expect(() => tokenize('2x & 3')).toThrow('Caracter inesperado en la posición 3: &');
	});
});
