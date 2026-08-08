import { useState, useEffect } from 'react'

interface Props {
  loading: boolean
  label?: string
}

/**
 * Indeterminate progress bar with elapsed time display.
 * Shows a sliding animation while loading and counts elapsed time.
 */
export default function ProgressBar({ loading, label }: Props) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!loading) {
      setElapsed(0)
      return
    }
    const start = Date.now()
    const interval = setInterval(() => {
      setElapsed(Date.now() - start)
    }, 100)
    return () => clearInterval(interval)
  }, [loading])

  if (!loading) return null

  const seconds = (elapsed / 1000).toFixed(1)

  return (
    <div style={{ margin: '16px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12 }}>
        <span style={{ color: 'var(--color-gray)' }}>{label || 'Processing...'}</span>
        <span style={{ color: 'var(--color-gray)', fontFamily: 'monospace' }}>{seconds}s</span>
      </div>
      <div style={{
        height: 4,
        background: 'var(--color-gray-light)',
        borderRadius: 2,
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: '30%',
          background: 'var(--color-primary)',
          borderRadius: 2,
          animation: 'progress-slide 1.2s ease-in-out infinite',
        }} />
      </div>
      <style>{`
        @keyframes progress-slide {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(430%); }
        }
      `}</style>
    </div>
  )
}
