export interface NavItem {
  label: string
  to: string
  icon: string
  disabled?: boolean
}

export interface SubMenuItem extends NavItem {
  description: string
  color?: string
}

export interface NavGroup {
  label: string
  items: SubMenuItem[]
}

export function useNavigation() {
  const mainNavItems: NavItem[] = [
    { label: 'Dashboard', to: '/', icon: 'i-heroicons-home' },
    { label: 'Expenses', to: '/expenses', icon: 'i-heroicons-banknotes' },
    { label: 'Goal', to: '/goal', icon: 'i-heroicons-home-modern' },
    { label: 'Menu', to: '/menu', icon: 'i-heroicons-bars-3' }
  ]

  const strategyItems: SubMenuItem[] = [
    { label: 'Income Strategy', to: '/menu/income', icon: 'i-heroicons-user-group', description: 'TMN, Salary, Household', color: 'bg-blue-500' },
    { label: 'Expense Categories', to: '/menu/categories', icon: 'i-heroicons-tag', description: 'Receipt categorization', color: 'bg-amber-500' },
    { label: 'Assets', to: '/menu/assets', icon: 'i-heroicons-banknotes', description: 'Cash, Stocks, FHSS', color: 'bg-emerald-500' },
    { label: 'Budget', to: '/menu/budget', icon: 'i-heroicons-chart-pie', description: 'Savings goals, limits', color: 'bg-orange-500' },
    { label: 'Bank Rules', to: '/menu/bank', icon: 'i-heroicons-building-library', description: 'DTI, Serviceability', color: 'bg-indigo-500' },
    { label: 'Purchase Costs', to: '/menu/costs', icon: 'i-heroicons-calculator', description: 'Stamp duty, Legal fees', color: 'bg-violet-500' }
  ]

  const systemItems: SubMenuItem[] = [
    { label: 'System Health', to: '/menu/system', icon: 'i-heroicons-heart', description: 'Inbox debug, Logs', color: 'bg-rose-500' },
    { label: 'Claims', to: '/menu/claims', icon: 'i-heroicons-document-check', description: 'MFB tracking (Coming Soon)', color: 'bg-indigo-500', disabled: true }
  ]

  const navGroups: NavGroup[] = [
    { label: 'Money & Strategy', items: strategyItems },
    { label: 'System', items: systemItems }
  ]

  const allMenuItems = [...strategyItems, ...systemItems]

  return {
    mainNavItems,
    strategyItems,
    systemItems,
    navGroups,
    allMenuItems
  }
}
