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

interface NisaUsageBarProps {
    allocation: AssetAllocation;
    totalNisaValue: number;
}

export function NisaUsageBar({ allocation, totalNisaValue }: NisaUsageBarProps) {
    const regionColors = getCustomRegionColors();
    const regions = Object.keys(allocation) as (keyof AssetAllocation)[];

    // NISA上限 1800万円
    const MAX_NISA_LIMIT = 18_000_000;

    // 未使用枠
    const unusedValue = Math.max(0, MAX_NISA_LIMIT - totalNisaValue);

    // データセット構築
    // 1つのバー（indexAxis: 'y'）に、各地域 + 未使用枠を積み上げる
    // dataset[0]: 米国 => value: totalNisaValue * (us / 100)

    const datasets = regions.map(region => {
        // allocationは%なので金額に換算
        const value = totalNisaValue * (allocation[region] / 100);
        return {
            label: REGION_LABELS[region],
            data: [value],
            backgroundColor: regionColors[region],
            barThickness: 32
        };
    });

    // 未使用枠を追加
    datasets.push({
        label: '未使用枠',
        data: [unusedValue],
        backgroundColor: '#e2e8f0', // 薄いグレー
        barThickness: 32
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
                    callback: (value: string | number) => {
                        return (Number(value) / 10000) + '万';
                    }
                }
            },
            y: {
                stacked: true,
                display: false // Y軸ラベル（"新NISA利用状況"）はカードタイトルで十分なので非表示
            }
        },
        plugins: {
            legend: {
                display: false // 凡例は地域が多いと邪魔かつ円グラフと重複するので非表示で良いか、下に出すか。要望は「分散状況+未使用枠」なので出したほうが親切。
                // position: 'bottom' as const
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
            }
        }
    };

    // 合計利用率
    const usedPercent = (totalNisaValue / MAX_NISA_LIMIT) * 100;

    return (
        <div className="nisa-usage-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.875rem' }}>
                <span>利用額: {new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY', maximumFractionDigits: 0 }).format(totalNisaValue)}</span>
                <span>残枠: {new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY', maximumFractionDigits: 0 }).format(unusedValue)}</span>
            </div>
            <div className="chart-container" style={{ height: '80px' }}>
                <Bar data={data} options={options} />
            </div>
            {/* 簡易凡例（未使用枠だけ特別なので） */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <span>利用率: {usedPercent.toFixed(1)}%</span>
            </div>
        </div>
    );
}
