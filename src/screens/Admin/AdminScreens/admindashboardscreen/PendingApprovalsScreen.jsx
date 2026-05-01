// src/screens/Admin/AdminScreens/admindashboardscreen/PendingApprovals.jsx

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
  ScrollView,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import NotificationBell from '../../../../components/NotificationBell';
// import { useUser } from '../../../../context/UserContext'; 👈 REMOVED: use the route params instead

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
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native'; // 👈 ADDED: useRoute
import { DeviceEventEmitter } from 'react-native';
import { ADMIN_CART_UPDATED_EVENT, getAdminCartItems } from '../../../../utils/adminCart';

// Import all modal components
import ApproveRequestModal from './modals/ApproveRequestModal';
import DeleteRequestModal from './modals/DeleteRequestModal';
import ViewRequestModal from './modals/ViewRequestModal';

// Import API services
import {
  getUnifiedPendingApprovals,
  approveUnifiedRequest,
} from '../../../../api/expenseService';
import {
  getPendingAttendanceRequests,
  approveAttendanceRequest,
  declineAttendanceRequest,
} from '../../../../api/attendanceRequestService';

const { width, height } = Dimensions.get('window');
const screenWidth = Dimensions.get('window').width;

const userProfileImagePlaceholder = require('../../../../assets/images/logo.png');

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

const loadAdminCartCount = async setCartCount => {
  try {
    const items = await getAdminCartItems();
    setCartCount(Array.isArray(items) ? items.length : 0);
  } catch (err) {
    console.error('[PendingApprovals] Failed to load admin cart count:', err);
    setCartCount(0);
  }
};

