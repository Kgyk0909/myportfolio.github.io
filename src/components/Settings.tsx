import { useState, useEffect } from 'react';
import { usePortfolioStore } from '../stores/portfolioStore';
import type { AssetAllocation, CardConfig, CardId } from '../types';
import { AllocationInput } from './AllocationInput';
import {
    REGION_LABELS,
    DEFAULT_REGION_COLORS,
    getCustomRegionColors,
    saveCustomRegionColors,
    type RegionColors,
    DEFAULT_CARD_CONFIGS,
    CARD_LABELS,
    getCardConfigs,
    saveCardConfigs,
} from '../types';

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

const defaultTarget: AssetAllocation = {
    us: 50,
    japan: 20,
    developed: 15,
    emerging: 10,
    other: 5
};

// ソート可能なカード設定アイテム
function SortableCardItem({
    config,
    onChange,
}: {
    config: CardConfig;
    onChange: (id: CardId, visible: boolean) => void;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: config.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    const isHoldings = config.id === 'holdings';

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`card-config-item ${isDragging ? 'dragging' : ''}`}
            {...attributes}
            {...listeners}
        >
            <div className="card-config-left">
                <i className="fa-solid fa-grip-vertical drag-handle"></i>
                <span className="card-config-label">{CARD_LABELS[config.id]}</span>
            </div>
            <div className="card-config-right">
                {isHoldings ? (
                    <span className="card-config-always-visible">常に表示</span>
                ) : (
                    <label className="toggle-switch">
                        <input
                            type="checkbox"
                            checked={config.visible}
                            onChange={(e) => {
                                e.stopPropagation();
                                onChange(config.id, e.target.checked);
                            }}
                            onClick={(e) => e.stopPropagation()}
                        />
                        <span className="toggle-slider"></span>
                    </label>
                )}
            </div>
        </div>
    );
}

export function Settings() {
    const {
        portfolios,
        holdings,
        loadPortfolios,
        updatePortfolio
    } = usePortfolioStore();

    const [targetAllocation, setTargetAllocation] = useState<AssetAllocation>(defaultTarget);
    const [regionColors, setRegionColors] = useState<RegionColors>(DEFAULT_REGION_COLORS);
    const [cardConfigs, setCardConfigs] = useState<CardConfig[]>(DEFAULT_CARD_CONFIGS);

    // センサー設定（長押し300msでドラッグ開始）
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                delay: 300,
                tolerance: 5,
            },
        }),
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 300,
                tolerance: 5,
            },
        })
    );

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
        // カード設定を取得
        setCardConfigs(getCardConfigs());
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

    // カード設定の可視性変更
    const handleCardVisibilityChange = (id: CardId, visible: boolean) => {
        setCardConfigs(configs =>
            configs.map(c => c.id === id ? { ...c, visible } : c)
        );
    };

    // カード設定のドラッグ終了
    const handleCardDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            setCardConfigs(configs => {
                const oldIndex = configs.findIndex(c => c.id === active.id);
                const newIndex = configs.findIndex(c => c.id === over.id);

                const newConfigs = arrayMove(configs, oldIndex, newIndex);
                // orderを更新
                return newConfigs.map((c, i) => ({ ...c, order: i }));
            });
        }
    };

    // カード設定の保存
    const handleSaveCardConfigs = () => {
        saveCardConfigs(cardConfigs);
        alert('カード表示設定を保存しました。');
    };

    // カード設定のリセット
    const handleResetCardConfigs = () => {
        setCardConfigs(DEFAULT_CARD_CONFIGS);
        saveCardConfigs(DEFAULT_CARD_CONFIGS);
        alert('カード表示設定をリセットしました。');
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
    const sortedCardConfigs = [...cardConfigs].sort((a, b) => a.order - b.order);

    return (
        <div className="settings">
            <h2 style={{ marginBottom: '24px' }}>設定</h2>

            {/* カード表示設定 */}
            <div className="card">
                <h4 className="card-title">カード表示設定</h4>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: '8px 0 16px' }}>
                    メイン画面のカードの並び順と表示/非表示を設定
                </p>
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleCardDragEnd}
                >
                    <SortableContext
                        items={sortedCardConfigs.map(c => c.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        <div className="card-configs-list">
                            {sortedCardConfigs.map(config => (
                                <SortableCardItem
                                    key={config.id}
                                    config={config}
                                    onChange={handleCardVisibilityChange}
                                />
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
                <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                    <button
                        className="btn btn-primary"
                        onClick={handleSaveCardConfigs}
                    >
                        💾 保存
                    </button>
                    <button
                        className="btn btn-secondary"
                        onClick={handleResetCardConfigs}
                    >
                        🔄 リセット
                    </button>
                </div>
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
