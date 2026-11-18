import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'ghost'

/** Isolated button primitive — style via `.ui-btn` classes in ui.css. */
export function Button({
  variant = 'primary',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  const cls = `ui-btn ui-btn--${variant}${className ? ` ${className}` : ''}`
  return <button className={cls} {...props} />
}
