// src/screens/Admin/AdminScreens/admindashboardscreen/AdvanceSalary.jsx

import React, { useState, useMemo, useCallback, useEffect } from 'react';
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
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import NotificationBell from '../../../../components/NotificationBell';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import moment from 'moment';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';
import { ADMIN_CART_UPDATED_EVENT, getAdminCartItems } from '../../../../utils/adminCart';

import AddAdvanceSalaryModal from './modals/AddAdvanceSalaryModal';
import ViewAdvanceSalaryModal from './modals/ViewAdvanceSalaryModal';
import {
  getAllAdminAdvanceSalary,
  deleteAdminAdvanceSalary,
} from '../../../../api/adminAdvanceSalaryService';

const { width, height } = Dimensions.get('window');
const userProfileImagePlaceholder = require('../../../../assets/images/logo.png');

const getDisplayImageSource = image => {
  if (
    typeof image === 'string' &&
    (image.startsWith('http://') ||
      image.startsWith('https://') ||
      image.startsWith('file://') ||
      image.startsWith('content://') ||
      image.startsWith('data:image'))
  ) {
    return { uri: image };
  }
  return userProfileImagePlaceholder;
};

const loadAdminCartCount = async setCartCount => {
  try {
    const items = await getAdminCartItems();
    setCartCount(Array.isArray(items) ? items.length : 0);
  } catch (err) {
    console.error('[AdvanceSalary] Failed to load admin cart count:', err);
    setCartCount(0);
  }
};

// ====================================================================
// ✅ NEW HELPER FUNCTION TO GENERATE FRONTEND ID
// This function determines the ID to be displayed in the table.
// ====================================================================
const generateDisplayId = (employeeId, role, index) => {
  // 1. Prioritize a clear, short ID if available and prefixed
  if (
    employeeId &&
    (employeeId.startsWith('ADM') ||
      employeeId.startsWith('MGR') ||
      employeeId.startsWith('EMP'))
  ) {
    // If it's a short, prefixed ID (e.g., ADM1234), use it as is.
    // Assuming backend IDs are longer (like UUID or MongoDB Object ID)
    if (employeeId.length < 15) {
      return employeeId.toUpperCase();
    }
  }

  // 2. Fallback: Create a new ID using the role prefix and index
  const prefix = role.substring(0, 3).toUpperCase();
  // Use a fallback number if employeeId is long or missing
  const numberPart = String(index + 1).padStart(3, '0');

  return prefix + numberPart;
};
// ====================================================================

