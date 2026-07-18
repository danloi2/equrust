use crate::ast::{Expr, Equation};
use crate::rules::simplify_constants::fmt_num;

pub trait FormatLatex {
    fn to_latex(&self) -> String;
}

impl FormatLatex for Expr {
    fn to_latex(&self) -> String {
        match self {
            Expr::Number(n) => fmt_num(*n),
            Expr::Variable(v) => v.clone(),
            Expr::Add(lhs, rhs) => {
                // a + (-n) → render as "a - n" to avoid "a + -n"
                if let Expr::Number(n) = rhs.as_ref() {
                    if *n < -1e-12 {
                        return format!("{} - {}", lhs.to_latex(), fmt_num(-n));
                    }
                }
                format!("{} + {}", lhs.to_latex(), rhs.to_latex())
            }
            Expr::Subtract(lhs, rhs) => {
                // a - (-n) → render as "a + n" to avoid "a - -n"
                if let Expr::Number(n) = rhs.as_ref() {
                    if *n < -1e-12 {
                        return format!("{} + {}", lhs.to_latex(), fmt_num(-n));
                    }
                }
                // a - (b + c) or a - (b - c) need parentheses
                let rhs_str = match rhs.as_ref() {
                    Expr::Add(_, _) | Expr::Subtract(_, _) => format!("({})", rhs.to_latex()),
                    _ => rhs.to_latex(),
                };
                format!("{} - {}", lhs.to_latex(), rhs_str)
            }
            Expr::Multiply(lhs, rhs) => {
                // Determine if we need parens for lhs
                let lhs_str = match **lhs {
                    Expr::Add(_, _) | Expr::Subtract(_, _) => format!("({})", lhs.to_latex()),
                    _ => lhs.to_latex(),
                };
                let rhs_str = match **rhs {
                    Expr::Add(_, _) | Expr::Subtract(_, _) => format!("({})", rhs.to_latex()),
                    _ => rhs.to_latex(),
                };
                
                // If rhs has parentheses (Add/Subtract) or is a Variable, we can use implicit multiplication
                if matches!(**rhs, Expr::Add(_, _) | Expr::Subtract(_, _) | Expr::Variable(_)) {
                    format!("{}{}", lhs_str, rhs_str)
                } else {
                    // Otherwise use \cdot, but let's write it carefully to avoid escaping issues
                    format!("{} \\cdot {}", lhs_str, rhs_str)
                }
            }
            Expr::Divide(lhs, rhs) => {
                format!(r"\frac{{{}}}{{{}}}", lhs.to_latex(), rhs.to_latex())
            }
            Expr::Power(lhs, rhs) => {
                let lhs_str = match **lhs {
                    Expr::Number(_) | Expr::Variable(_) => lhs.to_latex(),
                    _ => format!("({})", lhs.to_latex()),
                };
                format!("{}^{{{}}}", lhs_str, rhs.to_latex())
            }
            Expr::Sqrt(inner) => {
                format!("\\sqrt{{{}}}", inner.to_latex())
            }
        }
    }
}

impl FormatLatex for Equation {
    fn to_latex(&self) -> String {
        format!("{} = {}", self.left.to_latex(), self.right.to_latex())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_format_latex() {
        let eq = Equation {
            left: Expr::Add(
                Box::new(Expr::Multiply(
                    Box::new(Expr::Number(2.0)),
                    Box::new(Expr::Variable("x".to_string()))
                )),
                Box::new(Expr::Number(3.0))
            ),
            right: Expr::Divide(
                Box::new(Expr::Number(10.0)),
                Box::new(Expr::Number(2.0))
            )
        };
        assert_eq!(eq.to_latex(), r"2x + 3 = \frac{10}{2}");
    }
    
    #[test]
    fn test_format_power() {
        let expr = Expr::Power(
            Box::new(Expr::Variable("x".to_string())),
            Box::new(Expr::Number(2.0))
        );
        assert_eq!(expr.to_latex(), "x^{2}");
    }
}
