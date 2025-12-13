import { useState, useRef, TouchEvent } from 'react';
import type { Holding } from '../types';

interface SwipeableHoldingItemProps {
    holding: Holding;
    onEdit: () => void;
    onDelete: () => void;
    formatCurrency: (value: number) => string;
}

export function SwipeableHoldingItem({
    holding,
    onEdit,
    onDelete,
    formatCurrency
}: SwipeableHoldingItemProps) {
    const [swipeX, setSwipeX] = useState(0);
    const [isSwiping, setIsSwiping] = useState(false);
    const startXRef = useRef(0);
    const itemRef = useRef<HTMLDivElement>(null);

    const SWIPE_THRESHOLD = 80;
    const DELETE_TRIGGER = 120;

    const currentValue = (holding.currentPrice ?? 0) * holding.shares;
    const costValue = (holding.averageCost ?? 0) * holding.shares;
    const gainPercent = costValue > 0 ? ((currentValue - costValue) / costValue) * 100 : 0;

    const handleTouchStart = (e: TouchEvent) => {
        const touch = e.touches[0];
        if (!touch) return;
        startXRef.current = touch.clientX;
        setIsSwiping(true);
    };

    const handleTouchMove = (e: TouchEvent) => {
        if (!isSwiping) return;
        const touch = e.touches[0];
        if (!touch) return;
        const currentX = touch.clientX;
        const diff = startXRef.current - currentX;
        // 左スワイプのみ許可（diff > 0）
        if (diff > 0) {
            setSwipeX(Math.min(diff, DELETE_TRIGGER + 20));
        } else {
            setSwipeX(0);
        }
    };

    const handleTouchEnd = () => {
        setIsSwiping(false);
        if (swipeX >= DELETE_TRIGGER) {
            // 削除トリガー
            onDelete();
        }
        setSwipeX(0);
    };

    const handleClick = () => {
        if (swipeX === 0) {
            onEdit();
        }
    };

    return (
        <div className="swipeable-container">
            {/* 削除背景 */}
            <div
                className="swipe-delete-bg"
                style={{
                    opacity: Math.min(swipeX / SWIPE_THRESHOLD, 1),
                    width: `${Math.max(swipeX, 0)}px`
                }}
            >
                <span className="delete-icon">🗑</span>
            </div>

            {/* メインコンテンツ */}
            <div
                ref={itemRef}
                className="holding-item holding-item-swipeable"
                style={{
                    transform: `translateX(-${swipeX}px)`,
                    transition: isSwiping ? 'none' : 'transform 0.3s ease'
                }}
                onClick={handleClick}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                <div className="holding-left">
                    <div className="holding-name">{holding.name || holding.ticker}</div>
                    {holding.name && <div className="holding-ticker">{holding.ticker}</div>}
                </div>
                <div className="holding-right">
                    <div className="holding-stat-row">
                        <span className="stat-label">保有数：</span>
                        <span className="stat-value">{holding.shares.toLocaleString()} 口</span>
                    </div>
                    <div className="holding-stat-row">
                        <span className="stat-label">取得額：</span>
                        <span className="stat-value">{formatCurrency(costValue)}</span>
                    </div>
                    <div className="holding-stat-row">
                        <span className="stat-label">評価額：</span>
                        <span className="stat-value">{formatCurrency(currentValue)}</span>
                    </div>
                    <div className={`holding-gain-inline ${gainPercent >= 0 ? 'positive' : 'negative'}`}>
                        {gainPercent >= 0 ? '+' : ''}{gainPercent.toFixed(1)}%
                    </div>
                </div>
            </div>
        </div>
    );
}
