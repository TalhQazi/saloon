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
    const adminAuth = await AsyncStorage.getItem('adminAuth');
    const managerAuth = await AsyncStorage.getItem('managerAuth');

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

  // State
  const [remindersData, setRemindersData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Fetches reminders from the API.
   */
  const fetchReminders = useCallback(
    async (isRefresh = false, isFocusEffectCall = false) => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;

      if (!isRefresh && !isFocusEffectCall) {
        setIsLoading(true);
      }

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

        // Query only unread advance booking reminders
        const data = await handleNotificationApiCall('?type=advance_booking_reminder&isRead=false', 'GET', token);

        if (
          !data.success ||
          !data.data ||
          !Array.isArray(data.data.notifications)
        ) {
          throw new Error(
            'Unexpected data format from server.',
          );
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
      } catch (err) {
        console.error('❌ Failed to fetch reminders:', err);
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
    fetchReminders();
  }, [fetchReminders]);

  // Refetch on screen focus
  useFocusEffect(
    useCallback(() => {
      if (!isFetchingRef.current) {
        fetchReminders(false, true);
      }
    }, [fetchReminders]),
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
      if (typeof fetchNotificationCount === 'function') {
        fetchNotificationCount();
      }

      // Remove from the list immediately upon marking read
      setRemindersData(prevData => prevData.filter(reminder => reminder.id !== id));
      Toast.show({ type: 'success', text1: 'Reminder marked as read.' });
    } catch (error) {
      Alert.alert(
        'Error',
        `Failed to mark reminder as read: ${error.message}`,
      );
    } finally {
      setIsActionLoading(false);
    }
  }, [fetchNotificationCount]);

  const handleDeleteReminder = useCallback(async id => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this reminder?',
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
              if (typeof fetchNotificationCount === 'function') {
                fetchNotificationCount();
              }

              // Remove from list immediately
              setRemindersData(prevData => prevData.filter(reminder => reminder.id !== id));
              Toast.show({ type: 'success', text1: 'Reminder deleted.' });
            } catch (error) {
              Alert.alert(
                'Error',
                `Failed to delete reminder: ${error.message}`,
              );
            } finally {
              setIsActionLoading(false);
            }
          },
        },
      ],
    );
  }, [fetchNotificationCount]);

  const handleRefresh = useCallback(() => {
    fetchReminders(true, false);
  }, [fetchReminders]);

  // ====================================================================
  // RENDER LOGIC
  // ====================================================================

  const renderReminderItem = ({ item, index }) => {
    return (
      <View
        style={[
          styles.notificationRow,
          { backgroundColor: index % 2 === 0 ? '#2E2E2E' : '#1F1F1F' },
          styles.unreadNotification,
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
            <View style={styles.unreadDot} />
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
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleDeleteReminder(item.id)}
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
          <Text style={styles.screenTitle}>Booking Reminders</Text>
          <View style={styles.buttonsGroup}>
            {/* Refresh Button */}
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={handleRefresh}
              disabled={isLoading || isActionLoading}
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
            data={remindersData}
            renderItem={renderReminderItem}
            keyExtractor={item => item.id}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={() => (
              <View style={styles.noDataContainer}>
                {isLoading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#A98C27" />
                    <Text style={styles.loadingText}>
                      Loading reminders...
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
                    No upcoming reminders.
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
    flexWrap: 'wrap',
  },
  buttonsGroup: {
    flexDirection: 'row',
    gap: width * 0.015,
    alignItems: 'center',
    flexWrap: 'wrap',
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

export default ReminderScreen;
