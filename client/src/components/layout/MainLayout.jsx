import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function MainLayout() {
  return (
    <div style={{ display: 'flex', height: '100dvh', overflow: 'hidden' }}>
      {/* Spacer to always reserve 72px for the collapsed sidebar */}
      <div style={{ width: 72, flexShrink: 0 }}></div>
      
      {/* Absolute sidebar that overlays when expanded */}
      <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, zIndex: 100 }}>
        <Sidebar />
      </div>

      <main style={{
        flex: 1,
        overflow: 'auto',
        position: 'relative',
      }}>
        <Outlet />
      </main>
    </div>
  );
}
