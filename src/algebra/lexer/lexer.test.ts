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

	it('throws on unexpected characters', () => {
		expect(() => tokenize('2x & 3')).toThrow('Caracter inesperado en la posición 3: &');
	});
});
