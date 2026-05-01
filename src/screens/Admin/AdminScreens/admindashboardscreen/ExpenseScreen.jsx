// src/screens/Admin/AdminScreens/admindashboardscreen/ExpenseScreen.jsx

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
import NotificationBell from '../../../../components/NotificationBell';
import DateTimePicker from '@react-native-community/datetimepicker';
import moment from 'moment';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { DeviceEventEmitter } from 'react-native';
import { ADMIN_CART_UPDATED_EVENT, getAdminCartItems } from '../../../../utils/adminCart';

import AddExpenseModal from './modals/AddExpenseModal';
import ViewExpenseModal from './modals/ViewExpenseModal';

import {
  getAllExpenses,
  addExpense,
  deleteExpense,
  testBackendConnection,
} from '../../../../api/expenseService';

const { width, height } = Dimensions.get('window');
const screenWidth = Dimensions.get('window').width;

const userProfileImagePlaceholder = require('../../../../assets/images/logo.png');
const dummyScreenshotImage = require('../../../../assets/images/ss.jpg');

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
  if (typeof image === 'number') {
    return image;
  }
  return userProfileImagePlaceholder;
};

const truncateDescription = (text, wordLimit) => {
  if (!text) return 'N/A';
  const words = text.split(' ');
  if (words.length > wordLimit) {
    return words.slice(0, wordLimit).join(' ') + '...';
  }
  return text;
};

const loadAdminCartCount = async setCartCount => {
  try {
    const items = await getAdminCartItems();
    setCartCount(Array.isArray(items) ? items.length : 0);
  } catch (err) {
    console.error('[ExpenseScreen] Failed to load admin cart count:', err);
    setCartCount(0);
  }
};

