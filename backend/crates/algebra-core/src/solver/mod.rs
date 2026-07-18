use serde::{Serialize, Deserialize};
use crate::ast::{Expr, Equation};
use crate::formatter::FormatLatex;
use crate::rules::Rule;
use crate::rules::equation::{try_equation_rule, EqStep};
use crate::rules::quadratic::try_solve_quadratic;
use crate::rules::clear_denominators::try_clear_denominators;

// ─── Step ─────────────────────────────────────────────────────────────────────

/// A single transformation step produced by the Solver.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Step {
    /// Name of the rule that was applied
    pub rule_name: String,
    /// Full sentence: what happened and why
    pub explanation: String,
    /// Mathematical concept referenced
    pub concept: String,
    /// LaTeX of the **full equation** before the transformation
    pub before_latex: String,
    /// LaTeX of the **full equation** after the transformation
    pub after_latex: String,
}

impl Step {
    fn from_eq_step(s: EqStep) -> Self {
        Step {
            rule_name:   s.title.to_string(),
            explanation: s.explanation,
            concept:     s.concept.to_string(),
            before_latex: s.before.to_latex(),
            after_latex:  s.after.to_latex(),
        }
    }
}

// ─── Solve Output ─────────────────────────────────────────────────────────────

/// The complete output of the Solver for a given input.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SolveOutput {
    /// Ordered list of all transformations applied
    pub steps: Vec<Step>,
    /// LaTeX of the final equation state (or solution for linear)
    pub result_latex: String,
    /// Solutions for quadratic equations (0, 1 or 2 elements)
    #[serde(default)]
    pub solutions: Vec<String>,
    /// True when the equation was identified as a 2nd-degree equation
    #[serde(default)]
    pub is_quadratic: bool,
}

// ─── Solver ───────────────────────────────────────────────────────────────────

/// The Solver never does mathematics directly.
/// Its only job: find the first applicable rule and apply it, then repeat.
pub struct Solver {
    rules: Vec<Box<dyn Rule>>,
}

impl Solver {
    pub fn new(rules: Vec<Box<dyn Rule>>) -> Self {
        Self { rules }
    }

    /// Simplify an `Equation` step by step:
    ///   0. Eliminate denominators first (before SimplifyConstants can convert 11/20 → 0.55)
    ///   1. Simplify both sides with expression-level rules (bottom-up)
    ///   2. Apply equation-level rules (move constants, divide, etc.)
    ///   3. Repeat until no rule applies.
    ///   4. If stalled with an x² term, try the quadratic formula.
    pub fn simplify_equation(&self, eq: Equation) -> SolveOutput {
        let mut steps: Vec<Step> = Vec::new();
        let mut current = eq;

        // Phase 0: Clear denominators BEFORE any expression simplification.
        // This ensures 11/20 doesn't become 0.55 before the LCM can act on it.
        if let Some(eq_step) = try_clear_denominators(&current) {
            current = eq_step.after.clone();
            steps.push(Step::from_eq_step(eq_step));
        }

        loop {
            // Phase A: simplify both sides with expression rules
            let left  = self.simplify_expr(current.left,  &mut steps);
            let right = self.simplify_expr(current.right, &mut steps);
            current = Equation { left, right };

            // Phase B: try one equation-level rule (clear_denominators is now
            // excluded from the loop since we already did it above)
            if let Some(eq_step) = try_equation_rule(&current) {
                current = eq_step.after.clone();
                steps.push(Step::from_eq_step(eq_step));
                // Continue the loop — simplify after each equation rule
            } else {
                break;
            }
        }

        // Final expression-level simplification pass on result
        let left  = self.simplify_expr(current.left,  &mut steps);
        let right = self.simplify_expr(current.right, &mut steps);
        let result = Equation { left, right };

        // ── Phase 9: Quadratic formula ─────────────────────────────────────
        if let Some(quad) = try_solve_quadratic(&result) {
            for eq_step in quad.steps {
                steps.push(Step::from_eq_step(eq_step));
            }
            return SolveOutput {
                steps,
                result_latex: result.to_latex(),
                solutions: quad.solutions,
                is_quadratic: true,
            };
        }

        SolveOutput {
            steps,
            result_latex: result.to_latex(),
            solutions: vec![],
            is_quadratic: false,
        }
    }

    /// Simplify a standalone `Expr`.
    pub fn simplify_standalone(&self, expr: Expr) -> SolveOutput {
        let mut steps: Vec<Step> = Vec::new();
        let result = self.simplify_expr(expr, &mut steps);
        SolveOutput {
            steps,
            result_latex: result.to_latex(),
            solutions: vec![],
            is_quadratic: false,
        }
    }

    // ── Internal ──────────────────────────────────────────────────────────────

    /// Repeatedly apply rules until the expression cannot be simplified further.
    fn simplify_expr(&self, mut expr: Expr, steps: &mut Vec<Step>) -> Expr {
        loop {
            match self.apply_once(expr.clone()) {
                Some((new_expr, step)) => {
                    steps.push(step);
                    expr = new_expr;
                }
                None => break,
            }
        }
        expr
    }

    /// Try to apply ONE rule at the deepest applicable sub-expression (bottom-up).
    /// Returns `None` when nothing more can be simplified.
    fn apply_once(&self, expr: Expr) -> Option<(Expr, Step)> {
        match expr {
            Expr::Add(l, r) => self.recurse_binary(*l, *r, Expr::Add),
            Expr::Subtract(l, r) => self.recurse_binary(*l, *r, Expr::Subtract),
            Expr::Multiply(l, r) => self.recurse_binary(*l, *r, Expr::Multiply),
            Expr::Divide(l, r) => self.recurse_binary(*l, *r, Expr::Divide),
            Expr::Power(l, r) => self.recurse_binary(*l, *r, Expr::Power),
            Expr::Sqrt(inner) => self.recurse_unary(*inner, Expr::Sqrt),
            leaf => self.try_rules(leaf),
        }
    }

