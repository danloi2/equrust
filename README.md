# Algebra Tutor

> Un motor algebraico de código abierto y especializado en educación, diseñado para explicar el razonamiento paso a paso al resolver ecuaciones. Actualmente se encuentra en desarrollo.

![Screenshot](./frontend/public/screenshot.png) <!-- TODO: Add an actual screenshot -->

Algebra Tutor no es solo una calculadora, sino una herramienta pensada para enseñar. Funciona procesando expresiones matemáticas, estructurándolas en un Árbol de Sintaxis Abstracta (AST) propio, y aplicando iterativamente reglas algebraicas pedagógicas hasta encontrar la solución, explicando en cada paso la regla usada y el porqué.

## Características

* 🧠 **Motor propio**: No utiliza motores CAS externos. Todo el motor se ha escrito desde cero en Rust.
* 📝 **Razonamiento paso a paso**: Muestra exactamente cómo y por qué se ha pasado de una línea a otra.
* ⚡ **Eficiencia en Backend**: Escrito en Rust utilizando Axum, proporcionando tiempos de resolución extremadamente bajos.
* 🎨 **Frontend moderno e interactivo**: Una interfaz escrita en React + TypeScript y estilizada con Tailwind CSS. Representación matemática nativa mediante KaTeX.
* 📏 **Reglas estructuradas**: Cada transformación (Propiedad distributiva, Reducción de términos, Fórmula de Bhaskara, Raíces Cuadradas) existe como un módulo de regla independiente, haciendo que la arquitectura sea escalable.

## Estructura del Proyecto

El repositorio está dividido en dos partes principales:

1. **`/backend`**: Motor algebraico y API. Escrito en Rust (Axum, Chumsky).
2. **`/frontend`**: Interfaz de usuario. Escrito en React (TypeScript, Vite, Tailwind CSS, KaTeX).

## Requisitos Previos

* [Rust (Cargo)](https://rustup.rs/) (versión stable)
* [Node.js](https://nodejs.org/) y [pnpm](https://pnpm.io/)

## Instalación y Ejecución Local

### 1. Clonar el repositorio
```bash
git clone https://github.com/tu-usuario/algebra-tutor.git
cd algebra-tutor
```

### 2. Arrancar el Backend (Rust)
Abre una terminal y ejecuta:
```bash
cd backend
cargo run --bin api
```
*La API se ejecutará en `http://localhost:3000`.*

### 3. Arrancar el Frontend (React)
Abre otra terminal y ejecuta:
```bash
cd frontend
pnpm install
pnpm run dev
```
*El cliente web se abrirá normalmente en `http://localhost:5173`.*

## Arquitectura

```text
             React (Frontend)
               │
               │ REST (JSON)
               ▼
            Axum API
               │
        ┌──────────────┐
        │ Algebra Core │
        └──────────────┘
               │
    ┌──────────────────────┐
    │ Lexer (Chumsky)      │
    │ Parser               │
    │ AST Builder          │
    │ Rules Engine         │
    │ Solver               │
    │ Formatter (LaTeX)    │
    └──────────────────────┘
```

## Contribuir

¡Las contribuciones son bienvenidas! Si quieres añadir más reglas algebraicas (sistemas de ecuaciones, polinomios de grados superiores, derivadas, integrales...), siéntete libre de clonar el proyecto y enviar un *Pull Request*.

## Licencia

Este proyecto es Open Source.
