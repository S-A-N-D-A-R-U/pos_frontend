import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Lock, User, Eye, EyeOff, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login, user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate(user.role === 'admin' ? '/dashboard' : '/pos', { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      toast.warning('Please enter username and password');
      return;
    }
    setIsLoading(true);
    const result = await login(username.trim(), password);
    setIsLoading(false);
    if (result.success) {
      toast.success('Welcome back!');
    } else {
      toast.error(result.error || 'Login failed');
    }
  };

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 50%, #1e40af 100%)',
      padding: 20,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background decoration */}
      <div style={{
        position: 'absolute',
        width: 500,
        height: 500,
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.05)',
        top: -200,
        right: -100,
      }} />
      <div style={{
        position: 'absolute',
        width: 300,
        height: 300,
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.03)',
        bottom: -100,
        left: -50,
      }} />

      <div className="animate-fade-in-up" style={{
        width: '100%',
        maxWidth: 420,
        position: 'relative',
        zIndex: 1,
      }}>
        {/* Logo / Branding */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            width: 64,
            height: 64,
            background: 'rgba(255,255,255,0.15)',
            backdropFilter: 'blur(12px)',
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            fontSize: 28,
            fontWeight: 800,
            color: 'white',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          }}>
            B
          </div>
          <h1 style={{ color: 'white', fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 6 }}>
            BuildPOS
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: 400 }}>
            Construction Hardware POS System
          </p>
        </div>

        {/* Login Card */}
        <div style={{
          background: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(20px)',
          borderRadius: 'var(--radius-xl)',
          padding: 36,
          boxShadow: '0 24px 48px rgba(0,0,0,0.2), 0 8px 16px rgba(0,0,0,0.1)',
        }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 4 }}>
            Welcome back
          </h2>
          <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: 28 }}>
            Sign in to your account to continue
          </p>

          <form onSubmit={handleSubmit}>
            {/* Username */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', display: 'block', marginBottom: 6 }}>
                Username
              </label>
              <div style={{ position: 'relative' }}>
                <User size={18} style={{
                  position: 'absolute',
                  left: 14,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--color-text-muted)',
                }} />
                <input
                  id="login-username"
                  className="input"
                  type="text"
                  placeholder="Enter username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  style={{ paddingLeft: 42 }}
                  autoComplete="username"
                  autoFocus
                />
              </div>
            </div>

            {/* Password */}
            <div style={{ marginBottom: 28 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', display: 'block', marginBottom: 6 }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{
                  position: 'absolute',
                  left: 14,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--color-text-muted)',
                }} />
                <input
                  id="login-password"
                  className="input"
                  type={showPass ? 'text' : 'password'}
                  placeholder="Enter password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={{ paddingLeft: 42, paddingRight: 42 }}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  style={{
                    position: 'absolute',
                    right: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--color-text-muted)',
                    padding: 4,
                    display: 'flex',
                  }}
                >
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              id="login-submit"
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={isLoading}
              style={{ width: '100%', fontSize: 15 }}
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Demo credentials hint */}
          <div style={{
            marginTop: 24,
            padding: 14,
            background: 'var(--color-accent-50)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-accent-light)',
          }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-accent)', marginBottom: 6 }}>
              Demo Credentials
            </p>
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
              <div><strong>Admin:</strong> admin / admin123</div>
              <div><strong>Cashier:</strong> cashier / cashier123</div>
            </div>
          </div>
        </div>

        {/* Offline indicator */}
        {!navigator.onLine && (
          <div style={{
            textAlign: 'center',
            marginTop: 16,
            padding: '10px 16px',
            background: 'rgba(245,158,11,0.2)',
            borderRadius: 'var(--radius-md)',
            color: '#fbbf24',
            fontSize: 13,
            fontWeight: 500,
          }}>
            ⚠️ You're offline — using cached login
          </div>
        )}
      </div>
    </div>
  );
}
