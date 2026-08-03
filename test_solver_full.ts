import { parse } from './src/algebra/parser/index.ts';
import { tokenize } from './src/algebra/lexer/index.ts';
import { formatToLatex } from './src/algebra/formatter/index.ts';
import { Solver } from './src/algebra/solver/index.ts';

const input = '\\frac{3x-5}{4}-\\frac{x+7}{6}=\\frac{5}{3}';
const tokens = tokenize(input);
const ast = parse(tokens);

const solver = new Solver();
const steps = solver.solve(ast);

for (const step of steps) {
	console.log(step.title, '->', formatToLatex(step.after));
}
