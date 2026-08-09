import { useState, useEffect, useRef } from 'react'
import { apiPost, apiGet } from '../api'
import { ProofData } from '../App'
import { formatTime } from '../utils'
import ProgressBar from '../components/ProgressBar'

interface Props {
  proofData: ProofData | null
  onVerified?: () => void
}

interface AuditorResult {
  published_root: string
  computed_root: string
  roots_match: boolean
  verification_passed: boolean
  record_count: number
  total_sum: string
  verification_time_ms: number
}

interface AuditResults {
  published_root: string
  submissions: { verifier_name: string; computed_root: string; roots_match: boolean; timestamp: string }[]
  total_verifiers: number
  matching_count: number
}

interface ScriptData {
  filename: string
  content: string
}

export default function AuditStep({ proofData: _proofData, onVerified }: Props) {
  const [auditorResult, setAuditorResult] = useState<AuditorResult | null>(null)
  const [auditResults, setAuditResults] = useState<AuditResults | null>(null)
  const [script, setScript] = useState<ScriptData | null>(null)
  const [loading, setLoading] = useState(false)
  const [elapsed, setElapsed] = useState<number | null>(null)
  const [verifierName, setVerifierName] = useState('Transparency Labs')
  const resultRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadAuditResults()
  }, [])

  const loadAuditResults = async () => {
    try {
      const res = await apiGet<AuditResults>('/audit/results')
      setAuditResults(res)
    } catch { /* ignore */ }
  }

  const runAuditVerification = async () => {
    if (!verifierName.trim()) {
      alert('Please enter a verifier name')
      return
    }
    setLoading(true)
    setElapsed(null)
    const t0 = performance.now()
    try {
      const res = await apiPost<AuditorResult>('/verify/auditor')
      setAuditorResult(res)
      setElapsed(performance.now() - t0)

      // Auto-register the verification result
      if (res.verification_passed) {
        await apiPost('/audit/submit', {
          verifier_name: verifierName.trim(),
          computed_root: res.computed_root,
        })
        loadAuditResults()
      }
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 150)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error')
    }
    setLoading(false)
  }

  const downloadScript = async () => {
    try {
      const res = await apiGet<ScriptData>('/script/download')
      setScript(res)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error')
    }
  }

  return (
    <div>
      <div className="card">
        <h3 style={{ marginBottom: 8 }}>Public Audit</h3>
        <p style={{ color: 'var(--color-gray)', marginBottom: 16 }}>
          Any independent party can download the PLL, recompute the Merkle root,
          and verify it matches the exchange's published commitment.
        </p>

        <div style={{ display: 'flex', gap: 12, alignItems: 'end', flexWrap: 'wrap', marginBottom: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Verifier Name</label>
            <input
              type="text"
              value={verifierName}
              onChange={e => setVerifierName(e.target.value)}
              placeholder="Transparency Labs"
              style={{ padding: '8px 12px', border: '1px solid var(--color-gray-light)', borderRadius: 6, minWidth: 200 }}
            />
          </div>
          <button className="primary" onClick={runAuditVerification} disabled={loading || !verifierName.trim()}>
            {loading ? 'Verifying...' : 'Run Auditor Verification'}
          </button>
          <button className="primary" onClick={downloadScript} style={{ background: 'var(--color-dark)' }}>
            View Script
          </button>
          <a href="/api/pll/download" download style={{ textDecoration: 'none' }}>
            <button className="primary" style={{ background: '#475569' }}>
              ↓ PLL
            </button>
          </a>
        </div>
        <ProgressBar loading={loading} label="Recomputing Merkle root from PLL..." />
      </div>

      {auditorResult && (
        <div className="card" ref={resultRef}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            {auditorResult.verification_passed ? (
              <span style={{ fontSize: 36 }}>✅</span>
            ) : (
              <span style={{ fontSize: 36 }}>❌</span>
            )}
            <div>
              <h3>
                {auditorResult.verification_passed ? 'Verification PASSED' : 'Verification FAILED'}
                {elapsed !== null && (
                  <span style={{ fontSize: 12, color: 'var(--color-gray)', fontWeight: 400, marginLeft: 8 }}>
                    ({formatTime(elapsed)})
                  </span>
                )}
              </h3>
              <p style={{ color: 'var(--color-gray)', fontSize: 13 }}>
                Verified by <strong>{verifierName}</strong> — server-side: {formatTime(auditorResult.verification_time_ms)}
              </p>
            </div>
          </div>

          <div style={{ fontSize: 13 }}>
            <div style={{ marginBottom: 8 }}>
              <strong>Published root:</strong>{' '}
              <code className="mono">{auditorResult.published_root.slice(0, 32)}…</code>
            </div>
            <div style={{ marginBottom: 8 }}>
              <strong>Computed root:</strong>{' '}
              <code className="mono">{auditorResult.computed_root.slice(0, 32)}…</code>
            </div>
            <div style={{ marginBottom: 8 }}>
              <strong>Records verified:</strong> {auditorResult.record_count.toLocaleString()}
            </div>
            <div>
              <strong>Total sum:</strong> {auditorResult.total_sum} BTC
            </div>
          </div>
        </div>
      )}

      {script && (
        <div className="card">
          <h3 style={{ marginBottom: 8 }}>Verification Script ({script.filename})</h3>
          <p style={{ fontSize: 12, color: 'var(--color-gray)', marginBottom: 8 }}>
            Run this locally: <code>python {script.filename} pll.csv {'<merkle_root>'}</code>
          </p>
          <pre style={{
            background: 'var(--color-dark)', color: '#e2e8f0', padding: 16,
            borderRadius: 8, fontSize: 12, overflow: 'auto', maxHeight: 300,
          }}>
            {script.content}
          </pre>
        </div>
      )}

      {auditResults && auditResults.submissions.length > 0 && (
        <div className="card">
          <h3 style={{ marginBottom: 12 }}>Verification Evidence</h3>
          <div className="stat-grid">
            <div className="stat-box">
              <div className="value">{auditResults.total_verifiers}</div>
              <div className="label">Independent Verifiers</div>
            </div>
            <div className="stat-box">
              <div className="value">{auditResults.matching_count}/{auditResults.total_verifiers}</div>
              <div className="label">Confirm Root Match</div>
            </div>
          </div>
          <table style={{ marginTop: 12 }}>
            <thead>
              <tr><th>#</th><th>Verifier</th><th>Result</th><th>Verified At</th></tr>
            </thead>
            <tbody>
              {auditResults.submissions.map((s, i) => (
                <tr key={i}>
                  <td style={{ color: 'var(--color-gray)' }}>{i + 1}</td>
                  <td><strong>{s.verifier_name}</strong></td>
                  <td>
                    {s.roots_match
                      ? <span className="badge badge-success">✓ Match</span>
                      : <span className="badge badge-danger">✗ Mismatch</span>
                    }
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--color-gray)', fontFamily: 'monospace' }}>
                    {new Date(s.timestamp).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {auditorResult && auditorResult.verification_passed && onVerified && (
        <button className="primary" onClick={onVerified} style={{ marginTop: 16 }}>
          Continue to User Verification →
        </button>
      )}
    </div>
  )
}
