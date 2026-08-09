import { useState } from 'react'
import { Link } from 'react-router-dom'
import './LandingAcademic.css'

const TOTAL_SLIDES = 10
const PAPER_TITLE = 'LPOR: A Layered Proof of Reserves Framework for Usable and Publicly Auditable Solvency Verification'
const VENUE = 'IEEE ICBC 2026 · Brisbane, Australia'
const ABSTRACT = `LPOR (Layered Proof of Reserves) is a framework that makes cryptocurrency exchange solvency verification both cryptographically sound and practically usable by everyday users. The core insight: a technically valid proof that nobody verifies provides weak practical transparency. LPOR treats usability itself as a security parameter, organizing Proof of Reserves into layers — Commitment, Proof Generation, Verification, and Public Audit — each designed to be independently understandable and verifiable. This layered approach bridges the gap between cryptographic rigor and real-world adoption, enabling community-level solvency checks without requiring users to trust the exchange.`
const BIBTEX = `@inproceedings{lpor2026,
  title     = {LPOR: A Layered Proof of Reserves Framework for Usable and Publicly Auditable Solvency Verification},
  author    = {Kim, Donggoo},
  booktitle = {2026 IEEE International Conference on Blockchain and Cryptocurrency (ICBC)},
  year      = {2026},
  publisher = {IEEE},
  address   = {Brisbane, Australia}
}`

export default function LandingAcademic() {
  const [currentSlide, setCurrentSlide] = useState(1)
  const [copied, setCopied] = useState(false)

  const prevSlide = () => setCurrentSlide(s => Math.max(1, s - 1))
  const nextSlide = () => setCurrentSlide(s => Math.min(TOTAL_SLIDES, s + 1))

  const copyBibtex = () => {
    navigator.clipboard.writeText(BIBTEX)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="landing-academic">
      {/* Hero */}
      <header className="la-hero">
        <h1 className="la-title">{PAPER_TITLE}</h1>
        <div className="la-venue-badge">{VENUE}</div>
        <nav className="la-nav">
          <a href="#" className="la-btn la-btn-outline">📄 Paper</a>
          <a href="#slides" className="la-btn la-btn-outline">📊 Slides</a>
          <a href="https://github.com/donggookim/lpor-reference-implementation" className="la-btn la-btn-outline" target="_blank" rel="noopener noreferrer">💻 GitHub</a>
          <Link to="/demo" className="la-btn la-btn-primary">🚀 Demo</Link>
        </nav>
      </header>

      {/* Abstract + Paper Preview */}
      <section className="la-section la-section-alt">
        <div className="la-abstract-grid">
          <div className="la-paper-preview">
            <img src="/assets/paper-page1.png" alt="Paper first page" />
          </div>
          <div className="la-abstract">
            <h2>Abstract</h2>
            <p>{ABSTRACT}</p>
          </div>
        </div>
      </section>

      {/* Slide Viewer */}
      <section className="la-section" id="slides">
        <h2 className="la-section-title">Presentation</h2>
        <div className="la-slide-viewer">
          <div className="la-slide-container">
            <img
              src={`/assets/slides/slide-${String(currentSlide).padStart(2, '0')}.png`}
              alt={`Slide ${currentSlide}`}
            />
          </div>
          <div className="la-slide-controls">
            <button onClick={prevSlide} disabled={currentSlide === 1} className="la-btn la-btn-outline">
              ← Prev
            </button>
            <span className="la-slide-counter">{currentSlide} / {TOTAL_SLIDES}</span>
            <button onClick={nextSlide} disabled={currentSlide === TOTAL_SLIDES} className="la-btn la-btn-outline">
              Next →
            </button>
          </div>
        </div>
      </section>

      {/* Citation */}
      <section className="la-section la-section-alt">
        <h2 className="la-section-title">Citation</h2>
        <div className="la-citation">
          <pre><code>{BIBTEX}</code></pre>
          <button onClick={copyBibtex} className="la-btn la-btn-outline la-copy-btn">
            {copied ? '✓ Copied' : '📋 Copy BibTeX'}
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="la-footer">
        <p>Apache 2.0 · © 2026 LPOR Research Team</p>
      </footer>
    </div>
  )
}
