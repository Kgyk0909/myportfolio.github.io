import { useState, useEffect, useRef } from 'react';
import { usePortfolioStore } from '../stores/portfolioStore';
import { fetchPrice } from '../services/priceService';
import { AllocationInput } from './AllocationInput';
import type { Holding, AssetAllocation } from '../types';
import fundsData from '../data/funds.json';
import { getAllocationTemplates, type AllocationTemplate } from '../types';

// 投資信託データの型
interface FundData {
    id: string;
    name: string;
    shortName: string;
    ticker: string;
    category: string;
}

const funds: FundData[] = fundsData;

// 数値をカンマ区切り文字列に変換（小数は維持）
const formatNumber = (val: string | number | undefined | null): string => {
    if (val === undefined || val === null || val === '') return '';
    const strVal = val.toString();
    const parts = strVal.split('.');
    // 整数部はカンマを除去してから再フォーマット
    if (parts[0]) {
        parts[0] = parts[0].replace(/,/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }
    return parts.join('.');
};

// カンマを除去して数値文字列に戻す
const parseNumber = (val: string): string => {
    return val.replace(/,/g, '');
};

const emptyAllocation: AssetAllocation = {
    us: 0,
    japan: 0,
    developed: 0,
    emerging: 0,
    other: 100
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
    const [averageCost, setAverageCost] = useState(formatNumber(editHolding?.averageCost));
    const [allocation, setAllocation] = useState<AssetAllocation>(
        editHolding?.allocation ?? emptyAllocation
    );
    const [templates] = useState<AllocationTemplate[]>(getAllocationTemplates());
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // 価格取得関連
    const [isFetchingPrice, setIsFetchingPrice] = useState(false);
    const [fetchedPrice, setFetchedPrice] = useState<number | null>(editHolding?.currentPrice ?? null);
    const [priceError, setPriceError] = useState(false);

    // 評価額関連
    const [currentValue, setCurrentValue] = useState(formatNumber(editHolding?.currentValue));
    const [isManualValue, setIsManualValue] = useState(editHolding?.isManualValue ?? true);

    // 取得額関連
    const [totalCost, setTotalCost] = useState(formatNumber(editHolding?.totalCost));
    const [isManualCost, setIsManualCost] = useState(editHolding?.isManualCost ?? true);

    // 銘柄検索関連
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<FundData[]>([]);
    const [showSearchResults, setShowSearchResults] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);

    // 評価額の自動計算可能かどうか (価格 × 口数)
    const canAutoCalculateValue = fetchedPrice !== null && shares !== '' && Number(shares) > 0;

    // 取得額の自動計算可能かどうか (取得価格 × 口数)
    const canAutoCalculateCost = parseNumber(averageCost) !== '' && Number(parseNumber(averageCost)) > 0 && shares !== '' && Number(shares) > 0;

    // 表示条件
    // ティッカー: 自動計算モードで非表示、手動モードで表示、入力済みなら常時表示
    const showTicker = !isManualValue || ticker.trim() !== '';

    // 平均取得価格: 取得額自動計算モードで表示、手動で非表示、入力済みなら常時表示
    const showAverageCost = !isManualCost || averageCost !== '';

    // 保有口数: いずれかの自動計算モードで表示、両方手動で非表示、入力済みなら常時表示
    const showShares = !isManualValue || !isManualCost || shares !== '';

    // 価格が取得され、口数がある場合は評価額を自動計算
    useEffect(() => {
        if (!isManualValue && canAutoCalculateValue) {
            const calculated = fetchedPrice! * Number(shares);
            setCurrentValue(formatNumber(calculated));
        }
    }, [fetchedPrice, shares, isManualValue, canAutoCalculateValue]);

    // 取得価格と口数がある場合は取得額を自動計算
    useEffect(() => {
        if (!isManualCost && canAutoCalculateCost) {
            const calculated = Number(parseNumber(averageCost)) * Number(shares);
            setTotalCost(formatNumber(calculated));
        }
    }, [averageCost, shares, isManualCost, canAutoCalculateCost]);

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

        // キーワードに基づいてテンプレートを自動選択
        const lowerName = fund.name.toLowerCase();
        let matchedTemplateId = '';

        if (lowerName.includes('全世界')) {
            matchedTemplateId = 'global-equity';
        } else if (lowerName.includes('先進国')) {
            matchedTemplateId = 'developed-equity';
        } else if (lowerName.includes('米国') || lowerName.includes('s&p500') || lowerName.includes('全米') || lowerName.includes('nasdaq') || lowerName.includes('nyダウ') || lowerName.includes('vti') || lowerName.includes('voo')) {
            matchedTemplateId = 'us-equity';
        } else if (lowerName.includes('国内') || lowerName.includes('日本') || lowerName.includes('topix') || lowerName.includes('日経')) {
            matchedTemplateId = 'japan-equity';
        } else if (lowerName.includes('新興国')) {
            matchedTemplateId = 'emerging-equity';
        }

        if (matchedTemplateId) {
            setSelectedTemplateId(matchedTemplateId);
            const template = templates.find(t => t.id === matchedTemplateId);
            if (template) {
                setAllocation({ ...template.allocation });
            }
        }
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
            } else {
                setPriceError(true);
            }
        } catch {
            setPriceError(true);
        } finally {
            setIsFetchingPrice(false);
        }
    };

    // 評価額モード切替
    const handleToggleValueMode = () => {
        const nextIsManual = !isManualValue;
        setIsManualValue(nextIsManual);

        // 自動モードに切り替えた瞬間、計算可能なら計算する
        if (!nextIsManual && canAutoCalculateValue) {
            const calculated = fetchedPrice! * Number(shares);
            setCurrentValue(formatNumber(calculated));
        }
    };

    // 取得額モード切替
    const handleToggleCostMode = () => {
        const nextIsManual = !isManualCost;
        setIsManualCost(nextIsManual);

        // 自動モードに切り替えた瞬間、計算可能なら計算する
        if (!nextIsManual && canAutoCalculateCost) {
            const calculated = Number(parseNumber(averageCost)) * Number(shares);
            setTotalCost(formatNumber(calculated));
        }
    };

    const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const templateId = e.target.value;
        setSelectedTemplateId(templateId);

        if (!templateId) return;

        const template = templates.find(t => t.id === templateId);
        if (template) {
            setAllocation({ ...template.allocation });
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
                averageCost: averageCost ? Number(parseNumber(averageCost)) : undefined,
                allocation,
                currentPrice: fetchedPrice ?? editHolding?.currentPrice,
                currentValue: Number(parseNumber(currentValue)),
                isManualValue,
                totalCost: totalCost ? Number(parseNumber(totalCost)) : undefined,
                isManualCost,
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

    // 自動計算モードで必要情報が不足している場合のメッセージ
    const getValueAutoMessage = () => {
        if (!isManualValue) {
            if (!fetchedPrice) return '※ティッカーから価格を取得してください';
            if (!shares || Number(shares) <= 0) return '※保有口数を入力してください';
        }
        return null;
    };

    const getCostAutoMessage = () => {
        if (!isManualCost) {
            if (!averageCost || Number(parseNumber(averageCost)) <= 0) return '※平均取得価格を入力してください';
            if (!shares || Number(shares) <= 0) return '※保有口数を入力してください';
        }
        return null;
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3 className="modal-title">
                        {editHolding ? '銘柄を編集' : '銘柄を追加'}
                    </h3>
                    <button className="btn btn-icon btn-secondary" onClick={onClose}>✕</button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        {/* 銘柄を検索 */}
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
                                <div className="fund-search-results" style={{ maxHeight: '400px' }}>
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

                        {/* 銘柄名 */}
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

                        {/* 評価額 */}
                        <div className="form-group">
                            <label className="form-label">評価額 *</label>
                            <div className="value-input-row">
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    className="form-input"
                                    placeholder="1,000,000"
                                    value={currentValue}
                                    onChange={e => {
                                        if (/^[0-9.,]*$/.test(e.target.value)) {
                                            setCurrentValue(e.target.value);
                                        }
                                    }}
                                    onBlur={() => setCurrentValue(formatNumber(currentValue))}
                                    onFocus={() => setCurrentValue(parseNumber(currentValue))}
                                    required
                                    disabled={!isManualValue}
                                />
                                <button
                                    type="button"
                                    className={`btn btn-mode-toggle ${isManualValue ? 'manual' : 'auto'}`}
                                    onClick={handleToggleValueMode}
                                    disabled={false}
                                    title={isManualValue ? '自動計算（価格×口数）に切替' : '手動入力に切替'}
                                >
                                    {isManualValue ? '手動' : '自動'}
                                </button>
                            </div>
                            {getValueAutoMessage() && (
                                <p className="form-hint form-hint-warning">{getValueAutoMessage()}</p>
                            )}
                            {!getValueAutoMessage() && (
                                <p className="form-hint">
                                    {isManualValue ? '評価額を直接入力' : '現在価格 × 保有口数'}
                                </p>
                            )}
                        </div>

                        {/* 取得額 */}
                        <div className="form-group">
                            <label className="form-label">取得額（任意）</label>
                            <div className="value-input-row">
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    className="form-input"
                                    placeholder="800,000"
                                    value={totalCost}
                                    onChange={e => {
                                        if (/^[0-9.,]*$/.test(e.target.value)) {
                                            setTotalCost(e.target.value);
                                        }
                                    }}
                                    onBlur={() => setTotalCost(formatNumber(totalCost))}
                                    onFocus={() => setTotalCost(parseNumber(totalCost))}
                                    disabled={!isManualCost}
                                />
                                <button
                                    type="button"
                                    className={`btn btn-mode-toggle ${isManualCost ? 'manual' : 'auto'}`}
                                    onClick={handleToggleCostMode}
                                    disabled={false}
                                    title={isManualCost ? '自動計算（平均取得価格×口数）に切替' : '手動入力に切替'}
                                >
                                    {isManualCost ? '手動' : '自動'}
                                </button>
                            </div>
                            {getCostAutoMessage() && (
                                <p className="form-hint form-hint-warning">{getCostAutoMessage()}</p>
                            )}
                            {!getCostAutoMessage() && (
                                <p className="form-hint">
                                    {isManualCost ? '取得額を直接入力' : '平均取得価格 × 保有口数'}
                                </p>
                            )}
                        </div>

                        {/* ティッカーシンボル（条件付き表示） */}
                        {showTicker && (
                            <div className="form-group">
                                <label className="form-label">ティッカーシンボル（任意）</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="例：VT, ^N225, 4689.T"
                                    value={ticker}
                                    onChange={e => setTicker(e.target.value)}
                                />
                                <p className="form-hint">yfinanceで取得可能なコード（ETF・個別株向け）</p>

                                {ticker.trim() && (
                                    <>
                                        <button
                                            type="button"
                                            className="btn btn-secondary"
                                            style={{ marginTop: '8px' }}
                                            onClick={handleFetchPrice}
                                            disabled={!ticker.trim() || isFetchingPrice}
                                        >
                                            {isFetchingPrice ? '取得中...' : '🔍 価格を取得'}
                                        </button>

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
                        )}

                        {/* 保有口数（条件付き表示） */}
                        {showShares && (
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
                        )}

                        {/* 平均取得価格（条件付き表示） */}
                        {showAverageCost && (
                            <div className="form-group">
                                <label className="form-label">平均取得価格（任意）</label>
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    className="form-input"
                                    placeholder="15,000"
                                    value={averageCost}
                                    onChange={e => {
                                        if (/^[0-9.,]*$/.test(e.target.value)) {
                                            setAverageCost(e.target.value);
                                        }
                                    }}
                                    onBlur={() => setAverageCost(formatNumber(averageCost))}
                                    onFocus={() => setAverageCost(parseNumber(averageCost))}
                                />
                            </div>
                        )}

                        {/* アセットクラス比率 */}
                        <div className="form-group">
                            <label className="form-label">アセットクラス比率 *</label>

                            {/* テンプレート選択 */}
                            <div style={{ marginBottom: '12px' }}>
                                <select
                                    className="form-input"
                                    style={{ fontSize: '0.875rem', padding: '8px' }}
                                    value={selectedTemplateId}
                                    onChange={handleTemplateChange}
                                >
                                    <option value="">テンプレートを選択...</option>
                                    {templates.map(t => (
                                        <option key={t.id} value={t.id}>
                                            {t.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
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
