use crate::ast::{Expr, Equation};
use crate::rules::equation::EqStep;

// ─── Phase 9: Fórmula cuadrática ─────────────────────────────────────────────
//
// Resuelve ecuaciones de la forma ax² + bx + c = 0
//
// Casos según el discriminante Δ = b² - 4ac:
//
//   Δ > 0  →  Dos soluciones reales:  x = (-b ± √Δ) / 2a
//   Δ = 0  →  Raíz doble:             x = -b / 2a
//   Δ < 0  →  Sin soluciones reales
//

/// Output del solucionador cuadrático.
#[derive(Debug)]
pub struct QuadraticOutput {
    /// Pasos pedagógicos (misma estructura que EqStep)
    pub steps: Vec<EqStep>,
    /// LaTeX de cada solución: 0, 1 o 2 elementos
    pub solutions: Vec<String>,
}

/// Intenta resolver la ecuación como cuadrática. Devuelve None si no lo es.
pub fn try_solve_quadratic(eq: &Equation) -> Option<QuadraticOutput> {
    // Debe haber un término x² en algún miembro
    if !contains_power_2(&eq.left) && !contains_power_2(&eq.right) {
        return None;
    }

    let mut steps: Vec<EqStep> = Vec::new();

    // ── Paso 1: Normalizar a ... = 0 ────────────────────────────────────────
    let std_lhs = if is_zero_expr(&eq.right) {
        eq.left.clone()
    } else {
        let new_lhs = Expr::Subtract(
            Box::new(eq.left.clone()),
            Box::new(eq.right.clone()),
        );
        let std_eq = Equation {
            left: new_lhs.clone(),
            right: Expr::Number(0.0),
        };
        steps.push(EqStep {
            before: eq.clone(),
            after:  std_eq,
            title: "Llevar al primer miembro",
            explanation: "Se pasan todos los términos al primer miembro para obtener ax² + bx + c = 0".to_string(),
            concept: "Álgebra — ecuación de 2.º grado: forma estándar",
        });
        new_lhs
    };

    let std_eq = Equation {
        left:  std_lhs.clone(),
        right: Expr::Number(0.0),
    };

    // ── Encontrar el nombre de la variable ──────────────────────────────────
    let var = find_variable_name(&std_lhs)?;

    // ── Extraer coeficientes a, b, c ────────────────────────────────────────
    let mut a = 0.0_f64;
    let mut b = 0.0_f64;
    let mut c = 0.0_f64;
    collect_terms(&std_lhs, &var, 1.0, &mut a, &mut b, &mut c)?;

    if a == 0.0 {
        return None; // No es cuadrática
    }

    // ── Paso 2: Ecuación estandarizada ───────────────────────────────────────
    steps.push(EqStep {
        before: std_eq.clone(),
        after:  std_eq.clone(),
        title: "Identificar ecuación de 2.º grado",
        explanation: "La ecuación está en forma estándar ax^{2} + bx + c = 0".to_string(),
        concept: "Álgebra — ecuación cuadrática (2.º grado)",
    });

    // ── Casos de ecuación incompleta ─────────────────────────────────────────
    if b.abs() < 1e-9 && c.abs() < 1e-9 {
        // ax^2 = 0
        let after = Equation { left: Expr::Variable(var.clone()), right: Expr::Number(0.0) };
        steps.push(EqStep {
            before: std_eq.clone(),
            after: after.clone(),
            title: "Despejar raíz única",
            explanation: format!("{} = 0 → {} = 0", fmt_val(a), var),
            concept: "Álgebra — ecuación cuadrática incompleta",
        });
        return Some(QuadraticOutput { steps, solutions: vec![format!("{} = 0", var)] });
    } else if b.abs() < 1e-9 {
        // ax^2 + c = 0 => x^2 = -c/a
        let val = -c / a;
        if val < -1e-9 {
            steps.push(EqStep {
                before: std_eq.clone(),
                after: std_eq.clone(),
                title: "Despejar y raíz cuadrada",
                explanation: format!("{} = {} → no tiene raíz real", format!("{}^{{2}}", var), fmt_val(val)),
                concept: "Álgebra — ecuación cuadrática incompleta: sin solución real",
            });
            return Some(QuadraticOutput { steps, solutions: vec![] });
        } else {
            let sqrt_val = val.sqrt();
            let after = Equation { 
                left: Expr::Variable(var.clone()), 
                right: Expr::Variable(format!("\\pm {}", fmt_sqrt_or_val(val))) 
            };
            steps.push(EqStep {
                before: std_eq.clone(),
                after,
                title: "Despejar y raíz cuadrada",
                explanation: format!("{}^{{2}} = {} → {} = \\pm {}", var, fmt_val(val), var, fmt_sqrt_or_val(val)),
                concept: "Álgebra — ecuación cuadrática incompleta",
            });
            return Some(QuadraticOutput { 
                steps, 
                solutions: vec![
                    format!("{}_{{1}} = {}", var, if sqrt_val.fract().abs() < 1e-9 { fmt_val(sqrt_val) } else { fmt_sqrt_or_val(val) }),
                    format!("{}_{{2}} = -{}", var, if sqrt_val.fract().abs() < 1e-9 { fmt_val(sqrt_val) } else { fmt_sqrt_or_val(val) })
                ]
            });
        }
    } else if c.abs() < 1e-9 {
        // ax^2 + bx = 0 => x(ax + b) = 0
        let factor_expr = if a == 1.0 {
            format!("{}({} + {})", var, var, fmt_val(b))
        } else {
            format!("{}({}{} + {})", var, fmt_val(a), var, fmt_val(b))
        };
        steps.push(EqStep {
            before: std_eq.clone(),
            after: Equation { 
                left: Expr::Variable(factor_expr), 
                right: Expr::Number(0.0) 
            },
            title: "Extraer factor común",
            explanation: format!("Se extrae {} como factor común e igualamos ambos factores a cero", var),
            concept: "Álgebra — ecuación cuadrática incompleta: factor común",
        });
        
        // Root 2: ax + b = 0 => x = -b/a
        // Use fmt_solution_value for nice fraction if applicable, using discriminant = b^2 (so sqrt is |b|)
        // Wait, it's easier to just format the result of (-b/a). But we can just use fmt_solution_value with negative_b = -b, sign = -1, disc = b^2, two_a = 2a.
        // Actually, just disc=0 but with -b/a. Let's just do fmt_solution_value(-b, -1.0, b*b, 2.0*a).
        // For ax+b=0, x = -b/a. We can trick fmt_solution_value: neg_b = -2b, disc = 0, two_a = 2a -> -2b/2a = -b/a
        
        let root2_str = fmt_solution_value(-b * 2.0, 1.0, 0.0, 2.0 * a);
        
        return Some(QuadraticOutput { 
            steps, 
            solutions: vec![
                format!("{}_{{1}} = 0", var),
                format!("{}_{{2}} = {}", var, root2_str)
            ]
        });
    }

    // ── Paso 3: Fórmula general (Bhaskara) ───────────────────────────────────
    steps.push(EqStep {
        before: std_eq.clone(),
        after: Equation {
            left: Expr::Variable(var.clone()),
            right: Expr::Variable("\\dfrac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}".to_string()),
        },
        title: "Fórmula general de Bhaskara",
        explanation: format!("Al ser una ecuación completa, aplicamos la fórmula de Bhaskara, con a={}, b={} y c={}", fmt_val(a), fmt_val(b), fmt_val(c)),
        concept: "Álgebra — fórmula cuadrática (Bhaskara)",
    });

    // ── Paso 4: Sustitución ──────────────────────────────────────────────────
    steps.push(EqStep {
        before: std_eq.clone(),
        after: Equation {
            left: Expr::Variable(var.clone()),
            right: Expr::Variable(format!(
                "\\dfrac{{-({}) \\pm \\sqrt{{({})^2 - 4({})({})}}}}{{2({})}}",
                fmt_val(b), fmt_val(b), fmt_val(a), fmt_val(c), fmt_val(a)
            )),
        },
        title: "Sustituir coeficientes",
        explanation: "Sustituimos los valores de a, b y c en la fórmula.".to_string(),
        concept: "Álgebra — sustitución",
    });

    // ── Paso 5: Calcular discriminante ───────────────────────────────────────
    let disc = b * b - 4.0 * a * c;

    let disc_after = Equation {
        left:  Expr::Variable(var.clone()),
        right: Expr::Variable(format!(
            "\\dfrac{{{}\\pm \\sqrt{{{}}}}}{{{}}}",
            fmt_with_sign_space(-b),
            fmt_val(disc),
            fmt_val(2.0 * a)
        )),
    };
    steps.push(EqStep {
        before: std_eq.clone(),
        after:  disc_after,
        title: "Calcular el discriminante",
        explanation: format!(
            "Calculamos el interior de la raíz: \\Delta = b^2 - 4ac = {}",
            fmt_val(disc)
        ),
        concept: "Álgebra — discriminante \\Delta = b^2 - 4ac",
    });

    // ── Paso 6: Resolver soluciones ──────────────────────────────────────────
    let solutions = if disc < -1e-9 {
        // Sin soluciones reales
        steps.push(EqStep {
            before: std_eq.clone(),
            after:  std_eq.clone(),
            title: "Sin soluciones reales",
            explanation: format!(
                "Como \\Delta = {} < 0, la ecuación no tiene soluciones en \\mathbb{{R}}",
                fmt_val(disc)
            ),
            concept: "Álgebra — discriminante negativo: sin soluciones reales",
        });
        vec![]

    } else if disc.abs() < 1e-9 {
        // Raíz doble
        let x = clean(-b / (2.0 * a));
        let sol_after = Equation {
            left:  Expr::Variable(var.clone()),
            right: Expr::Variable(fmt_solution_value(-b, 1.0, 0.0, 2.0 * a)),
        };
        steps.push(EqStep {
            before: std_eq.clone(),
            after:  sol_after,
            title: "Raíz doble",
            explanation: format!(
                "Al ser \\Delta = 0, se obtiene una raíz doble: {} = \\dfrac{{{}}}{{{}}} = {}",
                var, fmt_val(-b), fmt_val(2.0 * a), fmt_val(x)
            ),
            concept: "Álgebra — discriminante cero: raíz doble",
        });
        vec![format!("{} = {}", var, fmt_val(x))]

    } else {
        // Dos soluciones reales
        let sqrt_d = disc.sqrt();

        // Primera solución x₁
        let _x1 = clean((-b + sqrt_d) / (2.0 * a));
        let x1_after = Equation {
            left:  Expr::Variable(format!("{}_{{1}}", var)),
            right: Expr::Variable(fmt_solution_value(-b, 1.0, disc, 2.0 * a)),
        };
        steps.push(EqStep {
            before: std_eq.clone(),
            after:  x1_after,
            title: "Primera solución",
            explanation: format!(
                "{}_{{1}} = \\dfrac{{{}+{}}}{{{}}} = {}",
                var,
                fmt_val(-b),
                fmt_sqrt_or_val(disc),
                fmt_val(2.0 * a),
                fmt_solution_value(-b, 1.0, disc, 2.0 * a),
            ),
            concept: "Álgebra — primera raíz de la ecuación cuadrática",
        });

        // Segunda solución x₂
        let _x2 = clean((-b - sqrt_d) / (2.0 * a));
        let x2_after = Equation {
            left:  Expr::Variable(format!("{}_{{2}}", var)),
            right: Expr::Variable(fmt_solution_value(-b, -1.0, disc, 2.0 * a)),
        };
        steps.push(EqStep {
            before: std_eq.clone(),
            after:  x2_after,
            title: "Segunda solución",
            explanation: format!(
                "{}_{{2}} = \\dfrac{{{}−{}}}{{{}}} = {}",
                var,
                fmt_val(-b),
                fmt_sqrt_or_val(disc),
                fmt_val(2.0 * a),
                fmt_solution_value(-b, -1.0, disc, 2.0 * a),
            ),
            concept: "Álgebra — segunda raíz de la ecuación cuadrática",
        });

        vec![
            format!("{}_{{1}} = {}", var, fmt_solution_value(-b,  1.0, disc, 2.0 * a)),
            format!("{}_{{2}} = {}", var, fmt_solution_value(-b, -1.0, disc, 2.0 * a)),
        ]
    };

    Some(QuadraticOutput { steps, solutions })
}

