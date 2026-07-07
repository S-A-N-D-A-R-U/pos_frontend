import { useState, useEffect, useCallback, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { v4 as uuidv4 } from 'uuid';
import db from '../../db/database';
import { useAuth } from '../../contexts/AuthContext';
import { useSync } from '../../contexts/SyncContext';
import { useToast } from '../../contexts/ToastContext';
import { formatCurrency, generateReceiptNumber } from '../../utils/helpers';
import PaymentModal from './PaymentModal';
import ReceiptModal from './ReceiptModal';
import NumPadModal from './NumPadModal';
import VariationSelectModal from './VariationSelectModal';
import {
  Search, X, Plus, Minus, Trash2, ShoppingCart, Pause, Play,
  RotateCcw, Grid3X3, List, Tag, Maximize, Minimize
} from 'lucide-react';

export default function POSPage() {
  const { user } = useAuth();
  const { pushToOutbox } = useSync();
  const toast = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [cart, setCart] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [showPayment, setShowPayment] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastSale, setLastSale] = useState(null);
  const [showNumPad, setShowNumPad] = useState(null);
  const [showVariationSelect, setShowVariationSelect] = useState(null);
  const [viewMode, setViewMode] = useState('grid');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isFullScreen, setIsFullScreen] = useState(false);

  const searchRef = useRef(null);
  const barcodeBuffer = useRef('');
  const barcodeTimeout = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        toast.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullScreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Fetch data from Dexie (offline-capable)
  const categories = useLiveQuery(() => db.categories.orderBy('order').toArray(), []);
  const allProducts = useLiveQuery(() => db.products.filter(p => p.isActive !== false).toArray(), []);
  const heldOrders = useLiveQuery(() => db.heldOrders.toArray(), []);
  const customers = useLiveQuery(() => db.customers.toArray(), []);

  const selectedCustomer = customers?.find(c => c.id === selectedCustomerId) || null;

  // Filter products
  const products = allProducts?.filter(p => {
    const matchCategory = selectedCategory === 'All' || p.category === selectedCategory;
    const q = searchQuery.toLowerCase();
    
    // Handle scanner prefixes (e.g. 'a' added before EAN13 barcode)
    const strippedQ = q.length > 5 && /^[a-z]/i.test(q) ? q.substring(1) : null;
    
    const matchSearch = !q ||
      p.name.toLowerCase().includes(q) ||
      p.sku?.toLowerCase().includes(q) ||
      p.barcode?.toLowerCase().includes(q) ||
      (strippedQ && (
        p.barcode?.toLowerCase() === strippedQ ||
        p.sku?.toLowerCase() === strippedQ
      ));
      
    return matchCategory && matchSearch;
  }) || [];

  // Cart operations
  const addToCart = useCallback((product, variant = null) => {
    if (product.variations && product.variations.length > 0 && !variant) {
      setShowVariationSelect(product);
      return;
    }

    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id && item.variantId === (variant ? variant.id : null));
      const targetStock = variant ? variant.stock : product.stock;
      const price = variant && variant.price ? Number(variant.price) : product.price;
      const itemName = variant ? `${product.name} - ${variant.name}` : product.name;

      if (existing) {
        if (existing.qty >= targetStock) {
          toast.warning('Not enough stock');
          return prev;
        }
        return prev.map(item =>
          item.id === existing.id
            ? { ...item, qty: item.qty + 1, subtotal: (item.qty + 1) * item.price }
            : item
        );
      }
      return [...prev, {
        id: uuidv4(),
        productId: product.id,
        variantId: variant ? variant.id : null,
        productName: itemName,
        price: price,
        qty: 1,
        subtotal: price,
        unit: product.unit,
        stock: targetStock,
      }];
    });
  }, [toast]);

  const handleBarcodeScanned = useCallback((barcode) => {
    let product = null;
    let matchedVariant = null;

    const findMatch = (bcode) => {
      for (const p of allProducts || []) {
        if (p.barcode === bcode || p.sku === bcode || (p.id && p.id.substring(0, 8).toUpperCase() === bcode)) {
          product = p;
          return;
        }
        if (p.variations) {
          const v = p.variations.find(v => v.barcode === bcode || v.sku === bcode);
          if (v) {
            product = p;
            matchedVariant = v;
            return;
          }
        }
      }
    };

    findMatch(barcode);

    // Some scanners add a prefix letter (like 'a' for EAN-13) before the actual barcode.
    if (!product && /^[a-zA-Z]/.test(barcode)) {
      findMatch(barcode.substring(1));
    }

    if (product) {
      addToCart(product, matchedVariant);
      toast.success(`Scanned: ${matchedVariant ? matchedVariant.name : product.name}`);
    } else {
      toast.warning(`No product found for barcode: ${barcode}`);
    }
  }, [allProducts, addToCart, toast]);

  // Barcode scanner listener (detects rapid keystrokes)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.key === 'Enter' && barcodeBuffer.current.length >= 5) {
        const barcode = barcodeBuffer.current;
        barcodeBuffer.current = '';
        handleBarcodeScanned(barcode);
        return;
      }

      if (e.key.length === 1) {
        barcodeBuffer.current += e.key;
        clearTimeout(barcodeTimeout.current);
        barcodeTimeout.current = setTimeout(() => {
          barcodeBuffer.current = '';
        }, 100); // Reset if gap between keystrokes > 100ms
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleBarcodeScanned]);

  const updateQty = useCallback((itemId, newQty) => {
    if (newQty <= 0) {
      setCart(prev => prev.filter(item => item.id !== itemId));
      return;
    }
    setCart(prev => prev.map(item =>
      item.id === itemId
        ? { ...item, qty: newQty, subtotal: newQty * item.price }
        : item
    ));
  }, []);

  const removeFromCart = useCallback((itemId) => {
    setCart(prev => prev.filter(item => item.id !== itemId));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  // Hold order
  const holdOrder = useCallback(async () => {
    if (cart.length === 0) return;
    const order = {
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      cashierId: user?.id,
      label: `Order #${(heldOrders?.length || 0) + 1}`,
      items: cart,
    };
    await db.heldOrders.put(order);
    setCart([]);
    toast.info('Order held');
  }, [cart, user, heldOrders, toast]);

  // Resume held order
  const resumeOrder = useCallback(async (orderId) => {
    const order = await db.heldOrders.get(orderId);
    if (order) {
      if (cart.length > 0) {
        // Hold current cart first
        await holdOrder();
      }
      setCart(order.items);
      await db.heldOrders.delete(orderId);
      toast.info('Order resumed');
    }
  }, [cart, holdOrder, toast]);

  // Complete sale
  const completeSale = useCallback(async (paymentMethod, amountPaid) => {
    const saleId = uuidv4();
    const receiptNumber = generateReceiptNumber();
    const total = cart.reduce((sum, item) => sum + item.subtotal, 0);
    const change = amountPaid - total;

    const sale = {
      id: saleId,
      receiptNumber,
      createdAt: new Date().toISOString(),
      cashierId: user?.id,
      cashierName: user?.name,
      items: cart,
      subtotal: total,
      taxRate: 0,
      taxAmount: 0,
      total,
      paymentMethod,
      amountPaid,
      change: Math.max(0, change),
      customerId: selectedCustomer?.id || null,
      customerName: selectedCustomer?.name || null,
      balanceDue: Math.max(0, total - amountPaid),
      paymentStatus: amountPaid >= total ? 'paid' : (amountPaid > 0 ? 'partial' : 'unpaid'),
      status: 'completed',
      syncStatus: 'pending',
    };

    // Save sale
    await db.sales.put(sale);

    // Save sale items
    const saleItems = cart.map(item => ({
      id: uuidv4(),
      saleId,
      productId: item.productId,
      variantId: item.variantId,
      productName: item.productName,
      price: item.price,
      qty: item.qty,
      subtotal: item.subtotal,
    }));
    await db.saleItems.bulkPut(saleItems);

    // Update product stock
    for (const item of cart) {
      await db.products.where('id').equals(item.productId).modify(p => {
        if (item.variantId && p.variations) {
          const v = p.variations.find(v => v.id === item.variantId);
          if (v) {
            v.stock = Math.max(0, (v.stock || 0) - item.qty);
          }
        } else {
          p.stock = Math.max(0, (p.stock || 0) - item.qty);
        }
        p.updatedAt = new Date().toISOString();
      });
    }

    // Queue for sync
    await pushToOutbox('sale', saleId, 'create', sale);

    setLastSale(sale);
    setCart([]);
    setSelectedCustomerId('');
    setShowPayment(false);
    setShowReceipt(true);
    toast.success('Sale completed!');
  }, [cart, user, pushToOutbox, toast, selectedCustomer]);

  // Calculations
  const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const taxAmount = 0;
  const total = subtotal + taxAmount;
  const itemCount = cart.reduce((sum, item) => sum + item.qty, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: 'var(--color-bg-primary)' }}>
      {/* Top Header */}
      <div style={{
        height: 48,
        background: 'var(--color-bg-secondary)',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        flexShrink: 0
      }}>
         <div style={{ fontWeight: 600, color: 'var(--color-text-secondary)', fontSize: 14 }}>
           {currentTime.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
           &nbsp; • &nbsp;
           <span style={{ color: 'var(--color-text-primary)' }}>
             {currentTime.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
           </span>
         </div>
         <button 
           className="btn btn-ghost btn-icon" 
           onClick={toggleFullScreen}
           title="Toggle Full Screen"
           style={{ color: 'var(--color-text-secondary)' }}
         >
           {isFullScreen ? <Minimize size={18} /> : <Maximize size={18} />}
         </button>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* LEFT: Product Grid */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Search Bar */}
        <div style={{
          padding: '16px 20px',
          background: 'var(--color-bg-secondary)',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          gap: 12,
          alignItems: 'center',
        }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={18} style={{
              position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
              color: 'var(--color-text-muted)',
            }} />
            <input
              ref={searchRef}
              id="pos-search"
              className="input"
              type="text"
              placeholder="Search products, SKU or scan barcode..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ paddingLeft: 42, paddingRight: searchQuery ? 36 : 14 }}
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(''); searchRef.current?.focus(); }}
                style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                  color: 'var(--color-text-muted)', display: 'flex',
                }}
              >
                <X size={16} />
              </button>
            )}
          </div>
          <button
            className={`btn btn-icon ${viewMode === 'grid' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setViewMode('grid')}
            title="Grid view"
          >
            <Grid3X3 size={18} />
          </button>
          <button
            className={`btn btn-icon ${viewMode === 'list' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setViewMode('list')}
            title="List view"
          >
            <List size={18} />
          </button>
        </div>

        {/* Category Tabs */}
        <div style={{
          padding: '10px 20px',
          background: 'var(--color-bg-secondary)',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          gap: 6,
          overflowX: 'auto',
          flexShrink: 0,
        }}>
          <button
            className={`btn ${selectedCategory === 'All' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setSelectedCategory('All')}
            style={{ fontSize: 13, padding: '8px 16px', minHeight: 38, borderRadius: 'var(--radius-full)' }}
          >
            All
          </button>
          {categories?.map(cat => (
            <button
              key={cat.id}
              className={`btn ${selectedCategory === cat.name ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setSelectedCategory(cat.name)}
              style={{
                fontSize: 13,
                padding: '8px 16px',
                minHeight: 38,
                borderRadius: 'var(--radius-full)',
                whiteSpace: 'nowrap',
              }}
            >
              <span>{cat.icon}</span> {cat.name}
            </button>
          ))}
        </div>

        {/* Product Grid */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: 20,
        }}>
          {viewMode === 'grid' ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
              gap: 12,
            }}>
              {products.map(product => (
                <button
                  key={product.id}
                  className="card card-interactive"
                  onClick={() => addToCart(product)}
                  style={{
                    padding: 16,
                    cursor: 'pointer',
                    textAlign: 'left',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-bg-card)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    minHeight: 120,
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  {product.stock <= 5 && (
                    <span className="badge badge-danger" style={{
                      position: 'absolute', top: 8, right: 8, fontSize: 10, padding: '2px 6px', zIndex: 2
                    }}>
                      Low
                    </span>
                  )}
                  {product.image && (
                    <div style={{ margin: '-16px -16px 8px -16px', height: 120, borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg-secondary)' }}>
                      <img src={product.image} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  )}
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', lineHeight: 1.3 }}>
                    {product.name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                    {product.sku} · {product.stock} {product.unit}
                  </div>
                  <div style={{
                    marginTop: 'auto',
                    fontSize: 16,
                    fontWeight: 700,
                    color: 'var(--color-accent)',
                  }}>
                    {formatCurrency(product.price)}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {products.map(product => (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    padding: '12px 16px',
                    background: 'var(--color-bg-card)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    width: '100%',
                    transition: 'all 0.15s',
                  }}
                  className="card-interactive"
                >
                  {product.image && (
                    <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-sm)', overflow: 'hidden', flexShrink: 0, border: '1px solid var(--color-border)' }}>
                      <img src={product.image} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{product.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                      {product.sku} · {product.stock} {product.unit} in stock
                    </div>
                  </div>
                  {product.stock <= 5 && <span className="badge badge-danger" style={{ fontSize: 10 }}>Low</span>}
                  <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-accent)', minWidth: 100, textAlign: 'right' }}>
                    {formatCurrency(product.price)}
                  </div>
                  <Plus size={18} style={{ color: 'var(--color-text-muted)' }} />
                </button>
              ))}
            </div>
          )}

          {products.length === 0 && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 60,
              color: 'var(--color-text-muted)',
            }}>
              <Tag size={48} style={{ marginBottom: 16, opacity: 0.3 }} />
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>No products found</div>
              <div style={{ fontSize: 13 }}>Try a different search or category</div>
            </div>
          )}
        </div>

        {/* Held Orders Bar */}
        {heldOrders?.length > 0 && (
          <div style={{
            padding: '10px 20px',
            background: 'var(--color-warning-light)',
            borderTop: '1px solid var(--color-border)',
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            overflowX: 'auto',
          }}>
            <Pause size={16} style={{ color: 'var(--color-warning)', flexShrink: 0 }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: '#92400e', flexShrink: 0 }}>Held:</span>
            {heldOrders.map(order => (
              <button
                key={order.id}
                onClick={() => resumeOrder(order.id)}
                className="btn btn-secondary"
                style={{ fontSize: 12, padding: '6px 12px', minHeight: 32 }}
              >
                <Play size={12} /> {order.label} ({order.items.length} items)
              </button>
            ))}
          </div>
        )}
      </div>

      {/* RIGHT: Cart / Order Panel */}
      <div style={{
        width: 380,
        background: 'var(--color-bg-secondary)',
        borderLeft: '1px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
      }}>
        {/* Customer Selector */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)' }}>
          <select 
             className="input" 
             value={selectedCustomerId} 
             onChange={e => setSelectedCustomerId(e.target.value)}
             style={{ width: '100%', fontWeight: 600 }}
          >
             <option value="">Walk-in Customer</option>
             {customers?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {/* Cart Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ShoppingCart size={20} style={{ color: 'var(--color-accent)' }} />
            <h2 style={{ fontSize: 16, fontWeight: 700 }}>Current Order</h2>
            {itemCount > 0 && (
              <span className="badge badge-info" style={{ fontSize: 11 }}>{itemCount}</span>
            )}
          </div>
          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="btn btn-ghost"
              style={{ padding: '6px 10px', minHeight: 32, fontSize: 12, color: 'var(--color-danger)' }}
            >
              <RotateCcw size={14} /> Clear
            </button>
          )}
        </div>

        {/* Cart Items */}
        <div style={{ flex: 1, overflow: 'auto', padding: '8px 0' }}>
          {cart.length === 0 ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: 'var(--color-text-muted)',
              padding: 40,
            }}>
              <ShoppingCart size={48} style={{ marginBottom: 16, opacity: 0.2 }} />
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Cart is empty</div>
              <div style={{ fontSize: 13, textAlign: 'center' }}>
                Tap products or scan barcodes to add items
              </div>
            </div>
          ) : (
            cart.map((item, idx) => (
              <div
                key={item.id}
                className="animate-fade-in"
                style={{
                  padding: '12px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  borderBottom: idx < cart.length - 1 ? '1px solid var(--color-border)' : 'none',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.productName}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                    {formatCurrency(item.price)} × {item.qty}
                  </div>
                </div>

                {/* Qty Controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <button
                    onClick={() => updateQty(item.id, item.qty - 1)}
                    className="btn btn-ghost btn-icon"
                    style={{ width: 32, height: 32, minWidth: 32, minHeight: 32, padding: 0, borderRadius: 'var(--radius-sm)' }}
                  >
                    <Minus size={14} />
                  </button>
                  <button
                    onClick={() => setShowNumPad(item)}
                    style={{
                      width: 40,
                      height: 32,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: 14,
                      background: 'var(--color-bg-primary)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    {item.qty}
                  </button>
                  <button
                    onClick={() => updateQty(item.id, item.qty + 1)}
                    className="btn btn-ghost btn-icon"
                    style={{ width: 32, height: 32, minWidth: 32, minHeight: 32, padding: 0, borderRadius: 'var(--radius-sm)' }}
                  >
                    <Plus size={14} />
                  </button>
                </div>

                {/* Subtotal */}
                <div style={{ fontWeight: 700, fontSize: 13, minWidth: 80, textAlign: 'right', color: 'var(--color-text-primary)' }}>
                  {formatCurrency(item.subtotal)}
                </div>

                {/* Remove */}
                <button
                  onClick={() => removeFromCart(item.id)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                    color: 'var(--color-text-muted)', display: 'flex',
                    transition: 'color 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--color-danger)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-muted)'}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Cart Summary & Actions */}
        <div style={{
          borderTop: '1px solid var(--color-border)',
          padding: '16px 20px',
          background: 'var(--color-bg-secondary)',
        }}>
          {/* Totals */}
          <div style={{ marginBottom: 16 }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--color-text-secondary)',
              marginBottom: 6,
            }}>
              <span>Subtotal ({itemCount} items)</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div style={{
              display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--color-text-secondary)',
              marginBottom: 12,
            }}>
              <span>Tax (0%)</span>
              <span>{formatCurrency(taxAmount)}</span>
            </div>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              fontSize: 22, fontWeight: 800, color: 'var(--color-text-primary)',
              paddingTop: 12,
              borderTop: '2px solid var(--color-border)',
            }}>
              <span>Total</span>
              <span style={{ color: 'var(--color-accent)' }}>{formatCurrency(total)}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn btn-secondary"
              onClick={holdOrder}
              disabled={cart.length === 0}
              style={{ flex: 1, minHeight: 48 }}
            >
              <Pause size={16} /> Hold
            </button>
            <button
              id="pos-pay-btn"
              className="btn btn-success btn-lg"
              onClick={() => setShowPayment(true)}
              disabled={cart.length === 0}
              style={{ flex: 2, minHeight: 48, fontSize: 16 }}
            >
              <ShoppingCart size={18} /> Pay {formatCurrency(total)}
            </button>
          </div>
        </div>
      </div>

      </div>

      {/* Modals */}
      {showVariationSelect && (
        <VariationSelectModal
          product={showVariationSelect}
          onClose={() => setShowVariationSelect(null)}
          onSelect={(variant) => {
            addToCart(showVariationSelect, variant);
            setShowVariationSelect(null);
          }}
        />
      )}
      {showPayment && (
        <PaymentModal
          total={total}
          selectedCustomer={selectedCustomer}
          onComplete={completeSale}
          onClose={() => setShowPayment(false)}
        />
      )}
      {showReceipt && lastSale && (
        <ReceiptModal
          sale={lastSale}
          onClose={() => setShowReceipt(false)}
        />
      )}
      {showNumPad && (
        <NumPadModal
          item={showNumPad}
          onConfirm={(qty) => { updateQty(showNumPad.id, qty); setShowNumPad(null); }}
          onClose={() => setShowNumPad(null)}
        />
      )}
    </div>
  );
}
