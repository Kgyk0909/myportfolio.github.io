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
import { REGION_LABELS, getCustomRegionColors } from '../types';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

interface AllocationComparisonChartProps {
    current: AssetAllocation;
    target: AssetAllocation;
}

export function AllocationComparisonChart({ current, target }: AllocationComparisonChartProps) {
    const regionColors = getCustomRegionColors();
    const regions = Object.keys(current) as (keyof AssetAllocation)[];
    const labels = regions.map(key => REGION_LABELS[key]);

    // 差分を計算
    const differences = regions.map(key => current[key] - target[key]);

    const data = {
        labels,
        datasets: [
            {
                label: '現在',
                data: regions.map(key => current[key]),
                backgroundColor: regions.map(key => regionColors[key]),
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
            },
            datalabels: {
                display: false
            }
        }
    };

    return (
        <>
            <div className="chart-container" style={{ height: '220px' }}>
                <Bar data={data} options={options} />
            </div>

            {/* 差分表示 */}
            <div className="allocation-diff-section">
                <h5 className="diff-title">目標との差</h5>
                <div className="diff-list">
                    {regions.map((key, index) => {
                        const diff = differences[index] ?? 0;
                        const isPositive = diff >= 0;
                        return (
                            <div className="diff-item" key={key}>
                                <span className="diff-label">{REGION_LABELS[key]}</span>
                                <span className={`diff-value ${isPositive ? 'over' : 'under'}`}>
                                    {isPositive ? '+' : ''}{diff.toFixed(1)}%
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </>
    );
}
