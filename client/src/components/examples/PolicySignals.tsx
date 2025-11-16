import { PolicySignals } from '../PolicySignals';

export default function PolicySignalsExample() {
  const signals = [
    { signal: "REDUCE_INVENTORY", intensity: 0.8 },
    { signal: "TIGHTEN_CREDIT_TERMS", intensity: 0.7 },
    { signal: "DEFER_EXPANSION_CAPEX", intensity: 0.9 },
  ];

  return (
    <div className="max-w-md p-4">
      <PolicySignals signals={signals} />
    </div>
  );
}
