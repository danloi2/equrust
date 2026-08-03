# Algebra Tutor (`equrust`) v0.9.1

> **Tutor interactivo de álgebra con resolución paso a paso en el navegador.**  
> Construido con **SvelteKit 5 (Runes)**, **TypeScript estricto**, **KaTeX** y **TailwindCSS**.

---

## 🎯 Filosofía del Proyecto

La prioridad del proyecto **NO es obtener la respuesta**, sino **enseñar matemáticas**.

Cada transformación matemática es:

- **Independiente**: Una regla a la vez, sin realizar múltiples saltos opacos.
- **Verificable**: Se muestra la transformación explícita antes y después de aplicar la regla.
- **Explicable**: Cada paso incluye título, justificación pedagógica y concepto matemático de referencia.
- **Transparente**: Aplica la _Propiedad Uniforme de la Igualdad_ (mostrando operaciones a ambos lados) y reordena los polinomios por grado de forma rigurosa.

---

## 🛠️ Stack Tecnológico

| Capa                       | Tecnología                                    |
| -------------------------- | --------------------------------------------- |
| **Framework**              | SvelteKit 5 (Runes mode `$state`, `$derived`) |
| **Lenguaje**               | TypeScript estricto                           |
| **Renderizado Matemático** | KaTeX                                         |
| **Estilos**                | TailwindCSS + Glassmorphism UI                |
| **Pruebas**                | Vitest                                        |
| **Gestor de paquetes**     | pnpm                                          |

> 🔒 **100 % Cliente (SPA)**: La resolución matemática ocurre completamente local en el navegador. Sin backend, servidor ni llamadas a API externas.

---

## ⚙️ Arquitectura del Motor Matemático (`src/algebra`)

```
src/algebra/
├── types/          # Definición del AST discriminado inmutable (Expr) y tipos Rule/RuleResult
├── lexer/          # Tokenizador de expresiones matemáticas
├── parser/         # Parser recursivo descendente que genera el AST
├── formatter/      # Convertidor de AST a LaTeX formateado
├── utils/          # Inmutabilidad (mapAST) y manejo de fracciones/radicandos
├── rules/          # Sistema de Reglas Matemáticas
│   ├── clearDenominators.ts   # Eliminación de denominadores (MCM)
│   ├── simplifySigns.ts       # Simplificación de signos (-1*-1=1, 1*x=x)
│   ├── simplifyConstants.ts   # Operaciones aritméticas puras
│   ├── simplifyParenthesis.ts # Eliminación de paréntesis superfluos
│   ├── distributive.ts        # Propiedad distributiva a(b+c) -> ab + ac
│   ├── expandPower.ts         # Expansión de potencias (x-a)²
│   ├── reorderTerms.ts        # Ordenamiento de términos por grado (x² → x → cte)
│   ├── combineLikeTerms.ts    # Agrupamiento de términos semejantes en un paso
│   ├── moveTerms.ts           # Transposición mediante la Propiedad Uniforme
│   ├── divideBothSides.ts     # Aislamiento de la incógnita mediante división uniforme
│   └── quadratic.ts           # Fórmula de Bhaskara (raíces exactas racionales y radicandos)
└── solver/         # Motor iterativo determinista de aplicación de reglas
```

---

## 🚀 Características Principales

1. **Propiedad Uniforme de la Igualdad**:
   - En lugar de transposiciones mágicas, muestra la operación explícita en ambos lados:
     - $x - 2 = 4 \implies x - 2 + 2 = 4 + 2 \implies x = 6$
     - $2x = 32 \implies \frac{2x}{2} = \frac{32}{2} \implies x = 16$

2. **Ordenamiento de Polinomios por Grado**:
   - Reordena simultáneamente los miembros de la ecuación de mayor a menor exponente:
     - $x^2 + 49 - 14x + x^2 = 25 + x \implies x^2 + x^2 - 14x + 49 = x + 25$

3. **Agrupamiento Inteligente de Términos Semejantes**:
   - Combina todos los sumandos semejantes en un solo paso limpio por miembro:
     - $2x^2 + x + x + x - 14x + 54 = x + 25 \implies 2x^2 - 11x + 54 = x + 25$

4. **Soluciones Cuadráticas Exactas**:
   - Manejo estricto de la fórmula de Bhaskara con expresiones exactas en LaTeX:
     - Raíces enteras / fraccionarias: $x = -\frac{5}{4}$ _(con el signo negativo antepuesto a la fracción)_.
     - Raíces irracionales con radicandos simplificados: $x_1 = -2 + \sqrt{5}, \quad x_2 = -2 - \sqrt{5}$.

---

## 💻 Desarrollo Local

### Requisitos previos

- Node.js 18+
- pnpm 9+

### Comandos principales

```sh
# Instalar dependencias
pnpm install

# Iniciar servidor de desarrollo
pnpm dev

# Ejecutar la suite de tests unitarios (Vitest)
pnpm test

# Verificación de tipos y diagnóstico Svelte
pnpm check

# Compilar para producción (sitio estático en /build)
pnpm build
```

---

## 📜 Licencia

MIT © 2026 Equrust / Algebra Tutor
