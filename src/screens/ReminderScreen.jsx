// src/screens/ReminderScreen.jsx
import React, {
  useState,
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
import { useNotifications } from '../context/NotificationContext';

const { width, height } = Dimensions.get('window');

// Use the same BASE_URL as the rest of the app
import { BASE_URL } from '../api/config';

// ====================================================================
// UTILITY FUNCTIONS FOR TOKEN AND API CALLS
// ====================================================================

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

const getAuthToken = async () => {
  try {
    const activeRole = await AsyncStorage.getItem('activeRole');
    const adminAuth = await AsyncStorage.getItem('adminAuth');
    const managerAuth = await AsyncStorage.getItem('managerAuth');

    if (activeRole === 'manager' && managerAuth) {
      const managerData = JSON.parse(managerAuth);
      if (managerData.token) {
        return managerData.token;
      }
    }

    if (adminAuth) {
      const adminData = JSON.parse(adminAuth);
      if (adminData.token) {
        return adminData.token;
      }
    }

    if (managerAuth) {
      const managerData = JSON.parse(managerAuth);
      if (managerData.token) {
        return managerData.token;
      }
    }
  } catch (error) {
    console.error('❌ [getAuthToken] Failed to parse auth data:', error);
  }
  return null;
};

const refreshFaceAuthToken = async currentToken => {
  try {
    const adminAuth = await AsyncStorage.getItem('adminAuth');
    if (!adminAuth || !currentToken.startsWith('face_auth_')) {
      return null;
    }

    const adminData = JSON.parse(adminAuth);
    if (!adminData.admin) {
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
        return newToken;
      }
    }
  } catch (error) {
    console.error('❌ [refreshFaceAuthToken] Exception during refresh:', error);
  }
  return null;
};

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
      const newToken = await refreshFaceAuthToken(token);
      if (newToken) {
        response = await callApi(newToken);
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
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

const ReminderScreen = () => {
  const navigation = useNavigation();
  const { fetchNotificationCount } = useNotifications();

  // Refs
  const isFetchingRef = useRef(false);
  const initialLoadFailedRef = useRef(false);

  // State
  const [filterType, setFilterType] = useState('all');
  const [remindersData, setRemindersData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [loadingActionId, setLoadingActionId] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState(null);

  const PAGE_SIZE = 10;

  /**
   * Fetches reminders from the API.
   */
  const fetchReminders = useCallback(
    async (pageNumber = 1, isRefresh = false, selectedFilter = filterType) => {
      console.log('📥 [fetchReminders] Starting fetch...', {
        pageNumber,
        isRefresh,
        selectedFilter,
        isFetchingInProgress: isFetchingRef.current,
      });

      if (isFetchingRef.current) return;
      isFetchingRef.current = true;

      // Always show loading spinner during transitions
      setIsLoading(true);
      setError(null);

      try {
        const token = await getAuthToken();

        if (!token) {
          Alert.alert(
            'Session Expired',
            'Please login again to access reminders.',
            [
              {
                text: 'OK',
                onPress: () => navigation.navigate('LiveCheck'),
              },
            ],
          );
          return;
        }

        // Build endpoint query parameters with pagination and filters
        let queryParams = `?type=advance_booking_reminder&page=${pageNumber}&limit=${PAGE_SIZE}`;
        if (selectedFilter === 'unread') {
          queryParams += '&isRead=false';
        } else if (selectedFilter === 'read') {
          queryParams += '&isRead=true';
        }

        // Query advance booking reminders
        const data = await handleNotificationApiCall(queryParams, 'GET', token);

        if (
          !data.success ||
          !data.data ||
          !Array.isArray(data.data.notifications)
        ) {
          throw new Error('Unexpected data format from server.');
        }

        const mappedData = data.data.notifications.map(item => {
          const rawTimestamp = item.sentAt || item.scheduledFor || item.createdAt;
          return {
            id: item._id,
            title: item.title || 'Advance Booking Reminder',
            message: item.message || 'No message',
            type: item.type || 'info',
            timestamp: formatDate(rawTimestamp),
            read: item.isRead || false,
          };
        });

        setRemindersData(mappedData);

        const pagination = data.data.pagination;
        if (pagination) {
          setTotalPages(pagination.totalPages || 1);
        } else {
          setTotalPages(1);
        }
        
        setPage(pageNumber);
        initialLoadFailedRef.current = false;
      } catch (err) {
        console.error('❌ Failed to fetch reminders:', err);
        initialLoadFailedRef.current = true;
        setError(err.message);
      } finally {
        setIsLoading(false);
        setIsActionLoading(false);
        setLoadingActionId(null);
        isFetchingRef.current = false;
      }
    },
    [navigation, filterType],
  );

  // Initial fetch on mount
  useEffect(() => {
    fetchReminders(1, false, filterType);
  }, []);

  // Refetch on screen focus
  useFocusEffect(
    useCallback(() => {
      if (!isFetchingRef.current) {
        fetchReminders(1, true, filterType);
      }
    }, [fetchReminders, filterType]),
  );

  // ====================================================================
  // HANDLERS
  // ====================================================================

  const handleFilterSelect = useCallback(type => {
    setFilterType(type);
    fetchReminders(1, true, type);
  }, [fetchReminders]);

  const handleMarkAsRead = useCallback(async id => {
    setLoadingActionId(id);
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Authentication required.');

      await handleNotificationApiCall(`${id}/read`, 'PUT', token);
      if (typeof fetchNotificationCount === 'function') {
        fetchNotificationCount();
      }

      // Update the reminder to mark it as read without removing it
      setRemindersData(prevData =>
        prevData.map(reminder =>
          reminder.id === id ? { ...reminder, read: true } : reminder,
        ),
      );
      Toast.show({ type: 'success', text1: 'Reminder marked as read.' });
    } catch (error) {
      Alert.alert(
        'Error',
        `Failed to mark reminder as read: ${error.message}`,
      );
    } finally {
      setLoadingActionId(null);
    }
  }, [fetchNotificationCount]);

  const handleMarkAllAsRead = useCallback(async () => {
    setIsActionLoading(true);
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Authentication required.');

      await handleNotificationApiCall('mark-all-read?type=advance_booking_reminder', 'PUT', token);
      if (typeof fetchNotificationCount === 'function') {
        fetchNotificationCount();
      }

      setRemindersData(prevData =>
        prevData.map(reminder => ({ ...reminder, read: true })),
      );
      Toast.show({
        type: 'success',
        text1: 'All reminders marked as read.',
      });
    } catch (error) {
      Alert.alert(
        'Error',
        `Failed to mark all reminders as read: ${error.message}`,
      );
    } finally {
      setIsActionLoading(false);
    }
  }, [fetchNotificationCount]);

  const handleDeleteReminder = useCallback(async id => {
    setLoadingActionId(id);
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Authentication required.');

      await handleNotificationApiCall(id, 'DELETE', token);
      if (typeof fetchNotificationCount === 'function') {
        fetchNotificationCount();
      }

      // Remove from list immediately
      setRemindersData(prevData =>
        prevData.filter(reminder => reminder.id !== id),
      );
      Toast.show({ type: 'success', text1: 'Reminder deleted.' });
    } catch (error) {
      Alert.alert(
        'Error',
        `Failed to delete reminder: ${error.message}`,
      );
    } finally {
      setLoadingActionId(null);
    }
  }, [fetchNotificationCount]);

  const handleRefresh = useCallback(() => {
    initialLoadFailedRef.current = false;
    fetchReminders(1, true, filterType);
  }, [fetchReminders, filterType]);

  // ====================================================================
  // RENDER LOGIC
  // ====================================================================

  const renderReminderItem = ({ item, index }) => {
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
              { backgroundColor: '#A98C27' },
            ]}
          />
          <Ionicons name="alarm-outline" size={width * 0.02} color="#A98C27" />
        </View>

        <View style={styles.notificationContent}>
          <View style={styles.notificationHeader}>
            <Text style={styles.notificationTitle}>{item.title}</Text>
          </View>
          <Text style={styles.notificationMessage} numberOfLines={2}>
            {item.message}
          </Text>
          <Text style={styles.notificationTimestamp}>{item.timestamp}</Text>
        </View>

        <View style={styles.notificationActions}>
          {!item.read && <View style={styles.unreadDot} />}
          {loadingActionId === item.id ? (
            <ActivityIndicator size="small" color="#A98C27" />
          ) : (
            <>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => !item.read && handleMarkAsRead(item.id)}
                disabled={item.read}
              >
                <Ionicons
                  name="checkmark-done-outline"
                  size={width * 0.025}
                  color={item.read ? '#1976D2' : '#4CAF50'}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleDeleteReminder(item.id)}
              >
                <Ionicons
                  name="trash-outline"
                  size={width * 0.025}
                  color="#ff5555"
                />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  };

  const renderHeader = () => {
    return (
      <View style={styles.notificationsHeaderSection}>
        <Text style={styles.screenTitle}>Booking Reminders</Text>
        <View style={styles.buttonsGroup}>
          {/* Filter Buttons */}
          {['all', 'unread', 'read'].map(type => (
            <TouchableOpacity
              key={type}
              style={[
                styles.filterButton,
                filterType === type && styles.filterButtonActive,
              ]}
              onPress={() => handleFilterSelect(type)}
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
            disabled={isActionLoading || remindersData.every(n => n.read)}
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
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.contentArea}>
        <FlatList
          data={remindersData}
          renderItem={renderReminderItem}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={() => (
            <View style={styles.noDataContainer}>
              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#A98C27" />
                  <Text style={styles.loadingText}>Loading reminders...</Text>
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
                  No reminders found for the current filter.
                </Text>
              )}
            </View>
          )}
        />

        {/* Pagination Controls */}
        {!isLoading && !error && remindersData.length > 0 && (
          <View style={styles.paginationContainer}>
            <TouchableOpacity
              style={[styles.pageButton, page === 1 && styles.pageButtonDisabled]}
              onPress={() => page > 1 && fetchReminders(page - 1, false, filterType)}
              disabled={page === 1}
            >
              <Text style={styles.pageButtonText}>Prev</Text>
            </TouchableOpacity>
            <View style={styles.pageNumbersContainer}>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                <TouchableOpacity
                  key={`pg-${n}`}
                  style={[styles.pageNumber, n === page && styles.pageNumberActive]}
                  onPress={() => fetchReminders(n, false, filterType)}
                >
                  <Text style={[styles.pageNumberText, n === page && styles.pageNumberTextActive]}>
                    {n}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={[styles.pageButton, page === totalPages && styles.pageButtonDisabled]}
              onPress={() => page < totalPages && fetchReminders(page + 1, false, filterType)}
              disabled={page === totalPages}
            >
              <Text style={styles.pageButtonText}>Next</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
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
    flexWrap: 'wrap',
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
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF3B30',
    marginLeft: width * 0.01,
    marginRight: width * 0.01,
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
  buttonsGroup: {
    flexDirection: 'row',
    gap: width * 0.015,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  filterButton: {
    backgroundColor: '#2A2D32',
    paddingVertical: height * 0.012,
    paddingHorizontal: width * 0.02,
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
  footerLoader: {
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paginationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: height * 0.02,
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

export default ReminderScreen;
