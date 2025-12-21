# Agent Instructions

### Glossary / Domain Terms
*   **TMN (Total Monthly Needs)**: The top-level fundraising goal/target.
*   **FP (Financial Package)**: The net amount after levies and giving are removed from TMN.
*   **MFB (Missionary Fringe Benefits)**: The non-taxable portion of the salary package (50% of FP).
*   **MMR (Missionary Ministry Reimbursements)**: Ministry expense budget.
*   **Taxable**: The taxable portion of the salary package (50% of FP).
*   **Affordable House Price**: The final property price after deducting all upfront costs (Stamp Duty, Legal, etc.) from the total budget.
*   **Smart Projection**: A monthly cash-flow simulation that projects deposit growth over time.
- **Strategy Levy**: A 2% levy applied to (FP + MMR).
- **PTC Levy**: A 10% levy applied to TMN.

## Commands
```bash
pnpm dev          # Start dev server (localhost:3000)
pnpm build        # Build for production
pnpm nuxt typecheck  # Run TypeScript type checking (no test runner configured)
```

## Code Style
- **Stack**: Nuxt 4, Vue 3, Pinia, Nuxt UI v4, Tailwind CSS 4, TypeScript strict mode
- **Structure**: Nuxt 4 structure. With frontend (composables, components, pages, etc) in `~/app` folder. `composables/` for business logic, `components/` for UI, `types/index.ts` for interfaces
- **Naming**: PascalCase components, camelCase composables (`useFoo`), UPPER_CASE constants
- **Types**: Strong typing with `defineProps<T>()`, never use `any`, percentages as 0-1 internally
- **State**: Pinia store (`useSessionStore`) with auto-save to localStorage (800ms debounce)
- **Imports**: Use `~/` alias for app imports, explicit imports from composables (not auto-imported)
- **Components**: Nuxt UI components (USlider, UButton, UIcon), minimal custom CSS
- **Formatting**: Currency as `$123k`/`$45M`, percentages as `45%` in UI
- **Patterns**: Use **Iterative Solvers** for circular dependencies (e.g. House Price vs Stamp Duty)

## Error Handling
- Use `Math.max(0, val)` to clamp negatives, `isFinite()` for division guards
- Graceful localStorage fallbacks (empty array if throws)

## Key Business Rules (Don't Change)
- **Household Model**: Incomes are attached to **People**. HECS is managed at the Person level.
- TMN splits 50/50 between Taxable vs MFBs
- DTI = monthly income × 12 × dtiCap; repayment uses amortization formula
- **HECS Projection**: Balance is projected to the target date by subtracting monthly repayments (based on total person income), adding annual indexation (June 1st), and including any **Scheduled Additions** (e.g., future uni semesters) on their census dates.
- **DTI Debt**: DTI calculation uses the **Projected HECS Balance** at the target date, not current balance.
- **MFB Recognition**: 100% of MFB is recognized as income by banks (based on user's bank feedback)
- **Cash Flow Hierarchy**: Smart Projection prioritizes a **Target Cash Margin** (default $15k). Any surplus above this is invested in stocks.
- **TMN Growth**: TMN increases in **steps** every N months (default 6), with the final step occurring at the target date.

## Key Learnings & Gotchas (Dec 2024)

### Calculation Logic (`useLoanCalculator.ts`)
- **Two-Gate Model**: Borrowing capacity is `min(ServiceabilityLimit, DTILimit)`
- **HECS Basis**: HECS is calculated on "Repayment Income" = Taxable + MFB + Taxable Centrelink.
- **Affordable Price Solver**: Use `solveAffordablePrice()` to iteratively converge on the correct house price after stamp duty and fees.
- **Smart Projection**:
    - Calculates Net Income as `Bank Amount + MFB + Spouse Net`
    - Deducts `Living Expenses + One-off Expenses`
    - Simulates HECS balance reduction monthly per person.
    - Incorporates `One-off Deposits` (e.g. car sale, gifts)
    - Applies daily compounding for FHSS and monthly growth for stocks
- **Stress Rate**: Always add +3% buffer to base interest rate for serviceability

### Common Bugs (Watch For)
1. **Monthly vs Annual Units**: Tax/HECS functions expect ANNUAL input. Always `* 12` before calling.
2. **Assessment Rate Scaling**: Spouse `assessmentRate` is stored as ratio (0.9 = 90%). Use smart check: `rate <= 1 ? rate : rate / 100`.
3. **Manual Tax Override**: Applicant's `income.tax` is their actual monthly PAYG. If 0, use `calculateIncomeTax`.
4. **Income Linking**: Ensure all `IncomeSource` objects have a valid `personId` from the `people` array.

## Assumptions & Limitations

### HECS Thresholds
- **Known data**: 2025-26 thresholds (from ATO, effective July 1, 2025)
- **Future years (2026-27+)**: Use 2025-26 thresholds as approximation
- **Rationale**: Thresholds are indexed annually by CPI (~2-3%), but exact values are unknown until published. Using 2025-26 provides reasonable accuracy.

### Stamp Duty (QLD)
- **Pre-May 2025**: FHB concession for existing homes ($700k exemption, $800k phase-out)
- **Post-May 2025**: Additional full exemption for FHB + new homes (no value cap)
- **Future policy changes**: Unknown; calculations assume current rules continue

### TMN + Tax Rate Scope
- **Current**: Target TMN uses tax rates for the target date (e.g., 2026-27 for March 2027)
- **Out of scope**: Dynamically recalculating optimal target TMN as tax rates change between income years during the projection period

## Australian Lending Context

### How Banks Assess Borrowing Capacity
1. **Serviceability Test**: Can you afford repayments at a "stress rate" (typically +3% above actual rate)?
2. **DTI Cap**: APRA guidance limits total debt to ~6x gross annual income (some banks cap at 4.5-5x)
3. **HEM (Household Expenditure Measure)**: Banks use benchmark living expenses based on household size

### Income Assessment
- **PAYG Salary**: Usually 100% recognized (may shade new employees to 80-90%)
- **Non-Taxable Allowances**: MFB is recognized at 100% for this specific use case
- **Spouse Income**: Combined for joint applications, may be shaded for casual/part-time

### HECS/HELP (Student Loans)
- Repayments are calculated as % of "Repayment Income" (not deducted from income, but counted as liability)
- 2024-25 thresholds start at ~$54k income (1% repayment rate), scaling up to 10% at ~$151k+
- Banks include the monthly HECS repayment as a liability in serviceability calculations

### Tax Rates (2026-27 Stage 3 Cuts)
- $0-$18,200: 0%
- $18,201-$45,000: 16%
- $45,001-$135,000: 30%
- $135,001-$190,000: 37%
- $190,001+: 45%
- Medicare Levy: 2% (applies above ~$26k)
- **QLD Stamp Duty**: FHB concessions apply up to $800k (existing) with full exemption at $700k
