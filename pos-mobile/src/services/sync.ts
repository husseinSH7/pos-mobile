import { api } from './api';
import {
  getPendingOrders,
  updateOrderStatus,
  saveOfflineProducts,
  saveOfflineCategories,
  saveOfflineCustomers,
  getSyncStatus,
  updateSyncStatus,
  updateOnlineStatus,
  type OfflineOrder,
  type OfflineProduct,
  type OfflineCategory,
  type OfflineCustomer
} from './database';
import { isOnline, addNetworkListener } from './network';

export interface SyncResult {
  success: boolean;
  ordersSynced: number;
  ordersFailed: number;
  productsSynced: number;
  categoriesSynced: number;
  error?: string;
}

export interface SyncProgress {
  current: number;
  total: number;
  stage: 'orders' | 'products' | 'categories' | 'complete';
}

type SyncProgressListener = (progress: SyncProgress) => void;

class SyncService {
  private isSyncing: boolean = false;
  private progressListeners: Set<SyncProgressListener> = new Set();
  private autoSyncEnabled: boolean = true;
  private networkUnsubscribe: (() => void) | null = null;

  constructor() {
    this.initializeAutoSync();
  }

  private initializeAutoSync(): void {
    this.networkUnsubscribe = addNetworkListener((state) => {
      updateOnlineStatus(state.isConnected && state.isInternetReachable);
      
      if (state.isConnected && state.isInternetReachable && this.autoSyncEnabled) {
        // Trigger sync when coming back online
        this.sync().catch(error => {
          console.error('Auto-sync failed:', error);
        });
      }
    });
  }

  public setAutoSync(enabled: boolean): void {
    this.autoSyncEnabled = enabled;
  }

  public isCurrentlySyncing(): boolean {
    return this.isSyncing;
  }

  public addProgressListener(listener: SyncProgressListener): () => void {
    this.progressListeners.add(listener);
    return () => {
      this.progressListeners.delete(listener);
    };
  }

  private notifyProgress(progress: SyncProgress): void {
    this.progressListeners.forEach(listener => {
      try {
        listener(progress);
      } catch (error) {
        console.error('Progress listener error:', error);
      }
    });
  }

  public async sync(): Promise<SyncResult> {
    if (this.isSyncing) {
      return {
        success: false,
        ordersSynced: 0,
        ordersFailed: 0,
        productsSynced: 0,
        categoriesSynced: 0,
        error: 'Sync already in progress'
      };
    }

    if (!isOnline()) {
      return {
        success: false,
        ordersSynced: 0,
        ordersFailed: 0,
        productsSynced: 0,
        categoriesSynced: 0,
        error: 'No internet connection'
      };
    }

    this.isSyncing = true;

    try {
      const result: SyncResult = {
        success: true,
        ordersSynced: 0,
        ordersFailed: 0,
        productsSynced: 0,
        categoriesSynced: 0
      };

      // Step 1: Sync pending orders
      this.notifyProgress({ current: 0, total: 3, stage: 'orders' });
      const orderResult = await this.syncPendingOrders();
      result.ordersSynced = orderResult.synced;
      result.ordersFailed = orderResult.failed;

      // Step 2: Sync products
      this.notifyProgress({ current: 1, total: 3, stage: 'products' });
      const productCount = await this.syncProducts();
      result.productsSynced = productCount;

      // Step 3: Sync categories
      this.notifyProgress({ current: 2, total: 3, stage: 'categories' });
      const categoryCount = await this.syncCategories();
      result.categoriesSynced = categoryCount;

      // Update sync status
      await updateSyncStatus(new Date().toISOString());
      this.notifyProgress({ current: 3, total: 3, stage: 'complete' });

      return result;
    } catch (error) {
      console.error('Sync failed:', error);
      return {
        success: false,
        ordersSynced: 0,
        ordersFailed: 0,
        productsSynced: 0,
        categoriesSynced: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    } finally {
      this.isSyncing = false;
    }
  }

  private async syncPendingOrders(): Promise<{ synced: number; failed: number }> {
    const pendingOrders = await getPendingOrders();
    let synced = 0;
    let failed = 0;

    for (const order of pendingOrders) {
      try {
        // Parse the items JSON
        const items = JSON.parse(order.items);

        // Send order to backend
        const response = await api.post('/orders', {
          tableId: order.tableId,
          customerId: order.customerId,
          orderType: order.orderType,
          subtotal: order.subtotal,
          taxAmount: order.taxAmount,
          totalAmount: order.totalAmount,
          items: items
        });

        // Update order status to synced
        await updateOrderStatus(order.id, 'SYNCED');
        synced++;
      } catch (error) {
        console.error(`Failed to sync order ${order.id}:`, error);
        await updateOrderStatus(
          order.id,
          'FAILED',
          error instanceof Error ? error.message : 'Unknown error'
        );
        failed++;
      }
    }

    return { synced, failed };
  }

  private async syncProducts(): Promise<number> {
    try {
      const response = await api.get('/menu/products?includeModifiers=true');
      const products: OfflineProduct[] = response.data.map((product: any) => ({
        id: product.id,
        restaurantId: product.restaurantId || 'default',
        categoryId: product.categoryId,
        name: product.name,
        description: product.description || null,
        price: product.price,
        sku: product.sku || null,
        imageUrl: product.imageUrl || null,
        available: product.available,
        modifiers: product.modifierGroups ? JSON.stringify(product.modifierGroups) : null,
        lastSyncedAt: new Date().toISOString()
      }));

      await saveOfflineProducts(products);
      return products.length;
    } catch (error) {
      console.error('Failed to sync products:', error);
      return 0;
    }
  }

  private async syncCategories(): Promise<number> {
    try {
      const response = await api.get('/menu/categories');
      const categories: OfflineCategory[] = response.data.map((category: any) => ({
        id: category.id,
        restaurantId: category.restaurantId || 'default',
        name: category.name,
        sortOrder: category.sortOrder || 0,
        lastSyncedAt: new Date().toISOString()
      }));

      await saveOfflineCategories(categories);
      return categories.length;
    } catch (error) {
      console.error('Failed to sync categories:', error);
      return 0;
    }
  }

  public async syncCustomers(): Promise<number> {
    try {
      const response = await api.get('/customers');
      const customers: OfflineCustomer[] = response.data.map((customer: any) => ({
        id: customer.id,
        restaurantId: customer.restaurantId || 'default',
        fullName: customer.fullName,
        phone: customer.phone || null,
        email: customer.email || null,
        points: customer.points || 0,
        totalSpent: Number(customer.totalSpent) || 0,
        visitCount: customer.visitCount || 0,
        lastSyncedAt: new Date().toISOString()
      }));

      for (const customer of customers) {
        await saveOfflineCustomers(customer);
      }

      return customers.length;
    } catch (error) {
      console.error('Failed to sync customers:', error);
      return 0;
    }
  }

  public destroy(): void {
    if (this.networkUnsubscribe) {
      this.networkUnsubscribe();
      this.networkUnsubscribe = null;
    }
    this.progressListeners.clear();
  }
}

// Singleton instance
let syncServiceInstance: SyncService | null = null;

export function getSyncService(): SyncService {
  if (!syncServiceInstance) {
    syncServiceInstance = new SyncService();
  }
  return syncServiceInstance;
}

export function destroySyncService(): void {
  if (syncServiceInstance) {
    syncServiceInstance.destroy();
    syncServiceInstance = null;
  }
}