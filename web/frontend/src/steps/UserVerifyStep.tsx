import { useState, useEffect, useRef } from 'react'
import { apiPost, apiGet } from '../api'
import { UserRecord, ProofData } from '../App'
import { formatTime } from '../utils'
import ProgressBar from '../components/ProgressBar'
import type { VerificationReportData } from '../components/VerificationReportPDF'

interface Props {
  users: UserRecord[]
  proofData: ProofData | null
}

interface VerifyResult {
  user_id: string
  balance: string
  tokens_expected: number
  tokens_found: number
  all_included: boolean
  found_records: { uuid: string; token: string; value: string }[]
  missing_uuids: string[]
  total_liabilities: string
}

interface AuditResults {
  submissions: { verifier_name: string; roots_match: boolean; timestamp: string }[]
  total_verifiers: number
  matching_count: number
}

export default function UserVerifyStep({ users, proofData }: Props) {
  const [selectedUser, setSelectedUser] = useState<string>(users[0]?.user_id || '')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<VerifyResult | null>(null)
  const [elapsed, setElapsed] = useState<number | null>(null)
  const [auditEvidence, setAuditEvidence] = useState<AuditResults | null>(null)
  const resultRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    apiGet<AuditResults>('/audit/results').then(setAuditEvidence).catch(() => {})
  }, [])

  const verify = async () => {
    if (!selectedUser) return
    setLoading(true)
    setElapsed(null)
    const t0 = performance.now()
    try {
      const res = await apiPost<VerifyResult>('/verify/user', { user_id: selectedUser })
      setResult(res)
      setElapsed(performance.now() - t0)
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 150)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error')
    }
    setLoading(false)
  }

  return (
    <div>
      {/* Audit evidence banner */}
      {auditEvidence && auditEvidence.matching_count > 0 && (
        <div className="card" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 24 }}>🛡️</span>
            <div>
              <h4 style={{ margin: 0, fontSize: 14 }}>Publicly Verified Commitment</h4>
              <p style={{ margin: 0, fontSize: 13, color: '#166534' }}>
                {auditEvidence.matching_count} independent verifier{auditEvidence.matching_count > 1 ? 's' : ''} confirmed the PLL commitment:
                {' '}<strong>{auditEvidence.submissions.filter(s => s.roots_match).map(s => s.verifier_name).join(', ')}</strong>
              </p>
            </div>
          </div>
          <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--color-gray)' }}>
            Verified at: {auditEvidence.submissions.filter(s => s.roots_match).map(s => new Date(s.timestamp).toLocaleString()).join(', ')}
          </p>
        </div>
      )}

      <div className="card">
        <h3 style={{ marginBottom: 8 }}>User Verification</h3>
        <p style={{ color: 'var(--color-gray)', marginBottom: 16 }}>
          As a user, verify that your tokens are included in the Public Liability Ledger.
          No cryptographic operations needed — just search for your UUIDs.
        </p>

        <div style={{ display: 'flex', gap: 12, alignItems: 'end' }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Select User</label>
            <select
              value={selectedUser}
              onChange={e => { setSelectedUser(e.target.value); setResult(null); setElapsed(null) }}
              style={{ padding: '8px 12px', border: '1px solid var(--color-gray-light)', borderRadius: 6, minWidth: 200 }}
            >
              {users.slice(0, 1000).map(u => (
                <option key={u.user_id} value={u.user_id}>
                  {u.user_id} ({u.balance} BTC)
                </option>
              ))}
            </select>
          </div>
          <button className="primary" onClick={verify} disabled={loading}>
            {loading ? 'Verifying...' : 'Verify My Inclusion'}
          </button>
        </div>
        <ProgressBar loading={loading} label="Scanning PLL for your tokens..." />
      </div>

      {result && (
        <div className="card" ref={resultRef}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            {result.all_included ? (
              <span style={{ fontSize: 36 }}>✅</span>
            ) : (
              <span style={{ fontSize: 36 }}>❌</span>
            )}
            <div>
              <h3>
                {result.all_included ? 'All Tokens Found — Included!' : 'MISSING — Tokens Not Found!'}
                {elapsed !== null && (
                  <span style={{ fontSize: 12, color: 'var(--color-gray)', fontWeight: 400, marginLeft: 8 }}>
                    ({formatTime(elapsed)})
                  </span>
                )}
              </h3>
              <p style={{ color: 'var(--color-gray)', fontSize: 13 }}>
                {result.tokens_found}/{result.tokens_expected} tokens verified in PLL
              </p>
            </div>
          </div>

          <div className="stat-grid">
            <div className="stat-box">
              <div className="value">{result.balance}</div>
              <div className="label">Your Balance (BTC)</div>
            </div>
            <div className="stat-box">
              <div className="value">{result.tokens_expected}</div>
              <div className="label">Expected Tokens</div>
            </div>
            <div className="stat-box">
              <div className="value">{result.tokens_found}</div>
              <div className="label">Found in PLL</div>
            </div>
            <div className="stat-box">
              <div className="value">{result.total_liabilities}</div>
              <div className="label">Total Liabilities (all users)</div>
            </div>
          </div>

          <h4 style={{ marginTop: 16, marginBottom: 8 }}>Your Tokens in the PLL</h4>
          <div style={{ maxHeight: 250, overflow: 'auto' }}>
            <table>
              <thead>
                <tr><th>Status</th><th>UUID</th><th>Token</th><th>Value</th></tr>
              </thead>
              <tbody>
                {result.found_records.map((r, i) => (
                  <tr key={i} className="highlight-row">
                    <td><span className="badge badge-success">✓ Found</span></td>
                    <td className="mono" style={{ fontSize: 11 }}>{r.uuid.slice(0, 16)}…</td>
                    <td><strong>{r.token}</strong></td>
                    <td>{r.value}</td>
                  </tr>
                ))}
                {result.missing_uuids.map((uuid, i) => (
                  <tr key={`m-${i}`}>
                    <td><span className="badge badge-danger">✗ Missing</span></td>
                    <td className="mono" style={{ fontSize: 11 }}>{uuid.slice(0, 16)}…</td>
                    <td>—</td>
                    <td>—</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Download Report Button */}
          {result.all_included && (
            <button
              className="primary"
              onClick={async () => {
                try {
                  const { pdf } = await import('@react-pdf/renderer')
                  const { VerificationReportPDF } = await import('../components/VerificationReportPDF')
                  const reportData: VerificationReportData = {
                    userId: result.user_id,
                    balance: result.balance,
                    tokensExpected: result.tokens_expected,
                    tokensFound: result.tokens_found,
                    allIncluded: result.all_included,
                    foundRecords: result.found_records,
                    totalLiabilities: result.total_liabilities,
                    merkleRoot: proofData?.merkle_root ?? '',
                    proofId: new Date().toISOString().slice(0, 10),
                    verifiers: auditEvidence?.submissions
                      .filter(s => s.roots_match)
                      .map(s => ({ name: s.verifier_name, timestamp: s.timestamp })) ?? [],
                    reserveAddress: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
                    timestamp: new Date().toISOString(),
                  }
                  const blob = await pdf(VerificationReportPDF({ data: reportData })).toBlob()
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `lpor-verification-${result.user_id}.pdf`
                  a.click()
                  URL.revokeObjectURL(url)
                } catch (e) {
                  console.error('PDF generation error:', e)
                  alert('Error generating PDF. Check console for details.')
                }
              }}
              style={{ marginTop: 16 }}
            >
              ↓ Download Verification Report (PDF)
            </button>
          )}
        </div>
      )}
    </div>
  )
}
