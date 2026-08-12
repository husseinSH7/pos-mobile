import * as SQLite from 'expo-sqlite';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// ─── Types ──────────────────────────────────────────────────────
export interface OfflineOrder {
  id: string;
  restaurantId: string;
  userId: string;
  tableId?: string | null;
  customerId?: string | null;
  orderType: 'DINE_IN' | 'TAKEOUT' | 'DELIVERY';
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  items: string;
  notes?: string | null;
  status: 'PENDING_SYNC' | 'SYNCED' | 'FAILED';
  createdAt: string;
  syncedAt?: string | null;
  errorMessage?: string | null;
}

export interface OfflineCustomer {
  id: string;
  restaurantId: string;
  fullName: string;
  phone?: string | null;
  email?: string | null;
  points: number;
  totalSpent: number;
  visitCount: number;
  lastSyncedAt: string;
}

export interface OfflineProduct {
  id: string;
  restaurantId: string;
  categoryId: string;
  name: string;
  description?: string | null;
  price: number;
  sku?: string | null;
  imageUrl?: string | null;
  available: boolean;
  modifiers?: string | null;
  lastSyncedAt: string;
}

export interface OfflineCategory {
  id: string;
  restaurantId: string;
  name: string;
  sortOrder: number;
  lastSyncedAt: string;
}

export interface OfflineTable {
  id: string;
  restaurantId: string;
  name: string;
  seats: number;
  status: string;
  area: string | null;
  guestCount: number;
  openOrderId: string | null;
  lastSyncedAt: string;
}

export interface SyncStatus {
  id: number;
  lastSyncAt: string;
  pendingOrders: number;
  isOnline: boolean;
}

// ─── Platform Detection ──────────────────────────────────────
const isWeb = Platform.OS === 'web';

// ─── Native: SQLite ──────────────────────────────────────────
let sqliteDb: SQLite.SQLiteDatabase | null = null;

async function getSQLiteDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (sqliteDb) return sqliteDb;
  sqliteDb = await SQLite.openDatabaseAsync('pos_offline.db');
  await initializeSQLiteTables();
  return sqliteDb;
}

