# Quick Wins Recommender

## Intent

Surface the highest-expected-value procurement actions the operator can take
*this week* given current regime, supplier quotes, and material risk profile.

## Inputs

- Current regime (FDR model).
- Per-material `current_price`, `priceVolatility`, forward supplier quotes.
- Inventory coverage (`on_hand / avg_weekly_consumption`).
- Contract windows (`supplier_contracts.expires_at`).

## Algorithm

For each candidate action `a` (lock contract, accelerate buy, defer buy,
substitute supplier) compute an expected dollar-value score:

```
EV(a) = P(a_fires) × Δprice × qty − holding_cost_penalty(a)
```

- `P(a_fires)` is a regime-conditioned probability derived from the 10-year
  empirical distribution of price moves under the current regime.
- `Δprice` is the expected price change over the action's window.
- `qty` is the forecast consumption over the action window (from the demand
  forecaster).
- `holding_cost_penalty` uses the company's declared weighted cost of capital
  and warehousing per unit-month.

Actions are ranked by `EV(a)` descending; the top five are returned. Any action
with `EV(a) ≤ 0` is suppressed.

## Outputs

- `GET /api/smart-insights/quick-wins` — ranked list with expected dollar value,
  one-sentence rationale, and a direct "apply" deep link into `AutomatedPO`.
- `QuickWinsWidget` renders the top three inline on the Dashboard.

## Validation

- Shadow-mode A/B on fixture data: each surfaced recommendation is retained
  along with the eventual realized savings. The ledger is in
  `artifacts/validation/quick_wins_ledger.json`.

## Novelty

Unlike static "top 10 savings" dashboards, every item carries a regime-specific
fire probability drawn from empirical history, not a vendor-supplied constant.
This makes the ranking auditable: the customer can see *why* a
deferred-purchase recommendation ranks above an acceleration recommendation in
a given regime.
