import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import db from '../db/database';
import { hashPassword } from '../utils/crypto';
import { apiFetch } from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for stored session
    const stored = localStorage.getItem('buildpos_user');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        localStorage.removeItem('buildpos_user');
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (username, password) => {
    // Try online auth first
    try {
      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (res.ok) {
        const data = await res.json();
        const userData = { id: data.id, username: data.username, name: data.name, role: data.role, token: data.token };
        setUser(userData);
        localStorage.setItem('buildpos_user', JSON.stringify(userData));
        // Cache for offline use with securely hashed password
        const hashedPassword = await hashPassword(password);
        await db.authCache.put({ id: data.id, username: data.username, passwordHash: hashedPassword, role: data.role, name: data.name });
        return { success: true };
      }
    } catch {
      // Server unreachable — fall through to offline auth
    }

    // Offline auth fallback (secure hash comparison)
    const hashedAttempt = await hashPassword(password);
    const cached = await db.authCache.where('username').equals(username).first();
    
    if (cached) {
      if (cached.passwordHash === hashedAttempt) {
        const userData = { id: cached.id, username: cached.username, name: cached.name, role: cached.role, token: null };
        setUser(userData);
        localStorage.setItem('buildpos_user', JSON.stringify(userData));
        return { success: true };
      }
      // Seamless migration for legacy plaintext passwords
      else if (cached.passwordHash === password) {
        await db.authCache.update(cached.id, { passwordHash: hashedAttempt });
        const userData = { id: cached.id, username: cached.username, name: cached.name, role: cached.role, token: null };
        setUser(userData);
        localStorage.setItem('buildpos_user', JSON.stringify(userData));
        return { success: true };
      }
    }

    return { success: false, error: 'Invalid username or password' };
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('buildpos_user');
  }, []);

  const isAdmin = user?.role === 'admin';
  const isCashier = user?.role === 'cashier';

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAdmin, isCashier }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
