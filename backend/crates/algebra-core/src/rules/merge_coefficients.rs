use crate::ast::Expr;
use crate::rules::{Rule, RuleResult};
use crate::rules::simplify_constants::fmt_num;

// ─── Rule: Fusionar coeficientes numéricos adyacentes ─────────────────────────
//
// After clearing denominators, terms like `25 * (3 * x)` appear.
// This rule collapses `Number(a) * (Number(b) * expr)` into `Number(a*b) * expr`.
//
// Handles:
//   Number(a) * (Number(b) * expr)  ->  Number(a*b) * expr
//   Number(a) * (expr * Number(b))  ->  Number(a*b) * expr
//   (Number(a) * expr) * Number(b)  ->  Number(a*b) * expr
//   (expr * Number(a)) * Number(b)  ->  Number(a*b) * expr

pub struct MergeCoefficients;

impl Rule for MergeCoefficients {
    fn name(&self) -> &'static str {
        "Fusionar coeficientes"
    }

    fn applies(&self, expr: &Expr) -> bool {
        detect(expr).is_some()
    }

    fn apply(&self, expr: Expr) -> RuleResult {
        let (a, b, inner) = detect(&expr).expect("MergeCoefficients::apply called on non-applicable expr");
        let merged = a * b;
        let after = if merged == 1.0 {
            inner
        } else {
            Expr::Multiply(Box::new(Expr::Number(merged)), Box::new(inner))
        };
        RuleResult {
            after,
            title: "Fusionar coeficientes",
            explanation: format!(
                "Se agrupan los factores numéricos: {} × {} = {}",
                fmt_num(a), fmt_num(b), fmt_num(merged)
            ),
            concept: "Álgebra — asociatividad de la multiplicación",
        }
    }
}

/// Returns (factor_a, factor_b, inner_expr) if the pattern matches.
/// Only matches when two numeric factors are truly adjacent (avoids infinite loops).
fn detect(expr: &Expr) -> Option<(f64, f64, Expr)> {
    match expr {
        Expr::Multiply(l, r) => {
            // ── Case 1: Number(a) * (Number(b) * inner) ───────────────────────
            if let Expr::Number(a) = l.as_ref() {
                if let Expr::Multiply(rl, rr) = r.as_ref() {
                    if let Expr::Number(b) = rl.as_ref() {
                        return Some((*a, *b, *rr.clone()));
                    }
                    if let Expr::Number(b) = rr.as_ref() {
                        return Some((*a, *b, *rl.clone()));
                    }
                }
            }
            // ── Case 2: (Number(a) * inner) * Number(b) ───────────────────────
            if let Expr::Number(b) = r.as_ref() {
                if let Expr::Multiply(ll, lr) = l.as_ref() {
                    if let Expr::Number(a) = ll.as_ref() {
                        return Some((*a, *b, *lr.clone()));
                    }
                    if let Expr::Number(a) = lr.as_ref() {
                        return Some((*a, *b, *ll.clone()));
                    }
                }
                // ── Case 3: Variable * Number(b)  ->  Number(b) * Variable
                // Safe: result is Number*Variable which won't re-trigger this rule
                if let Expr::Variable(_) = l.as_ref() {
                    return Some((1.0, *b, *l.clone()));
                }
                // ── Case 4: (Add/Subtract) * Number(b)  ->  Number(b) * (Add/Subtract)
                // Safe: result is Number*(Add/Subtract) which won't re-trigger this rule
                if matches!(l.as_ref(), Expr::Add(_, _) | Expr::Subtract(_, _)) {
                    return Some((1.0, *b, *l.clone()));
                }
            }
            None
        }
        _ => None,
    }
}


#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_merge_a_times_bx() {
        // 25 * (3 * x)  ->  75 * x
        let inner = Expr::Multiply(
            Box::new(Expr::Number(3.0)),
            Box::new(Expr::Variable("x".into())),
        );
        let expr = Expr::Multiply(Box::new(Expr::Number(25.0)), Box::new(inner));
        let rule = MergeCoefficients;
        assert!(rule.applies(&expr));
        let result = rule.apply(expr);
        assert_eq!(
            result.after,
            Expr::Multiply(
                Box::new(Expr::Number(75.0)),
                Box::new(Expr::Variable("x".into()))
            )
        );
    }
}
