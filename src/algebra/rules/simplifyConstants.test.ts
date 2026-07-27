import { describe, it, expect } from 'vitest';
import { SimplifyConstantsRule } from './simplifyConstants';
import { parse } from '../parser';
import { tokenize } from '../lexer';

describe('SimplifyConstantsRule', () => {
	const rule = new SimplifyConstantsRule();

	it('applies to 2 + 3', () => {
		const ast = parse(tokenize('2 + 3'));
		expect(rule.applies(ast)).toBe(true);
		
		const result = rule.apply(ast);
		expect(result.after).toEqual({ type: 'Number', value: 5 });
	});

	it('applies to 4 * 5', () => {
		const ast = parse(tokenize('4 * 5'));
		expect(rule.applies(ast)).toBe(true);
		
		const result = rule.apply(ast);
		expect(result.after).toEqual({ type: 'Number', value: 20 });
	});

	it('applies deeply in an AST', () => {
		const ast = parse(tokenize('x + (2 + 3)'));
		expect(rule.applies(ast)).toBe(true);
		
		const result = rule.apply(ast);
		expect(result.after).toEqual({
			type: 'Add',
			left: { type: 'Variable', name: 'x' },
			right: {
				type: 'Parenthesis',
				inner: { type: 'Number', value: 5 }
			}
		});
	});

	it('does not apply to x + y', () => {
		const ast = parse(tokenize('x + y'));
		expect(rule.applies(ast)).toBe(false);
	});
});
