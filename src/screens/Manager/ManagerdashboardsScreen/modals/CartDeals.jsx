// src/screens/admin/CartDealsScreen/CartDealsScreen.jsx

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Image,
  TextInput,
  ScrollView,
  PixelRatio,
  Alert,
  BackHandler,
  ActivityIndicator,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useUser } from '../../../../context/UserContext';
import ManagerSidebar from '../../../../components/ManagerSidebar';
import AdminSidebar from '../../../../components/Sidebar';
import { useNavigation, useRoute } from '@react-navigation/native';
import StandardHeader from '../../../../components/StandardHeader';
import CheckoutModal from './CheckoutModal';
import AddCustomDealModal from './AddCustomServiceModal'; // Reusing modal
import PrintBillModal from './PrintBillModal';

// API imports
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../../../../api/config';
import { getAuthToken as getUnifiedAuthToken } from '../../../../utils/authUtils';
import { useNotifications } from '../../../../context/NotificationContext';
import {
  addClient as apiAddClient,
  searchClients as apiSearchClients,
} from '../../../../api/clients';

// Mock images
import userProfileImagePlaceholder from '../../../../assets/images/foundation.jpeg';
import bridalDealImage from '../../../../assets/images/makeup.jpeg';
import keratinImage from '../../../../assets/images/hair.jpeg';
import studentDiscountImage from '../../../../assets/images/product.jpeg';
import colorBundleImage from '../../../../assets/images/eyeshadow.jpeg';

const { width } = Dimensions.get('window');
const scale = width / 1280;
const normalize = size =>
  Math.round(PixelRatio.roundToNearestPixel(size * scale));

const getDealImageFallback = dealName => {
  switch (dealName) {
    case 'Bridal Deal & Spa':
      return bridalDealImage;
    case 'Keratin Treatment':
      return keratinImage;
    case 'Student Discounts':
      return studentDiscountImage;
    case 'Colour Bundle':
      return colorBundleImage;
    case 'Complete Hair Care':
      return colorBundleImage;
    case 'Spa Day Package':
      return studentDiscountImage;
    default:
      return userProfileImagePlaceholder;
  }
};

