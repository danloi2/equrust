use crate::ast::{Expr, Equation};
use crate::formatter::FormatLatex;
use crate::rules::simplify_constants::fmt_num;

// ─── Equation-level rules ─────────────────────────────────────────────────────
//
// Implemented rules (applied in priority order)
// ──────────────────────────────────────────────
//   1. MoveVariableFromRhs  ax + b = cx + d  ⟹  ax + b - cx = d
//   2. MoveConstantToRhs    ax + b = c       ⟹  ax = c - b
//   3. MoveVariableToLhs    c = ax + b       ⟹  ax + b = c   (flip)
//   4. DivideBothSides      ax = c           ⟹  x = c/a
//

// ─── Step record (equation-level) ────────────────────────────────────────────

#[derive(Debug, Clone)]
pub struct EqStep {
    pub before: Equation,
    pub after: Equation,
    pub title: &'static str,
    pub explanation: String,
    pub concept: &'static str,
}

// ─── Try all equation rules ───────────────────────────────────────────────────

/// Apply ONE equation-level rule and return the resulting step, or None.
pub fn try_equation_rule(eq: &Equation) -> Option<EqStep> {
    try_move_variable_from_rhs(eq)
        .or_else(|| try_move_constant_to_rhs(eq))
        .or_else(|| try_move_variable_to_lhs(eq))
        .or_else(|| try_divide_both_sides(eq))
        .or_else(|| try_multiply_both_sides(eq))
        .or_else(|| try_square_both_sides(eq))
}

// ─── Rule 1: Mover variable del RHS al LHS ───────────────────────────────────
//
// When both sides have variable terms, subtract the RHS variable part from both.
//
// Pattern:  Lhs = ax + b   (both Lhs and RHS contain variables)
//           →   Lhs - ax = b
//
// Pattern:  Lhs = ax - b
//           →   Lhs - ax = -b
//
// Pattern:  Lhs = ax
//           →   Lhs - ax = 0
//
fn try_move_variable_from_rhs(eq: &Equation) -> Option<EqStep> {
    // Both sides must contain variables
    if !has_var_term(&eq.left) || !has_var_term(&eq.right) {
        return None;
    }

    // Extract the variable term and remaining constant from the RHS
    let (var_term, const_rhs) = split_var_from_expr(&eq.right)?;

    let before = eq.clone();

    // New LHS: current LHS - var_term
    let new_lhs = Expr::Subtract(
        Box::new(eq.left.clone()),
        Box::new(var_term.clone()),
    );

    // New RHS: the constant part (0 if none)
    let new_rhs = const_rhs.unwrap_or(Expr::Number(0.0));

    let after = Equation { left: new_lhs, right: new_rhs };

    // Build explanation
    let var_latex = var_term.to_latex();
    Some(EqStep {
        before,
        after,
        title: "Mover variable al primer miembro",
        explanation: format!(
            "Se resta {} en ambos lados para reunir las incógnitas",
            var_latex,
        ),
        concept: "Álgebra — despeje: mover términos con variable",
    })
}

/// Split `expr` into (var_term, Option<const_expr>).
/// Returns None if the expression cannot be split cleanly.
///
/// Handles:
///   ax          →  (ax, None)
///   ax + b      →  (ax, Some(b))
///   ax - b      →  (ax, Some(Multiply(-1, b)))
///   b + ax      →  (ax, Some(b))
fn split_var_from_expr(expr: &Expr) -> Option<(Expr, Option<Expr>)> {
    // Pure variable term (no constant part)
    if extract_coeff_var(expr).is_some() {
        return Some((expr.clone(), None));
    }
    match expr {
        Expr::Add(l, r) => {
            // ax + b
            if extract_coeff_var(l).is_some() && !has_var_term(r) {
                return Some((*l.clone(), Some(*r.clone())));
            }
            // b + ax
            if extract_coeff_var(r).is_some() && !has_var_term(l) {
                return Some((*r.clone(), Some(*l.clone())));
            }
            None
        }
        Expr::Subtract(l, r) => {
            // ax - b
            if extract_coeff_var(l).is_some() && !has_var_term(r) {
                // Moving ax to LHS; the remaining RHS constant is -(b) → Number(-b)
                let neg_const = match r.as_ref() {
                    Expr::Number(n) => Expr::Number(-n),
                    other => Expr::Multiply(Box::new(Expr::Number(-1.0)), Box::new(other.clone())),
                };
                return Some((*l.clone(), Some(neg_const)));
            }
            None
        }
        _ => None,
    }
}

