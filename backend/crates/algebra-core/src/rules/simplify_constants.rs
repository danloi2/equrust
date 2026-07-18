use crate::ast::Expr;
use crate::rules::{Rule, RuleResult};

// ─── Helper ───────────────────────────────────────────────────────────────────

/// Format a float without trailing `.0` for integer-valued numbers.
/// e.g. `5.0` → `"5"`, `3.14` → `"3.14"`
pub(crate) fn fmt_num(n: f64) -> String {
    if n.fract() == 0.0 {
        format!("{:.0}", n)
    } else {
        // Limit to 6 significant digits to avoid floating-point noise
        format!("{:.6}", n).trim_end_matches('0').trim_end_matches('.').to_string()
    }
}

// ─── Rule: Evaluate constant arithmetic ───────────────────────────────────────

/// Evaluates binary arithmetic operations where both operands are numeric literals.
///
/// Examples
/// ────────
///   2 + 3   →  5      (suma aritmética)
///   4 * 3   →  12     (multiplicación)
///   9 - 2   →  7      (resta)
///   10 / 2  →  5      (división)
///   2 ^ 3   →  8      (potencia entera)
pub struct SimplifyConstants;

impl Rule for SimplifyConstants {
    fn name(&self) -> &'static str {
        "Calcular operación"
    }

    fn applies(&self, expr: &Expr) -> bool {
        let both_numbers = |l: &Expr, r: &Expr| {
            matches!(l, Expr::Number(_)) && matches!(r, Expr::Number(_))
        };
        match expr {
            Expr::Add(l, r)
            | Expr::Subtract(l, r)
            | Expr::Multiply(l, r)
            | Expr::Power(l, r) => both_numbers(l, r),
            Expr::Divide(l, r) => {
                matches!(l.as_ref(), Expr::Number(_))
                    && matches!(r.as_ref(), Expr::Number(n) if *n != 0.0)
            }
            _ => false,
        }
    }

    fn apply(&self, expr: Expr) -> RuleResult {
        match expr {
            Expr::Add(l, r) => {
                let (a, b) = extract_pair(*l, *r);
                let result = a + b;
                RuleResult {
                    after: Expr::Number(result),
                    title: "Calcular suma",
                    explanation: format!(
                        "{} + {} = {}",
                        fmt_num(a),
                        fmt_num(b),
                        fmt_num(result)
                    ),
                    concept: "Aritmética básica — suma de constantes",
                }
            }
            Expr::Subtract(l, r) => {
                let (a, b) = extract_pair(*l, *r);
                let result = a - b;
                RuleResult {
                    after: Expr::Number(result),
                    title: "Calcular resta",
                    explanation: format!(
                        "{} - {} = {}",
                        fmt_num(a),
                        fmt_num(b),
                        fmt_num(result)
                    ),
                    concept: "Aritmética básica — resta de constantes",
                }
            }
            Expr::Multiply(l, r) => {
                let (a, b) = extract_pair(*l, *r);
                let result = a * b;
                RuleResult {
                    after: Expr::Number(result),
                    title: "Calcular producto",
                    explanation: format!(
                        "{} × {} = {}",
                        fmt_num(a),
                        fmt_num(b),
                        fmt_num(result)
                    ),
                    concept: "Aritmética básica — multiplicación de constantes",
                }
            }
            Expr::Divide(l, r) => {
                let (a, b) = extract_pair(*l, *r);
                let result = a / b;
                RuleResult {
                    after: Expr::Number(result),
                    title: "Calcular cociente",
                    explanation: format!(
                        "{} ÷ {} = {}",
                        fmt_num(a),
                        fmt_num(b),
                        fmt_num(result)
                    ),
                    concept: "Aritmética básica — división de constantes",
                }
            }
            Expr::Power(l, r) => {
                let (a, b) = extract_pair(*l, *r);
                let result = a.powf(b);
                RuleResult {
                    after: Expr::Number(result),
                    title: "Calcular potencia",
                    explanation: format!(
                        "{}^{{{}}} = {}",
                        fmt_num(a),
                        fmt_num(b),
                        fmt_num(result)
                    ),
                    concept: "Aritmética básica — potenciación de constantes",
                }
            }
            _ => unreachable!("SimplifyConstants::apply called on non-applicable expr"),
        }
    }
}

fn extract_pair(l: Expr, r: Expr) -> (f64, f64) {
    match (l, r) {
        (Expr::Number(a), Expr::Number(b)) => (a, b),
        _ => unreachable!(),
    }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    fn apply(expr: Expr) -> f64 {
        let rule = SimplifyConstants;
        assert!(rule.applies(&expr), "rule should apply");
        match rule.apply(expr).after {
            Expr::Number(n) => n,
            _ => panic!("expected Number"),
        }
    }

    #[test]
    fn test_add()      { assert_eq!(apply(Expr::Add(n(2.0), n(3.0))), 5.0); }
    #[test]
    fn test_sub()      { assert_eq!(apply(Expr::Subtract(n(10.0), n(4.0))), 6.0); }
    #[test]
    fn test_mul()      { assert_eq!(apply(Expr::Multiply(n(3.0), n(4.0))), 12.0); }
    #[test]
    fn test_div()      { assert_eq!(apply(Expr::Divide(n(10.0), n(2.0))), 5.0); }
    #[test]
    fn test_pow()      { assert_eq!(apply(Expr::Power(n(2.0), n(3.0))), 8.0); }
    #[test]
    fn test_no_apply() {
        let rule = SimplifyConstants;
        assert!(!rule.applies(&Expr::Variable("x".into())));
        assert!(!rule.applies(&Expr::Add(n(1.0), Box::new(Expr::Variable("x".into())))));
        // Division by zero must NOT apply
        assert!(!rule.applies(&Expr::Divide(n(5.0), n(0.0))));
    }

    fn n(v: f64) -> Box<Expr> { Box::new(Expr::Number(v)) }
}
