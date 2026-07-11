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
import DiscountModal from './DiscountModal';
import ZReportModal from './ZReportModal';
import {
  Search, X, Plus, Minus, Trash2, ShoppingCart, Pause, Play,
  RotateCcw, Grid3X3, List, Tag, Maximize, Minimize, Percent, FileText
} from 'lucide-react';

export default function POSPage() {
  const { user } = useAuth();
  const { pushToOutbox } = useSync();
  const toast = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [cart, setCart] = useState([]);
  const [cartDiscountType, setCartDiscountType] = useState('percentage');
  const [cartDiscountValue, setCartDiscountValue] = useState(0);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerInput, setCustomerInput] = useState('');
  const [showPayment, setShowPayment] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastSale, setLastSale] = useState(null);
  const [showNumPad, setShowNumPad] = useState(null);
  const [showDiscountModal, setShowDiscountModal] = useState(null);
  const [showZReport, setShowZReport] = useState(false);
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
  const products = (allProducts?.filter(p => {
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
  }) || []).map(p => {
    const cartQty = cart.filter(c => c.productId === p.id).reduce((sum, item) => sum + item.qty, 0);
    const liveStock = Math.round((p.stock - cartQty) * 10000) / 10000;
    return { ...p, stock: liveStock };
  });

  // Cart operations
  const addToCart = useCallback((product, variant = null) => {
    if (!product) return;
    
    if (product.variations?.length > 0 && !variant) {
      setShowVariationSelect(product);
      return;
    }

    const targetStock = variant ? variant.stock : product.stock;
    const price = variant && variant.price ? Number(variant.price) : product.price;
    const itemName = variant ? `${product.name} - ${variant.name}` : product.name;

    let targetItemId = null;
    let currentQty = 1;

    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id && item.variantId === (variant ? variant.id : null));

      if (existing) {
        targetItemId = existing.id;
        currentQty = existing.qty;
        if (existing.qty >= targetStock && !product.promptQuantity) {
          toast.warning('Not enough stock');
          return prev;
        }
        
        if (product.promptQuantity) {
          return prev;
        }

        const newQty = existing.qty + 1;
        const itemTotal = newQty * price;
        const discAmt = existing.discountType === 'percentage' ? itemTotal * ((existing.discountValue || 0) / 100) : (existing.discountValue || 0);

        return prev.map(item =>
          item.id === existing.id
            ? { ...item, qty: newQty, subtotal: Math.max(0, itemTotal - discAmt) }
            : item
        );
      }
      
      targetItemId = uuidv4();
      const newItem = {
        id: targetItemId,
        productId: product.id,
        variantId: variant ? variant.id : null,
        productName: itemName,
        price: price,
        qty: product.promptQuantity ? 0 : 1,
        discountType: 'percentage',
        discountValue: 0,
        subtotal: product.promptQuantity ? 0 : price,
        unit: product.unit,
        stock: targetStock,
      };
      
      currentQty = newItem.qty;
      return [...prev, newItem];
    });

    if (product.promptQuantity) {
      setTimeout(() => {
        setShowNumPad({
          id: targetItemId,
          productName: itemName,
          qty: currentQty,
          unit: product.unit,
          stock: targetStock
        });
      }, 0);
    }
  }, [toast]);

  const findMatch = (bcode) => {
    let match = null;
    let variant = null;
    
    for (const p of products) {
      if (p.barcode === bcode || p.sku === bcode || (p.id && p.id.substring(0, 8).toUpperCase() === bcode)) {
        match = p;
        break;
      }
      if (p.variations?.length) {
        const v = p.variations.find(v => v.barcode === bcode || v.sku === bcode);
        if (v) {
          match = p;
          variant = v;
          break;
        }
      }
    }
    
    if (match) {
      addToCart(match, variant);
      toast.success(`Scanned: ${variant ? variant.name : match.name}`);
    } else {
      toast.warning(`No product found for barcode: ${bcode}`);
    }
  };

  const handleBarcodeScanned = useCallback((barcode) => {
    if (/^[a-zA-Z]/.test(barcode)) {
      findMatch(barcode.substring(1));
    } else {
      findMatch(barcode);
    }
  }, [products, addToCart, toast]);

  const stateRefs = useRef({ cart, showPayment, showVariationSelect, showNumPad });
  useEffect(() => {
    stateRefs.current = { cart, showPayment, showVariationSelect, showNumPad };
  }, [cart, showPayment, showVariationSelect, showNumPad]);

  const handleBarcodeScannedRef = useRef(handleBarcodeScanned);
  useEffect(() => {
    handleBarcodeScannedRef.current = handleBarcodeScanned;
  }, [handleBarcodeScanned]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      const state = stateRefs.current;
      
      if (e.key === 'Escape') {
        if (state.showVariationSelect) {
          setShowVariationSelect(null);
          return;
        }
        if (state.showNumPad) {
          setShowNumPad(null);
          return;
        }
        if (state.showPayment) {
          setShowPayment(false);
          return;
        }
        if (state.cart.length > 0) {
          setCart([]);
          return;
        }
      }

      if (e.key === 'F2') {
        e.preventDefault();
        document.getElementById('pos-search')?.focus();
        return;
      }

      if ((e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') && e.key !== 'Enter') return;

      if (e.key === 'Enter') {
        if (barcodeBuffer.current.length >= 5) {
          const barcode = barcodeBuffer.current;
          barcodeBuffer.current = '';
          handleBarcodeScannedRef.current(barcode);
          return;
        } else if (!state.showPayment && !state.showVariationSelect && !state.showNumPad && state.cart.length > 0) {
          e.preventDefault(); 
          setShowPayment(true);
          return;
        }
      }

      if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          barcodeBuffer.current += e.key;
          clearTimeout(barcodeTimeout.current);
          barcodeTimeout.current = setTimeout(() => {
            barcodeBuffer.current = '';
          }, 100);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const updateQty = (id, newQty) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        if (newQty <= 0) return null;
        
        const p = allProducts.find(p => p.id === item.productId);
        if (p) {
          let stock = p.stock || 0;
          if (item.variantId && p.variations) {
            const v = p.variations.find(v => v.id === item.variantId);
            if (v) stock = v.stock || 0;
          }
          if (newQty > stock) {
            toast.error(`Cannot exceed available stock (${stock})`);
            return item; 
          }
        }
        const roundQty = Math.round(newQty * 10000) / 10000;
        const itemTotal = item.price * roundQty;
        const discAmt = item.discountType === 'percentage' ? itemTotal * ((item.discountValue || 0) / 100) : (item.discountValue || 0);

        return { ...item, qty: roundQty, subtotal: Math.max(0, itemTotal - discAmt) };
      }
      return item;
    }).filter(Boolean));
  };

  const applyItemDiscount = (id, type, val) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const itemTotal = item.price * item.qty;
        const discAmt = type === 'percentage' ? itemTotal * ((val || 0) / 100) : (val || 0);
        return { ...item, discountType: type, discountValue: val, subtotal: Math.max(0, itemTotal - discAmt) };
      }
      return item;
    }));
    setShowDiscountModal(null);
  };

  const removeFromCart = useCallback((itemId) => {
    setCart(prev => prev.filter(item => item.id !== itemId));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

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

  const resumeOrder = useCallback(async (orderId) => {
    const order = await db.heldOrders.get(orderId);
    if (order) {
      if (cart.length > 0) {
        await holdOrder();
      }
      setCart(order.items);
      await db.heldOrders.delete(orderId);
      toast.info('Order resumed');
    }
  }, [cart, holdOrder, toast]);

  const completeSale = useCallback(async (paymentMethod, amountPaid, printReceipt) => {
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
      discountType: cartDiscountType,
      discountValue: cartDiscountValue,
      discountAmount: globalDiscountAmount,
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

    await db.sales.put(sale);

    const saleItems = cart.map(item => ({
      id: uuidv4(),
      saleId,
      productId: item.productId,
      variantId: item.variantId,
      productName: item.productName,
      price: item.price,
      qty: item.qty,
      discountType: item.discountType,
      discountValue: item.discountValue,
      subtotal: item.subtotal,
    }));
    await db.saleItems.bulkPut(saleItems);

    for (const item of cart) {
      const p = await db.products.get(item.productId);
      if (p) {
        if (item.variantId && p.variations) {
          const v = p.variations.find(v => v.id === item.variantId);
          if (v) {
            v.stock = Math.max(0, (v.stock || 0) - item.qty);
          }
        } else {
          p.stock = Math.max(0, (p.stock || 0) - item.qty);
        }
        p.updatedAt = new Date().toISOString();
        p.syncStatus = 'pending';
        await db.products.put(p);
        await pushToOutbox('product', p.id, 'update', p);
      }
    }

    await pushToOutbox('sale', saleId, 'create', sale);

    setLastSale(sale);
    setCart([]);
    setCartDiscountType('percentage');
    setCartDiscountValue(0);
    setSelectedCustomerId('');
    setCustomerInput('');
    setShowPayment(false);
    if (printReceipt) {
      setShowReceipt(true);
    }
    toast.success('Sale completed!');
  }, [cart, user, pushToOutbox, toast, selectedCustomer, cartDiscountType, cartDiscountValue]);

  const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const globalDiscountAmount = cartDiscountType === 'percentage' 
    ? subtotal * (cartDiscountValue / 100) 
    : cartDiscountValue;
  const taxAmount = 0;
  const total = Math.max(0, subtotal - globalDiscountAmount) + taxAmount;
  const itemCount = cart.reduce((sum, item) => sum + item.qty, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: 'var(--color-bg-primary)' }}>
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
         <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
           <button 
             className="btn btn-secondary" 
             onClick={() => setShowZReport(true)}
             style={{ height: 32, padding: '0 12px', fontSize: 13, gap: 6 }}
           >
             <FileText size={14} /> End Shift
           </button>
           <button 
             className="btn btn-ghost btn-icon" 
             onClick={toggleFullScreen}
             title="Toggle Fullscreen"
           >
             {isFullScreen ? <Minimize size={18} /> : <Maximize size={18} />}
           </button>
         </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div style={{
          width: 110,
          background: 'var(--color-bg-secondary)',
          borderRight: '1px solid var(--color-border)',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          padding: '12px 8px',
          gap: 8,
          flexShrink: 0,
        }}>
          <button
            className={`btn ${selectedCategory === 'All' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setSelectedCategory('All')}
            style={{ 
              fontSize: 12, 
              padding: '12px 8px', 
              minHeight: 48, 
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              fontWeight: 600,
              whiteSpace: 'normal',
              wordWrap: 'break-word',
            }}
          >
            All
          </button>
          {categories?.map(cat => (
            <button
              key={cat.id}
              className={`btn ${selectedCategory === cat.name ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setSelectedCategory(cat.name)}
              style={{
                fontSize: 12, 
                padding: '12px 8px', 
                minHeight: 48, 
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                fontWeight: 600,
                lineHeight: 1.2,
                whiteSpace: 'normal',
                wordWrap: 'break-word',
              }}
            >
              {cat.name}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
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

      <div style={{
        width: 450,
        background: 'var(--color-bg-secondary)',
        borderLeft: '1px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
      }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)' }}>
          <input
            list="customers-list"
            className="input"
            placeholder="Walk-in Customer (Search...)"
            value={customerInput}
            onChange={e => {
              const val = e.target.value;
              setCustomerInput(val);
              const found = customers?.find(c => c.name === val || `${c.name} (${c.phone})` === val);
              if (found) {
                setSelectedCustomerId(found.id);
                setCustomerInput(found.name);
              } else {
                setSelectedCustomerId('');
              }
            }}
            onFocus={() => {
              if (customerInput === '') setCustomerInput('');
            }}
            style={{ width: '100%', fontWeight: 600 }}
          />
          <datalist id="customers-list">
            {customers?.map(c => <option key={c.id} value={`${c.name} (${c.phone})`} />)}
          </datalist>
        </div>

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
                  {item.discountValue > 0 && (
                    <div style={{ fontSize: 11, color: 'var(--color-danger)', fontWeight: 600, marginTop: 2 }}>
                      Disc: {item.discountType === 'percentage' ? `${item.discountValue}% off` : `${formatCurrency(item.discountValue)} off`}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <button
                    onClick={() => setShowDiscountModal(item)}
                    className="btn btn-ghost btn-icon"
                    title="Apply Discount"
                    style={{ width: 32, height: 32, minWidth: 32, minHeight: 32, padding: 0, borderRadius: 'var(--radius-sm)' }}
                  >
                    <Percent size={14} />
                  </button>
                  <div style={{ width: 1, height: 16, background: 'var(--color-border)', margin: '0 4px' }}></div>
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

                <div style={{ fontWeight: 700, fontSize: 13, minWidth: 80, textAlign: 'right', color: 'var(--color-text-primary)' }}>
                  {formatCurrency(item.subtotal)}
                </div>

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

        <div style={{
          borderTop: '1px solid var(--color-border)',
          padding: '10px 20px',
          background: 'var(--color-bg-secondary)',
        }}>
          <div style={{ marginBottom: 8 }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--color-text-secondary)',
              marginBottom: 4,
            }}>
              <span>Subtotal ({itemCount} items)</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            
            <div style={{
              display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--color-text-secondary)',
              marginBottom: 4, alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>Overall Discount</span>
                <button 
                  className="btn btn-ghost btn-icon" 
                  style={{ width: 24, height: 24, padding: 0 }}
                  onClick={() => setShowDiscountModal({
                    id: 'global',
                    productName: 'Entire Order',
                    qty: 1,
                    price: subtotal,
                    discountType: cartDiscountType,
                    discountValue: cartDiscountValue
                  })}
                >
                  <Percent size={12} />
                </button>
              </div>
              {cartDiscountValue > 0 ? (
                <span style={{ color: 'var(--color-danger)' }}>
                  -{formatCurrency(globalDiscountAmount)}
                  {cartDiscountType === 'percentage' && ` (${cartDiscountValue}%)`}
                </span>
              ) : (
                <span>Rs. 0.00</span>
              )}
            </div>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              fontSize: 22, fontWeight: 800, color: 'var(--color-text-primary)',
              paddingTop: 8,
              borderTop: '2px solid var(--color-border)',
            }}>
              <span>Total</span>
              <span style={{ color: 'var(--color-accent)' }}>{formatCurrency(total)}</span>
            </div>
          </div>

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

      {showPayment && (
        <PaymentModal
          total={total}
          selectedCustomer={selectedCustomer}
          onComplete={completeSale}
          onClose={() => setShowPayment(false)}
        />
      )}
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

      {showReceipt && lastSale && (
        <ReceiptModal
          sale={lastSale}
          onClose={() => setShowReceipt(false)}
        />
      )}
      {showNumPad && (
        <NumPadModal
          item={showNumPad}
          onClose={() => setShowNumPad(null)}
          onApply={(id, newQty) => {
            updateQty(id, newQty);
            setShowNumPad(null);
          }}
        />
      )}

      {showDiscountModal && (
        <DiscountModal
          item={showDiscountModal}
          onClose={() => setShowDiscountModal(null)}
          onApply={(id, type, val) => {
            if (id === 'global') {
              setCartDiscountType(type);
              setCartDiscountValue(val);
              setShowDiscountModal(null);
            } else {
              applyItemDiscount(id, type, val);
            }
          }}
        />
      )}

      {showZReport && (
        <ZReportModal onClose={() => setShowZReport(false)} />
      )}
    </div>
  );
}
