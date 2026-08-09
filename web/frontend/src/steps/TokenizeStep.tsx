import { useState, useRef } from 'react'
import { apiPost } from '../api'
import { UserRecord, TokenizeData, PLLRecord, StepMode } from '../App'
import { formatTime } from '../utils'
import ProgressBar from '../components/ProgressBar'

interface Props {
  mode: StepMode
  users: UserRecord[]
  totalUserCount: number
  storedData?: TokenizeData | null
  storedElapsed?: number | null
  onComplete: (data: TokenizeData, elapsed: number) => void
}

export default function TokenizeStep({ mode, users, totalUserCount, storedData, storedElapsed, onComplete }: Props) {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<TokenizeData | null>(null)
  const [selectedUser, setSelectedUser] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState<number | null>(null)
  const resultRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const tokenize = async () => {
    setLoading(true)
    setElapsed(null)
    const t0 = performance.now()
    try {
      const res = await apiPost<TokenizeData>('/tokenize')
      setData(res)
      setElapsed(performance.now() - t0)
      if (res.users.length > 0) setSelectedUser(res.users[0].user_id)
      setTimeout(() => buttonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 150)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error')
    }
    setLoading(false)
  }

  // Use stored data for detail mode
  const displayData = mode === 'detail' ? storedData : data
  const displayElapsed = mode === 'detail' ? storedElapsed : elapsed

  const selectedTokens: PLLRecord[] = selectedUser && displayData
    ? (displayData.user_token_mapping[selectedUser] || [])
    : []

  const selectedBalance = users.find(u => u.user_id === selectedUser)?.balance || '0'

  // Initialize selectedUser from displayData if not set
  if (!selectedUser && displayData && displayData.users.length > 0) {
    setSelectedUser(displayData.users[0].user_id)
  }

  // Results view (shared between active and detail modes)
  const resultsView = displayData && (
    <>
      <div className="card">
        <h3 style={{ marginBottom: 12 }}>
          Tokenization Complete
          {displayElapsed != null && (
            <span style={{ fontSize: 12, color: 'var(--color-gray)', fontWeight: 400, marginLeft: 8 }}>
              ({formatTime(displayElapsed)})
            </span>
          )}
        </h3>
        <div className="stat-grid">
          <div className="stat-box">
            <div className="value">{displayData.total_records.toLocaleString()}</div>
            <div className="label">Total PLL Records</div>
          </div>
          <div className="stat-box">
            <div className="value">{displayData.total_sum}</div>
            <div className="label">Σ Total (BTC)</div>
          </div>
          <div className="stat-box">
            <div className="value">{totalUserCount.toLocaleString()}</div>
            <div className="label">Users</div>
          </div>
          <div className="stat-box">
            <div className="value">{(displayData.total_records / totalUserCount).toFixed(1)}</div>
            <div className="label">Avg Tokens/User</div>
          </div>
        </div>
      </div>

      <div className="split-view">
        <div className="card">
          <h3 style={{ marginBottom: 8 }}>User Balances (Private)</h3>
          <p style={{ fontSize: 12, color: 'var(--color-gray)', marginBottom: 12 }}>
            Click a user to see their token mapping →
          </p>
          <div style={{ maxHeight: 400, overflow: 'auto' }}>
            <table>
              <thead><tr><th>User</th><th>Balance</th><th>Tokens</th></tr></thead>
              <tbody>
                {displayData.users.map(u => (
                  <tr
                    key={u.user_id}
                    className={selectedUser === u.user_id ? 'highlight-row' : ''}
                    onClick={() => setSelectedUser(u.user_id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td className="mono" style={{ fontSize: 11 }}>{u.user_id}</td>
                    <td>{u.balance}</td>
                    <td>{(displayData.user_token_mapping[u.user_id] || []).length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginBottom: 8 }}>
            Public Liability Ledger
            {selectedUser && <span className="badge badge-info" style={{ marginLeft: 8 }}>{selectedUser}</span>}
          </h3>
          {selectedUser && (
            <p style={{ fontSize: 12, color: 'var(--color-gray)', marginBottom: 12 }}>
              {selectedBalance} BTC → {selectedTokens.length} tokens (Σ = {selectedTokens.reduce((s, t) => s + Number(t.value), 0).toFixed(2)} TBTC)
            </p>
          )}
          <div style={{ maxHeight: 400, overflow: 'auto' }}>
            <table>
              <thead><tr><th>User</th><th>UUID</th><th>Token</th><th>Value</th></tr></thead>
              <tbody>
                {selectedTokens.map((t, i) => (
                  <tr key={i} className="highlight-row">
                    <td><span className="badge badge-info">YOU</span></td>
                    <td className="mono" style={{ fontSize: 11 }}>{t.uuid.slice(0, 12)}…</td>
                    <td><strong>{t.token}</strong></td>
                    <td>{t.value}</td>
                  </tr>
                ))}
                {displayData.pll_records
                  .filter(r => !selectedTokens.find(t => t.uuid === r.uuid))
                  .slice(0, 10)
                  .map((r, i) => (
                    <tr key={`other-${i}`}>
                      <td><span style={{ color: 'var(--color-gray)', fontSize: 11 }}>— hidden —</span></td>
                      <td className="mono" style={{ fontSize: 11 }}>{r.uuid.slice(0, 12)}…</td>
                      <td>{r.token}</td>
                      <td>{r.value}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 12, padding: 12, background: 'var(--color-dark)', borderRadius: 8, color: 'white' }}>
            <div style={{ fontSize: 11, color: 'var(--color-gray-light)', textTransform: 'uppercase' }}>
              Aggregate Liability · All Users
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'monospace' }}>
              Σ = {displayData.total_sum} TBTC
            </div>
          </div>
        </div>
      </div>
    </>
  )

  // Detail mode: results only
  if (mode === 'detail') {
    return <div>{resultsView}</div>
  }

  // Active mode
  return (
    <div>
      <div className="card">
        <p style={{ color: 'var(--color-gray)', marginBottom: 16 }}>
          Decompose each user's balance into standardized denomination tokens (TBTC-10, TBTC-1, TBTC-0.1, TBTC-0.01).
          Each token gets a unique UUID. The user column is stripped before publication.
        </p>
        <button className="primary" onClick={tokenize} disabled={loading}>
          {loading ? 'Tokenizing...' : 'Run Balance Tokenizer'}
        </button>
        <ProgressBar loading={loading} label="Tokenizing user balances..." />
      </div>

      {resultsView && <div ref={resultRef}>{resultsView}</div>}

      {data && (
        <button ref={buttonRef} className="primary" onClick={() => onComplete(data, elapsed ?? 0)} style={{ marginTop: 16 }}>
          Continue to Proof Generation →
        </button>
      )}
    </div>
  )
}
