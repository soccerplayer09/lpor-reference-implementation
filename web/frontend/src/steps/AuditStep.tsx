import { useState, useEffect } from 'react'
import { apiPost, apiGet } from '../api'
import { ProofData } from '../App'

interface Props {
  proofData: ProofData | null
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

export default function AuditStep({ proofData: _proofData }: Props) {
  const [auditorResult, setAuditorResult] = useState<AuditorResult | null>(null)
  const [auditResults, setAuditResults] = useState<AuditResults | null>(null)
  const [script, setScript] = useState<ScriptData | null>(null)
  const [loading, setLoading] = useState(false)
  const [verifierName, setVerifierName] = useState('')
  const [submitting, setSubmitting] = useState(false)

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
    setLoading(true)
    try {
      const res = await apiPost<AuditorResult>('/verify/auditor')
      setAuditorResult(res)
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

  const submitVerification = async () => {
    if (!verifierName || !auditorResult) return
    setSubmitting(true)
    try {
      await apiPost('/audit/submit', {
        verifier_name: verifierName,
        computed_root: auditorResult.computed_root,
      })
      setVerifierName('')
      loadAuditResults()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error')
    }
    setSubmitting(false)
  }

  return (
    <div>
      <div className="card">
        <h2 style={{ marginBottom: 8 }}>Step 5: Public Audit</h2>
        <p style={{ color: 'var(--color-gray)', marginBottom: 16 }}>
          Any independent party can download the PLL, recompute the Merkle root,
          and verify it matches the exchange's published commitment.
        </p>

        <div style={{ display: 'flex', gap: 12 }}>
          <button className="primary" onClick={runAuditVerification} disabled={loading}>
            {loading ? 'Verifying...' : 'Run Auditor Verification'}
          </button>
          <button className="primary" onClick={downloadScript} style={{ background: 'var(--color-dark)' }}>
            View Verification Script
          </button>
          <a href="/api/pll/download" download style={{ textDecoration: 'none' }}>
            <button className="primary" style={{ background: '#475569' }}>
              ↓ Download PLL
            </button>
          </a>
        </div>
      </div>

      {auditorResult && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            {auditorResult.verification_passed ? (
              <span style={{ fontSize: 36 }}>✅</span>
            ) : (
              <span style={{ fontSize: 36 }}>❌</span>
            )}
            <div>
              <h3>{auditorResult.verification_passed ? 'Verification PASSED' : 'Verification FAILED'}</h3>
              <p style={{ color: 'var(--color-gray)', fontSize: 13 }}>
                Merkle root recomputed in {auditorResult.verification_time_ms.toFixed(1)}ms
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

          {/* Submit verification */}
          <div style={{ marginTop: 16, padding: 16, background: 'var(--color-bg)', borderRadius: 8 }}>
            <h4 style={{ marginBottom: 8 }}>Register Your Verification</h4>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                placeholder="Your name"
                value={verifierName}
                onChange={e => setVerifierName(e.target.value)}
                style={{ padding: '8px 12px', border: '1px solid var(--color-gray-light)', borderRadius: 6, flex: 1 }}
              />
              <button className="primary" onClick={submitVerification} disabled={submitting || !verifierName}>
                Submit
              </button>
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
          <h3 style={{ marginBottom: 12 }}>Verification Consensus</h3>
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
              <tr><th>Verifier</th><th>Result</th><th>Timestamp</th></tr>
            </thead>
            <tbody>
              {auditResults.submissions.map((s, i) => (
                <tr key={i}>
                  <td>{s.verifier_name}</td>
                  <td>
                    {s.roots_match
                      ? <span className="badge badge-success">✓ Match</span>
                      : <span className="badge badge-danger">✗ Mismatch</span>
                    }
                  </td>
                  <td style={{ fontSize: 11, color: 'var(--color-gray)' }}>
                    {new Date(s.timestamp).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
