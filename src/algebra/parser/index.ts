import type { Token } from '../lexer/index';
import type { Expr } from '../types/index';

export function parse(tokens: Token[]): Expr {
	let current = 0;

	function match(type: string, value?: string): boolean {
		if (current < tokens.length) {
			const token = tokens[current];
			if (token.type === type && (value === undefined || token.value === value)) {
				current++;
				return true;
			}
		}
		return false;
	}

	function peek(): Token | null {
		return current < tokens.length ? tokens[current] : null;
	}

	function consume(type: string, message: string): Token {
		if (current < tokens.length && tokens[current].type === type) {
			return tokens[current++];
		}
		throw new Error(message);
	}

	function parseEquation(): Expr {
		let left = parseAddSub();

		if (match('Equals')) {
			let right = parseAddSub();
			left = { type: 'Equation', left, right };
		}

		return left;
	}

	function parseAddSub(): Expr {
		let expr = parseMulDiv();

		while (true) {
			const token = peek();
			if (token && token.type === 'Operator' && (token.value === '+' || token.value === '-')) {
				current++;
				const right = parseMulDiv();
				if (token.value === '+') {
					expr = { type: 'Add', left: expr, right };
				} else {
					// Subtraction is currently not in the AST directly, let's treat A - B as Add(A, Multiply(-1, B)) or just add a SubNode?
					// Wait, the rule says "AddNode", "MultiplyNode" etc. 
					// A better AST design is keeping Add(A, Multiply(-1, B)), but the user types defined earlier didn't have SubNode.
					// I will add a SubNode, or represent it as Add(A, Multiply(-1, B)).
					// Let's stick to Add(A, Multiply({type: 'Number', value: -1}, B)).
					expr = {
						type: 'Add',
						left: expr,
						right: {
							type: 'Multiply',
							left: { type: 'Number', value: -1 },
							right
						}
					};
				}
			} else {
				break;
			}
		}

		return expr;
	}

	function parseMulDiv(): Expr {
		let expr = parsePower();

		while (true) {
			const token = peek();
			if (token && token.type === 'Operator' && (token.value === '*' || token.value === '/')) {
				current++;
				const right = parsePower();
				if (token.value === '*') {
					expr = { type: 'Multiply', left: expr, right };
				} else {
					expr = { type: 'Divide', left: expr, right };
				}
			} else if (
				token &&
				(token.type === 'Variable' || token.type === 'LParen' || token.type === 'Number' || token.type === 'Sqrt' || token.type === 'Frac')
			) {
				// Implicit multiplication!
				// Examples: 2x, 2(x+1), x y
				// Wait, if we have a number followed by a number, the lexer parses them as one number if there's no space, 
				// but if there's a space it parses as two numbers: "2 3". We shouldn't implicitly multiply "2 3", or maybe we should?
				// Usually 2x or 2(x) or (x)(y).
				if (expr.type === 'Number' && token.type === 'Number') {
					throw new Error('Unexpected number following a number');
				}
				const right = parsePower();
				expr = { type: 'Multiply', left: expr, right };
			} else {
				break;
			}
		}

		return expr;
	}

	function parsePower(): Expr {
		let expr = parseUnary();

		if (peek()?.type === 'Operator' && peek()?.value === '^') {
			current++;
			const exponent = parsePower(); // Right-associative
			expr = { type: 'Power', base: expr, exponent };
		}

		return expr;
	}

	function parseUnary(): Expr {
		if (match('Operator', '-')) {
			const expr = parsePower();
			return {
				type: 'Multiply',
				left: { type: 'Number', value: -1 },
				right: expr
			};
		}
		if (match('Operator', '+')) {
			return parsePower();
		}

		return parsePrimary();
	}

	function parsePrimary(): Expr {
		if (match('LParen')) {
			const expr = parseEquation(); 
			consume('RParen', 'Se esperaba ")"');
			return { type: 'Parenthesis', inner: expr };
		}

		if (match('Sqrt')) {
			let rootIndex: Expr | null = null;
			if (match('LBracket')) {
				rootIndex = parseEquation();
				consume('RBracket', 'Se esperaba "]" después del índice de la raíz');
			}

			let inner: Expr;
			const hasBrace = match('LBrace');
			if (!hasBrace) {
				const hasParen = match('LParen');
				if (!hasParen) {
					inner = parsePrimary();
				} else {
					inner = parseEquation();
					consume('RParen', 'Se esperaba ")" después de la raíz');
				}
			} else {
				inner = parseEquation();
				consume('RBrace', 'Se esperaba "}" después de la raíz');
			}

			if (rootIndex !== null) {
				return {
					type: 'Power',
					base: inner,
					exponent: {
						type: 'Divide',
						left: { type: 'Number', value: 1 },
						right: rootIndex
					}
				};
			}

			return { type: 'Sqrt', inner };
		}


		if (match('Frac')) {
			consume('LBrace', 'Se esperaba "{" para el numerador de la fracción');
			const left = parseEquation();
			consume('RBrace', 'Se esperaba "}" después del numerador');
			
			consume('LBrace', 'Se esperaba "{" para el denominador de la fracción');
			const right = parseEquation();
			consume('RBrace', 'Se esperaba "}" después del denominador');
			
			return { type: 'Divide', left, right };
		}

		if (peek()?.type === 'Number') {
			const token = consume('Number', 'Se esperaba un número');
			return { type: 'Number', value: parseFloat(token.value) };
		}

		if (peek()?.type === 'Variable') {
			const token = consume('Variable', 'Se esperaba una variable');
			return { type: 'Variable', name: token.value };
		}

		throw new Error(`Token inesperado: ${peek()?.value || 'EOF'}`);
	}

	const ast = parseEquation();

	if (current < tokens.length) {
		throw new Error(`Token inesperado al final de la expresión: ${tokens[current].value}`);
	}

	return ast;
}
