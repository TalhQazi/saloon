import axios from 'axios';
import { BASE_URL } from './config';
import {
  getAuthToken,
  getAdminToken,
  getManagerToken,
} from '../utils/authUtils';
import { Alert } from 'react-native';

// ===========================
// UTIL: Validate & Prepare Image
// ===========================
const prepareImageField = (imageUri, namePrefix) => {
  if (!imageUri) return null;

  if (!imageUri.startsWith('file://') && !imageUri.startsWith('content://')) {
    throw new Error('Invalid image URI. Must be a valid file or content URI.');
  }

  const match = imageUri.match(/\.(jpg|jpeg|png)$/i);
  if (!match) {
    throw new Error(
      'Unsupported image format. Only JPG, JPEG, and PNG are allowed.',
    );
  }
  const ext = match[1].toLowerCase();
  const type = `image/${ext}`;

  return {
    uri: imageUri,
    type,
    name: `${namePrefix}_${Date.now()}.${ext}`,
  };
};

// ===========================
// EMPLOYEE ATTENDANCE APIS (AB ADMIN KE LIYE BHI USE HONGE)
// ===========================

export const employeeCheckIn = async (employeeId, imageUri) => {
  try {
    const token = await getAdminToken();
    if (!token) {
      throw new Error('No authentication token found. Please login again.');
    }

    const formData = new FormData();
    formData.append('employeeId', employeeId);

    const imageField = prepareImageField(imageUri, 'checkin');
    if (imageField) formData.append('livePicture', imageField);

    const response = await axios.post(
      `${BASE_URL}/attendance/checkin`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`,
        },
        timeout: 15000,
      },
    );

    return response.data;
  } catch (error) {
    console.error('❌ Employee/Admin Check-In Error:', error);
    if (error.response?.status === 400) {
      const msg = error.response.data?.message || 'Invalid request';
      if (msg.includes('file') || msg.includes('upload')) {
        throw new Error('File upload error. Please try again.');
      }
      throw new Error(msg);
    }
    if (error.code === 'ERR_NETWORK') {
      throw new Error('Network connection failed. Please check your internet.');
    }
    if (error.response?.status === 401) {
      throw new Error('Authentication failed. Please login again.');
    }
    throw error;
  }
};

// ===========================
// ADMIN DELETE ATTENDANCE RECORD
// ===========================

export const deleteAdminAttendance = async (attendanceId, tokenOverride) => {
  try {
    const token = tokenOverride || (await getAdminToken());
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await axios.delete(`${BASE_URL}/attendance/${attendanceId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    return response.data;
  } catch (error) {
    console.error('❌ Delete attendance error:', error);
    if (error.response?.status === 401) {
      throw new Error('Authentication failed. Please login again.');
    }
    throw error;
  }
};

// ===========================
// ADMIN MANUAL ATTENDANCE FOR ANY EMPLOYEE/MANAGER
// ===========================

export const adminRecordEmployeeAttendance = async (
  employeeId,
  employeeName,
  type,
  date,
  time,
  adminNotes,
) => {
  try {
    const token = await getAdminToken();
    if (!token) {
      throw new Error('No admin authentication token found. Please login again.');
    }

    const payload = { employeeId, employeeName, type, date, time, adminNotes };

    const response = await axios.post(
      `${BASE_URL}/attendance/admin/manual`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        timeout: 15000,
      },
    );

    return response.data;
  } catch (error) {
    console.error('❌ Admin manual attendance Error:', error);
    if (error.response?.status === 400) {
      const msg = error.response.data?.message || 'Invalid request';
      throw new Error(msg);
    }
    if (error.code === 'ERR_NETWORK') {
      throw new Error('Network connection failed. Please check your internet.');
    }
    if (error.response?.status === 401) {
      throw new Error('Authentication failed. Please login again.');
    }
    throw error;
  }
};

// ===========================
// EMPLOYEE DIRECTORY HELPERS
// ===========================

export const getEmployeesByRoleApi = async role => {
  try {
    const token = await getAdminToken();
    if (!token) {
      throw new Error('No authentication token found. Please login again.');
    }

    const response = await axios.get(`${BASE_URL}/employees/role/${role}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    });

    return response.data?.data || [];
  } catch (error) {
    console.error('❌ getEmployeesByRoleApi Error:', error);
    throw error;
  }
};

// (helper already defined above)

export const employeeCheckOut = async (employeeId, imageUri) => {
  try {
    const token = await getAdminToken();
    if (!token) {
      throw new Error('No authentication token found. Please login again.');
    }

    const formData = new FormData();
    formData.append('employeeId', employeeId);

    const imageField = prepareImageField(imageUri, 'checkout');
    if (imageField) formData.append('livePicture', imageField);

    const response = await axios.post(
      `${BASE_URL}/attendance/checkout`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`,
        },
        timeout: 15000,
      },
    );

    return response.data;
  } catch (error) {
    console.error('❌ Employee/Admin Check-Out Error:', error);
    if (error.response?.status === 400) {
      const msg = error.response.data?.message || 'Invalid request';
      if (msg.includes('file') || msg.includes('upload')) {
        throw new Error('File upload error. Please try again.');
      }
      throw new Error(msg);
    }
    if (error.code === 'ERR_NETWORK') {
      throw new Error('Network connection failed. Please check your internet.');
    }
    if (error.response?.status === 401) {
      throw new Error('Authentication failed. Please login again.');
    }
    throw error;
  }
};

