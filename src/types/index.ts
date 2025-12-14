// アセットクラス（地域別）比率
export interface AssetAllocation {
    us: number;         // 米国
    japan: number;      // 日本
    developed: number;  // 日米除く先進国
    emerging: number;   // 新興国
    other: number;      // その他（債券など）
}

// 保有銘柄
export interface Holding {
    id?: number;
    portfolioId: number;
    sortOrder?: number;              // 並び順
    name: string;                    // 銘柄名（必須）
    ticker?: string;                 // ティッカーシンボル（任意）
    shares?: number;                 // 保有口数（任意）
    averageCost?: number;            // 平均取得価格（任意）
    allocation: AssetAllocation;     // アセットクラス比率（必須）
    currentPrice?: number;           // 現在の価格（API取得）
    currentValue: number;            // 評価額（必須）
    isManualValue?: boolean;         // 評価額手動入力フラグ
    totalCost?: number;              // 取得額（任意）
    isManualCost?: boolean;          // 取得額手動入力フラグ
    accountType?: AccountType;       // 口座区分
    lastUpdated?: Date;              // 最終更新日時
}

// 口座区分
export type AccountType = 'specific' | 'nisa_growth' | 'nisa_tsumitate' | 'old_nisa';

// 口座区分のラベル
export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
    specific: '特定(一般)',
    nisa_growth: '新NISA(成長)',
    nisa_tsumitate: '新NISA(つみたて)',
    old_nisa: '旧NISA'
};

// カードID
export type CardId = 'summary' | 'allocation' | 'allocation_specific' | 'allocation_nisa' | 'nisa_usage' | 'comparison' | 'holdings';

// カード設定
export interface CardConfig {
    id: CardId;
    visible: boolean;  // 表示/非表示
    order: number;     // 表示順
}

// デフォルトカード設定
export const DEFAULT_CARD_CONFIGS: CardConfig[] = [
    { id: 'summary', visible: true, order: 0 },
    { id: 'allocation', visible: true, order: 1 },
    { id: 'allocation_specific', visible: false, order: 1.1 }, // 特定口座（初期非表示）
    { id: 'allocation_nisa', visible: false, order: 1.2 },     // 新NISA（初期非表示）
    { id: 'nisa_usage', visible: true, order: 1.5 },
    { id: 'comparison', visible: true, order: 2 },
    { id: 'holdings', visible: true, order: 3 },
];

// カードラベル
export const CARD_LABELS: Record<CardId, string> = {
    summary: '評価額',
    allocation: '地域別分散状況',
    allocation_specific: '地域別分散状況（特定口座）',
    allocation_nisa: '地域別分散状況（新NISA）',
    nisa_usage: '新NISA枠利用状況',
    comparison: '目標との比較',
    holdings: '保有銘柄',
};

// カード設定をLocalStorageから取得
export function getCardConfigs(): CardConfig[] {
    const stored = localStorage.getItem('cardConfigs');
    if (stored) {
        try {
            const parsed = JSON.parse(stored) as CardConfig[];
            // 保存データにない新しいカード設定があればマージする
            const merged = [...parsed];
            let hasChanges = false;
            for (const defaultConfig of DEFAULT_CARD_CONFIGS) {
                if (!merged.some(c => c.id === defaultConfig.id)) {
                    merged.push(defaultConfig);
                    hasChanges = true;
                }
            }
            // 変更があった場合は保存し直す（次回以降のために）
            if (hasChanges) {
                saveCardConfigs(merged);
            }
            return merged;
        } catch {
            return DEFAULT_CARD_CONFIGS;
        }
    }
    return DEFAULT_CARD_CONFIGS;
}

// カード設定をLocalStorageに保存
export function saveCardConfigs(configs: CardConfig[]): void {
    localStorage.setItem('cardConfigs', JSON.stringify(configs));
}

// ポートフォリオ
export interface Portfolio {
    id?: number;
    name: string;                    // ポートフォリオ名（例：特定口座、NISA）
    createdAt: Date;
    targetAllocation?: AssetAllocation;  // 目標アロケーション
}

// 計算結果の型
export interface PortfolioSummary {
    totalValue: number;              // 資産総額
    totalCost: number;               // 投資元本
    totalGain: number;               // 損益額
    gainPercent: number;             // 損益率
    currentAllocation: AssetAllocation;  // 現在のアロケーション(評価額ベース)
    costAllocation: AssetAllocation;     // 現在のアロケーション(取得額ベース)
}

