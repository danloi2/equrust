use crate::ast::Expr;
use crate::rules::{Rule, RuleResult};
use crate::rules::simplify_constants::fmt_num;

// ─── Rule: Combinar términos semejantes ───────────────────────────────────────
//
// Handles two patterns:
//
//  Simple:  ax ± bx  →  (a±b)x
//           a  ± b   →  (a±b)        [pure constants, handled by SimplifyConstants but kept here for completeness]
//
//  Nested:  (ax ± b) ± cx  →  (a±c)x ± b
//           where the outer expression has a simple var-term on one side
//           and the inner expression is (var-term ± const).
//
// Examples
// ────────
//   3x + 2x           →  5x
//   5x - x            →  4x
//   (3x - 3) - 2x     →  x - 3      (from  3(x-1) expansion)
//   (2x + 4) + 3x     →  5x + 4
//
pub struct CombineLikeTerms;

impl Rule for CombineLikeTerms {
    fn name(&self) -> &'static str {
        "Reducir términos semejantes"
    }

    fn applies(&self, expr: &Expr) -> bool {
        match expr {
            Expr::Add(l, r) | Expr::Subtract(l, r) => {
                like_terms(l, r) || can_collect_nested(expr)
            }
            _ => false,
        }
    }

    fn apply(&self, expr: Expr) -> RuleResult {
        // Try simple case first
        match &expr {
            Expr::Add(l, r) | Expr::Subtract(l, r) if like_terms(l, r) => {
                return apply_simple(expr);
            }
            _ => {}
        }
        // Otherwise nested case
        apply_nested(expr)
    }
}

// ─── Simple case ─────────────────────────────────────────────────────────────

fn apply_simple(expr: Expr) -> RuleResult {
    match expr {
        Expr::Add(l, r) => {
            let (coeff_l, var) = decompose(*l);
            let (coeff_r, _) = decompose(*r);
            let combined = coeff_l + coeff_r;
            let after = make_term(combined, &var);
            let var_str = var.as_str();
            RuleResult {
                after,
                title: "Reducir términos semejantes",
                explanation: format!(
                    "{}{}  +  {}{}  =  {}{}",
                    fmt_num(coeff_l), var_str,
                    fmt_num(coeff_r), var_str,
                    fmt_num(combined), var_str,
                ),
                concept: "Álgebra — suma de términos con la misma variable",
            }
        }
        Expr::Subtract(l, r) => {
            let (coeff_l, var) = decompose(*l);
            let (coeff_r, _) = decompose(*r);
            let combined = coeff_l - coeff_r;
            let after = make_term(combined, &var);
            let var_str = var.as_str();
            RuleResult {
                after,
                title: "Reducir términos semejantes",
                explanation: format!(
                    "{}{}  -  {}{}  =  {}{}",
                    fmt_num(coeff_l), var_str,
                    fmt_num(coeff_r), var_str,
                    fmt_num(combined), var_str,
                ),
                concept: "Álgebra — resta de términos con la misma variable",
            }
        }
        _ => unreachable!(),
    }
}

// ─── Nested case ─────────────────────────────────────────────────────────────
//
//  Handles: outer_op(inner_op(ax, b), cx)
//  where inner is  Add(ax, b) or Subtract(ax, b)
//  and outer_r is a simple var term with the same variable.
//
//  Result: (a outer_op c)x  inner_op  b

fn apply_nested(expr: Expr) -> RuleResult {
    match expr {
        Expr::Add(outer_l, outer_r) => {
            let (coeff_r, var) = decompose(*outer_r);
            let (inner_op, coeff_l, constant) = decompose_inner(*outer_l);
            let combined_coeff = coeff_l + coeff_r;
            let after = rebuild_with_const(combined_coeff, &var, inner_op, constant);
            let var_str = var.as_str();
            RuleResult {
                after,
                title: "Reducir términos semejantes",
                explanation: format!(
                    "{}{}  +  {}{}  =  {}{}",
                    fmt_num(coeff_l), var_str,
                    fmt_num(coeff_r), var_str,
                    fmt_num(combined_coeff), var_str,
                ),
                concept: "Álgebra — suma de términos con la misma variable",
            }
        }
        Expr::Subtract(outer_l, outer_r) => {
            let (coeff_r, var) = decompose(*outer_r);
            let (inner_op, coeff_l, constant) = decompose_inner(*outer_l);
            let combined_coeff = coeff_l - coeff_r;
            let after = rebuild_with_const(combined_coeff, &var, inner_op, constant);
            let var_str = var.as_str();
            RuleResult {
                after,
                title: "Reducir términos semejantes",
                explanation: format!(
                    "{}{}  -  {}{}  =  {}{}",
                    fmt_num(coeff_l), var_str,
                    fmt_num(coeff_r), var_str,
                    fmt_num(combined_coeff), var_str,
                ),
                concept: "Álgebra — resta de términos con la misma variable",
            }
        }
        _ => unreachable!(),
    }
}

