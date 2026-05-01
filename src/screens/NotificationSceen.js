// src/screens/admin/NotificationsScreen.jsx
import React, {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
  Alert,
  ScrollView,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';

const { width, height } = Dimensions.get('window');

// Use the same BASE_URL as the rest of the app
import { BASE_URL } from '../api/config';

// ====================================================================
// UTILITY FUNCTIONS (UPDATED FOR CONSISTENCY)
// ====================================================================

/**
 * Format date string to readable format
 */
const formatDate = dateString => {
  if (!dateString) return 'Unknown';
  const date = new Date(dateString);
  const now = new Date();
  const diffInDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

  if (diffInDays === 0) {
    return `Today, ${date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })}`;
  } else if (diffInDays === 1) {
    return `Yesterday, ${date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })}`;
  } else {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
};

/**
 * Utility to get the correct token (JWT or face_auth) from AsyncStorage.
 * @returns {Promise<string|null>} The authentication token.
 */
const getAuthToken = async () => {
  console.log('🔐 [getAuthToken] Starting token retrieval...');

  try {
    const adminAuth = await AsyncStorage.getItem('adminAuth');
    const managerAuth = await AsyncStorage.getItem('managerAuth');

    if (adminAuth) {
      const adminData = JSON.parse(adminAuth);
      if (adminData.token) {
        console.log(
          `✅ [getAuthToken] Found Admin token (Type: ${
            adminData.token.startsWith('face_auth_') ? 'Face Auth' : 'JWT'
          })`,
        );
        return adminData.token;
      }
    }

    if (managerAuth) {
      const managerData = JSON.parse(managerAuth);
      if (managerData.token) {
        console.log('✅ [getAuthToken] Found Manager JWT token');
        return managerData.token;
      }
    }
  } catch (error) {
    console.error('❌ [getAuthToken] Failed to parse auth data:', error);
  }

  console.warn('⚠️ [getAuthToken] No valid token found');
  return null;
};

/**
 * Handles Face Auth token refresh logic for 401 errors.
 * @param {string} currentToken - The token that failed.
 * @returns {Promise<string|null>} A new token or null if refresh failed.
 */
const refreshFaceAuthToken = async currentToken => {
  console.log('🔄 [refreshFaceAuthToken] Attempting face token refresh...');
  try {
    const adminAuth = await AsyncStorage.getItem('adminAuth');
    if (!adminAuth || !currentToken.startsWith('face_auth_')) {
      return null;
    }

    const adminData = JSON.parse(adminAuth);
    if (!adminData.admin) {
      console.warn(
        '❌ [refreshFaceAuthToken] No admin data found for refresh.',
      );
      return null;
    }

    const tokenResponse = await fetch(`${BASE_URL}/auth/face-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        adminId: adminData.admin._id,
        name: adminData.admin.name,
        faceVerified: true,
        role: 'admin',
      }),
    });

    if (tokenResponse.ok) {
      const tokenData = await tokenResponse.json();
      const newToken = tokenData.token || tokenData.data?.token;

      if (newToken) {
        await AsyncStorage.setItem(
          'adminAuth',
          JSON.stringify({ ...adminData, token: newToken }),
        );
        console.log('✅ [refreshFaceAuthToken] New token successfully stored.');
        return newToken;
      }
    }

    const errText = await tokenResponse.text();
    console.error('❌ [refreshFaceAuthToken] Face login failed:', errText);
    return null;
  } catch (error) {
    console.error('❌ [refreshFaceAuthToken] Exception during refresh:', error);
    return null;
  }
};

/**
 * Handles all CRUD API calls for notifications with token and retry logic.
 */
const handleNotificationApiCall = async (
  endpoint,
  method,
  token,
  body = null,
) => {
  if (!token) {
    throw new Error('Authentication token is missing.');
  }

  const fullUrl = `${BASE_URL}/notifications/${endpoint}`;
  console.log(`📡 Calling API: ${method} ${fullUrl}`);
  console.log(`📡 Token preview: ${token.substring(0, 30)}...`);

  const callApi = async currentTkn => {
    const options = {
      method: method,
      headers: {
        Authorization: `Bearer ${currentTkn}`,
        'Content-Type': 'application/json',
      },
    };
    if (body) {
      options.body = JSON.stringify(body);
    }
    return fetch(fullUrl, options);
  };

  let response = await callApi(token);

  if (!response.ok) {
    const isFaceAuthToken = token.startsWith('face_auth_');

    if (isFaceAuthToken && response.status === 401) {
      console.log(
        '🔄 [handleNotificationApiCall] Attempting face token refresh...',
      );
      const newToken = await refreshFaceAuthToken(token);

      if (newToken) {
        // Retry the original API call with the new token
        console.log(
          '🔄 [handleNotificationApiCall] Retrying API with new token...',
        );
        response = await callApi(newToken);
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`❌ API call failed for ${endpoint}:`, {
        status: response.status,
        errorData,
      });
      throw new Error(
        errorData.message || `API call failed with status ${response.status}`,
      );
    }
  }

  return response.json();
};

// ====================================================================
// MAIN COMPONENT
// ====================================================================

const NotificationsScreen = () => {
  const navigation = useNavigation();

  // Refs
  const latestNotificationIdRef = useRef(null);
  const initialLoadFailedRef = useRef(false);
  const isFetchingRef = useRef(false);

  // State
  const [filterType, setFilterType] = useState('all');
  const [notificationsData, setNotificationsData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [emptyDataMessage, setEmptyDataMessage] = useState('');

  /**
   * Fetches notifications from the API.
   */
  const fetchNotifications = useCallback(
    async (isRefresh = false, isFocusEffectCall = false) => {
      console.log('📥 [fetchNotifications] Starting fetch...', {
        isRefresh,
        isFocusEffectCall,
        isFetchingInProgress: isFetchingRef.current,
      });

      if (isFetchingRef.current) {
        console.log('⚠️ Fetch already in progress, skipping...');
        return;
      }

      if (initialLoadFailedRef.current && isFocusEffectCall && !isRefresh) {
        console.log('⚠️ Skipping focus refresh due to prior failure.');
        return;
      }

      isFetchingRef.current = true;

      if (!isRefresh && !isFocusEffectCall) {
        setIsLoading(true);
      }

      setError(null);
      setEmptyDataMessage('');

      try {
        const token = await getAuthToken();

        if (!token) {
          Alert.alert(
            'Session Expired',
            'Please login again to access notifications.',
            [
              {
                text: 'OK',
                onPress: () => navigation.navigate('LoginScreen'),
              },
            ],
          );
          return;
        }

        // Use the centralized API handler for fetching
        const data = await handleNotificationApiCall('', 'GET', token);

        console.log('📥 [fetchNotifications] Data received:', {
          success: data.success,
          notificationsCount: data.data?.notifications?.length || 0,
        });

        if (
          !data.success ||
          !data.data ||
          !Array.isArray(data.data.notifications)
        ) {
          throw new Error(
            'Unexpected data format from server. "notifications" array is missing.',
          );
        }

        const mappedData = data.data.notifications.map(item => {
          // Prefer the actual send time for display; fall back gracefully
          const rawTimestamp =
            item.sentAt || item.scheduledFor || item.createdAt;

          let message = item.message || 'No message';

          // Special handling for Expense Request notifications where backend
          // message sometimes contains "Amount $ undefined".
          const title = item.title || '';
          const lowerTitle = title.toLowerCase();
          const isExpenseNotification =
            item.type === 'expense_request' ||
            lowerTitle.includes('expense request');

          if (isExpenseNotification) {
            // Temporary debug log to verify payload structure for expense notifications
            try {
              console.log('📩 [Notifications] Expense notification payload:', item);
            } catch (e) {}

            // Try common amount/price field names that backend might send
            const rawAmount =
              item.price ??
              item.amount ??
              item.expenseAmount ??
              item.expense?.price ??
              item.expense?.amount ??
              item.data?.price ??
              item.data?.amount ??
              item.meta?.price ??
              item.meta?.amount;

            if (rawAmount !== undefined && rawAmount !== null) {
              const parsedAmount = Number(rawAmount) || 0;
              const label =
                item.category || item.reason || item.expenseType || 'Expense';

              message = `New expense request submitted: ${label} - Amount $ ${parsedAmount.toFixed(
                2,
              )}`;
            } else {
              // If backend didn't send any numeric amount field, rebuild a clean
              // message WITHOUT any "Amount ..." suffix so "undefined" can
              // never appear in the UI.

              // Try to extract the label between "submitted:" and the dash
              const labelMatch = message.match(
                /new expense request submitted:\s*([^\-\n]+)/i,
              );
              const extractedLabel = labelMatch
                ? labelMatch[1].trim()
                : (item.category || item.reason || item.expenseType || 'Expense');

              message = `New expense request submitted: ${extractedLabel}`;
            }
          }

          return {
            id: item._id,
            title: title || 'No Title',
            message,
            type: item.type || 'info',
            timestamp: formatDate(rawTimestamp),
            read: item.isRead || false,
          };
        });

        // Toast logic for new notifications
        if (mappedData.length > 0) {
          const currentLatest = mappedData[0];
          const currentLatestId = currentLatest.id;

          if (latestNotificationIdRef.current === null) {
            latestNotificationIdRef.current = currentLatestId;
          } else if (
            currentLatestId !== latestNotificationIdRef.current &&
            !currentLatest.read
          ) {
            Toast.show({
              type:
                currentLatest.type === 'error'
                  ? 'error'
                  : currentLatest.type === 'warning'
                  ? 'warning'
                  : 'success',
              position: 'top',
              text1: currentLatest.title,
              text2: currentLatest.message,
              visibilityTime: 5000,
              onPress: () => {
                Toast.hide();
                // Optionally navigate or focus the screen
              },
            });

            latestNotificationIdRef.current = currentLatestId;
          }
        }

        if (mappedData.length === 0) {
          setEmptyDataMessage('No notifications available for your account.');
        }

        setNotificationsData(mappedData);
        initialLoadFailedRef.current = false;
      } catch (err) {
        console.error('❌ Failed to fetch notifications:', err);
        initialLoadFailedRef.current = true;
        setError(err.message);
      } finally {
        setIsLoading(false);
        setIsActionLoading(false);
        isFetchingRef.current = false;
      }
    },
    [navigation],
  );

  // Initial fetch on mount
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Refetch on screen focus
  useFocusEffect(
    useCallback(() => {
      if (!isFetchingRef.current) {
        fetchNotifications(false, true);
      }
    }, [fetchNotifications]),
  );

  // ====================================================================
  // HANDLERS
  // ====================================================================

  const handleMarkAsRead = useCallback(async id => {
    setIsActionLoading(true);
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Authentication required.');

      await handleNotificationApiCall(`${id}/read`, 'PUT', token);

      setNotificationsData(prevData =>
        prevData.map(notification =>
          notification.id === id
            ? { ...notification, read: true }
            : notification,
        ),
      );
      Toast.show({ type: 'success', text1: 'Notification marked as read.' });
    } catch (error) {
      Alert.alert(
        'Error',
        `Failed to mark notification as read: ${error.message}`,
      );
    } finally {
      setIsActionLoading(false);
    }
  }, []);

  const handleMarkAllAsRead = useCallback(async () => {
    setIsActionLoading(true);
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Authentication required.');

      await handleNotificationApiCall('mark-all-read', 'PUT', token);

      setNotificationsData(prevData =>
        prevData.map(notification => ({ ...notification, read: true })),
      );
      Toast.show({
        type: 'success',
        text1: 'All notifications marked as read.',
      });
    } catch (error) {
      Alert.alert(
        'Error',
        `Failed to mark all notifications as read: ${error.message}`,
      );
    } finally {
      setIsActionLoading(false);
    }
  }, []);

  const handleDeleteNotification = useCallback(async id => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this notification?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsActionLoading(true);
            try {
              const token = await getAuthToken();
              if (!token) throw new Error('Authentication required.');

              await handleNotificationApiCall(id, 'DELETE', token);

              setNotificationsData(prevData =>
                prevData.filter(notification => notification.id !== id),
              );
              Toast.show({ type: 'success', text1: 'Notification deleted.' });
            } catch (error) {
              Alert.alert(
                'Error',
                `Failed to delete notification: ${error.message}`,
              );
            } finally {
              setIsActionLoading(false);
            }
          },
        },
      ],
    );
  }, []);

  const handleRefresh = useCallback(() => {
    initialLoadFailedRef.current = false;
    fetchNotifications(true, false);
  }, [fetchNotifications]);

  // ====================================================================
  // RENDER LOGIC
  // ====================================================================

  const filteredNotifications = useMemo(() => {
    let currentData = [...notificationsData];

    if (filterType === 'unread') {
      currentData = currentData.filter(notification => !notification.read);
    } else if (filterType === 'read') {
      currentData = currentData.filter(notification => notification.read);
    }

    return currentData;
  }, [notificationsData, filterType]);

  const renderNotificationItem = ({ item, index }) => {
    let typeColor = '#A98C27';
    let icon = 'information-circle-outline';

    switch (item.type) {
      case 'success':
        typeColor = '#4CAF50';
        icon = 'checkmark-circle-outline';
        break;
      case 'warning':
        typeColor = '#FFA500';
        icon = 'warning-outline';
        break;
      case 'error':
        typeColor = '#FF5555';
        icon = 'alert-circle-outline';
        break;
      case 'info':
      case 'advance_booking_reminder':
      default:
        typeColor = '#2196F3';
        icon = 'information-circle-outline';
        break;
    }

    return (
      <View
        style={[
          styles.notificationRow,
          { backgroundColor: index % 2 === 0 ? '#2E2E2E' : '#1F1F1F' },
          !item.read && styles.unreadNotification,
        ]}
      >
        <View style={styles.notificationIconContainer}>
          <View
            style={[
              styles.notificationTypeIndicator,
              { backgroundColor: typeColor },
            ]}
          />
          <Ionicons name={icon} size={width * 0.02} color={typeColor} />
        </View>

        <View style={styles.notificationContent}>
          <View style={styles.notificationHeader}>
            <Text style={styles.notificationTitle}>{item.title}</Text>
            {!item.read && <View style={styles.unreadDot} />}
          </View>
          <Text style={styles.notificationMessage} numberOfLines={2}>
            {item.message}
          </Text>
          <Text style={styles.notificationTimestamp}>{item.timestamp}</Text>
        </View>

        <View style={styles.notificationActions}>
          {isActionLoading ? (
            <ActivityIndicator size="small" color="#A98C27" />
          ) : (
            <>
              {!item.read && (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleMarkAsRead(item.id)}
                >
                  <Ionicons
                    name="checkmark-done-outline"
                    size={width * 0.018}
                    color="#4CAF50"
                  />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleDeleteNotification(item.id)}
              >
                <Ionicons
                  name="trash-outline"
                  size={width * 0.018}
                  color="#ff5555"
                />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.contentArea}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.notificationsHeaderSection}>
          <Text style={styles.screenTitle}>Notifications</Text>
          <View style={styles.buttonsGroup}>
            {/* Filter Buttons */}
            {['all', 'unread', 'read'].map(type => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.filterButton,
                  filterType === type && styles.filterButtonActive,
                ]}
                onPress={() => setFilterType(type)}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    filterType === type && styles.filterButtonTextActive,
                  ]}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}

            {/* Mark All Read Button */}
            <TouchableOpacity
              style={styles.markAllButton}
              onPress={handleMarkAllAsRead}
              disabled={isActionLoading || notificationsData.every(n => n.read)}
            >
              {isActionLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons
                  name="checkmark-done-outline"
                  size={width * 0.02}
                  color="#fff"
                  style={{ marginRight: 8 }}
                />
              )}
              <Text style={styles.markAllButtonText}>
                {isActionLoading ? 'Processing...' : 'Mark All Read'}
              </Text>
            </TouchableOpacity>

            {/* Refresh Button */}
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={handleRefresh}
              disabled={isLoading || isActionLoading || isFetchingRef.current}
            >
              <Ionicons
                name="refresh"
                size={width * 0.02}
                color="#fff"
                style={{ marginRight: 8 }}
              />
              <Text style={styles.refreshButtonText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.notificationsContainer}>
          <FlatList
            data={filteredNotifications}
            renderItem={renderNotificationItem}
            keyExtractor={item => item.id}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={() => (
              <View style={styles.noDataContainer}>
                {isLoading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#A98C27" />
                    <Text style={styles.loadingText}>
                      Loading notifications...
                    </Text>
                  </View>
                ) : error ? (
                  <View style={styles.errorContainer}>
                    <Ionicons
                      name="alert-circle-outline"
                      size={50}
                      color="#FF5555"
                    />
                    <Text style={styles.errorText}>Error: {error}</Text>
                    <TouchableOpacity
                      style={styles.retryButton}
                      onPress={handleRefresh}
                    >
                      <Text style={styles.retryButtonText}>Retry</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <Text style={styles.noDataText}>
                    {emptyDataMessage ||
                      'No notifications found for the current filter.'}
                  </Text>
                )}
              </View>
            )}
          />
        </View>
      </ScrollView>
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
  contentArea: {
    flex: 1,
    backgroundColor: '#161719',
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
  notificationsHeaderSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: height * 0.02,
    marginTop: height * -0.01,
    borderBottomWidth: 1,
    borderBottomColor: '#3C3C3C',
    paddingBottom: height * 0.03,
    flexWrap: 'wrap', // Allow wrapping for smaller screens
  },
  buttonsGroup: {
    flexDirection: 'row',
    gap: width * 0.015, // Reduced gap slightly
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  filterButton: {
    backgroundColor: '#2A2D32',
    paddingVertical: height * 0.012,
    paddingHorizontal: width * 0.02, // Reduced horizontal padding slightly
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4A4A4A',
  },
  filterButtonActive: {
    backgroundColor: '#A98C27',
    borderColor: '#A98C27',
  },
  filterButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: width * 0.014,
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  markAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: height * 0.012,
    paddingHorizontal: width * 0.02,
    borderRadius: 8,
  },
  markAllButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: width * 0.014,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2D32',
    paddingVertical: height * 0.012,
    paddingHorizontal: width * 0.02,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4A4A4A',
  },
  refreshButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: width * 0.014,
  },
  notificationsContainer: {
    backgroundColor: '#1F1F1F',
    borderRadius: 8,
    padding: width * 0.01,
    minHeight: height * 0.4,
  },
  notificationRow: {
    flexDirection: 'row',
    padding: width * 0.02,
    marginVertical: height * 0.005,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3C3C3C',
    alignItems: 'flex-start',
  },
  unreadNotification: {
    borderLeftWidth: 4,
    borderLeftColor: '#A98C27',
  },
  notificationIconContainer: {
    marginRight: width * 0.02,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: height * 0.005,
  },
  notificationTypeIndicator: {
    width: width * 0.01,
    height: height * 0.02,
    borderRadius: width * 0.005,
    marginBottom: height * 0.01,
  },
  notificationContent: {
    flex: 1,
    marginRight: width * 0.02,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: height * 0.005,
  },
  notificationTitle: {
    color: '#fff',
    fontSize: width * 0.016,
    fontWeight: '600',
    flex: 1,
    flexWrap: 'wrap',
  },
  unreadBadge: {
    backgroundColor: '#A98C27',
    paddingHorizontal: width * 0.015,
    paddingVertical: height * 0.005,
    borderRadius: 12,
    marginLeft: width * 0.01,
  },
  unreadBadgeText: {
    color: '#fff',
    fontSize: width * 0.012,
    fontWeight: '600',
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF3B30',
    marginLeft: width * 0.01,
  },
  notificationMessage: {
    color: '#ccc',
    fontSize: width * 0.014,
    marginBottom: height * 0.005,
    lineHeight: height * 0.025,
  },
  notificationTimestamp: {
    color: '#888',
    fontSize: width * 0.012,
  },
  notificationActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: width * 0.015,
    marginLeft: width * 0.01,
    borderRadius: 4,
  },
  noDataContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    height: height * 0.4,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    color: '#A9A9A9',
    fontSize: width * 0.02,
    marginTop: 10,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  errorText: {
    color: '#FF5555',
    fontSize: width * 0.018,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#A98C27',
    paddingVertical: height * 0.015,
    paddingHorizontal: width * 0.04,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: width * 0.016,
  },
  noDataText: {
    color: '#A9A9A9',
    fontSize: width * 0.02,
    textAlign: 'center',
  },
});

export default NotificationsScreen;
