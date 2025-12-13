import { Pie } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    ArcElement,
    Tooltip,
    Legend
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import type { AssetAllocation } from '../types';
import { REGION_LABELS, getCustomRegionColors } from '../types';

ChartJS.register(ArcElement, Tooltip, Legend, ChartDataLabels);

interface AllocationPieChartProps {
    allocation: AssetAllocation;
    title?: string;
}

export function AllocationPieChart({ allocation, title }: AllocationPieChartProps) {
    const regionColors = getCustomRegionColors();
    const regions = Object.keys(allocation) as (keyof AssetAllocation)[];
    const values = regions.map(key => allocation[key]);
    const labels = regions.map(key => REGION_LABELS[key]);
    const colors = regions.map(key => regionColors[key]);

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
            },
            datalabels: {
                color: '#fff',
                font: {
                    weight: 'bold' as const,
                    size: 12
                },
                formatter: (value: number) => {
                    // 5%未満は表示しない（重なり防止）
                    if (value < 5) return '';
                    return `${value.toFixed(0)}%`;
                },
                textShadowBlur: 4,
                textShadowColor: 'rgba(0,0,0,0.5)'
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
                            style={{ backgroundColor: regionColors[key] }}
                        />
                        <span>{REGION_LABELS[key]}: {allocation[key].toFixed(1)}%</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