const AdvanceSalary = () => {
  const navigation = useNavigation();
  // const route = useRoute();
  // const { authenticatedAdmin } = route.params || {};
  const [authenticatedAdmin, setAuthenticatedAdmin] = useState(null);
  const [cartCount, setCartCount] = useState(0);

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
      return null;
    }
  };

  useEffect(() => {
    (async () => {
      const admin = await getAuthenticatedAdmin();
      if (admin) {
        setAuthenticatedAdmin(admin);
      } else {
        Alert.alert('Authentication Error', 'Please login again.', [
          { text: 'OK', onPress: () => navigation.replace('AdminLogin') },
        ]);
      }
    })();
  }, []);

  const userName = authenticatedAdmin?.name || 'Guest';
  const userProfileImage = authenticatedAdmin?.profilePicture;
  const profileImageSource = getDisplayImageSource(userProfileImage);

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

  const [searchText, setSearchText] = useState('');
  const [advanceSalaries, setAdvanceSalaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [employees, setEmployees] = useState([]);

  const [selectedFilterDate, setSelectedFilterDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const [isAddAdvanceSalaryModalVisible, setIsAddAdvanceSalaryModalVisible] =
    useState(false);
  const [isViewAdvanceSalaryModalVisible, setIsViewAdvanceSalaryModalVisible] =
    useState(false);
  const [selectedAdvanceSalary, setSelectedAdvanceSalary] = useState(null);

  // ✅ Define missing modal handlers
  const handleOpenAddAdvanceSalaryModal = () => {
    setIsAddAdvanceSalaryModalVisible(true);
  };

  const handleCloseAddAdvanceSalaryModal = () => {
    setIsAddAdvanceSalaryModalVisible(false);
  };

  const handleSaveNewAdvanceSalary = async () => {
    // After successful add, refresh from backend so data + IDs stay consistent
    await fetchAdvanceSalaryData();
    setIsAddAdvanceSalaryModalVisible(false);
  };

  const handleCloseViewAdvanceSalaryModal = () => {
    setIsViewAdvanceSalaryModalVisible(false);
    setSelectedAdvanceSalary(null);
  };

  const getAuthToken = useCallback(async () => {
    try {
      const authData = await AsyncStorage.getItem('adminAuth');
      if (authData) {
        const { token, isAuthenticated } = JSON.parse(authData);
        if (token && isAuthenticated) {
          return token;
        }
      }
      return null;
    } catch (error) {
      console.error('❌ [AdvanceSalary] Failed to get auth token:', error);
      return null;
    }
  }, []);

  const fetchAdvanceSalaryData = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getAuthToken();
      if (!token) {
        Alert.alert(
          'Authentication Error',
          'No valid token found. Please log in again.',
          [
            {
              text: 'OK',
              onPress: () => navigation.replace('AdminLogin'),
            },
          ]
        );
        setLoading(false);
        setRefreshing(false);
        return;
      }

      console.log('✅ [Admin AdvanceSalary] Authentication verified');
      const response = await getAllAdminAdvanceSalary(token);
      console.log('✅ [Admin AdvanceSalary] API Response:', response);

      // ✅ Handle both { data: [...] } and direct array responses
      const salaryData = Array.isArray(response)
        ? response
        : response?.data || [];

      if (Array.isArray(salaryData)) {
        const transformedData = salaryData.map((item, index) => {
          let role = 'Employee';

          // 1. Determine the Role (using existing logic, added MGR check)
          if (item.role) {
            role =
              item.role.charAt(0).toUpperCase() +
              item.role.slice(1).toLowerCase();
          } else if (item.employeeId?.startsWith('ADM')) {
            role = 'Admin';
          } else if (item.employeeId?.startsWith('MGR')) {
            // Added MGR check
            role = 'Manager';
          } else if (item.employeeId?.startsWith('EMP')) {
            role = 'Employee';
          }

          // 2. ✅ CRITICAL CHANGE: Generate the display-friendly ID
          const displayId = generateDisplayId(item.employeeId, role, index);

          const amount = parseFloat(item.amount) || 0;
          return {
            // Use the calculated displayId for the table column
            id: displayId,
            name: item.employeeName || item.submittedByName || 'Unknown',
            amount: amount,
            date: moment(item.createdAt).format('MMMM DD, YYYY'),
            image: item.image || null,
            role: role,
            originalData: item,
          };
        });

        console.log(
          '📊 [Admin AdvanceSalary] Transformed data:',
          transformedData,
        );
        setAdvanceSalaries(transformedData);
      } else {
        console.log('⚠️ API response not in expected format:', response);
        setAdvanceSalaries([]);
      }
    } catch (error) {
      console.error('❌ Failed to fetch advance salary data:', error);
      Alert.alert(
        'Error',
        'Failed to load advance salary data. Please try again.',
      );
      setAdvanceSalaries([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getAuthToken]);

  useEffect(() => {
    fetchAdvanceSalaryData();
  }, [fetchAdvanceSalaryData]);

  const onDateChange = (event, date) => {
    setShowDatePicker(Platform.OS === 'ios');
    setSelectedFilterDate(date || null);
  };

  const filteredAdvanceSalaries = useMemo(() => {
    let currentData = [...advanceSalaries];
    if (searchText) {
      currentData = currentData.filter(
        item =>
          item.id.toLowerCase().includes(searchText.toLowerCase()) ||
          item.name.toLowerCase().includes(searchText.toLowerCase()) ||
          item.amount.toString().includes(searchText),
      );
    }
    if (selectedFilterDate) {
      const selectedDateString =
        moment(selectedFilterDate).format('MMMM DD, YYYY');
      currentData = currentData.filter(
        item => item.date === selectedDateString,
      );
    }
    return currentData;
  }, [advanceSalaries, searchText, selectedFilterDate]);

  // Reset to first page when filters/data change
  useEffect(() => {
    setPage(1);
  }, [advanceSalaries, searchText, selectedFilterDate]);

  const totalPages = useMemo(() => {
    const t = Math.ceil((filteredAdvanceSalaries?.length || 0) / PAGE_SIZE) || 1;
    return t;
  }, [filteredAdvanceSalaries]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
    if (page < 1) setPage(1);
  }, [page, totalPages]);

  const paginatedAdvanceSalaries = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredAdvanceSalaries.slice(start, start + PAGE_SIZE);
  }, [filteredAdvanceSalaries, page]);

  const handleOpenViewAdvanceSalaryModal = item => {
    setSelectedAdvanceSalary(item);
    setIsViewAdvanceSalaryModalVisible(true);
  };

  const handleDeleteAdvanceSalary = item => {
    if (!item?.originalData?._id) {
      Alert.alert('Error', 'Unable to delete: missing record ID.');
      return;
    }

    Alert.alert(
      'Delete Advance Salary',
      `Are you sure you want to delete this advance salary record for ${
        item.name || 'this employee'
      }?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAdminAdvanceSalary(item.originalData._id);
              await fetchAdvanceSalaryData();
              Alert.alert('Deleted', 'Advance salary record deleted successfully.');
            } catch (error) {
              console.error('❌ [AdvanceSalary] Failed to delete record:', error);
              Alert.alert(
                'Error',
                error?.response?.data?.message ||
                  'Failed to delete advance salary record. Please try again.',
              );
            }
          },
        },
      ],
    );
  };

  const renderItem = ({ item, index }) => (
    <View
      style={[
        styles.row,
        { backgroundColor: index % 2 === 0 ? '#2E2E2E' : '#1F1F1F' },
      ]}
    >
      <TouchableOpacity
        style={{ flexDirection: 'row', flex: 1 }}
        onPress={() => handleOpenViewAdvanceSalaryModal(item)}
        activeOpacity={0.8}
      >
        <Text style={styles.employeeIdCell}>{item.id}</Text>
        <Text style={styles.nameCell}>{item.name}</Text>
        <Text
          style={[
            styles.roleCell,
            {
              color:
                item.role === 'Admin'
                  ? '#A98C27'
                  : item.role === 'Manager'
                  ? '#4CAF50'
                  : '#FF9800',
            },
          ]}
        >
          {item.role}
        </Text>
        <Text style={styles.amountCell}>
          {typeof item.amount === 'number' && !isNaN(item.amount)
            ? `${item.amount.toLocaleString()} PKR`
            : '0 PKR'}
        </Text>
        <Text style={styles.dateCell}>{item.date}</Text>
      </TouchableOpacity>
      <View style={styles.actionCell}>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteAdvanceSalary(item)}
        >
          <Ionicons
            name="trash-outline"
            size={width * 0.018}
            color="#FF6347"
          />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerCenter}>
          <View style={styles.userInfo}>
            <Text style={styles.greeting}>Hello 👋</Text>
            <Text style={styles.userName}>{userName}</Text>
          </View>
          <View style={styles.searchBarContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search anything"
              placeholderTextColor="#A9A9A9"
              value={searchText}
              onChangeText={setSearchText}
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

      <View style={styles.controls}>
        <Text style={styles.screenTitle}>Advance Salary</Text>
        <View style={styles.filterActions}>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Ionicons
              name="calendar-outline"
              size={16}
              color="#fff"
              style={{ marginRight: 5 }}
            />
            <Text style={styles.filterText}>
              {selectedFilterDate
                ? moment(selectedFilterDate).format('MMM DD, YYYY')
                : 'Date'}
            </Text>
            {selectedFilterDate && (
              <TouchableOpacity
                onPress={() => setSelectedFilterDate(null)}
                style={{ marginLeft: 5 }}
              >
                <Ionicons name="close-circle" size={16} color="#fff" />
              </TouchableOpacity>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.addButton}
            onPress={handleOpenAddAdvanceSalaryModal}
          >
            <Ionicons
              name="add-circle-outline"
              size={16}
              color="#fff"
              style={{ marginRight: 5 }}
            />
            <Text style={styles.addText}>Add Advance Salary</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.tableContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.tableWrapper}>
            <View style={styles.tableHeader}>
              <Text style={styles.employeeIdHeader}>ID</Text>
              <Text style={styles.nameHeader}>Name</Text>
              <Text style={styles.roleHeader}>Role</Text>
              <Text style={styles.amountHeader}>Amount</Text>
              <Text style={styles.dateHeader}>Date</Text>
              <Text style={styles.actionHeader}>Action</Text>
            </View>

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#A98C27" />
                <Text style={styles.loadingText}>
                  Loading advance salary data...
                </Text>
              </View>
            ) : (
              <FlatList
                data={paginatedAdvanceSalaries}
                renderItem={renderItem}
                keyExtractor={(item, index) =>
                  item.id + item.date + index.toString()
                }
                style={styles.table}
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  fetchAdvanceSalaryData();
                }}
                ListEmptyComponent={() => (
                  <View style={styles.noDataContainer}>
                    <Text style={styles.noDataText}>
                      No advance salary records found.
                    </Text>
                  </View>
                )}
              />
            )}
          </View>
        </ScrollView>
      </View>

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

      {showDatePicker && (
        <DateTimePicker
          testID="dateTimePicker"
          value={selectedFilterDate || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onDateChange}
        />
      )}

      <AddAdvanceSalaryModal
        isVisible={isAddAdvanceSalaryModalVisible}
        onClose={handleCloseAddAdvanceSalaryModal}
        onSave={handleSaveNewAdvanceSalary}
      />
      <ViewAdvanceSalaryModal
        isVisible={isViewAdvanceSalaryModalVisible}
        onClose={handleCloseViewAdvanceSalaryModal}
        salaryDetails={selectedAdvanceSalary}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e1f20ff',
    paddingHorizontal: width * 0.02,
    paddingTop: height * 0.02,
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
    justifyContent: 'flex-start',
    marginHorizontal: width * 0.0001,
  },
  userInfo: { marginRight: width * 0.08 },
  greeting: { fontSize: width * 0.019, color: '#A9A9A9' },
  userName: { fontSize: width * 0.03, fontWeight: 'bold', color: '#fff' },
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
  searchIcon: { marginRight: width * 0.01 },
  searchInput: { flex: 1, color: '#fff', fontSize: width * 0.018 },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: width * 0.01,
  },
  notificationButton: {
    backgroundColor: '#2A2D32',
    borderRadius: 9,
    padding: width * 0.000001,
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
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: height * 0.02,
    marginTop: height * 0.01,
    borderBottomWidth: 1,
    borderBottomColor: '#3C3C3C',
    paddingBottom: height * 0.03,
  },
  screenTitle: { color: '#fff', fontSize: width * 0.029, fontWeight: '600' },
  filterActions: { flexDirection: 'row', alignItems: 'center' },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#222',
    paddingVertical: height * 0.01,
    paddingHorizontal: width * 0.015,
    borderRadius: 6,
    marginRight: width * 0.01,
  },
  filterText: { color: '#fff', fontSize: width * 0.019 },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#A98C27',
    paddingVertical: height * 0.01,
    paddingHorizontal: width * 0.015,
    borderRadius: 6,
  },
  addText: { color: '#fff', fontWeight: '600', fontSize: width * 0.014 },
  tableContainer: {
    flex: 1,
    backgroundColor: '#1e1f20ff',
    borderRadius: 5,
    overflow: 'hidden',
  },
  tableWrapper: { backgroundColor: '#1e1f20ff', minWidth: 600 },
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    paddingVertical: height * 0.02,
    backgroundColor: '#2B2B2B',
    paddingHorizontal: width * 0.01,
    minWidth: 500,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    paddingVertical: height * 0.015,
    paddingHorizontal: width * 0.01,
    borderBottomWidth: 1,
    borderBottomColor: '#3C3C3C',
    minWidth: 400,
  },
  employeeIdHeader: {
    width: 70,
    color: '#fff',
    fontWeight: '500',
    fontSize: width * 0.017,
    textAlign: 'left',
  },
  employeeIdCell: {
    width: 70,
    color: '#fff',
    fontSize: width * 0.013,
    textAlign: 'left',
  },
  nameHeader: {
    width: 140,
    color: '#fff',
    fontWeight: '500',
    fontSize: width * 0.017,
    textAlign: 'left',
  },
  nameCell: {
    width: 140,
    color: '#fff',
    fontSize: width * 0.013,
    textAlign: 'left',
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
  roleHeader: {
    width: 90,
    color: '#fff',
    fontWeight: '500',
    fontSize: width * 0.017,
    textAlign: 'left',
  },
  roleCell: {
    width: 90,
    fontSize: width * 0.013,
    textAlign: 'left',
    fontWeight: '500',
  },
  amountHeader: {
    width: 110,
    color: '#fff',
    fontWeight: '500',
    fontSize: width * 0.017,
    textAlign: 'left',
  },
  amountCell: {
    width: 110,
    color: '#fff',
    fontSize: width * 0.013,
    textAlign: 'left',
  },
  dateHeader: {
    width: 130,
    color: '#fff',
    fontWeight: '500',
    fontSize: width * 0.017,
    textAlign: 'left',
  },
  dateCell: {
    width: 130,
    color: '#fff',
    fontSize: width * 0.013,
    textAlign: 'left',
  },
  actionHeader: {
    width: 60,
    color: '#fff',
    fontWeight: '500',
    fontSize: width * 0.017,
    textAlign: 'center',
  },
  actionCell: {
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    paddingHorizontal: width * 0.004,
    paddingVertical: height * 0.004,
  },
  table: { marginTop: height * 0.005, borderRadius: 5, overflow: 'hidden' },
  noDataContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noDataText: { color: '#A9A9A9', fontSize: width * 0.02 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: { color: '#A9A9A9', fontSize: width * 0.02, marginTop: 10 },
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
  pageButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: width * 0.014,
  },
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
});

export default AdvanceSalary;
