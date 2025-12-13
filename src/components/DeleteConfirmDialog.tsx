interface DeleteConfirmDialogProps {
    isOpen: boolean;
    itemName: string;
    onConfirm: () => void;
    onCancel: () => void;
}

export function DeleteConfirmDialog({
    isOpen,
    itemName,
    onConfirm,
    onCancel
}: DeleteConfirmDialogProps) {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onCancel}>
            <div className="modal-content delete-confirm-dialog" onClick={e => e.stopPropagation()}>
                <div className="delete-confirm-body">
                    <div className="delete-confirm-icon">
                        <i className="fa-solid fa-trash-can" style={{ fontSize: '2rem', color: 'var(--accent-red)' }}></i>
                    </div>
                    <h3>削除の確認</h3>
                    <p>「{itemName}」を削除しますか？</p>
                </div>
                <div className="delete-confirm-actions">
                    <button className="btn btn-secondary" onClick={onCancel}>
                        いいえ
                    </button>
                    <button className="btn btn-danger" onClick={onConfirm}>
                        はい
                    </button>
                </div>
            </div>
        </div>
    );
}
