use axum::{routing::post, Router, Json};
use serde::{Deserialize, Serialize};
use tower_http::cors::{CorsLayer, Any};
use chumsky::Parser;

use algebra_core::lexer::lexer;
use algebra_core::parser::{parser, token_stream};
use algebra_core::solver::{default_solver, Step};

#[derive(Deserialize)]
struct SolveRequest {
    expression: String,
}

#[derive(Serialize)]
struct SolveResponse {
    steps: Vec<Step>,
    result_latex: String,
    /// Solutions for quadratic equations: 0, 1 or 2 LaTeX strings
    solutions: Vec<String>,
    /// True when the equation was treated as a 2nd-degree equation
    is_quadratic: bool,
    /// LaTeX of the input expression as parsed (for display)
    input_latex: String,
}

#[derive(Serialize)]
#[allow(dead_code)]
struct ErrorResponse {
    error: String,
    error_latex: String,
}

async fn solve(Json(payload): Json<SolveRequest>) -> Json<SolveResponse> {
    // 0. Preprocess: normalize superscript numbers (e.g. from mobile keyboards or copy-paste)
    let expr_str = payload.expression
        .replace("⁰", "^0")
        .replace("¹", "^1")
        .replace("²", "^2")
        .replace("³", "^3")
        .replace("⁴", "^4")
        .replace("⁵", "^5")
        .replace("⁶", "^6")
        .replace("⁷", "^7")
        .replace("⁸", "^8")
        .replace("⁹", "^9");

    // 1. Lex
    let tokens = match lexer().parse(expr_str.as_str()).into_result() {
        Ok(t) => t,
        Err(_) => return Json(SolveResponse {
            steps: vec![],
            result_latex: r"\text{Error léxico}".to_string(),
            solutions: vec![],
            is_quadratic: false,
            input_latex: payload.expression.clone(),
        }),
    };

    // 2. Parse
    let ast = match parser().parse(token_stream(tokens)).into_result() {
        Ok(eq) => eq,
        Err(_) => return Json(SolveResponse {
            steps: vec![],
            result_latex: r"\text{Error de sintaxis}".to_string(),
            solutions: vec![],
            is_quadratic: false,
            input_latex: payload.expression.clone(),
        }),
    };

    use algebra_core::formatter::FormatLatex;
    let input_latex = ast.to_latex();

    // 3. Solve (apply rules)
    let output = default_solver().simplify_equation(ast);

    Json(SolveResponse {
        steps: output.steps,
        result_latex: output.result_latex,
        solutions: output.solutions,
        is_quadratic: output.is_quadratic,
        input_latex,
    })
}

#[tokio::main]
async fn main() {
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let app = Router::new()
        .route("/solve", post(solve))
        .layer(cors);

    let listener = tokio::net::TcpListener::bind("127.0.0.1:3000").await.unwrap();
    println!("🚀 Algebra Tutor API → http://127.0.0.1:3000");
    axum::serve(listener, app).await.unwrap();
}
