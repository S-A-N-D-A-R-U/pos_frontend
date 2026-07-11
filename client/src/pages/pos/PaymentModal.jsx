import { useState, useEffect, useCallback } from 'react';
import { formatCurrency, calculateChange } from '../../utils/helpers';
import { X, CreditCard, Banknote, Check } from 'lucide-react';

export default function PaymentModal({ total, onComplete, onClose, selectedCustomer }) {
  const [method, setMethod] = useState('cash');
  const [amountPaid, setAmountPaid] = useState('');

  const paid = parseFloat(amountPaid) || 0;
  const change = calculateChange(total, paid);
  const balanceDue = Math.max(0, total - paid);
  
  // If registered customer, they can leave a balance due (pay partial or 0)
  const canComplete = method === 'card' || (selectedCustomer ? true : paid >= total);

  const quickAmounts = [
    Math.ceil(total / 100) * 100,
    Math.ceil(total / 500) * 500,
    Math.ceil(total / 1000) * 1000,
    Math.ceil(total / 5000) * 5000,
  ].filter((v, i, a) => a.indexOf(v) === i && v >= total).slice(0, 4);

  const handleComplete = useCallback((printReceipt) => {
    if (canComplete) {
      let finalMethod = method;
      if (selectedCustomer && method === 'cash') {
        if (paid === 0) finalMethod = 'credit';
        else if (paid < total) finalMethod = 'mixed';
      }
      onComplete(finalMethod, method === 'card' ? total : paid, printReceipt);
    }
  }, [canComplete, method, paid, total, selectedCustomer, onComplete]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const printReceipt = !e.shiftKey;
        if (canComplete) {
          handleComplete(printReceipt);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canComplete, handleComplete, onClose]);

  const handleNumPad = (val) => {
    if (val === 'C') {
      setAmountPaid('');
    } else if (val === '⌫') {
      setAmountPaid(prev => prev.slice(0, -1));
    } else if (val === '.') {
      if (!amountPaid.includes('.')) setAmountPaid(prev => prev + '.');
    } else {
      setAmountPaid(prev => prev + val);
    }
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div
        className="modal animate-scale-in"
        onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 700, padding: 0 }}
      >
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--color-bg-primary)',
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>Payment</h2>
          <button onClick={onClose} className="btn btn-ghost btn-icon" style={{ minWidth: 36, minHeight: 36, padding: 0 }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '12px 20px' }}>
        {/* Total */}
        <div style={{
          textAlign: 'center',
          marginBottom: 12,
        }}>
          <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 2 }}>Total Amount</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--color-accent)' }}>
            {formatCurrency(total)}
          </div>
        </div>

        {/* Payment Method */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <button
            onClick={() => setMethod('cash')}
            style={{
              flex: 1,
              padding: '10px 16px',
              borderRadius: 'var(--radius-md)',
              border: `2px solid ${method === 'cash' ? 'var(--color-accent)' : 'var(--color-border)'}`,
              background: method === 'cash' ? 'var(--color-accent-light)' : 'var(--color-bg-primary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              fontWeight: 600,
              fontSize: 14,
              color: method === 'cash' ? 'var(--color-accent)' : 'var(--color-text-secondary)',
            }}
          >
            <Banknote size={18} /> Cash
          </button>
          <button
            onClick={() => setMethod('card')}
            style={{
              flex: 1,
              padding: '10px 16px',
              borderRadius: 'var(--radius-md)',
              border: `2px solid ${method === 'card' ? 'var(--color-accent)' : 'var(--color-border)'}`,
              background: method === 'card' ? 'var(--color-accent-light)' : 'var(--color-bg-primary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              fontWeight: 600,
              fontSize: 14,
              color: method === 'card' ? 'var(--color-accent)' : 'var(--color-text-secondary)',
            }}
          >
            <CreditCard size={18} /> Card
          </button>
        </div>

        {method === 'cash' && (
          <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
            {/* Left Side: NumPad */}
            <div style={{ flex: '0 0 280px' }}>
              <div className="numpad-grid" style={{ gap: 6 }}>
                {['1','2','3','4','5','6','7','8','9','.','0','⌫'].map(key => (
                  <button
                    key={key}
                    className="numpad-btn"
                    onClick={() => handleNumPad(key)}
                    style={{ minHeight: 48, fontSize: 18 }}
                  >
                    {key}
                  </button>
                ))}
              </div>
            </div>

            {/* Right Side: Inputs and Info */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Quick Amount Buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
                {quickAmounts.map(amt => (
                  <button
                    key={amt}
                    onClick={() => setAmountPaid(String(amt))}
                    className="btn btn-secondary"
                    style={{
                      fontSize: 13,
                      padding: '8px',
                      minHeight: 40,
                      fontWeight: 600,
                      background: paid === amt ? 'var(--color-accent-light)' : undefined,
                      borderColor: paid === amt ? 'var(--color-accent)' : undefined,
                      color: paid === amt ? 'var(--color-accent)' : undefined,
                    }}
                  >
                    {formatCurrency(amt).replace('Rs. ', '')}
                  </button>
                ))}
              </div>

              {/* Amount Input */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>
                  Amount Received
                </label>
                <input
                  className="input input-lg"
                  type="text"
                  inputMode="decimal"
                  value={amountPaid}
                  onChange={e => setAmountPaid(e.target.value.replace(/[^0-9.]/g, ''))}
                  placeholder="0.00"
                  style={{ fontSize: 24, fontWeight: 700, textAlign: 'center', height: 48, minHeight: 48 }}
                  autoFocus
                />
              </div>

              {/* Change or Balance Due Display */}
              {paid > total ? (
                <div className="animate-fade-in" style={{
                  padding: 12,
                  background: 'var(--color-success-light)',
                  borderRadius: 'var(--radius-md)',
                  textAlign: 'center',
                  border: '1px solid rgba(16,185,129,0.2)',
                }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#065f46', marginBottom: 2 }}>Change</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-success)' }}>
                    {formatCurrency(change)}
                  </div>
                </div>
              ) : paid < total && selectedCustomer ? (
                <div className="animate-fade-in" style={{
                  padding: 12,
                  background: 'var(--color-warning-light)',
                  borderRadius: 'var(--radius-md)',
                  textAlign: 'center',
                  border: '1px solid rgba(245,158,11,0.2)',
                }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#92400e', marginBottom: 2 }}>Balance Due (Credit)</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-warning)' }}>
                    {formatCurrency(balanceDue)}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}

        {method === 'card' && (
          <div style={{
            padding: 24,
            background: 'var(--color-bg-primary)',
            borderRadius: 'var(--radius-lg)',
            textAlign: 'center',
            marginBottom: 16,
            border: '1px solid var(--color-border)',
          }}>
            <CreditCard size={40} style={{ color: 'var(--color-accent)', margin: '0 auto 12px' }} />
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Card Payment</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
              Process card payment on your terminal
            </div>
          </div>
        )}
        </div>

        {/* Footer / Complete Buttons */}
        <div style={{
          padding: '12px 20px',
          borderTop: '1px solid var(--color-border)',
          background: 'var(--color-bg-primary)',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          borderBottomLeftRadius: 'var(--radius-xl)',
          borderBottomRightRadius: 'var(--radius-xl)',
        }}>
          <button
            className="btn btn-success"
            onClick={() => handleComplete(true)}
            disabled={!canComplete}
            style={{
              width: '100%',
              minHeight: 48,
              fontSize: 15,
              opacity: canComplete ? 1 : 0.5,
            }}
          >
            <Check size={18} />
            Complete & Print Receipt
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => handleComplete(false)}
            disabled={!canComplete}
            style={{
              width: '100%',
              minHeight: 44,
              fontSize: 14,
              opacity: canComplete ? 1 : 0.5,
            }}
          >
            Complete (No Receipt)
          </button>
        </div>
      </div>
    </div>
  );
}
