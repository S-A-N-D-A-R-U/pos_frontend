import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { SyncProvider } from './contexts/SyncContext';
import MainLayout from './components/layout/MainLayout';
import LoginPage from './pages/auth/LoginPage';
import POSPage from './pages/pos/POSPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import SalesPage from './pages/sales/SalesPage';
import ProductsPage from './pages/products/ProductsPage';
import CategoriesPage from './pages/categories/CategoriesPage';
import SuppliersPage from './pages/suppliers/SuppliersPage';
import ReportsPage from './pages/reports/ReportsPage';
import UsersPage from './pages/users/UsersPage';
import CustomersPage from './pages/customers/CustomersPage';
import SettingsPage from './pages/settings/SettingsPage';

function PrivateRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100dvh', background: 'var(--color-bg-primary)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 48, height: 48, border: '3px solid var(--color-border)',
            borderTopColor: 'var(--color-accent)', borderRadius: '50%',
            margin: '0 auto 16px',
          }} className="animate-spin" />
          <div style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>Loading...</div>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/pos" replace />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <MainLayout />
          </PrivateRoute>
        }
      >
        <Route index element={<Navigate to={user?.role === 'admin' ? '/dashboard' : '/pos'} replace />} />
        <Route path="dashboard" element={<PrivateRoute adminOnly><DashboardPage /></PrivateRoute>} />
        <Route path="pos" element={<POSPage />} />
        <Route path="sales" element={<PrivateRoute adminOnly><SalesPage /></PrivateRoute>} />
        <Route path="products" element={<PrivateRoute adminOnly><ProductsPage /></PrivateRoute>} />
        <Route path="categories" element={<PrivateRoute adminOnly><CategoriesPage /></PrivateRoute>} />
        <Route path="suppliers" element={<PrivateRoute adminOnly><SuppliersPage /></PrivateRoute>} />
        <Route path="reports" element={<PrivateRoute adminOnly><ReportsPage /></PrivateRoute>} />
        <Route path="customers" element={<PrivateRoute adminOnly><CustomersPage /></PrivateRoute>} />
        <Route path="users" element={<PrivateRoute adminOnly><UsersPage /></PrivateRoute>} />
        <Route path="settings" element={<PrivateRoute adminOnly><SettingsPage /></PrivateRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <SyncProvider>
            <AppRoutes />
          </SyncProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
