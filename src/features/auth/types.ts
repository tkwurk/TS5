/** An authenticated operator session returned by the backend login. */
export interface Session {
  username: string
  deviceId: string
  outlet: string
  role: string
  allowedTabs?: string[]
}
