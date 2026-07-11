import { useState, useEffect, useRef } from 'react';
import db from '../../db/database';
import { useToast } from '../../contexts/ToastContext';
import { Save, Store, Receipt, Percent, RefreshCw, Database, Download, Upload } from 'lucide-react';
import { seedDatabase } from '../../db/seed';

export default function SettingsPage() {
  const toast = useToast();
  const [settings, setSettings] = useState({
    storeName: '',
    storeAddress: '',
    storePhone: '',
    currency: 'LKR',
    currencySymbol: 'Rs.',
    taxRate: 0,
    receiptFooter: '',
  });

  useEffect(() => {
    const load = async () => {
      const all = await db.settings.toArray();
      const obj = {};
      all.forEach(s => { obj[s.key] = s.value; });
      setSettings(prev => ({ ...prev, ...obj }));
    };
    load();
  }, []);

  const handleSave = async () => {
    const entries = Object.entries(settings);
    for (const [key, value] of entries) {
      await db.settings.put({ key, value });
    }
    toast.success('Settings saved');
  };

  const handleResetData = async () => {
    if (!confirm('This will delete ALL data and re-seed. Are you sure?')) return;
    await db.delete();
    window.location.reload();
  };

  const fileInputRef = useRef(null);

  const handleBackupData = async () => {
    try {
      const backup = {};
      const tables = ['products', 'categories', 'customers', 'suppliers', 'sales', 'saleItems', 'settings', 'customerPayments', 'syncOutbox'];
      for (const table of tables) {
        if (db[table]) {
          backup[table] = await db[table].toArray();
        }
      }
      const json = JSON.stringify(backup);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const dateStr = new Date().toISOString().split('T')[0];
      a.download = `buildpos_backup_${dateStr}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Backup downloaded successfully');
    } catch (err) {
      toast.error('Backup failed: ' + err.message);
    }
  };

  const handleRestoreData = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const backup = JSON.parse(event.target.result);
        if (!confirm('This will replace all your current data with the backup. Are you sure?')) return;

        const tables = Object.keys(backup);
        const validTables = tables.filter(t => db[t]);

        await db.transaction('rw', validTables.map(t => db[t]), async () => {
          for (const table of validTables) {
            await db[table].clear();
            if (backup[table].length > 0) {
              await db[table].bulkPut(backup[table]);
            }
          }
        });
        toast.success('Data restored successfully! Reloading...');
        setTimeout(() => window.location.reload(), 1500);
      } catch (err) {
        toast.error('Restore failed: Invalid backup file');
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <div style={{ padding: 28, maxWidth: 700, margin: '0 auto' }} className="animate-fade-in">
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em' }}>Settings</h1>
        <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginTop: 4 }}>
          Configure your store and system preferences
        </p>
      </div>

      {/* Store Info */}
      <div className="card" style={{ padding: 24, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <Store size={20} style={{ color: 'var(--color-accent)' }} />
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>Store Information</h3>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Store Name</label>
            <input className="input" value={settings.storeName} onChange={e => setSettings({ ...settings, storeName: e.target.value })} placeholder="BuildPOS Hardware" />
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Address</label>
            <input className="input" value={settings.storeAddress} onChange={e => setSettings({ ...settings, storeAddress: e.target.value })} placeholder="123 Main Street, Colombo" />
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Phone</label>
            <input className="input" value={settings.storePhone} onChange={e => setSettings({ ...settings, storePhone: e.target.value })} placeholder="+94 11 234 5678" />
          </div>
        </div>
      </div>

      {/* Currency & Tax */}
      <div className="card" style={{ padding: 24, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <Percent size={20} style={{ color: 'var(--color-accent)' }} />
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>Currency & Tax</h3>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Currency</label>
            <select className="input" value={settings.currency} onChange={e => setSettings({ ...settings, currency: e.target.value })}>
              <option value="LKR">LKR (Sri Lankan Rupee)</option>
              <option value="USD">USD (US Dollar)</option>
              <option value="INR">INR (Indian Rupee)</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Currency Symbol</label>
            <input className="input" value={settings.currencySymbol} onChange={e => setSettings({ ...settings, currencySymbol: e.target.value })} />
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Tax Rate (%)</label>
            <input className="input" type="number" min="0" max="100" value={settings.taxRate} onChange={e => setSettings({ ...settings, taxRate: parseFloat(e.target.value) || 0 })} />
          </div>
        </div>
      </div>

      {/* Receipt */}
      <div className="card" style={{ padding: 24, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <Receipt size={20} style={{ color: 'var(--color-accent)' }} />
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>Receipt Settings</h3>
        </div>
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Receipt Footer Message</label>
          <input className="input" value={settings.receiptFooter} onChange={e => setSettings({ ...settings, receiptFooter: e.target.value })} placeholder="Thank you for your purchase!" />
        </div>
      </div>

      {/* Save */}
      <button className="btn btn-primary btn-lg" onClick={handleSave} style={{ width: '100%', marginBottom: 20 }}>
        <Save size={18} /> Save Settings
      </button>

      {/* Data Management (Backup/Restore) */}
      <div className="card" style={{ padding: 24, marginBottom: 20, borderColor: 'var(--color-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <Database size={20} style={{ color: 'var(--color-accent)' }} />
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>Data Management</h3>
        </div>
        <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 16 }}>
          Since you are running offline, you can backup your data manually to your computer.
        </p>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-secondary" onClick={handleBackupData} style={{ flex: 1 }}>
            <Download size={16} /> Backup Data
          </button>
          <button className="btn btn-secondary" onClick={() => fileInputRef.current?.click()} style={{ flex: 1 }}>
            <Upload size={16} /> Restore Data
          </button>
          <input
            type="file"
            accept=".json"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleRestoreData}
          />
        </div>
      </div>

      {/* Danger Zone */}
      <div className="card" style={{ padding: 24, borderColor: 'var(--color-danger-light)' }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-danger)', marginBottom: 12 }}>Danger Zone</h3>
        <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 16 }}>
          Reset all local data and start fresh. This action cannot be undone.
        </p>
        <button className="btn btn-danger" onClick={handleResetData}>
          <RefreshCw size={16} /> Reset All Data
        </button>
      </div>
    </div>
  );
}
