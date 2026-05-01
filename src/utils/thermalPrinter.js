import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BLEPrinter } from 'react-native-thermal-receipt-printer-image-qr';

const PRINTER_MAC_STORAGE_KEY = 'THERMAL_PRINTER_MAC';

let cachedDeviceAddress = null;
let isBLEInitialized = false; // Track BLE init state so we only call init() once
let isPrinting = false; // Print lock to prevent concurrent jobs

export const setThermalPrinterAddress = address => {
    cachedDeviceAddress = address || null;
};

export const getThermalPrinterAddress = () => cachedDeviceAddress;

/**
 * Loads the saved printer MAC from AsyncStorage into the in-memory cache.
 * Called automatically before printing so the saved printer works even if
 * the Printer Settings screen was never opened in this session.
 */
export const loadSavedPrinterAddress = async () => {
    if (cachedDeviceAddress) return cachedDeviceAddress;
    try {
        const savedMac = await AsyncStorage.getItem(PRINTER_MAC_STORAGE_KEY);
        if (savedMac) {
            cachedDeviceAddress = savedMac;
        }
        return cachedDeviceAddress;
    } catch (e) {
        console.error('[ThermalPrinter] Failed to load saved printer address:', e);
        return null;
    }
};

const sanitizeForPrinter = (value, fallback = '-') => {
    try {
        let text = value;
        if (text === null || text === undefined) text = '';
        text = String(text).trim();
        if (!text) text = fallback;
        text = text.replace(/\s+/g, ' ');
        text = text.replace(/[^\x20-\x7E]/g, '');
        const MAX_LEN = 80;
        if (text.length > MAX_LEN) text = text.slice(0, MAX_LEN);
        return text || fallback;
    } catch (e) {
        console.error('[ThermalPrinter] sanitizeForPrinter error:', e);
        return fallback;
    }
};

const connectToPrinter = async address => {
    try {
        // If no address provided, fall back to in-memory cache, then AsyncStorage
        const target = address || (await loadSavedPrinterAddress());
        if (!target) throw new Error('No printer selected. Please pair and set a printer first.');

        // Only initialise the BLE module once per app session to avoid
        // resetting the adapter (which drops active connections).
        if (!isBLEInitialized) {
            await BLEPrinter.init();
            isBLEInitialized = true;
        }

        await BLEPrinter.connectPrinter(target);
        cachedDeviceAddress = target;
    } catch (error) {
        console.error('[ThermalPrinter] Connect error:', error);
        // If the connection attempt itself failed, reset the init flag so we
        // retry a full init on the next attempt (handles BT adapter restarts).
        isBLEInitialized = false;
        throw new Error('Failed to connect to printer. Please make sure it is on and paired.');
    }
};

// ================= LAYOUT HELPERS =================
const PRINTER_WIDTH = 48; // 80mm standard char width

const centerText = (text) => {
    const str = String(text || '').trim();
    if (str.length >= PRINTER_WIDTH) return str;
    const paddingLeft = Math.floor((PRINTER_WIDTH - str.length) / 2);
    return ' '.repeat(paddingLeft) + str;
};

const leftRightText = (left, right) => {
    const l = String(left || '').trim();
    const r = String(right || '').trim();
    const spaceNeeded = PRINTER_WIDTH - l.length - r.length;
    if (spaceNeeded < 1) {
        return l.slice(0, PRINTER_WIDTH - r.length - 1) + ' ' + r;
    }
    return l + ' '.repeat(spaceNeeded) + r;
};

const formatServiceItem = (name, price) => {
    const serviceName = String(name || '').trim();
    const priceStr = String(price || '').trim();
    const minSpacing = 2; // Minimum spaces between name and price

    // If the service name + price + spacing fits on one line, use normal formatting
    if (serviceName.length + priceStr.length + minSpacing <= PRINTER_WIDTH) {
        return leftRightText(serviceName, priceStr);
    }

    // If too long, wrap the service name and keep price on the last line
    const maxNameWidth = PRINTER_WIDTH - priceStr.length - minSpacing;

    // Split service name into chunks that fit
    let result = '';
    let remainingName = serviceName;

    while (remainingName.length > maxNameWidth) {
        // Find the last space before maxNameWidth to avoid breaking words
        let breakPoint = remainingName.lastIndexOf(' ', maxNameWidth);
        if (breakPoint === -1 || breakPoint === 0) {
            // No space found, just break at maxNameWidth
            breakPoint = maxNameWidth;
        }

        result += remainingName.substring(0, breakPoint).trim() + '\n';
        remainingName = remainingName.substring(breakPoint).trim();
    }

    // Last line with price
    const spaceNeeded = PRINTER_WIDTH - remainingName.length - priceStr.length;
    result += remainingName + ' '.repeat(Math.max(1, spaceNeeded)) + priceStr;

    return result;
};

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const DOTS = '................................................';

// ESC/POS Commands
const CMD_INIT = '\x1b@';
const CMD_CENTER = '\x1ba\x01';
const CMD_LEFT = '\x1ba\x00';
const CMD_BOLD_ON = '\x1bE\x01';
const CMD_BOLD_OFF = '\x1bE\x00';
const CMD_FONT_B = '\x1bM\x01'; // Smaller font
const CMD_CUT = '\x1dV\x42\x00';