async function initializeSQLiteTables(): Promise<void> {
  if (!sqliteDb) throw new Error('SQLite not initialized');
  await sqliteDb.execAsync('PRAGMA foreign_keys = ON;');
  await sqliteDb.execAsync('PRAGMA journal_mode = WAL;');
  await sqliteDb.execAsync('PRAGMA synchronous = NORMAL;');
  await sqliteDb.execAsync('PRAGMA cache_size = -64000;');

  await sqliteDb.execAsync(`
    CREATE TABLE IF NOT EXISTS offline_orders (
      id TEXT PRIMARY KEY,
      restaurantId TEXT NOT NULL,
      userId TEXT NOT NULL,
      tableId TEXT,
      customerId TEXT,
      orderType TEXT NOT NULL CHECK(orderType IN ('DINE_IN', 'TAKEOUT', 'DELIVERY')),
      subtotal REAL NOT NULL,
      taxAmount REAL NOT NULL,
      totalAmount REAL NOT NULL,
      items TEXT NOT NULL,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'PENDING_SYNC' CHECK(status IN ('PENDING_SYNC', 'SYNCED', 'FAILED')),
      createdAt TEXT NOT NULL,
      syncedAt TEXT,
      errorMessage TEXT
    );
  `);

  await sqliteDb.execAsync(`
    CREATE TABLE IF NOT EXISTS offline_customers (
      id TEXT PRIMARY KEY,
      restaurantId TEXT NOT NULL,
      fullName TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      points INTEGER NOT NULL DEFAULT 0,
      totalSpent REAL NOT NULL DEFAULT 0,
      visitCount INTEGER NOT NULL DEFAULT 0,
      lastSyncedAt TEXT NOT NULL
    );
  `);

  await sqliteDb.execAsync(`
    CREATE TABLE IF NOT EXISTS offline_products (
      id TEXT PRIMARY KEY,
      restaurantId TEXT NOT NULL,
      categoryId TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      sku TEXT,
      imageUrl TEXT,
      available INTEGER NOT NULL DEFAULT 1,
      modifiers TEXT,
      lastSyncedAt TEXT NOT NULL
    );
  `);

  await sqliteDb.execAsync(`
    CREATE TABLE IF NOT EXISTS offline_categories (
      id TEXT PRIMARY KEY,
      restaurantId TEXT NOT NULL,
      name TEXT NOT NULL,
      sortOrder INTEGER NOT NULL DEFAULT 0,
      lastSyncedAt TEXT NOT NULL
    );
  `);

  await sqliteDb.execAsync(`
    CREATE TABLE IF NOT EXISTS offline_tables (
      id TEXT PRIMARY KEY,
      restaurantId TEXT NOT NULL,
      name TEXT NOT NULL,
      seats INTEGER DEFAULT 2,
      status TEXT DEFAULT 'AVAILABLE',
      area TEXT,
      guestCount INTEGER DEFAULT 0,
      openOrderId TEXT,
      lastSyncedAt TEXT NOT NULL
    );
  `);

  await sqliteDb.execAsync(`
    CREATE TABLE IF NOT EXISTS sync_status (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      lastSyncAt TEXT,
      pendingOrders INTEGER NOT NULL DEFAULT 0,
      isOnline INTEGER NOT NULL DEFAULT 1
    );
  `);

  await sqliteDb.execAsync(`
    INSERT OR IGNORE INTO sync_status (id, lastSyncAt, pendingOrders, isOnline)
    VALUES (1, datetime('now'), 0, 1);
  `);

  await sqliteDb.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_offline_orders_status ON offline_orders(status);
    CREATE INDEX IF NOT EXISTS idx_offline_orders_restaurant ON offline_orders(restaurantId);
    CREATE INDEX IF NOT EXISTS idx_offline_products_category ON offline_products(categoryId);
    CREATE INDEX IF NOT EXISTS idx_offline_products_restaurant ON offline_products(restaurantId);
    CREATE INDEX IF NOT EXISTS idx_offline_tables_restaurant ON offline_tables(restaurantId);
  `);
}

// ─── Web: AsyncStorage Helpers ──────────────────────────────
const WEB_PREFIX = 'pos_offline_';

async function getWebData<T>(key: string): Promise<T[]> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function setWebData<T>(key: string, data: T[]): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(data));
}

// ─── Unified Public Functions ──────────────────────────────

/** Initialize the database (native only; web does nothing) */
export async function getDatabase(): Promise<any> {
  if (isWeb) {
    return null;
  }
  return getSQLiteDatabase();
}

// ─── Offline Order Operations ──────────────────────────────

export async function saveOfflineOrder(order: Omit<OfflineOrder, 'id' | 'createdAt' | 'status'>): Promise<string> {
  const id = `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const createdAt = new Date().toISOString();
  const newOrder: OfflineOrder = {
    ...order,
    id,
    status: 'PENDING_SYNC',
    createdAt,
    syncedAt: null,
    errorMessage: null,
  };

  if (isWeb) {
    const key = `${WEB_PREFIX}orders_${order.restaurantId}`;
    const orders = await getWebData<OfflineOrder>(key);
    orders.push(newOrder);
    await setWebData(key, orders);
    return id;
  } else {
    const db = await getSQLiteDatabase();
    await db.runAsync(
      `INSERT INTO offline_orders 
       (id, restaurantId, userId, tableId, customerId, orderType, subtotal, taxAmount, totalAmount, items, notes, status, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newOrder.id,
        newOrder.restaurantId,
        newOrder.userId,
        newOrder.tableId || null,
        newOrder.customerId || null,
        newOrder.orderType,
        newOrder.subtotal,
        newOrder.taxAmount,
        newOrder.totalAmount,
        newOrder.items,
        newOrder.notes || null,
        newOrder.status,
        newOrder.createdAt,
      ]
    );
    return id;
  }
}

export async function getPendingOrders(): Promise<OfflineOrder[]> {
  if (isWeb) {
    const all = await getWebData<OfflineOrder>(`${WEB_PREFIX}all_orders`);
    return all.filter(o => o.status === 'PENDING_SYNC');
  } else {
    const db = await getSQLiteDatabase();
    const rows = await db.getAllAsync<any>(
      `SELECT * FROM offline_orders WHERE status = 'PENDING_SYNC' ORDER BY createdAt ASC`
    );
    return rows.map(row => ({ ...row, items: JSON.parse(row.items) }));
  }
}

export async function updateOrderStatus(id: string, status: 'SYNCED' | 'FAILED', errorMessage?: string): Promise<void> {
  const syncedAt = status === 'SYNCED' ? new Date().toISOString() : null;
  if (isWeb) {
    const all = await getWebData<OfflineOrder>(`${WEB_PREFIX}all_orders`);
    const updated = all.map(o => {
      if (o.id === id) {
        return { ...o, status, syncedAt, errorMessage: errorMessage || null };
      }
      return o;
    });
    await setWebData(`${WEB_PREFIX}all_orders`, updated);
  } else {
    const db = await getSQLiteDatabase();
    await db.runAsync(
      `UPDATE offline_orders SET status = ?, syncedAt = ?, errorMessage = ? WHERE id = ?`,
      [status, syncedAt, errorMessage || null, id]
    );
  }
}

// ─── Offline Table Operations ──────────────────────────────

export async function saveOfflineTables(tables: any[]): Promise<void> {
  if (isWeb) {
    if (tables.length === 0) return;
    const restaurantId = tables[0].restaurantId;
    const key = `${WEB_PREFIX}tables_${restaurantId}`;
    await setWebData(key, tables);
  } else {
    const db = await getSQLiteDatabase();
    const lastSyncedAt = new Date().toISOString();
    for (const t of tables) {
      await db.runAsync(
        `INSERT OR REPLACE INTO offline_tables 
         (id, restaurantId, name, seats, status, area, guestCount, openOrderId, lastSyncedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          t.id,
          t.restaurantId,
          t.name,
          t.seats || 2,
          t.status || 'AVAILABLE',
          t.area || null,
          t.guestCount || 0,
          t.openOrderId || null,
          lastSyncedAt,
        ]
      );
    }
  }
}

