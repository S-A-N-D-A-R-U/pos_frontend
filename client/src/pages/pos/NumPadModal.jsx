import { useState } from 'react';
import { X, Delete } from 'lucide-react';

export default function NumPadModal({ item, onConfirm, onClose }) {
  const [value, setValue] = useState(String(item.qty));

  const handleKey = (key) => {
    if (key === 'C') {
      setValue('');
    } else if (key === '⌫') {
      setValue(prev => prev.slice(0, -1));
    } else {
      setValue(prev => {
        const newVal = prev + key;
        const num = parseInt(newVal);
        if (num > 9999) return prev;
        return newVal;
      });
    }
  };

  const handleConfirm = () => {
    const qty = parseInt(value) || 0;
    onConfirm(qty);
  };

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
            border: '1px solid var(--color-border)',
            textAlign: 'center',
            marginBottom: 16,
          }}>
            <div style={{ fontSize: 36, fontWeight: 800, color: value ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}>
              {value || '0'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>
              Max: {item.stock} {item.unit}
            </div>
          </div>

          {/* NumPad */}
          <div className="numpad-grid" style={{ marginBottom: 16 }}>
            {['1','2','3','4','5','6','7','8','9','C','0','⌫'].map(key => (
              <button
                key={key}
                className="numpad-btn"
                onClick={() => handleKey(key)}
                style={key === 'C' ? { color: 'var(--color-danger)', fontWeight: 700 } : key === '⌫' ? { fontSize: 18 } : {}}
              >
                {key === '⌫' ? <Delete size={20} /> : key}
              </button>
            ))}
          </div>

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
