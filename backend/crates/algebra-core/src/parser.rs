use chumsky::prelude::*;
use chumsky::input::ValueInput;
use crate::lexer::Token;
use crate::ast::{Expr, Equation};

/// Parse a stream of `Token`s into an `Equation`.
///
/// The parser is generic over any `ValueInput` whose token type is `Token`.
/// In production we use `chumsky::input::Stream` (built from the lexer output).
pub fn parser<'a, I>() -> impl Parser<'a, I, Equation, extra::Err<Rich<'a, Token>>>
where
    I: ValueInput<'a, Token = Token, Span = SimpleSpan>,
{
    let expr = recursive(|expr| {
        // ── Atoms ────────────────────────────────────────────────────────────
        let number = select! { Token::Number(n) => Expr::Number(n.parse::<f64>().unwrap_or(0.0)) };
        let variable = select! { Token::Variable(v) => Expr::Variable(v) };
        
        let parenthesized = expr.clone()
            .delimited_by(just(Token::LParen), just(Token::RParen));
        let braced = expr.clone()
            .delimited_by(just(Token::LBrace), just(Token::RBrace));

        let sqrt = just(Token::Sqrt)
            .ignore_then(
                parenthesized.clone().or(braced.clone())
            )
            .map(|inner| Expr::Sqrt(Box::new(inner)));

        let frac = just(Token::Frac)
            .ignore_then(
                expr.clone().delimited_by(just(Token::LBrace), just(Token::RBrace))
            )
            .then(
                expr.clone().delimited_by(just(Token::LBrace), just(Token::RBrace))
            )
            .map(|(num, den)| Expr::Divide(Box::new(num), Box::new(den)));

        let atom = number.or(variable).or(sqrt).or(frac).or(parenthesized).or(braced);

        // ── Exponentiation (right-associative) ───────────────────────────────
        // atom ^ atom ^ … using foldl (becomes left-assoc, sufficient for now)
        let power = atom.clone().foldl(
            just(Token::Power).ignore_then(atom.clone()).repeated(),
            |lhs, rhs| Expr::Power(Box::new(lhs), Box::new(rhs)),
        );

        // ── Explicit multiplication / division ───────────────────────────────
        let factor = power.clone().foldl(
            choice((
                just(Token::Multiply).to(true as u8),
                just(Token::Divide).to(false as u8),
            ))
            .then(power.clone())
            .repeated(),
            |lhs, (op, rhs)| {
                if op != 0 { Expr::Multiply(Box::new(lhs), Box::new(rhs)) }
                else       { Expr::Divide  (Box::new(lhs), Box::new(rhs)) }
            },
        );

        // ── Implicit multiplication: 2x, 3(x+1) ─────────────────────────────
        // factor repeated without an operator between them
        let implicit = factor.clone().foldl(
            factor.clone().repeated(),
            |lhs, rhs| Expr::Multiply(Box::new(lhs), Box::new(rhs)),
        );

        // ── Addition / Subtraction ───────────────────────────────────────────
        implicit.clone().foldl(
            choice((
                just(Token::Add).to(true as u8),
                just(Token::Subtract).to(false as u8),
            ))
            .then(implicit.clone())
            .repeated(),
            |lhs, (op, rhs)| {
                if op != 0 { Expr::Add     (Box::new(lhs), Box::new(rhs)) }
                else       { Expr::Subtract(Box::new(lhs), Box::new(rhs)) }
            },
        )
    });

    // ── Equation ─────────────────────────────────────────────────────────────
    expr.clone()
        .then_ignore(just(Token::Equals))
        .then(expr)
        .map(|(left, right)| Equation { left, right })
}

/// Helper used in tests and in the API to build a `Stream` from lexer output.
/// Strips span information — spans are tracked positionally by the Stream itself.
pub fn token_stream(
    tokens: Vec<(Token, SimpleSpan)>,
) -> chumsky::input::Stream<std::vec::IntoIter<Token>> {
    let bare: Vec<Token> = tokens.into_iter().map(|(t, _)| t).collect();
    chumsky::input::Stream::from_iter(bare)
}

/// Parse a string into an `Equation`. Returns None on parse error.
pub fn parse_equation(input: &str) -> Option<Equation> {
    use crate::lexer::lexer;
    use chumsky::Parser as _;
    let tokens = lexer().parse(input).into_result().ok()?;
    parser().parse(token_stream(tokens)).into_result().ok()
}

/// Parse a string into an `Expr`, treating standalone expressions
/// (without `=`) as the left side of a dummy equation.
pub fn parse(input: &str) -> Option<Expr> {
    // If no '=' is present, append "=0" so the parser still works
    let input = if input.contains('=') {
        input.to_string()
    } else {
        format!("{}=0", input)
    };
    parse_equation(&input).map(|eq| eq.left)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::lexer::lexer;

    fn parse(input: &str) -> Equation {
        let tokens = lexer().parse(input).unwrap();
        parser()
            .parse(token_stream(tokens))
            .into_result()
            .unwrap()
    }

    #[test]
    fn test_simple_linear() {
        let eq = parse("2 * x + 3 = 10");
        assert_eq!(
            eq,
            Equation {
                left: Expr::Add(
                    Box::new(Expr::Multiply(
                        Box::new(Expr::Number(2.0)),
                        Box::new(Expr::Variable("x".to_string())),
                    )),
                    Box::new(Expr::Number(3.0)),
                ),
                right: Expr::Number(10.0),
            }
        );
    }

    #[test]
    fn test_implicit_mul() {
        let eq = parse("2x = 6");
        assert_eq!(
            eq,
            Equation {
                left: Expr::Multiply(
                    Box::new(Expr::Number(2.0)),
                    Box::new(Expr::Variable("x".to_string())),
                ),
                right: Expr::Number(6.0),
            }
        );
    }

    #[test]
    fn test_power() {
        let eq = parse("x^2 = 9");
        assert_eq!(
            eq,
            Equation {
                left: Expr::Power(
                    Box::new(Expr::Variable("x".to_string())),
                    Box::new(Expr::Number(2.0)),
                ),
                right: Expr::Number(9.0),
            }
        );
    }
}
