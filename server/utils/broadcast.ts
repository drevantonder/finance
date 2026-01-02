import { notifyUser } from '../api/events.get'

export function broadcastExpensesChanged(userId: string) {
  notifyUser(userId, 'expenses-changed')
}

export function broadcastInboxChanged(userId: string) {
  notifyUser(userId, 'inbox-changed')
}

export function broadcastSessionChanged(userId: string) {
  notifyUser(userId, 'session-changed')
}

export function broadcastCategoriesChanged(userId: string) {
  notifyUser(userId, 'categories-changed')
}

export function broadcastClaimsChanged(userId: string) {
  notifyUser(userId, 'claims-changed')
}