// Logo base64 (constant to avoid re-encoding)
const LOGO_BASE64 = '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';

export const printBillToThermal = async bill => {
    // Prevent concurrent print jobs
    if (isPrinting) {
        console.warn('[ThermalPrinter] Print job already in progress, queuing...');
        await sleep(2000); // Wait 2 seconds before retrying
        if (isPrinting) {
            Alert.alert('Print Busy', 'Another print job is in progress. Please wait.');
            return;
        }
    }

    isPrinting = true;

    try {
        if (!bill) throw new Error('No bill data provided for printing.');
        await connectToPrinter();

        const {
            clientName: rawClientName = 'Guest',
            phoneNumber: rawPhoneNumber = '-',
            notes: rawNotes = '-',
            beautician: rawBeautician = '-',
            services = [],
            subtotal = 0,
            discount = 0,
            gstAmount = 0,
            gstRatePercent = 0,
            total = 0,
            date: billDate, // Get the bill date from database
        } = bill;

        const beautician = sanitizeForPrinter(rawBeautician, '-');
        const notes = sanitizeForPrinter(rawNotes, '-');

        // Use the bill's date if provided, otherwise use current date
        const dateToUse = billDate ? new Date(billDate) : new Date();
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const day = dateToUse.getDate().toString();
        const currentMonth = months[dateToUse.getMonth()];
        const year = dateToUse.getFullYear();
        let hours = dateToUse.getHours();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12;
        const minutes = dateToUse.getMinutes().toString().padStart(2, '0');
        const dateStr = `${currentMonth} ${day}, ${year}`;
        const timeStr = `${hours}:${minutes} ${ampm}`;

        // ========== BUILD ENTIRE RECEIPT AS SINGLE BATCH ==========
        let receiptText = '';

        // Header (centered using centerText for consistent alignment)
        receiptText += CMD_LEFT; // Use left mode with manual centering for consistency
        receiptText += CMD_FONT_B; // Smaller font
        receiptText += centerText('6-B2 Punjab Society, Wapda Town') + '\n';
        receiptText += centerText('Contact: 0300-1042300') + '\n';
        receiptText += CMD_BOLD_ON + centerText('INVOICE') + CMD_BOLD_OFF + '\n';
        receiptText += centerText(`Date: ${dateStr} | Time:`) + '\n';
        receiptText += centerText(timeStr) + '\n';

        // Details (centered)
        if (beautician && beautician !== '-') {
            receiptText += centerText(`Beautician: ${beautician}`) + '\n';
        }
        if (notes && notes !== '-') {
            receiptText += centerText(`Note: ${notes}`) + '\n';
        }

        // Switch to left align for items
        receiptText += CMD_LEFT;
        receiptText += DOTS + '\n';
        receiptText += CMD_BOLD_ON + centerText('SERVICE') + CMD_BOLD_OFF + '\n';

        // Service Items
        for (const service of services) {
            const name = service.name || service.subServiceName || 'N/A';
            if (/sub\s*total/i.test(name)) continue;
            const priceVal = Number(service.price || 0).toFixed(2);
            receiptText += formatServiceItem(name, priceVal) + '\n';
        }

        receiptText += DOTS + '\n';

        // Totals
        receiptText += leftRightText('Sub Total:', Number(subtotal || 0).toFixed(2)) + '\n';

        if (gstAmount && Number(gstAmount) > 0) {
            const gstLabel = `GST (${Number(gstRatePercent).toFixed(2)}%)`;
            const gstVal = Number(gstAmount).toFixed(2);
            receiptText += leftRightText(gstLabel, gstVal) + '\n';
        }

        if (discount && Number(discount) > 0) {
            const discountLabel = 'Discount:';
            const discountVal = `-${Number(discount).toFixed(2)}`;
            receiptText += leftRightText(discountLabel, discountVal) + '\n';
        }

        receiptText += DOTS + '\n';

        // Grand Total (centered)
        const totalStr = `TOTAL: ${Number(total || 0).toFixed(2)}`;
        receiptText += CMD_BOLD_ON + centerText(totalStr) + CMD_BOLD_OFF + '\n';

        receiptText += DOTS + '\n';

        // Footer
        receiptText += centerText('Thank you! Visit again') + '\n\n';

        // ========== SEND TO PRINTER ==========

        // 1. Print Logo first (separate because it's an image)
        try {
            // Print logo directly without any preceding commands to avoid top space
            await BLEPrinter.printImageBase64(LOGO_BASE64, { width: 400, height: 200 });
            await sleep(800); // Wait for logo to finish
        } catch (e) {
            console.error('Logo Print Error:', e);
            await BLEPrinter.printText(centerText('SARTE SALON') + '\n', {});
        }

        // 2. Print entire receipt text in ONE batch
        await BLEPrinter.printText(receiptText, {});
        await sleep(300); // Small delay before cut

        // 3. Cut paper
        await BLEPrinter.printText(CMD_CUT, {});

        // 4. Final delay to ensure print completes before releasing lock
        await sleep(1000);

    } catch (error) {
        console.error('[ThermalPrinter] printBillToThermal error:', error);
        Alert.alert('Print Error', error.message || 'Failed to print');
    } finally {
        // Always release the lock
        isPrinting = false;
    }
};
