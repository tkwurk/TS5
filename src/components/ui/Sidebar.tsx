/** Primary navigation. Static sidebar on tablet/desktop; off-canvas drawer on phones. */
export function Sidebar<T extends string>({
  items,
  active,
  onChange,
  open = false,
  onClose,
}: {
  items: { id: T; label: string; icon?: string }[]
  active: T
  onChange: (id: T) => void
  /** Drawer open state (phones only). */
  open?: boolean
  onClose?: () => void
}) {
  return (
    <>
      <div
        className={'sidebar__backdrop' + (open ? ' sidebar__backdrop--show' : '')}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside className={'sidebar' + (open ? ' sidebar--open' : '')}>
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className={'side-item' + (item.id === active ? ' side-item--active' : '')}
            onClick={() => onChange(item.id)}
          >
            {item.icon && <span className="side-item__icon">{item.icon}</span>}
            <span className="side-item__label">{item.label}</span>
          </button>
        ))}
      </aside>
    </>
  )
}