    /// Recurse into a binary expression children first (bottom-up), then try rules.
    fn recurse_binary(
        &self,
        l: Expr,
        r: Expr,
        ctor: fn(Box<Expr>, Box<Expr>) -> Expr,
    ) -> Option<(Expr, Step)> {
        // Try left child first
        if let Some((new_l, step)) = self.apply_once(l.clone()) {
            return Some((ctor(Box::new(new_l), Box::new(r)), step));
        }
        // Then right child
        if let Some((new_r, step)) = self.apply_once(r.clone()) {
            return Some((ctor(Box::new(l), Box::new(new_r)), step));
        }
        // Then this node itself
        self.try_rules(ctor(Box::new(l), Box::new(r)))
    }

    /// Recurse into a unary expression child first, then try rules.
    fn recurse_unary(
        &self,
        inner: Expr,
        ctor: fn(Box<Expr>) -> Expr,
    ) -> Option<(Expr, Step)> {
        if let Some((new_inner, step)) = self.apply_once(inner.clone()) {
            return Some((ctor(Box::new(new_inner)), step));
        }
        self.try_rules(ctor(Box::new(inner)))
    }

    /// Try every rule on this expression, return the first match.
    fn try_rules(&self, expr: Expr) -> Option<(Expr, Step)> {
        for rule in &self.rules {
            if rule.applies(&expr) {
                let before_latex = expr.to_latex();
                let result = rule.apply(expr);
                let after_latex = result.after.to_latex();
                return Some((
                    result.after,
                    Step {
                        rule_name:    result.title.to_string(),
                        explanation:  result.explanation,
                        concept:      result.concept.to_string(),
                        before_latex,
                        after_latex,
                    },
                ));
            }
        }
        None
    }
}

// ─── Default Solver (Phases 5–8) ──────────────────────────────────────────────────────────

use crate::rules::simplify_constants::{SimplifyConstants, CombineNestedConstants};
use crate::rules::simplify_signs::{SimplifySigns, DistributeMinus, FlattenAddSub};
use crate::rules::distributive::Distributive;
use crate::rules::combine_like_terms::CombineLikeTerms;
use crate::rules::merge_coefficients::MergeCoefficients;

/// Build the default solver with rules ordered by priority:
///   0. Simplificar dobles signos (siempre primero)
///   1. Distribuir signo negativo: -(a+b) -> -a-b
///   2. Asociar términos: a+(b+c) -> a+b+c
///   3. Fusionar coeficientes: 25*(3*x) -> 75x  (produced by clear_denominators)
///   4. Calcular constantes (Phase 5)
///   5. Propiedad distributiva (Phase 6)
///   6. Reducir términos semejantes (Phase 7)
///   Equation rules (Phase 8) are applied separately inside simplify_equation.
pub fn default_solver() -> Solver {
    Solver::new(vec![
        Box::new(SimplifySigns),
        Box::new(DistributeMinus),
        Box::new(FlattenAddSub),
        Box::new(MergeCoefficients),
        Box::new(CombineNestedConstants),
        Box::new(SimplifyConstants),
        Box::new(Distributive),
        Box::new(CombineLikeTerms),
    ])
}

// Allow tests to access simplify_expr
impl Solver {
    pub fn simplify_expr_pub(&self, expr: Expr, steps: &mut Vec<Step>) -> Expr {
        self.simplify_expr(expr, steps)
    }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use crate::lexer::lexer;
    use crate::parser::{parser, token_stream};
    use chumsky::Parser;

    fn solve(input: &str) -> SolveOutput {
        let tokens = lexer().parse(input).unwrap();
        let eq = parser().parse(token_stream(tokens)).into_result().unwrap();
        default_solver().simplify_equation(eq)
    }

    fn solve_expr(input: &str) -> SolveOutput {
        let tokens = lexer().parse(input).unwrap();
        let eq = parser().parse(token_stream(tokens)).into_result().unwrap();
        // Use left side as the expression to simplify
        default_solver().simplify_standalone(eq.left)
    }

    #[test]
    fn test_simplify_constant_sum() {
        let out = solve_expr("2+3=0");
        assert_eq!(out.result_latex, "5");
        assert_eq!(out.steps.len(), 1);
        assert_eq!(out.steps[0].rule_name, "Calcular suma");
    }

    #[test]
    fn test_simplify_nested() {
        // (2 + 3) * 4  → 5 * 4 → 20
        let out = solve_expr("(2+3)*4=0");
        assert_eq!(out.result_latex, "20");
        assert_eq!(out.steps.len(), 2);
    }

    #[test]
    fn test_no_simplification() {
        // 2*x is already simplified
        let out = solve_expr("2*x=0");
        assert!(out.steps.is_empty());
        assert_eq!(out.result_latex, "2x");
    }

    #[test]
    fn test_equation_both_sides() {
        // 2+1 = 4-1  →  3 = 3
        let out = solve("2+1=4-1");
        assert_eq!(out.result_latex, "3 = 3");
        assert_eq!(out.steps.len(), 2);
    }
    
    #[test]
    fn test_power_simplify() {
        let out = solve_expr("2^3=0");
        assert_eq!(out.result_latex, "8");
    }

    // Helper: display numbers
    #[test]
    fn test_fmt_num() {
        use crate::rules::simplify_constants::fmt_num;
        assert_eq!(fmt_num(5.0),  "5");
        assert_eq!(fmt_num(3.14), "3.14");
        assert_eq!(fmt_num(0.5),  "0.5");
    }
}
