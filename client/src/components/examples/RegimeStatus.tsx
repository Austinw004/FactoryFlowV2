import { RegimeStatus } from '../RegimeStatus';

export default function RegimeStatusExample() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
      <RegimeStatus 
        regime="HEALTHY_EXPANSION" 
        fdr={1.23} 
        intensity={65} 
      />
      <RegimeStatus 
        regime="IMBALANCED_EXCESS" 
        fdr={2.45} 
        intensity={85} 
      />
    </div>
  );
}
