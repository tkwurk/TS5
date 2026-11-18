import type { ReactNode } from 'react'

type Tone = 'info' | 'warn' | 'error'

/** Callout box for setup hints, warnings, and errors. */
export function Notice({ tone = 'info', children }: { tone?: Tone; children: ReactNode }) {
  return <div className={`ui-notice ui-notice--${tone}`}>{children}</div>
}
