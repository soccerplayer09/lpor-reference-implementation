import { useRef, useState } from 'react'
import DatasetStep from './steps/DatasetStep'
import TokenizeStep from './steps/TokenizeStep'
import ProofStep from './steps/ProofStep'
import UserVerifyStep from './steps/UserVerifyStep'
import AuditStep from './steps/AuditStep'
import { formatTime } from './utils'

export interface UserRecord {
  user_id: string
  balance: string
  asset?: string
}

export interface PLLRecord {
  uuid: string
  token: string
  value: string
}

export interface TokenizeData {
  users: UserRecord[]
  pll_records: PLLRecord[]
  user_token_mapping: Record<string, PLLRecord[]>
  total_records: number
  total_sum: string
}

export interface ProofData {
  merkle_root: string
  record_count: number
  total_sum: string
  generation_time_ms: number
  tree_depth: number
}

export interface DatasetStats {
  count: number
  total: string
  min: string
  max: string
  mean: string
  median: string
}

type VerifyTab = 'user' | 'audit'

function App() {
  const [currentStep, setCurrentStep] = useState(1)
  const [users, setUsers] = useState<UserRecord[]>([])
  const [datasetStats, setDatasetStats] = useState<DatasetStats | null>(null)
  const [tokenizeData, setTokenizeData] = useState<TokenizeData | null>(null)
  const [proofData, setProofData] = useState<ProofData | null>(null)
  const [verifyTab, setVerifyTab] = useState<VerifyTab>('user')

  // Timing for completed summaries
  const [tokenizeElapsed, setTokenizeElapsed] = useState<number | null>(null)
  const [proofElapsed, setProofElapsed] = useState<number | null>(null)

  const step2Ref = useRef<HTMLDivElement>(null)
  const step3Ref = useRef<HTMLDivElement>(null)
  const step4Ref = useRef<HTMLDivElement>(null)

  const scrollToRef = (ref: React.RefObject<HTMLDivElement | null>) => {
    setTimeout(() => {
      ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
  }

  const completeStep1 = (data: UserRecord[], stats: DatasetStats) => {
    setUsers(data)
    setDatasetStats(stats)
    setTokenizeData(null)
    setProofData(null)
    setCurrentStep(2)
    scrollToRef(step2Ref)
  }

  const completeStep2 = (data: TokenizeData, elapsed: number) => {
    setTokenizeData(data)
    setTokenizeElapsed(elapsed)
    setProofData(null)
    setCurrentStep(3)
    scrollToRef(step3Ref)
  }

  const completeStep3 = (data: ProofData, elapsed: number) => {
    setProofData(data)
    setProofElapsed(elapsed)
    setCurrentStep(4)
    scrollToRef(step4Ref)
  }

  return (
    <div className="container" style={{ paddingTop: 32, paddingBottom: 64 }}>
      <header style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700 }}>
          LPOR <span style={{ color: 'var(--color-primary)', fontWeight: 400 }}>Interactive Demo</span>
        </h1>
        <p style={{ color: 'var(--color-gray)', marginTop: 4 }}>
          Layered Proof of Reserves — step-by-step protocol demonstration
        </p>
      </header>

      {/* Step 1: Always visible */}
      <StepSection number={1} title="Dataset" completed={currentStep > 1} active={currentStep === 1}>
        {currentStep === 1 ? (
          <DatasetStep onComplete={completeStep1} />
        ) : (
          <CompletedSummary items={[
            { label: 'Users', value: String(datasetStats?.count.toLocaleString() ?? 0) },
            { label: 'Total', value: `${datasetStats?.total ?? '0'} BTC` },
            { label: 'Median', value: `${datasetStats?.median ?? '0'} BTC` },
            { label: 'Max', value: `${datasetStats?.max ?? '0'} BTC` },
          ]} />
        )}
      </StepSection>

      {/* Step 2: Tokenize */}
      {currentStep >= 2 && (
        <div ref={step2Ref}>
          <StepSection number={2} title="Tokenize" completed={currentStep > 2} active={currentStep === 2}>
            {currentStep === 2 ? (
              <TokenizeStep users={users} totalUserCount={datasetStats?.count ?? users.length} onComplete={completeStep2} />
            ) : (
              <CompletedSummary items={[
                { label: 'PLL Records', value: tokenizeData?.total_records.toLocaleString() ?? '0' },
                { label: 'Total Sum', value: `${tokenizeData?.total_sum ?? '0'} TBTC` },
                { label: 'Avg Tokens/User', value: tokenizeData && datasetStats ? (tokenizeData.total_records / datasetStats.count).toFixed(1) : '0' },
                { label: 'Time', value: formatTime(tokenizeElapsed ?? 0) },
              ]} />
            )}
          </StepSection>
        </div>
      )}

      {/* Step 3: Generate Proof */}
      {currentStep >= 3 && (
        <div ref={step3Ref}>
          <StepSection number={3} title="Generate Proof" completed={currentStep > 3} active={currentStep === 3}>
            {currentStep === 3 ? (
              <ProofStep tokenizeData={tokenizeData} onComplete={completeStep3} />
            ) : (
              <CompletedSummary items={[
                { label: 'Merkle Root', value: (proofData?.merkle_root.slice(0, 16) ?? '') + '…' },
                { label: 'Tree Depth', value: String(proofData?.tree_depth ?? 0) },
                { label: 'Records', value: proofData?.record_count.toLocaleString() ?? '0' },
                { label: 'Time', value: formatTime(proofElapsed ?? 0) },
              ]} />
            )}
          </StepSection>
        </div>
      )}

      {/* Step 4: Verify (tabs) */}
      {currentStep >= 4 && (
        <div ref={step4Ref}>
          <StepSection number={4} title="Verify" completed={false} active={true}>
            <div style={{ display: 'flex', gap: 0, marginBottom: 20 }}>
              <button
                onClick={() => setVerifyTab('user')}
                style={{
                  padding: '10px 20px',
                  fontSize: 13,
                  fontWeight: 600,
                  background: verifyTab === 'user' ? 'var(--color-primary)' : 'white',
                  color: verifyTab === 'user' ? 'white' : 'var(--color-gray)',
                  border: '2px solid var(--color-primary)',
                  borderRadius: '8px 0 0 8px',
                  cursor: 'pointer',
                }}
              >
                👤 User Verification
              </button>
              <button
                onClick={() => setVerifyTab('audit')}
                style={{
                  padding: '10px 20px',
                  fontSize: 13,
                  fontWeight: 600,
                  background: verifyTab === 'audit' ? 'var(--color-primary)' : 'white',
                  color: verifyTab === 'audit' ? 'white' : 'var(--color-gray)',
                  border: '2px solid var(--color-primary)',
                  borderLeft: 'none',
                  borderRadius: '0 8px 8px 0',
                  cursor: 'pointer',
                }}
              >
                🔍 Public Audit
              </button>
            </div>

            <div style={{ marginBottom: 16, padding: 10, background: '#f0f9ff', borderRadius: 8, fontSize: 13, color: 'var(--color-gray)' }}>
              {verifyTab === 'user'
                ? '🧑 User layer: verify your token inclusion in the PLL — no cryptography needed.'
                : '🏛️ Auditor layer: recompute the Merkle root from the PLL — cryptographic binding check.'}
            </div>

            {verifyTab === 'user' && <UserVerifyStep users={users} proofData={proofData} />}
            {verifyTab === 'audit' && <AuditStep proofData={proofData} />}
          </StepSection>
        </div>
      )}
    </div>
  )
}