// ─── Helpers matemáticos ──────────────────────────────────────────────────────

/// Recorre el AST sumando coeficientes de x², x y la constante.
/// Devuelve None si encuentra una estructura desconocida.
fn collect_terms(
    expr: &Expr,
    var: &str,
    sign: f64,
    a: &mut f64,
    b: &mut f64,
    c: &mut f64,
) -> Option<()> {
    match expr {
        Expr::Number(n) => {
            *c += sign * n;
            Some(())
        }
        Expr::Variable(v) => {
            if v == var {
                *b += sign;
                Some(())
            } else {
                None // Variable desconocida
            }
        }
        Expr::Multiply(l, r) => match (l.as_ref(), r.as_ref()) {
            // n * var  →  término lineal
            (Expr::Number(n), Expr::Variable(v)) if v == var => {
                *b += sign * n;
                Some(())
            }
            (Expr::Variable(v), Expr::Number(n)) if v == var => {
                *b += sign * n;
                Some(())
            }
            // n * x^2  →  término cuadrático
            (Expr::Number(n), Expr::Power(base, exp)) if is_x2(base, exp, var) => {
                *a += sign * n;
                Some(())
            }
            (Expr::Power(base, exp), Expr::Number(n)) if is_x2(base, exp, var) => {
                *a += sign * n;
                Some(())
            }
            _ => None,
        },
        // x^2  →  término cuadrático con coef 1
        Expr::Power(base, exp) if is_x2(base, exp, var) => {
            *a += sign;
            Some(())
        }
        Expr::Add(l, r) => {
            collect_terms(l, var, sign, a, b, c)?;
            collect_terms(r, var, sign, a, b, c)
        }
        Expr::Subtract(l, r) => {
            collect_terms(l, var,  sign, a, b, c)?;
            collect_terms(r, var, -sign, a, b, c)
        }
        _ => None,
    }
}

