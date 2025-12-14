import { Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Tooltip,
    Legend
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import type { AssetAllocation } from '../types';
import { REGION_LABELS, getCustomRegionColors } from '../types';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend, ChartDataLabels);

interface NisaUsageBarProps {
    allocation: AssetAllocation; // 取得額ベースのAllocation
    totalCost: number;           // 取得額合計
}

export function NisaUsageBar({ allocation, totalCost }: NisaUsageBarProps) {
    const regionColors = getCustomRegionColors();
    const regions = Object.keys(allocation) as (keyof AssetAllocation)[];

    // NISA上限 1800万円
    const MAX_NISA_LIMIT = 18_000_000;

    // 未使用枠
    const unusedValue = Math.max(0, MAX_NISA_LIMIT - totalCost);

    // データセット構築
    const datasets = regions.map(region => {
        // allocationは%なので金額に換算（Costベース）
        const value = totalCost * (allocation[region] / 100);
        return {
            label: REGION_LABELS[region],
            data: [value],
            backgroundColor: regionColors[region],
            barThickness: 32,
            datalabels: {
                display: true,
                color: '#fff',
                font: {
                    weight: 'bold' as const,
                    size: 11
                },
                formatter: (val: number) => {
                    // 1800万に対する割合（元本ベース）
                    const percent = (val / MAX_NISA_LIMIT) * 100;
                    // 小さすぎる場合は表示しない（重なり防止）
                    if (percent < 3) return '';
                    return `${percent.toFixed(1)}%`;
                }
            }
        };
    });

    // 未使用枠を追加
    datasets.push({
        label: '未使用枠',
        data: [unusedValue],
        backgroundColor: '#e2e8f0', // 薄いグレー
        barThickness: 32,
        datalabels: {
            display: false
        } as any
    });

    const data = {
        labels: ['新NISA利用状況'],
        datasets
    };

    const options = {
        indexAxis: 'y' as const,
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            x: {
                stacked: true,
                max: MAX_NISA_LIMIT,
                grid: {
                    color: '#f1f5f9'
                },
                ticks: {
                    stepSize: 3_600_000, // 360万刻み
                    callback: (value: string | number) => {
                        return (Number(value) / 10000) + '万';
                    }
                }
            },
            y: {
                stacked: true,
                display: false
            }
        },
        plugins: {
            legend: {
                display: false
            },
            tooltip: {
                callbacks: {
                    label: (context: { dataset: { label?: string }; raw: unknown }) => {
                        const val = context.raw as number;
                        const percent = (val / MAX_NISA_LIMIT) * 100;
                        const formatted = new Intl.NumberFormat('ja-JP', {
                            style: 'currency',
                            currency: 'JPY',
                            maximumFractionDigits: 0
                        }).format(val);
                        return `${context.dataset.label}: ${formatted} (${percent.toFixed(1)}%)`;
                    }
                }
            },
            datalabels: {
                display: true
            }
        }
    };

    // 合計利用率
    const usedPercent = (totalCost / MAX_NISA_LIMIT) * 100;

    return (
        <div className="nisa-usage-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.875rem' }}>
                <span>利用額(元本): {new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY', maximumFractionDigits: 0 }).format(totalCost)}</span>
                <span>残枠: {new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY', maximumFractionDigits: 0 }).format(unusedValue)}</span>
            </div>
            <div className="chart-container" style={{ height: '80px' }}>
                <Bar data={data} options={options} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <span>利用率: {usedPercent.toFixed(1)}%</span>
            </div>
        </div>
    );
}
