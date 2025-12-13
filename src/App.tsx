import { useState, useEffect, useCallback, useRef } from 'react';
import { MainDashboard } from './components/MainDashboard';
import { Sidebar } from './components/Sidebar';
import { Settings } from './components/Settings';
import { PortfolioForm } from './components/PortfolioForm';
import { PWAInstallBanner } from './components/PWAInstallBanner';
import { usePortfolioStore } from './stores/portfolioStore';
import { fetchPrices } from './services/priceService';
import './index.css';

type Page = 'main' | 'settings';

function App() {
    const [currentPage, setCurrentPage] = useState<Page>('main');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const { loadPortfolios, holdings, updatePrices, portfolios, selectedPortfolioId, updatePortfolio } = usePortfolioStore();
    const [isUpdating, setIsUpdating] = useState(false);
    const hasUpdatedRef = useRef(false);

    const selectedPortfolio = portfolios.find(p => p.id === selectedPortfolioId);

    // ポートフォリオ名編集用ステート
    const [isEditingName, setIsEditingName] = useState(false);
    const [editingName, setEditingName] = useState('');

    // ポートフォリオフォーム（作成・編集）用ステート
    const [portfolioFormState, setPortfolioFormState] = useState<{ isOpen: boolean; editId?: number }>({
        isOpen: false,
        editId: undefined
    });

    useEffect(() => {
        loadPortfolios();
    }, [loadPortfolios]);

    // ハンドラ
    const handleOpenPortfolioForm = (id?: number) => {
        setPortfolioFormState({
            isOpen: true,
            editId: id
        });
        setIsSidebarOpen(false); // サイドバーが開いていれば閉じる
    };

    const handleClosePortfolioForm = () => {
        setPortfolioFormState({ ...portfolioFormState, isOpen: false });
    };

    // ハンドラ
    const handleNameClick = () => {
        if (selectedPortfolio) {
            setEditingName(selectedPortfolio.name);
            setIsEditingName(true);
        }
    };

    const handleNameSave = async () => {
        if (selectedPortfolio?.id && editingName.trim() && editingName.trim() !== selectedPortfolio.name) {
            await updatePortfolio(selectedPortfolio.id, { name: editingName.trim() });
        }
        setIsEditingName(false);
    };

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
                    const fetchedPrice = prices.get(h.ticker)?.price;
                    const newPrice = fetchedPrice !== undefined ? fetchedPrice : h.currentPrice;
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

    // ...

    const renderPage = () => {
        switch (currentPage) {
            case 'main':
                return (
                    <MainDashboard
                        onPortfolioEdit={() => handleOpenPortfolioForm(selectedPortfolioId || undefined)}
                    />
                );
            case 'settings':
                return <Settings />;
            default:
                return (
                    <MainDashboard
                        onPortfolioEdit={() => handleOpenPortfolioForm(selectedPortfolioId || undefined)}
                    />
                );
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
                        isEditingName ? (
                            <input
                                className="header-portfolio-name-input"
                                value={editingName}
                                onChange={e => setEditingName(e.target.value)}
                                onBlur={handleNameSave}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') handleNameSave();
                                }}
                                autoFocus
                                onClick={e => e.stopPropagation()}
                            />
                        ) : (
                            <span
                                className="header-portfolio-name clickable"
                                onClick={handleNameClick}
                                title="クリックして名前を編集"
                            >
                                {selectedPortfolio.name}
                                <i className="fa-solid fa-pen" style={{ fontSize: '0.7em', marginLeft: '6px', opacity: 0.5 }}></i>
                            </span>
                        )
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
                onEditPortfolio={(id) => {
                    handleOpenPortfolioForm(id);
                }}
            // Sidebarの方でidを渡してもらう形にするか、App側で関数を用意するか。
            // Sidebarは id を知っている。
            // MainDashboard は selectedPortfolioId を知っている (store経由)。
            // 共通化するため、Appで openPortfolioForm(id?) を定義する。
            />

            <main className="app-container">
                {renderPage()}
            </main>

            {/* PWAインストールバナー */}
            <PWAInstallBanner />

            {/* ポートフォリオフォームモーダル（Appレベルで管理） */}
            {portfolioFormState.isOpen && (
                <PortfolioForm
                    onClose={handleClosePortfolioForm}
                    editId={portfolioFormState.editId}
                    onCreated={() => {
                        handleClosePortfolioForm();
                        // 必要なら選択切り替えなど
                    }}
                />
            )}
        </div>
    );
}

export default App;
