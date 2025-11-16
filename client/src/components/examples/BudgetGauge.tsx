import { BudgetGauge } from '../BudgetGauge';

export default function BudgetGaugeExample() {
  return (
    <div className="max-w-md p-4">
      <BudgetGauge total={750000} spent={547500} />
    </div>
  );
}
