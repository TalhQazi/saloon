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
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import NotificationBell from '../../../components/NotificationBell';

// Helper function to truncate username to 6 words maximum
const truncateUsername = username => {
  if (!username) return 'Guest';
  const words = username.split(' ');
  if (words.length <= 6) return username;
  return words.slice(0, 6).join(' ') + '...';
};
import DateTimePicker from '@react-native-community/datetimepicker';
import moment from 'moment';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';

// Import the new modal components..
import AddExpenseModal from './modals/AddExpenseModal';
import ViewExpenseModal from './modals/ViewExpenseModal';

// Import expense API service
import {
  getAllExpenses,
  addExpense,
  testBackendConnection,
} from '../../../api/expenseService';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import {
  MANAGER_CART_UPDATED_EVENT,
  getManagerCartItems,
} from '../../../utils/managerCart';

const { width, height } = Dimensions.get('window');
const isTablet = width >= 768;

// Reuse the same placeholder image
const userProfileImagePlaceholder = require('../../../assets/images/logo.png');
const dummyScreenshotImage = require('../../../assets/images/ss.jpg');

// Helper function for amount formatting
const formatAmount = amount => {
  if (typeof amount !== 'number' || isNaN(amount)) return '0';
  return amount.toLocaleString('en-US');
};

const loadManagerCartCount = async setCartCount => {
  try {
    const items = await getManagerCartItems();
    setCartCount(Array.isArray(items) ? items.length : 0);
  } catch (err) {
    console.error('[ManagerExpenseScreen] Failed to load manager cart count:', err);
    setCartCount(0);
  }
};

