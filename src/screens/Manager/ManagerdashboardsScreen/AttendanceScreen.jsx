// src/screens/Manager/ManagerScreens/ManagerAttendanceScreen.jsx
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
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import NotificationBell from '../../../components/NotificationBell';
import DateTimePicker from '@react-native-community/datetimepicker';
import moment from 'moment';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAllAdminAttendance } from '../../../api/attendanceService';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');
const isTablet = width >= 768;

const userProfileImagePlaceholder = require('../../../assets/images/logo.png');

// Helper function to truncate username to 6 words maximum
const truncateUsername = username => {
  if (!username) return 'Guest';
  const words = username.split(' ');
  if (words.length <= 6) return username;
  return words.slice(0, 6).join(' ') + '...';
};

// Helper function to get image source (local asset or URI)
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

// 🔐 Get authentication token - works for both manager and admin
const getAuthToken = async () => {
  try {
    const managerAuth = await AsyncStorage.getItem('managerAuth');
    const adminAuth = await AsyncStorage.getItem('adminAuth');

    let token = null;
    let user = null;

    if (managerAuth) {
      const parsed = JSON.parse(managerAuth);
      if (parsed.token && parsed.isAuthenticated) {
        token = parsed.token;
        user = parsed.manager;
      }
    } else if (adminAuth) {
      const parsed = JSON.parse(adminAuth);
      if (parsed.token && parsed.isAuthenticated) {
        token = parsed.token;
        user = parsed.admin;
      }
    }

    return { token, user };
  } catch (error) {
    console.error('❌ Failed to get auth token:', error);
    return { token: null, user: null };
  }
};

// 🗃️ Save attendance to AsyncStorage
const saveAttendanceToStorage = async data => {
  try {
    await AsyncStorage.setItem('attendanceRecords', JSON.stringify(data));
  } catch (error) {
    console.error('❌ Failed to save attendance to storage:', error);
  }
};

// 📥 Load attendance from AsyncStorage
const loadAttendanceFromStorage = async () => {
  try {
    const stored = await AsyncStorage.getItem('attendanceRecords');
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error('❌ Failed to load attendance from storage:', error);
    return null;
  }
};

// ✅ Fetch unified attendance records (same as Admin panel)
const fetchEmployeeAttendanceRecords = async () => {
  try {
    console.log(
      '📡 [Manager Attendance] Fetching unified attendance records...',
    );
    const response = await getAllAdminAttendance();
    console.log('✅ [Manager Attendance] API Response:', response);

    if (Array.isArray(response)) {
      const mappedAttendance = response.map((record, index) => {
        let role = 'Employee';
        let name = 'Unknown';
        let id = `EMP${String(index + 1).padStart(3, '0')}`;

        if (record.adminName) {
          name = record.adminName;
          role = 'Admin';
          const adminIdValue = typeof record.adminId === 'object' && record.adminId !== null
            ? (record.adminId.adminId || record.adminId.employeeId || record.adminId._id)
            : record.adminId;
          id =
            record.adminCustomId ||
            adminIdValue ||
            `ADM${String(index + 1).padStart(3, '0')}`;
          if (record.adminId && typeof record.adminId === 'object') {
            role =
              record.adminId.role === 'manager'
                ? 'Manager'
                : record.adminId.role === 'admin'
                ? 'Admin'
                : 'Employee';
          }
        } else if (record.managerName) {
          name = record.managerName;
          role = 'Manager';
          const managerIdValue = typeof record.managerId === 'object' && record.managerId !== null
            ? (record.managerId.managerId || record.managerId.employeeId || record.managerId._id)
            : record.managerId;
          id =
            record.managerCustomId ||
            managerIdValue ||
            `MGR${String(index + 1).padStart(3, '0')}`;
        } else if (record.employeeName || record.employeeId) {
          name = record.employeeName || (typeof record.employeeId === 'object' ? record.employeeId.name : name);
          role = 'Employee';
          const employeeIdValue = typeof record.employeeId === 'object' && record.employeeId !== null
            ? (record.employeeId.employeeId || record.employeeId._id)
            : record.employeeId;
          id =
            record.employeeCustomId ||
            employeeIdValue ||
            `EMP${String(index + 1).padStart(3, '0')}`;
        } else if (record.userName) {
          name = record.userName;
          role = record.role || 'Employee';
          id =
            record.userId ||
            record._id ||
            `USR${String(index + 1).padStart(3, '0')}`;
        }

        // Prefer explicit manual/admin-selected time fields if backend stored them
        const manualTime =
          record.time ||
          record.requestedTime ||
          record.manualTime ||
          record.selectedTime ||
          record.adminTime;

        // Determine display times (use manual time first, then fallback to checkInTime/checkOutTime)
        const checkInSource = manualTime || record.checkInTime;
        const checkOutSource = record.checkOutTime;

        return {
          _id: String(record._id),
          id: String(id),
          name: String(name),
          role: String(role),
          status:
            checkInSource && checkOutSource
              ? 'Present'
              : checkInSource
              ? 'Checked In'
              : 'Absent',
          checkIn: checkInSource
            ? moment(checkInSource).format('hh:mm A')
            : 'N/A',
          checkOut: checkOutSource
            ? moment(checkOutSource).format('hh:mm A')
            : 'N/A',
          date: moment(record.date).format('MMMM DD, YYYY'),
        };
      });

      console.log(
        '📊 [Manager Attendance] Mapped attendance data:',
        mappedAttendance,
      );
      return mappedAttendance;
    }

    throw new Error(response.message || 'Invalid API response format.');
  } catch (error) {
    console.error('❌ [Manager Attendance] Failed to fetch attendance:', error);
    throw error;
  }
};

