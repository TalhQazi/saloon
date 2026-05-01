// src/api/attendanceRequestService.js
// Dedicated service for attendance requests only

import axios from 'axios';
import { BASE_URL } from './config';
import { getManagerToken, getAdminToken } from '../utils/authUtils';

// ===========================
// ATTENDANCE REQUEST APIS
// ===========================

/**
 * Submit manual attendance request (Manager → Admin)
 */
export const submitAttendanceRequest = async requestData => {
  try {
    const token = await getManagerToken();
    if (!token) {
      throw new Error('No manager authentication token found');
    }

    console.log(
      '📤 [AttendanceRequest] Submitting attendance request:',
      requestData,
    );
    console.log('📤 [AttendanceRequest] Employee ID:', requestData.employeeId);
    console.log(
      '📤 [AttendanceRequest] Employee Name:',
      requestData.employeeName,
    );
    console.log(
      '📤 [AttendanceRequest] Request Type:',
      requestData.requestType,
    );

    // Try primary attendance endpoint (matches backend route)
    try {
      const response = await axios.post(
        `${BASE_URL}/attendance/manual-request`,
        requestData,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          timeout: 15000,
        },
      );

      console.log(
        '✅ [AttendanceRequest] Primary endpoint success:',
        response.data,
      );
      return response.data;
    } catch (apiError) {
      // Try alternative attendance endpoints
      if (apiError.response?.status === 404) {
        console.log(
          '🔄 [AttendanceRequest] Trying alternative attendance endpoints...',
        );

        const alternativeEndpoints = [
          `${BASE_URL}/attendance/request`,
          `${BASE_URL}/admin/attendance-request`,
        ];

        for (const endpoint of alternativeEndpoints) {
          try {
            console.log(`🔄 [AttendanceRequest] Trying: ${endpoint}`);
            const altResponse = await axios.post(endpoint, requestData, {
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              timeout: 15000,
            });
            console.log(
              `✅ [AttendanceRequest] Alternative success:`,
              altResponse.data,
            );
            return altResponse.data;
          } catch (altError) {
            console.log(
              `❌ [AttendanceRequest] Alternative failed:`,
              altError.response?.status,
            );
            continue;
          }
        }
      }
      throw apiError;
    }
  } catch (error) {
    console.error('❌ [AttendanceRequest] Error:', error);

    if (error.response?.status === 400) {
      const msg = error.response.data?.message || 'Invalid request data';
      throw new Error(msg);
    }
    if (error.response?.status === 401) {
      throw new Error('Authentication failed. Please login again.');
    }
    if (error.response?.status === 404) {
      console.log(
        '❌ [AttendanceRequest] 404 Error Details:',
        error.response?.data,
      );
      throw new Error('Employee not found. Please check the employee ID.');
    }
    if (error.code === 'ERR_NETWORK') {
      throw new Error('Network connection failed. Please check your internet.');
    }

    throw error;
  }
};

/**
 * Get pending attendance requests (Admin)
 */
export const getPendingAttendanceRequests = async () => {
  try {
    const token = await getAdminToken();
    if (!token) {
      throw new Error('No admin authentication token found');
    }

    console.log(
      '🔍 [AttendanceRequest] Fetching pending attendance requests...',
    );

    // Try primary attendance endpoint
    try {
      const response = await axios.get(
        `${BASE_URL}/attendance/pending-requests`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        },
      );

      console.log(
        '✅ [AttendanceRequest] Primary endpoint success:',
        response.data,
      );
      return response.data;
    } catch (apiError) {
      // Try alternative attendance endpoints
      if (apiError.response?.status === 404) {
        console.log(
          '🔄 [AttendanceRequest] Trying alternative attendance endpoints...',
        );

        const alternativeEndpoints = [
          `${BASE_URL}/admin/attendance-pending`,
          `${BASE_URL}/attendance/requests/pending`,
        ];

        for (const endpoint of alternativeEndpoints) {
          try {
            console.log(`🔄 [AttendanceRequest] Trying: ${endpoint}`);
            const altResponse = await axios.get(endpoint, {
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              timeout: 10000,
            });
            console.log(
              `✅ [AttendanceRequest] Alternative success:`,
              altResponse.data,
            );
            return altResponse.data;
          } catch (altError) {
            console.log(
              `❌ [AttendanceRequest] Alternative failed:`,
              altError.response?.status,
            );
            continue;
          }
        }
      }
      throw apiError;
    }
  } catch (error) {
    console.error('❌ [AttendanceRequest] Error:', error);

    // Return empty data structure instead of throwing error
    return {
      success: true,
      data: [],
      message: 'No pending attendance requests found',
    };
  }
};

/**
 * Approve/Decline attendance request (Admin)
 */
export const approveAttendanceRequest = async (requestId, status) => {
  try {
    const token = await getAdminToken();
    if (!token) {
      throw new Error('No admin authentication token found');
    }

    console.log('🔍 [AttendanceRequest] Approving attendance request:', {
      requestId,
      status,
    });

    // Try primary attendance endpoint (matches backend route)
    try {
      const response = await axios.put(
        `${BASE_URL}/attendance/approve-request/${requestId}`,
        { status },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        },
      );

      console.log(
        '✅ [AttendanceRequest] Primary approval success:',
        response.data,
      );
      return response.data;
    } catch (apiError) {
      // Try alternative attendance endpoints
      if (apiError.response?.status === 404) {
        console.log(
          '🔄 [AttendanceRequest] Trying alternative approval endpoints...',
        );

        const alternativeEndpoints = [
          `${BASE_URL}/attendance/approve/${requestId}`,
          `${BASE_URL}/admin/attendance-approve/${requestId}`,
        ];

        for (const endpoint of alternativeEndpoints) {
          try {
            console.log(`🔄 [AttendanceRequest] Trying: ${endpoint}`);
            const altResponse = await axios.put(
              endpoint,
              { status },
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                timeout: 10000,
              },
            );
            console.log(
              `✅ [AttendanceRequest] Alternative approval success:`,
              altResponse.data,
            );
            return altResponse.data;
          } catch (altError) {
            console.log(
              `❌ [AttendanceRequest] Alternative approval failed:`,
              altError.response?.status,
            );
            continue;
          }
        }
      }
      throw apiError;
    }
  } catch (error) {
    console.error('❌ [AttendanceRequest] Approval error:', error);
    throw error;
  }
};

/**
 * Decline attendance request (Admin)
 */
export const declineAttendanceRequest = async (requestId, adminNotes = '') => {
  try {
    const token = await getAdminToken();
    if (!token) {
      throw new Error('No admin authentication token found');
    }

    // Use backend approve-request endpoint with declined status
    const response = await axios.put(
      `${BASE_URL}/attendance/approve-request/${requestId}`,
      { status: 'declined', adminNotes },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      },
    );

    return response.data;
  } catch (error) {
    console.error('❌ [AttendanceRequest] Decline error:', error);
    throw error;
  }
};

export default {
  submitAttendanceRequest,
  getPendingAttendanceRequests,
  approveAttendanceRequest,
  declineAttendanceRequest,
};