export const getAllEmployeeAttendance = async () => {
  try {
    const token = await getAdminToken();
    if (!token) {
      throw new Error('No authentication token found. Please login again.');
    }

    const response = await axios.get(`${BASE_URL}/attendance/all`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    return response.data;
  } catch (error) {
    console.error('❌ Get All Attendance Error:', error);
    if (error.response?.status === 401) {
      throw new Error('Authentication failed. Please login again.');
    }
    throw error;
  }
};

// ===========================
// ADMIN ATTENDANCE — AB HUM employeeCheckIn/employeeCheckOut USE KAR RAHE HAIN
// ===========================
// ❌ adminAttendanceCustom — AB ISTEMAL NAHI HOGA — BACKEND MEIN /admin/attendance REGISTERED NAHI HAI

// ===========================
// ALL ATTENDANCE RECORDS (EMPLOYEES + ADMINS + MANAGERS)
// ===========================

export const getAllAdminAttendance = async token => {
  try {
    const authToken = token || (await getAuthToken());
    if (!authToken) {
      throw new Error('No authentication token found');
    }

    const response = await axios.get(`${BASE_URL}/attendance/all`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    });

    return response.data;
  } catch (error) {
    console.error('❌ Get All Attendance Records Error:', error);
    if (error.response?.status === 401) {
      throw new Error('Authentication failed. Please login again.');
    }
    throw error;
  }
};

// ===========================
// COMBINED ATTENDANCE (Employee + Admin)
// ===========================
export const getCombinedAttendance = async token => {
  const authToken = token || (await getAdminToken());
  if (!authToken) {
    throw new Error('No authentication token found');
  }

  const headers = {
    Authorization: `Bearer ${authToken}`,
    'Content-Type': 'application/json',
  };

  // Primary: Employee attendance (Attendance collection)
  const employeePromise = axios
    .get(`${BASE_URL}/attendance/all`, { headers })
    .then(r => (Array.isArray(r.data) ? r.data : []))
    .catch(() => []);

  // Try possible Admin attendance list endpoints, merge whatever returns
  const adminEndpoints = [
    `${BASE_URL}/admin/attendance/all`,
    `${BASE_URL}/admin/attendance-records`,
    `${BASE_URL}/admin/attendance/list`,
    `${BASE_URL}/admin/attendance`,
  ];

  const adminPromises = adminEndpoints.map(url =>
    axios
      .get(url, { headers })
      .then(r => (Array.isArray(r.data) ? r.data : []))
      .catch(() => []),
  );

  const [employeeRecords, ...adminResults] = await Promise.all([
    employeePromise,
    ...adminPromises,
  ]);

  const adminRecords = adminResults.flat();
  return [...employeeRecords, ...adminRecords];
};