// Notify admins when a bill is generated (Deals)
const sendBillNotification = async ({ clientName, phoneNumber, totalPrice, billNumber }) => {
  try {
    const token = await getAuthToken();
    if (!token) {
      console.log('[Notify][Bill][Deals] No auth token, skipping');
      return null;
    }
    const title = 'Bill Generated';
    const message = `Bill ${billNumber} generated for ${clientName} (${phoneNumber}) - PKR ${Number(totalPrice || 0).toFixed(2)}`;
    console.log('[Notify][Bill][Deals] POST /notifications payload ->', { title, message, type: 'bill_generated', recipientType: 'both' });
    const resp = await axios.post(
      `${BASE_URL}/notifications/create`,
      {
        title,
        message,
        type: 'bill_generated',
        recipientType: 'both',
        priority: 'medium',
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );
    console.log('[Notify][Bill][Deals] Response <-', resp?.status, resp?.data);
    return resp?.data;
  } catch (e) {
    console.log('⚠️ Failed to send bill notification (deals):', e?.response?.status, e?.response?.data || e?.message);
    throw e;
  }
};

// Use unified token resolver
const getAuthToken = async () => await getUnifiedAuthToken();

const fetchClients = async () => {
  const token = await getAuthToken();
  if (!token) throw new Error('No authentication token found');

  try {
    const response = await axios.get(`${BASE_URL}/clients/all`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    return response.data.clients || [];
  } catch (error) {
    console.error(
      'Error fetching clients:',
      error.response?.data || error.message,
    );
    throw error;
  }
};

// ✅ UPDATED: Use the enhanced ensureClientByPhone from CartServiceScreen
const ensureClientByPhone = async ({ name, phoneNumber }) => {
  const trimmedPhone = (phoneNumber || '').trim();
  const trimmedName = (name || '').trim() || 'Guest';

  console.log('🔍 Ensuring client exists:', {
    name: trimmedName,
    phone: trimmedPhone,
  });

  // Normalize phone number for comparison
  const normalizePhone = phone => {
    if (!phone) return '';
    let cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '92' + cleanPhone.substring(1);
    }
    if (!cleanPhone.startsWith('92')) {
      cleanPhone = '92' + cleanPhone;
    }
    return cleanPhone;
  };

  const normalizedInputPhone = normalizePhone(trimmedPhone);
  console.log('📞 Normalized phone:', normalizedInputPhone);

  // 1) Search by phone
  try {
    console.log('🔎 Searching for existing client...');
    const searchRes = await apiSearchClients(trimmedPhone);
    const clientsList = searchRes?.clients || searchRes || [];
    const found = clientsList.find(client => {
      const clientPhoneNormalized = normalizePhone(client.phoneNumber);
      return clientPhoneNormalized === normalizedInputPhone;
    });

    if (found) {
      console.log('✅ Existing client found:', found);
      return found;
    }
  } catch (e) {
    console.log(
      '⚠️ Search failed, attempting to create new client:',
      e.message,
    );
  }

  // 2) Create if not found
  try {
    console.log('➕ Creating new client...');
    const created = await apiAddClient({
      name: trimmedName,
      phoneNumber: trimmedPhone,
    });
    const newClient = created?.client || created;
    if (newClient && newClient._id) {
      console.log('✅ New client created successfully:', newClient);
      return newClient;
    } else {
      console.log('❌ Client creation response invalid:', created);
      throw new Error('Invalid client creation response');
    }
  } catch (createErr) {
    console.error('❌ Client creation failed:', createErr);

    // Final search attempt
    try {
      const searchRes2 = await apiSearchClients(trimmedPhone);
      const clientsList2 = searchRes2?.clients || searchRes2 || [];
      const found2 = clientsList2.find(client => {
        const clientPhoneNormalized = normalizePhone(client.phoneNumber);
        return clientPhoneNormalized === normalizedInputPhone;
      });
      if (found2) {
        console.log('✅ Client found in final search:', found2);
        return found2;
      }
    } catch (e2) {
      console.error('❌ Final search also failed:', e2);
    }

    // Fallback to temporary client
    console.log('🔄 Creating temporary client object');
    return {
      _id: `temp-${Date.now()}`,
      name: trimmedName,
      phoneNumber: trimmedPhone,
      isTemporary: true,
    };
  }
};

const addBillToClientHistory = async (clientId, billData) => {
  const token = await getAuthToken();
  if (!token) {
    throw new Error('No authentication token found');
  }

  try {
    const response = await axios.post(
      `${BASE_URL}/clients/${clientId}/visit`,
      billData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      },
    );
    return response.data;
  } catch (error) {
    console.error(
      'Error adding bill history:',
      error.response?.data || error.message,
    );
    throw error;
  }
};

const CartDealsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { userName, isLoading } = useUser();
  const sourcePanel = route.params?.sourcePanel || 'manager';

  const [dealsInCart, setDealsInCart] = useState(route.params?.cartItems || []);
  const [checkoutModalVisible, setCheckoutModalVisible] = useState(false);
  const [customDealModalVisible, setCustomDealModalVisible] = useState(false);
  const [printBillModalVisible, setPrintBillModalVisible] = useState(false);
  const [billData, setBillData] = useState(null);
  const [gst, setGst] = useState('');
  const [discount, setDiscount] = useState('');

  const [clientName, setClientName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [beautician, setBeautician] = useState('');
  const [notes, setNotes] = useState('');
  const [allClients, setAllClients] = useState([]);
  const [isClientRegistered, setIsClientRegistered] = useState(false);
  const [clientFetchLoading, setClientFetchLoading] = useState(true);
  const [registeredClient, setRegisteredClient] = useState(null);
  const [businessDay, setBusinessDay] = useState(new Date().toISOString());

  const canEditName = !isClientRegistered;
  const canEditOtherFields =
    isClientRegistered ||
    (phoneNumber?.trim().length > 0 && clientName?.trim().length > 0);

  useEffect(() => {
    const loadClients = async () => {
      try {
        const clients = await fetchClients();
        setAllClients(clients);
      } catch (error) {
        Alert.alert('Error', 'Failed to load client data for search.');
      } finally {
        setClientFetchLoading(false);
      }
    };
    const fetchBusinessDay = async () => {
      try {
        const token = await getAuthToken();
        if (token) {
          const response = await axios.get(`${BASE_URL}/settings/business-day`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (response.data && response.data.businessDay) {
            setBusinessDay(response.data.businessDay);
            await AsyncStorage.setItem('businessDay', response.data.businessDay);
          }
        }
      } catch (err) {
        console.error('Error fetching business day:', err);
        const stored = await AsyncStorage.getItem('businessDay');
        if (stored) {
          setBusinessDay(stored);
        }
      }
    };

    loadClients();
    fetchBusinessDay();
  }, []);

  const handleSidebarSelect = useCallback(
    tabName => {
      if (sourcePanel === 'admin') {
        // Use replace so we don't stack multiple AdminMainDashboard screens
        if (navigation && typeof navigation.replace === 'function') {
          navigation.replace('AdminMainDashboard', { targetTab: tabName });
        } else {
          navigation.navigate('AdminMainDashboard', { targetTab: tabName });
        }
      } else {
        // Use replace so we don't stack multiple ManagerHomeScreen screens
        if (navigation && typeof navigation.replace === 'function') {
          navigation.replace('ManagerHomeScreen', { targetTab: tabName });
        } else {
          navigation.navigate('ManagerHomeScreen', { targetTab: tabName });
        }
      }
    },
    [navigation, sourcePanel],
  );

  useEffect(() => {
    if (route.params?.cartItems) {
      setDealsInCart(route.params.cartItems);
    }
  }, [route.params?.cartItems]);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (sourcePanel === 'admin') {
          if (navigation && typeof navigation.replace === 'function') {
            navigation.replace('AdminMainDashboard');
          } else {
            navigation.navigate('AdminMainDashboard');
          }
        } else {
          if (navigation && typeof navigation.replace === 'function') {
            navigation.replace('ManagerHomeScreen', {
              targetTab: 'Deals',
            });
          } else {
            navigation.navigate('ManagerHomeScreen', {
              targetTab: 'Deals',
            });
          }
        }
        return true;
      },
    );
    return () => backHandler.remove();
  }, [navigation, sourcePanel]);

  const handlePhoneNumberSearch = async () => {
    const trimmedNumber = (phoneNumber || '').trim();
    if (!trimmedNumber) {
      setClientName('');
      setRegisteredClient(null);
      setIsClientRegistered(false);
      return;
    }

    try {
      const foundClient = allClients.find(
        client =>
          client.phoneNumber === trimmedNumber ||
          client.phoneNumber === `+92${trimmedNumber.substring(1)}`,
      );

      if (foundClient) {
        setClientName(foundClient.name || '');
        setRegisteredClient(foundClient);
        setIsClientRegistered(true);
        Alert.alert('Client Found', `Welcome back, ${foundClient.name}.`);
      } else {
        setRegisteredClient(null);
        setIsClientRegistered(false);
        setClientName('');
        Alert.alert(
          'New Client',
          'This phone number is not registered. Please enter a name to add this client automatically.',
        );
      }
    } catch (error) {
      console.error('Error during client search:', error);
      Alert.alert('Error', 'Failed to search for client. Please try again.');
    }
  };

  const subtotal = dealsInCart.reduce(
    (sum, deal) => sum + (Number(deal.price) || 0),
    0,
  );
  const gstAmount = parseFloat(gst) || 0;
  const discountAmount = parseFloat(discount) || 0;
  const totalPrice = subtotal + gstAmount - discountAmount;

  const handleSaveCustomDeal = newDealData => {
    const newDealWithId = {
      ...newDealData,
      id: `custom-${Date.now()}`,
      dealName: newDealData.name,
      price: Number(newDealData.price),
      description: newDealData.description,
      dealImage: newDealData.image,
    };
    setDealsInCart(currentDeals => [...currentDeals, newDealWithId]);
    setCustomDealModalVisible(false);
    Alert.alert('Success', `${newDealData.name} has been added to the cart.`);
  };

  const handleDeleteDeal = dealId => {
    setDealsInCart(dealsInCart.filter(deal => deal.id !== dealId));
    Alert.alert('Removed', 'Deal has been removed from the cart.');
  };

  const { refreshNotifications } = (useNotifications && useNotifications()) || {};

  const handleOpenPrintBill = async () => {
    try {
      if (!phoneNumber?.trim() || !clientName?.trim()) {
        Alert.alert(
          'Missing Info',
          'Please enter phone number and client name.',
        );
        return;
      }

      console.log('🚀 Starting bill process for deals...');

      let createdClient;
      try {
        createdClient =
          registeredClient ||
          (await ensureClientByPhone({
            name: clientName.trim(),
            phoneNumber: phoneNumber.trim(),
          }));
        console.log('✅ Client resolved:', createdClient);
      } catch (clientError) {
        console.error('❌ Client resolution failed:', clientError);
        createdClient = {
          _id: `temp-${Date.now()}`,
          name: clientName.trim(),
          phoneNumber: phoneNumber.trim(),
          isTemporary: true,
        };
        console.log('🔄 Using temporary client:', createdClient);
      }

      if (createdClient && !createdClient.isTemporary) {
        setRegisteredClient(createdClient);
        setIsClientRegistered(true);
        setAllClients(prev => {
          const exists = prev.some(c => c._id === createdClient._id);
          return exists
            ? prev.map(c => (c._id === createdClient._id ? createdClient : c))
            : [createdClient, ...prev];
        });
      }

      const billNumber = `BILL-${Date.now()}`;

      // ✅ Use visitData nesting for backend compatibility
      const historyPayload = {
        visitData: {
          services: dealsInCart.map(d => ({
            name: d.dealName || d.name,
            price: Number(d.price),
          })),
          totalBill: totalPrice,
          subtotal: subtotal,
          discount: discountAmount,
          specialist: beautician, // Direct, not nested
          notes: notes, // Direct, not nested
          date: new Date(businessDay).toISOString(),
          billNumber: billNumber,
          clientName: createdClient?.name || clientName.trim(),
          phoneNumber: createdClient?.phoneNumber || phoneNumber.trim(),
        },
      };

      console.log('📦 FLAT STRUCTURE Bill payload:', historyPayload);

      console.log('📦 Deal bill payload prepared:', historyPayload);

      // Send once
      if (createdClient?._id && !createdClient.isTemporary) {
        try {
          await addBillToClientHistory(createdClient._id, historyPayload);
          console.log('✅ Deal bill saved to client history');
        } catch (historyError) {
          console.error('❌ Bill history save failed, but continuing:', historyError);
        }
      } else {
        console.log('ℹ️ Skipping history save for temporary client. createdClient:', createdClient);
      }

      // ✅ billData for PrintBillModal (without visitData nesting)
      setBillData({
        client: createdClient,
        notes,
        beautician,
        services: dealsInCart.map(deal => ({
          ...deal,
          name: deal.dealName || deal.name,
          subServiceName: deal.dealName || deal.name, // for consistency
        })),
        subtotal,
        gst: gstAmount,
        discount: discountAmount,
        totalPrice,
        clientName: createdClient?.name || clientName.trim(),
        phoneNumber: createdClient?.phoneNumber || phoneNumber.trim(),
        billNumber: billNumber,
      });

      setCheckoutModalVisible(false);
      setPrintBillModalVisible(true);

      // Trigger immediate notification refresh so bell badge updates instantly
      if (typeof refreshNotifications === 'function') {
        refreshNotifications();
      }

      // Notification is now handled server-side to avoid duplicates

      // Reset form
      setDealsInCart([]);
      setNotes('');
      setBeautician('');
      setGst('');
      setDiscount('');
      setPhoneNumber('');
      setClientName('');
      setRegisteredClient(null);
      setIsClientRegistered(false);

      console.log('🎉 Deal bill process completed successfully');
    } catch (error) {
      console.error('💥 Error in handleOpenPrintBill:', error);
      Alert.alert(
        'Error',
        `Failed to create bill: ${
          error.message || 'Unknown error'
        }\n\nBut you can still print the bill.`,
      );

      // Allow printing even on error
      setBillData({
        client: { name: clientName.trim(), phoneNumber: phoneNumber.trim() },
        notes,
        beautician,
        services: dealsInCart.map(deal => ({
          ...deal,
          name: deal.dealName || deal.name,
        })),
        subtotal,
        gst: gstAmount,
        discount: discountAmount,
        totalPrice,
        clientName: clientName.trim(),
        phoneNumber: phoneNumber.trim(),
        billNumber: `BILL-${Date.now()}`,
      });
      setCheckoutModalVisible(false);
      setPrintBillModalVisible(true);
    }
  };

  const handleCheckout = () => {
    if (dealsInCart.length === 0) {
      Alert.alert(
        'Empty Cart',
        'Please add at least one deal to the cart before checking out.',
      );
      return;
    }
    if (!phoneNumber?.trim()) {
      Alert.alert('Missing Phone', 'Please enter a phone number.');
      return;
    }
    if (!clientName?.trim()) {
      Alert.alert('Missing Name', 'Please enter client name.');
      return;
    }
    setCheckoutModalVisible(true);
  };

  const getDealImageSource = deal => {
    if (
      typeof deal.dealImage === 'string' &&
      (deal.dealImage.startsWith('http') || deal.dealImage.startsWith('data:'))
    ) {
      return { uri: deal.dealImage };
    }
    if (typeof deal.image === 'string') {
      return { uri: deal.image };
    }
    if (typeof deal.dealImage === 'number') {
      return deal.dealImage;
    }
    return getDealImageFallback(deal.dealName);
  };

  if (isLoading || clientFetchLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#A98C27" />
        <Text style={styles.loadingText}>Loading data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {sourcePanel === 'admin' ? (
        <AdminSidebar
          navigation={navigation}
          activeTab="Deals"
          onSelect={handleSidebarSelect}
        />
      ) : (
        <ManagerSidebar
          navigation={navigation}
          userName={userName}
          activeTab="Deals"
          onSelect={handleSidebarSelect}
        />
      )}
      <View style={styles.mainContent}>
        <StandardHeader showBackButton={true} sourcePanel={sourcePanel} />
        <ScrollView style={styles.contentArea}>
          {dealsInCart.length > 0 ? (
            <ScrollView horizontal style={styles.horizontalCardsContainer}>
              {dealsInCart.map((deal, index) => (
                <View key={deal.id || index} style={styles.profileCard}>
                  <View style={styles.profileImageWrapper}>
                    <Image
                      source={getDealImageSource(deal)}
                      style={styles.profileCardImage}
                    />
                    <View style={styles.onlineIndicator} />
                  </View>
                  <View style={styles.profileTextWrapper}>
                    <Text style={styles.profileName}>
                      {deal.dealName || deal.name || 'N/A'}
                    </Text>
                    <Text style={styles.profileService}>
                      {deal.description || 'N/A'}
                    </Text>
                  </View>
                  <View style={styles.cardPriceContainer}>
                    <Text style={styles.cardDescription}>Deal</Text>
                    <Text style={styles.cardPrice}>
                      PKR {Number(deal.price || 0).toFixed(2)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeleteDeal(deal.id)}
                  >
                    <Ionicons
                      name="close-circle-outline"
                      size={normalize(30)}
                      color="#FF6347"
                    />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          ) : (
            <Text style={styles.noServicesText}>No deals added to cart.</Text>
          )}
          <View style={styles.inputSection}>
            <View style={styles.inputRow}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Phone Number</Text>
                <TextInput
                  style={styles.inputField}
                  placeholder="e.g., 03001234567 or +923001234567"
                  placeholderTextColor="#666"
                  keyboardType="phone-pad"
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  onBlur={handlePhoneNumberSearch}
                />
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Client Name</Text>
                <TextInput
                  style={[
                    styles.inputField,
                    !canEditName && styles.disabledInput,
                  ]}
                  placeholder="Client Name"
                  placeholderTextColor="#666"
                  value={clientName}
                  onChangeText={setClientName}
                  editable={canEditName}
                />
              </View>
            </View>
            <View style={styles.inputRow}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Discount</Text>
                <TextInput
                  style={styles.inputField}
                  placeholder="Add Discount"
                  placeholderTextColor="#666"
                  keyboardType="numeric"
                  value={discount}
                  onChangeText={setDiscount}
                  editable={canEditOtherFields}
                />
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Beautician</Text>
                <TextInput
                  style={styles.inputField}
                  placeholder="Add Beautician Name"
                  placeholderTextColor="#666"
                  value={beautician}
                  onChangeText={setBeautician}
                  editable={canEditOtherFields}
                />
              </View>
            </View>
            <View style={styles.notesContainer}>
              <Text style={styles.inputLabel}>Notes</Text>
              <TextInput
                style={[styles.inputField, styles.notesInput]}
                placeholder="Type your notes here"
                placeholderTextColor="#666"
                multiline={true}
                numberOfLines={4}
                value={notes}
                onChangeText={setNotes}
                editable={canEditOtherFields}
              />
            </View>
          </View>
          <TouchableOpacity
            style={[
              styles.addCustomServiceButton,
              !canEditOtherFields && styles.disabledButton,
            ]}
            onPress={() => setCustomDealModalVisible(true)}
            disabled={!canEditOtherFields}
          >
            <Text
              style={[
                styles.addCustomServiceButtonText,
                !canEditOtherFields && { color: '#666' },
              ]}
            >
              + Add Custom Deal
            </Text>
          </TouchableOpacity>
        </ScrollView>
        <View style={styles.checkoutFooter}>
          <View style={styles.totalInfo}>
            <Text style={styles.totalLabel}>
              Total ({dealsInCart.length} Deals)
            </Text>
            <Text style={styles.totalPrice}>PKR {totalPrice.toFixed(2)}</Text>
          </View>
          <TouchableOpacity
            style={[
              styles.checkoutButton,
              !canEditOtherFields && styles.disabledButton,
            ]}
            onPress={handleCheckout}
            disabled={!canEditOtherFields}
          >
            <Text style={styles.checkoutButtonText}>Checkout</Text>
          </TouchableOpacity>
        </View>
      </View>
      <CheckoutModal
        isVisible={checkoutModalVisible}
        onClose={() => setCheckoutModalVisible(false)}
        subtotal={subtotal}
        gst={gstAmount}
        discount={discountAmount}
        servicesCount={dealsInCart.length}
        beautician={beautician}
        onConfirmOrder={handleOpenPrintBill}
      />
      <AddCustomDealModal
        isVisible={customDealModalVisible}
        onClose={() => setCustomDealModalVisible(false)}
        onServiceSave={handleSaveCustomDeal}
      />
      <PrintBillModal
        isVisible={printBillModalVisible}
        onClose={() => setPrintBillModalVisible(false)}
        billData={billData}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#161719',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#161719',
  },
  loadingText: {
    color: '#fff',
    fontSize: normalize(20),
  },
  mainContent: {
    flex: 1,
    paddingTop: normalize(30),
    paddingHorizontal: normalize(40),
    backgroundColor: '#161719',
  },
  contentArea: {
    flex: 1,
  },
  horizontalCardsContainer: {
    flexDirection: 'row',
    marginBottom: normalize(40),
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2D32',
    borderRadius: normalize(10),
    padding: normalize(25),
    marginRight: normalize(15),
    width: normalize(500),
    justifyContent: 'space-between',
    position: 'relative',
  },
  profileImageWrapper: {
    position: 'relative',
    marginRight: normalize(15),
  },
  profileCardImage: {
    width: normalize(100),
    height: normalize(100),
    borderRadius: normalize(12),
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: normalize(10),
    height: normalize(10),
    borderRadius: normalize(5),
    backgroundColor: '#34C759',
    borderWidth: normalize(2),
    borderColor: '#2A2D32',
  },
  profileTextWrapper: {
    flex: 1,
    marginRight: normalize(10),
  },
  profileName: {
    fontSize: normalize(27),
    fontWeight: 'bold',
    color: '#fff',
  },
  profileService: {
    fontSize: normalize(19),
    color: '#888',
    marginTop: normalize(5),
  },
  cardPriceContainer: {
    alignItems: 'flex-end',
  },
  cardDescription: {
    color: '#ccc',
    fontSize: normalize(18),
  },
  cardPrice: {
    color: '#FFD700',
    fontSize: normalize(21),
    fontWeight: 'bold',
    marginTop: normalize(5),
  },
  inputSection: {
    backgroundColor: '#2A2D32',
    borderRadius: normalize(10),
    padding: normalize(20),
    marginBottom: normalize(20),
  },
  inputRow: {
    flexDirection: 'row',
    gap: normalize(15),
    marginBottom: normalize(50),
  },
  inputContainer: {
    flex: 1,
  },
  inputLabel: {
    fontSize: normalize(38),
    color: '#faf9f6ff',
    marginBottom: normalize(16),
    fontWeight: '600',
  },
  inputField: {
    backgroundColor: '#424449ff',
    borderRadius: normalize(8),
    paddingHorizontal: normalize(19),
    paddingVertical: normalize(15),
    height: normalize(80),
    color: '#fff',
    fontSize: normalize(32),
  },
  notesContainer: {
    marginBottom: normalize(50),
  },
  notesInput: {
    height: normalize(500),
    fontSize: normalize(35),
    textAlignVertical: 'top',
  },
  addCustomServiceButton: {
    backgroundColor: '#2A2D32',
    borderRadius: normalize(8),
    borderWidth: 1,
    borderColor: '#A98C27',
    paddingVertical: normalize(12),
    paddingHorizontal: normalize(20),
    alignItems: 'center',
    marginBottom: normalize(20),
    alignSelf: 'center',
    minWidth: width * 0.2,
    maxWidth: width * 0.4,
  },
  addCustomServiceButtonText: {
    fontSize: normalize(16),
    color: '#A98C27',
    fontWeight: '600',
  },
  checkoutFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2A2D32',
    borderRadius: normalize(10),
    paddingHorizontal: normalize(20),
    paddingVertical: normalize(20),
    marginTop: 'auto',
    marginBottom: normalize(50),
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  totalInfo: {
    flexDirection: 'column',
  },
  totalLabel: {
    fontSize: normalize(19),
    color: '#888',
  },
  totalPrice: {
    fontSize: normalize(24),
    fontWeight: 'bold',
    color: '#FFD700',
    marginTop: normalize(5),
  },
  checkoutButton: {
    backgroundColor: '#A98C27',
    paddingHorizontal: normalize(40),
    paddingVertical: normalize(15),
    borderRadius: normalize(10),
    minWidth: width * 0.15,
    maxWidth: width * 0.25,
  },
  checkoutButtonText: {
    fontSize: normalize(18),
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  noServicesText: {
    color: '#A9A9A9',
    fontSize: normalize(22),
    textAlign: 'center',
    width: '100%',
    marginTop: normalize(50),
  },
  deleteButton: {
    position: 'absolute',
    top: normalize(10),
    right: normalize(10),
  },
  disabledInput: {
    backgroundColor: '#3A3A3A',
    color: '#666',
  },
  disabledButton: {
    backgroundColor: '#4A4A4A',
  },
});

export default CartDealsScreen;
