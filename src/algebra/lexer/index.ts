export type TokenType =
	| 'Number'
	| 'Variable'
	| 'Operator'
	| 'Equals'
	| 'LParen'
	| 'RParen'
	| 'LBrace'
	| 'RBrace'
	| 'LBracket'
	| 'RBracket'
	| 'Sqrt'
	| 'Frac';

export interface Token {
	type: TokenType;
	value: string;
}

export function tokenize(input: string): Token[] {
	// Normalizar superíndices Unicode (⁰, ¹, ², ³, ⁴, ⁵, ⁶, ⁷, ⁸, ⁹) a formato ^n
	const superMap: Record<string, string> = {
		'⁰': '0',
		'¹': '1',
		'²': '2',
		'³': '3',
		'⁴': '4',
		'⁵': '5',
		'⁶': '6',
		'⁷': '7',
		'⁸': '8',
		'⁹': '9'
	};
	input = input.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]+/g, (match) => {
		const digits = [...match].map((c) => superMap[c] ?? c).join('');
		return `^${digits}`;
	});

	const tokens: Token[] = [];
	let i = 0;

	while (i < input.length) {
		const char = input[i];

		// Ignorar espacios en blanco
		if (/\s/.test(char)) {
			i++;
			continue;
		}

		// \cdot y \times (operadores de multiplicación)
		if (input.substring(i).startsWith('\\cdot')) {
			tokens.push({ type: 'Operator', value: '*' });
			i += 5;
			continue;
		}
		if (input.substring(i).startsWith('\\times')) {
			tokens.push({ type: 'Operator', value: '*' });
			i += 6;
			continue;
		}
		if (char === '·' || char === '×') {
			tokens.push({ type: 'Operator', value: '*' });
			i++;
			continue;
		}

		// Sqrt y Frac
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
		if (/[a-zA-Z]/.test(char) && !input.substring(i).startsWith('sqrt')) {
			let name = '';
			while (
				i < input.length &&
				/[a-zA-Z]/.test(input[i]) &&
				!input.substring(i).startsWith('sqrt')
			) {
				name += input[i];
				i++;
			}
			if (name.length > 0) {
				tokens.push({ type: 'Variable', value: name });
				continue;
			}
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

		// Paréntesis, llaves y corchetes
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
		if (char === '[') {
			tokens.push({ type: 'LBracket', value: char });
			i++;
			continue;
		}
		if (char === ']') {
			tokens.push({ type: 'RBracket', value: char });
			i++;
			continue;
		}

		throw new Error(`Caracter inesperado en la posición ${i}: ${char}`);
	}

	return tokens;
}
