import { useEffect } from 'react';
import { usePortfolioStore } from '../stores/portfolioStore';
import { AllocationPieChart } from './AllocationPieChart';
import { AllocationComparisonChart } from './AllocationComparisonChart';
import type { AssetAllocation } from '../types';

// デフォルトの目標アロケーション
const defaultTarget: AssetAllocation = {
    us: 50,
    japan: 20,
    developed: 15,
    emerging: 10,
    other: 5
};

export function Dashboard() {
    const { portfolios, holdings, loadPortfolios, getAllPortfoliosSummary } = usePortfolioStore();

    useEffect(() => {
        loadPortfolios();
    }, [loadPortfolios]);

    const summary = getAllPortfoliosSummary();
    const hasHoldings = holdings.length > 0;

    // すべてのポートフォリオから目標アロケーションを取得（最初の設定済みポートフォリオから）
    const targetAllocation = portfolios.find(p => p.targetAllocation)?.targetAllocation ?? defaultTarget;

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('ja-JP', {
            style: 'currency',
            currency: 'JPY',
            maximumFractionDigits: 0
        }).format(value);
    };

    return (
        <div className="dashboard">
            {/* サマリーカード */}
            <div className="card summary-card">
                <h3 className="card-title">資産総額</h3>
                <div className="summary-value">{formatCurrency(summary.totalValue)}</div>
                {summary.totalCost > 0 && (
                    <div className={`summary-change ${summary.totalGain >= 0 ? 'positive' : 'negative'}`}>
                        {summary.totalGain >= 0 ? '▲' : '▼'} {formatCurrency(Math.abs(summary.totalGain))}
                        ({summary.gainPercent >= 0 ? '+' : ''}{summary.gainPercent.toFixed(2)}%)
                    </div>
                )}
            </div>

            {/* 地域別分散グラフ */}
            {hasHoldings ? (
                <>
                    <div className="card">
                        <AllocationPieChart
                            allocation={summary.currentAllocation}
                            title="地域別分散状況"
                        />
                    </div>

                    <div className="card">
                        <AllocationComparisonChart
                            current={summary.currentAllocation}
                            target={targetAllocation}
                        />
                    </div>
                </>
            ) : (
                <div className="card">
                    <div className="empty-state">
                        <div className="empty-icon">📊</div>
                        <div className="empty-title">まだ銘柄がありません</div>
                        <div className="empty-description">
                            ポートフォリオを作成して銘柄を追加しましょう
                        </div>
                    </div>
                </div>
            )}

            {/* ポートフォリオ一覧 */}
            <div className="card">
                <div className="card-header">
                    <h4 className="card-title">ポートフォリオ</h4>
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                        {portfolios.length}件
                    </span>
                </div>
                {portfolios.length === 0 ? (
                    <div className="empty-state" style={{ padding: '16px' }}>
                        <div className="empty-description">
                            「ポートフォリオ」タブから作成してください
                        </div>
                    </div>
                ) : (
                    portfolios.map(portfolio => (
                        <div className="portfolio-item" key={portfolio.id}>
                            <span className="portfolio-name">{portfolio.name}</span>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
