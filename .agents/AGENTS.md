# Algebra Tutor — AGENTS.md

## Objetivo

Aplicación web educativa que resuelve expresiones y ecuaciones algebraicas mostrando el razonamiento matemático paso a paso, fiel a la lógica implementada en el proyecto original Rust.

Ejecuta 100 % en el navegador. Sin backend.

---

## Filosofía

La prioridad no es obtener la respuesta. La prioridad es enseñar matemáticas.

Cada transformación debe ser:

- Independiente — una regla, un paso
- Verificable — antes y después muestran la transformación concreta
- Explicable — title + explanation + concept
- Pedagógica — las explicaciones son humanas, no genéricas

---

## Stack

| Capa               | Tecnología                          |
| ------------------ | ----------------------------------- |
| Framework          | SvelteKit 5 (Runes mode)            |
| Lenguaje           | TypeScript estricto (sin JS)        |
| Estilos            | TailwindCSS                         |
| Matemáticas        | KaTeX (importado desde npm, no CDN) |
| Tests              | Vitest                              |
| Gestor de paquetes | pnpm                                |

---

## Arquitectura

```
src/
  algebra/
    types/index.ts       ← AST (Expr discriminado) + Rule + RuleResult
    lexer/index.ts       ← Tokenizador
    parser/index.ts      ← Parser recursivo descendente
    formatter/index.ts   ← AST → LaTeX
    utils/ast.ts         ← mapAST, findNode (inmutables)
    rules/
      simplifyConstants.ts
      simplifySigns.ts
      simplifyParenthesis.ts
      distributive.ts
      combineLikeTerms.ts
      moveTerms.ts
      divideBothSides.ts
      quadratic.ts
    solver/index.ts      ← Motor iterativo
  components/
    ExpressionInput.svelte
    MathExpression.svelte
    StepViewer.svelte
  routes/
    +page.svelte         ← Única página (SPA)
```

---

## AST

Tipos discriminados, inmutables:

```ts
type Expr =
	| NumberNode // { type: 'Number', value: number }
	| VariableNode // { type: 'Variable', name: string }
	| AddNode // { type: 'Add', left, right }
	| MultiplyNode // { type: 'Multiply', left, right }
	| DivideNode // { type: 'Divide', left, right }
	| PowerNode // { type: 'Power', base, exponent }
	| EquationNode // { type: 'Equation', left, right }
	| ParenthesisNode; // { type: 'Parenthesis', inner }
```

**La resta `a - b` se representa como `Add(a, Multiply(-1, b))`.**

No existe `SubtractNode`. No usar clases. No mutar nodos.

---

## RuleResult

Cada paso devuelve:

```ts
interface RuleResult {
	before: Expr; // expresión/ecuación antes
	after: Expr; // expresión/ecuación después
	title: string; // nombre corto de la regla (igual que en Rust)
	explanation: string; // frase pedagógica
	concept: string; // concepto matemático referenciado
	difficulty: number; // 1-10
	solutions?: readonly [] | readonly [number] | readonly [number, number];
}
```

El `before` y `after` se convierten a LaTeX en la UI para mostrar la transformación concreta.

---

## Reglas (orden de prioridad)

| Prioridad | Regla                     | Descripción                            |
| --------- | ------------------------- | -------------------------------------- |
| 1         | `SimplifySignsRule`       | `(-1)*(-1)→1`, `(-1)*n→-n`             |
| 2         | `SimplifyConstantsRule`   | Operaciones aritméticas puras          |
| 3         | `SimplifyParenthesisRule` | Elimina `(atom)` o `(no-suma)`         |
| 4         | `DistributiveRule`        | `a*(b+c)→ab+ac` incluyendo Parenthesis |
| 5         | `CombineLikeTermsRule`    | `2x+3x→5x`                             |
| 6         | `QuadraticFormulaRule`    | Bhaskara antes de mover términos       |
| 7         | `MoveTermsRule`           | Transponer términos en ecuaciones      |
| 8         | `DivideBothSidesRule`     | Despejar dividiendo                    |
| 9         | `MultiplyBothSidesRule`   | `x/n=k → x=kn`                         |

El solver **nunca hace matemáticas directamente**. Solo busca la regla que aplica, la aplica, guarda el paso, y repite.

---

## Formatter

- `Add(a, Multiply(-1, b))` → `a - b`
- `Add(a, Number(neg))` → `a - |neg|`
- `Multiply(n, Var)` → `nx` (sin operador)
- `Multiply(n, Add(...))` → `n\left(sum\right)` (paréntesis automáticos)
- `Power(base, exp)` → `base^{exp}`
- Nunca generar HTML matemático manualmente. Solo KaTeX.

---

## UI — Referencia del proyecto anterior (React)

El diseño fiel al original:

- **Glassmorphism** oscuro: fondo `#0a0a0f`, cards con `backdrop-filter: blur`
- **Color acento**: `#8b5cf6` (violeta)
- **Tipografía**: Inter para UI, JetBrains Mono para el input
- **Header**: logo Σ + título "Aprende matemáticas paso a paso"
- **Input**: campo mono + botón "Resolver" explícito (no reactivo por tecla)
- **Ejemplos**: chips con `BookOpen` + flecha derecha
- **Step card**: número de paso + nombre regla (uppercase) + **before → after** en línea + explicación + concepto con bombilla
- **Resultado final**: card glassmorphism separada al final
- **Cuadrática**: panel con las soluciones (x₁, x₂) o "sin solución real"
- **Empty state**: fórmula KaTeX en opacidad baja

---

## Normas de código

- Sin backend, sin fetch, sin API
- Svelte 5 Runes: `$state`, `$derived`, `$effect`, `$props`
- Nunca usar `$:` (legacy)
- KaTeX CSS importado desde npm: `import 'katex/dist/katex.min.css'`
- Todas las funciones < 50 líneas
- No duplicar implementaciones del AST ni del parser
- Antes de crear un archivo nuevo, verificar si existe uno equivalente
- Inmutabilidad: las reglas siempre retornan un nuevo árbol

---

## Ejemplos de ecuaciones soportadas

```
2(x+3)=10      → distributiva + moveTerms + divideBothSides
3x+2=11        → moveTerms + divideBothSides
x^2-4=0        → quadratic (Δ>0, 2 soluciones)
x^2+5x+6=0    → quadratic (Δ>0, 2 soluciones)
3(x-1)=2x+4   → distributiva + combineLikeTerms + moveTerms
x/2+3=7       → moveTerms + multiplyBothSides
```