// ─── Rule 2: Mover constante al lado derecho ──────────────────────────────────
//
// Pattern:  ax + b = c   →   ax = c - b
//           ax - b = c   →   ax = c + b
//
fn try_move_constant_to_rhs(eq: &Equation) -> Option<EqStep> {
    // LHS must be: term ± constant (where term contains a variable)
    let (term, constant, is_add) = extract_var_plus_const(&eq.left)?;

    // RHS must NOT have a variable term (handled by rule 1 first)
    if has_var_term(&eq.right) {
        return None;
    }

    let before = eq.clone();

    // New RHS: rhs ∓ constant
    let new_rhs = if is_add {
        // had ax + b = rhs  →  ax = rhs - b
        Expr::Subtract(
            Box::new(eq.right.clone()),
            Box::new(Expr::Number(constant)),
        )
    } else {
        // had ax - b = rhs  →  ax = rhs + b
        Expr::Add(
            Box::new(eq.right.clone()),
            Box::new(Expr::Number(constant)),
        )
    };

    let after = Equation { left: term, right: new_rhs };
    let op_verb = if is_add { "Restamos" } else { "Sumamos" };
    let sign_str = fmt_num(constant.abs());

    Some(EqStep {
        before,
        after,
        title: "Mover constante al segundo miembro",
        explanation: format!(
            "{} {} en ambos lados de la igualdad",
            op_verb, sign_str
        ),
        concept: "Álgebra — despeje: mover términos constantes",
    })
}

// ─── Rule 3: Mover incógnita al lado izquierdo ───────────────────────────────
//
// Pattern:  c = ax + b  →  flip so variable is on left
//
fn try_move_variable_to_lhs(eq: &Equation) -> Option<EqStep> {
    // Only flip when LHS has NO variable and RHS has one
    if has_var_term(&eq.left) || !has_var_term(&eq.right) {
        return None;
    }

    let before = eq.clone();
    let after = Equation {
        left: eq.right.clone(),
        right: eq.left.clone(),
    };
    Some(EqStep {
        before,
        after,
        title: "Reorganizar ecuación",
        explanation: "Se intercambian los miembros para que la incógnita quede a la izquierda".to_string(),
        concept: "Álgebra — convenio: incógnita en el primer miembro",
    })
}

// ─── Rule 4: Dividir ambos lados ──────────────────────────────────────────────
//
// Pattern:  ax = c  →  x = c/a
//
fn try_divide_both_sides(eq: &Equation) -> Option<EqStep> {
    // LHS must be: coefficient * variable (possibly coeff=1 which is just Variable)
    let (coeff, var_name) = extract_coeff_var(&eq.left)?;

    // Coefficient must not be 1 (otherwise already solved)
    if coeff == 1.0 {
        return None;
    }

    // RHS must be a pure constant expression (no variables)
    if has_var_term(&eq.right) {
        return None;
    }

    let before = eq.clone();

    let new_lhs = Expr::Variable(var_name.clone());
    let new_rhs = Expr::Divide(
        Box::new(eq.right.clone()),
        Box::new(Expr::Number(coeff)),
    );

    let after = Equation { left: new_lhs, right: new_rhs };

    Some(EqStep {
        before,
        after,
        title: "Dividir ambos lados",
        explanation: format!(
            "Se divide cada miembro entre {} para despejar {}",
            fmt_num(coeff), var_name
        ),
        concept: "Álgebra — despeje: división de ambos lados",
    })
}

// ─── Rule 5: Multiplicar ambos lados ──────────────────────────────────────────────
//
// Pattern:  x / c = k  →  x = k * c
//
fn try_multiply_both_sides(eq: &Equation) -> Option<EqStep> {
    // LHS must be: variable / number
    let (var_name, denom) = match &eq.left {
        Expr::Divide(l, r) => {
            if let (Expr::Variable(v), Expr::Number(n)) = (l.as_ref(), r.as_ref()) {
                (v.clone(), *n)
            } else {
                return None;
            }
        },
        _ => return None,
    };

    // RHS must be a pure constant expression (no variables)
    if has_var_term(&eq.right) {
        return None;
    }

    let before = eq.clone();

    let new_lhs = Expr::Variable(var_name.clone());
    let new_rhs = Expr::Multiply(
        Box::new(eq.right.clone()),
        Box::new(Expr::Number(denom)),
    );

    let after = Equation { left: new_lhs, right: new_rhs };

    Some(EqStep {
        before,
        after,
        title: "Multiplicar ambos lados",
        explanation: format!(
            "Se multiplica cada miembro por {} para despejar {}",
            fmt_num(denom), var_name
        ),
        concept: "Álgebra — despeje: multiplicación de ambos lados",
    })
}

