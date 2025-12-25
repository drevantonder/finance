import { notifyUser } from '../api/events.get'

export async function broadcastExpensesChanged(userId: string) {
  await notifyUser(userId, 'expenses-changed')
}

export async function broadcastInboxChanged(userId: string) {
  await notifyUser(userId, 'inbox-changed')
}

export async function broadcastSessionChanged(userId: string) {
  await notifyUser(userId, 'session-changed')
}

export async function broadcastCategoriesChanged(userId: string) {
  await notifyUser(userId, 'categories-changed')
}
