import { AllocationTable } from '../AllocationTable';

export default function AllocationTableExample() {
  const allocations = [
    { sku: "SKU_A", plannedUnits: 5000, allocatedUnits: 4850, fillRate: 97, priority: 1.0 },
    { sku: "SKU_B", plannedUnits: 3200, allocatedUnits: 2880, fillRate: 90, priority: 0.8 },
    { sku: "SKU_C", plannedUnits: 7500, allocatedUnits: 7125, fillRate: 95, priority: 1.2 },
    { sku: "SKU_D", plannedUnits: 2100, allocatedUnits: 1890, fillRate: 90, priority: 0.9 },
  ];

  return (
    <div className="p-4">
      <AllocationTable allocations={allocations} />
    </div>
  );
}