// ─── Rule 6: Elevar al cuadrado ambos lados ───────────────────────────────────
//
// Pattern:  \sqrt{inner} = rhs  →  inner = rhs^2
//
fn try_square_both_sides(eq: &Equation) -> Option<EqStep> {
    // LHS must be Sqrt
    let inner = match &eq.left {
        Expr::Sqrt(inner) => inner.clone(),
        _ => return None,
    };

    let before = eq.clone();
    
    // RHS becomes RHS ^ 2
    let new_rhs = Expr::Power(
        Box::new(eq.right.clone()),
        Box::new(Expr::Number(2.0))
    );

    let after = Equation { left: *inner, right: new_rhs };

    Some(EqStep {
        before,
        after,
        title: "Elevar al cuadrado",
        explanation: "Elevamos al cuadrado ambos miembros de la ecuación para eliminar la raíz".to_string(),
        concept: "Álgebra — despeje: potenciar ambos lados",
    })
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/// Returns (variable_term, constant_value, is_add) if expr is `var_term ± Number`.
fn extract_var_plus_const(expr: &Expr) -> Option<(Expr, f64, bool)> {
    match expr {
        Expr::Add(l, r) => {
            if let Expr::Number(n) = r.as_ref() {
                if has_var_term(l) {
                    return Some((*l.clone(), *n, true));
                }
            }
            if let Expr::Number(n) = l.as_ref() {
                if has_var_term(r) {
                    return Some((*r.clone(), *n, true));
                }
            }
            None
        }
        Expr::Subtract(l, r) => {
            if let Expr::Number(n) = r.as_ref() {
                if has_var_term(l) {
                    return Some((*l.clone(), *n, false));
                }
            }
            None
        }
        _ => None,
    }
}

/// Returns (coefficient, variable_name) if expr is `n*x` or `x` (coeff=1).
pub(crate) fn extract_coeff_var(expr: &Expr) -> Option<(f64, String)> {
    match expr {
        Expr::Variable(v) => Some((1.0, v.clone())),
        Expr::Multiply(l, r) => match (l.as_ref(), r.as_ref()) {
            (Expr::Number(n), Expr::Variable(v)) => Some((*n, v.clone())),
            (Expr::Variable(v), Expr::Number(n)) => Some((*n, v.clone())),
            _ => None,
        },
        _ => None,
    }
}

/// Returns true if the expression contains a `Variable` node anywhere.
pub(crate) fn has_var_term(expr: &Expr) -> bool {
    match expr {
        Expr::Variable(_) => true,
        Expr::Add(l, r)
        | Expr::Subtract(l, r)
        | Expr::Multiply(l, r)
        | Expr::Divide(l, r) | Expr::Power(l, r) => has_var_term(l) || has_var_term(r),
        Expr::Sqrt(inner) => has_var_term(inner),
        Expr::Number(_) => false,
    }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use crate::parser::parse_equation;
    use crate::solver::default_solver;

    fn eq(s: &str) -> Equation {
        parse_equation(s).expect(&format!("failed to parse: {}", s))
    }

    #[test]
    fn test_move_constant() {
        // 2x + 5 = 9 → 2x = 9 - 5
        let step = try_move_constant_to_rhs(&eq("2x+5=9")).expect("should match");
        assert_eq!(step.title, "Mover constante al segundo miembro");
        assert!(matches!(step.after.left, Expr::Multiply(_, _) | Expr::Variable(_)));
    }

    #[test]
    fn test_move_variable_from_rhs() {
        // 3x - 3 = 2x + 4  →  3x - 3 - 2x = 4
        let step = try_move_variable_from_rhs(&eq("3x-3=2x+4")).expect("should match");
        assert_eq!(step.title, "Mover variable al primer miembro");
        // RHS should be just Number(4)
        assert_eq!(step.after.right, Expr::Number(4.0));
    }

    #[test]
    fn test_divide_both_sides() {
        let mut eq = parse_equation("2x=8").unwrap();
        let step = try_divide_both_sides(&eq).unwrap();
        assert_eq!(step.title, "Dividir ambos lados");
        // Output should be x = 8 / 2
        eq = step.after;
        let solved = default_solver().simplify_standalone(eq.right);
        assert_eq!(solved.result_latex, "4");
    }

    #[test]
    fn test_multiply_both_sides() {
        let mut eq = parse_equation("x/2=4").unwrap();
        let step = try_multiply_both_sides(&eq).unwrap();
        assert_eq!(step.title, "Multiplicar ambos lados");
        // Output should be x = 4 * 2
        eq = step.after;
        let solved = default_solver().simplify_standalone(eq.right);
        assert_eq!(solved.result_latex, "8");
    }

    #[test]
    fn test_no_divide_when_coeff_1() {
        // x = 4 — already solved
        assert!(try_divide_both_sides(&eq("x=4")).is_none());
    }

    #[test]
    fn test_full_solve_3x_minus1_eq_2x_plus4() {
        // 3(x-1) = 2x+4  → after distributive → 3x-3 = 2x+4 → x = 7
        let solver = default_solver();
        let equation = parse_equation("3x-3=2x+4").unwrap();
        let output = solver.simplify_equation(equation);
        // Final result should be x = 7
        assert_eq!(output.result_latex, "x = 7",
            "Expected x = 7, got {}\nSteps: {:#?}",
            output.result_latex, output.steps.iter().map(|s| &s.rule_name).collect::<Vec<_>>()
        );
    }

    #[test]
    fn test_square_both_sides() {
        let eq_str = "\\sqrt{x + 4} = 6";
        let solver = default_solver();
        let out = solver.simplify_equation(parse_equation(eq_str).unwrap());
        // It should square both sides -> x + 4 = 36 -> x = 32
        assert_eq!(out.result_latex, "x = 32");
    }

    #[test]
    fn test_full_solve_2x_plus5_eq_9() {
        // 2x + 5 = 9  →  x = 2
        let solver = default_solver();
        let output = solver.simplify_equation(parse_equation("2x+5=9").unwrap());
        assert_eq!(output.result_latex, "x = 2");
    }
}
