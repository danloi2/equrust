const API_URL = 'http://localhost:3000'

export interface Step {
  rule_name: string
  explanation: string
  concept: string
  before_latex: string
  after_latex: string
}

export interface SolveResponse {
  steps: Step[]
  result_latex: string
  solutions: string[]
  is_quadratic: boolean
  input_latex: string
}

export async function solveExpression(expression: string): Promise<SolveResponse> {
  const res = await fetch(`${API_URL}/solve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ expression }),
  })

  if (!res.ok) {
    throw new Error(`API error: ${res.status}`)
  }

  return res.json()
}
