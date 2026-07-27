## Project Configuration

- **Language**: TypeScript
- **Package Manager**: pnpm
- **Add-ons**: prettier, eslint, vitest, tailwindcss

---

# Algebra Tutor

## Objetivo

Construir una aplicación web educativa capaz de resolver expresiones y ecuaciones mostrando el razonamiento matemático paso a paso.

La aplicación debe ejecutarse completamente en el navegador.

No debe existir backend.

Todo el procesamiento matemático ocurre en el cliente.

---

# Filosofía

La prioridad del proyecto NO es obtener la respuesta.

La prioridad es enseñar matemáticas.

Cada transformación matemática debe ser:

- independiente
- verificable
- explicable
- reversible cuando sea posible

Nunca realizar varios pasos de una sola vez.

Cada modificación de una expresión debe corresponder exactamente a una regla matemática.

---

# Stack tecnológico

## Framework

SvelteKit

## Lenguaje

TypeScript estricto

No utilizar JavaScript.

Todos los archivos nuevos deberán escribirse en TypeScript.

## Renderizado matemático

KaTeX

## Estilos

TailwindCSS

## Tests

Vitest

## Linter

ESLint

## Formateador

Prettier

---

# Arquitectura

Toda la aplicación se ejecuta en el navegador.

Nunca crear:

- backend
- servidor
- API REST
- Express
- Node API
- Firebase
- Supabase
- Base de datos

No utilizar llamadas HTTP para resolver ejercicios.

El solver siempre será local.

---

# Organización

src/

    algebra/

        lexer/

        parser/

        ast/

        rules/

        solver/

        formatter/

        types/

        utils/

    components/

    routes/

    stores/

    lib/

    styles/

---

# El motor matemático

Todo el código matemático debe vivir dentro de

src/algebra

La interfaz nunca implementará lógica matemática.

La interfaz únicamente:

- recibe expresiones
- llama al solver
- muestra resultados

---

# AST

El AST es el núcleo del proyecto.

Nunca manipular expresiones mediante cadenas de texto.

Siempre convertir primero una expresión en un árbol.

Ejemplo

2(x+3)=10

↓

Equation

 Left

    Multiply

        Number(2)

        Add

            Variable(x)

            Number(3)

 Right

    Number(10)

Todas las reglas trabajan exclusivamente sobre el AST.

---

# Modelo de nodos

Cada nodo deberá ser un tipo discriminado.

Ejemplo

type Expr =
    | NumberNode
    | VariableNode
    | AddNode
    | MultiplyNode
    | DivideNode
    | PowerNode
    | EquationNode
    | ParenthesisNode

No utilizar clases innecesarias.

Preferir objetos inmutables.

---

# Inmutabilidad

Las reglas nunca modificarán un árbol existente.

Siempre devolverán un nuevo árbol.

Nunca mutar nodos.

---

# Sistema de reglas

Cada regla vive en un archivo.

Ejemplo

rules/

    distributive.ts

    combineLikeTerms.ts

    divideBothSides.ts

    simplifyFractions.ts

    removeParenthesis.ts

Cada regla implementa

interface Rule {

    readonly name: string;

    applies(expr: Expr): boolean;

    apply(expr: Expr): RuleResult;

}

---

# RuleResult

Cada regla devuelve

before

after

title

explanation

concept

difficulty

Nunca únicamente la expresión transformada.

---

# Solver

El solver nunca realiza operaciones directamente.

Su única responsabilidad es

buscar regla

↓

aplicarla

↓

guardar paso

↓

repetir

hasta que no existan más reglas.

---

# Prioridad

Las reglas tienen prioridad.

Ejemplo

1 eliminar signos

2 simplificar constantes

3 eliminar paréntesis

4 distributiva

5 términos semejantes

6 mover constantes

7 mover incógnitas

8 dividir

9 factorizar

10 fórmula general

---

# Nunca hacer

Nunca

2x+5=9

↓

x=2

Siempre

2x+5=9

↓

2x=9−5

↓

2x=4

↓

x=4/2

↓

x=2

---

# Explicaciones

Cada paso debe contener

qué hizo

por qué

concepto matemático

resultado

No generar explicaciones genéricas.

Las explicaciones deben ser pedagógicas.

---

# Componentes Svelte

Los componentes no contienen lógica matemática.

Ejemplos

ExpressionInput

StepViewer

MathExpression

RuleCard

ConceptCard

HistoryPanel

ExercisePanel

SettingsPanel

Cada componente debe tener una única responsabilidad.

---

# Estado

Utilizar Svelte Stores.

No crear estados globales innecesarios.

El AST y el resultado del solver deben ser datos reactivos.

---

# Renderizado

Todas las expresiones matemáticas se renderizan mediante KaTeX.

Nunca generar HTML matemático manualmente.

---

# Código

Priorizar

legibilidad

tipado fuerte

funciones pequeñas

inmutabilidad

composición

Evitar funciones de más de 50 líneas.

---

# Dependencias

Antes de añadir una librería preguntarse

¿realmente es necesaria?

Preferir implementar soluciones sencillas antes que instalar paquetes grandes.

---

# Objetivo educativo

Este proyecto no pretende competir con Wolfram Alpha.

Pretende ser el mejor tutor interactivo de álgebra.

Cada decisión de diseño debe favorecer la comprensión del estudiante antes que la rapidez del algoritmo.

---

# Reglas Adicionales

La IA nunca debe generar código duplicado.

Antes de crear un archivo nuevo debe buscar si ya existe una implementación equivalente.

Debe reutilizar tipos, utilidades y componentes existentes.

No debe crear múltiples representaciones del AST ni múltiples implementaciones del parser.

Antes de implementar una nueva característica, la IA debe comprobar si rompe la arquitectura existente.

Es preferible extender el sistema de reglas que introducir excepciones o código específico para un único caso.
