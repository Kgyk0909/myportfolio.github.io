import { useState, useEffect } from 'react';
import { usePortfolioStore } from '../stores/portfolioStore';
import type { AssetAllocation } from '../types';
import { AllocationInput } from './AllocationInput';

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
