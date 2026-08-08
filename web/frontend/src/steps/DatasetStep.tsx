import { useState } from 'react'
import { apiPost } from '../api'
import { UserRecord } from '../App'

interface Props {
  onComplete: (users: UserRecord[]) => void
}

export default function DatasetStep({ onComplete }: Props) {
  const [nUsers, setNUsers] = useState(50)
  const [seed, setSeed] = useState(42)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<{ users: UserRecord[]; stats: Record<string, string> } | null>(null)

  const generate = async () => {
    setLoading(true)
    try {
      const res = await apiPost<{ users: UserRecord[]; stats: Record<string, string> }>('/dataset', {
        n_users: nUsers,
        seed,
      })
      setData(res)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error')
    }
    setLoading(false)
  }

  return (
    <div>
      <div className="card">
        <h2 style={{ marginBottom: 8 }}>Step 1: Generate User Dataset</h2>
        <p style={{ color: 'var(--color-gray)', marginBottom: 16 }}>
          Create a synthetic exchange user dataset with realistic balance distributions.
        </p>

        <div style={{ display: 'flex', gap: 16, alignItems: 'end', marginBottom: 16 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Users</label>
            <input
              type="number"
              value={nUsers}
              onChange={e => setNUsers(Number(e.target.value))}
              min={5}
              max={500}
              style={{ padding: '8px 12px', border: '1px solid var(--color-gray-light)', borderRadius: 6, width: 100 }}
            />
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
      </div>

      {data && (
        <>
          <div className="card">
            <h3 style={{ marginBottom: 12 }}>Dataset Statistics</h3>
            <div className="stat-grid">
              <div className="stat-box">
                <div className="value">{data.stats.count}</div>
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

          <button className="primary" onClick={() => onComplete(data.users)} style={{ marginTop: 8 }}>
            Continue to Tokenization →
          </button>
        </>
      )}
    </div>
  )
}
