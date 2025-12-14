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
    specific?: AssetAllocation;
    nisa?: AssetAllocation;
}

export function AllocationComparisonChart({ current, target, specific, nisa }: AllocationComparisonChartProps) {
    const regionColors = getCustomRegionColors();
    const regions = Object.keys(current) as (keyof AssetAllocation)[];

    // データ系列の定義
    // 上から順に表示されるため、Canvasの原点(左上)とは逆の順序(配列の後ろが上)になることがあるが、
    // Chart.jsのBar(horizontal)は配列のindex 0が上に来るのがデフォルト。
    // ラベル: ['目標', '全体', '特定(一般)', '新NISA'] (存在するなら)

    const labels = ['目標', '全体'];
    if (specific) labels.push('特定(一般)');
    if (nisa) labels.push('新NISA');

    // データセット構築やり直し: labelsに対応する値を確実に配列にする
    const buildDataForRegion = (region: keyof AssetAllocation) => {
        const data = [target[region], current[region]];
        if (specific) data.push(specific[region]);
        if (nisa) data.push(nisa[region]);
        return data;
    };

    const chartData = {
        labels,
        datasets: regions.map(region => ({
            label: REGION_LABELS[region],
            data: buildDataForRegion(region),
            backgroundColor: regionColors[region],
            barThickness: 32, // 帯の太さ
        }))
    };

    const options = {
        indexAxis: 'y' as const, // 横向き
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            x: {
                stacked: true,
                max: 100,
                grid: {
                    color: '#f1f5f9'
                },
                ticks: {
                    callback: (value: string | number) => `${value}%`
                }
            },
            y: {
                stacked: true,
                grid: {
                    display: false
                }
            }
        },
        plugins: {
            legend: {
                position: 'bottom' as const,
                labels: {
                    usePointStyle: true,
                    boxWidth: 10
                }
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
        <div className="chart-container" style={{ height: '300px' }}>
            <Bar data={chartData} options={options} />
        </div>
    );
}
