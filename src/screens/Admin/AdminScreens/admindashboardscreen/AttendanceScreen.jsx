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
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import NotificationBell from '../../../../components/NotificationBell';
import DateTimePicker from '@react-native-community/datetimepicker';
import moment from 'moment';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getCombinedAttendance,
  getAllAdminAttendance,
  deleteAdminAttendance,
  adminRecordEmployeeAttendance,
} from '../../../../api/attendanceService';
import {
  useNavigation,
  useFocusEffect,
  useRoute,
} from '@react-navigation/native';

import AddAttendanceModal from './modals/AddAttendanceModal';
import AdminCheckInOutModal from './modals/AdminCheckInOutModal';

const { width, height } = Dimensions.get('window');
const screenWidth = Dimensions.get('window').width;

const userProfileImagePlaceholder = require('../../../../assets/images/logo.png');

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

// 🔐 Authentication status check
const checkAuthStatus = async () => {
  try {
    const adminAuthData = await AsyncStorage.getItem('adminAuth');
    console.log(
      '🔑 [AttendanceScreen] Auth data check:',
      adminAuthData ? 'Found' : 'Not found',
    );
    if (adminAuthData) {
      const authData = JSON.parse(adminAuthData);
      console.log('🔑 [AttendanceScreen] Auth status:', {
        tokenExists: !!authData.token,
        adminExists: !!authData.admin,
        isAuthenticated: authData.isAuthenticated,
        adminName: authData.admin?.name,
      });
      return authData;
    }
    return null;
  } catch (error) {
    console.error('❌ [AttendanceScreen] Auth check failed:', error);
    return null;
  }
};

