use crate::ast::Expr;
use crate::rules::{Rule, RuleResult};
use super::simplify_constants::fmt_num;

// ─── Rule: Simplificar dobles signos ─────────────────────────────────────────
//
// Tabla de signos que se aplica al AST:
//
//   a - (-b)   →  a + b      (-- → +)
//   a + (-b)   →  a - b      (-+ → -)
//   a - (0-b)  →  a + b      (Subtract where right has negated number)
//   (-1) * x   →  -(x)       (representación canónica)
//   --n (Number negativo en resta) →  suma positiva
//
// Estas reglas son de **prioridad máxima**: deben ejecutarse antes de cualquier
// otra simplificación para que el árbol siempre sea canónico.
//

pub struct SimplifySigns;

impl Rule for SimplifySigns {
    fn name(&self) -> &'static str {
        "Simplificar signos"
    }

    fn applies(&self, expr: &Expr) -> bool {
        match expr {
            // a - (-n)  where n > 0  →  a + n
            Expr::Subtract(_, r) => is_negative_number(r) || is_zero_minus(r),
            // a + (-n)  where n > 0  →  a - n  (only for pure negative numbers on right)
            Expr::Add(_, r) => is_negative_number(r),
            _ => false,
        }
    }

    fn apply(&self, expr: Expr) -> RuleResult {
        match expr {
            // ── a - (-n)  →  a + n ───────────────────────────────────────────
            Expr::Subtract(l, r) if is_negative_number(&r) => {
                let neg_n = extract_negative_number(&r);
                let pos_n = -neg_n;
                RuleResult {
                    after: Expr::Add(l, Box::new(Expr::Number(pos_n))),
                    title: "Simplificar doble negativo",
                    explanation: format!(
                        "Doble signo negativo: {} - ({}) = {} + {}",
                        "…", fmt_num(neg_n), "…", fmt_num(pos_n)
                    ),
                    concept: "Álgebra — regla de signos: − (−a) = +a",
                }
            }

            // ── a - (0 - b)  →  a + b ────────────────────────────────────────
            Expr::Subtract(l, r) if is_zero_minus(&r) => {
                let inner = extract_zero_minus(r);
                RuleResult {
                    after: Expr::Add(l, inner),
                    title: "Simplificar doble negativo",
                    explanation: "Doble signo negativo: a − (0 − b) = a + b".to_string(),
                    concept: "Álgebra — regla de signos: − (−a) = +a",
                }
            }

            // ── a + (-n)  →  a - n ───────────────────────────────────────────
            Expr::Add(l, r) if is_negative_number(&r) => {
                let neg_n = extract_negative_number(&r);
                let pos_n = -neg_n;
                RuleResult {
                    after: Expr::Subtract(l, Box::new(Expr::Number(pos_n))),
                    title: "Simplificar signo",
                    explanation: format!(
                        "Signo negativo explícito: … + ({}) = … − {}",
                        fmt_num(neg_n), fmt_num(pos_n)
                    ),
                    concept: "Álgebra — regla de signos: + (−a) = −a",
                }
            }

            _ => unreachable!("SimplifySigns::apply called on non-applicable expr"),
        }
    }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/// Returns true if the expression is a Number with a negative value.
fn is_negative_number(e: &Expr) -> bool {
    matches!(e, Expr::Number(n) if *n < -1e-12)
}

/// Extracts the numeric value from a Number node (negative).
fn extract_negative_number(e: &Expr) -> f64 {
    match e {
        Expr::Number(n) => *n,
        _ => unreachable!(),
    }
}

/// Returns true if the expression is `0 - x` (which the parser may produce
/// for unary minus applied to a non-numeric expression like `-x`).
fn is_zero_minus(e: &Expr) -> bool {
    matches!(e, Expr::Subtract(l, _) if matches!(l.as_ref(), Expr::Number(n) if n.abs() < 1e-12))
}

/// Extracts the right-hand side of a `0 - x` expression.
fn extract_zero_minus(e: Box<Expr>) -> Box<Expr> {
    match *e {
        Expr::Subtract(_, r) => r,
        _ => unreachable!(),
    }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    fn n(v: f64) -> Box<Expr> { Box::new(Expr::Number(v)) }
    fn v(s: &str) -> Box<Expr> { Box::new(Expr::Variable(s.to_string())) }

    fn apply_rule(expr: Expr) -> Expr {
        let rule = SimplifySigns;
        assert!(rule.applies(&expr), "rule should apply");
        rule.apply(expr).after
    }

    #[test]
    fn test_sub_negative_number() {
        // x - (-4) → x + 4
        let expr = Expr::Subtract(v("x"), n(-4.0));
        let result = apply_rule(expr);
        assert!(matches!(result, Expr::Add(_, r) if matches!(*r, Expr::Number(n) if (n - 4.0).abs() < 1e-9)));
    }

    #[test]
    fn test_add_negative_number() {
        // x + (-5) → x - 5
        let expr = Expr::Add(v("x"), n(-5.0));
        let result = apply_rule(expr);
        assert!(matches!(result, Expr::Subtract(_, r) if matches!(*r, Expr::Number(n) if (n - 5.0).abs() < 1e-9)));
    }

    #[test]
    fn test_sub_zero_minus() {
        // x - (0 - y) → x + y
        let inner = Box::new(Expr::Subtract(n(0.0), v("y")));
        let expr = Expr::Subtract(v("x"), inner);
        let result = apply_rule(expr);
        assert!(matches!(result, Expr::Add(_, r) if matches!(*r, Expr::Variable(_))));
    }

    #[test]
    fn test_no_apply_positive() {
        // x - 4 should NOT apply
        let rule = SimplifySigns;
        let expr = Expr::Subtract(v("x"), n(4.0));
        assert!(!rule.applies(&expr));
    }
}