const PendingApprovals = () => {
  const navigation = useNavigation();
  // const route = useRoute(); // Was used for route-based admin

  // Use storage-based authenticated admin for consistent header
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
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [loading, setLoading] = useState(true);

  // Date filtering states
  const [selectedFilterDate, setSelectedFilterDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // NEW STATE: Absent filter
  const [isAbsentFilterActive, setIsAbsentFilterActive] = useState(false);
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

  // States for modals
  const [isApproveModalVisible, setIsApproveModalVisible] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [isViewModalVisible, setIsViewModalVisible] = useState(false);

  const [selectedRequest, setSelectedRequest] = useState(null);

  // Function to get auth token from AsyncStorage
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
      console.error('Failed to get auth token from storage:', error);
      return null;
    }
  };

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

  // Handler to toggle the Absent filter (NEW)
  const handleToggleAbsentFilter = () => {
    setIsAbsentFilterActive(prevState => !prevState);
  };

  // Helper function to determine request type from request data
  const determineRequestType = request => {
    try {
      const requestTypeLower = (
        request?.requestType || request?.type || ''
      ).toLowerCase();
      const categoryLower = (request?.category || '').toLowerCase();
      const descriptionLower = (
        request?.description || request?.note || request?.reason || ''
      ).toLowerCase();

      // 1) Advance Salary — detect FIRST so it doesn't get caught by generic expense
      if (
        requestTypeLower.includes('advance_salary') ||
        requestTypeLower.includes('advance-salary') ||
        categoryLower.includes('advance salary') ||
        categoryLower.includes('advance-salary') ||
        categoryLower.includes('salary') ||
        descriptionLower.includes('advance salary') ||
        (descriptionLower.includes('advance') && descriptionLower.includes('salary'))
      ) {
        return 'Advance-Salary';
      }

      // 2) Attendance (including check-in/out)
      if (
        requestTypeLower.includes('checkin') ||
        requestTypeLower.includes('checkout') ||
        requestTypeLower.includes('attendance') ||
        categoryLower.includes('attendance') ||
        descriptionLower.includes('check-in') ||
        descriptionLower.includes('check-out')
      ) {
        if (requestTypeLower.includes('checkin')) return 'Check-In Request';
        if (requestTypeLower.includes('checkout')) return 'Check-Out Request';
        return 'Attendance';
      }

      // 3) Expense (generic)
      if (
        requestTypeLower.includes('expense') ||
        categoryLower.includes('expense') ||
        request.amount !== undefined
      ) {
        return 'Expense Request';
      }

      // 4) Leave
      if (
        requestTypeLower.includes('leave') ||
        categoryLower.includes('leave') ||
        descriptionLower.includes('leave')
      ) {
        return 'Leave Request';
      }

      // 5) Overtime
      if (
        requestTypeLower.includes('overtime') ||
        categoryLower.includes('overtime') ||
        descriptionLower.includes('overtime')
      ) {
        return 'Overtime Request';
      }

      // Default fallback
      return 'Unknown Request';
    } catch (error) {
      console.error('❌ Error in determineRequestType:', error);
      return 'Unknown Request';
    }
  };

  // Fetch pending approvals from API
  const fetchPendingApprovals = async () => {
    try {
      setLoading(true);
      const token = await getAuthToken();
      if (!token) {
        console.log('❌ No auth token available');
        Alert.alert('Authentication Error', 'Please login again.', [
          {
            text: 'OK',
            onPress: () => navigation.replace('AdminLogin'),
          },
        ]);
        return;
      }

      console.log('🔍 Fetching pending approvals...');
      console.log('🔍 Auth token:', token.substring(0, 20) + '...');

      // Fetch both expense and attendance requests
      const [expenseResponse, attendanceResponse] = await Promise.allSettled([
        getUnifiedPendingApprovals(token),
        getPendingAttendanceRequests(),
      ]);

      console.log('🔍 Expense response:', expenseResponse);
      console.log('🔍 Attendance response:', attendanceResponse);

      let allApprovals = [];

      // Process expense requests
      if (
        expenseResponse.status === 'fulfilled' &&
        expenseResponse.value?.success &&
        expenseResponse.value?.data
      ) {
        const expenseApprovals = expenseResponse.value.data.map(request => {
          try {
            console.log('🔍 Processing expense request:', request);
            console.log('🔍 Expense request type fields:', {
              requestType: request?.requestType,
              type: request?.type,
              category: request?.category,
              employeeId: request?.employeeId,
              employeeName: request?.employeeName,
              description: request?.description,
              note: request?.note,
              reason: request?.reason,
            });
            // Use the helper function to determine request type
            const requestType = determineRequestType(request);

            // Extract amount for expense requests from various possible fields
            const amount =
              request?.price ??
              request?.amount ??
              request?.expenseAmount ??
              request?.data?.price ??
              request?.data?.amount ??
              null;

            // Determine display time: prefer explicit/manual time fields, then createdAt, then now
            const manualTime =
              request?.time ||
              request?.requestedTime ||
              request?.manualTime ||
              request?.selectedTime ||
              request?.adminTime;

            // If manualTime is a full datetime/ISO string, format it; otherwise use as-is
            const displayTime = manualTime
              ? moment(manualTime).isValid()
                ? moment(manualTime).format('hh:mm A')
                : manualTime
              : request?.createdAt
              ? moment(request.createdAt).format('hh:mm A')
              : moment().format('hh:mm A');

            // Determine display date: prefer explicit date field, then createdAt, then now
            const displayDate = request?.date
              ? moment(request.date).format('MMMM DD, YYYY')
              : request?.createdAt
              ? moment(request.createdAt).format('MMMM DD, YYYY')
              : moment().format('MMMM DD, YYYY');

            return {
              id: request?._id || request?.id || `EXP_${Date.now()}`,
              name:
                request?.employeeName ||
                request?.managerName ||
                request?.userName ||
                request?.name ||
                'Unknown Employee',
              requestType: requestType,
              time: displayTime,
              date: displayDate,
              status: 'Pending',
              note:
                request?.description ||
                request?.note ||
                request?.reason ||
                'No additional notes',
              // Pass amount so ViewRequestModal can display it instead of '--'
              amount,
              requestData: request,
              requestCategory: 'expense',
            };
          } catch (error) {
            console.error(
              '❌ Error processing expense request:',
              error,
              request,
            );
            return {
              id: `EXP_ERROR_${Date.now()}`,
              name: 'Error Processing Request',
              requestType: 'Expense Request',
              time: moment().format('hh:mm A'),
              date: moment().format('MMMM DD, YYYY'),
              status: 'Pending',
              note: 'Error processing request',
              amount: null,
              requestData: request,
              requestCategory: 'expense',
            };
          }
        });
        allApprovals = [...allApprovals, ...expenseApprovals];
      }

      // Process attendance requests
      if (
        attendanceResponse.status === 'fulfilled' &&
        attendanceResponse.value?.success &&
        attendanceResponse.value?.data
      ) {
        const attendanceApprovals = attendanceResponse.value.data.map(
          request => {
            try {
              console.log('🔍 Processing attendance request:', request);
              console.log('🔍 Request type fields:', {
                requestType: request?.requestType,
                type: request?.type,
                attendanceType: request?.attendanceType,
                attendanceStatus: request?.attendanceStatus,
              });

              // Use the helper function to determine request type
              const requestType = determineRequestType(request);

              // Determine display time for attendance: prefer explicit/manual fields (including manualRequestData), then createdAt, then now
              const manualAttendanceTime =
                request?.time ||
                request?.requestedTime ||
                request?.manualTime ||
                request?.selectedTime ||
                request?.adminTime ||
                request?.manualRequestData?.requestedTime;

              const attendanceDisplayTime = manualAttendanceTime
                ? moment(manualAttendanceTime).isValid()
                  ? moment(manualAttendanceTime).format('hh:mm A')
                  : manualAttendanceTime
                : request?.createdAt
                ? moment(request.createdAt).format('hh:mm A')
                : moment().format('hh:mm A');

              // Determine display date: prefer explicit date field, then createdAt, then now
              const attendanceDisplayDate = request?.date
                ? moment(request.date).format('MMMM DD, YYYY')
                : request?.createdAt
                ? moment(request.createdAt).format('MMMM DD, YYYY')
                : moment().format('MMMM DD, YYYY');

              return {
                id: request?._id || request?.id || `ATT_${Date.now()}`,
                name:
                  request?.employeeName ||
                  request?.managerName ||
                  request?.userName ||
                  request?.name ||
                  'Unknown Employee',
                requestType: requestType,
                time: attendanceDisplayTime,
                date: attendanceDisplayDate,
                status: 'Pending',
                note:
                  request?.description ||
                  request?.note ||
                  request?.reason ||
                  'No additional notes',
                requestData: request,
                requestCategory: 'attendance',
              };
            } catch (error) {
              console.error(
                '❌ Error processing attendance request:',
                error,
                request,
              );
              return {
                id: `ATT_ERROR_${Date.now()}`,
                name: 'Error Processing Request',
                requestType: 'Attendance Request',
                time: moment().format('hh:mm A'),
                date: moment().format('MMMM DD, YYYY'),
                status: 'Pending',
                note: 'Error processing request',
                requestData: request,
                requestCategory: 'attendance',
              };
            }
          },
        );
        allApprovals = [...allApprovals, ...attendanceApprovals];
      }

      console.log('✅ All transformed approvals:', allApprovals);
      // Assign frontend display IDs (e.g., PED001, PED002) deterministically by list order
      const approvalsWithDisplayIds = allApprovals.map((item, idx) => ({
        ...item,
        displayId: `PED${String(idx + 1).padStart(3, '0')}`,
      }));
      setPendingApprovals(approvalsWithDisplayIds);
    } catch (error) {
      console.error('❌ Error fetching pending approvals:', error);
      console.error('❌ Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });

      // Don't show alert for empty results, just log
      if (
        error.message &&
        error.message.includes('No pending approvals found')
      ) {
        console.log('ℹ️ No pending approvals found - this is normal');
        setPendingApprovals([]);
      } else {
        Alert.alert(
          'Error',
          'Failed to load pending approvals. Please try again.',
        );
        setPendingApprovals([]);
      }
    } finally {
      setLoading(false);
    }
  };

  // Load pending approvals on component mount
  useEffect(() => {
    fetchPendingApprovals();
  }, []);

  // Refresh pending approvals
  const refreshPendingApprovals = () => {
    fetchPendingApprovals();
  };

  // Filter approvals based on search text, selected date, AND absent filter (MODIFIED)
  const filteredApprovals = useMemo(() => {
    let currentData = [...pendingApprovals];

    // Apply text search filter
    if (searchText) {
      const q = searchText.toLowerCase();
      currentData = currentData.filter(item =>
        (item.name || '').toLowerCase().includes(q) ||
        (item.displayId || '').toLowerCase().includes(q) ||
        (item.id || '').toLowerCase().includes(q) ||
        (item.requestType || '').toLowerCase().includes(q) ||
        (item.date || '').toLowerCase().includes(q),
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

    // Apply Absent filter if active (NEW LOGIC)
    if (isAbsentFilterActive) {
      currentData = currentData.filter(item =>
        item.requestType.toLowerCase().includes('leave request'),
      );
    }

    return currentData;
  }, [pendingApprovals, searchText, selectedFilterDate, isAbsentFilterActive]);

  // Handlers for opening modals
  const handleOpenApproveModal = item => {
    setSelectedRequest(item);
    setIsApproveModalVisible(true);
  };

  const handleOpenDeleteModal = item => {
    setSelectedRequest(item);
    setIsDeleteModalVisible(true);
  };

  const handleOpenViewModal = item => {
    setSelectedRequest(item);
    setIsViewModalVisible(true);
  };

  // Handlers for closing modals
  const handleCloseApproveModal = () => {
    setIsApproveModalVisible(false);
    setSelectedRequest(null);
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalVisible(false);
    setSelectedRequest(null);
  };

  const handleCloseViewModal = () => {
    setIsViewModalVisible(false);
    setSelectedRequest(null);
  };

  // Handler for approving a request
  const handleApproveRequest = async () => {
    try {
      if (!selectedRequest) {
        Alert.alert('Error', 'Invalid request.');
        return;
      }

      const token = await getAuthToken();
      if (!token) {
        Alert.alert('Error', 'Authentication required. Please login again.');
        return;
      }

      const requestData = selectedRequest.requestData;
      const requestType = requestData.requestType || 'expense';
      const requestId = requestData._id || requestData.id;
      const requestCategory = selectedRequest.requestCategory || 'expense';

      console.log('🔍 [ApproveRequest] Approving request:', {
        requestType,
        requestId,
        requestData,
        requestCategory,
      });

      let response;

      // Use appropriate service based on request category
      if (requestCategory === 'attendance') {
        response = await approveAttendanceRequest(requestId, 'approved');
      } else {
        response = await approveUnifiedRequest(
          requestType,
          requestId,
          'approved',
          token,
        );
      }

      console.log('✅ [ApproveRequest] Approval response:', response);

      if (response && (response.success || response.message)) {
        Alert.alert(
          'Success',
          'Request approved successfully! The attendance has been added to the main attendance screen.',
          [
            {
              text: 'OK',
              onPress: () => {
                // Remove from pending approvals
                setPendingApprovals(prevApprovals =>
                  prevApprovals.filter(item => item.id !== selectedRequest.id),
                );

                // Refresh the pending approvals list
                fetchPendingApprovals();
              },
            },
          ],
        );
      } else {
        Alert.alert('Error', response?.message || 'Failed to approve request');
      }
    } catch (error) {
      console.error('❌ [ApproveRequest] Error approving request:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to approve request. Please try again.',
      );
    }

    handleCloseApproveModal();
    handleCloseViewModal();
  };

  // Handler for deleting/declining a request
  const handleDeleteRequest = async () => {
    try {
      if (!selectedRequest) {
        Alert.alert('Error', 'Invalid request.');
        return;
      }

      const token = await getAuthToken();
      if (!token) {
        Alert.alert('Error', 'Authentication required. Please login again.');
        return;
      }

      const requestData = selectedRequest.requestData;
      const requestType = requestData.requestType || 'expense';
      const requestId = requestData._id || requestData.id;

      let response;
      if (selectedRequest.requestCategory === 'attendance') {
        response = await declineAttendanceRequest(requestId);
      } else {
        response = await approveUnifiedRequest(
          requestType,
          requestId,
          'declined',
          token,
        );
      }

      if (response && (response.success || response.message)) {
        Alert.alert('Success', 'Request declined successfully!');
        setPendingApprovals(prevApprovals =>
          prevApprovals.filter(item => item.id !== selectedRequest.id),
        );
      } else {
        Alert.alert('Error', response.message || 'Failed to decline request');
      }
    } catch (error) {
      console.error('Error declining request:', error);
      Alert.alert('Error', 'Failed to decline request. Please try again.');
    }

    handleCloseDeleteModal();
  };

  const renderItem = ({ item, index }) => (
    <View
      style={[
        styles.row,
        { backgroundColor: index % 2 === 0 ? '#2E2E2E' : '#1F1F1F' },
      ]}
    >
      {/* ID column removed as per requirement */}
      <Text style={styles.nameCell}>{item.name}</Text>
      <Text style={styles.requestTypeCell}>{item.requestType}</Text>
      <Text style={styles.timeCell}>{item.time}</Text>
      <Text style={styles.dateCell}>{item.date}</Text>
      <View style={styles.actionCell}>
        <TouchableOpacity
          onPress={() => handleOpenViewModal(item)}
          style={styles.actionButton}
        >
          <Ionicons name="eye-outline" size={width * 0.032} color="#A9A9A9" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handleOpenApproveModal(item)}
          style={styles.actionButton}
        >
          <Ionicons
            name="checkmark-circle"
            size={width * 0.032}
            color="green"
          />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handleOpenDeleteModal(item)}
          style={styles.actionButton}
        >
          <Ionicons name="trash-outline" size={width * 0.032} color="#ff5555" />
        </TouchableOpacity>
      </View>
    </View>
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
            source={profileImageSource} // 👈 Use the dynamic source here
            style={styles.profileImage}
            resizeMode="cover"
          />
        </View>
      </View>

      {/* Controls Section (Similar to AttendanceScreen, adapted for Pending Approvals) */}
      <View style={styles.controls}>
        <Text style={styles.screenTitle}>Pending Approvals</Text>

        {/* Filters/Actions - Adjusted based on screenshot */}
        <View style={styles.filterActions}>
          

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
        </View>
      </View>

      {/* Horizontal Scrollable Table */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator
        contentContainerStyle={styles.tableScrollContent}
      >
        <View style={styles.tableInner}>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            {/* ID header removed as per requirement */}
            <Text style={styles.nameHeader}>Name</Text>
            <Text style={styles.requestTypeHeader}>Request Type</Text>
            <Text style={styles.timeHeader}>Time</Text>
            <Text style={styles.dateHeader}>Date</Text>
            <Text style={styles.actionHeader}>Action</Text>
          </View>

          {/* Table Rows */}
          <FlatList
            data={filteredApprovals}
            renderItem={renderItem}
            keyExtractor={(item, index) =>
              item.id + item.date + item.time + index.toString()
            }
            style={styles.table}
            refreshing={loading}
            onRefresh={refreshPendingApprovals}
            ListEmptyComponent={() => (
              <View style={styles.noDataContainer}>
                <Text style={styles.noDataText}>
                  {loading
                    ? 'Loading pending approvals...'
                    : 'No pending approvals found.'}
                </Text>
              </View>
            )}
          />
        </View>
      </ScrollView>

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

      {/* Render all modal components */}
      <ApproveRequestModal
        isVisible={isApproveModalVisible}
        onClose={handleCloseApproveModal}
        onApprove={handleApproveRequest}
        requestDetails={selectedRequest}
      />

      <DeleteRequestModal
        isVisible={isDeleteModalVisible}
        onClose={handleCloseDeleteModal}
        onDelete={handleDeleteRequest}
        requestDetails={selectedRequest}
      />

      <ViewRequestModal
        isVisible={isViewModalVisible}
        onClose={handleCloseViewModal}
        onApprove={handleApproveRequest}
        requestDetails={selectedRequest}
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
  }, // --- Header Styles  ---

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
  }, // --- End Header Styles --- // --- Controls/Filters Section Styles (Adapted for Pending Approvals) ---

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

  screenTitle: {
    color: '#fff',
    fontSize: width * 0.024,
    fontWeight: '500',
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

    fontSize: width * 0.017,
  },

  activeFilterButton: {
    backgroundColor: '#A98C27',
  },

  addButton: {
    flexDirection: 'row',

    alignItems: 'center',

    backgroundColor: '#A98C27',

    paddingVertical: height * 0.01,

    paddingHorizontal: width * 0.01,

    borderRadius: 6,
  },

  addText: {
    color: '#fff',

    fontWeight: '5500',

    fontSize: width * 0.012,
  }, // --- End Controls/Filters Section Styles --- // --- Table Styles (Adapted for Pending Approvals with Flex for Columns) ---

  tableHeader: {
    flexDirection: 'row',

    justifyContent: 'flex-start',

    alignItems: 'center',

    marginTop: height * 0.01,

    paddingVertical: height * 0.01,

    backgroundColor: '#1e1f20ff',

    paddingHorizontal: width * 0.005,

    borderRadius: 5,
  }, // Header cells with flex distribution

  employeeIdHeader: {
    width: width * 0.12,
    paddingVertical: width * 0.006,
    color: '#fff',
    fontWeight: '600',
    fontSize: width * 0.013,
    textAlign: 'left',
    paddingRight: width * 0.005,
  },

  nameHeader: {
    width: width * 0.16,

    color: '#fff',

    fontWeight: '600',

    paddingVertical: width * 0.006,

    fontSize: width * 0.013,

    textAlign: 'left',
  },

  requestTypeHeader: {
    width: width * 0.16,

    color: '#fff',

    fontWeight: '600',

    paddingVertical: width * 0.006,
    fontSize: width * 0.013,

    textAlign: 'left',
  },

  timeHeader: {
    width: width * 0.08,

    color: '#fff',

    fontWeight: '600',

    paddingVertical: width * 0.006,
   fontSize: width * 0.013,

    textAlign: 'left',
  },

  dateHeader: {
    width: width * 0.2,

    color: '#fff',

    fontWeight: '600',

    paddingVertical: width * 0.006,

    fontSize: width * 0.013,

    textAlign: 'left',
  },

  actionHeader: {
    width: width * 0.18,

    color: '#fff',

    fontWeight: '600',

    paddingVertical: width * 0.006,

    fontSize: width * 0.013,

    textAlign: 'center',
  },

  row: {
    flexDirection: 'row',

    paddingVertical: height * 0.016,

    paddingHorizontal: width * 0.005,

    alignItems: 'center',
  }, // Data cells with flex distribution matching headers

  employeeIdCell: {
    width: width * 0.12,
    color: '#fff',
    fontSize: width * 0.013,
    textAlign: 'left',
    paddingRight: width * 0.005,
  },

  nameCell: {
    width: width * 0.16,

    color: '#fff',

    fontSize: width * 0.013,

    textAlign: 'left',
  },

  requestTypeCell: {
    width: width * 0.16,

    color: '#fff',

    fontSize: width * 0.013,

    textAlign: 'left',
  },

  timeCell: {
    width: width * 0.08,

    color: '#fff',

    fontSize: width * 0.013,
    // aligned with header
    textAlign: 'left',
  },

  dateCell: {
    width: width * 0.2,
    color: '#fff',
    fontSize: width * 0.013,

    textAlign: 'left',
  },

  actionCell: {
    // Make action column more compact to reduce extra right-side space
    width: width * 0.09,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },

  actionButton: {
    padding: width * 0.002,
    marginLeft: width * 0.01,
  },

  table: {
    marginTop: height * 0.005,

    borderRadius: 5,

    overflow: 'hidden',
  },

  tableScrollContent: {
    paddingBottom: height * 0.02,
  },

  tableInner: {
    alignSelf: 'flex-start',
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
});

export default PendingApprovals;
