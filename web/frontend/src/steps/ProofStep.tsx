import { useState } from 'react'
import { apiPost } from '../api'
import { TokenizeData, ProofData } from '../App'
import { formatTime } from '../utils'
import ProgressBar from '../components/ProgressBar'

interface Props {
  tokenizeData: TokenizeData | null
  onComplete: (data: ProofData, elapsed: number) => void
}

export default function ProofStep({ tokenizeData: _tokenizeData, onComplete }: Props) {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<ProofData | null>(null)
  const [elapsed, setElapsed] = useState<number | null>(null)

  const generate = async () => {
    setLoading(true)
    setElapsed(null)
    const t0 = performance.now()
    try {
      const res = await apiPost<ProofData>('/generate-proof')
      setData(res)
      setElapsed(performance.now() - t0)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error')
    }
    setLoading(false)
  }

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
        <ProgressBar loading={loading} label="Writing PLL + building Merkle tree..." />
      </div>

      {data && (
        <>
          <div className="card">
            <h3 style={{ marginBottom: 12 }}>
              Proof Epoch Generated
              {elapsed !== null && (
                <span style={{ fontSize: 12, color: 'var(--color-gray)', fontWeight: 400, marginLeft: 8 }}>
                  ({formatTime(elapsed)})
                </span>
              )}
            </h3>
            <div className="stat-grid">
              <div className="stat-box">
                <div className="value">{data.record_count.toLocaleString()}</div>
                <div className="label">Merkle Leaves</div>
              </div>
              <div className="stat-box">
                <div className="value">{data.tree_depth}</div>
                <div className="label">Tree Depth</div>
              </div>
              <div className="stat-box">
                <div className="value">{formatTime(data.generation_time_ms)}</div>
                <div className="label">Server-side Time</div>
              </div>
              <div className="stat-box">
                <div className="value">{data.total_sum}</div>
                <div className="label">Total Liabilities (BTC)</div>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 style={{ marginBottom: 12 }}>Published Commitment</h3>
            <div style={{ padding: 16, background: 'var(--color-dark)', borderRadius: 8, color: 'white' }}>
              <div style={{ fontSize: 11, color: 'var(--color-gray-light)', textTransform: 'uppercase', marginBottom: 4 }}>
                Merkle Root (R)
              </div>
              <div className="mono" style={{ fontSize: 14, wordBreak: 'break-all' }}>
                {data.merkle_root}
              </div>
            </div>

            <div style={{ marginTop: 16, padding: 16, background: 'var(--color-bg)', borderRadius: 8 }}>
              <h4 style={{ marginBottom: 8, fontSize: 13 }}>Architecture</h4>
              <div style={{ fontSize: 13, lineHeight: 2 }}>
                <div><span className="badge badge-info">Auditor Layer</span> Verify Merkle leaves → Verify R<sub>root</sub> → Cryptographic binding</div>
                <div style={{ borderLeft: '2px solid var(--color-primary)', paddingLeft: 12, margin: '8px 0' }}>
                  <strong>Standard Merkle PoR</strong> — LPOR reuses the same construction above the PLL row
                </div>
                <div><span className="badge badge-success">User Layer</span> Verify inclusion in PLL → Verify total sum → Human-readable</div>
              </div>
            </div>
          </div>

          <button className="primary" onClick={() => onComplete(data, elapsed ?? 0)} style={{ marginTop: 16 }}>
            Continue to Verification →
          </button>
        </>
      )}
    </div>
  )
}
