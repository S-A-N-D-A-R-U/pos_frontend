import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import db from '../db/database';
import { useAuth } from './AuthContext';
import { apiFetch } from '../utils/api';

const SyncContext = createContext(null);

export function SyncProvider({ children }) {
  const { logout } = useAuth();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState(null);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Check pending outbox count periodically
  useEffect(() => {
    const checkPending = async () => {
      try {
        const count = await db.syncOutbox.where('status').equals('pending').count();
        setPendingCount(count);
      } catch {
        // ignore
      }
    };
    checkPending();
    const interval = setInterval(checkPending, 10000);
    return () => clearInterval(interval);
  }, []);

  // Load last sync timestamp
  useEffect(() => {
    db.settings.get('lastSyncAt').then(s => {
      if (s) setLastSyncAt(s.value);
    }).catch(() => {});
  }, []);

  const pushToOutbox = useCallback(async (entity, entityId, operation, data) => {
    await db.syncOutbox.add({
      entity,
      entityId,
      operation,
      data,
      createdAt: new Date().toISOString(),
      status: 'pending',
    });
    setPendingCount(prev => prev + 1);
  }, []);

  const syncNow = useCallback(async () => {
    if (!isOnline || isSyncing) return;
    setIsSyncing(true);
    try {
      // Push pending changes
      const pending = await db.syncOutbox.where('status').equals('pending').toArray();
      if (pending.length > 0) {
        const user = JSON.parse(localStorage.getItem('buildpos_user') || '{}');
        const res = await apiFetch('/api/sync/push', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${user.token}`,
          },
          body: JSON.stringify({ changes: pending }),
        });
        if (res.status === 401) {
          logout();
          return;
        }
        if (res.ok) {
          const responseBody = await res.json();
          if (responseBody.results) {
            const successIds = responseBody.results.filter(r => r.status === 'ok').map(r => r.id);
            if (successIds.length > 0) {
              await db.syncOutbox.where('id').anyOf(successIds).modify({ status: 'synced' });
            }
          } else {
            const ids = pending.map(p => p.id);
            await db.syncOutbox.where('id').anyOf(ids).modify({ status: 'synced' });
          }
        }
      }

      // Pull latest changes
      const user = JSON.parse(localStorage.getItem('buildpos_user') || '{}');
      const lastSync = lastSyncAt || '1970-01-01T00:00:00.000Z';
      const res = await fetch(`/api/sync/pull?since=${encodeURIComponent(lastSync)}`, {
        headers: { 'Authorization': `Bearer ${user.token}` },
      });
      if (res.status === 401) {
        logout();
        return;
      }
      if (res.ok) {
        const data = await res.json();
        
        // Helper to process active/deleted entities
        const processEntities = async (table, items) => {
          if (!items || !items.length) return;
          const active = items.filter(i => i.isActive !== false);
          const deleted = items.filter(i => i.isActive === false).map(i => i.id);
          if (active.length > 0) await table.bulkPut(active);
          if (deleted.length > 0) await table.bulkDelete(deleted);
        };

        await processEntities(db.products, data.products);
        await processEntities(db.categories, data.categories);
        await processEntities(db.customers, data.customers);
        await processEntities(db.suppliers, data.suppliers);

        if (data.sales?.length) {
          await db.sales.bulkPut(data.sales);
          
          // Flatten sale items
          const saleItems = [];
          for (const sale of data.sales) {
            if (sale.items) {
              for (const item of sale.items) {
                saleItems.push({
                  id: crypto.randomUUID(), 
                  saleId: sale.id,
                  productId: item.productId,
                  productName: item.productName,
                  price: item.price,
                  qty: item.qty,
                  subtotal: item.subtotal
                });
              }
            }
          }
          if (saleItems.length > 0) await db.saleItems.bulkPut(saleItems);
        }
        
        if (data.customerPayments?.length) {
          await db.customerPayments.bulkPut(data.customerPayments);
        }

        const syncTime = data.syncedAt || new Date().toISOString();
        await db.settings.put({ key: 'lastSyncAt', value: syncTime });
        setLastSyncAt(syncTime);
      }

      const newPending = await db.syncOutbox.where('status').equals('pending').count();
      setPendingCount(newPending);
    } catch {
      // Sync failed — will retry later
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, isSyncing, lastSyncAt]);

  // Auto-sync on load or when coming back online
  useEffect(() => {
    if (isOnline) {
      syncNow();
    }
  }, [isOnline]); // eslint-disable-line react-hooks/exhaustive-deps

  // Background polling every 30s
  useEffect(() => {
    if (!isOnline) return;
    const interval = setInterval(() => {
      syncNow();
    }, 30000);
    return () => clearInterval(interval);
  }, [isOnline, syncNow]);

  return (
    <SyncContext.Provider value={{ isOnline, isSyncing, lastSyncAt, pendingCount, pushToOutbox, syncNow }}>
      {children}
    </SyncContext.Provider>
  );
}

export function useSync() {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error('useSync must be used within SyncProvider');
  return ctx;
}
