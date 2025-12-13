import { useState } from 'react';
import { usePortfolioStore } from '../stores/portfolioStore';
import { fetchPrice } from '../services/priceService';
import { AllocationInput } from './AllocationInput';
import type { Holding, AssetAllocation } from '../types';

const emptyAllocation: AssetAllocation = {
    us: 60,
    japan: 0,
    developed: 20,
    emerging: 15,
    other: 5
};

interface HoldingFormProps {
    portfolioId: number;
    onClose: () => void;
    editHolding?: Holding;
}

export function HoldingForm({ portfolioId, onClose, editHolding }: HoldingFormProps) {
    const { addHolding, updateHolding } = usePortfolioStore();

    const [name, setName] = useState(editHolding?.name ?? '');
    const [ticker, setTicker] = useState(editHolding?.ticker ?? '');
    const [shares, setShares] = useState(editHolding?.shares?.toString() ?? '');
    const [averageCost, setAverageCost] = useState(editHolding?.averageCost?.toString() ?? '');
    const [allocation, setAllocation] = useState<AssetAllocation>(
        editHolding?.allocation ?? emptyAllocation
    );
    const [isSubmitting, setIsSubmitting] = useState(false);

    // 価格取得関連
    const [isFetchingPrice, setIsFetchingPrice] = useState(false);
    const [fetchedPrice, setFetchedPrice] = useState<number | null>(editHolding?.currentPrice ?? null);
    const [priceError, setPriceError] = useState(false);

    const handleFetchPrice = async () => {
        if (!ticker.trim()) return;

        setIsFetchingPrice(true);
        setPriceError(false);
        setFetchedPrice(null);

        try {
            const priceData = await fetchPrice(ticker.trim().toUpperCase());
            if (priceData) {
                setFetchedPrice(priceData.price);
            } else {
                setPriceError(true);
            }
        } catch {
            setPriceError(true);
        } finally {
            setIsFetchingPrice(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!ticker.trim() || !shares || !averageCost) return;

        const total = Object.values(allocation).reduce((a, b) => a + b, 0);
        if (Math.abs(total - 100) > 0.01) {
            alert('アセットクラス比率の合計を100%にしてください');
            return;
        }

        setIsSubmitting(true);
        try {
            const holdingData = {
                portfolioId,
                name: name.trim(),
                ticker: ticker.trim().toUpperCase(),
                shares: Number(shares),
                averageCost: Number(averageCost),
                allocation,
                currentPrice: fetchedPrice ?? editHolding?.currentPrice
            };

            if (editHolding?.id) {
                await updateHolding(editHolding.id, holdingData);
            } else {
                await addHolding(holdingData);
            }
            onClose();
        } catch (error) {
            console.error('Failed to save holding:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const total = Object.values(allocation).reduce((a, b) => a + b, 0);
    const isValid = Math.abs(total - 100) < 0.01 && ticker.trim() && shares && averageCost;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3 className="modal-title">
                        {editHolding ? '銘柄を編集' : '銘柄を追加'}
                    </h3>
                    <button className="btn btn-icon btn-secondary" onClick={onClose}>✕</button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="form-group">
                            <label className="form-label">銘柄名（任意）</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="例：eMAXIS Slim 全世界株式"
                                value={name}
                                onChange={e => setName(e.target.value)}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">ティッカーシンボル *</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="例：VT, ^N225, 4689.T"
                                value={ticker}
                                onChange={e => setTicker(e.target.value)}
                                required
                            />
                            <p className="form-hint">yfinanceで取得可能なコードを入力</p>

                            {/* 価格取得ボタン */}
                            <button
                                type="button"
                                className="btn btn-secondary"
                                style={{ marginTop: '8px' }}
                                onClick={handleFetchPrice}
                                disabled={!ticker.trim() || isFetchingPrice}
                            >
                                {isFetchingPrice ? '取得中...' : '🔍 価格を取得'}
                            </button>

                            {/* 取得した価格表示 */}
                            {fetchedPrice !== null && (
                                <div className="fetched-price-display" style={{
                                    marginTop: '8px',
                                    padding: '8px 12px',
                                    background: 'rgba(34, 197, 94, 0.1)',
                                    borderRadius: '8px',
                                    color: 'var(--accent-green)',
                                    fontSize: '0.875rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}>
                                    <span>✓</span>
                                    <span>現在価格: ¥{fetchedPrice.toLocaleString()}</span>
                                </div>
                            )}
                            {priceError && (
                                <div className="price-error-display" style={{
                                    marginTop: '8px',
                                    padding: '8px 12px',
                                    background: 'rgba(239, 68, 68, 0.1)',
                                    borderRadius: '8px',
                                    color: 'var(--accent-red)',
                                    fontSize: '0.875rem'
                                }}>
                                    ⚠ 価格を取得できませんでした（ティッカーを確認してください）
                                </div>
                            )}
                        </div>

                        <div className="form-group">
                            <label className="form-label">保有口数 *</label>
                            <input
                                type="number"
                                className="form-input"
                                placeholder="100"
                                value={shares}
                                onChange={e => setShares(e.target.value)}
                                min="0"
                                step="0.01"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">平均取得価格 *</label>
                            <input
                                type="number"
                                className="form-input"
                                placeholder="15000"
                                value={averageCost}
                                onChange={e => setAverageCost(e.target.value)}
                                min="0"
                                step="0.01"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">アセットクラス比率 *</label>
                            <AllocationInput
                                value={allocation}
                                onChange={setAllocation}
                            />
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={onClose}
                        >
                            キャンセル
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={!isValid || isSubmitting}
                        >
                            {isSubmitting ? '保存中...' : '保存'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
