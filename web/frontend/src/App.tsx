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
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set())

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

      {/* Step 1: Dataset */}
      {currentStep === 1 ? (
        <StepSection number={1} title="Dataset" active>
          <DatasetStep onComplete={completeStep1} />
        </StepSection>
      ) : (
        <CollapsedStep
          number={1}
          title="Dataset"
          summary={`${datasetStats?.count.toLocaleString()} users · ${datasetStats?.total} BTC total`}
          expanded={expandedSteps.has(1)}
          onToggle={() => toggleExpand(1)}
        >
          <DatasetStep onComplete={completeStep1} />
        </CollapsedStep>
      )}

      {/* Step 2: Tokenize */}
      {currentStep >= 2 && (
        <div ref={step2Ref}>
          {currentStep === 2 ? (
            <StepSection number={2} title="Tokenize" active>
              <TokenizeStep users={users} onComplete={completeStep2} />
            </StepSection>
          ) : (
            <CollapsedStep
              number={2}
              title="Tokenize"
              summary={`${tokenizeData?.total_records.toLocaleString()} records · ${tokenizeData?.total_sum} TBTC · ${formatTime(tokenizeElapsed ?? 0)}`}
              expanded={expandedSteps.has(2)}
              onToggle={() => toggleExpand(2)}
            >
              <TokenizeStep users={users} onComplete={completeStep2} />
            </CollapsedStep>
          )}
        </div>
      )}

      {/* Step 3: Generate Proof */}
      {currentStep >= 3 && (
        <div ref={step3Ref}>
          {currentStep === 3 ? (
            <StepSection number={3} title="Generate Proof" active>
              <ProofStep tokenizeData={tokenizeData} onComplete={completeStep3} />
            </StepSection>
          ) : (
            <CollapsedStep
              number={3}
              title="Generate Proof"
              summary={`root: ${proofData?.merkle_root.slice(0, 12)}… · depth ${proofData?.tree_depth} · ${formatTime(proofElapsed ?? 0)}`}
              expanded={expandedSteps.has(3)}
              onToggle={() => toggleExpand(3)}
            >
              <ProofStep tokenizeData={tokenizeData} onComplete={completeStep3} />
            </CollapsedStep>
          )}
        </div>
      )}

      {/* Step 4: Verify */}
      {currentStep >= 4 && (
        <div ref={step4Ref}>
          <StepSection number={4} title="Verify" active>
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

function StepSection({ number, title, active, children }: {
  number: number
  title: string
  active?: boolean
  children: React.ReactNode
}) {
  return (
    <div style={{
      marginBottom: 24,
      borderLeft: `3px solid ${active ? 'var(--color-primary)' : 'var(--color-gray-light)'}`,
      paddingLeft: 20,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 28, height: 28, borderRadius: '50%', fontSize: 13, fontWeight: 700,
          background: 'var(--color-primary)', color: 'white',
        }}>
          {number}
        </span>
        <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>{title}</h2>
        <span className="badge badge-info">Active</span>
      </div>
      {children}
    </div>
  )
}

function CollapsedStep({ number: _number, title, summary, expanded, onToggle, children }: {
  number: number
  title: string
  summary: string
  expanded: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div style={{
      marginBottom: 16,
      borderLeft: '3px solid var(--color-success)',
      paddingLeft: 20,
    }}>
      <div
        onClick={onToggle}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '12px 0',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <span style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 28, height: 28, borderRadius: '50%', fontSize: 13, fontWeight: 700,
          background: 'var(--color-success)', color: 'white',
        }}>
          ✓
        </span>
        <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0, flex: 1 }}>
          {title}
          <span style={{ fontWeight: 400, color: 'var(--color-gray)', fontSize: 13, marginLeft: 12 }}>
            {summary}
          </span>
        </h3>
        <span style={{ fontSize: 12, color: 'var(--color-gray)', padding: '4px 8px', background: 'var(--color-bg)', borderRadius: 4 }}>
          {expanded ? '▲ collapse' : '▼ expand'}
        </span>
      </div>
      {expanded && (
        <div style={{ paddingTop: 8, paddingBottom: 8 }}>
          {children}
        </div>
      )}
    </div>
  )
}

export default App
