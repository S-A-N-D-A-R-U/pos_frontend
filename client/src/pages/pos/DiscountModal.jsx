import { useState, useEffect, useRef } from 'react';
import { X, Percent, DollarSign } from 'lucide-react';

export default function DiscountModal({ item, onClose, onApply }) {
  const [discountType, setDiscountType] = useState(item?.discountType || 'percentage');
  const [discountValue, setDiscountValue] = useState(item?.discountValue ? String(item.discountValue) : '');
  const inputRef = useRef(null);

  useEffect(() => {
    // Focus input on mount
    setTimeout(() => {
      if (inputRef.current) inputRef.current.focus();
    }, 100);
  }, []);

  const handleApply = (e) => {
    e.preventDefault();
    const val = parseFloat(discountValue) || 0;
    if (val < 0) return;
    
    // Validate bounds
    if (discountType === 'percentage' && val > 100) {
      alert("Percentage cannot exceed 100%");
      return;
    }
    
    if (discountType === 'fixed' && val > (item.price * item.qty)) {
      alert("Discount cannot exceed item total price");
      return;
    }

    onApply(item.id, discountType, val);
  };

  const handleClear = () => {
    onApply(item.id, 'percentage', 0);
  };

  if (!item) return null;

  const itemTotal = item.price * item.qty;
  const val = parseFloat(discountValue) || 0;
  const currentDiscountAmount = discountType === 'percentage' 
    ? itemTotal * (val / 100) 
    : val;
  const finalPrice = Math.max(0, itemTotal - currentDiscountAmount);

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20
    }}>
      <div 
        className="card animate-scale-up" 
        style={{ width: '100%', maxWidth: 400, padding: 0, overflow: 'hidden' }}
      >
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--color-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'var(--color-bg-secondary)'
        }}>
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>Item Discount</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={20} /></button>
        </div>

        <form onSubmit={handleApply} style={{ padding: 20 }}>
          <div style={{ marginBottom: 16, fontSize: 14, fontWeight: 600 }}>
            {item.productName} (Qty: {item.qty})
          </div>

          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            <button
              type="button"
              className={`btn ${discountType === 'percentage' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ flex: 1 }}
              onClick={() => setDiscountType('percentage')}
            >
              <Percent size={16} /> Percentage
            </button>
            <button
              type="button"
              className={`btn ${discountType === 'fixed' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ flex: 1 }}
              onClick={() => setDiscountType('fixed')}
            >
              <DollarSign size={16} /> Fixed Amount
            </button>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 8 }}>
              Discount {discountType === 'percentage' ? 'Percentage (%)' : 'Amount'}
            </label>
            <input
              ref={inputRef}
              type="number"
              step="any"
              min="0"
              className="input"
              style={{ width: '100%', fontSize: 20, textAlign: 'center', padding: 12 }}
              value={discountValue}
              onChange={e => setDiscountValue(e.target.value)}
              placeholder="0"
            />
          </div>

          <div style={{ 
            background: 'var(--color-bg-secondary)', padding: 16, borderRadius: 'var(--radius-md)', 
            marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' 
          }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-secondary)' }}>New Subtotal:</span>
            <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-accent)' }}>
              {finalPrice.toFixed(2)}
            </span>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button type="button" className="btn btn-danger" style={{ flex: 1 }} onClick={handleClear}>
              Remove Discount
            </button>
            <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>
              Apply Discount
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
