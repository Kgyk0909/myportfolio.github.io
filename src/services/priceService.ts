import type { PriceData } from '../types';

// 価格API設定
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * 単一銘柄の現在価格を取得
 */
export async function fetchPrice(ticker: string): Promise<PriceData | null> {
    try {
        const response = await fetch(`${API_BASE_URL}/api/price/${encodeURIComponent(ticker)}`);
        if (!response.ok) {
            console.warn(`Failed to fetch price for ${ticker}: ${response.status}`);
            return null;
        }
        return await response.json() as PriceData;
    } catch (error) {
        console.error(`Error fetching price for ${ticker}:`, error);
        return null;
    }
}

/**
 * 複数銘柄の現在価格を一括取得
 */
export async function fetchPrices(tickers: string[]): Promise<Map<string, PriceData>> {
    const results = new Map<string, PriceData>();

    // 並列リクエスト（最大5件ずつ）
    const batchSize = 5;
    for (let i = 0; i < tickers.length; i += batchSize) {
        const batch = tickers.slice(i, i + batchSize);
        const promises = batch.map(ticker => fetchPrice(ticker));
        const responses = await Promise.all(promises);

        batch.forEach((ticker, index) => {
            const data = responses[index];
            if (data) {
                results.set(ticker, data);
            }
        });
    }

    return results;
}

/**
 * APIヘルスチェック
 */
export async function checkApiHealth(): Promise<boolean> {
    try {
        const response = await fetch(`${API_BASE_URL}/health`);
        return response.ok;
    } catch {
        return false;
    }
}
