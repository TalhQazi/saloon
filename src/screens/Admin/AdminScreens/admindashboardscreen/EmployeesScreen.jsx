// src/screens/admin/EmployeesScreen.jsx
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
  Alert,
  ScrollView,
  ActivityIndicator as RNActivityIndicator,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import NotificationBell from '../../../../components/NotificationBell';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import moment from 'moment';
import axios from 'axios';
import { BASE_URL } from '../../../../api/config';
import AddEmployeeModal from './modals/AddEmployeeModal';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';
import { ADMIN_CART_UPDATED_EVENT, getAdminCartItems } from '../../../../utils/adminCart';

const { width, height } = Dimensions.get('window');

const userProfileImagePlaceholder = require('../../../../assets/images/logo.png');

// Helper function to truncate username to 6 words maximum
const truncateUsername = username => {
  if (!username) return 'Guest';
  const words = username.split(' ');
  if (words.length <= 6) return username;
  return words.slice(0, 6).join(' ') + '...';
};

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

// ✅ FIXED: Simple function to use backend-generated employee ID
const generateEmployeeId = (role, _id, existingId) => {
  // Always use the existing employeeId from backend
  return existingId || 'N/A';
};

const loadAdminCartCount = async setCartCount => {
  try {
    const items = await getAdminCartItems();
    setCartCount(Array.isArray(items) ? items.length : 0);
  } catch (err) {
    console.error('[EmployeesScreen] Failed to load admin cart count:', err);
    setCartCount(0);
  }
};

const EmployeesScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();

  // ✅ State for admin profile (replaces useUser)
  const [authenticatedAdmin, setAuthenticatedAdmin] = useState(null);
  const userName = authenticatedAdmin?.name || 'Guest';
  const userProfileImage = authenticatedAdmin?.profilePicture;
  const profileImageSource = userProfileImage
    ? { uri: userProfileImage }
    : userProfileImagePlaceholder;

  const [searchText, setSearchText] = useState('');
  const [selectedFilterDate, setSelectedFilterDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [employeesData, setEmployeesData] = useState([]);
  const [isAddEmployeeModalVisible, setIsAddEmployeeModalVisible] =
    useState(false);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
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

  // ✅ Load admin profile on mount
  useEffect(() => {
    const loadAdminProfile = async () => {
      const admin = await getAuthenticatedAdmin();
      if (admin) {
        setAuthenticatedAdmin(admin);
      } else {
        Alert.alert('Authentication Error', 'Please login again.', [
          {
            text: 'OK',
            onPress: () => navigation.replace('AdminLogin'),
          },
        ]);
      }
    };
    loadAdminProfile();
  }, []);

  // Filter employees based on search and date
  const filteredEmployees = useMemo(() => {
    let currentData = [...employeesData];

    if (searchText) {
      currentData = currentData.filter(
        employee =>
          employee.name.toLowerCase().includes(searchText.toLowerCase()) ||
          employee.id.toLowerCase().includes(searchText.toLowerCase()) ||
          employee.phoneNumber
            .toLowerCase()
            .includes(searchText.toLowerCase()) ||
          employee.idCardNumber
            .toLowerCase()
            .includes(searchText.toLowerCase()) ||
          employee.salary.toLowerCase().includes(searchText.toLowerCase()) ||
          employee.type.toLowerCase().includes(searchText.toLowerCase()),
      );
    }

    if (selectedFilterDate) {
      const formattedSelectedDate =
        moment(selectedFilterDate).format('MMMM DD, YYYY');
      currentData = currentData.filter(employee => {
        const employeeJoiningDateFormatted = moment(
          employee.joiningDate,
          'MMMM DD, YYYY',
        ).format('MMMM DD, YYYY');
        return employeeJoiningDateFormatted === formattedSelectedDate;
      });
    }

    return currentData;
  }, [employeesData, searchText, selectedFilterDate]);

  // Fetch employees from API
  const fetchEmployeesFromAPI = async () => {
    try {
      setIsLoadingEmployees(true);
      console.log('📡 Fetching employees from API...');

      const admin = await getAuthenticatedAdmin();
      const headers = admin?.token
        ? {
            Authorization: `Bearer ${admin.token}`,
            'Content-Type': 'application/json',
          }
        : {};

      const response = await axios.get(`${BASE_URL}/employees/all`, {
        headers,
      });

      console.log('Emp API Response:', response.data);

      if (response.status === 200 && response.data.data) {
        const admins = response.data.grouped?.admins || [];
        const managers = response.data.grouped?.managers || [];
        const employees = response.data.grouped?.employees || [];
        const allEmployees = [...admins, ...managers, ...employees];

        const mappedEmployees = allEmployees.map(emp => {
          const idCardNumber = (emp.idCardNumber || emp.idCard || 'N/A').trim();
          const salary = emp.monthlySalary || 'N/A';
          const livePicture = emp.livePicture?.trim();

          // ✅ FIXED: Validate and correct employeeId from backend
          let formattedId = emp.employeeId || 'N/A';

          // If backend returns wrong ID format, try to correct it
          if (formattedId !== 'N/A') {
            if (emp.role === 'admin' && !formattedId.startsWith('ADM')) {
              const numberMatch = formattedId.match(/\d+/);
              if (numberMatch) {
                formattedId = `ADM${numberMatch[0].padStart(3, '0')}`;
              }
            } else if (
              emp.role === 'manager' &&
              !formattedId.startsWith('MGR')
            ) {
              const numberMatch = formattedId.match(/\d+/);
              if (numberMatch) {
                formattedId = `MGR${numberMatch[0].padStart(3, '0')}`;
              }
            } else if (
              emp.role === 'employee' &&
              !formattedId.startsWith('EMP')
            ) {
              const numberMatch = formattedId.match(/\d+/);
              if (numberMatch) {
                formattedId = `EMP${numberMatch[0].padStart(3, '0')}`;
              }
            }
          }

          return {
            id: formattedId,
            _id: emp._id,
            name: emp.name.trim(),
            phoneNumber: emp.phoneNumber,
            idCardNumber: emp.idCardNumber || 'N/A',
            salary:
              typeof salary === 'number'
                ? salary.toLocaleString()
                : String(salary),
            joiningDate: moment(emp.createdAt).format('MMMM DD, YYYY'),
            faceImage: livePicture || null,
            type:
              emp.role === 'manager'
                ? 'Manager'
                : emp.role === 'admin'
                ? 'Admin'
                : 'Employee',
            faceRecognized: !!livePicture,
          };
        });

        console.log('📊 Corrected Mapped Employees:', mappedEmployees);
        setEmployeesData(mappedEmployees);
      } else {
        Alert.alert('Error', 'Failed to load employee data.');
      }
    } catch (error) {
      console.error('🚨 Error fetching employees:', error.message);
      Alert.alert(
        'Network Error',
        'Could not connect to server. Please check your connection.',
      );
    } finally {
      setIsLoadingEmployees(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchEmployeesFromAPI();
  }, []);

  // ✅ FIXED: Listen for new employee and auto-refresh
  useEffect(() => {
    if (route.params?.newEmployee) {
      console.log('🆕 New employee detected, refreshing list...');

      // Auto-refresh the employee list
      fetchEmployeesFromAPI();

      // Clear the parameter
      navigation.setParams({ newEmployee: undefined });
    }
  }, [route.params?.newEmployee, navigation]);

  // ✅ FIXED: Refresh on focus for better UX
  useFocusEffect(
    useCallback(() => {
      console.log('🔄 Screen focused, refreshing employee list...');
      fetchEmployeesFromAPI();
    }, []),
  );

  // Modal handlers
  const handleOpenAddEmployeeModal = () => {
    setIsAddEmployeeModalVisible(true);
  };

  // ✅ FIXED: Always refresh after closing modal
  const handleCloseAddEmployeeModal = (shouldRefresh = true) => {
    setIsAddEmployeeModalVisible(false);
    if (shouldRefresh) {
      console.log('🔄 Refreshing after modal close...');
      fetchEmployeesFromAPI();
    }
  };

  // Date picker
  const onDateChange = (event, date) => {
    setShowDatePicker(false);
    if (event.type === 'set' && date) {
      setSelectedFilterDate(date);
    }
  };

  const handleOpenDatePicker = () => {
    setShowDatePicker(true);
  };

  const handleClearDateFilter = () => {
    setSelectedFilterDate(null);
  };

  // Handle delete employee
  const handleDeleteEmployee = employee => {
    setSelectedEmployee(employee);
    setIsDeleteModalVisible(true);
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalVisible(false);
    setSelectedEmployee(null);
  };

  const handleConfirmDelete = async () => {
    if (!selectedEmployee) return;

    try {
      setIsDeleting(true);

      const admin = await getAuthenticatedAdmin();
      if (!admin?.token) {
        Alert.alert(
          'Error',
          'Authentication token not found. Please login again.',
        );
        handleCloseDeleteModal();
        return;
      }

      console.log('🗑️ Deleting employee:', selectedEmployee.name);

      const response = await axios.delete(
        `${BASE_URL}/employees/${selectedEmployee._id}`,
        {
          headers: {
            Authorization: `Bearer ${admin.token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (response.status === 200) {
        setEmployeesData(prevData =>
          prevData.filter(emp => emp._id !== selectedEmployee._id),
        );

        Alert.alert(
          'Success',
          `Employee ${selectedEmployee.name} has been deleted successfully.`,
        );
        handleCloseDeleteModal();
      }
    } catch (error) {
      console.error('❌ Delete employee error:', error);
      let errorMessage = 'Failed to delete employee. Please try again.';

      if (error.response?.status === 401) {
        errorMessage = 'Authentication failed. Please login again.';
      } else if (error.response?.status === 404) {
        errorMessage = 'Employee not found.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }

      Alert.alert('Error', errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };

  // Render employee row
  const renderEmployeeItem = ({ item, index }) => (
    <View
      style={[
        styles.row,
        { backgroundColor: index % 2 === 0 ? '#2E2E2E' : '#1F1F1F' },
      ]}
    >
      <Text style={styles.employeeIdCell}>{item.id}</Text>
      <Text style={styles.employeeNameCell}>{item.name}</Text>
      <Text style={styles.employeeTypeCell}>{item.type}</Text>
      <Text style={styles.employeePhoneCell}>{item.phoneNumber}</Text>
      <Text style={styles.employeeIdCardCell}>{item.idCardNumber}</Text>
      <Text style={styles.employeeSalaryCell}>{item.salary}</Text>
      <Text style={styles.employeeJoiningDateCell}>{item.joiningDate}</Text>
      <View style={styles.employeeActionCell}>
        <TouchableOpacity
          onPress={() => handleDeleteEmployee(item)}
          style={styles.deleteButton}
        >
          <Ionicons name="trash-outline" size={width * 0.018} color="#ff5555" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* ✅ DYNAMIC HEADER — Same as AdvanceSalary screen */}
      <View style={styles.header}>
        <View style={styles.headerCenter}>
          <View style={styles.userInfo}>
            <Text style={styles.greeting}>Hello 👋</Text>
            <Text style={styles.userName}>{truncateUsername(userName)}</Text>
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

      {/* Content */}
      <ScrollView
        style={styles.contentArea}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Employees Header */}
        <View style={styles.employeesHeaderSection}>
          <Text style={styles.screenTitle}>Employees</Text>

          <View style={styles.buttonsGroup}>
            <TouchableOpacity
              style={styles.datePickerButton}
              onPress={handleOpenDatePicker}
            >
              <Ionicons
                name="calendar-outline"
                size={width * 0.02}
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
                  <Ionicons
                    name="close-circle"
                    size={width * 0.018}
                    color="#fff"
                  />
                </TouchableOpacity>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.addEmployeeButton}
              onPress={handleOpenAddEmployeeModal}
            >
              <Ionicons
                name="add-circle-outline"
                size={width * 0.02}
                color="#fff"
                style={{ marginRight: 8 }}
              />
              <Text style={styles.addEmployeeButtonText}>Add New Employee</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Table */}
        <View style={styles.tableContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.tableWrapper}>
              <View style={styles.tableHeader}>
                <Text style={styles.employeeIdHeader}>Employee ID</Text>
                <Text style={styles.employeeNameHeader}>Name</Text>
                <Text style={styles.employeeTypeHeader}>Type</Text>
                <Text style={styles.employeePhoneHeader}>Phone</Text>
                <Text style={styles.employeeIdCardHeader}>ID Card</Text>
                <Text style={styles.employeeSalaryHeader}>Salary</Text>
                <Text style={styles.employeeJoiningDateHeader}>
                  Joining Date
                </Text>
                <Text style={styles.employeeActionHeader}>Actions</Text>
              </View>

              {isLoadingEmployees ? (
                <View style={styles.loadingContainer}>
                  <RNActivityIndicator size="large" color="#A98C27" />
                  <Text style={styles.loadingText}>Loading employees...</Text>
                </View>
              ) : (
                <FlatList
                  data={filteredEmployees}
                  renderItem={renderEmployeeItem}
                  keyExtractor={item => item.id}
                  scrollEnabled={false}
                  ListEmptyComponent={() => (
                    <View style={styles.noDataContainer}>
                      <Text style={styles.noDataText}>No employees found.</Text>
                    </View>
                  )}
                />
              )}
            </View>
          </ScrollView>
        </View>
      </ScrollView>

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          testID="dateTimePicker"
          value={selectedFilterDate || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onDateChange}
        />
      )}

      {/* Add Employee Modal */}
      <AddEmployeeModal
        isVisible={isAddEmployeeModalVisible}
        onClose={handleCloseAddEmployeeModal}
        onSave={() => {
          console.log('✅ Employee saved, triggering refresh...');
          fetchEmployeesFromAPI();
        }}
      />

      {/* Delete Employee Modal */}
      {isDeleteModalVisible && selectedEmployee && (
        <View style={styles.modalOverlay}>
          <View style={styles.deleteModalContainer}>
            <View style={styles.deleteModalContent}>
              <Text style={styles.deleteModalTitle}>Delete Employee</Text>
              <Text style={styles.deleteModalMessage}>
                Are you sure you want to delete this employee?
              </Text>
              <Text style={styles.deleteModalEmployeeInfo}>
                {selectedEmployee.name} ({selectedEmployee.type})
              </Text>

              <View style={styles.deleteModalButtons}>
                <TouchableOpacity
                  style={styles.deleteModalCancelButton}
                  onPress={handleCloseDeleteModal}
                  disabled={isDeleting}
                >
                  <Text style={styles.deleteModalCancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.deleteModalConfirmButton,
                    isDeleting && styles.deleteModalButtonDisabled,
                  ]}
                  onPress={handleConfirmDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <RNActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.deleteModalConfirmButtonText}>
                      Yes, Delete
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      )}
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
    marginLeft: width * 0.0001,
    marginRight: width * 0.0001,
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
  contentArea: {
    flex: 1,
    backgroundColor: '#1e1f20ff',
    borderRadius: 10,
  },
  scrollContent: {
    padding: width * 0.02,
    paddingBottom: height * 0.05,
  },
  screenTitle: {
    color: '#fff',
    fontSize: width * 0.029,
    fontWeight: '600',
    marginRight: width * 0.01,
  },
  employeesHeaderSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: height * 0.02,
    marginTop: height * -0.01,
    borderBottomWidth: 1,
    borderBottomColor: '#3C3C3C',
    paddingBottom: height * 0.03,
  },
  buttonsGroup: {
    flexDirection: 'row',
    gap: width * 0.02,
    alignItems: 'center',
  },
  addEmployeeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#A98C27',
    paddingVertical: height * 0.012,
    paddingHorizontal: width * 0.025,
    borderRadius: 8,
  },
  addEmployeeButtonText: {
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
    backgroundColor: '#1e1f20ff',
    borderRadius: 8,
    overflow: 'hidden',
    minHeight: height * 0.4,
  },
  tableWrapper: {
    minWidth: width * 1.08,
    flexDirection: 'column',
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: height * 0.018,
    backgroundColor: '#1e1f20ff',
    borderBottomWidth: 1,
    borderBottomColor: '#3C3C3C',
    alignItems: 'center',
  },
  employeeIdHeader: {
    width: width * 0.15,
    color: '#fff',
    fontWeight: '600',
    fontSize: width * 0.015,
    textAlign: 'left',
    paddingHorizontal: width * 0.005,
  },
  employeeNameHeader: {
    width: width * 0.12,
    color: '#fff',
    fontWeight: '600',
    fontSize: width * 0.015,
    textAlign: 'left',
    paddingHorizontal: width * 0.005,
  },
  employeeTypeHeader: {
    width: width * 0.1,
    color: '#fff',
    fontWeight: '600',
    fontSize: width * 0.015,
    textAlign: 'left',
    paddingHorizontal: width * 0.005,
  },
  employeePhoneHeader: {
    width: width * 0.15,
    color: '#fff',
    fontWeight: '600',
    fontSize: width * 0.015,
    textAlign: 'left',
    paddingHorizontal: width * 0.005,
  },
  employeeIdCardHeader: {
    width: width * 0.15,
    color: '#fff',
    fontWeight: '600',
    fontSize: width * 0.015,
    textAlign: 'left',
    paddingHorizontal: width * 0.005,
  },
  employeeSalaryHeader: {
    width: width * 0.1,
    color: '#fff',
    fontWeight: '600',
    fontSize: width * 0.014,
    textAlign: 'left',
    paddingHorizontal: width * 0.005,
  },
  employeeJoiningDateHeader: {
    width: width * 0.15,
    color: '#fff',
    fontWeight: '600',
    fontSize: width * 0.014,
    textAlign: 'left',
    paddingHorizontal: width * 0.005,
  },
  employeeActionHeader: {
    width: width * 0.1,
    color: '#fff',
    fontWeight: '600',
    fontSize: width * 0.014,
    textAlign: 'center',
    paddingHorizontal: width * 0.005,
  },
  row: {
    flexDirection: 'row',
    paddingVertical: height * 0.019,
    paddingHorizontal: width * 0.01,
    alignItems: 'center',
    borderBottomWidth: 0.5,
    borderBottomColor: '#3C3C3C',
    minHeight: height * 0.05,
  },
  employeeIdCell: {
    width: width * 0.15,
    color: '#fff',
    fontSize: width * 0.013,
    textAlign: 'left',
    paddingHorizontal: width * 0.005,
  },
  employeeNameCell: {
    width: width * 0.12,
    color: '#fff',
    fontSize: width * 0.013,
    textAlign: 'left',
    paddingHorizontal: width * 0.005,
  },
  employeeTypeCell: {
    width: width * 0.1,
    color: '#fff',
    fontSize: width * 0.013,
    textAlign: 'left',
    paddingHorizontal: width * 0.005,
  },
  employeePhoneCell: {
    width: width * 0.15,
    color: '#fff',
    fontSize: width * 0.013,
    textAlign: 'left',
    paddingHorizontal: width * 0.005,
  },
  employeeIdCardCell: {
    width: width * 0.15,
    color: '#fff',
    fontSize: width * 0.013,
    textAlign: 'left',
    paddingHorizontal: width * 0.005,
  },
  employeeSalaryCell: {
    width: width * 0.1,
    color: '#fff',
    fontSize: width * 0.013,
    textAlign: 'left',
    paddingHorizontal: width * 0.005,
  },
  employeeJoiningDateCell: {
    width: width * 0.15,
    color: '#fff',
    fontSize: width * 0.013,
    textAlign: 'left',
    paddingHorizontal: width * 0.005,
  },
  employeeActionCell: {
    width: width * 0.1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: width * 0.005,
  },
  deleteButton: {
    padding: width * 0.008,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 85, 85, 0.1)',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#A9A9A9',
    fontSize: width * 0.02,
    marginTop: 10,
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
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  deleteModalContainer: {
    backgroundColor: '#1F1F1F',
    borderRadius: 12,
    padding: width * 0.03,
    width: width * 0.5,
    maxWidth: 400,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  deleteModalContent: {
    alignItems: 'center',
  },
  deleteModalTitle: {
    color: '#fff',
    fontSize: width * 0.022,
    fontWeight: 'bold',
    marginBottom: height * 0.02,
    textAlign: 'center',
  },
  deleteModalMessage: {
    color: '#ccc',
    fontSize: width * 0.018,
    textAlign: 'center',
    marginBottom: height * 0.015,
  },
  deleteModalEmployeeInfo: {
    color: '#A98C27',
    fontSize: width * 0.02,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: height * 0.03,
  },
  deleteModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  deleteModalCancelButton: {
    flex: 1,
    backgroundColor: '#3C3C3C',
    paddingVertical: height * 0.015,
    borderRadius: 8,
    marginRight: width * 0.01,
    alignItems: 'center',
  },
  deleteModalCancelButtonText: {
    color: '#fff',
    fontSize: width * 0.016,
    fontWeight: '600',
  },
  deleteModalConfirmButton: {
    flex: 1,
    backgroundColor: '#ff5555',
    paddingVertical: height * 0.015,
    borderRadius: 8,
    marginLeft: width * 0.01,
    alignItems: 'center',
  },
  deleteModalConfirmButtonText: {
    color: '#fff',
    fontSize: width * 0.016,
    fontWeight: '600',
  },
  deleteModalButtonDisabled: {
    backgroundColor: '#666',
  },
});

export default EmployeesScreen;