const ExpenseScreen = () => {
  const navigation = useNavigation();
  const [searchText, setSearchText] = useState('');
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cartCount, setCartCount] = useState(0);

  const [userData, setUserData] = useState({
    userName: 'Guest',
    userProfileImage: userProfileImagePlaceholder,
  });
  // profileImageSource state को सीधे Image source object के लिए इस्तेमाल करेंगे
  const [profileImageSource, setProfileImageSource] = useState(
    userProfileImagePlaceholder,
  );

  // Date filtering states
  const [selectedFilterDate, setSelectedFilterDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  // States for modals
  const [isAddExpenseModalVisible, setIsAddExpenseModalVisible] =
    useState(false);
  const [isViewExpenseModalVisible, setIsViewExpenseModalVisible] =
    useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);

  // New state for total expenses
  const [totalExpenses, setTotalExpenses] = useState(0);

  useFocusEffect(
    useCallback(() => {
      loadManagerCartCount(setCartCount);
    }, []),
  );

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener(
      MANAGER_CART_UPDATED_EVENT,
      payload => {
        const nextCount = payload?.count;
        if (typeof nextCount === 'number') {
          setCartCount(nextCount);
        } else {
          loadManagerCartCount(setCartCount);
        }
      },
    );

    return () => {
      subscription?.remove?.();
    };
  }, []);

  // Function to handle logout/redirect on auth error (Memoized)
  const handleAuthError = useCallback(() => {
    // 401 FIX: Clear token and navigate to login
    Alert.alert('Authentication Error', 'Please login again.', [
      {
        text: 'OK',
        onPress: () => {
          // You might want to clear AsyncStorage items here before navigating
          AsyncStorage.removeItem('managerAuth');
          AsyncStorage.removeItem('adminAuth');
          navigation.replace('RoleSelection');
        },
      },
    ]);
  }, [navigation]);

  // Function to get auth token from AsyncStorage (Memoized)
  const getAuthToken = useCallback(async () => {
    try {
      const managerAuth = await AsyncStorage.getItem('managerAuth');
      const adminAuth = await AsyncStorage.getItem('adminAuth');

      let token = null;

      if (managerAuth) {
        const parsed = JSON.parse(managerAuth);
        if (parsed.token && parsed.isAuthenticated) {
          token = parsed.token;
        }
      } else if (adminAuth) {
        const parsed = JSON.parse(adminAuth);
        if (parsed.token && parsed.isAuthenticated) {
          token = parsed.token;
        }
      }

      return token;
    } catch (error) {
      console.error('Failed to get auth token from storage:', error);
      // Storage read error should trigger auth error
      handleAuthError();
      return null;
    }
  }, [handleAuthError]);

  // Load user data from AsyncStorage
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const managerAuth = await AsyncStorage.getItem('managerAuth');
        const adminAuth = await AsyncStorage.getItem('adminAuth');

        let parsedData = null;
        let userRole = null;

        if (managerAuth) {
          parsedData = JSON.parse(managerAuth);
          userRole = 'manager';
        } else if (adminAuth) {
          parsedData = JSON.parse(adminAuth);
          userRole = 'admin';
        }

        if (parsedData && parsedData.token && parsedData.isAuthenticated) {
          const user = parsedData[userRole];
          setUserData({
            userName: user.name,
            userProfileImage: user.livePicture, // This is the URL string
          });

          // 💡 IMAGE FIX (RCIImageView Fix): Ensure image source is correctly formatted
          const pictureUrl = user.livePicture;
          if (
            typeof pictureUrl === 'string' &&
            pictureUrl.length > 0 &&
            (pictureUrl.startsWith('http') || pictureUrl.startsWith('file'))
          ) {
            // Network or local URI
            setProfileImageSource({ uri: pictureUrl });
          } else {
            // Local asset require() number
            setProfileImageSource(userProfileImagePlaceholder);
          }
        } else {
          // If no token or not authenticated, trigger auth error
          handleAuthError();
        }
      } catch (e) {
        console.error('Failed to load user data from storage:', e);
        handleAuthError();
      }
    };

    loadUserData();
  }, [handleAuthError]);

  // Fetch expenses from API (Memoized)
  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getAuthToken();

      // 401 FIX: If token is missing here, we stop the API call and trigger error
      if (!token) {
        console.error('Token missing, aborting fetch expenses.');
        handleAuthError(); // Re-check and redirect if token is missing
        setExpenses([]);
        return;
      }

      console.log('Fetching expenses...');
      const response = await getAllExpenses(token);
      console.log('API Response Success:', response.success);

      if (response.success && Array.isArray(response.data)) {
        const transformedExpenses = response.data.map(expense => ({
          id: expense._id || expense.id,
          name: expense.name || 'N/A',
          amount: expense.price ? `${formatAmount(expense.price)} PKR` : 'N/A',
          numericAmount: expense.price,
          description: expense.description || 'No Description',
          date: expense.createdAt
            ? moment(expense.createdAt).format('MMMM DD, YYYY')
            : 'N/A',
          image: expense.image ? { uri: expense.image } : dummyScreenshotImage,
        }));
        setExpenses(transformedExpenses);
      } else if (!response.success && response.status === 401) {
        // Handle 401 from API response explicitly
        handleAuthError();
      } else {
        console.log('API response not in expected format or failed:', response);
        setExpenses([]);
      }
    } catch (error) {
      console.error('Error fetching expenses:', error);
      Alert.alert('Error', 'Failed to load expenses. Please try again.');
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  }, [getAuthToken, handleAuthError]);

  // Load expenses on component mount
  useEffect(() => {
    // Test backend connection first
    testBackendConnection().then(result => {
      console.log(
        'Backend connection test result:',
        result.success ? 'Success' : 'Failure',
      );
      if (result.success) {
        fetchExpenses();
      } else {
        console.error('Backend connection failed:', result.error);
      }
    });
  }, [fetchExpenses]);

  // New useEffect hook to calculate total expenses
  useEffect(() => {
    const total = expenses.reduce((sum, expense) => {
      return sum + (expense.numericAmount || 0);
    }, 0);
    setTotalExpenses(total);
  }, [expenses]);

  // *******************************************************************
  // 💡 DEALS SCREEN AUTH FIX GUIDE:
  // This is the correct way to get the token, apply this same pattern
  // in your DealsScreen's fetch function and useEffect dependency.
  // *******************************************************************
  const getDealsAuthToken = async () => {
    return await getAuthToken(); // Reuse the same token logic
  };
  // In DealsScreen.jsx:
  // const [authToken, setAuthToken] = useState(null);
  // useEffect(() => {
  //    getDealsAuthToken().then(token => setAuthToken(token));
  // }, []);
  // useEffect(() => {
  //    if (authToken) {
  //        fetchDeals(authToken);
  //    }
  // }, [authToken, fetchDeals]); // Use [authToken] as dependency
  // *******************************************************************

  // Handler for date selection
  const onDateChange = (event, date) => {
    setShowDatePicker(Platform.OS === 'ios');

    if (date) {
      setSelectedFilterDate(date);
    } else {
      setSelectedFilterDate(null);
    }
  };

  // Handler to open the date picker
  const handleOpenDatePicker = () => {
    setShowDatePicker(true);
  };

  // Filter expenses based on search text AND selected date
  const filteredExpenses = useMemo(() => {
    let currentData = [...expenses];

    // Apply text search filter
    if (searchText) {
      const lowerCaseSearchText = searchText.toLowerCase();
      currentData = currentData.filter(
        item =>
          item.name.toLowerCase().includes(lowerCaseSearchText) ||
          item.description.toLowerCase().includes(lowerCaseSearchText) ||
          item.date.toLowerCase().includes(lowerCaseSearchText),
      );
    }

    // Apply date filter if a date is selected.
    if (selectedFilterDate) {
      const formattedSelectedDate =
        moment(selectedFilterDate).format('MMMM DD, YYYY');
      currentData = currentData.filter(
        item => item.date === formattedSelectedDate,
      );
    }

    return currentData;
  }, [expenses, searchText, selectedFilterDate]);

  // Reset page when filters/data change
  useEffect(() => {
    setPage(1);
  }, [expenses, searchText, selectedFilterDate]);

  const totalPages = useMemo(() => {
    const t = Math.ceil((filteredExpenses?.length || 0) / PAGE_SIZE) || 1;
    return t;
  }, [filteredExpenses]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
    if (page < 1) setPage(1);
  }, [page, totalPages]);

  const paginatedExpenses = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredExpenses.slice(start, start + PAGE_SIZE);
  }, [filteredExpenses, page]);

  // Handlers for Add Expense Modal
  const handleOpenAddExpenseModal = () => {
    setIsAddExpenseModalVisible(true);
  };

  const handleCloseAddExpenseModal = () => {
    setIsAddExpenseModalVisible(false);
  };

  const handleSaveNewExpense = async newExpensePayload => {
    try {
      const token = await getAuthToken();
      if (!token) {
        return;
      }

      console.log('Adding expense with payload:', newExpensePayload);
      const response = await addExpense(newExpensePayload, token);
      console.log('Add expense response:', response);

      if (response.success) {
        handleCloseAddExpenseModal();

        Alert.alert('Success', 'Expense submitted for approval!', [
          {
            text: 'OK',
            onPress: () => {
              fetchExpenses();
            },
          },
        ]);
      } else {
        const errorMessage = response.message || 'Failed to submit expense';
        console.error('Expense submission failed:', errorMessage);
        Alert.alert('Error', errorMessage);
      }
      handleCloseAddExpenseModal();
    } catch (error) {
      console.error('Error adding expense:', error);
      Alert.alert(
        'Error',
        'Network error. Please check your connection and try again.',
      );
    }
  };

  // Handlers for View Expense Modal
  const handleOpenViewExpenseModal = item => {
    setSelectedExpense(item);
    setIsViewExpenseModalVisible(true);
  };

  const handleCloseViewExpenseModal = () => {
    setIsViewExpenseModalVisible(false);
    setSelectedExpense(null);
  };

  const renderItem = ({ item, index }) => (
    <TouchableOpacity
      style={[
        styles.row,
        { backgroundColor: index % 2 === 0 ? '#2E2E2E' : '#1F1F1F' },
      ]}
      onPress={() => handleOpenViewExpenseModal(item)}
    >
      <Text style={styles.nameCell} numberOfLines={1}>
        {item.name}
      </Text>
      <Text style={styles.amountCell}>{item.amount}</Text>
      <Text style={styles.descriptionCell} numberOfLines={1}>
        {item.description}
      </Text>
      <Text style={styles.dateCell}>{item.date}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header Section */}
      <View style={styles.header}>
        <View style={styles.headerCenter}>
          <View style={styles.userInfo}>
            <Text style={styles.greeting}>Hello 👋</Text>
            <Text style={styles.userName}>
              {truncateUsername(userData.userName)}
            </Text>
          </View>
          <View style={styles.searchBarContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search anything"
              placeholderTextColor="#A9A9A9"
              onChangeText={setSearchText}
              value={searchText}
            />
            <Ionicons
              name="search"
              size={isTablet ? 20 : width * 0.027}
              color="#A9A9A9"
              style={styles.searchIcon}
            />
          </View>
        </View>

        <View style={styles.headerRight}>
           <TouchableOpacity
            style={styles.cartButton}
            onPress={() => navigation.navigate('ManagerCartScreen')}
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
          {/* <NotificationBell containerStyle={styles.notificationButton} /> */}
          <Image
            // profileImageSource now safely contains either a number (require) or {uri: string}
            source={profileImageSource}
            style={styles.profileImage}
            resizeMode="cover"
          />
        </View>
      </View>

      {/* Total Expenses Card */}
      {/* <View style={styles.totalExpensesCard}>
        <Text style={styles.totalExpensesLabel}>Total Expenses</Text>
        <Text style={styles.totalExpensesValue}>
          <Text style={{ fontWeight: 'normal' }}>PKR </Text>
          {formatAmount(totalExpenses)}
        </Text>
      </View> */}

      {/* Controls Section */}
      <View style={styles.controls}>
        <Text style={styles.screenTitle}>Expense</Text>

        <View style={styles.filterActions}>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={handleOpenDatePicker}
          >
            <Ionicons
              name="calendar-outline"
              size={width * 0.02}
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
                <Ionicons
                  name="close-circle"
                  size={width * 0.02}
                  color="#fff"
                />
              </TouchableOpacity>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.addButton}
            onPress={handleOpenAddExpenseModal}
          >
            <Ionicons
              name="add-circle-outline"
              size={width * 0.02}
              color="#fff"
              style={{ marginRight: 5 }}
            />
            <Text style={styles.addText}>Add Expense</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Table Header */}
      <View style={styles.tableHeader}>
        <Text style={styles.nameHeader}>Name</Text>
        <Text style={styles.amountHeader}>Amount</Text>
        <Text style={styles.descriptionHeader}>Description</Text>
        <Text style={styles.dateHeader}>Date</Text>
      </View>

      {/* Table Rows */}
      <FlatList
        data={paginatedExpenses}
        renderItem={renderItem}
        keyExtractor={item => item.id || Math.random().toString()}
        style={styles.table}
        refreshing={loading}
        onRefresh={fetchExpenses}
        ListEmptyComponent={() => (
          <View style={styles.noDataContainer}>
            <Text style={styles.noDataText}>
              {loading ? 'Loading expenses...' : 'No expenses found.'}
            </Text>
          </View>
        )}
      />

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
              <Text
                style={[
                  styles.pageNumberText,
                  n === page && styles.pageNumberTextActive,
                ]}
              >
                {n}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity
          style={[
            styles.pageButton,
            page === totalPages && styles.pageButtonDisabled,
          ]}
          onPress={() => page < totalPages && setPage(p => p + 1)}
          disabled={page === totalPages}
        >
          <Text style={styles.pageButtonText}>Next</Text>
        </TouchableOpacity>
      </View>

      {/* Render the DateTimePicker conditionally */}
      {showDatePicker && (
        <DateTimePicker
          testID="dateTimePicker"
          value={selectedFilterDate || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onDateChange}
        />
      )}

      {/* Render the AddExpenseModal */}
      <AddExpenseModal
        isVisible={isAddExpenseModalVisible}
        onClose={handleCloseAddExpenseModal}
        onSave={handleSaveNewExpense}
      />

      {/* Render the ViewExpenseModal */}
      <ViewExpenseModal
        isVisible={isViewExpenseModalVisible}
        onClose={handleCloseViewExpenseModal}
        expenseDetails={selectedExpense}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111',
    paddingHorizontal: width * 0.02,
    paddingTop: height * 0.02,
  },
  // Header Styles
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
  userInfo: {
    marginRight: isTablet ? width * 0.03 : width * 0.06,
    maxWidth: isTablet ? width * 0.28 : width * 0.35,
  },
  greeting: {
    fontSize: isTablet ? 12 : width * 0.019,
    color: '#A9A9A9',
  },
  userName: {
    fontSize: isTablet ? 18 : width * 0.03,
    fontWeight: 'bold',
    color: '#fff',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2D32',
    borderRadius: 10,
    paddingHorizontal: isTablet ? 12 : 8,
    flex: 1,
    height: isTablet ? 44 : height * 0.04,
    borderWidth: 1,
    borderColor: '#4A4A4A',
  },
  searchIcon: {
    marginRight: isTablet ? 10 : width * 0.01,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: isTablet ? 16 : width * 0.021,
    paddingHorizontal: isTablet ? 0 : width * 0.015,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: width * 0.01,
  },
  notificationButton: {
    backgroundColor: '#2A2D32',
    borderRadius: 8,
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
  // New Total Expenses Card Styles
  totalExpensesCard: {
    backgroundColor: '#2A2D32',
    borderRadius: 10,
    padding: width * 0.025,
    marginBottom: height * 0.02,
    borderWidth: 1,
    borderColor: '#4A4A4A',
  },
  totalExpensesLabel: {
    fontSize: width * 0.025,
    color: '#A9A9A9',
    marginBottom: height * 0.005,
  },
  totalExpensesValue: {
    fontSize: width * 0.045,
    fontWeight: 'bold',
    color: '#A98C27',
  },
  cartButton: {
    marginRight: width * 0.045,
     backgroundColor: '#2A2D32',
    borderRadius: 12,
    padding: width * 0.000001,
    height: width * 0.078,
    width: width * 0.078,
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
  // Controls Section Styles
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
  screenTitle: {
    color: '#fff',
    fontSize: width * 0.029,
    fontWeight: '600',
  },
  filterActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#222',
    paddingVertical: height * 0.01,
    paddingHorizontal: width * 0.015,
    borderRadius: 6,
    marginRight: width * 0.01,
    borderWidth: 1,
    borderColor: '#4A4A4A',
  },
  filterText: {
    color: '#fff',
    fontSize: width * 0.019,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#A98C27',
    paddingVertical: height * 0.01,
    paddingHorizontal: width * 0.015,
    borderRadius: 6,
  },
  addText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: width * 0.019,
  },
  // Table Styles
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: height * 0.01,
    paddingVertical: height * 0.02,
    backgroundColor: '#2B2B2B',
    paddingHorizontal: width * 0.01,
    borderRadius: 5,
  },
  nameHeader: {
    flex: 1.5,
    color: '#fff',
    fontWeight: '600',
    fontSize: width * 0.017,
    textAlign: 'left',
  },
  amountHeader: {
    flex: 1,
    color: '#fff',
    fontWeight: '600',
    fontSize: width * 0.017,
    textAlign: 'left',
  },
  descriptionHeader: {
    flex: 2,
    color: '#fff',
    fontWeight: '600',
    fontSize: width * 0.017,
    textAlign: 'left',
  },
  dateHeader: {
    flex: 1.5,
    color: '#fff',
    fontWeight: '600',
    fontSize: width * 0.017,
    textAlign: 'left',
  },
  row: {
    flexDirection: 'row',
    paddingVertical: height * 0.017,
    paddingHorizontal: width * 0.01,
    alignItems: 'center',
  },
  nameCell: {
    flex: 1.5,
    color: '#fff',
    fontSize: width * 0.016,
    textAlign: 'left',
    fontWeight: '400',
  },
  amountCell: {
    flex: 1,
    color: '#fff',
    fontSize: width * 0.016,
    textAlign: 'left',
  },
  descriptionCell: {
    flex: 2,
    color: '#fff',
    fontSize: width * 0.016,
    textAlign: 'left',
  },
  dateCell: {
    flex: 1.5,
    color: '#fff',
    fontSize: width * 0.016,
    textAlign: 'left',
  },
  table: {
    marginTop: height * 0.005,
    borderRadius: 5,
    overflow: 'hidden',
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
  pageNumbersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: width * 0.005,
  },
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

export default ExpenseScreen;