fn is_x2(base: &Expr, exp: &Expr, var: &str) -> bool {
    matches!(base, Expr::Variable(v) if v == var)
        && matches!(exp, Expr::Number(n) if (*n - 2.0).abs() < 1e-9)
}

fn contains_power_2(expr: &Expr) -> bool {
    match expr {
        Expr::Power(base, exp) => {
            matches!(base.as_ref(), Expr::Variable(_))
                && matches!(exp.as_ref(), Expr::Number(n) if (*n - 2.0).abs() < 1e-9)
        }
        Expr::Add(l, r) | Expr::Subtract(l, r) | Expr::Multiply(l, r) | Expr::Divide(l, r) => {
            contains_power_2(l) || contains_power_2(r)
        }
        _ => false,
    }
}

fn find_variable_name(expr: &Expr) -> Option<String> {
    match expr {
        Expr::Variable(v) => Some(v.clone()),
        Expr::Add(l, r) | Expr::Subtract(l, r) | Expr::Multiply(l, r)
        | Expr::Divide(l, r) | Expr::Power(l, r) => {
            find_variable_name(l).or_else(|| find_variable_name(r))
        }
        _ => None,
    }
}

fn is_zero_expr(e: &Expr) -> bool {
    matches!(e, Expr::Number(n) if n.abs() < 1e-9)
}

