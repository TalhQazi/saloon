// src/api/notificationService.js
import { BASE_URL } from './config';

// NOTE: If formatDate is needed here, you would need to import it or define it.
// Assuming the calling component (NotificationsScreen) handles formatting,
// but we will ensure the structure is correct.

const withAuthHeaders = token => ({
  Authorization: `Bearer ${token}`,
});

const buildQueryString = params => {
  if (!params || typeof params !== 'object') return '';
  const esc = encodeURIComponent;
  const query = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${esc(k)}=${esc(String(v))}`)
    .join('&');
  return query ? `?${query}` : '';
};

export const getNotifications = async (token, params = {}) => {
  const qs = buildQueryString(params);
  const res = await fetch(`${BASE_URL}/notifications${qs}`, {
    method: 'GET',
    headers: {
      ...withAuthHeaders(token),
      'Content-Type': 'application/json',
    },
  });
  const json = await res.json().catch(() => ({}));

  if (!res.ok || !json.success || !Array.isArray(json.data?.notifications)) {
    return {
      success: false,
      error:
        json?.message ||
        `Failed to fetch notifications. HTTP Status: ${res.status}`,
    };
  }

  // Mapping the data to match the expected structure in the screen component
  const mappedNotifications = json.data.notifications.map(item => ({
    id: item._id,
    title: item.title || 'No Title',
    message: item.message || 'No message',
    type: item.type || 'info',
    timestamp: item.createdAt, // Send raw timestamp; screen component formats it
    read: item.isRead || false, // Use 'read' property name as expected by screen
  }));

  return {
    success: true,
    data: {
      notifications: mappedNotifications,
      // Include any other pagination data if needed
    },
    // The message from the original API response might be included here
    message: json.message || 'Notifications fetched successfully.',
  };
};

export const getNotificationCount = async token => {
  const res = await fetch(`${BASE_URL}/notifications/count`, {
    method: 'GET',
    headers: {
      ...withAuthHeaders(token),
      'Content-Type': 'application/json',
    },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { success: false, unreadCount: 0, error: json?.message };
  }
  return json;
};

export const getUpcomingReminders = async token => {
  const res = await fetch(`${BASE_URL}/notifications/upcoming-reminders`, {
    method: 'GET',
    headers: {
      ...withAuthHeaders(token),
      'Content-Type': 'application/json',
    },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { success: false, reminders: [], error: json?.message };
  }
  return json;
};

export const markNotificationAsRead = async (notificationId, token) => {
  const res = await fetch(`${BASE_URL}/notifications/${notificationId}/read`, {
    method: 'PUT',
    headers: {
      ...withAuthHeaders(token),
      'Content-Type': 'application/json',
    },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { success: false, error: json?.message };
  }
  return json;
};

export const markAllNotificationsAsRead = async token => {
  const res = await fetch(`${BASE_URL}/notifications/mark-all-read`, {
    method: 'PUT',
    headers: {
      ...withAuthHeaders(token),
      'Content-Type': 'application/json',
    },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { success: false, error: json?.message };
  }
  return json;
};

export const deleteNotification = async (notificationId, token) => {
  const res = await fetch(`${BASE_URL}/notifications/${notificationId}`, {
    method: 'DELETE',
    headers: {
      ...withAuthHeaders(token),
      'Content-Type': 'application/json',
    },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { success: false, error: json?.message };
  }
  return json;
};

export default {
  getNotifications,
  getNotificationCount,
  getUpcomingReminders,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
};
