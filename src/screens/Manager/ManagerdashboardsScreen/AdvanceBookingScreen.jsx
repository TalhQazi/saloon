// src/screens/manager/AdvanceBookingScreen.jsx
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
  ScrollView,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import NotificationBell from '../../../components/NotificationBell';
import DateTimePicker from '@react-native-community/datetimepicker';
import moment from 'moment';
import { DeviceEventEmitter } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  MANAGER_CART_UPDATED_EVENT,
  getManagerCartItems,
} from '../../../utils/managerCart';

import AddBookingModal from './modals/AddBookingModal';
import ViewBookingModal from './modals/ViewBookingModal';

import {
  getAllAdvanceBookings,
  addAdvanceBooking,
  updateAdvanceBookingStatus,
  deleteAdvanceBooking,
  getAdvanceBookingStats,
} from '../../../api/advanceBookingService';

const { width, height } = Dimensions.get('window');
const screenWidth = Dimensions.get('window').width;
const isTablet = width >= 768;

const userProfileImagePlaceholder = require('../../../assets/images/logo.png');

const loadManagerCartCount = async setCartCount => {
  try {
    const items = await getManagerCartItems();
    setCartCount(Array.isArray(items) ? items.length : 0);
  } catch (err) {
    console.error('[ManagerAdvanceBooking] Failed to load manager cart count:', err);
    setCartCount(0);
  }
};

// Helper function to truncate username to 6 words maximum
const truncateUsername = username => {
  if (!username) return 'Guest';
  const words = username.split(' ');
  if (words.length <= 6) return username;
  return words.slice(0, 6).join(' ') + '...';
};

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

