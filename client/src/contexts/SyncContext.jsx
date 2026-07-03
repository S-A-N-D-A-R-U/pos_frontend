import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import db from '../db/database';

const SyncContext = createContext(null);

export function SyncProvider({ children }) {
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
        const res = await fetch('/api/sync/push', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${user.token}`,
          },
          body: JSON.stringify({ changes: pending }),
        });
        if (res.ok) {
          const ids = pending.map(p => p.id);
          await db.syncOutbox.where('id').anyOf(ids).modify({ status: 'synced' });
        }
      }

      // Pull latest changes
      const user = JSON.parse(localStorage.getItem('buildpos_user') || '{}');
      const lastSync = lastSyncAt || '1970-01-01T00:00:00.000Z';
      const res = await fetch(`/api/sync/pull?since=${encodeURIComponent(lastSync)}`, {
        headers: { 'Authorization': `Bearer ${user.token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.products?.length) await db.products.bulkPut(data.products);
        if (data.categories?.length) await db.categories.bulkPut(data.categories);
        if (data.customers?.length) await db.customers.bulkPut(data.customers);
        if (data.suppliers?.length) await db.suppliers.bulkPut(data.suppliers);
        const now = new Date().toISOString();
        await db.settings.put({ key: 'lastSyncAt', value: now });
        setLastSyncAt(now);
      }

      const newPending = await db.syncOutbox.where('status').equals('pending').count();
      setPendingCount(newPending);
    } catch {
      // Sync failed — will retry later
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, isSyncing, lastSyncAt]);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && pendingCount > 0) {
      syncNow();
    }
  }, [isOnline]); // eslint-disable-line react-hooks/exhaustive-deps

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
