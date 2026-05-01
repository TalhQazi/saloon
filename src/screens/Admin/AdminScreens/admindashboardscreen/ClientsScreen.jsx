// src/screens/admin/ClientsScreen/ClientsScreen.jsx

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Dimensions,
  Platform,
  Alert,
  ActivityIndicator,
  ScrollView, // ⬅️ Add ScrollView for vertical scrolling
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import NotificationBell from '../../../../components/NotificationBell';
import DateTimePicker from '@react-native-community/datetimepicker';
import moment from 'moment';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';
import { ADMIN_CART_UPDATED_EVENT, getAdminCartItems } from '../../../../utils/adminCart';

import AddClientModal from './modals/AddClientModal';
import DeleteClientModal from './modals/DeleteClientModal';
import { BASE_URL } from '../../../../api/config';

const { width, height } = Dimensions.get('window');

const userProfileImagePlaceholder = require('../../../../assets/images/logo.png');

// 🔐 Retrieve full admin object from AsyncStorage
const getAuthenticatedAdmin = async () => {
  try {
    const data = await AsyncStorage.getItem('adminAuth');
    if (data) {
      const parsed = JSON.parse(data);
      if (parsed.token && parsed.isAuthenticated) {
        return {
          token: parsed.token,
          name: parsed.admin?.name || 'Guest',
          profilePicture:
            parsed.admin?.profilePicture || parsed.admin?.livePicture,
        };
      }
    }
    return null;
  } catch (error) {
    console.error('Failed to get authenticated admin:', error);
    return null;
  }
};

const loadAdminCartCount = async setCartCount => {
  try {
    const items = await getAdminCartItems();
    setCartCount(Array.isArray(items) ? items.length : 0);
  } catch (err) {
    console.error('[ClientsScreen] Failed to load admin cart count:', err);
    setCartCount(0);
  }
};

// Base URL for your API
const API_BASE_URL = BASE_URL;

