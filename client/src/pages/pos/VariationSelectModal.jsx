import React, { useState } from 'react';
import { X, ShoppingCart } from 'lucide-react';
import { formatCurrency } from '../../utils/helpers';

export default function VariationSelectModal({ product, onClose, onSelect }) {
  const [selectedVariantId, setSelectedVariantId] = useState(null);
  
  if (!product || !product.variations) return null;

  const handleConfirm = () => {
    if (!selectedVariantId) return;
    const variant = product.variations.find(v => v.id === selectedVariantId);
    if (variant) {
      onSelect(variant);
    }
  };

  return (
    <div className="overlay" onClick={onClose} style={{ zIndex: 1000 }}>
      <div 
        className="modal animate-scale-in" 
        onClick={e => e.stopPropagation()} 
        style={{ width: '100%', maxWidth: 480, padding: 0 }}
      >
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700 }}>Select Variation</h2>
            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 4 }}>{product.name}</p>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-icon" style={{ minWidth: 36, minHeight: 36, padding: 0 }}>
            <X size={18} />
          </button>
        </div>
        
        <div style={{ padding: 24 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {product.variations.map(v => (
              <label 
                key={v.id} 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  padding: 16, 
                  border: `2px solid ${selectedVariantId === v.id ? 'var(--color-accent)' : 'var(--color-border)'}`, 
                  borderRadius: 'var(--radius-md)', 
                  cursor: v.stock > 0 ? 'pointer' : 'not-allowed',
                  background: selectedVariantId === v.id ? 'var(--color-bg-secondary)' : 'var(--color-bg-primary)',
                  opacity: v.stock > 0 ? 1 : 0.5,
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <input 
                    type="radio" 
                    name="variant" 
                    checked={selectedVariantId === v.id}
                    onChange={() => v.stock > 0 && setSelectedVariantId(v.id)}
                    disabled={v.stock <= 0}
                    style={{ width: 18, height: 18, accentColor: 'var(--color-accent)' }}
                  />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>{v.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
                      Stock: {v.stock} • SKU: {v.sku || 'N/A'}
                    </div>
                  </div>
                </div>
                <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--color-text-primary)' }}>
                  {formatCurrency(v.price || product.price)}
                </div>
              </label>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
            <button className="btn btn-secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
            <button 
              className="btn btn-primary" 
              onClick={handleConfirm} 
              disabled={!selectedVariantId}
              style={{ flex: 1 }}
            >
              <ShoppingCart size={18} /> Add to Order
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
