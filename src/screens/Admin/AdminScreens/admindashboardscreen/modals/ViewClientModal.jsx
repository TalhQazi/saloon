// ViewBillModal.jsx - FIXED VERSION to match PrintBillModal exactly
import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
  Alert,
  PermissionsAndroid,
  Platform,
  ActivityIndicator,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import moment from 'moment';
import RNHTMLtoPDF from 'react-native-html-to-pdf';
import RNFS from 'react-native-fs';
import { useNavigation } from '@react-navigation/native';
import { printBillToThermal } from '../../../../../utils/thermalPrinter';

// Import GST config (same as PrintBillModal)
import { getGstConfig } from '../../../../../api/gst';

const { width, height } = Dimensions.get('window');

const ViewBillModal = ({ isVisible, onClose, billData, client }) => {
  const navigation = useNavigation();

  // ✅ SAME STATES AS PrintBillModal
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const [gstConfig, setGstConfig] = useState(null);
  const [calculatedGST, setCalculatedGST] = useState(0);
  const [calculatedTotal, setCalculatedTotal] = useState(0);
  const [isThermalPrinting, setIsThermalPrinting] = useState(false);

  // ✅ EXACT SAME DATA EXTRACTION AS PrintBillModal
  const clientDetails = billData?.clientName || client?.name || 'Guest';
  const services = billData?.services || [];
  const subTotal = billData?.subtotal || 0;
  const phoneNumber = billData?.phoneNumber || client?.phoneNumber || '-';

  // ✅ FIXED: Empty string check karna hai, not dash check
  const notes =
    billData?.notes && billData.notes.trim() !== ''
      ? billData.notes
      : 'No notes provided';
  const beautician =
    billData?.beautician && billData.beautician.trim() !== ''
      ? billData.beautician
      : 'Not assigned';

  const discount = billData?.discount || 0;
  const billNumber = billData?.billNumber || billData?.visitId || 'N/A';
  const billDate = billData?.date || new Date().toISOString();

  useEffect(() => {
    if (!isVisible) {
      return;
    }

    const parsed = moment(billDate);
    setCurrentDateTime(parsed.isValid() ? parsed.toDate() : new Date());
  }, [billDate, isVisible]);

  // Debug logging
  console.log('=== VIEWBILLMODAL FINAL CHECK ===');
  console.log('Raw notes from billData:', billData?.notes);
  console.log('Raw beautician from billData:', billData?.beautician);
  console.log('Final notes value:', notes);
  console.log('Final beautician value:', beautician);

  // ✅ EXACT SAME GST LOGIC AS PrintBillModal
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const config = await getGstConfig();
        setGstConfig(config);
      } catch (error) {
        console.error('Failed to fetch GST config:', error);
        setGstConfig({ enabled: false, ratePercent: 0, applyTo: {} });
      }
    };

    fetchConfig();
  }, []);

  const handleThermalPrint = async () => {
    if (isThermalPrinting) {
      return;
    }
    try {
      setIsThermalPrinting(true);
      console.log('[ViewBillModal/Admin] handleThermalPrint called');
      const billForPrinter = {
        clientName: clientDetails,
        phoneNumber,
        notes,
        beautician,
        services,
        subtotal: subTotal,
        discount,
        gstAmount: calculatedGST,
        gstRatePercent: gstConfig?.enabled
          ? parseFloat(gstConfig.ratePercent || 0)
          : 0,
        total: calculatedTotal,
        date: billDate, // Pass the actual bill date
      };

      console.log('[ViewBillModal/Admin] billForPrinter payload:', billForPrinter);
      await printBillToThermal(billForPrinter);
      console.log('[ViewBillModal/Admin] Thermal print request completed');
    } catch (error) {
      console.error('❌ Thermal print error (admin view bill):', error);
      Alert.alert(
        'Print Error',
        'Something went wrong while printing to the thermal printer. Please check that the printer is on, in range, and correctly selected in Printer Settings.',
      );
    } finally {
      setIsThermalPrinting(false);
    }
  };

  useEffect(() => {
    if (gstConfig) {
      const parsedSubTotal = parseFloat(subTotal) || 0;
      const parsedDiscount = parseFloat(discount) || 0;

      let gstAmount = 0;
      let finalTotal = parsedSubTotal - parsedDiscount;

      if (gstConfig.enabled && parsedSubTotal > 0) {
        gstAmount = parsedSubTotal * (parseFloat(gstConfig.ratePercent) / 100);
      }

      finalTotal = finalTotal + gstAmount;

      setCalculatedGST(gstAmount);
      setCalculatedTotal(finalTotal);
    }
  }, [gstConfig, subTotal, discount]);

  // Debug logging
  console.log('=== VIEWBILLMODAL DEBUG ===');
  console.log('billData received:', billData);
  console.log('services:', services);
  console.log('services length:', services.length);
  console.log('subTotal:', subTotal);
  console.log('notes:', notes);
  console.log('beautician:', beautician);
  console.log('discount:', discount);
  console.log('calculatedGST:', calculatedGST);
  console.log('calculatedTotal:', calculatedTotal);

  if (!isVisible) {
    return null;
  }

  // ✅ EXACT SAME PDF GENERATION AS PrintBillModal
  const requestStoragePermission = async () => {
    if (Platform.OS === 'android' && Platform.Version <= 32) {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          {
            title: 'Storage Permission Required',
            message:
              'App needs access to your storage to download the bill as PDF.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true;
  };

  const handlePrintBill = async () => {
    try {
      const servicesHtml = services
        .map(
          s => `
            <tr>
              <td class="service-name">${s.name || s.subServiceName || 'N/A'
            }</td>
              <td class="service-price">PKR ${Number(s.price || 0).toFixed(
              2,
            )}</td>
            </tr>
          `,
        )
        .join('');

      const billHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Client Bill</title>
          <style>
            body { font-family: 'Arial', sans-serif; margin: 20px; color: #333; line-height: 1.6; }
            .container { width: 80%; max-width: 800px; margin: 0 auto; padding: 20px; border: 1px solid #eee; box-shadow: 0 0 10px rgba(0,0,0,0.1); background-color: #fff; }
            .header { text-align: center; margin-bottom: 25px; padding-bottom: 15px; border-bottom: 2px solid #A98C27; }
            .header img { width: 100px; height: auto; margin-bottom: 10px; }
            .header h1 { font-size: 28px; color: #000; margin: 0; }
            .header .address { font-size: 14px; color: #555; margin: 5px 0 0; }
            .header .contact { font-size: 14px; color: #555; margin: 2px 0 0; }
            .header .bill-for { font-size: 16px; font-weight: bold; color: #333; margin-top: 10px; }
            .section { margin-bottom: 20px; }
            .section-title { font-size: 18px; font-weight: bold; color: #000; margin-bottom: 10px; padding-bottom: 5px; border-bottom: 1px solid #ddd; text-align: center; }
            .detail-row { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px dashed #eee; }
            .detail-row:last-child { border-bottom: none; }
            .detail-label { font-weight: bold; color: #555; flex: 1; }
            .detail-value { text-align: right; color: #000; flex: 2; }
            .service-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            .service-table th, .service-table td { border: 1px solid #eee; padding: 10px; text-align: left; }
            .service-table th { background-color: #f8f8f8; color: #333; font-weight: bold; }
            .service-table tr:nth-child(even) { background-color: #f9f9f9; }
            .service-name { font-weight: normal; }
            .service-price { text-align: right; font-weight: bold; }
            .summary-table { width: 100%; margin-top: 20px; border-collapse: collapse; }
            .summary-table td { padding: 8px 0; }
            .summary-label { text-align: right; color: #555; padding-right: 15px; }
            .summary-value { text-align: right; font-weight: bold; color: #000; font-size: 16px; }
            .final-total-row { background-color: #A98C27; color: #fff; font-size: 20px; font-weight: bold; }
            .final-total-row td { padding: 12px 10px; }
            .final-total-label, .final-total-value { color: #fff; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <img src="data:image/jpeg;base64,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" alt="Logo" />
              <h1>Client Bill</h1>
              <p class="address">6-B2 Punjab Society, Wapda Town</p>
              <p class="contact">Contact: 0300-1042300</p>
              <p class="bill-for">For: ${clientDetails}</p>
              <p>Date: ${moment(currentDateTime).format(
        'MMMM DD, YYYY',
      )} | Time: ${moment(currentDateTime).format('hh:mm A')}</p>
            </div>
            <div class="section">
              <h2 class="section-title">Client Details</h2>
              <div class="detail-row"><span class="detail-label">Client Name:</span><span class="detail-value">${clientDetails}</span></div>
              <div class="detail-row"><span class="detail-label">Notes:</span><span class="detail-value">${notes}</span></div>
              <div class="detail-row"><span class="detail-label">Beautician:</span><span class="detail-value">${beautician}</span></div>
            </div>
            <div class="section">
              <h2 class="section-title">Services Provided</h2>
              <table class="service-table">
                <thead>
                  <tr>
                    <th>Service Name</th>
                    <th style="text-align:right;">Price</th>
                  </tr>
                </thead>
                <tbody>
                  ${servicesHtml}
                </tbody>
              </table>
            </div>
            <div class="section">
              <table class="summary-table">
                <tbody>
                  <tr>
                    <td class="summary-label">Sub Total:</td>
                    <td class="summary-value">PKR ${subTotal.toFixed(2)}</td>
                  </tr>
                  ${gstConfig?.enabled
          ? `
                  <tr>
                    <td class="summary-label">GST (${parseFloat(
            gstConfig.ratePercent,
          ).toFixed(2)}%):</td>
                    <td class="summary-value">+PKR ${calculatedGST.toFixed(
            2,
          )}</td>
                  </tr>
                  `
          : ''
        }
                  <tr>
                    <td class="summary-label">Discount:</td>
                    <td class="summary-value">-PKR ${discount.toFixed(2)}</td>
                  </tr>
                  <tr class="final-total-row">
                    <td class="summary-label final-total-label">Total:</td>
                    <td class="summary-value final-total-value">PKR ${calculatedTotal.toFixed(
          2,
        )}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div style="text-align: center; margin-top: 40px; font-size: 12px; color: #777;">
              Thank you for your business!
            </div>
          </div>
        </body>
        </html>
      `;

      const fileName =
        `Client_Bill_${clientDetails.replace(/\s/g, '_')}_` +
        moment().format('YYYYMMDD_HHmmss');
      const options = {
        html: billHTML,
        fileName: fileName,
        directory: 'cache',
        height: 842,
        width: 595,
      };

      const file = await RNHTMLtoPDF.convert(options);

      if (file && file.filePath) {
        Alert.alert(
          'PDF Generated',
          `The bill PDF for ${clientDetails} has been generated.`,
          [
            {
              text: 'Download',
              onPress: async () => {
                const permissionGranted = await requestStoragePermission();
                if (!permissionGranted) {
                  Alert.alert(
                    'Permission Denied',
                    'Cannot download bill without storage permission.',
                  );
                  return;
                }
                const destPath = `${RNFS.DownloadDirectoryPath}/${fileName}.pdf`;
                try {
                  await RNFS.copyFile(file.filePath, destPath);
                  Alert.alert(
                    'Download Successful',
                    `PDF saved to your Downloads folder: ${destPath}`,
                  );
                } catch (downloadError) {
                  console.error('Failed to download PDF:', downloadError);
                  Alert.alert(
                    'Error',
                    `Failed to download PDF: ${downloadError.message || 'Unknown error'
                    }`,
                  );
                }
              },
            },
            { text: 'Cancel', style: 'cancel' },
          ],
        );
      } else {
        Alert.alert(
          'Error',
          'PDF file not generated or path is missing. Please check console for details.',
        );
        console.error(
          'RNHTMLtoPDF conversion failed: file or filePath missing.',
          file,
        );
      }
    } catch (error) {
      console.error('Print Error:', error);
      Alert.alert(
        'Error',
        `Failed to generate bill PDF: ${error.message || 'Unknown error'}`,
      );
    }
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Bill for {clientDetails}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons
                name="close-circle-outline"
                size={width * 0.05}
                color="#A9A9A9"
              />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.detailsContainer}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Date:</Text>
              <Text style={styles.detailValue}>
                {moment(currentDateTime).format('MMMM DD, YYYY')}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Start Time:</Text>
              <Text style={styles.detailValue}>
                {moment(currentDateTime).format('hh:mm A')}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Client Name:</Text>
              <Text style={styles.detailValue}>{clientDetails}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Phone Number:</Text>
              <Text style={styles.detailValue}>{phoneNumber}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Notes:</Text>
              <Text style={styles.detailValue}>
                {notes === 'No notes' ? 'No additional notes' : notes}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Beautician:</Text>
              <Text style={styles.detailValue}>
                {beautician === 'Not assigned'
                  ? 'No beautician assigned'
                  : beautician}
              </Text>
            </View>
            <View style={styles.detailRow}></View>

            <View style={styles.separator} />

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Services</Text>
            </View>

            {services.length > 0 ? (
              services.map((service, index) => (
                <View key={index} style={styles.serviceItem}>
                  <Text style={styles.serviceName}>
                    {service.name || service.subServiceName || 'N/A'}
                  </Text>
                  <Text style={styles.servicePrice}>
                    PKR {Number(service.price || 0).toFixed(2)}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={styles.noServicesText}>No services listed.</Text>
            )}

            <View style={styles.separator} />

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Sub Total</Text>
              <Text style={styles.totalValue}>PKR {subTotal.toFixed(2)}</Text>
            </View>

            {gstConfig?.enabled && calculatedGST > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>
                  GST ({parseFloat(gstConfig.ratePercent).toFixed(2)}%)
                </Text>
                <Text style={styles.totalValue}>
                  +PKR {calculatedGST.toFixed(2)}
                </Text>
              </View>
            )}

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Discount</Text>
              <Text style={styles.totalValue}>-PKR {discount.toFixed(2)}</Text>
            </View>

            <View style={styles.separator} />

            <View style={styles.totalRow}>
              <Text style={styles.totalLabelFinal}>Total</Text>
              <Text style={styles.totalValueFinal}>PKR {calculatedTotal.toFixed(2)}</Text>
            </View>

          </ScrollView>

          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.printBillButton, { backgroundColor: '#FFD700' }]}
              onPress={handlePrintBill}
            >
              <Text style={styles.printBillButtonText}>Download PDF</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.printBillButton, { backgroundColor: '#4CAF50' }]}
              onPress={handleThermalPrint}
              disabled={isThermalPrinting}
            >
              {isThermalPrinting ? (
                <ActivityIndicator color="#161719" />
              ) : (
                <Text style={styles.printBillButtonText}>Print to Thermal</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ... (rest of the code remains the same)
// ✅ EXACT SAME STYLES AS PrintBillModal
const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalView: {
    width: '70%',
    maxWidth: 600,
    height: '70%',
    maxHeight: 1100,
    backgroundColor: '#1F1F1F',
    borderRadius: 15,
    padding: width * 0.03,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: height * 0.025,
    paddingBottom: height * 0.01,
    borderBottomWidth: 1,
    borderBottomColor: '#3C3C3C',
  },
  modalTitle: {
    fontSize: width * 0.025,
    fontWeight: 'bold',
    color: '#fff',
  },
  closeButton: {
    padding: width * 0.008,
  },
  detailsContainer: {
    flex: 1,
    width: '100%',
    paddingVertical: height * 0.01,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: height * 0.012,
  },
  detailLabel: {
    fontSize: width * 0.016,
    color: '#A9A9A9',
    fontWeight: '600',
    flex: 1,
  },
  detailValue: {
    fontSize: width * 0.016,
    color: '#fff',
    flex: 2,
    textAlign: 'right',
  },
  separator: {
    height: 1,
    backgroundColor: '#3C3C3C',
    marginVertical: height * 0.02,
    width: '100%',
  },
  sectionHeader: {
    marginBottom: height * 0.015,
  },
  sectionTitle: {
    fontSize: width * 0.018,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  serviceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: height * 0.008,
  },
  serviceName: {
    fontSize: width * 0.015,
    color: '#fff',
  },
  servicePrice: {
    fontSize: width * 0.015,
    color: '#fff',
    fontWeight: 'bold',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: height * 0.01,
  },
  totalLabel: {
    fontSize: width * 0.016,
    color: '#A9A9A9',
  },
  totalValue: {
    fontSize: width * 0.016,
    color: '#fff',
    fontWeight: 'bold',
  },
  totalLabelFinal: {
    fontSize: width * 0.02,
    color: '#fff',
    fontWeight: 'bold',
  },
  totalValueFinal: {
    fontSize: width * 0.02,
    color: '#fff',
    fontWeight: 'bold',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: height * 0.02,
  },
  printBillButton: {
    backgroundColor: '#FFD700',
    borderRadius: 10,
    padding: height * 0.02,
    alignItems: 'center',
    marginTop: height * 0.03,
  },
  printBillButtonText: {
    color: '#161719',
    fontSize: width * 0.02,
    fontWeight: 'bold',
  },
  noServicesText: {
    color: '#A9A9A9',
    fontSize: width * 0.015,
    textAlign: 'center',
    marginTop: height * 0.02,
  },
});

export default ViewBillModal;
