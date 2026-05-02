// src/screens/admin/CartProductScreen/CartProductScreen.jsx

import React, { useState, useEffect, useCallback } from 'react';
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
import AddCustomServiceModal from './AddCustomServiceModal'; // Reusing this modal, can be renamed for clarity
import PrintBillModal from './PrintBillModal';

// Mock images, replace with your actual product images
import hairWaxImage from '../../../../assets/images/pedicure.jpeg';
import hairSprayImage from '../../../../assets/images/pedicure.jpeg';
import faceMaskImage from '../../../../assets/images/pedicure.jpeg';
import userProfileImage from '../../../../assets/images/pedicure.jpeg';

// Import necessary modules for the new functionality
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../../../../api/config';
import { getAuthToken as getUnifiedAuthToken } from '../../../../utils/authUtils';
import { useNotifications } from '../../../../context/NotificationContext';
import {
  addClient as apiAddClient,
  searchClients as apiSearchClients,
} from '../../../../api/clients';

const { width } = Dimensions.get('window');
const scale = width / 1280;
const normalize = size =>
  Math.round(PixelRatio.roundToNearestPixel(size * scale));

const getProductImageSource = productName => {
  switch (productName) {
    case 'Hair Wax':
      return hairWaxImage;
    case 'Hair Spray':
      return hairSprayImage;
    case 'Face Mask':
      return faceMaskImage;
    default:
      return userProfileImage;
  }
};

// Notify admins when a bill is generated (Products)
const sendBillNotification = async ({ clientName, phoneNumber, totalPrice, billNumber }) => {
  try {
    const token = await getAuthToken();
    if (!token) {
      console.log('[Notify][Bill][Product] No auth token, skipping');
      return null;
    }
    const title = 'Bill Generated';
    const message = `Bill ${billNumber} generated for ${clientName} (${phoneNumber}) - PKR ${Number(totalPrice || 0).toFixed(2)}`;
    console.log('[Notify][Bill][Product] POST /notifications payload ->', { title, message, type: 'bill_generated', recipientType: 'both' });
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
    console.log('[Notify][Bill][Product] Response <-', resp?.status, resp?.data);
    return resp?.data;
  } catch (e) {
    console.log('⚠️ Failed to send bill notification (products):', e?.response?.status, e?.response?.data || e?.message);
    throw e;
  }
};

// Use unified token resolver (admin or manager)
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

