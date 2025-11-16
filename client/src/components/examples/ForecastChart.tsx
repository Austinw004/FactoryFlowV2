import { ForecastChart } from '../ForecastChart';

export default function ForecastChartExample() {
  const data = [
    { month: "Jan", historical: 4000 },
    { month: "Feb", historical: 4200 },
    { month: "Mar", historical: 4100 },
    { month: "Apr", historical: 4500 },
    { month: "May", historical: 4700 },
    { month: "Jun", historical: 4600 },
    { month: "Jul", forecast: 4800 },
    { month: "Aug", forecast: 4950 },
    { month: "Sep", forecast: 5100 },
  ];

  return (
    <div className="p-4">
      <ForecastChart data={data} title="SKU_A Demand Forecast" />
    </div>
  );
}