export async function getOfflineTables(restaurantId: string): Promise<OfflineTable[]> {
  if (isWeb) {
    const key = `${WEB_PREFIX}tables_${restaurantId}`;
    return getWebData<OfflineTable>(key);
  } else {
    const db = await getSQLiteDatabase();
    return await db.getAllAsync<OfflineTable>(
      `SELECT * FROM offline_tables WHERE restaurantId = ? ORDER BY name ASC`,
      [restaurantId]
    );
  }
}

// ─── Offline Product Operations ──────────────────────────────

export async function saveOfflineProducts(products: OfflineProduct[]): Promise<void> {
  if (isWeb) {
    if (products.length === 0) return;
    const restaurantId = products[0].restaurantId;
    const key = `${WEB_PREFIX}products_${restaurantId}`;
    await setWebData(key, products);
  } else {
    const db = await getSQLiteDatabase();
    const lastSyncedAt = new Date().toISOString();
    for (const product of products) {
      await db.runAsync(
        `INSERT OR REPLACE INTO offline_products 
         (id, restaurantId, categoryId, name, description, price, sku, imageUrl, available, modifiers, lastSyncedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          product.id,
          product.restaurantId,
          product.categoryId,
          product.name,
          product.description || null,
          product.price,
          product.sku || null,
          product.imageUrl || null,
          product.available ? 1 : 0,
          product.modifiers || null,
          lastSyncedAt,
        ]
      );
    }
  }
}

export async function getOfflineProducts(restaurantId: string): Promise<OfflineProduct[]> {
  if (isWeb) {
    const key = `${WEB_PREFIX}products_${restaurantId}`;
    return getWebData<OfflineProduct>(key);
  } else {
    const db = await getSQLiteDatabase();
    const rows = await db.getAllAsync<any>(
      `SELECT * FROM offline_products WHERE restaurantId = ? ORDER BY name ASC`,
      [restaurantId]
    );
    return rows.map(row => ({
      ...row,
      available: row.available === 1,
      modifiers: row.modifiers ? JSON.parse(row.modifiers) : null,
    }));
  }
}

// ─── Offline Category Operations ──────────────────────────────

export async function saveOfflineCategories(categories: OfflineCategory[]): Promise<void> {
  if (isWeb) {
    if (categories.length === 0) return;
    const restaurantId = categories[0].restaurantId;
    const key = `${WEB_PREFIX}categories_${restaurantId}`;
    await setWebData(key, categories);
  } else {
    const db = await getSQLiteDatabase();
    const lastSyncedAt = new Date().toISOString();
    for (const category of categories) {
      await db.runAsync(
        `INSERT OR REPLACE INTO offline_categories (id, restaurantId, name, sortOrder, lastSyncedAt)
         VALUES (?, ?, ?, ?, ?)`,
        [category.id, category.restaurantId, category.name, category.sortOrder, lastSyncedAt]
      );
    }
  }
}

export async function getOfflineCategories(restaurantId: string): Promise<OfflineCategory[]> {
  if (isWeb) {
    const key = `${WEB_PREFIX}categories_${restaurantId}`;
    return getWebData<OfflineCategory>(key);
  } else {
    const db = await getSQLiteDatabase();
    return await db.getAllAsync<OfflineCategory>(
      `SELECT * FROM offline_categories WHERE restaurantId = ? ORDER BY sortOrder ASC, name ASC`,
      [restaurantId]
    );
  }
}

// ─── Offline Customer Operations (NEW) ────────────────────────

export async function saveOfflineCustomer(customer: OfflineCustomer): Promise<void> {
  if (isWeb) {
    const key = `${WEB_PREFIX}customers_${customer.restaurantId}`;
    const customers = await getWebData<OfflineCustomer>(key);
    const existingIndex = customers.findIndex(c => c.id === customer.id);
    if (existingIndex >= 0) {
      customers[existingIndex] = customer;
    } else {
      customers.push(customer);
    }
    await setWebData(key, customers);
  } else {
    const db = await getSQLiteDatabase();
    const lastSyncedAt = new Date().toISOString();
    await db.runAsync(
      `INSERT OR REPLACE INTO offline_customers 
       (id, restaurantId, fullName, phone, email, points, totalSpent, visitCount, lastSyncedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        customer.id,
        customer.restaurantId,
        customer.fullName,
        customer.phone || null,
        customer.email || null,
        customer.points,
        customer.totalSpent,
        customer.visitCount,
        lastSyncedAt,
      ]
    );
  }
}

export async function getOfflineCustomers(restaurantId: string): Promise<OfflineCustomer[]> {
  if (isWeb) {
    const key = `${WEB_PREFIX}customers_${restaurantId}`;
    return getWebData<OfflineCustomer>(key);
  } else {
    const db = await getSQLiteDatabase();
    return await db.getAllAsync<OfflineCustomer>(
      `SELECT * FROM offline_customers WHERE restaurantId = ? ORDER BY fullName ASC`,
      [restaurantId]
    );
  }
}

// ─── Sync Status Operations ──────────────────────────────────

export async function getSyncStatus(): Promise<SyncStatus> {
  if (isWeb) {
    const raw = await AsyncStorage.getItem(`${WEB_PREFIX}sync_status`);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        id: 1,
        lastSyncAt: parsed.lastSyncAt || new Date().toISOString(),
        pendingOrders: parsed.pendingOrders || 0,
        isOnline: parsed.isOnline !== undefined ? parsed.isOnline : true,
      };
    }
    return {
      id: 1,
      lastSyncAt: new Date().toISOString(),
      pendingOrders: 0,
      isOnline: true,
    };
  } else {
    const db = await getSQLiteDatabase();
    const row = await db.getFirstAsync<SyncStatus>('SELECT * FROM sync_status WHERE id = 1');
    return row || {
      id: 1,
      lastSyncAt: new Date().toISOString(),
      pendingOrders: 0,
      isOnline: true,
    };
  }
}

