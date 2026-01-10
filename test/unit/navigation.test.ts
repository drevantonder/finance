import { describe, it, expect } from 'vitest'
import { useNavigation } from '~/composables/useNavigation'

describe('useNavigation', () => {
  it('includes Performance page in strategyItems', () => {
    const { strategyItems } = useNavigation()
    
    const performanceItem = strategyItems.find(item => item.label === 'Performance')
    
    expect(performanceItem).toBeDefined()
    expect(performanceItem?.to).toBe('/menu/performance')
    expect(performanceItem?.icon).toBe('i-heroicons-presentation-chart-bar')
  })

  it('includes Performance page in navGroups', () => {
    const { navGroups } = useNavigation()
    
    const moneyStrategyGroup = navGroups.find(group => group.label === 'Money & Strategy')
    expect(moneyStrategyGroup).toBeDefined()
    
    const performanceItem = moneyStrategyGroup?.items.find(item => item.label === 'Performance')
    expect(performanceItem).toBeDefined()
    expect(performanceItem?.to).toBe('/menu/performance')
  })

  it('includes Performance page in allMenuItems', () => {
    const { allMenuItems } = useNavigation()
    
    const performanceItem = allMenuItems.find(item => item.label === 'Performance')
    expect(performanceItem).toBeDefined()
    expect(performanceItem?.to).toBe('/menu/performance')
  })
})
