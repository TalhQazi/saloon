import axios from 'axios';
import { BASE_URL } from './config';
import { getAdminToken } from '../utils/authUtils';

// Add Advance Salary (Admin) for a specific employee/manager
export const addAdminAdvanceSalary = async (amount, imageUri, employeeId) => {
  try {
    const token = await getAdminToken();
    if (!token) {
      throw new Error('No admin authentication token found');
    }
    
    const config = {
      headers: {
        'Content-Type': 'multipart/form-data',
        Authorization: `Bearer ${token}`,
      },
    };
    console.log('🔑 Using admin authenticated instance');

    // Create FormData for file upload
    const formData = new FormData();
    formData.append('amount', amount.toString());

    if (!employeeId) {
      throw new Error('Employee ID is required to record advance salary');
    }
    formData.append('employeeId', String(employeeId));

    // Add image file
    if (imageUri) {
      const imageFile = {
        uri: imageUri,
        type: 'image/jpeg', // or determine dynamically
        name: 'advance_salary_image.jpg',
      };
      formData.append('image', imageFile);
      console.log('🔍 Image added to FormData:', imageUri);
    }

    const apiUrl = `${BASE_URL}/admin-advance-salary/add`;
    console.log('🔍 Making API call to:', apiUrl);
    console.log(
      '🔍 FormData keys:',
      Array.from(formData._parts).map(part => part[0]),
    );

    const response = await axios.post(apiUrl, formData, {
      ...config,
      'Content-Type': 'multipart/form-data',
      timeout: 10000, // 10 second timeout
    });

    console.log('✅ API Response Status:', response.status);
    console.log('✅ API Response Data:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Add Admin Advance Salary Error:', error);
    console.error('❌ Error response:', error.response?.data);
    console.error('❌ Error status:', error.response?.status);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error code:', error.code);
    console.error('❌ Error config:', {
      url: error.config?.url,
      method: error.config?.method,
      headers: error.config?.headers,
    });
    throw error;
  }
};

// Get All Admin Advance Salary Records
export const getAllAdminAdvanceSalary = async () => {
  try {
    const token = await getAdminToken();
    if (!token) {
      throw new Error('No admin authentication token found');
    }
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      timeout: 10000, // 10 second timeout
    };

    console.log('🔑 [AdminAdvanceSalary] Using admin token:', token.substring(0, 20) + '...');
    
    const response = await axios.get(`${BASE_URL}/admin-advance-salary/all`, config);

    console.log('✅ [AdminAdvanceSalary] API Response:', response.data);
    
    // Return the data array from the response
    return response.data.data || response.data;
  } catch (error) {
    console.error('❌ [AdminAdvanceSalary] Get All Admin Advance Salary Error:', error);
    console.error('❌ [AdminAdvanceSalary] Error details:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
    });
    throw error;
  }
};

// Get Admin Advance Salary Statistics
export const getAdminAdvanceSalaryStats = async () => {
  try {
    const token = await getAdminToken();
    if (!token) {
      throw new Error('No admin authentication token found');
    }
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      timeout: 10000, // 10 second timeout
    };

    const response = await axios.get(`${BASE_URL}/admin-advance-salary/stats`, config);

    return response.data;
  } catch (error) {
    console.error('Get Admin Advance Salary Stats Error:', error);
    throw error;
  }
};

// Get Admin Advance Salary by ID
export const getAdminAdvanceSalaryById = async recordId => {
  try {
    const token = await getAdminToken();
    if (!token) {
      throw new Error('No admin authentication token found');
    }
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      timeout: 10000, // 10 second timeout
    };

    const response = await axios.get(
      `${BASE_URL}/admin-advance-salary/${recordId}`,
      config,
    );

    return response.data;
  } catch (error) {
    console.error('Get Admin Advance Salary by ID Error:', error);
    throw error;
  }
};

// Delete Admin Advance Salary by ID
export const deleteAdminAdvanceSalary = async recordId => {
  try {
    const token = await getAdminToken();
    if (!token) {
      throw new Error('No admin authentication token found');
    }

    const config = {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      timeout: 10000,
    };

    const response = await axios.delete(
      `${BASE_URL}/admin-advance-salary/${recordId}`,
      config,
    );

    return response.data;
  } catch (error) {
    console.error('Delete Admin Advance Salary Error:', error);
    throw error;
  }
};
