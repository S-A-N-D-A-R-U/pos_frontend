import { useEffect, useRef } from 'react';
import { formatCurrency, formatDateTime } from '../../utils/helpers';

export default function ReceiptModal({ sale, onClose }) {
  const printedRef = useRef(false);

  useEffect(() => {
    if (!sale || printedRef.current) return;
    printedRef.current = true;

    const handlePrint = () => {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = 'none';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow.document;
      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Receipt - ${sale.receiptNumber}</title>
          <style>
            @page { margin: 0; size: 80mm auto; }
            body { 
              font-family: 'Courier New', Courier, monospace; 
              font-size: 13px;
              width: 100%; 
              max-width: 280px; 
              padding: 10px; 
              margin: 0 auto; 
              color: #000;
              background: #fff;
              line-height: 1.2;
              /* Fine-grained thickness control since Courier isn't a variable font */
              -webkit-text-stroke: 0.25px #000;
            }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .line { border-top: 1px dashed #000; margin: 6px 0; }
            .row { display: flex; justify-content: space-between; margin: 2px 0; }
            .item-name { margin-bottom: 2px; }
            .totals { width: 100%; display: flex; flex-direction: column; margin-top: 4px; }
          </style>
        </head>
        <body>
          <div class="center">
            <h2 class="bold" style="font-size: 16px; margin-bottom: 4px;">BuildPOS Hardware</h2>
            <div style="font-size: 11px; margin-bottom: 8px;">Construction Materials & Supplies</div>
            <div>Receipt: ${sale.receiptNumber}</div>
            <div>${formatDateTime(sale.createdAt)}</div>
            <div>Cashier: ${sale.cashierName || 'Administrator'}</div>
          </div>
          
          <div class="line"></div>
          
          <div class="items">
            ${sale.items.map(item => `
              <div style="margin-bottom: 6px;">
                <div class="item-name">${item.productName}</div>
                <div class="row">
                  <div>${item.qty} x ${formatCurrency(item.price)}</div>
                  <div>${formatCurrency(item.subtotal)}</div>
                </div>
                ${item.discountValue > 0 ? `
                  <div class="row" style="font-size: 11px;">
                    <div>Disc (${item.discountType === 'percentage' ? item.discountValue + '%' : 'Fixed'})</div>
                    <div>-${formatCurrency(item.discountAmount)}</div>
                  </div>
                ` : ''}
              </div>
            `).join('')}
          </div>

          <div class="line"></div>
          
          <div class="totals">
            <div class="row">
              <div>Subtotal</div>
              <div>${formatCurrency(sale.subtotal)}</div>
            </div>
            ${sale.discountAmount > 0 ? `
              <div class="row">
                <div>Overall Discount</div>
                <div>-${formatCurrency(sale.discountAmount)}</div>
              </div>
            ` : ''}
            <div class="row" style="margin-bottom: 4px;">
              <div>Tax (0%)</div>
              <div>${formatCurrency(0)}</div>
            </div>
            
            <div class="line"></div>
            
            <div class="row bold" style="font-size: 15px; margin: 4px 0;">
              <div>TOTAL</div>
              <div>${formatCurrency(sale.total)}</div>
            </div>
            
            <div class="line"></div>

            <div class="row">
              <div>Payment</div>
              <div>${sale.paymentMethod.toUpperCase()}</div>
            </div>
            <div class="row">
              <div>Paid</div>
              <div>${formatCurrency(sale.amountPaid)}</div>
            </div>
            <div class="row bold">
              <div>${sale.balanceDue > 0 ? 'Balance Due' : 'Change'}</div>
              <div>${formatCurrency(sale.balanceDue > 0 ? sale.balanceDue : sale.change)}</div>
            </div>
          </div>
          
          <div class="line"></div>
          
          <div class="center" style="margin-top: 10px;">
            <div class="bold" style="margin-bottom: 4px;">Thank you for your purchase!</div>
            <div style="font-size: 10px;">Powered by BuildPOS</div>
          </div>
        </body>
        </html>
      `);
      doc.close();

      setTimeout(() => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        setTimeout(() => {
          document.body.removeChild(iframe);
          onClose(); // Automatically close immediately after sending to print spooler
        }, 500);
      }, 250);
    };

    handlePrint();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sale]);

  return null; // Headless component, renders no UI
}
