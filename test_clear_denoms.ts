import { parse } from './src/algebra/parser/index.ts';
import { tokenize } from './src/algebra/lexer/index.ts';
import { formatToLatex } from './src/algebra/formatter/index.ts';
import { ClearDenominatorsRule } from './src/algebra/rules/clearDenominators.ts';

const input = '\\frac{3x-5}{4}-\\frac{x+7}{6}=\\frac{5}{3}';
const tokens = tokenize(input);
const ast = parse(tokens);

console.log('AST:', JSON.stringify(ast, null, 2));

const rule = new ClearDenominatorsRule();
if (rule.applies(ast)) {
	const res = rule.apply(ast);
	console.log('BEFORE:', formatToLatex(res.before));
	console.log('AFTER:', formatToLatex(res.after));
} else {
	console.log('Rule does not apply');
}
