import { useState } from 'react'
import { Link } from 'react-router-dom'
import './LandingPpt.css'

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

export default function LandingPpt() {
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
    <div className="landing-ppt">
      {/* Hero */}
      <header className="lp-hero">
        <h1 className="lp-title">{PAPER_TITLE}</h1>
        <div className="lp-venue-badge">{VENUE}</div>
        <nav className="lp-nav">
          <a href="#" className="lp-btn lp-btn-solid">📄 Paper</a>
          <a href="#slides" className="lp-btn lp-btn-solid">📊 Slides</a>
          <a href="https://github.com/donggookim/lpor-reference-implementation" className="lp-btn lp-btn-solid" target="_blank" rel="noopener noreferrer">💻 GitHub</a>
          <Link to="/demo" className="lp-btn lp-btn-accent">🚀 Demo</Link>
        </nav>
      </header>

      {/* Abstract + Paper Preview */}
      <section className="lp-section lp-section-alt">
        <div className="lp-abstract-grid">
          <div className="lp-paper-preview">
            <img src="/assets/paper-page1.png" alt="Paper first page" />
          </div>
          <div className="lp-abstract">
            <h2>Abstract</h2>
            <p>{ABSTRACT}</p>
          </div>
        </div>
      </section>

      {/* Slide Viewer */}
      <section className="lp-section" id="slides">
        <h2 className="lp-section-title">Presentation</h2>
        <div className="lp-slide-viewer">
          <div className="lp-slide-container">
            <img
              src={`/assets/slides/slide-${String(currentSlide).padStart(2, '0')}.png`}
              alt={`Slide ${currentSlide}`}
            />
          </div>
          <div className="lp-slide-controls">
            <button onClick={prevSlide} disabled={currentSlide === 1} className="lp-btn lp-btn-solid">
              ← Prev
            </button>
            <span className="lp-slide-counter">{currentSlide} / {TOTAL_SLIDES}</span>
            <button onClick={nextSlide} disabled={currentSlide === TOTAL_SLIDES} className="lp-btn lp-btn-solid">
              Next →
            </button>
          </div>
        </div>
      </section>

      {/* Citation */}
      <section className="lp-section lp-section-alt">
        <h2 className="lp-section-title">Citation</h2>
        <div className="lp-citation">
          <pre><code>{BIBTEX}</code></pre>
          <button onClick={copyBibtex} className="lp-btn lp-btn-solid lp-copy-btn">
            {copied ? '✓ Copied' : '📋 Copy BibTeX'}
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="lp-footer">
        <p>Apache 2.0 · © 2026 LPOR Research Team</p>
      </footer>
    </div>
  )
}
