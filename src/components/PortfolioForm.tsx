import { useState } from 'react';
import { usePortfolioStore } from '../stores/portfolioStore';
import type { AssetAllocation } from '../types';
import { AllocationInput } from './AllocationInput';

const emptyAllocation: AssetAllocation = {
    us: 50,
    japan: 20,
    developed: 15,
    emerging: 10,
    other: 5
};

interface PortfolioFormProps {
    onClose: () => void;
    editId?: number;
    onCreated?: (portfolioId: number) => void;
}

export function PortfolioForm({ onClose, editId, onCreated }: PortfolioFormProps) {
    const { portfolios, createPortfolio, updatePortfolio } = usePortfolioStore();

    const existing = editId ? portfolios.find(p => p.id === editId) : null;

    const [name, setName] = useState(existing?.name ?? '');
    const [targetAllocation, setTargetAllocation] = useState<AssetAllocation>(
        existing?.targetAllocation ?? emptyAllocation
    );
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setIsSubmitting(true);
        try {
            if (editId) {
                await updatePortfolio(editId, { name: name.trim(), targetAllocation });
            } else {
                const newPortfolio = await createPortfolio(name.trim(), targetAllocation);
                if (newPortfolio.id && onCreated) {
                    onCreated(newPortfolio.id);
                }
            }
            onClose();
        } catch (error) {
            console.error('Failed to save portfolio:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const total = Object.values(targetAllocation).reduce((a, b) => a + b, 0);
    const isValid = Math.abs(total - 100) < 0.01;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3 className="modal-title">
                        {editId ? 'ポートフォリオを編集' : '新規ポートフォリオ'}
                    </h3>
                    <button className="btn btn-icon btn-secondary" onClick={onClose}>✕</button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="form-group">
                            <label className="form-label">ポートフォリオ名</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="例：特定口座、NISA"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">目標アロケーション</label>
                            <AllocationInput
                                value={targetAllocation}
                                onChange={setTargetAllocation}
                            />
                        </div>
                    </div>
                    <div className="modal-footer">
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
                            disabled={!name.trim() || !isValid || isSubmitting}
                        >
                            {isSubmitting ? '保存中...' : '保存'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
