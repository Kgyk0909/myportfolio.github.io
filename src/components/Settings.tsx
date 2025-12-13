import { useState, useEffect } from 'react';
import { usePortfolioStore } from '../stores/portfolioStore';
import type { AssetAllocation } from '../types';
import { AllocationInput } from './AllocationInput';
import { REGION_LABELS, DEFAULT_REGION_COLORS, getCustomRegionColors, saveCustomRegionColors, type RegionColors } from '../types';

const defaultTarget: AssetAllocation = {
    us: 50,
    japan: 20,
    developed: 15,
    emerging: 10,
    other: 5
};

export function Settings() {
    const {
        portfolios,
        holdings,
        loadPortfolios,
        updatePortfolio
    } = usePortfolioStore();

    const [targetAllocation, setTargetAllocation] = useState<AssetAllocation>(defaultTarget);
    const [regionColors, setRegionColors] = useState<RegionColors>(DEFAULT_REGION_COLORS);

    useEffect(() => {
        loadPortfolios();
        // ストレージから目標アロケーションを取得
        const stored = localStorage.getItem('targetAllocation');
        if (stored) {
            try {
                setTargetAllocation(JSON.parse(stored) as AssetAllocation);
            } catch {
                // ignore
            }
        }
        // カスタムカラーを取得
        setRegionColors(getCustomRegionColors());
    }, [loadPortfolios]);

    const handleSaveTarget = () => {
        localStorage.setItem('targetAllocation', JSON.stringify(targetAllocation));

        // すべてのポートフォリオに目標を設定
        portfolios.forEach(p => {
            if (p.id) {
                updatePortfolio(p.id, { targetAllocation });
            }
        });

        alert('目標アロケーションを保存しました');
    };

    const handleColorChange = (region: keyof AssetAllocation, color: string) => {
        const newColors = { ...regionColors, [region]: color };
        setRegionColors(newColors);
    };

    const handleSaveColors = () => {
        saveCustomRegionColors(regionColors);
        alert('グラフカラーを保存しました。ページを更新すると反映されます。');
    };

    const handleResetColors = () => {
        setRegionColors(DEFAULT_REGION_COLORS);
        saveCustomRegionColors(DEFAULT_REGION_COLORS);
        alert('グラフカラーをリセットしました。');
    };

    const handleExportData = () => {
        const data = {
            portfolios,
            holdings,
            targetAllocation,
            exportedAt: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `myportfolio-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const regions = Object.keys(regionColors) as (keyof AssetAllocation)[];

    return (
        <div className="settings">
            <h2 style={{ marginBottom: '24px' }}>設定</h2>

            {/* 目標アロケーション */}
            <div className="card">
                <h4 className="card-title">目標アセットアロケーション</h4>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: '8px 0 16px' }}>
                    ポートフォリオ全体の目標配分を設定
                </p>
                <AllocationInput
                    value={targetAllocation}
                    onChange={setTargetAllocation}
                />
                <button
                    className="btn btn-primary"
                    style={{ marginTop: '16px' }}
                    onClick={handleSaveTarget}
                >
                    💾 保存
                </button>
            </div>

            {/* グラフカラー設定 */}
            <div className="card">
                <h4 className="card-title">グラフカラー設定</h4>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: '8px 0 16px' }}>
                    各地域のグラフ表示色をカスタマイズ
                </p>
                <div className="color-settings">
                    {regions.map(region => (
                        <div className="color-item" key={region}>
                            <label className="color-label">{REGION_LABELS[region]}</label>
                            <div className="color-input-wrapper">
                                <input
                                    type="color"
                                    value={regionColors[region]}
                                    onChange={(e) => handleColorChange(region, e.target.value)}
                                    className="color-picker"
                                />
                                <span className="color-value">{regionColors[region]}</span>
                            </div>
                        </div>
                    ))}
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                    <button
                        className="btn btn-primary"
                        onClick={handleSaveColors}
                    >
                        💾 保存
                    </button>
                    <button
                        className="btn btn-secondary"
                        onClick={handleResetColors}
                    >
                        🔄 リセット
                    </button>
                </div>
            </div>

            {/* データエクスポート */}
            <div className="card">
                <h4 className="card-title">データ管理</h4>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: '8px 0 16px' }}>
                    ポートフォリオデータのバックアップ
                </p>
                <button
                    className="btn btn-secondary"
                    onClick={handleExportData}
                >
                    📥 JSONエクスポート
                </button>
            </div>
        </div>
    );
}
