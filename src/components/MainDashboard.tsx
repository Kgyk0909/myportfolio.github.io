import { useState } from 'react';
import { usePortfolioStore } from '../stores/portfolioStore';
import { AllocationPieChart } from './AllocationPieChart';
import { AllocationComparisonChart } from './AllocationComparisonChart';
import { HoldingForm } from './HoldingForm';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import type { AssetAllocation, Holding } from '../types';

// デフォルトの目標アロケーション
const defaultTarget: AssetAllocation = {
    us: 50,
    japan: 20,
    developed: 15,
    emerging: 10,
    other: 5
};

export function MainDashboard() {
    const {
        portfolios,
        holdings,
        selectedPortfolioId,
        getPortfolioSummary,
        deleteHolding
    } = usePortfolioStore();

    const [showHoldingForm, setShowHoldingForm] = useState(false);
    const [editHolding, setEditHolding] = useState<Holding | undefined>();
    const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; holding?: Holding }>({
        isOpen: false
    });

    // 折りたたみ状態
    const [summaryCollapsed, setSummaryCollapsed] = useState(false);
    const [allocationCollapsed, setAllocationCollapsed] = useState(false);
    const [comparisonCollapsed, setComparisonCollapsed] = useState(false);
    const [holdingsCollapsed, setHoldingsCollapsed] = useState(false);

    const selectedPortfolio = portfolios.find(p => p.id === selectedPortfolioId);
    const portfolioHoldings = holdings.filter(h => h.portfolioId === selectedPortfolioId);
    const summary = selectedPortfolioId ? getPortfolioSummary(selectedPortfolioId) : null;
    const targetAllocation = selectedPortfolio?.targetAllocation ?? defaultTarget;

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('ja-JP', {
            style: 'currency',
            currency: 'JPY',
            maximumFractionDigits: 0
        }).format(value);
    };

    const handleEditHolding = (holding: Holding) => {
        setEditHolding(holding);
        setShowHoldingForm(true);
    };

    const handleAddHolding = () => {
        setEditHolding(undefined);
        setShowHoldingForm(true);
    };

    const handleDeleteHolding = async () => {
        if (deleteConfirm.holding?.id) {
            await deleteHolding(deleteConfirm.holding.id);
        }
        setDeleteConfirm({ isOpen: false });
    };

    // ポートフォリオが未選択の場合
    if (!selectedPortfolio) {
        return (
            <div className="main-dashboard">
                <div className="card">
                    <div className="empty-state">
                        <div className="empty-icon">
                            <i className="fa-solid fa-folder-open"></i>
                        </div>
                        <div className="empty-title">ポートフォリオを選択してください</div>
                        <div className="empty-description">
                            左上のメニューからポートフォリオを選択または新規作成してください
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="main-dashboard">
            {/* サマリーカード */}
            {summary && (
                <div className="card summary-card">
                    <div className="card-header-collapsible">
                        <h3 className="card-title">評価額</h3>
                        <button
                            className="collapse-toggle collapse-toggle-light"
                            onClick={() => setSummaryCollapsed(!summaryCollapsed)}
                        >
                            <i className={`fa-solid fa-chevron-${summaryCollapsed ? 'down' : 'up'}`}></i>
                        </button>
                    </div>
                    {!summaryCollapsed && (
                        <>
                            <div className="summary-value">{formatCurrency(summary.totalValue)}</div>
                            {summary.totalCost > 0 && (
                                <div className={`summary-change ${summary.totalGain >= 0 ? 'positive' : 'negative'}`}>
                                    {summary.totalGain >= 0 ? (
                                        <i className="fa-solid fa-caret-up"></i>
                                    ) : (
                                        <i className="fa-solid fa-caret-down"></i>
                                    )}
                                    <span>{formatCurrency(Math.abs(summary.totalGain))}</span>
                                    <span>({summary.gainPercent >= 0 ? '+' : ''}{summary.gainPercent.toFixed(2)}%)</span>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* グラフセクション */}
            {portfolioHoldings.length > 0 && summary && (
                <>
                    <div className="card">
                        <div className="card-header-collapsible">
                            <h4 className="card-title">地域別分散状況</h4>
                            <button
                                className="collapse-toggle"
                                onClick={() => setAllocationCollapsed(!allocationCollapsed)}
                            >
                                <i className={`fa-solid fa-chevron-${allocationCollapsed ? 'down' : 'up'}`}></i>
                            </button>
                        </div>
                        {!allocationCollapsed && (
                            <AllocationPieChart
                                allocation={summary.currentAllocation}
                            />
                        )}
                    </div>

                    <div className="card">
                        <div className="card-header-collapsible">
                            <h4 className="card-title">目標との比較</h4>
                            <button
                                className="collapse-toggle"
                                onClick={() => setComparisonCollapsed(!comparisonCollapsed)}
                            >
                                <i className={`fa-solid fa-chevron-${comparisonCollapsed ? 'down' : 'up'}`}></i>
                            </button>
                        </div>
                        {!comparisonCollapsed && (
                            <AllocationComparisonChart
                                current={summary.currentAllocation}
                                target={targetAllocation}
                            />
                        )}
                    </div>
                </>
            )}

            {/* 保有銘柄リスト */}
            <div className="card">
                <div className="card-header-collapsible">
                    <div className="card-header-left">
                        <h4 className="card-title">保有銘柄</h4>
                        <span className="holding-count">{portfolioHoldings.length}件</span>
                    </div>
                    <button
                        className="collapse-toggle"
                        onClick={() => setHoldingsCollapsed(!holdingsCollapsed)}
                    >
                        <i className={`fa-solid fa-chevron-${holdingsCollapsed ? 'down' : 'up'}`}></i>
                    </button>
                </div>

                {!holdingsCollapsed && (
                    portfolioHoldings.length === 0 ? (
                        <div className="empty-state" style={{ padding: '16px' }}>
                            <div className="empty-icon">
                                <i className="fa-solid fa-chart-line"></i>
                            </div>
                            <div className="empty-title">銘柄がありません</div>
                            <div className="empty-description">
                                「+」ボタンから追加してください
                            </div>
                        </div>
                    ) : (
                        <div className="holdings-list">
                            {portfolioHoldings.map(holding => {
                                const currentValue = (holding.currentPrice ?? 0) * holding.shares;
                                const costValue = (holding.averageCost ?? 0) * holding.shares;
                                const gainPercent = costValue > 0 ? ((currentValue - costValue) / costValue) * 100 : 0;

                                return (
                                    <div
                                        className="holding-item"
                                        key={holding.id}
                                        onClick={() => handleEditHolding(holding)}
                                    >
                                        <div className="holding-left">
                                            <div className="holding-name">{holding.name || holding.ticker}</div>
                                            {holding.name && <div className="holding-ticker">{holding.ticker}</div>}
                                        </div>
                                        <div className="holding-right">
                                            <div className="holding-stat-row">
                                                <span className="stat-label">保有数：</span>
                                                <span className="stat-value">{holding.shares.toLocaleString()} 口</span>
                                            </div>
                                            <div className="holding-stat-row">
                                                <span className="stat-label">取得額：</span>
                                                <span className="stat-value">{formatCurrency(costValue)}</span>
                                            </div>
                                            <div className="holding-stat-row">
                                                <span className="stat-label">評価額：</span>
                                                <span className="stat-value">{formatCurrency(currentValue)}</span>
                                            </div>
                                            <div className={`holding-gain-badge ${gainPercent >= 0 ? 'positive' : 'negative'}`}>
                                                {gainPercent >= 0 ? '+' : ''}{gainPercent.toFixed(1)}%
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )
                )}
            </div>

            {/* 追加ボタン */}
            <button className="btn btn-primary btn-fab" onClick={handleAddHolding}>
                <i className="fa-solid fa-plus"></i>
            </button>

            {/* 銘柄編集モーダル */}
            {showHoldingForm && selectedPortfolioId && (
                <HoldingForm
                    portfolioId={selectedPortfolioId}
                    onClose={() => {
                        setShowHoldingForm(false);
                        setEditHolding(undefined);
                    }}
                    editHolding={editHolding}
                    onDelete={(holding) => setDeleteConfirm({ isOpen: true, holding })}
                />
            )}

            {/* 削除確認ダイアログ */}
            <DeleteConfirmDialog
                isOpen={deleteConfirm.isOpen}
                itemName={deleteConfirm.holding?.name || deleteConfirm.holding?.ticker || ''}
                onConfirm={handleDeleteHolding}
                onCancel={() => setDeleteConfirm({ isOpen: false })}
            />
        </div>
    );
}
