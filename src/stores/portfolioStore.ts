import { create } from 'zustand';
import { db } from '../db/database';
import type { Portfolio, Holding, AssetAllocation, PortfolioSummary } from '../types';
import { getAddPosition } from '../types';

interface PortfolioState {
    portfolios: Portfolio[];
    holdings: Holding[];
    selectedPortfolioId: number | null;
    isLoading: boolean;
    error: string | null;

    // ポートフォリオ操作
    loadPortfolios: () => Promise<void>;
    createPortfolio: (name: string, targetAllocation?: AssetAllocation) => Promise<Portfolio>;
    updatePortfolio: (id: number, updates: Partial<Portfolio>) => Promise<void>;
    deletePortfolio: (id: number) => Promise<void>;
    selectPortfolio: (id: number | null) => void;

    // 銘柄操作
    loadHoldings: (portfolioId: number) => Promise<void>;
    addHolding: (holding: Omit<Holding, 'id'>) => Promise<Holding>;
    updateHolding: (id: number, updates: Partial<Holding>) => Promise<void>;
    deleteHolding: (id: number) => Promise<void>;
    updatePrices: (holdings: Holding[]) => Promise<void>;
    reorderHoldings: (portfolioId: number, orderedIds: number[]) => Promise<void>;

    // 計算
    getPortfolioSummary: (portfolioId: number) => PortfolioSummary;
    getAllPortfoliosSummary: () => PortfolioSummary;
}

// 空のアロケーション（計算用）
const emptyAllocation: AssetAllocation = {
    us: 0,
    japan: 0,
    developed: 0,
    emerging: 0,
    other: 0
};

// デフォルトのアロケーション（新規作成用）
const defaultPortfolioAllocation: AssetAllocation = {
    us: 59.1,
    developed: 21.1,
    japan: 5.1,
    emerging: 10.7,
    other: 4
};

export const usePortfolioStore = create<PortfolioState>((set, get) => ({
    portfolios: [],
    holdings: [],
    selectedPortfolioId: null,
    isLoading: false,
    error: null,

    loadPortfolios: async () => {
        set({ isLoading: true, error: null });
        try {
            const portfolios = await db.portfolios.toArray();
            set({ portfolios, isLoading: false });

            // 最初のポートフォリオを自動選択してholdingsをロード
            const firstPortfolio = portfolios[0];
            if (firstPortfolio && firstPortfolio.id) {
                const firstId = firstPortfolio.id;
                set({ selectedPortfolioId: firstId });
                // holdingsをロード
                const holdings = await db.holdings
                    .where('portfolioId')
                    .equals(firstId)
                    .toArray();
                // sortOrderでソート
                holdings.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
                set({ holdings });
            }
        } catch (error) {
            set({ error: String(error), isLoading: false });
        }
    },

    createPortfolio: async (name: string, targetAllocation?: AssetAllocation) => {
        const portfolio: Omit<Portfolio, 'id'> = {
            name,
            createdAt: new Date(),
            targetAllocation: targetAllocation || defaultPortfolioAllocation
        };
        const id = await db.portfolios.add(portfolio as Portfolio);
        const newPortfolio = { ...portfolio, id } as Portfolio;
        set(state => ({ portfolios: [...state.portfolios, newPortfolio] }));
        return newPortfolio;
    },

    updatePortfolio: async (id: number, updates: Partial<Portfolio>) => {
        await db.portfolios.update(id, updates);
        set(state => ({
            portfolios: state.portfolios.map(p =>
                p.id === id ? { ...p, ...updates } : p
            )
        }));
    },

    deletePortfolio: async (id: number) => {
        await db.portfolios.delete(id);
        await db.holdings.where('portfolioId').equals(id).delete();
        set(state => ({
            portfolios: state.portfolios.filter(p => p.id !== id),
            holdings: state.holdings.filter(h => h.portfolioId !== id),
            selectedPortfolioId: state.selectedPortfolioId === id ? null : state.selectedPortfolioId
        }));
    },

    selectPortfolio: (id: number | null) => {
        set({ selectedPortfolioId: id });
        if (id !== null) {
            get().loadHoldings(id);
        }
    },

    loadHoldings: async (portfolioId: number) => {
        set({ isLoading: true, error: null });
        try {
            const holdings = await db.holdings
                .where('portfolioId')
                .equals(portfolioId)
                .toArray();
            // sortOrderでソート
            holdings.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
            set({ holdings, isLoading: false });
        } catch (error) {
            set({ error: String(error), isLoading: false });
        }
    },

    addHolding: async (holding: Omit<Holding, 'id'>) => {
        const position = getAddPosition();
        const currentHoldings = get().holdings.filter(h => h.portfolioId === holding.portfolioId);

        let sortOrder = 0;
        if (currentHoldings.length > 0) {
            if (position === 'bottom') {
                const maxOrder = Math.max(...currentHoldings.map(h => h.sortOrder ?? 0));
                sortOrder = maxOrder + 1;
            } else {
                const minOrder = Math.min(...currentHoldings.map(h => h.sortOrder ?? 0));
                sortOrder = minOrder - 1;
            }
        }

        const holdingWithOrder = { ...holding, sortOrder };
        const id = await db.holdings.add(holdingWithOrder as Holding);
        const newHolding = { ...holdingWithOrder, id } as Holding;

        // 追加後に全体のソート順を保証する（この時点では配列末尾に追加でよいが、sortOrderに基づいてソートしておくのが安全）
        set(state => ({
            holdings: [...state.holdings, newHolding].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        }));
        return newHolding;
    },

    updateHolding: async (id: number, updates: Partial<Holding>) => {
        await db.holdings.update(id, updates);
        set(state => ({
            holdings: state.holdings.map(h =>
                h.id === id ? { ...h, ...updates } : h
            )
        }));
    },

    deleteHolding: async (id: number) => {
        await db.holdings.delete(id);
        set(state => ({
            holdings: state.holdings.filter(h => h.id !== id)
        }));
    },

    updatePrices: async (holdings: Holding[]) => {
        for (const holding of holdings) {
            if (holding.id) {
                await db.holdings.update(holding.id, {
                    currentPrice: holding.currentPrice,
                    lastUpdated: new Date()
                });
            }
        }
        set(state => ({
            holdings: state.holdings.map(h => {
                const updated = holdings.find(uh => uh.id === h.id);
                return updated ? { ...h, currentPrice: updated.currentPrice, lastUpdated: new Date() } : h;
            })
        }));
    },

    getPortfolioSummary: (portfolioId: number): PortfolioSummary => {
        const holdings = get().holdings.filter(h => h.portfolioId === portfolioId);
        return calculateSummary(holdings);
    },

    getAllPortfoliosSummary: (): PortfolioSummary => {
        const holdings = get().holdings;
        return calculateSummary(holdings);
    },

    reorderHoldings: async (portfolioId: number, orderedIds: number[]) => {
        // トランザクションで一括更新
        await db.transaction('rw', db.holdings, async () => {
            for (let i = 0; i < orderedIds.length; i++) {
                await db.holdings.update(orderedIds[i], { sortOrder: i });
            }
        });
        // ステートを更新
        set(state => ({
            holdings: state.holdings.map(h => {
                if (h.portfolioId !== portfolioId) return h;
                const newOrder = orderedIds.indexOf(h.id!);
                return { ...h, sortOrder: newOrder >= 0 ? newOrder : h.sortOrder };
            }).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        }));
    }
}));

