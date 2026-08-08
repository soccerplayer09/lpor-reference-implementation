import { useState } from 'react'
import { apiPost } from '../api'
import { UserRecord, DatasetStats } from '../App'

interface Props {
  onComplete: (users: UserRecord[], stats: DatasetStats) => void
}

const SCALE_OPTIONS = [
  { label: '10¹ (10)', value: 10 },
  { label: '10² (100)', value: 100 },
  { label: '10³ (1,000)', value: 1_000 },
  { label: '10⁴ (10,000)', value: 10_000 },
  { label: '10⁵ (100,000)', value: 100_000 },
  { label: '10⁶ (1,000,000)', value: 1_000_000 },
  { label: '10⁷ (10,000,000)', value: 10_000_000 },
]

export default function DatasetStep({ onComplete }: Props) {
  const [selectedScale, setSelectedScale] = useState(100)
  const [seed, setSeed] = useState(42)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<{ users: UserRecord[]; stats: DatasetStats } | null>(null)
  const [elapsed, setElapsed] = useState<number | null>(null)

  const generate = async () => {
    setLoading(true)
    setElapsed(null)
    const t0 = performance.now()
    try {
      const res = await apiPost<{ users: UserRecord[]; stats: DatasetStats }>('/dataset', {
        n_users: selectedScale,
        seed,
      })
      setData(res)
      setElapsed(performance.now() - t0)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error')
    }
    setLoading(false)
  }

  // For large datasets, don't show the full table
  const showTable = selectedScale <= 1000

  return (
    <div>
      <div className="card">
        <p style={{ color: 'var(--color-gray)', marginBottom: 16 }}>
          Create a synthetic exchange user dataset. Select the scale to test LPOR from small demos to multi-million user benchmarks.
        </p>

        <div style={{ display: 'flex', gap: 16, alignItems: 'end', marginBottom: 16, flexWrap: 'wrap' }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Dataset Size</label>
            <select
              value={selectedScale}
              onChange={e => setSelectedScale(Number(e.target.value))}
              style={{ padding: '8px 12px', border: '1px solid var(--color-gray-light)', borderRadius: 6, minWidth: 180 }}
            >
              {SCALE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Seed</label>
            <input
              type="number"
              value={seed}
              onChange={e => setSeed(Number(e.target.value))}
              style={{ padding: '8px 12px', border: '1px solid var(--color-gray-light)', borderRadius: 6, width: 100 }}
            />
          </div>
          <button className="primary" onClick={generate} disabled={loading}>
            {loading ? 'Generating...' : 'Generate Dataset'}
          </button>
        </div>

        {selectedScale >= 100_000 && (
          <div style={{ padding: 10, background: '#fef3c7', borderRadius: 6, fontSize: 12, color: '#92400e' }}>
            ⚠️ Large dataset ({selectedScale.toLocaleString()} users). Generation and subsequent steps may take several seconds to minutes.
          </div>
        )}
      </div>

      {data && (
        <>
          <div className="card">
            <h3 style={{ marginBottom: 12 }}>
              Dataset Generated
              {elapsed !== null && (
                <span style={{ fontSize: 12, color: 'var(--color-gray)', fontWeight: 400, marginLeft: 8 }}>
                  ({(elapsed / 1000).toFixed(2)}s)
                </span>
              )}
            </h3>
            <div className="stat-grid">
              <div className="stat-box">
                <div className="value">{Number(data.stats.count).toLocaleString()}</div>
                <div className="label">Users</div>
              </div>
              <div className="stat-box">
                <div className="value">{Number(data.stats.total).toFixed(2)}</div>
                <div className="label">Total BTC</div>
              </div>
              <div className="stat-box">
                <div className="value">{data.stats.median}</div>
                <div className="label">Median Balance</div>
              </div>
              <div className="stat-box">
                <div className="value">{data.stats.max}</div>
                <div className="label">Max Balance</div>
              </div>
            </div>
          </div>

          {showTable && (
            <div className="card">
              <h3 style={{ marginBottom: 12 }}>User Balances (Exchange Internal DB)</h3>
              <div style={{ maxHeight: 300, overflow: 'auto' }}>
                <table>
                  <thead>
                    <tr><th>User ID</th><th>Balance (BTC)</th></tr>
                  </thead>
                  <tbody>
                    {data.users.map(u => (
                      <tr key={u.user_id}>
                        <td className="mono">{u.user_id}</td>
                        <td>{u.balance}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!showTable && (
            <div className="card">
              <p style={{ color: 'var(--color-gray)', fontSize: 13 }}>
                Table hidden for large datasets ({selectedScale.toLocaleString()} users). 
                Showing first 5: {data.users.slice(0, 5).map(u => `${u.user_id} (${u.balance})`).join(', ')}…
              </p>
            </div>
          )}

          <button className="primary" onClick={() => onComplete(data.users, data.stats)} style={{ marginTop: 8 }}>
            Continue to Tokenization →
          </button>
        </>
      )}
    </div>
  )
}
