import type { ReactNode } from 'react'

/** Card-style section with an optional heading. */
export function Panel({ title, children }: { title?: ReactNode; children: ReactNode }) {
  return (
    <section className="ui-panel">
      {title ? <h2 className="ui-panel__title">{title}</h2> : null}
      {children}
    </section>
  )
}
