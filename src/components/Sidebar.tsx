import { useState } from 'react';
import { usePortfolioStore } from '../stores/portfolioStore';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
    onPortfolioSelect?: () => void;
    onEditPortfolio: (id?: number) => void;
}

export function Sidebar({ isOpen, onClose, onPortfolioSelect, onEditPortfolio }: SidebarProps) {
    const {
        portfolios,
        selectedPortfolioId,
        selectPortfolio,
        deletePortfolio
    } = usePortfolioStore();

    // 削除確認用のみローカルに残す
    const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id?: number; name?: string }>({
        isOpen: false
    });

    const handleSelectPortfolio = (id: number) => {
        selectPortfolio(id);
        onClose();
        onPortfolioSelect?.();
    };

    const handleEditPortfolio = (e: React.MouseEvent, id: number) => {
        e.stopPropagation();
        onEditPortfolio(id); // 親へ通知
        onClose();
    };

    const handleRequestDeletePortfolio = (e: React.MouseEvent, id: number, name: string) => {
        e.stopPropagation();
        setDeleteConfirm({ isOpen: true, id, name });
        onClose();
    };

    const handleConfirmDelete = async () => {
        if (deleteConfirm.id) {
            await deletePortfolio(deleteConfirm.id);
        }
        setDeleteConfirm({ isOpen: false });
    };

    const handleCancelDelete = () => {
        setDeleteConfirm({ isOpen: false });
    };

    const handleAddPortfolio = () => {
        onEditPortfolio(undefined); // 新規作成
        onClose();
    };

    return (
        <>
            {/* オーバーレイ */}
            <div
                className={`sidebar-overlay ${isOpen ? 'active' : ''}`}
                onClick={onClose}
            />

            {/* サイドバー */}
            <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <h2>ポートフォリオ</h2>
                    <button className="btn btn-icon" onClick={onClose}>
                        <i className="fa-solid fa-xmark"></i>
                    </button>
                </div>

                <div className="sidebar-content">
                    {portfolios.length === 0 ? (
                        <div className="sidebar-empty">
                            <p>ポートフォリオがありません</p>
                        </div>
                    ) : (
                        <ul className="portfolio-nav">
                            {portfolios.map(portfolio => (
                                <li
                                    key={portfolio.id}
                                    className={`portfolio-nav-item ${selectedPortfolioId === portfolio.id ? 'active' : ''}`}
                                    onClick={() => portfolio.id && handleSelectPortfolio(portfolio.id)}
                                >
                                    <span className="portfolio-nav-name">{portfolio.name}</span>
                                    <div className="portfolio-nav-actions">
                                        <button
                                            className="btn btn-icon btn-sm"
                                            onClick={(e) => portfolio.id && handleEditPortfolio(e, portfolio.id)}
                                            title="編集"
                                        >
                                            <i className="fa-solid fa-pen"></i>
                                        </button>
                                        <button
                                            className="btn btn-icon btn-sm btn-danger-ghost"
                                            onClick={(e) => portfolio.id && handleRequestDeletePortfolio(e, portfolio.id, portfolio.name)}
                                            title="削除"
                                        >
                                            <i className="fa-solid fa-trash"></i>
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className="sidebar-footer">
                    <button className="btn btn-primary btn-block" onClick={handleAddPortfolio}>
                        <i className="fa-solid fa-plus"></i>
                        <span>新規ポートフォリオ</span>
                    </button>
                </div>
            </aside>

            {/* ポートフォリオフォームモーダルはApp.tsxへ移動 */}

            {/* 削除確認ダイアログ */}
            <DeleteConfirmDialog
                isOpen={deleteConfirm.isOpen}
                itemName={deleteConfirm.name || ''}
                onConfirm={handleConfirmDelete}
                onCancel={handleCancelDelete}
            />
        </>
    );
}
