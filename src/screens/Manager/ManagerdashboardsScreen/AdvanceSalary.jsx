import React, { useState, useMemo, useCallback, useEffect } from 'react'; // Added useCallback
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
  ActivityIndicator, // Added for loading state
  Alert, // For basic alerts, replace with custom if available
  ScrollView,
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
import { useNavigation, useFocusEffect } from '@react-navigation/native'; // Import useNavigation and useFocusEffect
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../../../api/config';
import { DeviceEventEmitter } from 'react-native';
import {
  MANAGER_CART_UPDATED_EVENT,
  getManagerCartItems,
} from '../../../utils/managerCart';

// Import the new modal components
import AddAdvanceSalaryModal from './modals/AddAdvanceSalaryModal';
import ViewAdvanceSalaryModal from './modals/ViewAdvanceSalaryModal';

const { width, height } = Dimensions.get('window');
const screenWidth = Dimensions.get('window').width;
const isTablet = width >= 768;

const userProfileImagePlaceholder = require('../../../assets/images/logo.png');
const dummyScreenshotImage = require('../../../assets/images/ss.jpg'); // You need to create this image

const loadManagerCartCount = async setCartCount => {
  try {
    const items = await getManagerCartItems();
    setCartCount(Array.isArray(items) ? items.length : 0);
  } catch (err) {
    console.error('[ManagerAdvanceSalary] Failed to load manager cart count:', err);
    setCartCount(0);
  }
};

// 🔐 Get authentication token (simple like other screens)
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

