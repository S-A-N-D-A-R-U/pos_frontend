import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSync } from '../../contexts/SyncContext';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  BarChart3,
  Users,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Wifi,
  WifiOff,
  Cloud,
  Loader2,
  FileText,
  Tags,
  Truck,
} from 'lucide-react';
import { timeAgo } from '../../utils/helpers';

import { useState } from 'react';

export default function Sidebar() {
  const { user, logout, isAdmin } = useAuth();
  const { isOnline, isSyncing, lastSyncAt, pendingCount, syncNow } = useSync();
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);
  const collapsed = !isHovered;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const adminLinks = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/pos', icon: ShoppingCart, label: 'POS' },
    { to: '/sales', icon: FileText, label: 'Sales' },
    { to: '/products', icon: Package, label: 'Products' },
    { to: '/categories', icon: Tags, label: 'Categories' },
    { to: '/suppliers', icon: Truck, label: 'Suppliers' },
    { to: '/customers', icon: Users, label: 'Customers' },
    { to: '/reports', icon: BarChart3, label: 'Reports' },
    { to: '/users', icon: Users, label: 'Users' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];

  const cashierLinks = [
    { to: '/pos', icon: ShoppingCart, label: 'POS' },
  ];

  const links = isAdmin ? adminLinks : cashierLinks;

  return (
    <div 
      className="sidebar" 
      style={{ width: collapsed ? 72 : 250, height: '100%' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Logo */}
      <div style={{
        padding: collapsed ? '20px 0' : '20px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        justifyContent: collapsed ? 'center' : 'flex-start',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        minHeight: 72,
      }}>
        <div style={{
          width: 36,
          height: 36,
          background: 'var(--color-accent)',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 800,
          fontSize: 18,
          color: 'white',
          flexShrink: 0,
        }}>
          B
        </div>
        {!collapsed && (
          <div style={{ animation: 'fadeIn 0.3s' }}>
            <div style={{ fontWeight: 700, fontSize: 16, letterSpacing: '-0.02em' }}>BuildPOS</div>
            <div style={{ fontSize: 11, opacity: 0.5, fontWeight: 400 }}>Hardware Store</div>
          </div>
        )}
      </div>

      {/* Nav Links */}
      <nav style={{ flex: 1, padding: '12px 0', overflowY: 'auto' }}>
        {links.map(link => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            style={collapsed ? { justifyContent: 'center', padding: '12px', margin: '2px 10px' } : undefined}
            title={collapsed ? link.label : undefined}
          >
            <link.icon size={20} style={{ flexShrink: 0 }} />
            {!collapsed && <span>{link.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Sync Status */}
      <div style={{
        padding: collapsed ? '12px 0' : '12px 18px',
        borderTop: '1px solid rgba(255,255,255,0.1)',
      }}>
        <button
          onClick={syncNow}
          disabled={!isOnline || isSyncing}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: collapsed ? '10px' : '10px 12px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(255,255,255,0.05)',
            border: 'none',
            color: 'rgba(255,255,255,0.7)',
            cursor: isOnline ? 'pointer' : 'default',
            width: '100%',
            justifyContent: collapsed ? 'center' : 'flex-start',
            fontSize: 13,
            transition: 'all 0.15s',
          }}
          title={collapsed ? (isOnline ? 'Online' : 'Offline') : undefined}
        >
          {isSyncing ? (
            <Loader2 size={16} className="animate-spin" style={{ flexShrink: 0 }} />
          ) : isOnline ? (
            <Cloud size={16} style={{ flexShrink: 0, color: 'var(--color-success)' }} />
          ) : (
            <WifiOff size={16} style={{ flexShrink: 0, color: 'var(--color-warning)' }} />
          )}
          {!collapsed && (
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 500, fontSize: 12 }}>
                {isSyncing ? 'Syncing...' : isOnline ? 'Online' : 'Offline'}
              </div>
              <div style={{ fontSize: 10, opacity: 0.5 }}>
                {pendingCount > 0 ? `${pendingCount} pending` : `Synced ${timeAgo(lastSyncAt)}`}
              </div>
            </div>
          )}
        </button>
      </div>

      {/* User & Logout */}
      <div style={{
        padding: collapsed ? '12px 0' : '12px 18px',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        justifyContent: collapsed ? 'center' : 'flex-start',
      }}>
        <div style={{
          width: 34,
          height: 34,
          borderRadius: 'var(--radius-full)',
          background: 'rgba(37,99,235,0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 600,
          fontSize: 14,
          flexShrink: 0,
        }}>
          {user?.name?.charAt(0)?.toUpperCase() || 'U'}
        </div>
        {!collapsed && (
          <>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name}</div>
              <div style={{ fontSize: 11, opacity: 0.5, textTransform: 'capitalize' }}>{user?.role}</div>
            </div>
            <button
              onClick={handleLogout}
              style={{
                background: 'none',
                border: 'none',
                color: 'rgba(255,255,255,0.5)',
                cursor: 'pointer',
                padding: 6,
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                transition: 'all 0.15s',
              }}
              title="Logout"
              onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}
            >
              <LogOut size={18} />
            </button>
          </>
        )}
      </div>

    </div>
  );
}
