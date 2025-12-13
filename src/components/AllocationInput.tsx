import { useState } from 'react';
import type { AssetAllocation } from '../types';
import { REGION_LABELS } from '../types';

interface AllocationInputProps {
    value: AssetAllocation;
    onChange: (allocation: AssetAllocation) => void;
}

export function AllocationInput({ value, onChange }: AllocationInputProps) {
    const [allocation, setAllocation] = useState<AssetAllocation>(value);

    const regions = Object.keys(allocation) as (keyof AssetAllocation)[];
    const total = regions.reduce((sum, key) => sum + allocation[key], 0);
    const isValid = Math.abs(total - 100) < 0.01;

    const handleChange = (key: keyof AssetAllocation, newValue: number) => {
        const updated = { ...allocation, [key]: newValue };
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
                        step="1"
                        value={allocation[key]}
                        onChange={e => handleChange(key, Number(e.target.value))}
                    />
                    <span className="allocation-value">{allocation[key]}%</span>
                </div>
            ))}
            <div className={`allocation-total ${isValid ? 'valid' : 'invalid'}`}>
                <span>合計</span>
                <span>{total.toFixed(0)}% {isValid ? '✓' : '（100%にしてください）'}</span>
            </div>
        </div>
    );
}