// ✅ Fetch all clients from API
const fetchClients = async token => {
  if (!token) throw new Error('No authentication token found');

  try {
    const response = await axios.get(`${API_BASE_URL}/clients/all`, {
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

// ✅ POST new client to API
const createClient = async (clientData, token) => {
  if (!token) throw new Error('No authentication token');

  try {
    const response = await axios.post(
      `${API_BASE_URL}/clients/add`,
      clientData,
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
      'Error creating client:',
      error.response?.data || error.message,
    );
    throw error;
  }
};

// ✅ DELETE client from API
const deleteClient = async (clientId, token) => {
  if (!token) throw new Error('No authentication token');

  try {
    await axios.delete(`${API_BASE_URL}/clients/${clientId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return true;
  } catch (error) {
    console.error(
      'Error deleting client:',
      error.response?.data || error.message,
    );
    throw error;
  }
};

const ClientsScreen = () => {
  const navigation = useNavigation();

  // ✅ State for admin profile
  const [authenticatedAdmin, setAuthenticatedAdmin] = useState(null);
  const userName = authenticatedAdmin?.name || 'Guest';
  const userProfileImage = authenticatedAdmin?.profilePicture;
  const profileImageSource = userProfileImage
    ? { uri: userProfileImage }
    : userProfileImagePlaceholder;

  const [searchText, setSearchText] = useState('');
  const [clientsData, setClientsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilterDate, setSelectedFilterDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [cartCount, setCartCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      loadAdminCartCount(setCartCount);
    }, []),
  );

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener(
      ADMIN_CART_UPDATED_EVENT,
      payload => {
        const nextCount = payload?.count;
        if (typeof nextCount === 'number') {
          setCartCount(nextCount);
        } else {
          loadAdminCartCount(setCartCount);
        }
      },
    );

    return () => {
      subscription?.remove?.();
    };
  }, []);

  const [isAddClientModalVisible, setIsAddClientModalVisible] = useState(false);
  const [isDeleteClientModalVisible, setIsDeleteClientModalVisible] =
    useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  // ✅ Load admin profile on mount
  useEffect(() => {
    const loadAdminProfile = async () => {
      const admin = await getAuthenticatedAdmin();
      setAuthenticatedAdmin(admin);
    };
    loadAdminProfile();
  }, []);

  // 🔁 Load clients from API
  const loadClients = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const token = authenticatedAdmin?.token;
      if (!token) {
        Alert.alert('Authentication Error', 'Please log in again.');
        return;
      }
      const data = await fetchClients(token);
      setClientsData(data);
    } catch (error) {
      Alert.alert(
        'Error',
        'Failed to load clients. Please check your connection.',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (authenticatedAdmin?.token) {
      loadClients();
    }
  }, [authenticatedAdmin?.token]);

  // 🔍 Search handler
  const handleSearch = text => {
    setSearchText(text);
  };

  // 🔀 Filter clients based on search and date
  const filteredClients = useMemo(() => {
    let result = [...clientsData];

    // Search filter
    if (searchText.trim().length > 0) {
      const query = searchText.toLowerCase().trim();
      result = result.filter(
        client =>
          client.name?.toLowerCase().includes(query) ||
          client.clientId?.toLowerCase().includes(query) ||
          client.phoneNumber?.toLowerCase().includes(query),
      );
    }

    // Date filter
    if (selectedFilterDate) {
      const formattedDate = moment(selectedFilterDate).format('YYYY-MM-DD');
      result = result.filter(
        client =>
          moment(client.createdAt).format('YYYY-MM-DD') === formattedDate,
      );
    }

    return result;
  }, [clientsData, searchText, selectedFilterDate]);

  // Pagination derivations
  useEffect(() => {
    setPage(1);
  }, [clientsData, searchText, selectedFilterDate]);

  const totalPages = useMemo(() => {
    const t = Math.ceil((filteredClients?.length || 0) / PAGE_SIZE) || 1;
    return t;
  }, [filteredClients]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
    if (page < 1) setPage(1);
  }, [page, totalPages]);

  const paginatedClients = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredClients.slice(start, start + PAGE_SIZE);
  }, [filteredClients, page]);

  // 🔄 Refresh handler
  const onRefresh = async () => {
    setRefreshing(true);
    await loadClients(false);
  };

  // ✅ Open Add Modal
  const handleOpenAddClientModal = () => {
    setIsAddClientModalVisible(true);
  };

  const handleCloseAddClientModal = () => {
    setIsAddClientModalVisible(false);
  };

  const handleSaveNewClient = async clientDataFromModal => {
    try {
      // The AddClientModal already called the backend to add the client.
      // Here we just refresh the list from the server so the new client appears.
      await loadClients(false);
      handleCloseAddClientModal();
    } catch (error) {
      Alert.alert('Error', 'Failed to add client. Please try again.');
    }
  };

  // 👁️ View client history
  const handleViewClientHistory = client => {
    navigation.navigate('ClientHistory', { client });
  };

  // 🗑️ Delete client
  const handleOpenDeleteClientModal = client => {
    setSelectedClient(client);
    setIsDeleteClientModalVisible(true);
  };

  const handleCloseDeleteClientModal = () => {
    setIsDeleteClientModalVisible(false);
    setSelectedClient(null);
  };

  const handleDeleteClientConfirm = async () => {
    if (!selectedClient || !authenticatedAdmin?.token) return;

    try {
      await deleteClient(selectedClient._id, authenticatedAdmin.token);
      await loadClients(false);
      Alert.alert(
        'Success',
        `Client ${selectedClient.name} deleted successfully.`,
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to delete client. Please try again.');
    } finally {
      handleCloseDeleteClientModal();
    }
  };

  // 📅 Date picker handlers
  const onDateChange = (event, date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (date) {
      setSelectedFilterDate(date);
    } else {
      setSelectedFilterDate(null);
    }
  };

  const handleOpenDatePicker = () => {
    setShowDatePicker(true);
  };

  const handleClearDateFilter = () => {
    setSelectedFilterDate(null);
  };

  // 🖼️ Render client item
  const renderClientItem = ({ item, index }) => (
    <View
      style={[styles.row, index % 2 === 0 ? styles.rowEven : styles.rowOdd]}
    >
      <Text style={styles.clientIdCell}>{item.clientId}</Text>
      <Text style={styles.clientNameCell}>{item.name}</Text>
      <Text style={styles.clientPhoneCell}>{item.phoneNumber}</Text>
      <Text style={styles.clientVisitsCell}>{item.totalVisits || 0}</Text>
      {/* <Text style={styles.clientSpentCell}>{item.totalSpent || 0} PKR</Text> */}
      <Text style={styles.clientComingDateCell}>
        {item.lastVisit
          ? moment(item.lastVisit).format('MMM DD, YYYY')
          : 'Never'}
      </Text>
      <View style={styles.clientActionCell}>
        <TouchableOpacity
          onPress={() => handleViewClientHistory(item)}
          style={styles.actionButton}
        >
          <Ionicons name="eye-outline" size={18} color="#A9A9A9" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handleOpenDeleteClientModal(item)}
          style={styles.actionButton}
        >
          <Ionicons name="trash-outline" size={18} color="#ff5555" />
        </TouchableOpacity>
      </View>
    </View>
  );

  // 🚀 Loading state
  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#A98C27" />
        <Text style={styles.loadingText}>Loading clients...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ✅ DYNAMIC HEADER — Same as AdvanceSalary screen */}
      <View style={styles.header}>
        <View style={styles.headerCenter}>
          <View style={styles.userInfo}>
            <Text style={styles.greeting}>Hello 👋</Text>
            <Text style={styles.userName}>{userName}</Text>
          </View>
          <View style={styles.searchBarContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search clients..."
              placeholderTextColor="#A9A9A9"
              value={searchText}
              onChangeText={handleSearch}
              autoCapitalize="none"
            />
            <Ionicons
              name="search"
              size={width * 0.027}
              color="#A9A9A9"
              style={styles.searchIcon}
            />
          </View>
        </View>

        <View style={styles.headerRight}>
           <TouchableOpacity
              style={styles.cartButton}
              onPress={() => navigation.navigate('AdminCartScreen')}
            >
              <View style={styles.cartIconWrapper}>
                <Ionicons
                  name="cart-outline"
                  size={width * 0.039}
                  color="#fff"
                />
                {cartCount > 0 && (
                  <View style={styles.cartBadge}>
                    <Text style={styles.cartBadgeText} numberOfLines={1}>
                      {cartCount}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          <NotificationBell containerStyle={styles.notificationButton} />
          <Image
            source={profileImageSource}
            style={styles.profileImage}
            resizeMode="cover"
          />
        </View>
      </View>

      {/* Content */}
      <View style={styles.contentArea}>
        <Text style={styles.screenTitle}>Clients</Text>

        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity
            style={styles.datePickerButton}
            onPress={handleOpenDatePicker}
          >
            <Ionicons
              name="calendar-outline"
              size={20}
              color="#fff"
              style={{ marginRight: 8 }}
            />
            <Text style={styles.datePickerButtonText}>
              {selectedFilterDate
                ? moment(selectedFilterDate).format('MMM DD, YYYY')
                : 'Select Date'}
            </Text>
            {selectedFilterDate && (
              <TouchableOpacity
                onPress={handleClearDateFilter}
                style={{ marginLeft: 5 }}
              >
                <Ionicons name="close-circle" size={18} color="#fff" />
              </TouchableOpacity>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.addClientButton}
            onPress={handleOpenAddClientModal}
          >
            <Ionicons
              name="add-circle-outline"
              size={20}
              color="#fff"
              style={{ marginRight: 8 }}
            />
            <Text style={styles.addClientButtonText}>
              Add Direct New Client
            </Text>
          </TouchableOpacity>
        </View>

        {/* Table */}
        {/* ⬅️ Add horizontal ScrollView */}
        <ScrollView
          horizontal={true}
          contentContainerStyle={styles.tableScrollContainer}
        >
          <View style={styles.tableContainer}>
            {/* Table Header */}
            <View style={styles.tableHeader}>
              <Text style={styles.clientIdHeader}>Client ID</Text>
              <Text style={styles.clientNameHeader}>Name</Text>
              <Text style={styles.clientPhoneHeader}>Phone</Text>
              <Text style={styles.clientVisitsHeader}>Visits</Text>
              {/* <Text style={styles.clientSpentHeader}>Total Spent</Text> */}
              <Text style={styles.clientComingDateHeader}>Last Visit</Text>
              <Text style={styles.clientActionHeader}>Action</Text>
            </View>

            {/* Table Body - FlatList */}
            <FlatList
              data={paginatedClients}
              renderItem={renderClientItem}
              keyExtractor={item => item._id}
              ListEmptyComponent={
                <View style={styles.noDataContainer}>
                  <Text style={styles.noDataText}>
                    {searchText || selectedFilterDate
                      ? 'No matching clients found.'
                      : 'No clients yet.'}
                  </Text>
                </View>
              }
              refreshing={refreshing}
              onRefresh={onRefresh}
            />
          </View>
        </ScrollView>

        {/* Pagination Controls */}
        <View style={styles.paginationContainer}>
          <TouchableOpacity
            style={[styles.pageButton, page === 1 && styles.pageButtonDisabled]}
            onPress={() => page > 1 && setPage(p => p - 1)}
            disabled={page === 1}
          >
            <Text style={styles.pageButtonText}>Prev</Text>
          </TouchableOpacity>
          <View style={styles.pageNumbersContainer}>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
              <TouchableOpacity
                key={`pg-${n}`}
                style={[styles.pageNumber, n === page && styles.pageNumberActive]}
                onPress={() => setPage(n)}
              >
                <Text style={[styles.pageNumberText, n === page && styles.pageNumberTextActive]}>
                  {n}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            style={[styles.pageButton, page === totalPages && styles.pageButtonDisabled]}
            onPress={() => page < totalPages && setPage(p => p + 1)}
            disabled={page === totalPages}
          >
            <Text style={styles.pageButtonText}>Next</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={selectedFilterDate || new Date()}
          mode="date"
          display="default"
          onChange={onDateChange}
        />
      )}

      {/* Modals */}
      <AddClientModal
        isVisible={isAddClientModalVisible}
        onClose={handleCloseAddClientModal}
        onSave={handleSaveNewClient}
      />

      <DeleteClientModal
        isVisible={isDeleteClientModalVisible}
        onClose={handleCloseDeleteClientModal}
        onDeleteConfirm={handleDeleteClientConfirm}
        clientDetails={selectedClient}
      />
    </View>
  );
};

// ✅ Styles (Updated for fixed widths and scrolling)
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e1f20ff',
    paddingHorizontal: width * 0.02,
    paddingTop: height * 0.03,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: height * 0.02,
    borderBottomWidth: 1,
    borderBottomColor: '#3C3C3C',
    marginBottom: height * 0.02,
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: width * 0.001,
  },
  userInfo: {
    marginRight: width * 0.16,
  },
  greeting: {
    fontSize: width * 0.019,
    color: '#A9A9A9',
  },
  userName: {
    fontSize: width * 0.03,
    fontWeight: 'bold',
    color: '#fff',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2D32',
    borderRadius: 10,
    paddingHorizontal: width * 0.006,
    flex: 1,
    minWidth: width * 0.22,
    maxWidth: width * 0.36,
    height: height * 0.04,
    borderWidth: 1,
    borderColor: '#4A4A4A',
  },
  searchIcon: {
    marginRight: width * 0.01,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: width * 0.018,
    paddingVertical: 0,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: width * 0.01,
  },
  cartButton: {
    backgroundColor: '#2A2D32',
    borderRadius: 8,
    padding: width * 0.000001,
    marginRight: width * 0.015,
    height: width * 0.058,
    width: width * 0.058,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartIconWrapper: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadge: {
    position: 'absolute',
    top: -height * 0.008,
    right: -width * 0.01,
    minWidth: width * 0.022,
    height: width * 0.022,
    borderRadius: width * 0.011,
    paddingHorizontal: width * 0.004,
    backgroundColor: '#ff3b30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadgeText: {
    color: '#fff',
    fontSize: width * 0.012,
    fontWeight: '700',
  },
  notificationButton: {
    backgroundColor: '#2A2D32',
    borderRadius: 9,
    padding: 0,
    marginRight: width * 0.015,
    height: width * 0.058,
    width: width * 0.058,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImage: {
    width: width * 0.058,
    height: width * 0.058,
    borderRadius: (width * 0.058) / 2,
  },
  contentArea: {
    flex: 1,
    paddingHorizontal: width * 0.005,
  },
  screenTitle: {
    color: '#fff',
    fontSize: width * 0.029,
    fontWeight: '600',
    marginBottom: -height*0.03,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: height * 0.02,
    borderBottomWidth: 1,
    borderBottomColor: '#3C3C3C',
    paddingBottom: height * 0.03,
  },
  addClientButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#A98C27',
    paddingVertical: height * 0.012,
    paddingHorizontal: width * 0.025,
    borderRadius: 8,
    marginLeft: width * 0.01,
  },
  addClientButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: width * 0.014,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2D32',
    paddingVertical: height * 0.012,
    paddingHorizontal: width * 0.025,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4A4A4A',
  },
  datePickerButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: width * 0.014,
  },
  tableContainer: {
    flex: 1,
    backgroundColor: '#1F1F1F',
    borderRadius: 8,
    // No overflow hidden here since the ScrollView will handle it
  },
  // ⬅️ New style for the horizontal scroll view container
  tableScrollContainer: {
    flexGrow: 1,
    // Add minWidth to prevent the content from collapsing.
    // This value should be large enough to accommodate all columns.
    minWidth: 200,
  },
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: height * 0.015,
    backgroundColor: '#1e1f20ff',
    paddingHorizontal: width * 0.01,
    borderBottomWidth: 1,
    borderBottomColor: '#3C3C3C',
  },
  // ⬅️ Fixed widths for headers
  clientIdHeader: {
    width: 90, // Fixed width for Client ID
    color: '#fff',
    fontWeight: '600',
    fontSize: width * 0.014,
    textAlign: 'left',
  },
  clientNameHeader: {
    width: 80, // Fixed width for Name
    color: '#fff',
    fontWeight: '600',
    fontSize: width * 0.014,
    textAlign: 'left',
  },
  clientPhoneHeader: {
    width: 80, // Fixed width for Phone
    color: '#fff',
    fontWeight: '600',
    fontSize: width * 0.014,
    textAlign: 'left',
  },
  clientVisitsHeader: {
    width: 50, // Fixed width for Visits
    color: '#fff',
    fontWeight: '600',
    fontSize: width * 0.014,
    textAlign: 'center',
  },
  clientSpentHeader: {
    width: 80, // Fixed width for Total Spent
    color: '#fff',
    fontWeight: '600',
    fontSize: width * 0.014,
    textAlign: 'left',
  },
  clientComingDateHeader: {
    width: 80, // Fixed width for Last Visit
    color: '#fff',
    fontWeight: '600',
    fontSize: width * 0.014,
    textAlign: 'left',
  },
  clientActionHeader: {
    width: 80, // Fixed width for Action
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
  rowEven: {
    backgroundColor: '#2E2E2E',
  },
  rowOdd: {
    backgroundColor: '#1F1F1F',
  },
  // ⬅️ Fixed widths for cells to match headers
  clientIdCell: {
    width: 90, // Match header width
    color: '#fff',
    fontSize: width * 0.013,
    textAlign: 'left',
  },
  clientNameCell: {
    width: 80, // Match header width
    color: '#fff',
    fontSize: width * 0.013,
    textAlign: 'left',
    marginLeft: width * 0.010,
  },
  clientPhoneCell: {
    width: 80, // Match header width
    color: '#fff',
    fontSize: width * 0.013,
    marginLeft: width * 0.010,
    textAlign: 'left',
  },
  clientVisitsCell: {
    width: 80, // Match header width
    color: '#fff',
    fontSize: width * 0.013,
    marginLeft: width * 0.010,
    textAlign: 'center',
  },
  clientSpentCell: {
    width: 80, // Match header width
    color: '#fff',
    fontSize: width * 0.013,
    textAlign: 'left',
  },
  clientComingDateCell: {
    width: 80, // Match header width
    color: '#fff',
    fontSize: width * 0.013,
    textAlign: 'left',
  },
  clientActionCell: {
    width: 80, // Match header width
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginLeft: width * 0.010,
  },
  actionButton: {
    padding: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#4A4A4A',
    
  },
  // The FlatList itself should no longer have flex: 1, since the outer ScrollView handles the height
  table: {
    // Note: No flex property here. The FlatList will scroll vertically within its parent container.
  },
  noDataContainer: {
    padding: 20,
    alignItems: 'center',
    width: 1000, // Match the total width of the table
  },
  noDataText: {
    color: '#A9A9A9',
    fontSize: width * 0.02,
  },
  paginationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: height * 0.02,
    gap: width * 0.01,
  },
  pageButton: {
    backgroundColor: '#2A2D32',
    paddingVertical: height * 0.012,
    paddingHorizontal: width * 0.02,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4A4A4A',
  },
  pageButtonDisabled: { opacity: 0.5 },
  pageButtonText: { color: '#fff', fontWeight: '600', fontSize: width * 0.014 },
  pageNumbersContainer: { flexDirection: 'row', alignItems: 'center', gap: width * 0.005 },
  pageNumber: {
    backgroundColor: '#2A2D32',
    paddingVertical: height * 0.008,
    paddingHorizontal: width * 0.012,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#4A4A4A',
    marginHorizontal: width * 0.002,
  },
  pageNumberActive: { backgroundColor: '#A98C27', borderColor: '#A98C27' },
  pageNumberText: { color: '#fff', fontSize: width * 0.014 },
  pageNumberTextActive: { color: '#fff', fontWeight: '700' },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111',
  },
  loadingText: {
    color: '#A9A9A9',
    fontSize: width * 0.02,
    marginTop: 10,
  },
});

export default ClientsScreen;
