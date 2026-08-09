import { useState, useRef } from 'react'
import { apiPost } from '../api'
import { TokenizeData, ProofData, StepMode } from '../DemoPage'
import { formatTime } from '../utils'
import ProgressBar from '../components/ProgressBar'

interface Props {
  mode: StepMode
  tokenizeData: TokenizeData | null
  storedData?: ProofData | null
  storedElapsed?: number | null
  onComplete: (data: ProofData, elapsed: number) => void
}

export default function ProofStep({ mode, tokenizeData: _tokenizeData, storedData, storedElapsed, onComplete }: Props) {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<ProofData | null>(null)
  const [elapsed, setElapsed] = useState<number | null>(null)
  const resultRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const generate = async () => {
    setLoading(true)
    setElapsed(null)
    const t0 = performance.now()
    try {
      const res = await apiPost<ProofData>('/generate-proof')
      setData(res)
      setElapsed(performance.now() - t0)
      setTimeout(() => buttonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 150)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error')
    }
    setLoading(false)
  }

  // Use stored data for detail mode
  const displayData = mode === 'detail' ? storedData : data
  const displayElapsed = mode === 'detail' ? storedElapsed : elapsed

  // Results view
  const resultsView = displayData && (
    <>
      <div className="card">
        <h3 style={{ marginBottom: 12 }}>
          Proof Epoch Generated
          {displayElapsed != null && (
            <span style={{ fontSize: 12, color: 'var(--color-gray)', fontWeight: 400, marginLeft: 8 }}>
              ({formatTime(displayElapsed)})
            </span>
          )}
        </h3>
        <div className="stat-grid">
          <div className="stat-box">
            <div className="value">{displayData.record_count.toLocaleString()}</div>
            <div className="label">Merkle Leaves</div>
          </div>
          <div className="stat-box">
            <div className="value">{displayData.tree_depth}</div>
            <div className="label">Tree Depth</div>
          </div>
          <div className="stat-box">
            <div className="value">{formatTime(displayData.generation_time_ms)}</div>
            <div className="label">Server-side Time</div>
          </div>
          <div className="stat-box">
            <div className="value">{displayData.total_sum}</div>
            <div className="label">Total Liabilities (BTC)</div>
          </div>
        </div>
      </div>

      {/* Solvency comparison: Liabilities vs Reserves */}
      <div className="card">
        <h3 style={{ marginBottom: 12 }}>Published Commitment</h3>
        <div style={{ padding: 16, background: 'var(--color-dark)', borderRadius: 8, color: 'white' }}>
          <div style={{ fontSize: 11, color: 'var(--color-gray-light)', textTransform: 'uppercase', marginBottom: 4 }}>
            Merkle Root (R)
          </div>
          <div className="mono" style={{ fontSize: 14, wordBreak: 'break-all' }}>
            {displayData.merkle_root}
          </div>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}>Solvency Snapshot</h3>
          <span style={{ fontSize: 12, color: 'var(--color-gray)' }}>
            {new Date().toISOString().slice(0, 19).replace('T', ' ')} UTC
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <div className="stat-box" style={{ border: '2px solid #fecaca', flex: 1 }}>
            <div className="value">{displayData.total_sum}</div>
            <div className="label">Total Liabilities (PLL)</div>
          </div>
          <div style={{ fontSize: 28, color: 'var(--color-success)', fontWeight: 700 }}>≤</div>
          <div className="stat-box" style={{ border: '2px solid #bbf7d0', flex: 1 }}>
            <div className="value">{(Number(displayData.total_sum) * 1.2).toFixed(2)}</div>
            <div className="label">CEX On-chain Reserves</div>
          </div>
        </div>
        <div style={{ marginTop: 12, fontSize: 13 }}>
          <strong>Exchange Reserve Address:</strong>
          <div style={{ marginTop: 4 }}>
            <code className="mono" style={{ fontSize: 11 }}>bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq</code>
            {' '}
            <a
              href="https://mempool.space/address/bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq"
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: 12, color: 'var(--color-primary)' }}
            >
              View on mempool.space ↗
            </a>
          </div>
        </div>
      </div>
    </>
  )

  // Detail mode
  if (mode === 'detail') {
    return <div>{resultsView}</div>
  }

  // Active mode
  return (
    <div>
      <div className="card">
        <p style={{ color: 'var(--color-gray)', marginBottom: 16 }}>
          Build a Merkle tree over all PLL records. Each leaf is L<sub>i</sub> = SHA-256(UUID || token || value).
          The root R is the binding commitment published by the exchange.
        </p>
        <button className="primary" onClick={generate} disabled={loading}>
          {loading ? 'Building Tree...' : 'Generate Proof'}
        </button>
        <ProgressBar loading={loading} label="Building Merkle tree..." />
      </div>

      {resultsView && <div ref={resultRef}>{resultsView}</div>}

      {data && (
        <button ref={buttonRef} className="primary" onClick={() => onComplete(data, elapsed ?? 0)} style={{ marginTop: 16 }}>
          Continue to Verification →
        </button>
      )}
    </div>
  )
}
