import { useEffect } from 'react';
import { formatCurrency, formatDateTime } from '../../utils/helpers';

export default function ReceiptModal({ sale, onClose }) {

  useEffect(() => {
    if (!sale) return;

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
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Courier New', Courier, monospace; 
              font-size: 13px; 
              width: 100%; 
              max-width: 280px; 
              padding: 10px; 
              margin: 0 auto; 
              color: #000;
              background: #fff;
              -webkit-font-smoothing: none;
              font-smooth: never;
              text-rendering: optimizeSpeed;
              line-height: 1.2;
            }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .line { border-top: 1px dashed #000; margin: 6px 0; }
            table { width: 100%; border-collapse: collapse; margin: 4px 0; }
            th, td { text-align: right; vertical-align: top; }
            th:first-child, td:first-child { text-align: left; padding-right: 4px; }
            th { font-weight: normal; border-bottom: 1px dashed #000; padding-bottom: 4px; margin-bottom: 4px; }
            .totals { width: 100%; display: flex; flex-direction: column; align-items: flex-end; margin-top: 4px; }
            .totals-row { display: flex; justify-content: flex-end; gap: 8px; margin: 2px 0; }
          </style>
        </head>
        <body>
          <div class="center">
            <div>BuildPOS Hardware</div>
            <div>123 Construction Ave</div>
            <div>Tel: (555) 123-4567</div>
          </div>
          <div class="line" style="margin-top: 8px;"></div>
          <div>Receipt: ${sale.receiptNumber}</div>
          <div>Date: ${new Date(sale.createdAt).toLocaleString()}</div>
          <div>Cashier: ${sale.cashierName || 'Administrator'}</div>
          ${sale.customerName ? `<div>Customer: ${sale.customerName}</div>` : ''}
          <div class="line"></div>
          
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>Price</th>
                <th>Ext</th>
              </tr>
            </thead>
            <tbody>
              ${sale.items.map(item => `
                <tr>
                  <td style="max-width: 100px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                    ${item.productName.substring(0, 15)}
                  </td>
                  <td>${item.qty}</td>
                  <td>${item.price.toFixed(2)}</td>
                  <td>${item.subtotal.toFixed(2)}</td>
                </tr>
                ${item.discountValue > 0 ? `
                <tr>
                  <td colspan="4" style="text-align: left; font-size: 11px; padding-left: 8px;">
                    Disc: ${item.discountType === 'percentage' ? item.discountValue + '%' : formatCurrency(item.discountValue)}
                  </td>
                </tr>
                ` : ''}
              `).join('')}
            </tbody>
          </table>
          
          <div class="line"></div>
          
          <div class="totals">
            <div class="totals-row">
              <span>Subtotal:</span>
              <span>${formatCurrency(sale.subtotal)}</span>
            </div>
            ${sale.discountAmount > 0 ? `
            <div class="totals-row">
              <span>Overall Disc:</span>
              <span>-${formatCurrency(sale.discountAmount)}</span>
            </div>
            ` : ''}
            <div class="totals-row bold" style="font-size: 15px; margin: 4px 0;">
              <span>TOTAL:</span>
              <span>${formatCurrency(sale.total)}</span>
            </div>
            <div class="totals-row">
              <span>Paid (${sale.paymentMethod}):</span>
              <span>${formatCurrency(sale.amountPaid)}</span>
            </div>
            ${sale.balanceDue > 0 ? `
            <div class="totals-row">
              <span>Balance Due:</span>
              <span>${formatCurrency(sale.balanceDue)}</span>
            </div>
            ` : `
            <div class="totals-row">
              <span>Change:</span>
              <span>${formatCurrency(sale.change)}</span>
            </div>
            `}
          </div>
          
          <div class="center" style="margin-top:20px;">
            <div>Thank you for your business!</div>
            <div>Please come again.</div>
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
  }, [sale, onClose]);

  return null; // Headless component, renders no UI
}
