import { useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
import katex from 'katex'
import { Sigma, Sparkles, ArrowRight, AlertCircle, BookOpen, ChevronRight, ArrowDown, Lightbulb } from 'lucide-react'
import { useSolve } from '../hooks/useSolve'
import type { Step } from '../services/api'

// ─── KaTeX helpers ────────────────────────────────────────────────────────────
function renderLatex(latex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(latex, { throwOnError: false, displayMode })
  } catch {
    return `<span style="color:#f43f5e">${latex}</span>`
  }
}

function InlineMath({ math }: { math: string }) {
  return (
    <span
      className="notranslate"
      translate="no"
      dangerouslySetInnerHTML={{ __html: renderLatex(math, false) }}
    />
  )
}

function BlockMath({ math }: { math: string }) {
  return (
    <div
      className="notranslate"
      translate="no"
      dangerouslySetInnerHTML={{ __html: renderLatex(math, true) }}
    />
  )
}

const EXAMPLES = [
  '2(x+3)=10',
  'x^2 - 4 = 0',
  '3x + 2 = 11',
  '2x + 5 = 9',
  'x/2 + 3 = 7',
  '3(x-1) = 2x+4',
]

// ─── Step Card ───────────────────────────────────────────────────────────────

function StepCard({ step, index }: { step: Step; index: number }) {
  return (
    <div
      className="step-card"
      style={{ animation: `fadeInUp 0.4s ease ${index * 0.07}s both` }}
    >
      <div className="step-number">{index + 1}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Rule name */}
        <p style={{
          color: 'var(--accent-light)',
          fontSize: '0.78rem',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: 1,
          marginBottom: 10,
        }}>
          {step.rule_name}
        </p>

        {/* Before → After */}
        <div className="notranslate" translate="no" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
          <div style={{
            padding: '8px 14px',
            background: 'rgba(255,255,255,0.04)',
            borderRadius: 8,
            border: '1px solid var(--border)',
          }}>
            <InlineMath math={step.before_latex} />
          </div>
          <ArrowRight size={16} color="var(--text-muted)" style={{ flexShrink: 0 }} />
          <div style={{
            padding: '8px 14px',
            background: 'rgba(139,92,246,0.08)',
            borderRadius: 8,
            border: '1px solid rgba(139,92,246,0.25)',
          }}>
            <InlineMath math={step.after_latex} />
          </div>
        </div>

        {/* Explanation */}
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: 4, lineHeight: 1.5 }}>
          {step.explanation}
        </p>

        {/* Concept */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <Lightbulb size={12} color="var(--text-muted)" />
          <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontStyle: 'italic' }}>
            {step.concept}
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AlgebraTutor() {
  const [expression, setExpression] = useState('')
  const { mutate, data, isPending, isError, error, reset } = useSolve()

  const handleSubmit = (e?: FormEvent) => {
    e?.preventDefault()
    const trimmed = expression.trim()
    if (!trimmed) return
    mutate(trimmed)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSubmit()
  }

  const handleExample = (ex: string) => {
    setExpression(ex)
    reset()
    setTimeout(() => mutate(ex), 50)
  }

  const hasSteps = data && data.steps.length > 0
  const isAlreadySimplified = data && data.steps.length === 0

  return (
    <div style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden' }}>
      {/* Background orbs */}
      <div className="bg-orb" style={{ width: 600, height: 600, top: -200, left: -200, background: 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)' }} />
      <div className="bg-orb" style={{ width: 500, height: 500, bottom: -150, right: -150, background: 'radial-gradient(circle, rgba(96,165,250,0.1) 0%, transparent 70%)' }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 820, margin: '0 auto', padding: '80px 24px 120px' }}>

        {/* ── Header ── */}
        <div className="animate-fade-in-up" style={{ textAlign: 'center', marginBottom: 56 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
            <div style={{ width: 48, height: 48, background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 32px rgba(139,92,246,0.4)' }}>
              <Sigma size={24} color="white" />
            </div>
            <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--accent-light)', letterSpacing: 2, textTransform: 'uppercase' }}>
              Algebra Tutor
            </span>
          </div>
          <h1 style={{ fontSize: 'clamp(2.4rem, 6vw, 3.5rem)', fontWeight: 700, lineHeight: 1.1, marginBottom: 16 }}>
            Aprende matemáticas{' '}
            <span className="gradient-text">paso a paso</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', maxWidth: 500, margin: '0 auto', lineHeight: 1.6 }}>
            Motor algebraico propio. No calculadora — tutor. Cada transformación explicada con su razón matemática.
          </p>
        </div>

        {/* ── Input ── */}
        <div className="glass-card animate-fade-in-up-delay-1" style={{ padding: '28px 32px', marginBottom: 16 }}>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12 }}>
                <ChevronRight size={20} color="var(--accent)" style={{ flexShrink: 0 }} />
                <input
                  id="expression-input"
                  className="math-input"
                  type="text"
                  value={expression}
                  onChange={(e) => { setExpression(e.target.value); reset() }}
                  onKeyDown={handleKeyDown}
                  placeholder="Escribe una expresión… p.ej. 2(x+3)=10"
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
              <button
                id="solve-button"
                type="submit"
                className="solve-button"
                disabled={isPending || !expression.trim()}
              >
                {isPending ? <div className="spinner" /> : <Sparkles size={16} />}
                {isPending ? 'Calculando…' : 'Resolver'}
              </button>
            </div>
          </form>
        </div>

        {/* ── Examples ── */}
        <div className="animate-fade-in-up-delay-2" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 48, paddingLeft: 4 }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 4, marginRight: 4 }}>
            <BookOpen size={13} /> Ejemplos:
          </span>
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              id={`example-${ex.replace(/[\s=^*/()+]/g, '-')}`}
              className="example-chip"
              onClick={() => handleExample(ex)}
            >
              {ex} <ArrowRight size={11} />
            </button>
          ))}
        </div>

        {/* ── Error ── */}
        {isError && (
          <div className="error-badge result-container" style={{ marginBottom: 24 }}>
            <AlertCircle size={16} />
            <span>
              {error instanceof Error ? error.message : 'Error al conectar con el servidor. ¿Está el backend en marcha?'}
            </span>
          </div>
        )}

        {/* ── Result ── */}
        {data && (
          <div className="result-container">

            {/* Input expression */}
            <div className="glass-card" style={{ padding: '28px 32px', marginBottom: 16 }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
                Expresión de entrada
              </p>
              <div className="notranslate" translate="no" style={{ textAlign: 'center' }}>
                <BlockMath math={data.input_latex} />
              </div>
            </div>

            {/* Steps */}
            {hasSteps && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 4px', marginBottom: 12 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 8px var(--accent)' }} />
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
                    {data.steps.length} paso{data.steps.length !== 1 ? 's' : ''} de simplificación
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {data.steps.map((step, i) => (
                    <StepCard key={i} step={step} index={i} />
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0' }}>
                  <ArrowDown size={18} color="var(--accent)" style={{ opacity: 0.5 }} />
                </div>
              </div>
            )}

            {/* Result */}
            <div className="glass-card" style={{ padding: '32px 40px', textAlign: 'center' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>
                {isAlreadySimplified ? 'Expresión (ya simplificada)' : 'Resultado final'}
              </p>
              <div className="notranslate" translate="no" style={{
                padding: '28px 20px',
                background: 'rgba(139,92,246,0.06)',
                borderRadius: 16,
                border: '1px solid rgba(139,92,246,0.2)',
                overflowX: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                {data.is_quadratic ? (
                  data.solutions.length === 0 ? (
                    <div style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', fontWeight: 500 }}>
                      La ecuación no tiene soluciones reales en <InlineMath math="\mathbb{R}" />
                    </div>
                  ) : (
                    data.solutions.map((sol, i) => (
                      <BlockMath key={i} math={sol} />
                    ))
                  )
                ) : (
                  <BlockMath math={data.result_latex} />
                )}
              </div>
              {isAlreadySimplified && (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: 14 }}>
                  Esta expresión ya está en su forma más simple.
                  <br />
                  Prueba ecuaciones como <code>2(x+3)=10</code>, <code>3x+2x=10</code> o <code>x/2+3=7</code>.
                </p>
              )}
            </div>

          </div>
        )}

        {/* ── Empty state ── */}
        {!data && !isError && !isPending && (
          <div className="animate-fade-in-up-delay-3" style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ marginBottom: 20, opacity: 0.4 }}>
              <InlineMath math="\int_a^b f(x)\,dx = F(b) - F(a)" />
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Introduce cualquier expresión o ecuación algebraica para comenzar
            </p>
          </div>
        )}

      </div>
    </div>
  )
}
