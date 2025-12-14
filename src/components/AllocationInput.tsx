import { useState, useEffect } from 'react';
import type { AssetAllocation } from '../types';
import { REGION_LABELS } from '../types';

interface AllocationInputProps {
    value: AssetAllocation;
    onChange: (allocation: AssetAllocation) => void;
}

export function AllocationInput({ value, onChange }: AllocationInputProps) {
    const [allocation, setAllocation] = useState<AssetAllocation>(value);

    // valueがプロップから変更された場合に同期
    useEffect(() => {
        setAllocation(value);
    }, [value]);

    const regions = Object.keys(allocation) as (keyof AssetAllocation)[];
    const total = regions.reduce((sum, key) => sum + allocation[key], 0);
    const isValid = Math.abs(total - 100) < 0.01;

    const handleChange = (key: keyof AssetAllocation, newValue: number) => {
        // 現在操作中のキー以外の合計を計算
        const otherTotal = regions
            .filter(r => r !== key)
            .reduce((sum, r) => sum + allocation[r], 0);

        // 残り（100%にするために必要な値）
        const remaining = 100 - otherTotal;

        let targetValue = newValue;

        // スナップ処理: 残りの値に近ければ吸着させる (±0.99の範囲)
        // 例: 残りが20で、スライダーを19~21に動かしたら20にする
        if (Math.abs(newValue - remaining) < 0.99) {
            targetValue = remaining;
        }

        // 0-100の範囲に制限
        const clampedValue = Math.max(0, Math.min(100, targetValue));

        // 浮動小数点誤差対策 (整数で管理するが念のため)
        const roundedValue = Math.round(clampedValue * 100) / 100;

        const updated = { ...allocation, [key]: roundedValue };
        setAllocation(updated);
        onChange(updated);
    };

    return (
        <div className="allocation-group">
            {regions.map(key => (
                <div className="allocation-item" key={key}>
                    <span className="allocation-label">{REGION_LABELS[key]}</span>
                    <input
                        type="range"
                        className="allocation-slider"
                        min="0"
                        max="100"
                        step="1" // 1%刻みに変更
                        value={allocation[key]}
                        onChange={e => handleChange(key, Number(e.target.value))}
                    />
                    <input
                        type="number"
                        className="allocation-value-input"
                        min="0"
                        max="100"
                        step="0.01"
                        value={allocation[key]}
                        onChange={e => handleChange(key, Number(e.target.value))}
                    />
                    <span className="allocation-percent">%</span>
                </div>
            ))}
            <div className={`allocation-total ${isValid ? 'valid' : 'invalid'}`}>
                <span>合計</span>
                <span>{total.toFixed(2)}% {isValid ? '✓' : '（100%にしてください）'}</span>
            </div>
        </div>
    );
}
