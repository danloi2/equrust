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

/// Distributes a negative sign: `A - (B + C) -> A - B - C` and `A - (B - C) -> A - B + C`
pub struct DistributeMinus;

impl Rule for DistributeMinus {
    fn name(&self) -> &'static str {
        "Distribuir signo negativo"
    }

    fn applies(&self, expr: &Expr) -> bool {
        if let Expr::Subtract(_, r) = expr {
            matches!(r.as_ref(), Expr::Add(_, _) | Expr::Subtract(_, _))
        } else {
            false
        }
    }

    fn apply(&self, expr: Expr) -> RuleResult {
        match expr {
            Expr::Subtract(l, r) => match *r {
                Expr::Add(rl, rr) => RuleResult {
                    after: Expr::Subtract(Box::new(Expr::Subtract(l, rl)), rr),
                    title: "Distribuir signo negativo",
                    explanation: "Se cambia el signo de cada término dentro del paréntesis: −(a + b) = −a − b".to_string(),
                    concept: "Álgebra — distribución del signo negativo",
                },
                Expr::Subtract(rl, rr) => RuleResult {
                    after: Expr::Add(Box::new(Expr::Subtract(l, rl)), rr),
                    title: "Distribuir signo negativo",
                    explanation: "Se cambia el signo de cada término dentro del paréntesis: −(a − b) = −a + b".to_string(),
                    concept: "Álgebra — distribución del signo negativo",
                },
                _ => unreachable!(),
            },
            _ => unreachable!(),
        }
    }
}

/// Left-associates Add/Subtract so that CombineLikeTerms can work on a flat list.
/// Add(A, Add(B, C)) -> Add(Add(A, B), C)
/// Add(A, Subtract(B, C)) -> Subtract(Add(A, B), C)
pub struct FlattenAddSub;

impl Rule for FlattenAddSub {
    fn name(&self) -> &'static str {
        "Asociar términos"
    }

    fn applies(&self, expr: &Expr) -> bool {
        if let Expr::Add(_, r) = expr {
            matches!(r.as_ref(), Expr::Add(_, _) | Expr::Subtract(_, _))
        } else {
            false
        }
    }

    fn apply(&self, expr: Expr) -> RuleResult {
        match expr {
            Expr::Add(l, r) => match *r {
                Expr::Add(rl, rr) => RuleResult {
                    after: Expr::Add(Box::new(Expr::Add(l, rl)), rr),
                    title: "Asociar términos",
                    explanation: "Se agrupan las sumas: a + (b + c) = a + b + c".to_string(),
                    concept: "Álgebra — propiedad asociativa de la suma",
                },
                Expr::Subtract(rl, rr) => RuleResult {
                    after: Expr::Subtract(Box::new(Expr::Add(l, rl)), rr),
                    title: "Asociar términos",
                    explanation: "Se quitan los paréntesis en la suma: a + (b − c) = a + b − c".to_string(),
                    concept: "Álgebra — propiedad asociativa de la suma",
                },
                _ => unreachable!(),
            },
            _ => unreachable!(),
        }
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