export async function updateSyncStatus(lastSyncAt: string): Promise<void> {
  if (isWeb) {
    const status = await getSyncStatus();
    status.lastSyncAt = lastSyncAt;
    await AsyncStorage.setItem(`${WEB_PREFIX}sync_status`, JSON.stringify(status));
  } else {
    const db = await getSQLiteDatabase();
    await db.runAsync('UPDATE sync_status SET lastSyncAt = ? WHERE id = 1', [lastSyncAt]);
  }
}

export async function updateOnlineStatus(isOnline: boolean): Promise<void> {
  if (isWeb) {
    const status = await getSyncStatus();
    status.isOnline = isOnline;
    await AsyncStorage.setItem(`${WEB_PREFIX}sync_status`, JSON.stringify(status));
  } else {
    const db = await getSQLiteDatabase();
    await db.runAsync('UPDATE sync_status SET isOnline = ? WHERE id = 1', [isOnline ? 1 : 0]);
  }
}

// ─── Cleanup ──────────────────────────────────────────────────

export async function clearAllOfflineData(): Promise<void> {
  if (isWeb) {
    const keys = await AsyncStorage.getAllKeys();
    const toRemove = keys.filter(k => k.startsWith(WEB_PREFIX));
    await AsyncStorage.multiRemove(toRemove);
  } else {
    const db = await getSQLiteDatabase();
    await db.execAsync(`
      DELETE FROM offline_orders;
      DELETE FROM offline_customers;
      DELETE FROM offline_products;
      DELETE FROM offline_categories;
      DELETE FROM offline_tables;
      UPDATE sync_status SET pendingOrders = 0, lastSyncAt = datetime('now');
    `);
  }
}