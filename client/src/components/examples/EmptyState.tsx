import { EmptyState } from '../EmptyState';
import { Package } from 'lucide-react';

export default function EmptyStateExample() {
  return (
    <div className="space-y-8 p-4">
      <EmptyState
        title="No SKUs configured"
        description="Get started by adding your first SKU to begin tracking demand and optimizing allocation."
        actionLabel="Add SKU"
        onAction={() => {}}
      />

      <EmptyState
        title="No data available"
        description="Upload historical demand data to generate forecasts."
        icon={Package}
        showImage={false}
        actionLabel="Upload Data"
        onAction={() => {}}
      />
    </div>
  );
}