/// Elimina el ruido de coma flotante redondeando a 9 decimales.
fn clean(n: f64) -> f64 {
    (n * 1e9).round() / 1e9
}

/// Formatea un número de forma legible: entero si es entero, decimal si no.
fn fmt_val(n: f64) -> String {
    let r = clean(n);
    if r.fract().abs() < 1e-9 && r.abs() < 1e12 {
        format!("{}", r as i64)
    } else {
        let s = format!("{:.6}", r);
        s.trim_end_matches('0').trim_end_matches('.').to_string()
    }
}

/// Formatea √disc como entero si es raíz exacta, o \sqrt{disc} si no.
fn fmt_sqrt_or_val(disc: f64) -> String {
    let sq = disc.sqrt();
    if sq.fract().abs() < 1e-9 {
        fmt_val(sq)
    } else {
        format!("\\sqrt{{{}}}", fmt_val(disc))
    }
}

/// Formatea un número añadiendo espacio antes del signo (para alinear en fracciones).
fn fmt_with_sign_space(n: f64) -> String {
    let r = clean(n);
    if r >= 0.0 {
        format!("{}", fmt_val(r))
    } else {
        fmt_val(r)
    }
}

/// Calcula y formatea el valor de una solución:
///   (neg_b + sign * √disc) / two_a
///
/// Muestra entero, fracción o forma radical según corresponda.
fn fmt_solution_value(neg_b: f64, sign: f64, disc: f64, two_a: f64) -> String {
    let sqrt_d = disc.sqrt();
    let numer  = neg_b + sign * sqrt_d;
    let result = clean(numer / two_a);

    // Resultado entero
    if result.fract().abs() < 1e-9 {
        return fmt_val(result);
    }

    // Raíz exacta (disc es cuadrado perfecto) → fracción reducida
    if sqrt_d.fract().abs() < 1e-9 {
        let n = numer.round() as i64;
        let d = two_a.round() as i64;
        let g = gcd(n.abs(), d.abs());
        let ns = n / g;
        let ds = d / g;
        if ds < 0 { return format!("\\frac{{{}}}{{{}}}", -ns, -ds); }
        if ds == 1 { return format!("{}", ns); }
        return format!("\\frac{{{}}}{{{}}}", ns, ds);
    }

    // Resultado irracional → forma exacta con radical
    let sqrt_str = fmt_sqrt_or_val(disc);
    if neg_b == 0.0 {
        // (± √disc) / two_a
        if sign > 0.0 {
            format!("\\frac{{\\sqrt{{{}}}}}{{{}}}", fmt_val(disc), fmt_val(two_a))
        } else {
            format!("\\frac{{-\\sqrt{{{}}}}}{{{}}}", fmt_val(disc), fmt_val(two_a))
        }
    } else {
        format!(
            "\\frac{{{}{}{}}}{{{}}}",
            fmt_val(neg_b),
            if sign > 0.0 { "+" } else { "-" },
            sqrt_str,
            fmt_val(two_a)
        )
    }
}

