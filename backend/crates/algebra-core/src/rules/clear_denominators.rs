use crate::ast::{Expr, Equation};
use crate::rules::equation::EqStep;

// ─── Rule: Eliminar denominadores (multiplicar por MCM) ───────────────────────
//
// Detects all numeric denominators in both sides of the equation,
// computes their LCM, and multiplies the whole equation by it.
//
// Example:
//   (5(3x-2))/8 - (2(4x+7))/5 + (7x-9)/10 = (3(2x+1))/4 - (x-6)/2 + 11/20
//   × 40:
//   5(3x-2)*5 - 2(4x+7)*8 + (7x-9)*4 = 3(2x+1)*10 - (x-6)*20 + 11*2

/// Collect all pure numeric denominators from a tree of Add/Subtract/Divide nodes.
pub fn collect_denominators(expr: &Expr) -> Vec<u64> {
    let mut denoms = Vec::new();
    collect_denoms_inner(expr, &mut denoms);
    denoms
}

fn collect_denoms_inner(expr: &Expr, out: &mut Vec<u64>) {
    match expr {
        Expr::Divide(num, den) => {
            // Check if denominator is a pure number
            if let Expr::Number(d) = den.as_ref() {
                let d_abs = d.abs();
                if d_abs > 0.0 && d_abs.fract() == 0.0 {
                    out.push(d_abs as u64);
                }
            }
            // Recurse into numerator too (nested fractions)
            collect_denoms_inner(num, out);
            collect_denoms_inner(den, out);
        }
        Expr::Add(l, r) | Expr::Subtract(l, r) => {
            collect_denoms_inner(l, out);
            collect_denoms_inner(r, out);
        }
        Expr::Multiply(l, r) | Expr::Power(l, r) => {
            collect_denoms_inner(l, out);
            collect_denoms_inner(r, out);
        }
        Expr::Sqrt(inner) => collect_denoms_inner(inner, out),
        Expr::Number(_) | Expr::Variable(_) => {}
    }
}

fn gcd(a: u64, b: u64) -> u64 {
    if b == 0 { a } else { gcd(b, a % b) }
}

fn lcm(a: u64, b: u64) -> u64 {
    if a == 0 || b == 0 { 0 } else { a / gcd(a, b) * b }
}

pub fn lcm_of(denoms: &[u64]) -> u64 {
    denoms.iter().copied().fold(1, lcm)
}

/// Multiply an expression by a constant factor, distributing over Add/Subtract
/// and absorbing the factor into any leading numeric coefficient.
///
/// Key cases handled:
///   `(expr / denom) * factor`              -> `multiply_by(expr, factor/denom)`
///   `(Number(n) * expr) * factor`          -> `Number(n*factor) * expr`
///   `Number(n) * factor`                   -> `Number(n*factor)`
///   `Add / Subtract`                       -> distribute recursively
fn multiply_by(expr: Expr, factor: f64) -> Expr {
    if factor == 1.0 {
        return expr;
    }
    match expr {
        // Distribute over sums
        Expr::Add(l, r) => Expr::Add(
            Box::new(multiply_by(*l, factor)),
            Box::new(multiply_by(*r, factor)),
        ),
        Expr::Subtract(l, r) => Expr::Subtract(
            Box::new(multiply_by(*l, factor)),
            Box::new(multiply_by(*r, factor)),
        ),

        // Eliminate fraction: (num / denom) * factor => multiply_by(num, factor/denom)
        Expr::Divide(num, den) => {
            if let Expr::Number(d) = den.as_ref() {
                let new_factor = factor / d;
                multiply_by(*num, new_factor)
            } else {
                Expr::Multiply(
                    Box::new(Expr::Divide(num, den)),
                    Box::new(Expr::Number(factor)),
                )
            }
        }

        // Absorb factor into leading numeric coefficient
        // Number(n) * inner => Number(n * factor) * inner
        Expr::Multiply(l, r) => {
            if let Expr::Number(n) = l.as_ref() {
                Expr::Multiply(Box::new(Expr::Number(n * factor)), r)
            } else if let Expr::Number(n) = r.as_ref() {
                Expr::Multiply(l, Box::new(Expr::Number(n * factor)))
            } else {
                // No leading coefficient, wrap
                Expr::Multiply(Box::new(Expr::Multiply(l, r)), Box::new(Expr::Number(factor)))
            }
        }

        // Plain number
        Expr::Number(n) => Expr::Number(n * factor),

        // Variable, Power, Sqrt, etc.
        other => Expr::Multiply(Box::new(other), Box::new(Expr::Number(factor))),
    }
}


// ─── Public interface ─────────────────────────────────────────────────────────

/// Try to eliminate all numeric denominators by multiplying both sides by LCM.
/// Returns None if there are no denominators to clear.
pub fn try_clear_denominators(eq: &Equation) -> Option<EqStep> {
    let mut all_denoms = collect_denominators(&eq.left);
    all_denoms.extend(collect_denominators(&eq.right));

    if all_denoms.is_empty() {
        return None;
    }

    let mcm = lcm_of(&all_denoms);
    if mcm <= 1 {
        return None;
    }

    let factor = mcm as f64;

    let before = eq.clone();

    let new_left  = multiply_by(eq.left.clone(),  factor);
    let new_right = multiply_by(eq.right.clone(), factor);

    let after = Equation { left: new_left, right: new_right };

    Some(EqStep {
        before,
        after,
        title: "Eliminar denominadores",
        explanation: format!(
            "Se multiplica cada término de ambos miembros por {} (MCM de los denominadores) para eliminar las fracciones",
            mcm
        ),
        concept: "Álgebra — MCM: multiplicar para eliminar denominadores",
    })
}