/// Build the result expression for the nested case.
/// combined_coeff * var  inner_op  constant
fn rebuild_with_const(coeff: f64, var: &str, inner_op: InnerOp, constant: f64) -> Expr {
    let var_term = make_term(coeff, var);
    if constant == 0.0 {
        return var_term;
    }
    match inner_op {
        InnerOp::Add => Expr::Add(Box::new(var_term), Box::new(Expr::Number(constant))),
        InnerOp::Sub => Expr::Subtract(Box::new(var_term), Box::new(Expr::Number(constant))),
    }
}

#[derive(Debug, Clone, Copy)]
enum InnerOp { Add, Sub }

/// Decompose the inner expression `(ax ± b)` into (op, coeff_of_var, constant_value).
fn decompose_inner(expr: Expr) -> (InnerOp, f64, f64) {
    match expr {
        Expr::Add(l, r) => {
            let (c, _) = decompose(*l);
            let (k, _) = decompose(*r);
            (InnerOp::Add, c, k)
        }
        Expr::Subtract(l, r) => {
            let (c, _) = decompose(*l);
            let (k, _) = decompose(*r);
            (InnerOp::Sub, c, k)
        }
        _ => unreachable!("decompose_inner called on non-Add/Sub"),
    }
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

/// Decompose an expression into (coefficient, variable_name).
pub(crate) fn decompose(expr: Expr) -> (f64, String) {
    match expr {
        Expr::Number(n)    => (n, String::new()),
        Expr::Variable(v)  => (1.0, v),
        Expr::Multiply(l, r) => match (*l, *r) {
            (Expr::Number(n), Expr::Variable(v)) => (n, v),
            (Expr::Variable(v), Expr::Number(n)) => (n, v),
            _ => (f64::NAN, String::new()),
        },
        _ => (f64::NAN, String::new()),
    }
}

/// Check if two expressions are "like terms" (same variable, or both constants).
pub(crate) fn like_terms(l: &Expr, r: &Expr) -> bool {
    let var_of = |e: &Expr| -> Option<String> {
        match e {
            Expr::Number(_)    => Some(String::new()),
            Expr::Variable(v)  => Some(v.clone()),
            Expr::Multiply(a, b) => match (a.as_ref(), b.as_ref()) {
                (Expr::Number(_), Expr::Variable(v)) => Some(v.clone()),
                (Expr::Variable(v), Expr::Number(_)) => Some(v.clone()),
                _ => None,
            },
            _ => None,
        }
    };
    match (var_of(l), var_of(r)) {
        (Some(vl), Some(vr)) => vl == vr,
        _ => false,
    }
}

/// Check if this is a nested expression of the form:
///   outer_op(inner_op(ax, b), cx)
/// where ax and cx share the same variable.
fn can_collect_nested(expr: &Expr) -> bool {
    match expr {
        Expr::Add(outer_l, outer_r) | Expr::Subtract(outer_l, outer_r) => {
            // outer_r must be a simple var term
            if !is_simple_var_term(outer_r) { return false; }
            let var_r = var_name_of(outer_r).unwrap_or_default();
            if var_r.is_empty() { return false; }

            // outer_l must be inner_op(var_term, const) with the same variable
            match outer_l.as_ref() {
                Expr::Add(l, r) | Expr::Subtract(l, r) => {
                    is_simple_var_term(l) &&
                    var_name_of(l).as_deref() == Some(var_r.as_str()) &&
                    is_pure_const(r)
                }
                _ => false,
            }
        }
        _ => false,
    }
}

fn is_simple_var_term(e: &Expr) -> bool {
    matches!(e, Expr::Variable(_))
        || matches!(e, Expr::Multiply(l, r)
            if matches!(l.as_ref(), Expr::Number(_)) && matches!(r.as_ref(), Expr::Variable(_))
            || matches!(l.as_ref(), Expr::Variable(_)) && matches!(r.as_ref(), Expr::Number(_)))
}

fn var_name_of(e: &Expr) -> Option<String> {
    match e {
        Expr::Variable(v) => Some(v.clone()),
        Expr::Multiply(l, r) => match (l.as_ref(), r.as_ref()) {
            (Expr::Number(_), Expr::Variable(v)) => Some(v.clone()),
            (Expr::Variable(v), Expr::Number(_)) => Some(v.clone()),
            _ => None,
        },
        _ => None,
    }
}

fn is_pure_const(e: &Expr) -> bool {
    matches!(e, Expr::Number(_))
}

/// Build an `Expr` for `coeff * var`, or just `Number(coeff)` if var is empty.
pub(crate) fn make_term(coeff: f64, var: &str) -> Expr {
    if var.is_empty() {
        Expr::Number(coeff)
    } else if coeff == 1.0 {
        Expr::Variable(var.to_string())
    } else if coeff == -1.0 {
        Expr::Multiply(
            Box::new(Expr::Number(-1.0)),
            Box::new(Expr::Variable(var.to_string())),
        )
    } else {
        Expr::Multiply(
            Box::new(Expr::Number(coeff)),
            Box::new(Expr::Variable(var.to_string())),
        )
    }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    fn n(v: f64) -> Box<Expr> { Box::new(Expr::Number(v)) }
    fn var(s: &str) -> Box<Expr> { Box::new(Expr::Variable(s.to_string())) }
    fn mul(c: f64, v: &str) -> Expr { Expr::Multiply(n(c), var(v)) }

    #[test]
    fn test_3x_plus_2x() {
        let rule = CombineLikeTerms;
        let expr = Expr::Add(Box::new(mul(3.0, "x")), Box::new(mul(2.0, "x")));
        assert!(rule.applies(&expr));
        let result = rule.apply(expr);
        match result.after {
            Expr::Multiply(c, v) => {
                assert_eq!(*c, Expr::Number(5.0));
                assert_eq!(*v, Expr::Variable("x".to_string()));
            }
            _ => panic!("Expected Multiply(5, x)"),
        }
    }

    #[test]
    fn test_nested_3x_minus3_minus_2x() {
        // (3x - 3) - 2x → x - 3
        let rule = CombineLikeTerms;
        let inner = Expr::Subtract(Box::new(mul(3.0, "x")), n(3.0));
        let expr = Expr::Subtract(Box::new(inner), Box::new(mul(2.0, "x")));
        assert!(rule.applies(&expr), "Should apply to (3x-3)-2x");
        let result = rule.apply(expr);
        // Should produce x - 3
        match &result.after {
            Expr::Subtract(l, r) => {
                assert_eq!(l.as_ref(), &Expr::Variable("x".to_string()), "Left should be x");
                assert_eq!(r.as_ref(), &Expr::Number(3.0), "Right should be 3");
            }
            _ => panic!("Expected Subtract(x, 3), got {:?}", result.after),
        }
    }

    #[test]
    fn test_x_plus_x() {
        let rule = CombineLikeTerms;
        let expr = Expr::Add(var("x"), var("x"));
        assert!(rule.applies(&expr));
        let result = rule.apply(expr);
        match result.after {
            Expr::Multiply(c, v) => {
                assert_eq!(*c, Expr::Number(2.0));
                assert_eq!(*v, Expr::Variable("x".to_string()));
            }
            _ => panic!("Expected 2x"),
        }
    }

    #[test]
    fn test_no_apply_diff_vars() {
        let rule = CombineLikeTerms;
        let expr = Expr::Add(Box::new(mul(3.0, "x")), Box::new(mul(2.0, "y")));
        assert!(!rule.applies(&expr));
    }
}
