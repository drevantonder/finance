# Domain Knowledge & Business Rules

> This document contains detailed context for the finance/house-progress application.
> For quick reference, see `AGENTS.md` in the project root.

## Glossary

| Term | Definition |
|------|------------|
| **TMN** | Total Monthly Needs - top-level fundraising goal/target |
| **FP** | Financial Package - net amount after levies and giving removed from TMN |
| **MFB** | Missionary Fringe Benefits - non-taxable portion (50% of FP) |
| **MMR** | Missionary Ministry Reimbursements - ministry expense budget |
| **Taxable** | Taxable portion of salary package (50% of FP) |
| **Strategy Levy** | 2% levy applied to (FP + MMR) |
| **PTC Levy** | 10% levy applied to TMN |
| **Smart Projection** | Monthly cash-flow simulation projecting deposit growth |
| **Affordable House Price** | Property price after deducting upfront costs (stamp duty, legal, etc.) |

## Key Business Rules (Don't Change)

- **Household Model**: Incomes are attached to **People**. HECS is managed at the Person level.
- **TMN Split**: 50/50 between Taxable vs MFBs
- **DTI Calculation**: `monthly income × 12 × dtiCap`; repayment uses amortization formula
- **HECS Projection**: Balance projected to target date by subtracting monthly repayments, adding annual indexation (June 1st), and including Scheduled Additions on census dates
- **DTI Debt**: Uses **Projected HECS Balance** at target date, not current balance
- **MFB Recognition**: 100% recognized as income by banks
- **Cash Flow Hierarchy**: Smart Projection prioritizes Target Cash Margin (default $15k); surplus invested in stocks
- **TMN Growth**: Increases in steps every N months (default 6), final step at target date

## Calculation Logic (`useLoanCalculator.ts`)

- **Two-Gate Model**: Borrowing capacity = `min(ServiceabilityLimit, DTILimit)`
- **HECS Basis**: Calculated on "Repayment Income" = Taxable + MFB + Taxable Centrelink
- **Affordable Price Solver**: Use `solveAffordablePrice()` for iterative convergence after stamp duty/fees
- **Stress Rate**: Always add +3% buffer to base interest rate for serviceability
- **Smart Projection**:
  - Net Income = `Bank Amount + MFB + Spouse Net`
  - Deducts `Living Expenses + One-off Expenses`
  - Simulates HECS balance reduction monthly per person
  - Incorporates One-off Deposits (car sale, gifts)
  - Daily compounding for FHSS, monthly growth for stocks

## Common Bugs (Watch For)

1. **Monthly vs Annual Units**: Tax/HECS functions expect ANNUAL input. Always `* 12` before calling.
2. **Assessment Rate Scaling**: Spouse `assessmentRate` stored as ratio (0.9 = 90%). Check: `rate <= 1 ? rate : rate / 100`
3. **Manual Tax Override**: Applicant's `income.tax` is actual monthly PAYG. If 0, use `calculateIncomeTax`
4. **Income Linking**: All `IncomeSource` objects must have valid `personId` from `people` array

## Assumptions & Limitations

### HECS Thresholds
- **Known**: 2025-26 thresholds (ATO, effective July 1, 2025)
- **Future years**: Use 2025-26 as approximation (indexed ~2-3% annually by CPI)

### Stamp Duty (QLD)
- **Pre-May 2025**: FHB concession for existing homes ($700k exemption, $800k phase-out)
- **Post-May 2025**: Full exemption for FHB + new homes (no value cap)

### TMN + Tax Rate Scope
- Target TMN uses tax rates for target date (e.g., 2026-27 for March 2027)
- Out of scope: Dynamic recalculation as rates change during projection

## Australian Lending Context

### Bank Assessment
1. **Serviceability Test**: Afford repayments at stress rate (+3% above actual)
2. **DTI Cap**: APRA guidance ~6x gross annual income (some banks 4.5-5x)
3. **HEM**: Benchmark living expenses based on household size

### Income Assessment
- **PAYG Salary**: Usually 100% (may shade new employees 80-90%)
- **MFB**: 100% recognized for this use case
- **Spouse**: Combined for joint apps, may shade casual/part-time

### HECS/HELP
- Repayments = % of "Repayment Income" (counted as liability, not deducted)
- 2024-25: Starts ~$54k (1%), scales to 10% at ~$151k+
- Banks include monthly HECS repayment as liability

### Tax Rates (2026-27 Stage 3)
| Bracket | Rate |
|---------|------|
| $0-$18,200 | 0% |
| $18,201-$45,000 | 16% |
| $45,001-$135,000 | 30% |
| $135,001-$190,000 | 37% |
| $190,001+ | 45% |
| Medicare Levy | 2% (above ~$26k) |