const AttendanceScreen = () => {
  const navigation = useNavigation();
  // Build header user from storage for consistency
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

  const [allAttendanceData, setAllAttendanceData] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [selectedFilterDate, setSelectedFilterDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [isAbsentFilterActive, setIsAbsentFilterActive] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isCheckInOutModalVisible, setIsCheckInOutModalVisible] =
    useState(false);
  const [checkInOutType, setCheckInOutType] = useState('checkin');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hiddenAttendanceIds, setHiddenAttendanceIds] = useState([]);

  const HIDDEN_ATTENDANCE_IDS_KEY = 'hiddenAttendanceIds';

  // ✅ Fetch admin attendance records from API WITH TOKEN
  const fetchAttendanceRecords = useCallback(
    async (showLoading = true) => {
      try {
        if (showLoading) setIsLoadingAttendance(true);
        console.log(
          '📡 [AttendanceScreen] Fetching admin attendance records...',
        );

        // ✅ Get token first
        const authStatus = await checkAuthStatus();
        if (!authStatus?.token) {
          console.log('❌ [AttendanceScreen] No token available');
          Alert.alert('Authentication Error', 'Please login again.', [
            {
              text: 'OK',
              onPress: () => navigation.replace('AdminLogin'),
            },
          ]);
          setAllAttendanceData([]);
          return;
        }

        console.log('✅ [AttendanceScreen] Token available, calling API...');

        // ✅ Prefer combined attendance (admin + employee). Falls back internally.
        const response = await getCombinedAttendance(authStatus.token);

        console.log('✅ [AttendanceScreen] API Response:', response);

        if (Array.isArray(response)) {
          // ✅ Show ALL attendance records (Admin, Manager, Employee)
          const mappedAttendance = response.map((record, index) => {
            // Determine role and name based on available fields
            let role = 'Employee';
            let name = 'Unknown';
            let id = `EMP${String(index + 1).padStart(3, '0')}`;
            let profileImage = userProfileImagePlaceholder;

            // Check for admin records
            if (record.adminName) {
              name = record.adminName;
              role = 'Admin';
              const adminIdValue =
                typeof record.adminId === 'object' && record.adminId !== null
                  ? (record.adminId.adminId || record.adminId.employeeId || record.adminId._id)
                  : record.adminId;
              id =
                record.adminCustomId ||
                adminIdValue ||
                `ADM${String(index + 1).padStart(3, '0')}`;
              if (record.adminId && typeof record.adminId === 'object') {
                role = record.adminId.role;
                profileImage = record.adminId.profilePicture;
              }
            }
            // Check for manager records
            else if (record.managerName) {
              name = record.managerName;
              role = 'Manager';
              const managerIdValue =
                typeof record.managerId === 'object' && record.managerId !== null
                  ? (record.managerId.managerId || record.managerId.employeeId || record.managerId._id)
                  : record.managerId;
              id =
                record.managerCustomId ||
                managerIdValue ||
                `MGR${String(index + 1).padStart(3, '0')}`;
            }
            // Check for employee records
            else if (record.employeeName || record.employeeId) {
              name = record.employeeName || (typeof record.employeeId === 'object' ? record.employeeId.name : 'Unknown');
              role = 'Employee';
              const employeeIdValue =
                typeof record.employeeId === 'object' && record.employeeId !== null
                  ? (record.employeeId.employeeId || record.employeeId._id)
                  : record.employeeId;
              id =
                record.employeeCustomId ||
                employeeIdValue ||
                `EMP${String(index + 1).padStart(3, '0')}`;
            }
            // Check for user records (generic)
            else if (record.userName) {
              name = record.userName;
              role = record.role || 'Employee';
              id =
                record.userId ||
                record._id ||
                `USR${String(index + 1).padStart(3, '0')}`;
            }

            // Prefer explicit manual time fields if backend stored the admin-selected time
            const manualTime =
              record.time ||
              record.requestedTime ||
              record.manualTime ||
              record.selectedTime ||
              record.adminTime;

            // Determine display times
            // ✅ For check-in we want to trust the exact clock time string the admin selected on the frontend
            let checkInDisplay = 'N/A';
            if (record.time) {
              // Frontend sends "HH:mm" (e.g. "16:00"), parse explicitly without timezone shifts
              const parsed = moment(record.time, ['HH:mm', 'HH:mm:ss'], true);
              checkInDisplay = parsed.isValid()
                ? parsed.format('hh:mm A')
                : moment(record.time).format('hh:mm A');
            } else if (manualTime) {
              checkInDisplay = moment(manualTime).format('hh:mm A');
            } else if (record.checkInTime) {
              // Fallback: adjust stored Date by -4 hours to neutralize server timezone offset
              // so that displayed time matches the admin's intended local time.
              checkInDisplay = moment(record.checkInTime)
                .subtract(4, 'hours')
                .format('hh:mm A');
            }

            const checkOutSource = record.checkOutTime;

            // Build check-out display; for now we only have Date from backend, so
            // apply the same -4 hours adjustment to counter server timezone offset.
            let checkOutDisplay = 'N/A';
            if (checkOutSource) {
              checkOutDisplay = moment(checkOutSource)
                .subtract(4, 'hours')
                .format('hh:mm A');
            }

            return {
              id: id,
              name: name,
              role: role,
              profileImage: profileImage,
              status:
                record.checkInTime && record.checkOutTime
                  ? 'Present'
                  : record.checkInTime
                  ? 'Checked In'
                  : 'Absent',
              checkIn: checkInDisplay,
              checkOut: checkOutDisplay,
              date: moment(record.date).format('MMMM DD, YYYY'),
              _id: record._id,
              // Store original record for reference
              originalRecord: record,
            };
          });

          console.log(
            '📊 [AttendanceScreen] Mapped attendance ',
            mappedAttendance,
          );
          const filtered = mappedAttendance.filter(
            item => !hiddenAttendanceIds.includes(item._id),
          );
          setAllAttendanceData(filtered);
        } else {
          console.log(
            '⚠️ [AttendanceScreen] API response not an array:',
            response,
          );
          setAllAttendanceData([]);
        }
      } catch (error) {
        console.error(
          '❌ [AttendanceScreen] Failed to fetch attendance:',
          error,
        );
        Alert.alert(
          'Error',
          'Failed to load attendance records. Please try again.',
        );
        setAllAttendanceData([]);
      } finally {
        setIsLoadingAttendance(false);
        setIsRefreshing(false);
      }
    },
    [hiddenAttendanceIds],
  );

  // Load hidden IDs from storage once
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(HIDDEN_ATTENDANCE_IDS_KEY);
        const ids = raw ? JSON.parse(raw) : [];
        setHiddenAttendanceIds(Array.isArray(ids) ? ids : []);
      } catch (e) {
        setHiddenAttendanceIds([]);
      }
    })();
  }, []);

  // ✅ Delete attendance record
  const handleDeleteAttendance = async attendanceId => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this attendance record?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
          
              setAllAttendanceData(prevData =>
                prevData.filter(item => item._id !== attendanceId),
              );

              // Locally mark as hidden so it stays removed after refresh
              const updatedHidden = Array.from(
                new Set([...hiddenAttendanceIds, attendanceId]),
              );
              setHiddenAttendanceIds(updatedHidden);
              await AsyncStorage.setItem(
                HIDDEN_ATTENDANCE_IDS_KEY,
                JSON.stringify(updatedHidden),
              );

              // Try backend deletion if available, but ignore failure
              try {
                const authStatus = await checkAuthStatus();
                if (authStatus?.token) {
                  await deleteAdminAttendance(attendanceId, authStatus.token);
                }
              } catch {}

              Alert.alert('Success', 'Ateendance has been delted.');
            } catch (error) {
              console.error('❌ [Delete] Error:', error);
              // Even on error, keep it hidden locally
              Alert.alert('Notice', 'Deleted Sucessfully.');
            }
          },
        },
      ],
      { cancelable: true },
    );
  };

  // Handle pull to refresh
  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchAttendanceRecords(false);
  }, [fetchAttendanceRecords]);

  // Check authentication status and load attendance data on component mount
  useEffect(() => {
    fetchAttendanceRecords();
  }, [fetchAttendanceRecords]);

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchAttendanceRecords(false);
    }, [fetchAttendanceRecords]),
  );

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

    // Exclude hidden ids on every render
    currentData = currentData.filter(
      item => !hiddenAttendanceIds.includes(item._id),
    );

    return currentData;
  }, [
    allAttendanceData,
    selectedFilterDate,
    searchText,
    isAbsentFilterActive,
    hiddenAttendanceIds,
  ]);

  // Reset to first page whenever filters change
  useEffect(() => {
    setPage(1);
  }, [allAttendanceData, selectedFilterDate, searchText, isAbsentFilterActive, hiddenAttendanceIds]);

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

  const handleToggleAbsentFilter = () => {
    setIsAbsentFilterActive(prevState => !prevState);
  };

  const handleOpenAddModal = () => {
    setIsAddModalVisible(true);
  };

  const handleCloseAddModal = () => {
    setIsAddModalVisible(false);
  };

  const handleSaveNewAttendance = async newEntryData => {
    await fetchAttendanceRecords();
    setSelectedFilterDate(null);
    setSearchText('');
    setIsAbsentFilterActive(false);
  };

  // ✅ Open Check-In modal (admin selects target employee/manager inside modal)
  const handleUserCheckIn = useCallback(async () => {
    setCheckInOutType('checkin');
    setIsCheckInOutModalVisible(true);
  }, []);

  // ✅ Open Check-Out modal
  const handleUserCheckOut = useCallback(async () => {
    setCheckInOutType('checkout');
    setIsCheckInOutModalVisible(true);
  }, []);

  // ✅ Handle data submitted from AdminCheckInOutModal
  const handleModalSubmit = useCallback(
    async data => {
      try {
        const { employId, employeName, slectType, date, time, adminNotes } = data || {};

        if (!employId || !employeName || !slectType || !date) {
          Alert.alert('Error', 'Missing required attendance data.');
          return;
        }

        const type = (slectType || '').toLowerCase();

        setIsSubmitting(true);

        await adminRecordEmployeeAttendance(
          employId,
          employeName,
          type,
          date,
          time,
          adminNotes,
        );

        Alert.alert(
          'Success',
          `${type === 'checkin' ? 'Check-in' : 'Check-out'} recorded successfully!`,
        );

        setIsCheckInOutModalVisible(false);

        try {
          await fetchAttendanceRecords(false);
        } catch (refreshError) {
          console.error('❌ [AttendanceScreen] Refresh after modal submit failed:', refreshError);
        }
      } catch (error) {
        console.error('❌ [AttendanceScreen] handleModalSubmit error:', error);
        Alert.alert(
          'Error',
          error?.message ||
            `Failed to record ${
              (data?.slectType || '').toLowerCase() === 'checkin'
                ? 'check-in'
                : 'check-out'
            }. Please try again.`,
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [fetchAttendanceRecords],
  );

  // ✅ Render Item for FlatList with Delete Icon
  const renderItem = useCallback(
    ({ item, index }) => (
      <View
        style={[
          styles.row,
          { backgroundColor: index % 2 === 0 ? '#2E2E2E' : '#1F1F1F' },
        ]}
      >
        <Text style={styles.cell}>{String(item.id || '')}</Text>
        <Text style={styles.cell}>{String(item.name || '')}</Text>
        <Text style={[styles.cell, { color: '#A98C27' }]}>
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
        {/* ✅ Delete Icon */}
        <TouchableOpacity
          style={styles.deleteCell}
          onPress={() => handleDeleteAttendance(item._id)}
        >
          <Ionicons name="trash-outline" size={width * 0.018} color="#ff5555" />
        </TouchableOpacity>
      </View>
    ),
    [handleDeleteAttendance],
  );

  return (
    <View style={styles.container}>
      {/* Header Section */}
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
              <Ionicons
                name="cart-outline"
                size={width * 0.039}
                color="#fff"
              />
            </TouchableOpacity>
          <NotificationBell containerStyle={styles.notificationButton} />
          <Image
            source={profileImageSource}
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
                : 'Select Date'}
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

          {/* User Check-In button */}
          <TouchableOpacity
            style={[styles.checkButton, { backgroundColor: '#28a745' }]}
            onPress={handleUserCheckIn}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons
                name="log-in-outline"
                size={16}
                color="#fff"
                style={{ marginRight: 5 }}
              />
            )}
            <Text style={styles.checkText}>
              {isSubmitting ? 'Checking In...' : 'Check In'}
            </Text>
          </TouchableOpacity>

          {/* User Check-Out button */}
          <TouchableOpacity
            style={[styles.checkButton, { backgroundColor: '#dc3545' }]}
            onPress={handleUserCheckOut}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons
                name="log-out-outline"
                size={16}
                color="#fff"
                style={{ marginRight: 5 }}
              />
            )}
            <Text style={styles.checkText}>
              {isSubmitting ? 'Checking Out...' : 'Check Out'}
            </Text>
          </TouchableOpacity>

          {/* Add Attendance button */}
          {/* <TouchableOpacity
            style={styles.addButton}
            onPress={handleOpenAddModal}
          >
            <Ionicons
              name="add-circle-outline"
              size={16}
              color="#fff"
              style={{ marginRight: 5 }}
            />
            <Text style={styles.addText}>Add Attendance</Text>
          </TouchableOpacity> */}
        </View>
      </View>

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
            <Text style={styles.headerCell}>Action</Text>
          </View>

          {/* Table Rows */}
          <FlatList
            data={paginatedData}
            renderItem={renderItem}
            keyExtractor={item => item._id}
            style={styles.table}
            scrollEnabled={true}
            nestedScrollEnabled={true}
            contentContainerStyle={{ paddingBottom: 40 }}
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            ListEmptyComponent={() => (
              <View style={styles.noDataContainer}>
                {isLoadingAttendance ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#A98C27" />
                    <Text style={styles.loadingText}>
                      Loading attendance records...
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.noDataText}>
                    {searchText || selectedFilterDate || isAbsentFilterActive
                      ? 'No attendance records found for the selected filters.'
                      : 'No attendance records yet. Use "Check In" to record your attendance or "Add" for manual entry.'}
                  </Text>
                )}
              </View>
            )}
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

      {/* Render the AddAttendanceModal component */}
      <AddAttendanceModal
        isVisible={isAddModalVisible}
        onClose={handleCloseAddModal}
        onSave={handleSaveNewAttendance}
      />

      {/* Render the AdminCheckInOutModal component */}
      <AdminCheckInOutModal
        isVisible={isCheckInOutModalVisible}
        onClose={() => setIsCheckInOutModalVisible(false)}
        onSubmit={handleModalSubmit}
        selectType={checkInOutType}
        isLoading={isSubmitting}
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
    fontSize: width * 0.029,
    fontWeight: '600',
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
  activeFilterButton: {
    backgroundColor: '#A98C27',
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
  checkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: height * 0.01,
    paddingHorizontal: width * 0.015,
    borderRadius: 6,
    marginRight: width * 0.01,
  },
  checkText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: width * 0.014,
  },
  tableContainer: {
    backgroundColor: '#1e1f20ff',
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: height * 0.02,
  },
  tableWrapper: {
    minWidth: width * 1.5,
    flexDirection: 'column',
  },
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    color: '#A9A9A9',
    fontSize: width * 0.018,
    marginTop: 10,
  },
});

export default AttendanceScreen;
