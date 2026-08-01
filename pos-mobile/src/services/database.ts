import * as SQLite from 'expo-sqlite';

const DB_NAME = 'pos_offline.db';

let db: SQLite.SQLiteDatabase | null = null;

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
  items: string; // JSON string of order items
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
  modifiers?: string | null; // JSON string of modifiers
  lastSyncedAt: string;
}

export interface OfflineCategory {
  id: string;
  restaurantId: string;
  name: string;
  sortOrder: number;
  lastSyncedAt: string;
}

export interface SyncStatus {
  id: number;
  lastSyncAt: string;
  pendingOrders: number;
  isOnline: boolean;
}

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;

  db = await SQLite.openDatabaseAsync(DB_NAME);
  await initializeDatabase();
  return db;
}

async function initializeDatabase(): Promise<void> {
  if (!db) throw new Error('Database not initialized');

  // Enable foreign keys
  await db.execAsync('PRAGMA foreign_keys = ON;');

  // Create offline orders table
  await db.execAsync(`
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
      status TEXT NOT NULL DEFAULT 'PENDING_SYNC' CHECK(status IN ('PENDING_SYNC', 'SYNCED', 'FAILED')),
      createdAt TEXT NOT NULL,
      syncedAt TEXT,
      errorMessage TEXT
    );
  `);

  // Create offline customers table
  await db.execAsync(`
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

  // Create offline products table
  await db.execAsync(`
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

  // Create offline categories table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS offline_categories (
      id TEXT PRIMARY KEY,
      restaurantId TEXT NOT NULL,
      name TEXT NOT NULL,
      sortOrder INTEGER NOT NULL DEFAULT 0,
      lastSyncedAt TEXT NOT NULL
    );
  `);

  // Create sync status table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS sync_status (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      lastSyncAt TEXT,
      pendingOrders INTEGER NOT NULL DEFAULT 0,
      isOnline INTEGER NOT NULL DEFAULT 1
    );
  `);

  // Initialize sync status if not exists
  await db.execAsync(`
    INSERT OR IGNORE INTO sync_status (id, lastSyncAt, pendingOrders, isOnline)
    VALUES (1, datetime('now'), 0, 1);
  `);

  // Create indexes for better performance
  await db.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_offline_orders_status 
    ON offline_orders(status);
    
    CREATE INDEX IF NOT EXISTS idx_offline_orders_restaurant 
    ON offline_orders(restaurantId);
    
    CREATE INDEX IF NOT EXISTS idx_offline_products_category 
    ON offline_products(categoryId);
    
    CREATE INDEX IF NOT EXISTS idx_offline_products_restaurant 
    ON offline_products(restaurantId);
  `);
}

// Offline Order Operations
export async function saveOfflineOrder(order: Omit<OfflineOrder, 'id' | 'createdAt' | 'status'>): Promise<string> {
  const database = await getDatabase();
  const id = `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const createdAt = new Date().toISOString();

  await database.runAsync(
    `INSERT INTO offline_orders (id, restaurantId, userId, tableId, customerId, orderType, subtotal, taxAmount, totalAmount, items, status, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      order.restaurantId,
      order.userId,
      order.tableId || null,
      order.customerId || null,
      order.orderType,
      order.subtotal,
      order.taxAmount,
      order.totalAmount,
      order.items,
      'PENDING_SYNC',
      createdAt
    ]
  );

  await incrementPendingOrders();
  return id;
}

export async function getPendingOrders(): Promise<OfflineOrder[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<any>(
    `SELECT * FROM offline_orders WHERE status = 'PENDING_SYNC' ORDER BY createdAt ASC`
  );
  return rows.map(row => ({
    ...row,
    items: JSON.parse(row.items)
  }));
}

export async function updateOrderStatus(id: string, status: 'SYNCED' | 'FAILED', errorMessage?: string): Promise<void> {
  const database = await getDatabase();
  const syncedAt = status === 'SYNCED' ? new Date().toISOString() : null;

  await database.runAsync(
    `UPDATE offline_orders SET status = ?, syncedAt = ?, errorMessage = ? WHERE id = ?`,
    [status, syncedAt, errorMessage || null, id]
  );

  if (status === 'SYNCED') {
    await decrementPendingOrders();
  }
}

export async function deleteOfflineOrder(id: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(`DELETE FROM offline_orders WHERE id = ?`, [id]);
}

// Offline Customer Operations
export async function saveOfflineCustomer(customer: OfflineCustomer): Promise<void> {
  const database = await getDatabase();
  const lastSyncedAt = new Date().toISOString();

  await database.runAsync(
    `INSERT OR REPLACE INTO offline_customers (id, restaurantId, fullName, phone, email, points, totalSpent, visitCount, lastSyncedAt)
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
      lastSyncedAt
    ]
  );
}

