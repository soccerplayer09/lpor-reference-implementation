import { useState } from 'react'
import { Link } from 'react-router-dom'
import './LandingHybrid.css'

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

export default function LandingHybrid() {
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
    <div className="landing-hybrid">
      {/* Dark Hero */}
      <header className="lh-hero">
        <h1 className="lh-title">{PAPER_TITLE}</h1>
        <div className="lh-venue-badge">{VENUE}</div>
        <nav className="lh-nav">
          <a href="#" className="lh-btn lh-btn-ghost">📄 Paper</a>
          <a href="#slides" className="lh-btn lh-btn-ghost">📊 Slides</a>
          <a href="https://github.com/donggookim/lpor-reference-implementation" className="lh-btn lh-btn-ghost" target="_blank" rel="noopener noreferrer">💻 GitHub</a>
          <Link to="/demo" className="lh-btn lh-btn-primary">🚀 Demo</Link>
        </nav>
      </header>

      {/* Light Abstract Section */}
      <section className="lh-section-light">
        <div className="lh-abstract-grid">
          <div className="lh-paper-preview">
            <img src="/assets/paper-page1.png" alt="Paper first page" />
          </div>
          <div className="lh-abstract">
            <h2>Abstract</h2>
            <p>{ABSTRACT}</p>
          </div>
        </div>
      </section>

      {/* Light Slide Viewer */}
      <section className="lh-section-light lh-section-gray" id="slides">
        <h2 className="lh-section-title">Presentation</h2>
        <div className="lh-slide-viewer">
          <div className="lh-slide-container">
            <img
              src={`/assets/slides/slide-${String(currentSlide).padStart(2, '0')}.png`}
              alt={`Slide ${currentSlide}`}
            />
          </div>
          <div className="lh-slide-controls">
            <button onClick={prevSlide} disabled={currentSlide === 1} className="lh-btn lh-btn-outline-dark">
              ← Prev
            </button>
            <span className="lh-slide-counter">{currentSlide} / {TOTAL_SLIDES}</span>
            <button onClick={nextSlide} disabled={currentSlide === TOTAL_SLIDES} className="lh-btn lh-btn-outline-dark">
              Next →
            </button>
          </div>
        </div>
      </section>

      {/* Dark Citation Section */}
      <section className="lh-section-dark">
        <h2 className="lh-section-title-light">Citation</h2>
        <div className="lh-citation">
          <pre><code>{BIBTEX}</code></pre>
          <button onClick={copyBibtex} className="lh-btn lh-btn-ghost lh-copy-btn">
            {copied ? '✓ Copied' : '📋 Copy BibTeX'}
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="lh-footer">
        <p>Apache 2.0 · © 2026 LPOR Research Team</p>
      </footer>
    </div>
  )
}