// 価格データ取得結果
export interface PriceData {
    ticker: string;
    price: number;
    currency: string;
    timestamp: string;
}

// 地域ラベル
export const REGION_LABELS: Record<keyof AssetAllocation, string> = {
    us: '米国',
    japan: '日本',
    developed: '先進国（日米除く）',
    emerging: '新興国',
    other: 'その他'
};

// 地域の色
export const DEFAULT_REGION_COLORS: Record<keyof AssetAllocation, string> = {
    us: '#3b82f6',       // 青
    japan: '#ef4444',     // 赤
    developed: '#22c55e', // 緑
    emerging: '#f59e0b',  // オレンジ
    other: '#8b5cf6'      // 紫
};

// 互換性のためのエイリアス
export const REGION_COLORS = DEFAULT_REGION_COLORS;

// カスタムカラー型
export type RegionColors = Record<keyof AssetAllocation, string>;

// カスタムカラーをlocalStorageから取得
export function getCustomRegionColors(): RegionColors {
    const stored = localStorage.getItem('regionColors');
    if (stored) {
        try {
            return JSON.parse(stored) as RegionColors;
        } catch {
            return DEFAULT_REGION_COLORS;
        }
    }
    return DEFAULT_REGION_COLORS;
}

// カスタムカラーをlocalStorageに保存
export function saveCustomRegionColors(colors: RegionColors): void {
    localStorage.setItem('regionColors', JSON.stringify(colors));
}

// アセットクラス比率テンプレート
export interface AllocationTemplate {
    id: string;
    name: string;
    allocation: AssetAllocation;
    isDefault: boolean; // 削除不可フラグ
}

// デフォルトテンプレート
export const DEFAULT_ALLOCATION_TEMPLATES: AllocationTemplate[] = [
    {
        id: 'global-equity',
        name: '全世界株式',
        allocation: { us: 63.1, japan: 5.1, developed: 21.1, emerging: 10.7, other: 0 },
        isDefault: true
    },
    {
        id: 'developed-equity',
        name: '先進国株式',
        allocation: { us: 71.3, japan: 0, developed: 28.7, emerging: 0, other: 0 },
        isDefault: true
    },
    {
        id: 'us-equity',
        name: '米国株式',
        allocation: { us: 100, japan: 0, developed: 0, emerging: 0, other: 0 },
        isDefault: true
    },
    {
        id: 'japan-equity',
        name: '国内株式',
        allocation: { us: 0, japan: 100, developed: 0, emerging: 0, other: 0 },
        isDefault: true
    },
    {
        id: 'emerging-equity',
        name: '新興国株式',
        allocation: { us: 0, japan: 0, developed: 0, emerging: 100, other: 0 },
        isDefault: true
    }
];

// テンプレートをLocalStorageから取得
export function getAllocationTemplates(): AllocationTemplate[] {
    const stored = localStorage.getItem('allocationTemplates');
    if (stored) {
        try {
            const templates = JSON.parse(stored) as AllocationTemplate[];
            // デフォルトテンプレートが不足している場合は補完する（アップデート対応）
            const merged = [...DEFAULT_ALLOCATION_TEMPLATES];

            // 保存済みのデフォルト以外のテンプレートを追加
            templates.forEach(t => {
                if (!t.isDefault) {
                    merged.push(t);
                }
            });

            return merged;
        } catch {
            return DEFAULT_ALLOCATION_TEMPLATES;
        }
    }
    return DEFAULT_ALLOCATION_TEMPLATES;
}

// テンプレートをLocalStorageに保存
export function saveAllocationTemplates(templates: AllocationTemplate[]): void {
    // デフォルト以外のものだけ保存する手もあるが、順序保持などのために全保存する
    localStorage.setItem('allocationTemplates', JSON.stringify(templates));
    localStorage.setItem('allocationTemplates', JSON.stringify(templates));
}

// 銘柄追加位置の設定
export type AddPosition = 'top' | 'bottom';

export function getAddPosition(): AddPosition {
    return (localStorage.getItem('addPosition') as AddPosition) || 'bottom';
}

export function saveAddPosition(position: AddPosition): void {
    localStorage.setItem('addPosition', position);
}
