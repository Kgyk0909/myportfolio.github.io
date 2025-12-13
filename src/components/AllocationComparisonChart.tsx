import { Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Tooltip,
    Legend
} from 'chart.js';
import type { AssetAllocation } from '../types';
import { REGION_LABELS, REGION_COLORS } from '../types';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

interface AllocationComparisonChartProps {
    current: AssetAllocation;
    target: AssetAllocation;
}

export function AllocationComparisonChart({ current, target }: AllocationComparisonChartProps) {
    const regions = Object.keys(current) as (keyof AssetAllocation)[];
    const labels = regions.map(key => REGION_LABELS[key]);

    const data = {
        labels,
        datasets: [
            {
                label: '現在',
                data: regions.map(key => current[key]),
                backgroundColor: regions.map(key => REGION_COLORS[key]),
                borderRadius: 4
            },
            {
                label: '目標',
                data: regions.map(key => target[key]),
                backgroundColor: 'rgba(148, 163, 184, 0.5)',
                borderColor: 'rgba(148, 163, 184, 1)',
                borderWidth: 2,
                borderRadius: 4
            }
        ]
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            y: {
                beginAtZero: true,
                max: 100,
                ticks: {
                    callback: (value: string | number) => `${value}%`
                }
            }
        },
        plugins: {
            legend: {
                position: 'top' as const
            },
            tooltip: {
                callbacks: {
                    label: (context: { dataset: { label?: string }; raw: unknown }) => {
                        return `${context.dataset.label}: ${(context.raw as number).toFixed(1)}%`;
                    }
                }
            }
        }
    };

    return (
        <div>
            <h4 className="card-title" style={{ marginBottom: '16px' }}>
                目標との比較
            </h4>
            <div className="chart-container" style={{ height: '220px' }}>
                <Bar data={data} options={options} />
            </div>
        </div>
    );
}