fn gcd(a: i64, b: i64) -> i64 {
    if b == 0 { a.abs() } else { gcd(b, a % b) }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use crate::parser::parse_equation;

    fn eq(s: &str) -> Equation {
        parse_equation(s).expect(&format!("parse error: {}", s))
    }

    #[test]
    fn test_two_integer_solutions() {
        // x² - 5x + 6 = 0 → x=2, x=3
        let out = try_solve_quadratic(&eq("x^2-5x+6=0")).expect("should solve");
        assert_eq!(out.solutions.len(), 2);
        assert!(out.solutions.contains(&"x_{1} = 3".to_string())
             || out.solutions.contains(&"x_{2} = 3".to_string()));
        assert!(out.solutions.contains(&"x_{1} = 2".to_string())
             || out.solutions.contains(&"x_{2} = 2".to_string()));
    }

    #[test]
    fn test_incomplete_c_zero() {
        // x² - 5x = 0 → x=0, x=5
        let out = try_solve_quadratic(&eq("x^2-5x=0")).expect("should solve");
        assert_eq!(out.solutions.len(), 2);
        assert_eq!(out.solutions[0], "x_{1} = 0");
        assert_eq!(out.solutions[1], "x_{2} = 5");
    }

    #[test]
    fn test_incomplete_b_zero() {
        // x² - 4 = 0 → x=2, x=-2
        let out = try_solve_quadratic(&eq("x^2-4=0")).expect("should solve");
        assert_eq!(out.solutions.len(), 2);
        assert_eq!(out.solutions[0], "x_{1} = 2");
        assert_eq!(out.solutions[1], "x_{2} = -2");
    }


    #[test]
    fn test_double_root() {
        // x² - 2x + 1 = 0 → x = 1 (double)
        let out = try_solve_quadratic(&eq("x^2-2x+1=0")).expect("should solve");
        assert_eq!(out.solutions.len(), 1);
        assert_eq!(out.solutions[0], "x = 1");
    }

    #[test]
    fn test_no_real_solutions() {
        // x² + 1 = 0 → no real solutions
        let out = try_solve_quadratic(&eq("x^2+1=0")).expect("should detect");
        assert_eq!(out.solutions.len(), 0);
    }

    #[test]
    fn test_needs_normalization() {
        // x² = 5x - 6 → x=2, x=3
        let out = try_solve_quadratic(&eq("x^2=5x-6")).expect("should solve");
        assert_eq!(out.solutions.len(), 2);
    }

    #[test]
    fn test_not_quadratic() {
        // 2x + 3 = 5 → None
        let out = try_solve_quadratic(&eq("2x+3=5"));
        assert!(out.is_none());
    }
}