// ===========================
// MANUAL ATTENDANCE REQUESTS
// ===========================

export const getPendingManualRequests = async () => {
  try {
    const token = await getAuthToken();
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await axios.get(
      `${BASE_URL}/attendance/pending-requests`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      },
    );

    return response.data;
  } catch (error) {
    console.error('❌ Get Pending Manual Requests Error:', error);
    if (error.response?.status === 401) {
      throw new Error('Authentication failed. Please login again.');
    }
    throw error;
  }
};

export const approveDeclineManualRequest = async (
  requestId,
  status,
  adminNotes,
) => {
  try {
    const token = await getAuthToken();
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await axios.put(
      `${BASE_URL}/attendance/approve-decline-request/${requestId}`,
      { status, adminNotes },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      },
    );

    return response.data;
  } catch (error) {
    console.error('❌ Approve/Decline Manual Request Error:', error);
    if (error.response?.status === 401) {
      throw new Error('Authentication failed. Please login again.');
    }
    throw error;
  }
};

// ===========================
// SYSTEM ACTIONS
// ===========================

export const markAbsentEmployees = async () => {
  try {
    const token = await getAuthToken();
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await axios.post(
      `${BASE_URL}/attendance/mark-absent`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      },
    );

    return response.data;
  } catch (error) {
    console.error('❌ Mark Absent Employees Error:', error);
    if (error.response?.status === 401) {
      throw new Error('Authentication failed. Please login again.');
    }
    throw error;
  }
};
// attendanceService.js

export const adminCheckIn = async (
  employId,
  employeName,
  slectType,
  date,
  imageUri,
) => {
  try {
    const token = await getAdminToken();
    if (!token) {
      throw new Error(
        'No admin authentication token found. Please login again.',
      );
    }

    const payload = { employId, employeName, slectType, date };

    const response = await axios.post(`${BASE_URL}/admin/attendance`, payload, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      timeout: 15000,
    });

    return response.data;
  } catch (error) {
    console.error('❌ Admin Check-In Error:', error);
    if (error.response?.status === 400) {
      const msg = error.response.data?.message || 'Invalid request';
      if (msg.includes('file') || msg.includes('upload')) {
        throw new Error('File upload error. Please try again.');
      }
      throw new Error(msg);
    }
    if (error.code === 'ERR_NETWORK') {
      throw new Error('Network connection failed. Please check your internet.');
    }
    if (error.response?.status === 401) {
      throw new Error('Authentication failed. Please login again.');
    }
    throw error;
  }
};

export const adminCheckOut = async (
  employId,
  employeName,
  slectType,
  date,
  imageUri,
) => {
  try {
    const token = await getAdminToken();
    if (!token) {
      throw new Error(
        'No admin authentication token found. Please login again.',
      );
    }

    const payload = { employId, employeName, slectType, date };

    const response = await axios.post(`${BASE_URL}/admin/attendance`, payload, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      timeout: 15000,
    });

    return response.data;
  } catch (error) {
    console.error('❌ Admin Check-Out Error:', error);
    if (error.response?.status === 400) {
      const msg = error.response.data?.message || 'Invalid request';
      if (msg.includes('file') || msg.includes('upload')) {
        throw new Error('File upload error. Please try again.');
      }
      throw new Error(msg);
    }
    if (error.code === 'ERR_NETWORK') {
      throw new Error('Network connection failed. Please check your internet.');
    }
    if (error.response?.status === 401) {
      throw new Error('Authentication failed. Please login again.');
    }
    throw error;
  }
};
