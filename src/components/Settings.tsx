import { useState, useEffect } from 'react';
import { usePortfolioStore } from '../stores/portfolioStore';
import type { AssetAllocation, CardConfig, CardId } from '../types';
import { AllocationInput } from './AllocationInput';
import { AllocationPieChart } from './AllocationPieChart';
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
    type AllocationTemplate,
    getAllocationTemplates,
    saveAllocationTemplates,
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

// テンプレート編集モーダル
function TemplateSettingsModal({
    isOpen,
    onClose,
    onSave,
    initialTemplate,
    readonly
}: {
    isOpen: boolean;
    onClose: () => void;
    onSave: (template: AllocationTemplate) => void;
    initialTemplate?: AllocationTemplate;
    readonly?: boolean;
}) {
    if (!isOpen) return null;

    const [name, setName] = useState(initialTemplate?.name || '');
    const [allocation, setAllocation] = useState<AssetAllocation>(
        initialTemplate?.allocation || { us: 0, japan: 0, developed: 0, emerging: 0, other: 100 }
    );

    const total = Object.values(allocation).reduce((a, b) => a + b, 0);
    const isValid = Math.abs(total - 100) < 0.01 && name.trim() !== '';

    // readonlyの場合は保存ボタンを表示しない
    // 画面外クリックでのクローズは無効化（onClick削除）
    return (
        <div className="modal-overlay">
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3 className="modal-title">
                        {readonly ? 'テンプレート詳細' : (initialTemplate ? 'テンプレートを編集' : 'テンプレートを作成')}
                    </h3>
                    <button className="btn btn-icon btn-secondary" onClick={onClose}>✕</button>
                </div>
                <div className="modal-body">
                    <div className="form-group">
                        <label className="form-label">テンプレート名</label>
                        <input
                            type="text"
                            className="form-input"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="例：全世界株式"
                            disabled={readonly}
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">アセットクラス比率</label>
                        {/* AllocationInputにもdisabledを渡す必要があるが、現状ないのでviewのみにするか、AllocationInputを改修するか。
                            簡易的に、readonlyの場合はpointer-events-noneで操作不可にする */}
                        <div style={readonly ? { pointerEvents: 'none', opacity: 0.7 } : {}}>
                            <AllocationInput value={allocation} onChange={setAllocation} />
                        </div>
                    </div>
                </div>
                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>
                        {readonly ? '閉じる' : 'キャンセル'}
                    </button>
                    {!readonly && (
                        <button
                            className="btn btn-primary"
                            disabled={!isValid}
                            onClick={() => {
                                onSave({
                                    id: initialTemplate?.id || crypto.randomUUID(),
                                    name: name.trim(),
                                    allocation,
                                    isDefault: initialTemplate?.isDefault ?? false
                                });
                                onClose();
                            }}
                        >
                            保存
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
export function Settings() {
    const {
        portfolios,
        holdings,
        loadPortfolios
    } = usePortfolioStore();

    const [targetAllocation] = useState<AssetAllocation>(defaultTarget); // ダミー（型維持のため）
    const [regionColors, setRegionColors] = useState<RegionColors>(DEFAULT_REGION_COLORS);
    const [cardConfigs, setCardConfigs] = useState<CardConfig[]>(DEFAULT_CARD_CONFIGS);
    const [templates, setTemplates] = useState<AllocationTemplate[]>([]);

    // テンプレートモーダル用ステート
    const [editingTemplate, setEditingTemplate] = useState<AllocationTemplate | undefined>();
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);

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

    useEffect(() => {
        loadPortfolios();
        // カスタムカラーを取得
        setRegionColors(getCustomRegionColors());
        // カード設定を取得
        // カード設定を取得
        setCardConfigs(getCardConfigs());
        // テンプレートを取得
        setTemplates(getAllocationTemplates());
    }, [loadPortfolios]);

    // 目標アロケーション保存・取得処理は削除

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

    const handleSaveTemplate = (template: AllocationTemplate) => {
        let newTemplates;
        if (templates.some(t => t.id === template.id)) {
            // Update
            newTemplates = templates.map(t => t.id === template.id ? template : t);
        } else {
            // Add
            newTemplates = [...templates, template];
        }
        setTemplates(newTemplates);
        saveAllocationTemplates(newTemplates);
    };

    const handleCreateTemplate = () => {
        setEditingTemplate(undefined);
        setIsTemplateModalOpen(true);
    };

    const handleEditTemplate = (template: AllocationTemplate) => {
        setEditingTemplate(template);
        setIsTemplateModalOpen(true);
    };

    const handleDeleteTemplate = (id: string) => {
        if (!confirm('このテンプレートを削除してもよろしいですか？')) return;
        const newTemplates = templates.filter(t => t.id !== id);
        setTemplates(newTemplates);
        saveAllocationTemplates(newTemplates);
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

            {/* テンプレート管理（モーダルUIへ移行） */}
            <div className="card">
                <h4 className="card-title">比率テンプレート管理</h4>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: '8px 0 16px' }}>
                    よく使うアセットアロケーションをテンプレートとして保存・管理できます
                </p>

                <button
                    className="btn btn-primary"
                    style={{ marginBottom: '16px', width: '100%' }}
                    onClick={handleCreateTemplate}
                >
                    <i className="fa-solid fa-plus"></i> 新規テンプレート作成
                </button>

                <div className="templates-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {templates.map(template => (
                        <div
                            key={template.id}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '12px',
                                background: 'var(--bg-secondary)',
                                border: '1px solid var(--border-color)',
                                borderRadius: 'var(--border-radius)'
                            }}
                        >
                            <span style={{ fontWeight: 500 }}>{template.name}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                    {template.isDefault ? '初期プリセット' : 'カスタム'}
                                </span>
                                <button
                                    className="btn btn-icon btn-secondary-outline"
                                    style={{ width: '32px', height: '32px' }}
                                    onClick={() => handleEditTemplate(template)}
                                    title={template.isDefault ? "内容を確認" : "編集"}
                                >
                                    <i className={`fa-solid ${template.isDefault ? 'fa-eye' : 'fa-pen'}`}></i>
                                </button>
                                {!template.isDefault && (
                                    <button
                                        className="btn btn-icon btn-danger-outline"
                                        style={{ width: '32px', height: '32px', color: 'var(--accent-red)' }}
                                        onClick={() => handleDeleteTemplate(template.id)}
                                        title="削除"
                                    >
                                        <i className="fa-solid fa-trash"></i>
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* モーダル */}
            <TemplateSettingsModal
                isOpen={isTemplateModalOpen}
                onClose={() => setIsTemplateModalOpen(false)}
                onSave={handleSaveTemplate}
                initialTemplate={editingTemplate}
                readonly={editingTemplate?.isDefault}
            />

            {/* グラフカラー設定 */}
            <div className="card">
                <h4 className="card-title">グラフカラー設定</h4>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: '8px 0 16px' }}>
                    各地域のグラフ表示色をカスタマイズ
                </p>
                {/* グラフサイズと凡例制御 */}
                <div style={{ height: '220px', marginBottom: '24px', transform: 'scale(0.85)', transformOrigin: 'center' }}>
                    <AllocationPieChart
                        showLegend={false}
                        allocation={{
                            us: 59.1,
                            developed: 21.1,
                            japan: 5.1,
                            emerging: 10.7,
                            other: 4
                        }}
                    />
                </div>
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
