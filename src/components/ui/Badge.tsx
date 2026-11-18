import type { ReactNode } from 'react'

type Tone = 'ok' | 'bad' | 'neutral'

/** Small pill for statuses. */
export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`ui-badge ui-badge--${tone}`}>{children}</span>
}
