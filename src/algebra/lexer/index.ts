export type TokenType =
	| 'Number'
	| 'Variable'
	| 'Operator'
	| 'Equals'
	| 'LParen'
	| 'RParen'
	| 'LBrace'
	| 'RBrace'
	| 'Sqrt'
	| 'Frac';

export interface Token {
	type: TokenType;
	value: string;
}

export function tokenize(input: string): Token[] {
	const tokens: Token[] = [];
	let i = 0;

	while (i < input.length) {
		const char = input[i];

		// Ignorar espacios en blanco
		if (/\s/.test(char)) {
			i++;
			continue;
		}

		// Números (enteros o decimales)
		if (/\d/.test(char) || char === '.') {
			let num = '';
			while (i < input.length && (/\d/.test(input[i]) || input[i] === '.')) {
				num += input[i];
				i++;
			}
			tokens.push({ type: 'Number', value: num });
			continue;
		}

		// Variables (letras, usualmente x, y, z)
		// Ignoramos la 's' de sqrt, la 'f' de frac si coincide con la palabra completa (se manejan abajo)
		if (/[a-zA-Z]/.test(char) && !input.substring(i).startsWith('sqrt')) {
			let name = '';
			while (i < input.length && /[a-zA-Z]/.test(input[i]) && !input.substring(i).startsWith('sqrt')) {
				name += input[i];
				i++;
			}
			if (name.length > 0) {
				tokens.push({ type: 'Variable', value: name });
				continue;
			}
		}

		// Sqrt and Frac
		if (input.substring(i).startsWith('sqrt')) {
			tokens.push({ type: 'Sqrt', value: 'sqrt' });
			i += 4;
			continue;
		}
		if (input.substring(i).startsWith('\\sqrt')) {
			tokens.push({ type: 'Sqrt', value: '\\sqrt' });
			i += 5;
			continue;
		}
		if (input.substring(i).startsWith('\\frac')) {
			tokens.push({ type: 'Frac', value: '\\frac' });
			i += 5;
			continue;
		}

		// Operadores
		if (['+', '-', '*', '/', '^'].includes(char)) {
			tokens.push({ type: 'Operator', value: char });
			i++;
			continue;
		}

		// Símbolo de igual
		if (char === '=') {
			tokens.push({ type: 'Equals', value: char });
			i++;
			continue;
		}

		// Paréntesis
		if (char === '(') {
			tokens.push({ type: 'LParen', value: char });
			i++;
			continue;
		}
		if (char === ')') {
			tokens.push({ type: 'RParen', value: char });
			i++;
			continue;
		}
		if (char === '{') {
			tokens.push({ type: 'LBrace', value: char });
			i++;
			continue;
		}
		if (char === '}') {
			tokens.push({ type: 'RBrace', value: char });
			i++;
			continue;
		}

		throw new Error(`Caracter inesperado en la posición ${i}: ${char}`);
	}

	return tokens;
}
