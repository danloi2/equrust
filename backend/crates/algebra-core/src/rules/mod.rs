use crate::ast::Expr;

// ─── Rule Result ─────────────────────────────────────────────────────────────

/// The output of applying a single algebraic rule to an expression.
/// Every transformation must answer three questions:
///   1. What did it do?      → `explanation`
///   2. Why?                 → `concept`
///   3. What is the result?  → `after`
#[derive(Debug, Clone)]
pub struct RuleResult {
    /// The transformed expression
    pub after: Expr,
    /// Short human-readable name of the rule (e.g. "Calcular suma")
    pub title: &'static str,
    /// Full sentence explanation of what happened
    pub explanation: String,
    /// Mathematical concept referenced (e.g. "Aritmética básica")
    pub concept: &'static str,
}

// ─── Rule Trait ──────────────────────────────────────────────────────────────

/// All algebraic transformation rules implement this trait.
///
/// Rules are intentionally small and focused: each rule handles exactly one
/// algebraic transformation. The Solver decides which rule to apply.
pub trait Rule: Send + Sync {
    /// Short name for display in the step list
    fn name(&self) -> &'static str;

    /// Returns `true` if this rule can be applied to the given expression.
    /// Must be a cheap check — no mutation.
    fn applies(&self, expr: &Expr) -> bool;

    /// Apply the rule, consuming `expr` and returning a `RuleResult`.
    /// Only called when `applies` returns `true`.
    fn apply(&self, expr: Expr) -> RuleResult;
}

// ─── Submodules ───────────────────────────────────────────────────────────────
pub mod simplify_constants;
pub mod simplify_signs;
pub mod distributive;
pub mod combine_like_terms;
pub mod equation;
pub mod quadratic;