// サマリー計算ヘルパー
export function calculateSummary(holdings: Holding[]): PortfolioSummary {
    let totalValue = 0;
    let totalCost = 0;
    const allocationValues: AssetAllocation = { ...emptyAllocation };
    const costAllocationValues: AssetAllocation = { ...emptyAllocation };

    for (const holding of holdings) {
        // 評価額はcurrentValueを直接使用
        const value = holding.currentValue;
        // 取得額は手入力(totalCost)がある場合はそれを優先、なければ口数と平均取得価格から計算
        const cost = holding.totalCost ?? ((holding.shares && holding.averageCost)
            ? holding.averageCost * holding.shares
            : 0);

        totalValue += value;
        totalCost += cost;

        // 地域別の評価額を計算
        allocationValues.us += value * (holding.allocation.us / 100);
        allocationValues.japan += value * (holding.allocation.japan / 100);
        allocationValues.developed += value * (holding.allocation.developed / 100);
        allocationValues.emerging += value * (holding.allocation.emerging / 100);
        allocationValues.other += value * (holding.allocation.other / 100);

        // 地域別の取得額を計算
        costAllocationValues.us += cost * (holding.allocation.us / 100);
        costAllocationValues.japan += cost * (holding.allocation.japan / 100);
        costAllocationValues.developed += cost * (holding.allocation.developed / 100);
        costAllocationValues.emerging += cost * (holding.allocation.emerging / 100);
        costAllocationValues.other += cost * (holding.allocation.other / 100);
    }

    // パーセントに変換（評価額ベース）
    const currentAllocation: AssetAllocation = {
        us: totalValue > 0 ? (allocationValues.us / totalValue) * 100 : 0,
        japan: totalValue > 0 ? (allocationValues.japan / totalValue) * 100 : 0,
        developed: totalValue > 0 ? (allocationValues.developed / totalValue) * 100 : 0,
        emerging: totalValue > 0 ? (allocationValues.emerging / totalValue) * 100 : 0,
        other: totalValue > 0 ? (allocationValues.other / totalValue) * 100 : 0
    };

    // パーセントに変換（取得額ベース）
    const costAllocation: AssetAllocation = {
        us: totalCost > 0 ? (costAllocationValues.us / totalCost) * 100 : 0,
        japan: totalCost > 0 ? (costAllocationValues.japan / totalCost) * 100 : 0,
        developed: totalCost > 0 ? (costAllocationValues.developed / totalCost) * 100 : 0,
        emerging: totalCost > 0 ? (costAllocationValues.emerging / totalCost) * 100 : 0,
        other: totalCost > 0 ? (costAllocationValues.other / totalCost) * 100 : 0
    };

    const totalGain = totalValue - totalCost;
    const gainPercent = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;

    return {
        totalValue,
        totalCost,
        totalGain,
        gainPercent,
        currentAllocation,
        costAllocation
    };
}
