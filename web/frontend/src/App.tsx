import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import DemoPage from './DemoPage'

function LandingPage() {
  return (
    <div className="container" style={{ paddingTop: 64, paddingBottom: 64 }}>
      <h1 style={{ fontSize: 36, fontWeight: 700, marginBottom: 16 }}>
        LPOR
      </h1>
      <p style={{ fontSize: 18, color: 'var(--color-gray)', marginBottom: 32 }}>
        Layered Proof of Reserves — Usable and Publicly Auditable Solvency Verification
      </p>
      <Link to="/demo">
        <button className="primary" style={{ padding: '14px 28px', fontSize: 16 }}>
          Launch Interactive Demo →
        </button>
      </Link>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/demo" element={<DemoPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
