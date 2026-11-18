import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'

/** Labelled input. */
export function Field({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <label className="ui-field">
      {label}
      {children}
    </label>
  )
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} />
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} />
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} />
}

/** Row of fields laid out responsively. */
export function FormRow({ children }: { children: ReactNode }) {
  return <div className="ui-form-row">{children}</div>
}

/** Key/value summary list. */
export function Stats({ items }: { items: { label: ReactNode; value: ReactNode; tone?: 'ok' | 'bad' }[] }) {
  return (
    <div className="ui-stats">
      {items.map((s, i) => (
        <div key={i} className={'ui-stat' + (s.tone ? ` ui-stat--${s.tone}` : '')}>
          <div className="ui-stat__label">{s.label}</div>
          <div className="ui-stat__value">{s.value}</div>
        </div>
      ))}
    </div>
  )
}
