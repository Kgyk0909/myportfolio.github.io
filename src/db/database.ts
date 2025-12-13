import Dexie, { type EntityTable } from 'dexie';
import type { Portfolio, Holding } from '../types';

// IndexedDBデータベース定義
const db = new Dexie('MyPortfolioDB') as Dexie & {
    portfolios: EntityTable<Portfolio, 'id'>;
    holdings: EntityTable<Holding, 'id'>;
};

// スキーマ定義
db.version(1).stores({
    portfolios: '++id, name, createdAt',
    holdings: '++id, portfolioId, ticker, name'
});

export { db };
