import type { Session } from '@/features/auth'
import { NAV_ITEMS, type NavItem } from './navItems'

/**
 * Mirrors ui_navigation.html hasTabAccess(): admin or '*'/'admin' in allowedTabs
 * sees everything; otherwise the tab id must be in allowedTabs.
 */
export function canAccess(session: Session, id: string): boolean {
  const role = (session.role || '').toLowerCase()
  const tabs = session.allowedTabs ?? []
  if (role === 'admin' || tabs.includes('*') || tabs.includes('admin')) return true
  return tabs.includes(id)
}

export function visibleNavItems(session: Session): NavItem[] {
  return NAV_ITEMS.filter((item) => canAccess(session, item.id))
}
