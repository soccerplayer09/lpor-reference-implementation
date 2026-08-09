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

export type StepMode = 'active' | 'summary' | 'detail'

function App() {
  const [currentStep, setCurrentStep] = useState(1)
  const [users, setUsers] = useState<UserRecord[]>([])
  const [datasetStats, setDatasetStats] = useState<DatasetStats | null>(null)
  const [tokenizeData, setTokenizeData] = useState<TokenizeData | null>(null)
  const [proofData, setProofData] = useState<ProofData | null>(null)
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set())

  // Timing
  const [tokenizeElapsed, setTokenizeElapsed] = useState<number | null>(null)
  const [proofElapsed, setProofElapsed] = useState<number | null>(null)

  const step2Ref = useRef<HTMLDivElement>(null)
  const step3Ref = useRef<HTMLDivElement>(null)
  const step4Ref = useRef<HTMLDivElement>(null)
  const step5Ref = useRef<HTMLDivElement>(null)

  const scrollToRef = (ref: React.RefObject<HTMLDivElement | null>) => {
    setTimeout(() => {
      ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 150)
  }

  const toggleExpand = (step: number) => {
    setExpandedSteps(prev => {
      const next = new Set(prev)
      if (next.has(step)) next.delete(step)
      else next.add(step)
      return next
    })
  }

  const completeStep1 = (data: UserRecord[], stats: DatasetStats) => {
    setUsers(data)
    setDatasetStats(stats)
    setTokenizeData(null)
    setProofData(null)
    setExpandedSteps(prev => new Set([...prev, 1]))
    setCurrentStep(2)
    scrollToRef(step2Ref)
  }

  const completeStep2 = (data: TokenizeData, elapsed: number) => {
    setTokenizeData(data)
    setTokenizeElapsed(elapsed)
    setProofData(null)
    setExpandedSteps(prev => new Set([...prev, 2]))
    setCurrentStep(3)
    scrollToRef(step3Ref)
  }

  const completeStep3 = (data: ProofData, elapsed: number) => {
    setProofData(data)
    setProofElapsed(elapsed)
    setExpandedSteps(prev => new Set([...prev, 3]))
    setCurrentStep(4)
    scrollToRef(step4Ref)
  }

  const completeStep4 = () => {
    setExpandedSteps(prev => new Set([...prev, 4]))
    setCurrentStep(5)
    scrollToRef(step5Ref)
  }

  const getMode = (step: number): StepMode => {
    if (currentStep === step) return 'active'
    if (currentStep > step) return expandedSteps.has(step) ? 'detail' : 'summary'
    return 'summary'
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

      {/* Step 1: Dataset */}
      <StepSection
        number={1} title="Dataset"
        completed={currentStep > 1} active={currentStep === 1}
        expanded={expandedSteps.has(1)}
        onToggle={currentStep > 1 ? () => toggleExpand(1) : undefined}
      >
        {getMode(1) === 'active' ? (
          <DatasetStep mode="active" onComplete={completeStep1} />
        ) : getMode(1) === 'detail' ? (
          <DatasetStep mode="detail" storedData={users.length > 0 && datasetStats ? { users, stats: datasetStats } : null} onComplete={completeStep1} />
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
          <StepSection
            number={2} title="Tokenize"
            completed={currentStep > 2} active={currentStep === 2}
            expanded={expandedSteps.has(2)}
            onToggle={currentStep > 2 ? () => toggleExpand(2) : undefined}
          >
            {getMode(2) === 'active' ? (
              <TokenizeStep mode="active" users={users} totalUserCount={datasetStats?.count ?? users.length} onComplete={completeStep2} />
            ) : getMode(2) === 'detail' ? (
              <TokenizeStep mode="detail" users={users} totalUserCount={datasetStats?.count ?? users.length} storedData={tokenizeData} storedElapsed={tokenizeElapsed} onComplete={completeStep2} />
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
          <StepSection
            number={3} title="Generate Proof"
            completed={currentStep > 3} active={currentStep === 3}
            expanded={expandedSteps.has(3)}
            onToggle={currentStep > 3 ? () => toggleExpand(3) : undefined}
          >
            {getMode(3) === 'active' ? (
              <ProofStep mode="active" tokenizeData={tokenizeData} onComplete={completeStep3} />
            ) : getMode(3) === 'detail' ? (
              <ProofStep mode="detail" tokenizeData={tokenizeData} storedData={proofData} storedElapsed={proofElapsed} onComplete={completeStep3} />
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

      {/* Step 4: Public Audit (Auditor Layer) */}
      {currentStep >= 4 && (
        <div ref={step4Ref}>
          <StepSection
            number={4} title="Public Audit"
            subtitle="Auditor layer — cryptographic binding verification"
            completed={currentStep > 4} active={currentStep === 4}
            expanded={expandedSteps.has(4)}
            onToggle={currentStep > 4 ? () => toggleExpand(4) : undefined}
          >
            {getMode(4) === 'summary' ? (
              <CompletedSummary items={[
                { label: 'Status', value: '✓ Verified' },
                { label: 'Root Match', value: 'Confirmed' },
              ]} />
            ) : (
              <div>
                <div style={{ marginBottom: 16, padding: 10, background: '#f0f9ff', borderRadius: 8, fontSize: 13, color: 'var(--color-gray)' }}>
                  🏛️ Auditor layer: independent parties recompute the Merkle root from the PLL to verify the exchange's commitment is valid.
                </div>
                <AuditStep proofData={proofData} onVerified={currentStep === 4 ? completeStep4 : undefined} />
              </div>
            )}
          </StepSection>
        </div>
      )}

      {/* Step 5: User Verification (User Layer) */}
      {currentStep >= 5 && (
        <div ref={step5Ref}>
          <StepSection
            number={5} title="User Verification"
            subtitle="User layer — inclusion check on verified PLL"
            completed={false} active={true}
          >
            <div style={{ marginBottom: 16, padding: 10, background: '#f0fdf4', borderRadius: 8, fontSize: 13, color: '#166534' }}>
              ✅ The PLL has been publicly verified by independent auditors. Users can now check their token inclusion with confidence — no cryptographic operations needed.
            </div>
            <UserVerifyStep users={users} proofData={proofData} />
          </StepSection>
        </div>
      )}
    </div>
  )
}

/* ─── Helper Components ──────────────────────────────────────── */

function StepSection({ number, title, subtitle, completed, active, expanded, onToggle, children }: {
  number: number
  title: string
  subtitle?: string
  completed: boolean
  active: boolean
  expanded?: boolean
  onToggle?: () => void
  children: React.ReactNode
}) {
  return (
    <div style={{
      marginBottom: 24,
      borderLeft: `3px solid ${completed ? 'var(--color-success)' : active ? 'var(--color-primary)' : 'var(--color-gray-light)'}`,
      paddingLeft: 20,
      opacity: completed && !expanded ? 0.85 : 1,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12,
      }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 28, height: 28, borderRadius: '50%', fontSize: 13, fontWeight: 700,
          background: completed ? 'var(--color-success)' : active ? 'var(--color-primary)' : 'var(--color-gray-light)',
          color: completed || active ? 'white' : 'var(--color-gray)',
        }}>
          {completed ? '✓' : number}
        </span>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>{title}</h2>
          {subtitle && <p style={{ fontSize: 12, color: 'var(--color-gray)', margin: 0 }}>{subtitle}</p>}
        </div>
        {completed && <span className="badge badge-success">Complete</span>}
        {active && !completed && <span className="badge badge-info">Active</span>}
        {onToggle && (
          <button
            onClick={onToggle}
            style={{
              background: 'none', border: '1px solid var(--color-gray-light)',
              borderRadius: 4, padding: '4px 10px', fontSize: 12,
              color: 'var(--color-gray)', cursor: 'pointer',
            }}
          >
            {expanded ? '▲ Hide' : '▼ Details'}
          </button>
        )}
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
