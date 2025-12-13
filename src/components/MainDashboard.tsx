import { useState, useEffect } from 'react';
import { usePortfolioStore } from '../stores/portfolioStore';
import { AllocationPieChart } from './AllocationPieChart';
import { AllocationComparisonChart } from './AllocationComparisonChart';
import { HoldingForm } from './HoldingForm';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import type { AssetAllocation, Holding, CardConfig, CardId } from '../types';
import { getCardConfigs, DEFAULT_CARD_CONFIGS } from '../types';

// dnd-kit imports
import {
    DndContext,
    closestCenter,
    PointerSensor,
    TouchSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    SortableContext,
    useSortable,
    verticalListSortingStrategy,
    arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// デフォルトの目標アロケーション
const defaultTarget: AssetAllocation = {
    us: 50,
    japan: 20,
    developed: 15,
    emerging: 10,
    other: 5
};

// ソート可能な保有銘柄アイテムコンポーネント
function SortableHoldingItem({
    holding,
    formatCurrency,
    onEdit,
}: {
    holding: Holding;
    formatCurrency: (value: number) => string;
    onEdit: (holding: Holding) => void;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: holding.id! });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        touchAction: 'none',
    };

    const currentValue = (holding.currentPrice ?? 0) * holding.shares;
    const costValue = (holding.averageCost ?? 0) * holding.shares;
    const gainPercent = costValue > 0 ? ((currentValue - costValue) / costValue) * 100 : 0;

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`holding-item ${isDragging ? 'dragging' : ''}`}
            {...attributes}
            {...listeners}
            onClick={(e) => {
                // ドラッグ中でなければ編集モーダルを開く
                if (!isDragging) {
                    onEdit(holding);
                }
                e.stopPropagation();
            }}
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
}

export function MainDashboard() {
    const {
        portfolios,
        holdings,
        selectedPortfolioId,
        getPortfolioSummary,
        deleteHolding,
        reorderHoldings
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

    // カード設定
    const [cardConfigs, setCardConfigs] = useState<CardConfig[]>(DEFAULT_CARD_CONFIGS);

    useEffect(() => {
        setCardConfigs(getCardConfigs());
    }, []);

    // センサー設定（長押し250msでドラッグ開始）
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                delay: 250,
                tolerance: 5,
            },
        }),
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 250,
                tolerance: 5,
            },
        })
    );

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

    // ドラッグ終了時の処理
    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id && selectedPortfolioId) {
            const oldIndex = portfolioHoldings.findIndex(h => h.id === active.id);
            const newIndex = portfolioHoldings.findIndex(h => h.id === over.id);

            if (oldIndex !== -1 && newIndex !== -1) {
                const newOrder = arrayMove(portfolioHoldings, oldIndex, newIndex);
                const orderedIds = newOrder.map(h => h.id!);
                await reorderHoldings(selectedPortfolioId, orderedIds);
            }
        }
    };

    // カード表示関数
    const renderCard = (cardId: CardId) => {
        switch (cardId) {
            case 'summary':
                if (!summary) return null;
                return (
                    <div className="card summary-card" key="summary">
                        <div className="card-header-collapsible">
                            <div className="card-header-left">
                                <h3 className="card-title">評価額</h3>
                            </div>
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
                );

            case 'allocation':
                if (portfolioHoldings.length === 0 || !summary) return null;
                return (
                    <div className="card" key="allocation">
                        <div className="card-header-collapsible">
                            <div className="card-header-left">
                                <h4 className="card-title">地域別分散状況</h4>
                            </div>
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
                );

            case 'comparison':
                if (portfolioHoldings.length === 0 || !summary) return null;
                return (
                    <div className="card" key="comparison">
                        <div className="card-header-collapsible">
                            <div className="card-header-left">
                                <h4 className="card-title">目標との比較</h4>
                            </div>
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
                );

            case 'holdings':
                return (
                    <div className="card" key="holdings">
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
                                <DndContext
                                    sensors={sensors}
                                    collisionDetection={closestCenter}
                                    onDragEnd={handleDragEnd}
                                >
                                    <SortableContext
                                        items={portfolioHoldings.map(h => h.id!)}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        <div className="holdings-list">
                                            {portfolioHoldings.map(holding => (
                                                <SortableHoldingItem
                                                    key={holding.id}
                                                    holding={holding}
                                                    formatCurrency={formatCurrency}
                                                    onEdit={handleEditHolding}
                                                />
                                            ))}
                                        </div>
                                    </SortableContext>
                                </DndContext>
                            )
                        )}
                    </div>
                );

            default:
                return null;
        }
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

    // カード設定に基づいて表示順序と可視性を制御
    const sortedConfigs = [...cardConfigs].sort((a, b) => a.order - b.order);

    return (
        <div className="main-dashboard">
            {sortedConfigs
                .filter(config => config.visible)
                .map(config => renderCard(config.id))}

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