const AdvanceSalary = () => {
  const navigation = useNavigation(); // Initialize navigation hook
  const [searchText, setSearchText] = useState('');
  const [advanceSalaries, setAdvanceSalaries] = useState([]); // Initialize as empty, will fetch on focus
  const [loading, setLoading] = useState(true); // Add loading state for data fetch
  const [userData, setUserData] = useState({
    userName: 'Guest',
    userProfileImage: userProfileImagePlaceholder,
  });
  const [profileImageSource, setProfileImageSource] = useState(
    userProfileImagePlaceholder,
  );
  const [cartCount, setCartCount] = useState(0);

  const [selectedFilterDate, setSelectedFilterDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  // States for modals
  const [isAddAdvanceSalaryModalVisible, setIsAddAdvanceSalaryModalVisible] =
    useState(false);
  const [isViewAdvanceSalaryModalVisible, setIsViewAdvanceSalaryModalVisible] =
    useState(false);
  const [selectedAdvanceSalary, setSelectedAdvanceSalary] = useState(null);

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
            setProfileImageSource({ uri: parsedData.manager.livePicture });
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
            setProfileImageSource({ uri: parsedData.admin.livePicture });
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

  // Function to fetch advance salary data from backend
  const fetchAdvanceSalaryData = useCallback(async () => {
    setLoading(true);
    try {
      console.log(
        '📡 [Manager AdvanceSalary] Fetching approved advance salary requests...',
      );

      // Get token and convert if needed
      const token = await getAuthToken();
      if (!token) {
        Alert.alert('Authentication Error', 'Please login again.', [
          {
            text: 'OK',
            onPress: () => navigation.replace('RoleSelection'),
          },
        ]);
        throw new Error('No authentication token available');
      }

      console.log(
        '🔑 [Manager AdvanceSalary] Using token:',
        token.substring(0, 20) + '...',
      );

      // Make direct API call like other working screens
      const response = await fetch(
        `${BASE_URL}/advance-salary/all?status=approved`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ [Manager AdvanceSalary] API Response:', data);

      // Transform backend data to match frontend format
      const transformedData = data.map((item, index) => {
        console.log('🔍 [Manager AdvanceSalary] Processing item:', item);

        // Fix role detection - backend sends proper role
        let role = 'Employee';
        if (item.role) {
          role =
            item.role.charAt(0).toUpperCase() +
            item.role.slice(1).toLowerCase();
        }

        // Fix amount formatting - backend sends number
        let amount = 0;
        if (item.amount !== undefined && item.amount !== null) {
          amount = parseFloat(item.amount) || 0;
        }

        return {
          id: item.employeeId || `EMP${String(index + 1).padStart(3, '0')}`,
          name: item.employeeName || 'Unknown',
          amount: amount, // Store as number for proper formatting
          date: moment(item.createdAt).format('MMMM DD, YYYY'),
          image: item.image || dummyScreenshotImage,
          role: role,
          originalData: item, // Keep original data for reference
        };
      });

      console.log(
        '📊 [Manager AdvanceSalary] Transformed data:',
        transformedData,
      );
      setAdvanceSalaries(transformedData);
    } catch (error) {
      console.error(
        '❌ [Manager AdvanceSalary] Failed to fetch advance salary data:',
        error,
      );

      // Keep existing data if fetch fails
      Alert.alert(
        'Error',
        `Failed to load advance salary data: ${error.message}`,
      );
    } finally {
      setLoading(false);
    }
  }, []); // No dependencies, as initial data is static

  // Use useFocusEffect to refetch data when the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchAdvanceSalaryData();
      // Optionally reset filters when screen gains focus
      setSelectedFilterDate(null);
      setSearchText('');
    }, [fetchAdvanceSalaryData]),
  );

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

  // Filter advance salaries based on search text AND selected date
  const filteredAdvanceSalaries = useMemo(() => {
    let currentData = [...advanceSalaries];

    // Apply text search filter
    if (searchText) {
      currentData = currentData.filter(
        item =>
          item.name.toLowerCase().includes(searchText.toLowerCase()) ||
          item.id.toLowerCase().includes(searchText.toLowerCase()) ||
          item.role.toLowerCase().includes(searchText.toLowerCase()) ||
          String(item.amount)
            .toLowerCase()
            .includes(searchText.toLowerCase()) || // Convert amount to string for search
          item.date.toLowerCase().includes(searchText.toLowerCase()),
      );
    }

    // Apply date filter if a date is selected
    if (selectedFilterDate) {
      const formattedSelectedDate =
        moment(selectedFilterDate).format('MMM DD, YYYY');
      currentData = currentData.filter(item => {
        const itemDate = moment(item.date, 'MMMM DD, YYYY').format(
          'MMM DD, YYYY',
        );
        return itemDate === formattedSelectedDate;
      });
    }

    return currentData;
  }, [advanceSalaries, searchText, selectedFilterDate]);

  // Pagination: reset when filters/data change
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

  // Handlers for Add Advance Salary Modal
  const handleOpenAddAdvanceSalaryModal = () => {
    setIsAddAdvanceSalaryModalVisible(true);
  };

  const handleCloseAddAdvanceSalaryModal = () => {
    setIsAddAdvanceSalaryModalVisible(false);
    // After closing add modal, refresh data
    fetchAdvanceSalaryData();
  };

  const handleSaveNewAdvanceSalary = newSalary => {
    // In a real API scenario, you'd send newSalary to your backend.
    // Upon successful API response, you'd then refetch data to update the list.
    // For now, we'll simulate adding to local state.
    const newId = `EMP${String(advanceSalaries.length + 1).padStart(3, '0')}`;
    setAdvanceSalaries(prevSalaries => [
      ...prevSalaries,
      { ...newSalary, id: newId, image: newSalary.image || null },
    ]);
    Alert.alert('Success', 'Advance Salary added successfully!'); // Using Alert for now
    handleCloseAddAdvanceSalaryModal(); // Close modal after saving
  };

  // Handlers for View Advance Salary Modal
  const handleOpenViewAdvanceSalaryModal = item => {
    setSelectedAdvanceSalary(item);
    setIsViewAdvanceSalaryModalVisible(true);
  };

  const handleCloseViewAdvanceSalaryModal = () => {
    setIsViewAdvanceSalaryModalVisible(false);
    setSelectedAdvanceSalary(null);
  };

  // Function to navigate to LiveCheckupScreen for "Face Scan for Request"
  const handleNavigateLiveCheckup = () => {
    navigation.navigate('LiveCheckScreenSalary');
  };

  const renderItem = ({ item, index }) => (
    // Make the entire row TouchableOpacity to trigger View Modal
    <TouchableOpacity
      style={[
        styles.row,
        { backgroundColor: index % 2 === 0 ? '#2E2E2E' : '#1F1F1F' },
      ]}
      onPress={() => handleOpenViewAdvanceSalaryModal(item)}
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
      {/* Format amount for display */}
      <Text style={styles.amountCell}>
        {typeof item.amount === 'number' && !isNaN(item.amount)
          ? `${item.amount.toLocaleString()} PKR`
          : '0 PKR'}
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
          {/* <TouchableOpacity style={styles.notificationButton}>
            <MaterialCommunityIcons
              name="alarm"
              size={width * 0.041}
              color="#fff"
            />
          </TouchableOpacity> */}
          <Image
            source={profileImageSource} // ➡️ Using the state variable here
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

          {/* Button for Face Scan Request - navigates to LiveCheckupScreen */}
          <TouchableOpacity
            style={styles.addButton}
            onPress={handleNavigateLiveCheckup}
          >
            <Text style={styles.addText}>Face Scan for Request</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#A98C27" />
          <Text style={styles.loadingText}>Loading advance salaries...</Text>
        </View>
      ) : (
        <>
          {/* Table with Horizontal Scrolling */}
          <View style={styles.tableContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.tableWrapper}>
                <View style={styles.tableHeader}>
                  <Text style={styles.employeeIdHeader}>Employee ID</Text>
                  <Text style={styles.nameHeader}>Name</Text>
                  <Text style={styles.roleHeader}>Role</Text>
                  <Text style={styles.amountHeader}>Amount</Text>
                  <Text style={styles.dateHeader}>Date</Text>
                </View>

                {/* Table Rows */}
                <FlatList
                  data={paginatedAdvanceSalaries}
                  renderItem={renderItem}
                  keyExtractor={(item, index) =>
                    item.id + item.date + index.toString()
                  }
                  style={styles.table}
                  ListEmptyComponent={() => (
                    <View style={styles.noDataContainer}>
                      <Text style={styles.noDataText}>
                        No advance salary records found.
                      </Text>
                    </View>
                  )}
                />
              </View>
            </ScrollView>
          </View>
        </>
      )}

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

      {/* Render the AddAdvanceSalaryModal */}
      <AddAdvanceSalaryModal
        isVisible={isAddAdvanceSalaryModalVisible}
        onClose={handleCloseAddAdvanceSalaryModal}
        onSave={handleSaveNewAdvanceSalary}
      />

      {/* Render the ViewAdvanceSalaryModal */}
      <ViewAdvanceSalaryModal
        isVisible={isViewAdvanceSalaryModalVisible}
        onClose={handleCloseViewAdvanceSalaryModal}
        salaryDetails={selectedAdvanceSalary}
      />
    </View>
  );
};
export default AdvanceSalary;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111',
    paddingHorizontal: width * 0.02,
    paddingTop: height * 0.02,
  },
  // --- Header Styles (Reused from previous screens) ---
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
  // --- End Header Styles ---

  // --- Controls Section Styles ---
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
    gap: width * 0.01, // Added gap for spacing between buttons
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
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#222',
    paddingVertical: height * 0.01,
    paddingHorizontal: width * 0.015,
    borderRadius: 6,
    // marginRight: width * 0.01, // Replaced by gap
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
  // --- End Controls Section Styles ---

  // --- Table Styles (Adapted for Advance Salary with Horizontal Scrolling) ---
  tableContainer: {
    flex: 1,
    backgroundColor: '#111',
    borderRadius: 5,
    overflow: 'hidden',
  },
  tableWrapper: {
    backgroundColor: '#111',
    // Keep overall table width close to total column widths so there is
    // no large empty space after the last (Date) column
    minWidth: 570,
  },
  tableHeader: {
    flexDirection: 'row',
    // Keep columns closer together instead of stretching with large gaps
    justifyContent: 'flex-start',
    paddingVertical: height * 0.018,
    backgroundColor: '#2B2B2B',
    paddingHorizontal: width * 0.008,
    minWidth: 570,
  },
  row: {
    flexDirection: 'row',
    // Align cells tightly similar to header
    justifyContent: 'flex-start',
    paddingVertical: height * 0.013,
    paddingHorizontal: width * 0.008,
    borderBottomWidth: 1,
    borderBottomColor: '#3C3C3C',
    minWidth: 570,
  },
  employeeIdHeader: {
    width: 100,
    color: '#fff',
    fontWeight: '500',
    fontSize: width * 0.017,
    textAlign: 'left',
  },
  employeeIdCell: {
    width: 100,
    color: '#fff',
    fontSize: width * 0.013,
    textAlign: 'left',
  },
  nameHeader: {
    width: 130,
    color: '#fff',
    fontWeight: '500',
    fontSize: width * 0.017,
    textAlign: 'left',
  },
  nameCell: {
    width: 130,
    color: '#fff',
    fontSize: width * 0.013,
    textAlign: 'left',
  },
  roleHeader: {
    width: 80,
    color: '#fff',
    fontWeight: '500',
    fontSize: width * 0.017,
    textAlign: 'left',
  },
  roleCell: {
    width: 80,
    fontSize: width * 0.013,
    textAlign: 'left',
    fontWeight: '500',
  },
  amountHeader: {
    width: 120,
    color: '#fff',
    fontWeight: '500',
    fontSize: width * 0.017,
    textAlign: 'left',
  },
  amountCell: {
    width: 120,
    color: '#fff',
    fontSize: width * 0.013,
    textAlign: 'left',
  },
  dateHeader: {
    width: 120,
    color: '#fff',
    fontWeight: '500',
    fontSize: width * 0.017,
    textAlign: 'left',
  },
  dateCell: {
    width: 120,
    color: '#fff',
    fontSize: width * 0.013,
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
  loadingOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(17, 17, 17, 0.8)', // Semi-transparent dark background
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10, // Ensure it's on top
  },
  loadingText: {
    color: '#fff',
    marginTop: 10,
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
});
