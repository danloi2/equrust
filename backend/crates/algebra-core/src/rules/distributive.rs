use crate::ast::Expr;
use crate::formatter::FormatLatex;
use crate::rules::{Rule, RuleResult};

// ─── Rule: Distributiva ───────────────────────────────────────────────────────
//
// Applies: a(b + c) = ab + ac   and   a(b - c) = ab - ac
// Also handles the case where the factor is on the right: (b+c)·a
//
// Examples
// ────────
//   2(x + 3)   →  2x + 6
//   (x - 1)·3  →  3x - 3
//   -1·(x + 2) →  -x - 2
//
pub struct Distributive;

impl Rule for Distributive {
    fn name(&self) -> &'static str {
        "Propiedad distributiva"
    }

    fn applies(&self, expr: &Expr) -> bool {
        match expr {
            Expr::Multiply(l, r) => {
                // factor · (sum/diff) or (sum/diff) · factor
                let rhs_is_sum = matches!(r.as_ref(), Expr::Add(_, _) | Expr::Subtract(_, _));
                let lhs_is_sum = matches!(l.as_ref(), Expr::Add(_, _) | Expr::Subtract(_, _));
                rhs_is_sum || lhs_is_sum
            }
            _ => false,
        }
    }

    fn apply(&self, expr: Expr) -> RuleResult {
        match expr {
            Expr::Multiply(l, r) => {
                // Normalise so that factor is on the left, sum on the right
                let (factor, sum) = if matches!(r.as_ref(), Expr::Add(_, _) | Expr::Subtract(_, _)) {
                    (*l, *r)
                } else {
                    (*r, *l)
                };

                let before_latex = Expr::Multiply(Box::new(factor.clone()), Box::new(sum.clone())).to_latex();
                let _before_latex = before_latex; // retained for potential future step debugging

                let distributed = distribute(factor.clone(), sum);

                RuleResult {
                    after: distributed,
                    title: "Propiedad distributiva",
                    explanation: format!(
                        "Se multiplica {} por cada término del paréntesis",
                        factor.to_latex()
                    ),
                    concept: "Álgebra — a(b+c) = ab + ac",
                }
            }
            _ => unreachable!("Distributive::apply called on non-applicable expr"),
        }
    }
}

/// Distribute `factor` over `sum`, where `sum` is Add or Subtract.
fn distribute(factor: Expr, sum: Expr) -> Expr {
    match sum {
        Expr::Add(a, b) => Expr::Add(
            Box::new(Expr::Multiply(Box::new(factor.clone()), a)),
            Box::new(Expr::Multiply(Box::new(factor), b)),
        ),
        Expr::Subtract(a, b) => Expr::Subtract(
            Box::new(Expr::Multiply(Box::new(factor.clone()), a)),
            Box::new(Expr::Multiply(Box::new(factor), b)),
        ),
        other => Expr::Multiply(Box::new(factor), Box::new(other)),
    }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use crate::parser::parse;

    fn latex(s: &str) -> String {
        let expr = parse(s).unwrap();
        let solver = crate::solver::default_solver();
        let mut steps = vec![];
        solver.simplify_expr_pub(expr, &mut steps).to_latex()
    }

    #[test]
    fn test_distributive_basic() {
        // 2*(x+3) → 2x + 6
        let rule = Distributive;
        let expr = parse("2*(x+3)").unwrap();
        // Only test that applies() works
        let applies = rule.applies(&expr) || check_deep(&rule, &expr);
        assert!(applies, "Distributive should apply somewhere in 2*(x+3)");
    }

    #[test]
    fn test_distributive_with_solver() {
        // After full simplification: 2(x+3) should become 2x + 6
        let result = latex("2*(x+3)");
        // 2*x + 2*3 = 2x + 6
        assert!(result.contains("6"), "Expected 6 in result, got: {}", result);
    }

    fn check_deep(rule: &Distributive, expr: &Expr) -> bool {
        match expr {
            Expr::Add(l, r) | Expr::Subtract(l, r) | Expr::Multiply(l, r)
            | Expr::Divide(l, r) | Expr::Power(l, r) => {
                rule.applies(expr) || check_deep(rule, l) || check_deep(rule, r)
            }
            _ => false,
        }
    }
}
