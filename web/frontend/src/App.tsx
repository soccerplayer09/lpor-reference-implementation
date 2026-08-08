import { useState } from 'react'
import DatasetStep from './steps/DatasetStep'
import TokenizeStep from './steps/TokenizeStep'
import ProofStep from './steps/ProofStep'
import UserVerifyStep from './steps/UserVerifyStep'
import AuditStep from './steps/AuditStep'

const STEPS = [
  { id: 1, label: '1. Dataset' },
  { id: 2, label: '2. Tokenize' },
  { id: 3, label: '3. Generate Proof' },
  { id: 4, label: '4. Verify' },
]

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

type VerifyTab = 'user' | 'audit'

function App() {
  const [currentStep, setCurrentStep] = useState(1)
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())
  const [users, setUsers] = useState<UserRecord[]>([])
  const [tokenizeData, setTokenizeData] = useState<TokenizeData | null>(null)
  const [proofData, setProofData] = useState<ProofData | null>(null)
  const [verifyTab, setVerifyTab] = useState<VerifyTab>('user')

  const completeStep = (step: number) => {
    setCompletedSteps(prev => new Set([...prev, step]))
    setCurrentStep(step + 1)
  }

  const goToStep = (step: number) => {
    if (step <= Math.max(...completedSteps, 0) + 1) {
      setCurrentStep(step)
    }
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

      <div className="stepper">
        {STEPS.map(s => (
          <button
            key={s.id}
            className={`stepper-item ${currentStep === s.id ? 'active' : ''} ${completedSteps.has(s.id) ? 'completed' : ''}`}
            onClick={() => goToStep(s.id)}
          >
            {completedSteps.has(s.id) ? '✓ ' : ''}{s.label}
          </button>
        ))}
      </div>

      {currentStep === 1 && (
        <DatasetStep
          onComplete={(data) => { setUsers(data); completeStep(1) }}
        />
      )}
      {currentStep === 2 && (
        <TokenizeStep
          users={users}
          onComplete={(data) => { setTokenizeData(data); completeStep(2) }}
        />
      )}
      {currentStep === 3 && (
        <ProofStep
          tokenizeData={tokenizeData}
          onComplete={(data) => { setProofData(data); completeStep(3) }}
        />
      )}
      {currentStep === 4 && (
        <div>
          {/* Tab selector for User Verify vs Public Audit */}
          <div style={{ display: 'flex', gap: 0, marginBottom: 24 }}>
            <button
              onClick={() => setVerifyTab('user')}
              style={{
                padding: '12px 24px',
                fontSize: 14,
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
                padding: '12px 24px',
                fontSize: 14,
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

          <div style={{ marginBottom: 16, padding: 12, background: '#f0f9ff', borderRadius: 8, fontSize: 13, color: 'var(--color-gray)' }}>
            {verifyTab === 'user'
              ? '🧑 User layer: verify your token inclusion in the PLL — no cryptography needed.'
              : '🏛️ Auditor layer: recompute the Merkle root from the PLL — cryptographic binding check.'}
          </div>

          {verifyTab === 'user' && (
            <UserVerifyStep users={users} proofData={proofData} />
          )}
          {verifyTab === 'audit' && (
            <AuditStep proofData={proofData} />
          )}
        </div>
      )}
    </div>
  )
}

export default App
