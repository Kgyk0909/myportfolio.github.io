import { useState, useEffect } from 'react';
import { usePortfolioStore } from '../stores/portfolioStore';
import { PortfolioForm } from './PortfolioForm';
import { HoldingForm } from './HoldingForm';
import type { Holding } from '../types';

export function PortfolioList() {
    const {
        portfolios,
        holdings,
        selectedPortfolioId,
        loadPortfolios,
        selectPortfolio,
        deletePortfolio,
        getPortfolioSummary,
        deleteHolding
    } = usePortfolioStore();

    const [showPortfolioForm, setShowPortfolioForm] = useState(false);
    const [editPortfolioId, setEditPortfolioId] = useState<number | undefined>();
    const [showHoldingForm, setShowHoldingForm] = useState(false);
    const [editHolding, setEditHolding] = useState<Holding | undefined>();

    useEffect(() => {
        loadPortfolios();
    }, [loadPortfolios]);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('ja-JP', {
            style: 'currency',
            currency: 'JPY',
            maximumFractionDigits: 0
        }).format(value);
    };

    const selectedPortfolio = portfolios.find(p => p.id === selectedPortfolioId);
    const portfolioHoldings = holdings.filter(h => h.portfolioId === selectedPortfolioId);
    const summary = selectedPortfolioId ? getPortfolioSummary(selectedPortfolioId) : null;

    const handleEditPortfolio = (id: number) => {
        setEditPortfolioId(id);
        setShowPortfolioForm(true);
    };

    const handleDeletePortfolio = async (id: number) => {
        if (window.confirm('このポートフォリオを削除しますか？銘柄も全て削除されます。')) {
            await deletePortfolio(id);
        }
    };

    const handleEditHolding = (holding: Holding) => {
        setEditHolding(holding);
        setShowHoldingForm(true);
    };

    const handleDeleteHolding = async (id: number) => {
        if (window.confirm('この銘柄を削除しますか？')) {
            await deleteHolding(id);
        }
    };

    return (
        <div className="portfolio-list">
            {/* ポートフォリオ選択 */}
            {!selectedPortfolioId && (
                <>
                    <div className="card-header" style={{ marginBottom: '16px' }}>
                        <h2>ポートフォリオ</h2>
                    </div>

                    {portfolios.length === 0 ? (
                        <div className="card">
                            <div className="empty-state">
                                <div className="empty-icon">📁</div>
                                <div className="empty-title">ポートフォリオがありません</div>
                                <div className="empty-description">
                                    「+」ボタンから新規作成してください
                                </div>
                            </div>
                        </div>
                    ) : (
                        portfolios.map(portfolio => (
                            <div
                                className="portfolio-item"
                                key={portfolio.id}
                                onClick={() => portfolio.id && selectPortfolio(portfolio.id)}
                            >
                                <div>
                                    <span className="portfolio-name">{portfolio.name}</span>
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        className="btn btn-secondary btn-icon"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (portfolio.id) handleEditPortfolio(portfolio.id);
                                        }}
                                    >
                                        ✎
                                    </button>
                                    <button
                                        className="btn btn-danger btn-icon"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (portfolio.id) handleDeletePortfolio(portfolio.id);
                                        }}
                                    >
                                        🗑
                                    </button>
                                </div>
                            </div>
                        ))
                    )}

                    <button
                        className="btn btn-primary btn-fab"
                        onClick={() => {
                            setEditPortfolioId(undefined);
                            setShowPortfolioForm(true);
                        }}
                    >
                        +
                    </button>
                </>
            )}

            {/* 銘柄一覧 */}
            {selectedPortfolio && (
                <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                        <button
                            className="btn btn-secondary btn-icon"
                            onClick={() => selectPortfolio(null)}
                        >
                            ←
                        </button>
                        <h2>{selectedPortfolio.name}</h2>
                    </div>

                    {summary && (
                        <div className="card summary-card" style={{ marginBottom: '16px' }}>
                            <h3 className="card-title">評価額</h3>
                            <div className="summary-value">{formatCurrency(summary.totalValue)}</div>
                            {summary.totalCost > 0 && (
                                <div className={`summary-change ${summary.totalGain >= 0 ? 'positive' : 'negative'}`}>
                                    {summary.totalGain >= 0 ? '▲' : '▼'} {formatCurrency(Math.abs(summary.totalGain))}
                                    ({summary.gainPercent >= 0 ? '+' : ''}{summary.gainPercent.toFixed(2)}%)
                                </div>
                            )}
                        </div>
                    )}

                    <div className="card">
                        <div className="card-header">
                            <h4 className="card-title">保有銘柄</h4>
                            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                                {portfolioHoldings.length}件
                            </span>
                        </div>

                        {portfolioHoldings.length === 0 ? (
                            <div className="empty-state" style={{ padding: '16px' }}>
                                <div className="empty-icon">📈</div>
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
                                            className="holding-item holding-item-detailed"
                                            key={holding.id}
                                            onClick={() => handleEditHolding(holding)}
                                        >
                                            <div className="holding-main">
                                                <div className="holding-header">
                                                    <div className="holding-name">{holding.name || holding.ticker}</div>
                                                    {holding.name && <div className="holding-ticker">{holding.ticker}</div>}
                                                </div>
                                                <div className="holding-stats">
                                                    <div className="holding-stat-row">
                                                        <span className="stat-label">保有数：</span>
                                                        <span className="stat-value">{holding.shares.toLocaleString()}口</span>
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
                                            <button
                                                className="btn btn-danger btn-icon"
                                                style={{ marginLeft: '8px', flexShrink: 0 }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (holding.id) handleDeleteHolding(holding.id);
                                                }}
                                            >
                                                🗑
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <button
                        className="btn btn-primary btn-fab"
                        onClick={() => {
                            setEditHolding(undefined);
                            setShowHoldingForm(true);
                        }}
                    >
                        +
                    </button>
                </>
            )}

            {/* モーダル */}
            {showPortfolioForm && (
                <PortfolioForm
                    onClose={() => setShowPortfolioForm(false)}
                    editId={editPortfolioId}
                />
            )}

            {showHoldingForm && selectedPortfolioId && (
                <HoldingForm
                    portfolioId={selectedPortfolioId}
                    onClose={() => {
                        setShowHoldingForm(false);
                        setEditHolding(undefined);
                    }}
                    editHolding={editHolding}
                />
            )}
        </div>
    );
}