const AdvanceBookingScreen = () => {
  const navigation = useNavigation();
  const [searchText, setSearchText] = useState('');
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cartCount, setCartCount] = useState(0);
  const [userData, setUserData] = useState({
    userName: 'Guest',
    userProfileImage: userProfileImagePlaceholder,
  });

  const [selectedFilterDate, setSelectedFilterDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [isAddBookingModalVisible, setIsAddBookingModalVisible] =
    useState(false);
  const [isViewBookingModalVisible, setIsViewBookingModalVisible] =
    useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const [stats, setStats] = useState({
    totalBookings: 0,
    pendingBookings: 0,
    confirmedBookings: 0,
    completedBookings: 0,
    cancelledBookings: 0,
    totalAdvanceAmount: 0,
    upcomingBookings: 0,
  });

  // ✅ State for profile image source - same as Advance Salary screen
  const profileImageSource = getDisplayImageSource(userData.userProfileImage);

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

  // Load user data from AsyncStorage
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const managerAuth = await AsyncStorage.getItem('managerAuth');
        const adminAuth = await AsyncStorage.getItem('adminAuth');

        if (managerAuth) {
          const parsedData = JSON.parse(managerAuth);
          if (parsedData.token && parsedData.isAuthenticated) {
            setUserData({
              userName: parsedData.manager.name,
              userProfileImage: parsedData.manager.livePicture,
            });
          } else {
            Alert.alert('Authentication Error', 'Please login again.', [
              {
                text: 'OK',
                onPress: () => navigation.replace('RoleSelection'),
              },
            ]);
          }
        } else if (adminAuth) {
          const parsedData = JSON.parse(adminAuth);
          if (parsedData.token && parsedData.isAuthenticated) {
            setUserData({
              userName: parsedData.admin.name,
              userProfileImage: parsedData.admin.livePicture,
            });
          } else {
            Alert.alert('Authentication Error', 'Please login again.', [
              {
                text: 'OK',
                onPress: () => navigation.replace('RoleSelection'),
              },
            ]);
          }
        } else {
          Alert.alert('Authentication Error', 'Please login again.', [
            {
              text: 'OK',
              onPress: () => navigation.replace('RoleSelection'),
            },
          ]);
        }
      } catch (e) {
        console.error('Failed to load user data from storage:', e);
        Alert.alert('Authentication Error', 'Please login again.', [
          {
            text: 'OK',
            onPress: () => navigation.replace('RoleSelection'),
          },
        ]);
      }
    };

    loadUserData();
  }, []);

  // ✅ Fix: Properly handle AsyncStorage
  const getAuthToken = async () => {
    try {
      const managerAuth = await AsyncStorage.getItem('managerAuth');
      const adminAuth = await AsyncStorage.getItem('adminAuth');
      
      if (managerAuth) {
        const parsed = JSON.parse(managerAuth);
        if (parsed.token && parsed.isAuthenticated) {
          return parsed.token;
        }
      } else if (adminAuth) {
        const parsed = JSON.parse(adminAuth);
        if (parsed.token && parsed.isAuthenticated) {
          return parsed.token;
        }
      }
      return null;
    } catch (error) {
      console.error('Failed to get auth token from storage:', error);
      return null;
    }
  };

  // ✅ Define handleOpenDatePicker — THIS WAS MISSING!
  const handleOpenDatePicker = () => {
    setShowDatePicker(true);
  };

  // ✅ Define onDateChange — you already had this, but including for safety
  const onDateChange = (event, date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (date) {
      setSelectedFilterDate(date);
    } else {
      setSelectedFilterDate(null);
    }
  };

  const fetchAdvanceBookings = async () => {
    try {
      setLoading(true);
      const token = await getAuthToken();
      if (!token) {
        console.log('❌ No auth token available');
        Alert.alert('Authentication Error', 'Please login again.');
        return;
      }

      console.log('🔍 Fetching advance bookings...');
      const response = await getAllAdvanceBookings(token);

      if (response.success && response.data) {
        console.log(
          '✅ Advance bookings fetched:',
          response.data.length,
          'bookings',
        ); // Debug the first few bookings
        debugBookingData(response.data);

        setBookings(response.data);
      } else {
        console.log('❌ No bookings data received');
        setBookings([]);
      }
    } catch (error) {
      console.error('❌ Error fetching advance bookings:', error);
      Alert.alert(
        'Error',
        'Failed to load advance bookings. Please try again.',
      );
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  const debugBookingData = bookings => {
    console.log('🔍 Debugging booking data:');
    bookings.slice(0, 2).forEach((booking, index) => {
      console.log(`Booking ${index + 1}:`, {
        clientName: booking.clientName,
        date: booking.date,
        time: booking.time,
        reminderDate: booking.reminderDate,
        reminderDateType: typeof booking.reminderDate,
      });
    });
  };
  const fetchBookingStats = async () => {
    try {
      const token = await getAuthToken();
      if (!token) return;

      const response = await getAdvanceBookingStats(token);
      if (response.success && response.data) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('❌ Error fetching booking stats:', error);
    }
  };

  useEffect(() => {
    fetchAdvanceBookings();
    fetchBookingStats();
  }, []);

  const refreshBookings = () => {
    fetchAdvanceBookings();
    fetchBookingStats();
  };

  const handleAddBooking = async bookingData => {
    try {
      const token = await getAuthToken();
      if (!token) {
        Alert.alert('Error', 'Authentication required. Please login again.');
        return;
      }

      console.log('🔍 Adding new booking:', bookingData);
      const response = await addAdvanceBooking(bookingData, token);

      if (response.success) {
        Alert.alert('Success', 'Advance booking added successfully!');
        setIsAddBookingModalVisible(false);
        refreshBookings();
      } else {
        Alert.alert('Error', response.message || 'Failed to add booking');
      }
    } catch (error) {
      console.error('❌ Error adding booking:', error);
      let errorMessage = 'Failed to add booking. Please try again.';

      if (error.data && error.data.message) {
        errorMessage = error.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      Alert.alert('Error', errorMessage);
    }
  };

  const handleUpdateBookingStatus = async (bookingId, newStatus) => {
    try {
      const token = await getAuthToken();
      if (!token) {
        Alert.alert('Error', 'Authentication required. Please login again.');
        return;
      }

      const response = await updateAdvanceBookingStatus(
        bookingId,
        newStatus,
        token,
      );

      if (response.success) {
        Alert.alert('Success', 'Booking status updated successfully!');
        refreshBookings();
      } else {
        Alert.alert('Error', response.message || 'Failed to update status');
      }
    } catch (error) {
      console.error('❌ Error updating booking status:', error);
      Alert.alert(
        'Error',
        'Failed to update booking status. Please try again.',
      );
    }
  };

  // --- DELETE FUNCTIONALITY ---
  const handleDeleteBooking = async bookingId => {
    try {
      const token = await getAuthToken();
      if (!token) {
        Alert.alert('Error', 'Authentication required. Please login again.');
        return;
      }

      const response = await deleteAdvanceBooking(bookingId, token);

      if (response.success) {
        Alert.alert('Success', 'Booking deleted successfully!');
        refreshBookings();
      } else {
        Alert.alert('Error', response.message || 'Failed to delete booking');
      }
    } catch (error) {
      console.error('❌ Error deleting booking:', error);
      Alert.alert('Error', 'Failed to delete booking. Please try again.');
    }
  };

  const handleDeleteConfirmation = bookingId => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this booking?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => handleDeleteBooking(bookingId),
        },
      ],
    );
  };
  // --- END DELETE FUNCTIONALITY ---

  const filteredBookings = useMemo(() => {
    let currentData = [...bookings];

    if (searchText) {
      currentData = currentData.filter(
        item =>
          (item.clientName || '')
            .toLowerCase()
            .includes(searchText.toLowerCase()) ||
          (item.phoneNumber || '')
            .toLowerCase()
            .includes(searchText.toLowerCase()) ||
          (item.clientId || '')
            .toLowerCase()
            .includes(searchText.toLowerCase()) ||
          (item.description || '')
            .toLowerCase()
            .includes(searchText.toLowerCase()),
      );
    }

    if (selectedFilterDate) {
      const formattedSelectedDate =
        moment(selectedFilterDate).format('YYYY-MM-DD');
      currentData = currentData.filter(item => {
        const itemDate = moment(item.date).format('YYYY-MM-DD');
        return itemDate === formattedSelectedDate;
      });
    }

    return currentData;
  }, [bookings, searchText, selectedFilterDate]);

  // Pagination: reset when list or filters change
  useEffect(() => {
    setPage(1);
  }, [bookings, searchText, selectedFilterDate]);

  const totalPages = useMemo(() => {
    const t = Math.ceil((filteredBookings?.length || 0) / PAGE_SIZE) || 1;
    return t;
  }, [filteredBookings]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
    if (page < 1) setPage(1);
  }, [page, totalPages]);

  const paginatedBookings = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredBookings.slice(start, start + PAGE_SIZE);
  }, [filteredBookings, page]);

  const handleOpenAddBookingModal = () => {
    setIsAddBookingModalVisible(true);
  };

  const handleCloseAddBookingModal = () => {
    setIsAddBookingModalVisible(false);
  };

  const handleSaveNewBooking = newBooking => {
    handleAddBooking(newBooking);
  };

  const handleOpenViewBookingModal = item => {
    setSelectedBooking(item);
    setIsViewBookingModalVisible(true);
  };

  const handleCloseViewBookingModal = () => {
    setIsViewBookingModalVisible(false);
    setSelectedBooking(null);
  };

  const renderItem = ({ item, index }) => (
    <View
      style={[
        styles.row,
        { backgroundColor: index % 2 === 0 ? '#2E2E2E' : '#1F1F1F' },
      ]}
    >
      <Text style={styles.clientNameCell}>{item.clientName || 'N/A'}</Text>
      <Text style={styles.dateTimeCell}>
        {moment(item.date).format('MMM DD, YYYY')} {item.time}
      </Text>
      <Text style={styles.phoneNumberCell}>{item.phoneNumber || 'N/A'}</Text>

      {/* FIXED: Proper reminder display with error handling */}
      <Text style={styles.reminderCell}>
        {(() => {
          try {
            if (!item.reminderDate) {
              console.warn('❌ No reminder date for booking:', item._id);
              return 'N/A';
            }

            console.log('🔍 Processing reminder date:', item.reminderDate);

            // Try multiple parsing approaches
            let reminderMoment;

            // Method 1: Parse as ISO string (most common from backend)
            reminderMoment = moment(item.reminderDate);

            // Method 2: If invalid, try custom format
            if (!reminderMoment.isValid()) {
              reminderMoment = moment(item.reminderDate, 'YYYY-MM-DD HH:mm:ss');
            }

            // Method 3: Try with AM/PM format
            if (!reminderMoment.isValid()) {
              reminderMoment = moment(item.reminderDate, 'YYYY-MM-DD hh:mm A');
            }

            // Method 4: Final fallback - direct conversion
            if (!reminderMoment.isValid()) {
              reminderMoment = moment(new Date(item.reminderDate));
            }

            if (!reminderMoment.isValid()) {
              console.error(
                '❌ Failed to parse reminder date:',
                item.reminderDate,
              );
              return 'Invalid Date';
            }

            const formatted = reminderMoment.format('MMM DD, YYYY hh:mm A');
            console.log('✅ Formatted reminder:', formatted);

            return formatted;
          } catch (error) {
            console.error('❌ Error processing reminder date:', error);
            return 'Error';
          }
        })()}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* ✅ Header Section - Exactly like Advance Salary Screen */}
      <View style={styles.header}>
        <View style={styles.headerCenter}>
          <View style={styles.userInfo}>
            <Text style={styles.greeting}>Hello 👋</Text>
            <Text style={styles.userName}>{truncateUsername(userData.userName)}</Text>
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
            source={profileImageSource}
            style={styles.profileImage}
            resizeMode="cover"
          />
        </View>
      </View>

      <View style={styles.controls}>
        <Text style={styles.screenTitle}>Advance Booking</Text>
        <View style={styles.filterActions}>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={handleOpenDatePicker} // ✅ Now this function exists!
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
            onPress={handleOpenAddBookingModal}
          >
            <Ionicons
              name="add-circle-outline"
              size={16}
              color="#fff"
              style={{ marginRight: 5 }}
            />
            <Text style={styles.addText}>Add Booking</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* --- HORIZONTAL SCROLLING WRAPPER --- */}
      <ScrollView
        horizontal={true}
        showsHorizontalScrollIndicator={true}
        style={styles.tableScrollView}
      >
        <View style={styles.tableContainer}>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={styles.clientNameHeader}>Client Name</Text>
            <Text style={styles.dateTimeHeader}>Date & Time</Text>
            <Text style={styles.phoneNumberHeader}>Phone Number</Text>
            <Text style={styles.reminderHeader}>Reminder</Text>
          </View>

          {/* Table Rows */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#A98C27" />
              <Text style={styles.loadingText}>
                Loading advance bookings...
              </Text>
            </View>
          ) : filteredBookings.length === 0 ? (
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataText}>No advance bookings found.</Text>
            </View>
          ) : (
            <FlatList
              data={paginatedBookings}
              renderItem={renderItem}
              keyExtractor={(item, index) =>
                item._id || item.id || index.toString()
              }
              style={styles.table}
              scrollEnabled={false}
            />
          )}
        </View>
      </ScrollView>
      {/* --- END HORIZONTAL SCROLLING WRAPPER --- */}

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
          onChange={onDateChange} // ✅ This is also defined
        />
      )}

      <AddBookingModal
        isVisible={isAddBookingModalVisible}
        onClose={handleCloseAddBookingModal}
        onSave={handleSaveNewBooking}
      />

      <ViewBookingModal
        isVisible={isViewBookingModalVisible}
        onClose={handleCloseViewBookingModal}
        bookingDetails={selectedBooking}
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
  },
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
  addText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: width * 0.014,
  },
  tableScrollView: {
    flex: 1,
    backgroundColor: '#1F1F1F',
    borderRadius: 8,
    overflow: 'hidden',
  },
  tableContainer: {
    // 4 columns: 0.22 + 0.25 + 0.22 + 0.35 ≈ 1.04, keep minWidth close to total
    minWidth: screenWidth * 1.04,
    backgroundColor: '#1F1F1F',
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: height * 0.015,
    backgroundColor: '#2B2B2B',
    borderBottomWidth: 2,
    borderBottomColor: '#3C3C3C',
    alignItems: 'center',
  },
  // ✅ PERFECTLY ALIGNED COLUMN WIDTHS - Each column has exact positioning
  clientNameHeader: {
    width: screenWidth * 0.22, // 22% of screen width
    color: '#fff',
    fontWeight: '600',
    fontSize: width * 0.014,
    textAlign: 'center',
    paddingHorizontal: width * 0.005,
    borderRightWidth: 1,
    borderRightColor: '#3C3C3C',
  },
  dateTimeHeader: {
    width: screenWidth * 0.25, // 25% of screen width
    color: '#fff',
    fontWeight: '600',
    fontSize: width * 0.014,
    textAlign: 'center',
    paddingHorizontal: width * 0.005,
    borderRightWidth: 1,
    borderRightColor: '#3C3C3C',
  },
  phoneNumberHeader: {
    width: screenWidth * 0.22, // 22% of screen width
    color: '#fff',
    fontWeight: '600',
    fontSize: width * 0.014,
    textAlign: 'center',
    paddingHorizontal: width * 0.005,
    borderRightWidth: 1,
    borderRightColor: '#3C3C3C',
  },
  reminderHeader: {
    width: screenWidth * 0.35, // 35% of screen width - wider for reminder details
    color: '#FF9800',
    fontWeight: '600',
    fontSize: width * 0.014,
    textAlign: 'center',
    paddingHorizontal: width * 0.005,
    borderRightWidth: 1,
    borderRightColor: '#3C3C3C',
  },
  actionHeader: {
    width: screenWidth * 0.16, // 16% of screen width
    color: '#fff',
    fontWeight: '600',
    fontSize: width * 0.014,
    textAlign: 'center',
    paddingHorizontal: width * 0.005,
  },
  row: {
    flexDirection: 'row',
    paddingVertical: height * 0.018,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  // ✅ PERFECTLY ALIGNED CELL WIDTHS - Matching header widths exactly
  clientNameCell: {
    width: screenWidth * 0.22, // Exact match with header
    color: '#fff',
    fontSize: width * 0.013,
    textAlign: 'center',
    paddingHorizontal: width * 0.005,
    borderRightWidth: 1,
    borderRightColor: '#333',
  },
  dateTimeCell: {
    width: screenWidth * 0.25, // Exact match with header
    color: '#fff',
    fontSize: width * 0.013,
    textAlign: 'center',
    paddingHorizontal: width * 0.005,
    borderRightWidth: 1,
    borderRightColor: '#333',
  },
  phoneNumberCell: {
    width: screenWidth * 0.22, // Exact match with header
    color: '#fff',
    fontSize: width * 0.013,
    textAlign: 'center',
    paddingHorizontal: width * 0.005,
    borderRightWidth: 1,
    borderRightColor: '#333',
  },
  reminderCell: {
    width: screenWidth * 0.35, // Exact match with header
    color: '#FF9800',
    fontSize: width * 0.013,
    textAlign: 'center',
    paddingHorizontal: width * 0.005,
    borderRightWidth: 1,
    borderRightColor: '#333',
  },
  deleteCell: {
    width: screenWidth * 0.16, // Exact match with header
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: width * 0.005,
  },
  table: {
    flex: 1,
  },
  noDataContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: height * 0.3,
  },
  noDataText: {
    color: '#A9A9A9',
    fontSize: width * 0.02,
    textAlign: 'center',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: height * 0.3,
  },
  loadingText: {
    color: '#A9A9A9',
    fontSize: width * 0.02,
    marginTop: 10,
    textAlign: 'center',
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
});

export default AdvanceBookingScreen;
