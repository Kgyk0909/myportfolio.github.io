import { useState, useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { PortfolioList } from './components/PortfolioList';
import { Settings } from './components/Settings';
import { PWAInstallBanner } from './components/PWAInstallBanner';
import { usePortfolioStore } from './stores/portfolioStore';
import './index.css';

type Page = 'dashboard' | 'portfolios' | 'settings';

function App() {
    const [currentPage, setCurrentPage] = useState<Page>('dashboard');
    const { loadPortfolios } = usePortfolioStore();

    useEffect(() => {
        loadPortfolios();
    }, [loadPortfolios]);

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
            <main className="app-container">
                {renderPage()}
            </main>

            {/* ボトムナビゲーション */}
            <nav className="bottom-nav">
                <button
                    className={`nav-item ${currentPage === 'dashboard' ? 'active' : ''}`}
                    onClick={() => setCurrentPage('dashboard')}
                >
                    <span className="nav-icon">📊</span>
                    <span className="nav-label">ダッシュボード</span>
                </button>
                <button
                    className={`nav-item ${currentPage === 'portfolios' ? 'active' : ''}`}
                    onClick={() => setCurrentPage('portfolios')}
                >
                    <span className="nav-icon">📁</span>
                    <span className="nav-label">ポートフォリオ</span>
                </button>
                <button
                    className={`nav-item ${currentPage === 'settings' ? 'active' : ''}`}
                    onClick={() => setCurrentPage('settings')}
                >
                    <span className="nav-icon">⚙️</span>
                    <span className="nav-label">設定</span>
                </button>
            </nav>

            {/* PWAインストールバナー */}
            <PWAInstallBanner />
        </div>
    );
}

export default App;
