import { useState, useEffect, useRef } from 'react';
import { usePortfolioStore } from '../stores/portfolioStore';
import { fetchPrice } from '../services/priceService';
import { AllocationInput } from './AllocationInput';
import type { Holding, AssetAllocation } from '../types';
import fundsData from '../data/funds.json';

// 投資信託データの型
interface FundData {
    id: string;
    name: string;
    shortName: string;
    ticker: string;
    category: string;
}

const funds: FundData[] = fundsData;

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
    onDelete?: (holding: Holding) => void;
}

export function HoldingForm({ portfolioId, onClose, editHolding, onDelete }: HoldingFormProps) {
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

    // 評価額関連
    const [currentValue, setCurrentValue] = useState(editHolding?.currentValue?.toString() ?? '');
    const [isManualValue, setIsManualValue] = useState(editHolding?.isManualValue ?? true);

    // 銘柄検索関連
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<FundData[]>([]);
    const [showSearchResults, setShowSearchResults] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);

    // 自動計算可能かどうか
    const canAutoCalculate = fetchedPrice !== null && shares !== '' && Number(shares) > 0;

    // 価格が取得され、口数がある場合は自動計算
    useEffect(() => {
        if (!isManualValue && canAutoCalculate) {
            const calculated = fetchedPrice! * Number(shares);
            setCurrentValue(calculated.toString());
        }
    }, [fetchedPrice, shares, isManualValue, canAutoCalculate]);

    // 検索クエリが変更されたら結果を更新
    useEffect(() => {
        if (searchQuery.trim() === '') {
            setSearchResults([]);
            return;
        }

        const query = searchQuery.toLowerCase();
        const results = funds.filter(fund =>
            fund.name.toLowerCase().includes(query) ||
            fund.shortName.toLowerCase().includes(query) ||
            fund.ticker.toLowerCase().includes(query) ||
            fund.category.toLowerCase().includes(query)
        );
        setSearchResults(results);
    }, [searchQuery]);

    // 検索結果外クリックで閉じる
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setShowSearchResults(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // 銘柄選択時の処理
    const handleSelectFund = (fund: FundData) => {
        setName(fund.name);
        setTicker(fund.ticker);
        setSearchQuery('');
        setShowSearchResults(false);
    };

    const handleFetchPrice = async () => {
        if (!ticker.trim()) return;

        setIsFetchingPrice(true);
        setPriceError(false);
        setFetchedPrice(null);

        try {
            const priceData = await fetchPrice(ticker.trim().toUpperCase());
            if (priceData) {
                setFetchedPrice(priceData.price);
                // 価格取得成功で自動計算モードに切り替え可能になる
            } else {
                setPriceError(true);
            }
        } catch {
            setPriceError(true);
        } finally {
            setIsFetchingPrice(false);
        }
    };

    // モード切替
    const handleToggleMode = () => {
        if (isManualValue && canAutoCalculate) {
            // 手動→自動
            setIsManualValue(false);
            const calculated = fetchedPrice! * Number(shares);
            setCurrentValue(calculated.toString());
        } else if (!isManualValue) {
            // 自動→手動
            setIsManualValue(true);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !currentValue) return;

        const total = Object.values(allocation).reduce((a, b) => a + b, 0);
        if (Math.abs(total - 100) > 0.01) {
            alert('アセットクラス比率の合計を100%にしてください');
            return;
        }

        setIsSubmitting(true);
        try {
            const holdingData: Omit<Holding, 'id'> = {
                portfolioId,
                name: name.trim(),
                ticker: ticker.trim().toUpperCase() || undefined,
                shares: shares ? Number(shares) : undefined,
                averageCost: averageCost ? Number(averageCost) : undefined,
                allocation,
                currentPrice: fetchedPrice ?? editHolding?.currentPrice,
                currentValue: Number(currentValue),
                isManualValue,
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
    const isValid = Math.abs(total - 100) < 0.01 && name.trim() && currentValue;

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
                        {/* 銘柄検索 */}
                        <div className="form-group" ref={searchRef}>
                            <label className="form-label">
                                <i className="fa-solid fa-magnifying-glass"></i> 銘柄を検索
                            </label>
                            <input
                                type="text"
                                className="form-input fund-search-input"
                                placeholder="銘柄名・略称・コードで検索..."
                                value={searchQuery}
                                onChange={e => {
                                    setSearchQuery(e.target.value);
                                    setShowSearchResults(true);
                                }}
                                onFocus={() => setShowSearchResults(true)}
                            />
                            {showSearchResults && searchResults.length > 0 && (
                                <div className="fund-search-results">
                                    {searchResults.map(fund => (
                                        <div
                                            key={fund.id}
                                            className="fund-search-item"
                                            onClick={() => handleSelectFund(fund)}
                                        >
                                            <div className="fund-search-item-name">{fund.name}</div>
                                            <div className="fund-search-item-meta">
                                                <span className="fund-search-item-short">{fund.shortName}</span>
                                                <span className="fund-search-item-category">{fund.category}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {showSearchResults && searchQuery.trim() !== '' && searchResults.length === 0 && (
                                <div className="fund-search-no-results">
                                    該当する銘柄が見つかりません
                                </div>
                            )}
                        </div>

                        <div className="form-group">
                            <label className="form-label">銘柄名 *</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="例：eMAXIS Slim 全世界株式"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">ティッカーシンボル（任意）</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="例：VT, ^N225, 4689.T"
                                value={ticker}
                                onChange={e => setTicker(e.target.value)}
                            />
                            <p className="form-hint">yfinanceで取得可能なコードを入力（ETF・個別株向け）</p>

                            {ticker.trim() && (
                                <>
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
                                            ⚠ 価格を取得できませんでした
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {/* 評価額 */}
                        <div className="form-group">
                            <label className="form-label">評価額 *</label>
                            <div className="value-input-row">
                                <input
                                    type="number"
                                    className="form-input"
                                    placeholder="1000000"
                                    value={currentValue}
                                    onChange={e => setCurrentValue(e.target.value)}
                                    min="0"
                                    step="1"
                                    required
                                    disabled={!isManualValue}
                                />
                                <button
                                    type="button"
                                    className={`btn btn-mode-toggle ${isManualValue ? 'manual' : 'auto'}`}
                                    onClick={handleToggleMode}
                                    disabled={isManualValue && !canAutoCalculate}
                                    title={isManualValue ? (canAutoCalculate ? '自動計算に切替' : '価格取得と口数入力が必要') : '手動入力に切替'}
                                >
                                    {isManualValue ? '手動' : '自動'}
                                </button>
                            </div>
                            <p className="form-hint">
                                {isManualValue
                                    ? '手動入力モード: 評価額を直接入力してください'
                                    : '自動計算モード: 現在価格 × 保有口数'}
                            </p>
                        </div>

                        <div className="form-group">
                            <label className="form-label">保有口数（任意）</label>
                            <input
                                type="number"
                                className="form-input"
                                placeholder="100"
                                value={shares}
                                onChange={e => setShares(e.target.value)}
                                min="0"
                                step="0.01"
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">平均取得価格（任意）</label>
                            <input
                                type="number"
                                className="form-input"
                                placeholder="15000"
                                value={averageCost}
                                onChange={e => setAverageCost(e.target.value)}
                                min="0"
                                step="0.01"
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
                        {editHolding && onDelete && (
                            <button
                                type="button"
                                className="btn btn-danger-outline"
                                onClick={() => onDelete(editHolding)}
                            >
                                <i className="fa-solid fa-trash"></i>
                                <span>削除</span>
                            </button>
                        )}
                        <div className="modal-footer-right">
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
                    </div>
                </form>
            </div>
        </div>
    );
}
