import { Pie } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    ArcElement,
    Tooltip,
    Legend
} from 'chart.js';
import type { AssetAllocation } from '../types';
import { REGION_LABELS, REGION_COLORS } from '../types';

ChartJS.register(ArcElement, Tooltip, Legend);

interface AllocationPieChartProps {
    allocation: AssetAllocation;
    title?: string;
}

export function AllocationPieChart({ allocation, title }: AllocationPieChartProps) {
    const regions = Object.keys(allocation) as (keyof AssetAllocation)[];
    const values = regions.map(key => allocation[key]);
    const labels = regions.map(key => REGION_LABELS[key]);
    const colors = regions.map(key => REGION_COLORS[key]);

    const data = {
        labels,
        datasets: [{
            data: values,
            backgroundColor: colors,
            borderColor: colors.map(c => c),
            borderWidth: 2
        }]
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false
            },
            tooltip: {
                callbacks: {
                    label: (context: { label: string; raw: unknown }) => {
                        return `${context.label}: ${(context.raw as number).toFixed(1)}%`;
                    }
                }
            }
        }
    };

    return (
        <div>
            {title && <h4 className="card-title" style={{ marginBottom: '16px' }}>{title}</h4>}
            <div className="chart-container">
                <Pie data={data} options={options} />
            </div>
            <div className="chart-legend">
                {regions.map(key => (
                    <div className="legend-item" key={key}>
                        <div
                            className="legend-color"
                            style={{ backgroundColor: REGION_COLORS[key] }}
                        />
                        <span>{REGION_LABELS[key]}: {allocation[key].toFixed(1)}%</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
