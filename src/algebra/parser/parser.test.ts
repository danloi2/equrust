import { describe, it, expect } from 'vitest';
import { parse } from './index';
import { tokenize } from '../lexer/index';

describe('Parser', () => {
	it('parses a simple addition', () => {
		const tokens = tokenize('2 + 3');
		const ast = parse(tokens);
		expect(ast).toEqual({
			type: 'Add',
			left: { type: 'Number', value: 2 },
			right: { type: 'Number', value: 3 }
		});
	});

	it('parses implicit multiplication (number and variable)', () => {
		const tokens = tokenize('2x');
		const ast = parse(tokens);
		expect(ast).toEqual({
			type: 'Multiply',
			left: { type: 'Number', value: 2 },
			right: { type: 'Variable', name: 'x' }
		});
	});

	it('parses implicit multiplication with parenthesis', () => {
		const tokens = tokenize('4(x + 1)');
		const ast = parse(tokens);
		expect(ast).toEqual({
			type: 'Multiply',
			left: { type: 'Number', value: 4 },
			right: {
				type: 'Parenthesis',
				inner: {
					type: 'Add',
					left: { type: 'Variable', name: 'x' },
					right: { type: 'Number', value: 1 }
				}
			}
		});
	});

	it('parses powers and precedence', () => {
		const tokens = tokenize('3 * x^2');
		const ast = parse(tokens);
		expect(ast).toEqual({
			type: 'Multiply',
			left: { type: 'Number', value: 3 },
			right: {
				type: 'Power',
				base: { type: 'Variable', name: 'x' },
				exponent: { type: 'Number', value: 2 }
			}
		});
	});

	it('parses an equation', () => {
		const tokens = tokenize('2x = 10');
		const ast = parse(tokens);
		expect(ast).toEqual({
			type: 'Equation',
			left: {
				type: 'Multiply',
				left: { type: 'Number', value: 2 },
				right: { type: 'Variable', name: 'x' }
			},
			right: { type: 'Number', value: 10 }
		});
	});

	it('handles subtraction via addition of negative', () => {
		const tokens = tokenize('x - 5');
		const ast = parse(tokens);
		expect(ast).toEqual({
			type: 'Add',
			left: { type: 'Variable', name: 'x' },
			right: {
				type: 'Multiply',
				left: { type: 'Number', value: -1 },
				right: { type: 'Number', value: 5 }
			}
		});
	});

	it('parses n-th root \\sqrt[3]{x}', () => {
		const tokens = tokenize('\\sqrt[3]{x}');
		const ast = parse(tokens);
		expect(ast).toEqual({
			type: 'Power',
			base: { type: 'Variable', name: 'x' },
			exponent: {
				type: 'Divide',
				left: { type: 'Number', value: 1 },
				right: { type: 'Number', value: 3 }
			}
		});
	});

	it('parses Unicode superscripts x² into power AST', () => {
		const tokens = tokenize('x²');
		const ast = parse(tokens);
		expect(ast).toEqual({
			type: 'Power',
			base: { type: 'Variable', name: 'x' },
			exponent: { type: 'Number', value: 2 }
		});
	});
});

