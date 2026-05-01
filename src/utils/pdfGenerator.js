import RNHTMLtoPDF from 'react-native-html-to-pdf';
import FileViewer from 'react-native-file-viewer';
import Share from 'react-native-share';
import { Alert, Platform } from 'react-native';

const logoBase64 = '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';

export const createInvoicePDF = async (bill) => {
    try {
        const {
            clientName = 'Guest',
            phoneNumber = '-',
            notes = '-',
            beautician = '-',
            services = [],
            subtotal = 0,
            discount = 0,
            gstAmount = 0,
            gstRatePercent = 0,
            total = 0,
        } = bill;

        const now = new Date();
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const day = now.getDate().toString().padStart(2, '0');
        const month = months[now.getMonth()];
        const year = now.getFullYear();
        let hours = now.getHours();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12;
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const dateStr = `${month} ${day}, ${year}`;
        const timeStr = `${hours}:${minutes} ${ampm}`;

        let servicesHtml = services.map(service => {
            if (/sub\s*total/i.test(service.name)) return '';
            return `
        <div class="row">
            <span class="left">${service.name || service.subServiceName || 'N/A'}</span>
            <span class="right">${Number(service.price || 0).toFixed(2)}</span>
        </div>
        `;
        }).join('');

        let extrasHtml = '';
        if (gstAmount && Number(gstAmount) > 0) {
            extrasHtml += `
        <div class="row">
            <span class="left">GST (${Number(gstRatePercent).toFixed(2)}%)</span>
            <span class="right">${Number(gstAmount).toFixed(2)}</span>
        </div>`;
        }
        if (discount && Number(discount) > 0) {
            extrasHtml += `
        <div class="row">
            <span class="left">Discount</span>
            <span class="right">-${Number(discount).toFixed(2)}</span>
        </div>`;
        }

        const htmlContent = `
    <html>
      <head>
        <style>
          body {
            font-family: 'Courier New', Courier, monospace;
            width: 300px; /* Approx 80mm */
            margin: 0 auto;
            color: #000;
            background-color: #fff;
            padding: 10px;
          }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .logo { 
            width: 200px;
            margin: 0 auto 10px auto; 
            display: block;
          }
          .divider {
            border-top: 1px dashed #000;
            margin: 10px 0;
          }
          .row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 5px;
          }
          .left { text-align: left; }
          .right { text-align: right; }
          .header-text { font-size: 1.2em; margin: 5px 0; }
          .sub-text { font-size: 0.9em; }
        </style>
      </head>
      <body>
        <div class="center">
            <img src="data:image/png;base64,${logoBase64}" class="logo" />
            <div class="sub-text">6-B2 Punjab Society, Wapda Town</div>
            <div class="sub-text">Contact: 0300-1042300</div>
            
            <div class="header-text bold">INVOICE</div>
            <div class="sub-text">Date: ${dateStr} | Time: ${timeStr}</div>
            ${beautician && beautician !== '-' ? `<div class="sub-text">Beautician: ${beautician}</div>` : ''}
            ${notes && notes !== '-' ? `<div class="sub-text">Note: ${notes}</div>` : ''}
        </div>

        <div class="divider"></div>
        <div class="center header-text bold">SERVICE</div>
        
        ${servicesHtml}
        
        <div class="divider"></div>
        <div class="row">
             <span class="left">Sub Total:</span>
             <span class="right">${Number(subtotal).toFixed(2)}</span>
        </div>
        ${extrasHtml}
        
        <div class="divider"></div>
        <div class="center header-text bold">TOTAL: ${Number(total).toFixed(2)}</div>
        <div class="divider"></div>
        
        <div class="center sub-text">Thank you! Visit again</div>
      </body>
    </html>
    `;

        const options = {
            html: htmlContent,
            fileName: `Invoice_${Date.now()}`,
            directory: 'Invoices',
            base64: true,
        };

        const file = await RNHTMLtoPDF.convert(options);

        // View the file
        if (file.filePath) {
            Alert.alert(
                'Success',
                'PDF Generated Successfully',
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Open', onPress: () => FileViewer.open(file.filePath) },
                    {
                        text: 'Share', onPress: () => Share.open({
                            url: `file://${file.filePath}`,
                            type: 'application/pdf',
                            title: 'Invoice'
                        }).catch(err => console.log('Share error', err))
                    }
                ]
            );
        }

        return file.filePath;

    } catch (error) {
        console.error('PDF Generation Error:', error);
        Alert.alert('Error', 'Failed to generate PDF');
        return null;
    }
};
