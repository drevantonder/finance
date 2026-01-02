export interface PtcLeafCategory {
  path: string                    // Full path: "Living Expenses > Groceries/Household"
  level1: string                  // "Living Expenses"
  level2: string                  // "Groceries/Household"
  level3?: string                 // Only for Travel
  defaultMfbPercent: number
  searchTerms: string[]           // For combobox filtering
}

export const PTC_CATEGORIES: PtcLeafCategory[] = [
  // Living Expenses
  { 
    path: 'Living Expenses > Groceries/Household', 
    level1: 'Living Expenses', 
    level2: 'Groceries/Household',
    defaultMfbPercent: 100,
    searchTerms: ['groceries', 'household', 'food', 'woolworths', 'coles', 'aldi', 'living']
  },
  { 
    path: 'Living Expenses > Rates', 
    level1: 'Living Expenses', 
    level2: 'Rates',
    defaultMfbPercent: 100,
    searchTerms: ['rates', 'council', 'living']
  },
  { 
    path: 'Living Expenses > Utilities', 
    level1: 'Living Expenses', 
    level2: 'Utilities',
    defaultMfbPercent: 100,
    searchTerms: ['utilities', 'electricity', 'gas', 'water', 'power', 'living']
  },
  { 
    path: 'Living Expenses > Insurance', 
    level1: 'Living Expenses', 
    level2: 'Insurance',
    defaultMfbPercent: 100,
    searchTerms: ['insurance', 'living']
  },
  { 
    path: 'Living Expenses > Medical/Health', 
    level1: 'Living Expenses', 
    level2: 'Medical/Health',
    defaultMfbPercent: 100,
    searchTerms: ['medical', 'health', 'doctor', 'pharmacy', 'living']
  },
  { 
    path: 'Living Expenses > Other Personal', 
    level1: 'Living Expenses', 
    level2: 'Other Personal',
    defaultMfbPercent: 100,
    searchTerms: ['personal', 'living']
  },

  // Home Office
  { 
    path: 'Home Office > Office Furniture/Equipmt', 
    level1: 'Home Office', 
    level2: 'Office Furniture/Equipmt',
    defaultMfbPercent: 100,
    searchTerms: ['furniture', 'equipment', 'desk', 'chair', 'office']
  },
  { 
    path: 'Home Office > Office Consumables', 
    level1: 'Home Office', 
    level2: 'Office Consumables',
    defaultMfbPercent: 100,
    searchTerms: ['consumables', 'paper', 'ink', 'stationary', 'office']
  },
  { 
    path: 'Home Office > Computer Purchase', 
    level1: 'Home Office', 
    level2: 'Computer Purchase',
    defaultMfbPercent: 100,
    searchTerms: ['computer', 'laptop', 'desktop', 'office']
  },

  // Vehicle
  { 
    path: 'Vehicle > MV Rego/Insrnce/Licnce', 
    level1: 'Vehicle', 
    level2: 'MV Rego/Insrnce/Licnce',
    defaultMfbPercent: 50,
    searchTerms: ['rego', 'insurance', 'license', 'registration', 'vehicle']
  },
  { 
    path: 'Vehicle > One-off Min Expenses', 
    level1: 'Vehicle', 
    level2: 'One-off Min Expenses',
    defaultMfbPercent: 50,
    searchTerms: ['expenses', 'vehicle']
  },
  { 
    path: 'Vehicle > Motor Vehicle', 
    level1: 'Vehicle', 
    level2: 'Motor Vehicle',
    defaultMfbPercent: 50,
    searchTerms: ['fuel', 'petrol', 'diesel', 'gas', 'car', 'vehicle']
  },
  { 
    path: 'Vehicle > Other Vehicle', 
    level1: 'Vehicle', 
    level2: 'Other Vehicle',
    defaultMfbPercent: 50,
    searchTerms: ['bicycle', 'ebike', 'escooter', 'vehicle']
  },
  { 
    path: 'Vehicle > Vehicle Purchase', 
    level1: 'Vehicle', 
    level2: 'Vehicle Purchase',
    defaultMfbPercent: 50,
    searchTerms: ['purchase', 'buy', 'car', 'vehicle']
  },

  // Technology
  { 
    path: 'Technology > Phone Use', 
    level1: 'Technology', 
    level2: 'Phone Use',
    defaultMfbPercent: 71,
    searchTerms: ['phone', 'mobile', 'telstra', 'optus', 'vodafone', 'tech']
  },
  { 
    path: 'Technology > Internet', 
    level1: 'Technology', 
    level2: 'Internet',
    defaultMfbPercent: 25,
    searchTerms: ['internet', 'nbn', 'wifi', 'broadband', 'tech']
  },
  { 
    path: 'Technology > Online Subscriptions', 
    level1: 'Technology', 
    level2: 'Online Subscriptions',
    defaultMfbPercent: 100,
    searchTerms: ['subscription', 'netflix', 'spotify', 'disney', 'tech']
  },
  { 
    path: 'Technology > Software/Apps', 
    level1: 'Technology', 
    level2: 'Software/Apps',
    defaultMfbPercent: 100,
    searchTerms: ['software', 'app', 'adobe', 'microsoft', 'tech']
  },
  { 
    path: 'Technology > Phone Purchase', 
    level1: 'Technology', 
    level2: 'Phone Purchase',
    defaultMfbPercent: 100,
    searchTerms: ['phone', 'iphone', 'samsung', 'tech']
  },
  { 
    path: 'Technology > Tablet/Laptop Purchase', 
    level1: 'Technology', 
    level2: 'Tablet/Laptop Purchase',
    defaultMfbPercent: 100,
    searchTerms: ['tablet', 'ipad', 'laptop', 'macbook', 'tech']
  },
  { 
    path: 'Technology > Other Equip Purchase', 
    level1: 'Technology', 
    level2: 'Other Equip Purchase',
    defaultMfbPercent: 100,
    searchTerms: ['equipment', 'tech']
  },
  { 
    path: 'Technology > Service/Repairs', 
    level1: 'Technology', 
    level2: 'Service/Repairs',
    defaultMfbPercent: 100,
    searchTerms: ['repair', 'service', 'tech']
  },

  // Ministry Expenses
  { 
    path: 'Ministry Expenses > Conferences/Retreats', 
    level1: 'Ministry Expenses', 
    level2: 'Conferences/Retreats',
    defaultMfbPercent: 0,
    searchTerms: ['conference', 'retreat', 'camp', 'ministry']
  },
  { 
    path: 'Ministry Expenses > MPD/MPC', 
    level1: 'Ministry Expenses', 
    level2: 'MPD/MPC',
    defaultMfbPercent: 0,
    searchTerms: ['mpd', 'mpc', 'fundraising', 'ministry']
  },
  { 
    path: 'Ministry Expenses > Meetings/Appointments', 
    level1: 'Ministry Expenses', 
    level2: 'Meetings/Appointments',
    defaultMfbPercent: 0,
    searchTerms: ['meeting', 'appointment', 'ministry']
  },
  { 
    path: 'Ministry Expenses > Ministry Equipment', 
    level1: 'Ministry Expenses', 
    level2: 'Ministry Equipment',
    defaultMfbPercent: 0,
    searchTerms: ['equipment', 'ministry']
  },
  { 
    path: 'Ministry Expenses > Ministry Materials', 
    level1: 'Ministry Expenses', 
    level2: 'Ministry Materials',
    defaultMfbPercent: 0,
    searchTerms: ['materials', 'ministry']
  },
  { 
    path: 'Ministry Expenses > Other Ministry', 
    level1: 'Ministry Expenses', 
    level2: 'Other Ministry',
    defaultMfbPercent: 0,
    searchTerms: ['ministry']
  },

  // Tuition/Education
  { 
    path: 'Tuition/Education', 
    level1: 'Tuition/Education', 
    level2: 'Tuition/Education',
    defaultMfbPercent: 100,
    searchTerms: ['tuition', 'education', 'course', 'fees']
  },

  // Travel - Domestic
  { 
    path: 'Travel > Domestic > Food/Accommodation', 
    level1: 'Travel', 
    level2: 'Domestic',
    level3: 'Food/Accommodation',
    defaultMfbPercent: 100,
    searchTerms: ['food', 'accommodation', 'hotel', 'domestic', 'travel']
  },
  { 
    path: 'Travel > Domestic > Flights', 
    level1: 'Travel', 
    level2: 'Domestic',
    level3: 'Flights',
    defaultMfbPercent: 100,
    searchTerms: ['flight', 'qantas', 'jetstar', 'virgin', 'domestic', 'travel']
  },
  { 
    path: 'Travel > Domestic > Rideshare/Rental/Petrol', 
    level1: 'Travel', 
    level2: 'Domestic',
    level3: 'Rideshare/Rental/Petrol',
    defaultMfbPercent: 100,
    searchTerms: ['uber', 'rental', 'petrol', 'taxi', 'domestic', 'travel']
  },
  { 
    path: 'Travel > Domestic > Other Travel Costs', 
    level1: 'Travel', 
    level2: 'Domestic',
    level3: 'Other Travel Costs',
    defaultMfbPercent: 100,
    searchTerms: ['travel', 'domestic']
  },

  // Travel - International
  { 
    path: 'Travel > International > Food/Accom (Int)', 
    level1: 'Travel', 
    level2: 'International',
    level3: 'Food/Accom (Int)',
    defaultMfbPercent: 100,
    searchTerms: ['food', 'accommodation', 'hotel', 'international', 'travel']
  },
  { 
    path: 'Travel > International > Flights (Int)', 
    level1: 'Travel', 
    level2: 'International',
    level3: 'Flights (Int)',
    defaultMfbPercent: 100,
    searchTerms: ['flight', 'international', 'travel']
  },
  { 
    path: 'Travel > International > Other Travel Costs (Int)', 
    level1: 'Travel', 
    level2: 'International',
    level3: 'Other Travel Costs (Int)',
    defaultMfbPercent: 100,
    searchTerms: ['travel', 'international']
  },

  // Other
  { 
    path: 'Other > Bank Fees', 
    level1: 'Other', 
    level2: 'Bank Fees',
    defaultMfbPercent: 100,
    searchTerms: ['bank', 'fees', 'other']
  },
  { 
    path: 'Other > Gifts/Donations', 
    level1: 'Other', 
    level2: 'Gifts/Donations',
    defaultMfbPercent: 100,
    searchTerms: ['gift', 'donation', 'other']
  },
  { 
    path: 'Other > Msc', 
    level1: 'Other', 
    level2: 'Msc',
    defaultMfbPercent: 100,
    searchTerms: ['misc', 'miscellaneous', 'other']
  },
]

export function buildPtcCategoryPath(level1: string, level2?: string, level3?: string): string {
  if (level3) return `${level1} > ${level2} > ${level3}`
  if (level2 && level1 !== level2) return `${level1} > ${level2}`
  return level1
}

export function findPtcCategory(path: string): PtcLeafCategory | undefined {
  return PTC_CATEGORIES.find(c => c.path === path)
}

export function getDefaultMfbPercent(path: string): number {
  return findPtcCategory(path)?.defaultMfbPercent ?? 100
}

export function searchPtcCategories(query: string): PtcLeafCategory[] {
  const q = query.toLowerCase()
  return PTC_CATEGORIES.filter(c => 
    c.path.toLowerCase().includes(q) || 
    c.searchTerms.some(t => t.includes(q))
  )
}
