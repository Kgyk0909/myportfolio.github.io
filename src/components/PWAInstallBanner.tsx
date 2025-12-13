import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallBanner() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [showBanner, setShowBanner] = useState(false);

    useEffect(() => {
        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);

            // すでにインストール済みかチェック
            const isInstalled = window.matchMedia('(display-mode: standalone)').matches;
            const dismissed = localStorage.getItem('pwa-install-dismissed');

            if (!isInstalled && !dismissed) {
                setShowBanner(true);
            }
        };

        window.addEventListener('beforeinstallprompt', handler);

        return () => {
            window.removeEventListener('beforeinstallprompt', handler);
        };
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;

        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            setShowBanner(false);
        }
        setDeferredPrompt(null);
    };

    const handleDismiss = () => {
        setShowBanner(false);
        localStorage.setItem('pwa-install-dismissed', 'true');
    };

    if (!showBanner) return null;

    return (
        <div className="install-banner">
            <div className="install-banner-content">
                <div className="install-banner-title">📱 アプリをインストール</div>
                <div className="install-banner-desc">
                    ホーム画面に追加してすぐアクセス
                </div>
            </div>
            <button className="btn btn-primary" onClick={handleInstall}>
                追加
            </button>
            <button className="install-banner-close" onClick={handleDismiss}>
                ✕
            </button>
        </div>
    );
}