const ExpenseScreen = () => {
  const navigation = useNavigation();
  // const route = useRoute();
  // const { authenticatedAdmin } = route.params || {};

  const [authenticatedAdmin, setAuthenticatedAdmin] = useState(null);
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

  const [searchText, setSearchText] = useState('');
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
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

  const [selectedFilterDate, setSelectedFilterDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const [isAddExpenseModalVisible, setIsAddExpenseModalVisible] =
    useState(false);
  const [isViewExpenseModalVisible, setIsViewExpenseModalVisible] =
    useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);

  const getAuthToken = async () => {
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
      console.error('Failed to get auth token:', error);
      return null;
    }
  };

  const onDateChange = (event, date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (date) {
      setSelectedFilterDate(date);
    } else {
      setSelectedFilterDate(null);
    }
  };

  const handleOpenDatePicker = () => {
    setShowDatePicker(true);
  };

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const token = await getAuthToken();
      if (!token) {
        console.log('No auth token available');
        Alert.alert('Authentication Error', 'Please login again.', [
          {
            text: 'OK',
            onPress: () => navigation.replace('AdminLogin'),
          },
        ]);
        return;
      }

      const response = await getAllExpenses(token);
      if (response.success && Array.isArray(response.data)) {
        // 🌟 FIX: Pass the original image URL string to the transformed data 🌟
        const transformedExpenses = response.data.map(expense => ({
          id: expense._id || expense.id,
          name: expense.name || 'N/A',
          amount: expense.price ? `${expense.price} PKR` : 'N/A',
          description: expense.description || 'N/A',
          date: expense.createdAt
            ? moment(expense.createdAt).format('MMMM DD, YYYY')
            : 'N/A',
          // 🌟 HERE'S THE CHANGE: We pass the image URI as a string 🌟
          image: expense.image || null,
        }));
        setExpenses(transformedExpenses);
      } else {
        setExpenses([]);
      }
    } catch (error) {
      console.error('Error fetching expenses:', error);
      Alert.alert('Error', 'Failed to load expenses. Please try again.');
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    testBackendConnection().then(result => {
      if (result.success) {
        fetchExpenses();
      } else {
        Alert.alert(
          'Connection Error',
          'Cannot connect to server. Please check your internet connection.',
        );
      }
    });
  }, []);

  const refreshExpenses = () => {
    fetchExpenses();
  };

  const filteredExpenses = useMemo(() => {
    let currentData = expenses;
    if (searchText) {
      currentData = currentData.filter(
        item =>
          item.name.toLowerCase().includes(searchText.toLowerCase()) ||
          item.description.toLowerCase().includes(searchText.toLowerCase()) ||
          item.id.toLowerCase().includes(searchText.toLowerCase()) ||
          item.date.toLowerCase().includes(searchText.toLowerCase()),
      );
    }
    if (selectedFilterDate) {
      const formattedSelectedDate =
        moment(selectedFilterDate).format('MMMM DD, YYYY');
      currentData = currentData.filter(item => {
        return item.date === formattedSelectedDate;
      });
    }
    return currentData;
  }, [expenses, searchText, selectedFilterDate]);

  // Reset to first page whenever filters change
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
        Alert.alert('Error', 'Authentication required. Please login again.');
        return;
      }
      const response = await addExpense(newExpensePayload, token);
      if (response.success) {
        Alert.alert('Success', 'Expense added successfully!', [
          {
            text: 'OK',
            onPress: () => {
              handleCloseAddExpenseModal();
              refreshExpenses();
            },
          },
        ]);
      } else {
        const errorMessage = response.message || 'Failed to add expense';
        Alert.alert('Error', errorMessage);
      }
    } catch (error) {
      Alert.alert(
        'Error',
        'Network error. Please check your connection and try again.',
      );
    }
  };

  const handleOpenViewExpenseModal = item => {
    setSelectedExpense(item);
    setIsViewExpenseModalVisible(true);
  };

  const handleCloseViewExpenseModal = () => {
    setIsViewExpenseModalVisible(false);
    setSelectedExpense(null);
  };

  const handleDeleteExpense = expenseId => {
    Alert.alert('Delete Expense', 'Are you sure to delete this expense?', [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Yes',
        onPress: async () => {
          try {
            const token = await getAuthToken();
            if (!token) {
              Alert.alert(
                'Authentication Error',
                'Please login again before deleting expenses.',
              );
              return;
            }

            await deleteExpense(expenseId, token);
            Alert.alert('Success', 'Expense deleted successfully.');
            refreshExpenses();
          } catch (error) {
            Alert.alert(
              'Error',
              error?.message || 'Failed to delete expense. Please try again.',
            );
          }
        },
      },
    ]);
  };

  const renderItem = ({ item, index }) => (
    <TouchableOpacity
      style={[
        styles.row,
        { backgroundColor: index % 2 === 0 ? '#2E2E2E' : '#1F1F1F' },
      ]}
      onPress={() => handleOpenViewExpenseModal(item)}
    >
      <Text style={styles.nameCell}>{item.name}</Text>
      <Text style={styles.amountCell}>{item.amount}</Text>
      <Text style={styles.descriptionCell}>
        {truncateDescription(item.description, 3)}
      </Text>
      <Text style={styles.dateCell}>{item.date}</Text>
      <View style={styles.actionCell}>
        <TouchableOpacity
          onPress={() => handleDeleteExpense(item.id)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name="trash-outline"
            size={width * 0.022}
            color="#FF4C4C"
          />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header Section */}
      <View style={styles.header}>
        <View style={styles.headerCenter}>
          <View style={styles.userInfo}>
            <Text style={styles.greeting}>Hello 👋</Text>
            <Text style={styles.userName}>{userName || 'Guest'}</Text>
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
            onPress={handleOpenAddExpenseModal}
          >
            <Ionicons
              name="add-circle-outline"
              size={16}
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
        <Text style={styles.actionHeader}>Action</Text>
      </View>
      {/* Table Rows */}
      <FlatList
        data={paginatedExpenses}
        renderItem={renderItem}
        keyExtractor={(item, index) => item.id || index.toString()}
        style={styles.table}
        refreshing={loading}
        onRefresh={refreshExpenses}
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
  addText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: width * 0.014,
  },
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginTop: height * 0.01,
    paddingVertical: height * 0.02,
    backgroundColor: '#1e1f20ff',
    paddingHorizontal: width * 0.005,
    borderRadius: 5,
  },
  nameHeader: {
    flex: 1.5,
    color: '#fff',
    fontWeight: '500',
    fontSize: width * 0.017,
    textAlign: 'left',
  },
  amountHeader: {
    flex: 1,
    color: '#fff',
    fontWeight: '500',
    fontSize: width * 0.017,
    textAlign: 'left',
  },
  descriptionHeader: {
    flex: 2,
    color: '#fff',
    fontWeight: '500',
    fontSize: width * 0.017,
    textAlign: 'left',
  },
  dateHeader: {
    flex: 1.3,
    color: '#fff',
    fontWeight: '500',
    fontSize: width * 0.017,
    textAlign: 'left',
  },
  actionHeader: {
    flex: 0.7,
    color: '#fff',
    fontWeight: '500',
    fontSize: width * 0.017,
    textAlign: 'left',
  },
  row: {
    flexDirection: 'row',
    paddingVertical: height * 0.017,
    paddingHorizontal: width * 0.005,
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
    fontSize: width * 0.013,
    textAlign: 'left',
  },
  descriptionCell: {
    flex: 2,
    color: '#fff',
    fontSize: width * 0.013,
    textAlign: 'left',
  },
  dateCell: {
    flex: 1.3,
    color: '#fff',
    fontSize: width * 0.013,
    textAlign: 'left',
  },
  actionCell: {
    flex: 0.7,
    justifyContent: 'center',
    alignItems: 'flex-start',
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
  pageButtonDisabled: {
    opacity: 0.5,
  },
  pageButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: width * 0.014,
  },
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
  pageNumberActive: {
    backgroundColor: '#A98C27',
    borderColor: '#A98C27',
  },
  pageNumberText: {
    color: '#fff',
    fontSize: width * 0.014,
  },
  pageNumberTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
});

export default ExpenseScreen;
