import axios from 'axios';
import { BASE_URL } from './config';
import {
  createAdminAuthConfig,
  createManagerAuthConfig,
  createAnyAuthConfig,
} from '../utils/authUtils';

// Get All Advance Salary Requests (for managers - shows approved requests)
export const getAllAdvanceSalaryRequests = async (status = 'approved') => {
  try {
    const config = await createManagerAuthConfig();
    console.log('🔑 [AdvanceSalaryService] Using authenticated instance');

    const response = await axios.get(
      `${BASE_URL}/advance-salary/all?status=${status}`,
      config,
    );

    console.log('✅ [AdvanceSalaryService] API Response:', response.data);
    return response.data;
  } catch (error) {
    console.error(
      '❌ [AdvanceSalaryService] Failed to fetch advance salary requests:',
      error,
    );
    throw error;
  }
};

// Add Advance Salary Request (for managers - requires admin approval)
export const addAdvanceSalaryRequest = async formData => {
  try {
    const config = await createManagerAuthConfig();
    console.log('🔑 [AdvanceSalaryService] Using authenticated instance for add request');

    const response = await axios.post(
      `${BASE_URL}/advance-salary/add`,
      formData,
      config,
    );

    console.log('✅ [AdvanceSalaryService] Add request successful:', response.data);
    return response.data;
  } catch (error) {
    console.error(
      '❌ [AdvanceSalaryService] Failed to add advance salary request:',
      error,
    );
    throw error;
  }
};

// Get Pending Advance Salary Requests (for admins - to approve/decline)
export const getPendingAdvanceSalaryRequests = async () => {
  try {
    const config = await createAdminAuthConfig();
    console.log('🔑 [AdvanceSalaryService] Using authenticated instance for pending requests');

    const response = await axios.get(
      `${BASE_URL}/advance-salary/pending`,
      config,
    );

    console.log('✅ [AdvanceSalaryService] Pending requests response:', response.data);
    return response.data;
  } catch (error) {
    console.error(
      '❌ [AdvanceSalaryService] Failed to fetch pending requests:',
      error,
    );
    throw error;
  }
};

// Approve/Decline Advance Salary Request (for admins)
export const updateAdvanceSalaryRequest = async (requestId, status, remarks = '') => {
  try {
    const config = await createAdminAuthConfig();
    console.log('🔑 [AdvanceSalaryService] Using authenticated instance for update');

    const response = await axios.put(
      `${BASE_URL}/advance-salary/${requestId}`,
      {
        status,
        remarks,
      },
      config,
    );

    console.log('✅ [AdvanceSalaryService] Update successful:', response.data);
    return response.data;
  } catch (error) {
    console.error(
      '❌ [AdvanceSalaryService] Failed to update advance salary request:',
      error,
    );
    throw error;
  }
};

// Get Advance Salary History (for both managers and admins)
export const getAdvanceSalaryHistory = async (filters = {}) => {
  try {
    const config = await createAnyAuthConfig();
    console.log('🔑 [AdvanceSalaryService] Using authenticated instance for history');

    const queryParams = new URLSearchParams(filters).toString();
    const url = queryParams 
      ? `${BASE_URL}/advance-salary/history?${queryParams}`
      : `${BASE_URL}/advance-salary/history`;

    const response = await axios.get(url, config);

    console.log('✅ [AdvanceSalaryService] History response:', response.data);
    return response.data;
  } catch (error) {
    console.error(
      '❌ [AdvanceSalaryService] Failed to fetch advance salary history:',
      error,
    );
    throw error;
  }
};

// Delete Advance Salary Request (for admins)
export const deleteAdvanceSalaryRequest = async (requestId) => {
  try {
    const config = await createAdminAuthConfig();
    console.log('🔑 [AdvanceSalaryService] Using authenticated instance for delete');

    const response = await axios.delete(
      `${BASE_URL}/advance-salary/${requestId}`,
      config,
    );

    console.log('✅ [AdvanceSalaryService] Delete successful:', response.data);
    return response.data;
  } catch (error) {
    console.error(
      '❌ [AdvanceSalaryService] Failed to delete advance salary request:',
      error,
    );
    throw error;
  }
};

// Get Advance Salary Statistics (for admins)
export const getAdvanceSalaryStats = async () => {
  try {
    const config = await createAdminAuthConfig();
    console.log('🔑 [AdvanceSalaryService] Using authenticated instance for stats');

    const response = await axios.get(
      `${BASE_URL}/advance-salary/stats`,
      config,
    );

    console.log('✅ [AdvanceSalaryService] Stats response:', response.data);
    return response.data;
  } catch (error) {
    console.error(
      '❌ [AdvanceSalaryService] Failed to fetch advance salary stats:',
      error,
    );
    throw error;
  }
};