const AttendanceScreen = () => {
  const navigation = useNavigation();

  const [userData, setUserData] = useState({
    userName: 'Guest',
    userProfileImage: userProfileImagePlaceholder,
  });

  const [allAttendanceData, setAllAttendanceData] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  const [selectedFilterDate, setSelectedFilterDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isAbsentFilterActive, setIsAbsentFilterActive] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  // ✅ Load user data and attendance data
  const loadUserDataAndAttendance = useCallback(async () => {
    try {
      setLoading(true);

      // Get auth token and user data
      const { token, user } = await getAuthToken();
      if (!token) {
        Alert.alert('Authentication Error', 'Please login again.', [
          {
            text: 'OK',
            onPress: () => navigation.replace('RoleSelection'),
          },
        ]);
        return;
      }

      if (user) {
        setUserData({
          userName: user.name || 'Guest',
          userProfileImage: user.livePicture
            ? { uri: user.livePicture }
            : userProfileImagePlaceholder,
        });
      }

      // Always fetch fresh from API first so newly approved records appear
      let attendanceData = null;
      try {
        attendanceData = await fetchEmployeeAttendanceRecords();
        await saveAttendanceToStorage(attendanceData);
      } catch (apiErr) {
        console.warn('⚠️ Falling back to cached attendance due to API error:', apiErr?.message);
        attendanceData = (await loadAttendanceFromStorage()) || [];
      }

      setAllAttendanceData(attendanceData);
    } catch (error) {
      console.error('❌ Failed to load data:', error);
      Alert.alert('Error', 'Failed to load attendance data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUserDataAndAttendance();
  }, [loadUserDataAndAttendance]);

  useFocusEffect(
    useCallback(() => {
      console.log('🔄 [AttendanceScreen] Screen focused - refreshing data...');
      loadUserDataAndAttendance();
      setSelectedFilterDate(null);
      setSearchText('');
      setIsAbsentFilterActive(false);
    }, [loadUserDataAndAttendance]),
  );

  const onRefresh = useCallback(() => {
    console.log('🔄 [AttendanceScreen] Pull to refresh triggered...');
    loadUserDataAndAttendance();
  }, [loadUserDataAndAttendance]);

  // ✅ LOCAL DELETE FUNCTION (NO BACKEND)
  const handleDeleteAttendance = async attendanceId => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this attendance record permanently?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeletingId(attendanceId);

              // Remove from local state
              const updatedData = allAttendanceData.filter(
                item => item._id !== attendanceId,
              );
              setAllAttendanceData(updatedData);

              // Save updated data to AsyncStorage (permanent deletion)
              await saveAttendanceToStorage(updatedData);

              Alert.alert('Success', 'Attendance record deleted permanently!');
            } catch (error) {
              console.error('❌ Error during local deletion:', error);
              Alert.alert(
                'Error',
                'Failed to delete record. Please try again.',
              );
              // Revert state on error
              setAllAttendanceData(prev => [...prev]);
            } finally {
              setDeletingId(null);
            }
          },
        },
      ],
    );
  };

  // Filter attendance data
  const filteredAttendanceData = useMemo(() => {
    let currentData = [...allAttendanceData];

    if (isAbsentFilterActive) {
      currentData = currentData.filter(
        item => item.status.toLowerCase() === 'absent',
      );
    }

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

    if (searchText) {
      currentData = currentData.filter(
        item =>
          item.name.toLowerCase().includes(searchText.toLowerCase()) ||
          item.id.toLowerCase().includes(searchText.toLowerCase()) ||
          item.status.toLowerCase().includes(searchText.toLowerCase()),
      );
    }

    return currentData;
  }, [allAttendanceData, selectedFilterDate, searchText, isAbsentFilterActive]);

  useEffect(() => {
    setPage(1);
  }, [allAttendanceData, selectedFilterDate, searchText, isAbsentFilterActive]);

  const totalPages = useMemo(() => {
    const t = Math.ceil((filteredAttendanceData?.length || 0) / PAGE_SIZE) || 1;
    return t;
  }, [filteredAttendanceData]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
    if (page < 1) setPage(1);
  }, [page, totalPages]);

  const paginatedData = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredAttendanceData.slice(start, start + PAGE_SIZE);
  }, [filteredAttendanceData, page]);

  // Date picker handlers
  const onDateChange = (event, date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (date) {
      setSelectedFilterDate(date);
    }
  };

  const handleOpenDatePicker = () => {
    setShowDatePicker(true);
  };

  const handleToggleAbsentFilter = () => {
    setIsAbsentFilterActive(prevState => !prevState);
  };

  const handleFaceScanForAttendance = () => {
    navigation.navigate('EmployeeAttendanceFaceRecognition');
  };

  // ✅ Render item (no Action column on manager side)
  const renderItem = ({ item, index }) => (
    <View
      style={[
        styles.row,
        { backgroundColor: index % 2 === 0 ? '#2E2E2E' : '#1F1F1F' },
      ]}
    >
      <Text style={styles.cell}>{String(item.id || '')}</Text>
      <Text style={styles.cell}>{String(item.name || '')}</Text>
      <Text style={[styles.cell, { color: '#A98C27' }] }>
        {String(item.role || '')}
      </Text>
      <Text
        style={[
          styles.cell,
          { color: item.status === 'Present' ? 'green' : '#ff5555' },
        ]}
      >
        {String(item.status || '')}
      </Text>
      <Text style={styles.cell}>{String(item.checkIn || '')}</Text>
      <Text style={styles.cell}>{String(item.checkOut || '')}</Text>
      <Text style={styles.cell}>{String(item.date || '')}</Text>
    </View>
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
      <Ionicons
        name="search"
        size={isTablet ? 20 : width * 0.027}
        color="#A9A9A9"
        style={styles.searchIcon}
      />
      <TextInput
        style={styles.searchInput}
        placeholder="Search anything"
        placeholderTextColor="#A9A9A9"
        value={searchText}
        onChangeText={setSearchText}
      />
    </View>
  </View>

  <View style={styles.headerRight}>
    <TouchableOpacity
      style={styles.cartButton}
      onPress={() => navigation.navigate('ManagerCartScreen')}
    >
      <Ionicons
        name="cart-outline"
        size={width * 0.039}
        color="#fff"
      />
    </TouchableOpacity>

    <Image
      source={userData.userProfileImage}
      style={styles.profileImage}
      resizeMode="cover"
    />
  </View>
</View>

      {/* Controls */}
      <View style={styles.controls}>
        <Text style={styles.attendanceTitle}>Attendance</Text>
        <View style={styles.filterActions}>
          {/* Absent Filter Button */}
          {/* <TouchableOpacity
            style={[
              styles.filterButton,
              isAbsentFilterActive && styles.activeFilterButton,
            ]}
            onPress={handleToggleAbsentFilter}
          >
            <Ionicons
              name={isAbsentFilterActive ? 'checkmark-circle' : 'close-circle'}
              size={16}
              color="#fff"
              style={{ marginRight: 5 }}
            />
            <Text style={styles.filterText}>Absent</Text>
          </TouchableOpacity> */}

          {/* Date Filter */}
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

          {/* Face Scan for Add Attendance */}
          <TouchableOpacity
            style={styles.faceScanButton}
            onPress={handleFaceScanForAttendance}
          >
            <Ionicons
              name="scan-outline"
              size={width * 0.02}
              color="#fff"
              style={styles.faceScanIcon}
            />
            <Text style={styles.faceScanButtonText}>
              Face Scan for Add Attendance
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Loading Indicator */}
      {loading ? (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#A98C27" />
          <Text style={styles.loadingText}>Loading attendance data...</Text>
        </View>
      ) : (
        <>
          {/* Horizontal Scrollable Table */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={true}
            style={styles.tableContainer}
          >
            <View style={styles.tableWrapper}>
              {/* Table Header */}
              <View style={styles.tableHeader}>
                <Text style={styles.headerCell}>Employee ID</Text>
                <Text style={styles.headerCell}>Name</Text>
                <Text style={styles.headerCell}>Role</Text>
                <Text style={styles.headerCell}>Status</Text>
                <Text style={styles.headerCell}>Check In</Text>
                <Text style={styles.headerCell}>Check Out</Text>
                <Text style={styles.headerCell}>Date</Text>
              </View>

              {/* Table Rows */}
              <FlatList
                data={paginatedData}
                renderItem={renderItem}
                keyExtractor={item => item._id}
                style={styles.table}
                scrollEnabled={false}
                refreshing={loading}
                onRefresh={onRefresh}
                ListEmptyComponent={() => (
                  <View style={styles.noDataContainer}>
                    <Text style={styles.noDataText}>
                      {searchText || selectedFilterDate || isAbsentFilterActive
                        ? 'No attendance records found for the selected filters.'
                        : 'No employee attendance records yet. Use Face Scan to add attendance.'}
                    </Text>
                  </View>
                )}
              />
            </View>
          </ScrollView>
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
        </>
      )}

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
  profileImage: {
    width: width * 0.058,
    height: width * 0.058,
    borderRadius: (width * 0.058) / 2,
  },
  attendanceTitle: {
    color: '#fff',
    fontSize: width * 0.027,
    fontWeight: '600',
    marginRight: 20,
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
  filterActions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    flex: 1,
    justifyContent: 'flex-end',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#222',
    paddingVertical: height * 0.01,
    paddingHorizontal: width * 0.015,
    borderRadius: 6,
    marginRight: width * 0.01,
    minWidth: width * 0.1,
    justifyContent: 'center',
  },
  filterText: {
    color: '#fff',
    fontSize: width * 0.012,
  },
  activeFilterButton: {
    backgroundColor: '#A98C27',
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
  faceScanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#A98C27',
    paddingVertical: height * 0.015,
    paddingHorizontal: width * 0.01,
    borderRadius: 10,
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    flex: 0.8,
    maxWidth: width * 0.25,
  },
  faceScanIcon: {
    marginRight: width * 0.005,
  },
  faceScanButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: width * 0.012,
    textAlign: 'center',
  },
  tableContainer: {
    backgroundColor: '#1F1F1F',
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: height * 0.02,
  },
  tableWrapper: {
    // Match roughly 7 columns * 0.18 * width to avoid large empty space on right
    minWidth: width * 1.26,
    flexDirection: 'column',
  },
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginTop: height * 0.01,
    paddingVertical: height * 0.01,
    backgroundColor: '#2B2B2B',
    paddingHorizontal: width * 0.005,
    borderRadius: 5,
    paddingLeft: width * 0.01,
  },
  headerCell: {
    color: '#fff',
    fontWeight: '600',
    fontSize: width * 0.014,
    width: width * 0.18,
    textAlign: 'center',
    paddingHorizontal: width * 0.005,
  },
  row: {
    flexDirection: 'row',
    paddingVertical: height * 0.012,
    paddingHorizontal: width * 0.005,
    alignItems: 'center',
    paddingLeft: width * 0.01,
  },
  cell: {
    color: '#fff',
    fontSize: width * 0.013,
    width: width * 0.18,
    textAlign: 'center',
    paddingHorizontal: width * 0.005,
    paddingVertical: height * 0.01,
  },
  deleteCell: {
    width: width * 0.18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: width * 0.005,
  },
  table: {
    marginTop: height * 0.009,
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
  loadingOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(17, 17, 17, 0.8)',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
  },
  loadingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: width * 0.02,
  },
});

export default AttendanceScreen;
