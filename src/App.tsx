import { useState, useEffect, useCallback, useRef } from 'react';
import { MainDashboard } from './components/MainDashboard';
import { Sidebar } from './components/Sidebar';
import { Settings } from './components/Settings';
import { PWAInstallBanner } from './components/PWAInstallBanner';
import { usePortfolioStore } from './stores/portfolioStore';
import { fetchPrices } from './services/priceService';
import './index.css';

type Page = 'main' | 'settings';

function App() {
    const [currentPage, setCurrentPage] = useState<Page>('main');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const { loadPortfolios, holdings, updatePrices, portfolios, selectedPortfolioId } = usePortfolioStore();
    const [isUpdating, setIsUpdating] = useState(false);
    const hasUpdatedRef = useRef(false);

    useEffect(() => {
        loadPortfolios();
    }, [loadPortfolios]);

    // 価格更新処理
    const handleUpdatePrices = useCallback(async () => {
        // tickerがある銘柄のみ対象
        const holdingsWithTicker = holdings.filter(h => h.ticker && h.ticker.trim() !== '');
        if (holdingsWithTicker.length === 0 || isUpdating) return;

        setIsUpdating(true);
        try {
            const tickers = holdingsWithTicker.map(h => h.ticker!);
            const prices = await fetchPrices(tickers);

            const updatedHoldings = holdings.map(h => {
                if (h.ticker && prices.has(h.ticker)) {
                    const newPrice = prices.get(h.ticker)?.price ?? h.currentPrice;
                    return {
                        ...h,
                        currentPrice: newPrice,
                        // 自動計算モードの場合は評価額も更新
                        currentValue: (!h.isManualValue && newPrice && h.shares)
                            ? newPrice * h.shares
                            : h.currentValue
                    };
                }
                return h;
            });

            await updatePrices(updatedHoldings);
        } catch (error) {
            console.error('Failed to update prices:', error);
        } finally {
            setIsUpdating(false);
        }
    }, [holdings, updatePrices, isUpdating]);

    // ページロード時に価格を自動更新（初回のみ）
    useEffect(() => {
        if (holdings.length > 0 && !hasUpdatedRef.current) {
            hasUpdatedRef.current = true;
            handleUpdatePrices();
        }
    }, [holdings, handleUpdatePrices]);

    const selectedPortfolio = portfolios.find(p => p.id === selectedPortfolioId);

    const renderPage = () => {
        switch (currentPage) {
            case 'main':
                return <MainDashboard />;
            case 'settings':
                return <Settings />;
            default:
                return <MainDashboard />;
        }
    };

    return (
        <div className="app">
            {/* ヘッダーナビゲーション */}
            <header className="app-header">
                <div className="header-left">
                    <button
                        className="icon-btn"
                        onClick={() => setIsSidebarOpen(true)}
                        title="メニュー"
                    >
                        <i className="fa-solid fa-bars"></i>
                    </button>
                    {selectedPortfolio && currentPage === 'main' && (
                        <span className="header-portfolio-name">{selectedPortfolio.name}</span>
                    )}
                </div>
                <div className="header-actions">
                    <button
                        className="icon-btn"
                        onClick={handleUpdatePrices}
                        disabled={isUpdating || holdings.length === 0}
                        title="価格を更新"
                    >
                        {isUpdating ? (
                            <span className="loading-spinner-small" />
                        ) : (
                            <i className="fa-solid fa-arrows-rotate"></i>
                        )}
                    </button>
                    <button
                        className={`icon-btn ${currentPage === 'settings' ? 'active' : ''}`}
                        onClick={() => setCurrentPage(currentPage === 'settings' ? 'main' : 'settings')}
                        title="設定"
                    >
                        <i className="fa-solid fa-gear"></i>
                    </button>
                </div>
            </header>

            {/* サイドバー */}
            <Sidebar
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
                onPortfolioSelect={() => {
                    if (currentPage === 'settings') {
                        setCurrentPage('main');
                    }
                }}
            />

            <main className="app-container">
                {renderPage()}
            </main>

            {/* PWAインストールバナー */}
            <PWAInstallBanner />
        </div>
    );
}

export default App;
