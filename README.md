# MyPortfolio - 投資ポートフォリオ管理PWA

投資信託の保有口数とアセットクラス比率を元に、資産全体の地域別分散状況を可視化するPWAアプリケーション。

## 🚀 クイックスタート

### フロントエンド

```bash
# 依存パッケージのインストール
npm install

# 開発サーバー起動
npm run dev

# ビルド（本番用）
npm run build
```

### 価格取得API（Python）

```bash
cd api

# 仮想環境作成（推奨）
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Mac/Linux

# 依存パッケージのインストール
pip install -r requirements.txt

# サーバー起動
uvicorn main:app --reload --port 8000
```

## 📱 機能

- **ポートフォリオ管理**: 複数のポートフォリオ（特定口座、NISAなど）を作成
- **銘柄追加**: ティッカーシンボル、保有口数、アセットクラス比率を登録
- **自動評価額計算**: yfinanceで最新価格を取得し評価額を計算
- **地域別分散可視化**: 円グラフで現在のアロケーションを表示
- **目標との比較**: 棒グラフで目標アロケーションとの乖離を確認
- **PWA対応**: オフライン利用、ホーム画面への追加が可能

## 🛠 技術スタック

- **フロントエンド**: React + TypeScript + Vite
- **状態管理**: Zustand
- **データ永続化**: IndexedDB（Dexie.js）
- **チャート**: Chart.js + react-chartjs-2
- **価格API**: FastAPI + yfinance
- **PWA**: vite-plugin-pwa

## 📁 ディレクトリ構成

```
myportfolio/
├── api/                    # Python価格API
│   ├── main.py
│   └── requirements.txt
├── src/
│   ├── components/         # Reactコンポーネント
│   ├── db/                 # IndexedDB設定
│   ├── services/           # API通信
│   ├── stores/             # Zustandストア
│   └── types/              # TypeScript型定義
├── assets/img/             # PWAアイコン
└── index.html
```

## 🌐 デプロイ

### GitHub Pages（フロントエンド）

```bash
npm run build
# distフォルダの内容をgh-pagesブランチにデプロイ
```

### 価格API

Render、Railway、Heroku等でホスティングし、`VITE_API_URL`環境変数を設定してください。

## 📄 ライセンス

MIT
