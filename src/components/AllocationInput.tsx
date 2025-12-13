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
        // 0-100の範囲に制限
        const clampedValue = Math.max(0, Math.min(100, newValue));
        const updated = { ...allocation, [key]: clampedValue };
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
                        step="0.1" // スライダーは0.1刻みくらいが使いやすい
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
