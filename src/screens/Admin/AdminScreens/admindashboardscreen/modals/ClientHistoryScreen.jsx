// ClientHistoryScreen.jsx - IMPROVED DATA MAPPING VERSION
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
  useRoute,
  useNavigation,
  useFocusEffect,
} from '@react-navigation/native';
import moment from 'moment';
import axios from 'axios';
import { getAuthToken } from '../../../../../utils/authUtils';

import ViewBillModal from './ViewClientModal';

const { width, height } = Dimensions.get('window');

import { BASE_URL } from '../../../../../api/config';

const ClientHistoryScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { client } = route.params;

  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isViewBillModalVisible, setIsViewBillModalVisible] = useState(false);
  const [selectedBillData, setSelectedBillData] = useState(null);

  const fetchClientHistory = useCallback(async () => {
    console.log('📡 Fetching client history for client ID:', client?._id);
    setLoading(true);

    try {
      const authToken = await getAuthToken();
      if (!authToken) {
        console.log('❌ Authentication Error: Token not found.');
        Alert.alert(
          'Error',
          'Authentication token is missing. Please log in again.',
        );
        setLoading(false);
        return;
      }

      if (!client || !client._id) {
        console.log('❌ Error: Client object or ID is missing.');
        Alert.alert('Error', 'Client data is missing.');
        setLoading(false);
        return;
      }

      const url = `${BASE_URL}/clients/${client._id}/history`;
      console.log('🌐 API URL:', url);

      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      console.log(
        '📥 API Raw Response:',
        JSON.stringify(response.data, null, 2),
      );

      if (response.data.success) {
        const fetchedVisits = response.data.client?.visits || [];
        console.log('📋 Raw visits count:', fetchedVisits.length);

        // ✅ IMPROVED DATA MAPPING - Match PrintBillModal structure exactly
        const mappedVisits = fetchedVisits.map(visit => {
          console.log('🔍 Processing visit:', JSON.stringify(visit, null, 2));

          // ✅ Handle nested visitData properly
          const visitData = visit.visitData || visit;

          // ✅ Services extraction with proper fallback
          let services = [];
          if (Array.isArray(visitData.services)) {
            services = visitData.services;
          } else if (Array.isArray(visit.services)) {
            services = visit.services;
          }

          console.log('🎯 Services found:', services.length, services);

          // ✅ Calculate subtotal from services if not provided (same as CartServiceScreen)
          const servicesSubtotal = services.reduce(
            (sum, service) => sum + (Number(service.price) || 0),
            0,
          );

          // ✅ EXACT SAME FIELD MAPPING AS PrintBillModal expects
          const mappedVisit = {
            _id: visit._id,
            visitId: visit.visitId,

            // ✅ Core bill data - Direct access, no visitData wrapper
            services: services,
            subtotal: visit.subtotal || servicesSubtotal,
            discount: visit.discount || 0,

            // ✅ CRITICAL FIX: Direct field access
            notes: visit.notes || '',
            beautician: visit.specialist || '', // Backend mein "specialist" field hai

            // ✅ Client info
            clientName: visit.clientName || client?.name || 'Guest',
            phoneNumber: visit.phoneNumber || client?.phoneNumber || '-',

            // ✅ Bill metadata
            billNumber:
              visit.billNumber || visit.visitId || `BILL-${Date.now()}`,
            date: visit.date || new Date().toISOString(),

            // ✅ Total calculation
            totalBill:
              visit.finalAmount ||
              visit.totalBill ||
              servicesSubtotal - (visit.discount || 0),

            // ✅ Keep original data for debugging
            originalData: visit,
          };

          console.log('✅ Final mapped visit:', {
            id: mappedVisit._id,
            servicesCount: mappedVisit.services.length,
            subtotal: mappedVisit.subtotal,
            discount: mappedVisit.discount,
            totalBill: mappedVisit.totalBill,
            notes: mappedVisit.notes,
            beautician: mappedVisit.beautician,
            billNumber: mappedVisit.billNumber,
          });

          return mappedVisit;
        });

        setVisits(mappedVisits);
        console.log('🎉 Final mapped visits count:', mappedVisits.length);

        // ✅ Debug: Log first mapped visit structure
        if (mappedVisits.length > 0) {
          console.log(
            '🔍 Sample mapped visit structure:',
            JSON.stringify(mappedVisits[0], null, 2),
          );
        }
      } else {
        console.log('❌ API Error: Success flag is false.');
        Alert.alert('Error', 'Failed to fetch client history.');
      }
    } catch (error) {
      console.error('API call failed:', error.message);
      if (error.response) {
        console.error('API Response Error:', {
          status: error.response.status,
          data: error.response.data,
        });
        Alert.alert(
          'Error',
          error.response.data.message ||
            'An unexpected error occurred while fetching data.',
        );
      } else if (error.request) {
        console.error('Network Error: No response received.');
        Alert.alert(
          'Network Error',
          'No response from the server. Check your network connection.',
        );
      } else {
        console.error('Request Setup Error:', error.message);
        Alert.alert('Error', 'An error occurred setting up the request.');
      }
    } finally {
      setLoading(false);
      console.log('History fetching process complete.');
    }
  }, [client?._id, client?.name, client?.phoneNumber]);

  useFocusEffect(
    useCallback(() => {
      fetchClientHistory();
    }, [fetchClientHistory]),
  );

  const handleOpenViewBillModal = bill => {
    console.log('OPENING BILL MODAL WITH MAPPED DATA:', {
      _id: bill._id,
      billNumber: bill.billNumber,
      services: bill.services,
      servicesCount: bill.services?.length || 0,
      subtotal: bill.subtotal,
      discount: bill.discount,
      totalBill: bill.totalBill,
      notes: bill.notes,
      beautician: bill.beautician,
      clientName: bill.clientName,
      phoneNumber: bill.phoneNumber,
      date: bill.date,
    });

    // Pass the properly mapped data to ViewBillModal
    setSelectedBillData(bill);
    setIsViewBillModalVisible(true);
  };

  const handleCloseViewBillModal = () => {
    setIsViewBillModalVisible(false);
    setSelectedBillData(null);
  };

  const renderVisitItem = ({ item, index }) => {
    // Calculate final amount with GST for display
    const baseAmount = Number(item.totalBill || item.subtotal || 0);
    const discountAmount = Number(item.discount || 0);

    // Simple GST calculation - aap apne GST rate ke hisab se adjust kar sakte hain
    // Assuming 7% GST based on console logs
    const gstRate = 0.07; // 7%
    const gstAmount = (baseAmount - discountAmount) * gstRate;
    const finalDisplayAmount = baseAmount - discountAmount + gstAmount;

    return (
      <View
        style={[
          styles.row,
          { backgroundColor: index % 2 === 0 ? '#2E2E2E' : '#1F1F1F' },
        ]}
      >
        <Text style={styles.visitIdCell}>
          {item.billNumber || item.visitId || 'N/A'}
        </Text>
        <Text style={styles.visitDateCell}>
          {moment(item.date).format('MMMM DD, YYYY')}
        </Text>
        <Text style={styles.visitServiceCountCell}>
          {item.services ? item.services.length : 0} services
        </Text>
        <Text style={styles.visitAmountCell}>
          PKR {finalDisplayAmount.toFixed(2)}
        </Text>
        <View style={styles.visitActionCell}>
          <TouchableOpacity
            onPress={() => handleOpenViewBillModal(item)}
            style={styles.actionButton}
          >
            <Ionicons
              name="receipt-outline"
              size={width * 0.018}
              color="#A98C27"
            />
            <Text style={styles.actionButtonText}>View Bill</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons
            name="arrow-back-outline"
            size={width * 0.04}
            color="#fff"
          />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>
            Visit History for {client?.name}
          </Text>
          <Text style={styles.clientInfoText}>
            Phone: {client?.phoneNumber}
          </Text>
        </View>
      </View>
      <View style={styles.contentArea}>
        <View style={styles.tableContainer}>
          <View style={styles.tableHeader}>
            <Text style={styles.visitIdHeader}>Bill ID</Text>
            <Text style={styles.visitDateHeader}>Date</Text>
            <Text style={styles.visitServiceHeader}>Services</Text>
            <Text style={styles.visitAmountHeader}>Amount</Text>
            <Text style={styles.visitActionHeader}>Action</Text>
          </View>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#A98C27" />
              <Text style={styles.loadingText}>Fetching latest history...</Text>
            </View>
          ) : (
            <FlatList
              data={visits}
              renderItem={renderVisitItem}
              keyExtractor={item =>
                item._id || item.visitId || Math.random().toString()
              }
              style={styles.table}
              ListEmptyComponent={() => (
                <View style={styles.noDataContainer}>
                  <Text style={styles.noDataText}>No visit history found.</Text>
                </View>
              )}
            />
          )}
        </View>
      </View>

      <ViewBillModal
        isVisible={isViewBillModalVisible}
        onClose={handleCloseViewBillModal}
        billData={selectedBillData}
        client={client}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111',
    paddingHorizontal: width * 0.02,
    paddingTop: height * 0.03,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: height * 0.02,
    borderBottomWidth: 1,
    borderBottomColor: '#3C3C3C',
    marginBottom: height * 0.02,
  },
  backButton: {
    paddingRight: width * 0.02,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    color: '#fff',
    fontSize: width * 0.025,
    fontWeight: 'bold',
  },
  clientInfoText: {
    color: '#A9A9A9',
    fontSize: width * 0.012,
    marginTop: height * 0.005,
  },
  contentArea: {
    flex: 1,
    paddingHorizontal: width * 0.005,
  },
  tableContainer: {
    flex: 1,
    backgroundColor: '#1F1F1F',
    borderRadius: 8,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: height * 0.015,
    backgroundColor: '#2B2B2B',
    paddingHorizontal: width * 0.01,
    borderBottomWidth: 1,
    borderBottomColor: '#3C3C3C',
  },
  visitIdHeader: {
    flex: 1.2,
    color: '#fff',
    fontWeight: '600',
    fontSize: width * 0.014,
    textAlign: 'left',
  },
  visitDateHeader: {
    flex: 1.2,
    color: '#fff',
    fontWeight: '600',
    fontSize: width * 0.014,
    textAlign: 'left',
  },
  visitServiceHeader: {
    flex: 1,
    color: '#fff',
    fontWeight: '600',
    fontSize: width * 0.014,
    textAlign: 'left',
  },
  visitAmountHeader: {
    flex: 1,
    color: '#fff',
    fontWeight: '600',
    fontSize: width * 0.014,
    textAlign: 'left',
  },
  visitActionHeader: {
    flex: 1,
    color: '#fff',
    fontWeight: '600',
    fontSize: width * 0.014,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    paddingVertical: height * 0.015,
    paddingHorizontal: width * 0.01,
    alignItems: 'center',
  },
  visitIdCell: {
    flex: 1.2,
    color: '#fff',
    fontSize: width * 0.013,
    textAlign: 'left',
  },
  visitDateCell: {
    flex: 1.2,
    color: '#fff',
    fontSize: width * 0.013,
    textAlign: 'left',
  },
  visitServiceCountCell: {
    flex: 1,
    color: '#fff',
    fontSize: width * 0.013,
    textAlign: 'left',
  },
  visitAmountCell: {
    flex: 1,
    color: '#FFD700',
    fontSize: width * 0.013,
    textAlign: 'left',
    fontWeight: 'bold',
  },
  visitActionCell: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#A98C27',
    fontSize: width * 0.013,
    marginLeft: 5,
  },
  table: {
    flex: 1,
  },
  noDataContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noDataText: {
    color: '#A9A9A9',
    fontSize: width * 0.02,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#A9A9A9',
    marginTop: 10,
    fontSize: width * 0.02,
  },
});

export default ClientHistoryScreen;
