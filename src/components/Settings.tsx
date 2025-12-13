import { useState, useEffect, useCallback } from 'react';
import { usePortfolioStore } from '../stores/portfolioStore';
import { fetchPrices } from '../services/priceService';
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
        updatePortfolio,
        updatePrices
    } = usePortfolioStore();

    const [isUpdating, setIsUpdating] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
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

    const handleUpdatePrices = useCallback(async () => {
        if (holdings.length === 0) return;

        setIsUpdating(true);
        try {
            const tickers = holdings.map(h => h.ticker);
            const prices = await fetchPrices(tickers);

            const updatedHoldings = holdings.map(h => ({
                ...h,
                currentPrice: prices.get(h.ticker)?.price ?? h.currentPrice
            }));

            await updatePrices(updatedHoldings);
            setLastUpdated(new Date());
        } catch (error) {
            console.error('Failed to update prices:', error);
            alert('価格の更新に失敗しました。APIサーバーが起動しているか確認してください。');
        } finally {
            setIsUpdating(false);
        }
    }, [holdings, updatePrices]);

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

            {/* 価格更新 */}
            <div className="card">
                <h4 className="card-title">価格データ更新</h4>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: '8px 0 16px' }}>
                    登録銘柄の最新価格を取得します
                </p>
                {lastUpdated && (
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                        最終更新: {lastUpdated.toLocaleString('ja-JP')}
                    </p>
                )}
                <button
                    className="btn btn-primary"
                    onClick={handleUpdatePrices}
                    disabled={isUpdating || holdings.length === 0}
                >
                    {isUpdating ? (
                        <>
                            <span className="loading-spinner" style={{ width: '16px', height: '16px' }} />
                            更新中...
                        </>
                    ) : (
                        '🔄 価格を更新'
                    )}
                </button>
                {holdings.length === 0 && (
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                        ※ 銘柄を登録してから更新してください
                    </p>
                )}
            </div>

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

            {/* APIステータス */}
            <div className="card">
                <h4 className="card-title">API設定</h4>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: '8px 0' }}>
                    価格取得API URL:
                </p>
                <code style={{
                    display: 'block',
                    padding: '8px 12px',
                    background: 'var(--primary-100)',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    wordBreak: 'break-all'
                }}>
                    {import.meta.env.VITE_API_URL || 'http://localhost:8000'}
                </code>
            </div>
        </div>
    );
}
