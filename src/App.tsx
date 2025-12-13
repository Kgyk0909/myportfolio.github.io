import { useState, useEffect, useCallback } from 'react';
import { Dashboard } from './components/Dashboard';
import { PortfolioList } from './components/PortfolioList';
import { Settings } from './components/Settings';
import { PWAInstallBanner } from './components/PWAInstallBanner';
import { usePortfolioStore } from './stores/portfolioStore';
import { fetchPrices } from './services/priceService';
import './index.css';

type Page = 'dashboard' | 'portfolios' | 'settings';

function App() {
    const [currentPage, setCurrentPage] = useState<Page>('dashboard');
    const { loadPortfolios, holdings, updatePrices } = usePortfolioStore();
    const [isUpdating, setIsUpdating] = useState(false);

    useEffect(() => {
        loadPortfolios();
    }, [loadPortfolios]);

    // 価格更新処理
    const handleUpdatePrices = useCallback(async () => {
        if (holdings.length === 0 || isUpdating) return;

        setIsUpdating(true);
        try {
            const tickers = holdings.map(h => h.ticker);
            const prices = await fetchPrices(tickers);

            const updatedHoldings = holdings.map(h => ({
                ...h,
                currentPrice: prices.get(h.ticker)?.price ?? h.currentPrice
            }));

            await updatePrices(updatedHoldings);
        } catch (error) {
            console.error('Failed to update prices:', error);
        } finally {
            setIsUpdating(false);
        }
    }, [holdings, updatePrices, isUpdating]);

    // ページロード時に価格を自動更新
    useEffect(() => {
        if (holdings.length > 0) {
            handleUpdatePrices();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [holdings.length]);

    const renderPage = () => {
        switch (currentPage) {
            case 'dashboard':
                return <Dashboard />;
            case 'portfolios':
                return <PortfolioList />;
            case 'settings':
                return <Settings />;
            default:
                return <Dashboard />;
        }
    };

    return (
        <div className="app">
            {/* ヘッダーナビゲーション */}
            <header className="app-header">
                <nav className="header-nav">
                    <button
                        className={`nav-tab ${currentPage === 'dashboard' ? 'active' : ''}`}
                        onClick={() => setCurrentPage('dashboard')}
                    >
                        ダッシュボード
                    </button>
                    <button
                        className={`nav-tab ${currentPage === 'portfolios' ? 'active' : ''}`}
                        onClick={() => setCurrentPage('portfolios')}
                    >
                        ポートフォリオ
                    </button>
                </nav>
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
                            '🔄'
                        )}
                    </button>
                    <button
                        className={`icon-btn ${currentPage === 'settings' ? 'active' : ''}`}
                        onClick={() => setCurrentPage('settings')}
                        title="設定"
                    >
                        ⚙️
                    </button>
                </div>
            </header>

            <main className="app-container">
                {renderPage()}
            </main>

            {/* PWAインストールバナー */}
            <PWAInstallBanner />
        </div>
    );
}

export default App;
