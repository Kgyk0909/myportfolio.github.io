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
    name: string;                    // 銘柄名（自由入力）
    ticker: string;                  // ティッカーシンボル（必須）
    shares: number;                  // 保有口数（必須）
    averageCost?: number;            // 平均取得価格（任意）
    allocation: AssetAllocation;     // アセットクラス比率（必須）
    currentPrice?: number;           // 現在の価格
    lastUpdated?: Date;              // 最終更新日時
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
    currentAllocation: AssetAllocation;  // 現在のアロケーション
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