/* ─── Helper Components ──────────────────────────────────────── */

function StepSection({ number, title, completed, active, children }: {
  number: number
  title: string
  completed: boolean
  active: boolean
  children: React.ReactNode
}) {
  return (
    <div style={{
      marginBottom: 24,
      borderLeft: `3px solid ${completed ? 'var(--color-success)' : active ? 'var(--color-primary)' : 'var(--color-gray-light)'}`,
      paddingLeft: 20,
      opacity: completed ? 0.85 : 1,
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        marginBottom: 12,
      }}>
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 28,
          height: 28,
          borderRadius: '50%',
          fontSize: 13,
          fontWeight: 700,
          background: completed ? 'var(--color-success)' : active ? 'var(--color-primary)' : 'var(--color-gray-light)',
          color: completed || active ? 'white' : 'var(--color-gray)',
        }}>
          {completed ? '✓' : number}
        </span>
        <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>
          {title}
        </h2>
        {completed && <span className="badge badge-success">Complete</span>}
        {active && !completed && <span className="badge badge-info">Active</span>}
      </div>
      {children}
    </div>
  )
}

function CompletedSummary({ items }: { items: { label: string; value: string }[] }) {
  return (
    <div className="stat-grid" style={{ margin: 0 }}>
      {items.map((item, i) => (
        <div key={i} className="stat-box" style={{ padding: 12 }}>
          <div className="value" style={{ fontSize: 16 }}>{item.value}</div>
          <div className="label">{item.label}</div>
        </div>
      ))}
    </div>
  )
}

export default App
