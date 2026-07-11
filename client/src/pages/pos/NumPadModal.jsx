import { useState, useEffect, useCallback } from 'react';
import { X, Delete, Calculator, AlertTriangle } from 'lucide-react';

export default function NumPadModal({ item, onConfirm, onClose }) {
  const [value, setValue] = useState(String(item.qty > 0 ? item.qty : ''));
  const [error, setError] = useState('');

  const safeEvaluate = (expression, baseUnit) => {
    if (!expression) return 0;
    
    let parsed = expression.toLowerCase();
    const bUnit = (baseUnit || '').toLowerCase();
    
    // Unit conversions
    if (bUnit === 'm' || bUnit === 'meter') {
      parsed = parsed.replace(/cm/g, '*0.01').replace(/mm/g, '*0.001').replace(/ft|feet/g, '*0.3048').replace(/in|inches|inch/g, '*0.0254').replace(/yard|yd/g, '*0.9144');
    } else if (bUnit === 'feet' || bUnit === 'ft') {
      parsed = parsed.replace(/in|inches|inch/g, '/12').replace(/m|meter/g, '*3.28084').replace(/cm/g, '/30.48');
    } else if (bUnit === 'inches' || bUnit === 'in') {
      parsed = parsed.replace(/ft|feet/g, '*12').replace(/m|meter/g, '*39.3701').replace(/cm/g, '/2.54');
    } else if (bUnit === 'kg') {
      parsed = parsed.replace(/g|gram|grams/g, '*0.001').replace(/mg/g, '*0.000001');
    } else if (bUnit === 'gram' || bUnit === 'g') {
      parsed = parsed.replace(/kg/g, '*1000').replace(/mg/g, '*0.001');
    } else if (bUnit === 'sqft') {
      parsed = parsed.replace(/sqin/g, '/144').replace(/sqm/g, '*10.7639');
    }

    // Strip unsafe chars, keep math
    parsed = parsed.replace(/[^0-9+\-*/.() ]/g, '');
    
    try {
      const result = new Function('return ' + parsed)();
      if (!isFinite(result) || isNaN(result)) return null;
      return Math.round(result * 10000) / 10000;
    } catch (e) {
      return null;
    }
  };

  const handleKey = useCallback((key) => {
    setError('');
    if (key === 'C') {
      setValue('');
    } else if (key === '⌫' || key === 'Backspace') {
      setValue(prev => prev.slice(0, -1));
    } else {
      setValue(prev => prev + key);
    }
  }, []);

  const handleConfirm = useCallback(() => {
    const qty = safeEvaluate(value, item.unit);
    if (qty === null) {
      setError('Invalid calculation');
      return;
    }
    if (qty > item.stock) {
      setError(`Cannot exceed available stock (${item.stock} ${item.unit})`);
      return;
    }
    if (qty >= 0) {
      onConfirm(qty);
    }
  }, [value, item, onConfirm]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        handleConfirm();
        return;
      }
      if (e.key === 'Backspace') {
        handleKey('⌫');
        return;
      }
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (/[0-9+\-*/.() a-zA-Z]/.test(e.key)) {
          handleKey(e.key);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleConfirm, handleKey, onClose]);

  const getUnitButtons = (unit) => {
    const u = (unit || '').toLowerCase();
    if (u === 'm' || u === 'meter') return ['ft', 'in', 'cm'];
    if (u === 'feet' || u === 'ft') return ['in', 'cm', 'm'];
    if (u === 'kg') return ['g'];
    if (u === 'gram' || u === 'g') return ['kg'];
    return [];
  };
  const unitButtons = getUnitButtons(item.unit);

  return (
    <div className="overlay" onClick={onClose}>
      <div
        className="modal animate-scale-in"
        onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 320, padding: 0 }}
      >
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700 }}>Set Quantity</h3>
            <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>{item.productName}</p>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-icon" style={{ minWidth: 36, minHeight: 36, padding: 0 }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: 20 }}>
          {/* Display */}
          <div style={{
            padding: '16px 20px',
            background: 'var(--color-bg-primary)',
            borderRadius: 'var(--radius-lg)',
            border: `1px solid ${error ? 'var(--color-danger)' : 'var(--color-border)'}`,
            textAlign: 'right',
            marginBottom: 16,
            minHeight: 80,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center'
          }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: value ? 'var(--color-text-primary)' : 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {value || '0'}
            </div>
            {error ? (
              <div style={{ fontSize: 12, color: 'var(--color-danger)', marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                <AlertTriangle size={12} /> {error}
              </div>
            ) : (
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>
                Available: {item.stock} {item.unit}
              </div>
            )}
          </div>

          {/* NumPad */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: unitButtons.length ? 12 : 16 }}>
            {['7','8','9','/','4','5','6','*','1','2','3','-','C','0','.','+','(',')','⌫'].map((key, idx) => (
              <button
                key={idx}
                className="numpad-btn"
                onClick={() => handleKey(key)}
                style={{
                  minHeight: 44,
                  fontSize: ['/','*','-','+','(',')'].includes(key) ? 20 : 18,
                  fontWeight: ['/','*','-','+'].includes(key) ? 400 : 600,
                  background: ['/','*','-','+'].includes(key) ? 'var(--color-bg-secondary)' : undefined,
                  color: key === 'C' ? 'var(--color-danger)' : ['/','*','-','+'].includes(key) ? 'var(--color-accent)' : undefined,
                  gridColumn: key === '⌫' ? 'span 2' : undefined,
                }}
              >
                {key === '⌫' ? <Delete size={20} /> : key}
              </button>
            ))}
          </div>

          {unitButtons.length > 0 && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {unitButtons.map(u => (
                <button
                  key={u}
                  className="btn btn-secondary"
                  style={{ flex: 1, padding: '8px 0', fontSize: 13, fontWeight: 600 }}
                  onClick={() => handleKey(` ${u} `)}
                >
                  +{u}
                </button>
              ))}
            </div>
          )}

          {/* Confirm */}
          <button
            className="btn btn-primary btn-lg"
            onClick={handleConfirm}
            style={{ width: '100%' }}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