// Ensure a client exists by phone; prefer official API helpers
// ✅ IMPROVED ensureClientByPhone function (CartServiceScreen ki tarah)
const ensureClientByPhone = async ({ name, phoneNumber }) => {
  const trimmedPhone = (phoneNumber || '').trim();
  const trimmedName = (name || '').trim() || 'Guest';

  console.log('🔍 Ensuring client exists:', {
    name: trimmedName,
    phone: trimmedPhone,
  });

  // 1) Normalize phone number for comparison
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

  // 2) Search by phone first with better error handling
  try {
    console.log('🔎 Searching for existing client...');
    const searchRes = await apiSearchClients(trimmedPhone);
    console.log('📋 Search response:', searchRes);

    const clientsList = searchRes?.clients || searchRes || [];
    const found = clientsList.find(client => {
      const clientPhoneNormalized = normalizePhone(client.phoneNumber);
      console.log(
        '🔍 Comparing:',
        clientPhoneNormalized,
        'vs',
        normalizedInputPhone,
      );
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

  // 3) Create if not found with better error handling
  try {
    console.log('➕ Creating new client...');
    const created = await apiAddClient({
      name: trimmedName,
      phoneNumber: trimmedPhone,
    });
    console.log('📋 Create response:', created);

    const newClient = created?.client || created;
    if (newClient && newClient._id) {
      console.log('✅ New client created successfully:', newClient);
      return newClient;
    } else {
      throw new Error('Invalid client creation response');
    }
  } catch (createErr) {
    console.error('❌ Client creation failed:', createErr);

    // Final attempt to search again
    try {
      console.log('🔎 Final search attempt...');
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

    // Temporary client as fallback
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

const CartProductScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { userName, isLoading } = useUser();
  const selectedProductFromRoute =
    route.params?.productToAdd || route.params?.selectedProduct;
  const sourcePanel = route.params?.sourcePanel || 'manager';

  const [products, setProducts] = useState([]);
  const [checkoutModalVisible, setCheckoutModalVisible] = useState(false);
  const [customProductModalVisible, setCustomProductModalVisible] =
    useState(false);
  const [printBillModalVisible, setPrintBillModalVisible] = useState(false);
  const [billData, setBillData] = useState(null);
  const [gst, setGst] = useState('');
  const [discount, setDiscount] = useState('');

  // New state variables for client and beautician (same as CartServiceScreen)
  const [clientName, setClientName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
 // const [beautician, setBeautician] = useState('');
  const [notes, setNotes] = useState('');
  const [allClients, setAllClients] = useState([]);
  const [isClientRegistered, setIsClientRegistered] = useState(false);
  const [clientFetchLoading, setClientFetchLoading] = useState(true);
  const [registeredClient, setRegisteredClient] = useState(null);
  const [businessDay, setBusinessDay] = useState(new Date().toISOString());

  // Logic to allow editing name only for new clients (same as CartServiceScreen)
  const canEditName = !isClientRegistered;
  // Allow editing all fields if a client is found or if a phone number and name are entered for a new client
  const canEditOtherFields =
    isClientRegistered ||
    (phoneNumber?.trim().length > 0 && clientName?.trim().length > 0);

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

  useEffect(() => {
    const productToAdd =
      route.params?.productToAdd || route.params?.selectedProduct;
    if (productToAdd) {
      setProducts(prevProducts => {
        const isAlreadyAdded = prevProducts.some(
          p => (p.id || p._id) === (productToAdd.id || productToAdd._id),
        );
        if (!isAlreadyAdded) {
          Alert.alert(
            'Success',
            `${productToAdd.name} has been added to the cart.`,
          );
          return [...prevProducts, productToAdd];
        }
        return prevProducts;
      });
      navigation.setParams({
        productToAdd: undefined,
        selectedProduct: undefined,
      });
    }
  }, [route.params?.productToAdd, route.params?.selectedProduct, navigation]);

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
              targetTab: 'Marketplace',
            });
          } else {
            navigation.navigate('ManagerHomeScreen', {
              targetTab: 'Marketplace',
            });
          }
        }
        return true;
      },
    );
    return () => backHandler.remove();
  }, [navigation, sourcePanel]);

  // Updated function to handle phone number search and new client flow (same as CartServiceScreen)
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

  const subtotal = products.reduce(
    (sum, product) => sum + (Number(product.price) || 0),
    0,
  );
  const gstAmount = parseFloat(gst) || 0;
  const discountAmount = parseFloat(discount) || 0;
  const totalPrice = subtotal + gstAmount - discountAmount;

  const handleSaveCustomProduct = newProductData => {
    const newProduct = {
      ...newProductData,
      price: Number(newProductData.price),
      id: Date.now(),
      name: newProductData.name, // Make sure name is correctly passed
      brand: 'Custom',
    };
    setProducts(prevProducts => [...prevProducts, newProduct]);
    setCustomProductModalVisible(false);
  };

  const handleDeleteProduct = productId => {
    setProducts(prevProducts =>
      prevProducts.filter(product => (product.id || product._id) !== productId),
    );
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

      console.log('🚀 Starting PRODUCT bill process...');
      console.log('📦 Products in cart:', products);

      // Ensure or create client using improved logic
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
        // Continue with temporary client
        createdClient = {
          _id: `temp-${Date.now()}`,
          name: clientName.trim(),
          phoneNumber: phoneNumber.trim(),
          isTemporary: true,
        };
      }

      // Update local state
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

      // ✅ FIXED: Add visitData nesting for backend compatibility (CartServiceScreen ki tarah)
      const historyPayload = {
        visitData: {
          services: products.map(p => ({
            name: p.name || p.subServiceName,
            price: Number(p.price),
          })),
          totalBill: totalPrice,
          subtotal: subtotal,
          discount: discountAmount,
         // specialist: beautician, // Direct, not nested
          notes: notes, // Direct, not nested
          date: new Date(businessDay).toISOString(),
          billNumber: billNumber,
          clientName: createdClient?.name || clientName.trim(),
          phoneNumber: createdClient?.phoneNumber || phoneNumber.trim(),
        },
      };

      console.log('📦 FLAT STRUCTURE Bill payload:', historyPayload);

      console.log('📦 UPDATED Product Bill payload prepared:', historyPayload);

      // ✅ Save to history once (only if client is not temporary)
      if (createdClient?._id && !createdClient.isTemporary) {
        try {
          await addBillToClientHistory(createdClient._id, historyPayload);
          console.log('✅ Product bill saved to client history');
        } catch (historyError) {
          console.error('❌ Product bill history save failed:', historyError);
          console.log('Skipping history save due to error...');
        }
      } else {
        console.log('Skipping history save for temporary client...');
      }

      // ✅ Bill data for display (yeh waisa hi rahega - without visitData nesting)
      setBillData({
        client: createdClient,
        notes,
       // beautician,
        services: products.map(p => ({
          name: p.name,
          price: Number(p.price),
          subServiceName: p.name,
          quantity: p.quantity || 1,
        })),
        products: products,
        subtotal,
        gst: gstAmount,
        discount: discountAmount,
        totalPrice,
        clientName: createdClient?.name || clientName.trim(),
        phoneNumber: createdClient?.phoneNumber || phoneNumber.trim(),
        billNumber: billNumber,
        billType: 'product_sale',
        businessDay: businessDay,
      });

      setCheckoutModalVisible(false);
      setPrintBillModalVisible(true);

      // Trigger immediate notification refresh so bell badge updates instantly
      if (typeof refreshNotifications === 'function') {
        refreshNotifications();
      }

      // Notification is now handled server-side to avoid duplicates

      // Reset form
      setProducts([]);
      setNotes('');
     // setBeautician('');
      setGst('');
      setDiscount('');
      setPhoneNumber('');
      setClientName('');
      setRegisteredClient(null);
      setIsClientRegistered(false);

      console.log('🎉 Product bill process completed successfully');
    } catch (error) {
      console.error('💥 Error in handleOpenPrintBill:', error);
      Alert.alert(
        'Error',
        `Failed to create product bill: ${error.message || 'Unknown error'}`,
      );

      // Fallback: Basic bill data set karein
      setBillData({
        client: { name: clientName.trim(), phoneNumber: phoneNumber.trim() },
        notes,
       // beautician,
        services: products.map(p => ({
          name: p.name,
          price: Number(p.price),
          subServiceName: p.name,
        })),
        subtotal,
        gst: gstAmount,
        discount: discountAmount,
        totalPrice,
        clientName: clientName.trim(),
        phoneNumber: phoneNumber.trim(),
        billNumber: `BILL-${Date.now()}`,
        businessDay: businessDay,
      });
      setCheckoutModalVisible(false);
      setPrintBillModalVisible(true);
    }
  };
  const handleCheckout = () => {
    if (products.length === 0) {
      Alert.alert(
        'Empty Cart',
        'Please add at least one product to the cart before checking out.',
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
          activeTab="Marketplace"
          onSelect={handleSidebarSelect}
        />
      ) : (
        <ManagerSidebar
          navigation={navigation}
          userName={userName}
          activeTab="Marketplace"
          onSelect={handleSidebarSelect}
        />
      )}
      <View style={styles.mainContent}>
        <StandardHeader showBackButton={true} sourcePanel={sourcePanel} />
        <ScrollView style={styles.contentArea}>
          <ScrollView horizontal style={styles.horizontalCardsContainer}>
            {products.length > 0 ? (
              products.map((product, index) => (
                <View
                  key={product.id || product._id || index}
                  style={styles.profileCard}
                >
                  <View style={styles.profileImageWrapper}>
                    <Image
                      source={
                        typeof product.image === 'string'
                          ? { uri: product.image }
                          : typeof product.productDetailImage === 'string'
                          ? { uri: product.productDetailImage }
                          : getProductImageSource(product.name)
                      }
                      style={styles.profileCardImage}
                    />
                    <View style={styles.onlineIndicator} />
                  </View>
                  <View style={styles.profileTextWrapper}>
                    <Text style={styles.profileName}>{product.name}</Text>
                    <Text style={styles.cardDescription}>
                      {product.description || 'N/A'}
                    </Text>
                    <Text style={styles.profileService}>
                      Brand: {product.brand || 'N/A'}
                    </Text>
                  </View>
                  <View style={styles.cardPriceContainer}>
                    <Text style={styles.cardPrice}>
                      PKR {Number(product.price || 0).toFixed(2)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() =>
                      handleDeleteProduct(product.id || product._id)
                    }
                  >
                    <Ionicons
                      name="close-circle-outline"
                      size={normalize(30)}
                      color="#FF6347"
                    />
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <Text style={styles.noProductsText}>
                No products added to cart.
              </Text>
            )}
          </ScrollView>
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
              {/* <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Beautician</Text>
                <TextInput
                  style={styles.inputField}
                  placeholder="Add Beautician Name"
                  placeholderTextColor="#666"
                  value={beautician}
                  onChangeText={setBeautician}
                  editable={canEditOtherFields}
                />
              </View> */}
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
            onPress={() => setCustomProductModalVisible(true)}
            disabled={!canEditOtherFields}
          >
            <Text
              style={[
                styles.addCustomServiceButtonText,
                !canEditOtherFields && { color: '#666' },
              ]}
            >
              + Add Custom Product
            </Text>
          </TouchableOpacity>
        </ScrollView>
        <View style={styles.checkoutFooter}>
          <View style={styles.totalInfo}>
            <Text style={styles.totalLabel}>
              Total ({products.length} Products)
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
        servicesCount={products.length}
        onConfirmOrder={handleOpenPrintBill}
      />
      <AddCustomServiceModal
        isVisible={customProductModalVisible}
        onClose={() => setCustomProductModalVisible(false)}
        onServiceSave={handleSaveCustomProduct}
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
    width: normalize(500), // Adjusted for horizontal scroll
    justifyContent: 'space-between',
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
  noProductsText: {
    color: '#A9A9A9',
    fontSize: normalize(22),
    textAlign: 'center',
    width: '100%',
    marginTop: normalize(50),
  },
  deleteButton: {
    marginLeft: normalize(15),
  },
  disabledInput: {
    backgroundColor: '#3A3A3A',
    color: '#666',
  },
  disabledButton: {
    backgroundColor: '#4A4A4A',
  },
});

export default CartProductScreen;
