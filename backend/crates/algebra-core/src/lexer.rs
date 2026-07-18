use chumsky::prelude::*;
use std::fmt;

pub type Span = SimpleSpan;

#[derive(Clone, Debug, PartialEq, Hash, Eq)]
pub enum Token {
    Number(String),
    Variable(String),
    Add,
    Subtract,
    Multiply,
    Divide,
    Power,
    LParen,
    RParen,
    LBrace,
    RBrace,
    Equals,
    Sqrt,
    Frac,
}

impl fmt::Display for Token {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            Token::Number(n)   => write!(f, "{n}"),
            Token::Variable(v) => write!(f, "{v}"),
            Token::Add        => write!(f, "+"),
            Token::Subtract   => write!(f, "-"),
            Token::Multiply   => write!(f, "*"),
            Token::Divide     => write!(f, "/"),
            Token::Power      => write!(f, "^"),
            Token::LParen     => write!(f, "("),
            Token::RParen     => write!(f, ")"),
            Token::LBrace     => write!(f, "{{"),
            Token::RBrace     => write!(f, "}}"),
            Token::Equals     => write!(f, "="),
            Token::Sqrt       => write!(f, "sqrt"),
            Token::Frac       => write!(f, "\\frac"),
        }
    }
}

// In chumsky 0.13 the lexer produces Vec<(Token, Span)>
pub fn lexer<'src>()
    -> impl Parser<'src, &'src str, Vec<(Token, Span)>, extra::Err<Rich<'src, char>>>
{
    // Integers and decimals: "3", "3.14"
    let num = text::int(10)
        .then(just('.').then(text::digits(10)).or_not())
        .to_slice()
        .map(|s: &str| Token::Number(s.to_string()));

    // Identifiers (variables): x, y, abc
    let ident = text::ident().map(|s: &str| Token::Variable(s.to_string()));

    // Operators and punctuation
    let op = choice((
        just('+').to(Token::Add),
        just('-').or(just('−')).to(Token::Subtract),
        just('*').to(Token::Multiply),
        just('/').to(Token::Divide),
        just('^').to(Token::Power),
        just('(').to(Token::LParen),
        just(')').to(Token::RParen),
        just('{').to(Token::LBrace),
        just('}').to(Token::RBrace),
        just('=').to(Token::Equals),
    ));

    let sqrt = just("sqrt").or(just("\\sqrt")).to(Token::Sqrt);
    let frac = just("\\frac").to(Token::Frac);

    // num must come before ident so "3x" lexes as [Number("3"), Variable("x")]
    num.or(sqrt).or(frac).or(ident).or(op)
        .map_with(|tok, e| (tok, e.span()))
        .padded()
        .repeated()
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn lex(input: &str) -> Vec<Token> {
        lexer()
            .parse(input)
            .unwrap()
            .into_iter()
            .map(|(t, _)| t)
            .collect()
    }

    #[test]
    fn test_lexer_basic() {
        assert_eq!(
            lex("2 * x + 3 = 10"),
            vec![
                Token::Number("2".to_string()),
                Token::Multiply,
                Token::Variable("x".to_string()),
                Token::Add,
                Token::Number("3".to_string()),
                Token::Equals,
                Token::Number("10".to_string()),
            ]
        );
    }

    #[test]
    fn test_lexer_no_spaces() {
        assert_eq!(
            lex("2x+3=10"),
            vec![
                Token::Number("2".to_string()),
                Token::Variable("x".to_string()),
                Token::Add,
                Token::Number("3".to_string()),
                Token::Equals,
                Token::Number("10".to_string()),
            ]
        );
    }

    #[test]
    fn test_lexer_parens() {
        assert_eq!(
            lex("2(x+3)"),
            vec![
                Token::Number("2".to_string()),
                Token::LParen,
                Token::Variable("x".to_string()),
                Token::Add,
                Token::Number("3".to_string()),
                Token::RParen,
            ]
        );
    }

    #[test]
    fn test_lexer_power() {
        assert_eq!(
            lex("x^2"),
            vec![
                Token::Variable("x".to_string()),
                Token::Power,
                Token::Number("2".to_string()),
            ]
        );
    }
}
