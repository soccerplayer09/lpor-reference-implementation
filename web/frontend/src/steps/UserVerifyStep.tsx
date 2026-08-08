import { useState } from 'react'
import { apiPost } from '../api'
import { UserRecord, ProofData } from '../App'

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

export default function UserVerifyStep({ users, proofData: _proofData }: Props) {
  const [selectedUser, setSelectedUser] = useState<string>(users[0]?.user_id || '')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<VerifyResult | null>(null)

  const verify = async () => {
    if (!selectedUser) return
    setLoading(true)
    try {
      const res = await apiPost<VerifyResult>('/verify/user', { user_id: selectedUser })
      setResult(res)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error')
    }
    setLoading(false)
  }

  return (
    <div>
      <div className="card">
        <h2 style={{ marginBottom: 8 }}>Step 4: User Verification</h2>
        <p style={{ color: 'var(--color-gray)', marginBottom: 16 }}>
          As a user, verify that your tokens are included in the Public Liability Ledger.
          No cryptographic operations needed — just search for your UUIDs.
        </p>

        <div style={{ display: 'flex', gap: 12, alignItems: 'end' }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Select User</label>
            <select
              value={selectedUser}
              onChange={e => { setSelectedUser(e.target.value); setResult(null) }}
              style={{ padding: '8px 12px', border: '1px solid var(--color-gray-light)', borderRadius: 6, minWidth: 200 }}
            >
              {users.map(u => (
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
      </div>

      {result && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            {result.all_included ? (
              <span style={{ fontSize: 36 }}>✅</span>
            ) : (
              <span style={{ fontSize: 36 }}>❌</span>
            )}
            <div>
              <h3>{result.all_included ? 'All Tokens Found — Included!' : 'MISSING — Tokens Not Found!'}</h3>
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
        </div>
      )}
    </div>
  )
}