export async function getOfflineCustomers(restaurantId: string): Promise<OfflineCustomer[]> {
  const database = await getDatabase();
  return await database.getAllAsync<OfflineCustomer>(
    `SELECT * FROM offline_customers WHERE restaurantId = ? ORDER BY fullName ASC`,
    [restaurantId]
  );
}

// Offline Product Operations
export async function saveOfflineProducts(products: OfflineProduct[]): Promise<void> {
  const database = await getDatabase();
  const lastSyncedAt = new Date().toISOString();

  for (const product of products) {
    await database.runAsync(
      `INSERT OR REPLACE INTO offline_products (id, restaurantId, categoryId, name, description, price, sku, imageUrl, available, modifiers, lastSyncedAt)
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
        lastSyncedAt
      ]
    );
  }
}

export async function getOfflineProducts(restaurantId: string): Promise<OfflineProduct[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<any>(
    `SELECT * FROM offline_products WHERE restaurantId = ? ORDER BY name ASC`,
    [restaurantId]
  );
  return rows.map(row => ({
    ...row,
    available: row.available === 1,
    modifiers: row.modifiers ? JSON.parse(row.modifiers) : null
  }));
}

// Offline Category Operations
export async function saveOfflineCategories(categories: OfflineCategory[]): Promise<void> {
  const database = await getDatabase();
  const lastSyncedAt = new Date().toISOString();

  for (const category of categories) {
    await database.runAsync(
      `INSERT OR REPLACE INTO offline_categories (id, restaurantId, name, sortOrder, lastSyncedAt)
       VALUES (?, ?, ?, ?, ?)`,
      [category.id, category.restaurantId, category.name, category.sortOrder, lastSyncedAt]
    );
  }
}

export async function getOfflineCategories(restaurantId: string): Promise<OfflineCategory[]> {
  const database = await getDatabase();
  return await database.getAllAsync<OfflineCategory>(
    `SELECT * FROM offline_categories WHERE restaurantId = ? ORDER BY sortOrder ASC, name ASC`,
    [restaurantId]
  );
}

// Sync Status Operations
export async function getSyncStatus(): Promise<SyncStatus> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<SyncStatus>(
    `SELECT * FROM sync_status WHERE id = 1`
  );
  return row || {
    id: 1,
    lastSyncAt: new Date().toISOString(),
    pendingOrders: 0,
    isOnline: true
  };
}

export async function updateSyncStatus(lastSyncAt: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    `UPDATE sync_status SET lastSyncAt = ? WHERE id = 1`,
    [lastSyncAt]
  );
}

export async function updateOnlineStatus(isOnline: boolean): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    `UPDATE sync_status SET isOnline = ? WHERE id = 1`,
    [isOnline ? 1 : 0]
  );
}

async function incrementPendingOrders(): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    `UPDATE sync_status SET pendingOrders = pendingOrders + 1 WHERE id = 1`
  );
}

async function decrementPendingOrders(): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    `UPDATE sync_status SET pendingOrders = CASE WHEN pendingOrders > 0 THEN pendingOrders - 1 ELSE 0 END WHERE id = 1`
  );
}

// Cleanup Operations
export async function clearSyncedOrders(olderThanDays: number = 7): Promise<void> {
  const database = await getDatabase();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

  await database.runAsync(
    `DELETE FROM offline_orders WHERE status = 'SYNCED' AND syncedAt < ?`,
    [cutoffDate.toISOString()]
  );
}

export async function clearAllOfflineData(): Promise<void> {
  const database = await getDatabase();
  await database.execAsync(`
    DELETE FROM offline_orders;
    DELETE FROM offline_customers;
    DELETE FROM offline_products;
    DELETE FROM offline_categories;
    UPDATE sync_status SET pendingOrders = 0, lastSyncAt = datetime('now');
  `);
}