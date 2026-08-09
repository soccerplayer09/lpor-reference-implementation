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

export interface UserVerifyResultData {
  userId: string
  balance: string
  tokensExpected: number
  tokensFound: number
  totalLiabilities: string
}

function DemoPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [users, setUsers] = useState<UserRecord[]>([])
  const [datasetStats, setDatasetStats] = useState<DatasetStats | null>(null)
  const [tokenizeData, setTokenizeData] = useState<TokenizeData | null>(null)
  const [proofData, setProofData] = useState<ProofData | null>(null)
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set())

  // Timing
  const [tokenizeElapsed, setTokenizeElapsed] = useState<number | null>(null)
  const [proofElapsed, setProofElapsed] = useState<number | null>(null)
  const [userVerifyResult, setUserVerifyResult] = useState<UserVerifyResultData | null>(null)

  const step1Ref = useRef<HTMLDivElement>(null)
  const step2Ref = useRef<HTMLDivElement>(null)
  const step3Ref = useRef<HTMLDivElement>(null)
  const step4Ref = useRef<HTMLDivElement>(null)
  const step5Ref = useRef<HTMLDivElement>(null)

  const stepRefs: Record<number, React.RefObject<HTMLDivElement | null>> = {
    1: step1Ref, 2: step2Ref, 3: step3Ref, 4: step4Ref, 5: step5Ref,
  }

  const scrollToRef = (ref: React.RefObject<HTMLDivElement | null>) => {
    setTimeout(() => {
      ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 150)
  }

  const toggleExpand = (step: number) => {
    setExpandedSteps(prev => {
      const next = new Set(prev)
      if (next.has(step)) next.delete(step)
      else {
        next.add(step)
        setTimeout(() => stepRefs[step]?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
      }
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
      <header style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700 }}>
            LPOR <span style={{ color: 'var(--color-primary)', fontWeight: 400 }}>Interactive Demo</span>
          </h1>
          <p style={{ color: 'var(--color-gray)', marginTop: 4 }}>
            Layered Proof of Reserves — step-by-step protocol demonstration
          </p>
        </div>
        {userVerifyResult !== null && !expandedSteps.has(5) && (
          <PdfDownloadButton proofData={proofData} userVerifyResult={userVerifyResult} />
        )}
      </header>

      {/* Step 1: Dataset */}
      <div ref={step1Ref}>
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
      </div>

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
                { label: 'Leaves', value: proofData?.record_count.toLocaleString() ?? '0' },
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
            {getMode(4) === 'summary' && (
              <CompletedSummary items={[
                { label: 'Status', value: '✓ Verified' },
                { label: 'Root Match', value: 'Confirmed' },
              ]} />
            )}
            <div style={{ display: getMode(4) === 'summary' ? 'none' : 'block' }}>
              <AuditStep proofData={proofData} onVerified={currentStep === 4 ? completeStep4 : undefined} />
            </div>
          </StepSection>
        </div>
      )}

      {/* Step 5: User Verification (User Layer) */}
      {currentStep >= 5 && (
        <div ref={step5Ref}>
          <StepSection
            number={5} title="User Verification"
            subtitle="User layer — inclusion check on verified PLL"
            completed={userVerifyResult !== null && !expandedSteps.has(5)}
            active={userVerifyResult === null || expandedSteps.has(5)}
            expanded={expandedSteps.has(5)}
            onToggle={userVerifyResult !== null ? () => toggleExpand(5) : undefined}
          >
            {userVerifyResult !== null && !expandedSteps.has(5) && (
              <CompletedSummary items={[
                { label: 'User', value: userVerifyResult.userId },
                { label: 'Balance', value: `${userVerifyResult.balance} BTC` },
                { label: 'Inclusion', value: `${userVerifyResult.tokensFound}/${userVerifyResult.tokensExpected} tokens` },
                { label: 'Total Liabilities', value: `${userVerifyResult.totalLiabilities} BTC` },
              ]} />
            )}
            <div style={{ display: (userVerifyResult !== null && !expandedSteps.has(5)) ? 'none' : 'block' }}>
              <UserVerifyStep users={users} proofData={proofData} onVerified={(data) => {
                setUserVerifyResult(data)
                setExpandedSteps(prev => new Set([...prev, 5]))
              }} onSummarize={() => { setExpandedSteps(new Set()); window.scrollTo({ top: 0, behavior: 'smooth' }) }} />
            </div>
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

function PdfDownloadButton({ proofData, userVerifyResult }: {
  proofData: ProofData | null
  userVerifyResult: UserVerifyResultData
}) {
  return (
    <button
      className="primary"
      onClick={async () => {
        try {
          const { pdf } = await import('@react-pdf/renderer')
          const { VerificationReportPDF } = await import('./components/VerificationReportPDF')
          const { apiGet } = await import('./api')

          let verifiers: { name: string; timestamp: string }[] = []
          try {
            const auditResults = await apiGet<{ submissions: { verifier_name: string; roots_match: boolean; timestamp: string }[] }>('/audit/results')
            verifiers = auditResults.submissions
              .filter(s => s.roots_match)
              .map(s => ({ name: s.verifier_name, timestamp: s.timestamp }))
          } catch { /* ignore */ }

          const reportData = {
            userId: userVerifyResult.userId,
            balance: userVerifyResult.balance,
            tokensExpected: userVerifyResult.tokensExpected,
            tokensFound: userVerifyResult.tokensFound,
            allIncluded: userVerifyResult.tokensFound === userVerifyResult.tokensExpected,
            foundRecords: [],
            totalLiabilities: userVerifyResult.totalLiabilities,
            merkleRoot: proofData?.merkle_root ?? '',
            proofId: new Date().toISOString().slice(0, 10),
            verifiers,
            reserveAddress: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
            timestamp: new Date().toISOString(),
          }
          const blob = await pdf(VerificationReportPDF({ data: reportData })).toBlob()
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `lpor-verification-${userVerifyResult.userId}.pdf`
          a.click()
          URL.revokeObjectURL(url)
        } catch (e) {
          console.error('PDF generation error:', e)
          alert('Error generating PDF. Check console for details.')
        }
      }}
    >
      ↓ Download Verification Report (PDF)
    </button>
  )
}

export default DemoPage
