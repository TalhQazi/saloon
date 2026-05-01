// src/utils/authUtilities.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from './api/config';

// Fetches the stored admin authentication token.
export const getAdminToken = async () => {
  try {
    const adminAuthData = await AsyncStorage.getItem('adminAuth');
    if (adminAuthData) {
      const { token } = JSON.parse(adminAuthData);
      console.log('✅ Admin token found.');
      return token;
    }
  } catch (error) {
    console.error('Error getting admin token:', error);
  }
  return null;
};

// Fetches the stored manager authentication token.
export const getManagerToken = async () => {
  try {
    const managerAuthData = await AsyncStorage.getItem('managerAuth');
    if (managerAuthData) {
      const { token } = JSON.parse(managerAuthData);
      console.log('✅ Manager token found.');
      return token;
    }
  } catch (error) {
    console.error('Error getting manager token:', error);
  }
  return null;
};

// Fetches the face-based authentication token and attempts to convert it to a JWT.
export const getFaceAuthToken = async () => {
  try {
    let token = await AsyncStorage.getItem('face_auth_token'); // Assuming this is how it's stored
    if (token && token.startsWith('face_auth_')) {
      console.log('🔄 Converting face auth token to JWT...');
      const adminAuthData = await AsyncStorage.getItem('adminAuth');
      if (adminAuthData) {
        const { admin, faceData } = JSON.parse(adminAuthData);
        if (admin && faceData) {
          const response = await fetch(`${BASE_URL}/auth/face-login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              adminId: admin._id,
              name: admin.name,
              faceVerified: true,
              faceData,
            }),
          });
          if (response.ok) {
            const data = await response.json();
            const jwtToken = data.token || data.data?.token;
            await AsyncStorage.setItem(
              'adminAuth',
              JSON.stringify({ ...JSON.parse(adminAuthData), token: jwtToken }),
            );
            console.log('✅ Successfully converted face auth token to JWT.');
            return jwtToken;
          } else {
            console.error(
              '❌ Face login failed on conversion:',
              await response.json(),
            );
          }
        }
      } else {
        console.error(
          '❌ Admin or face data not found for face auth conversion.',
        );
      }
    }
  } catch (conversionError) {
    console.error('❌ Failed to convert face auth token:', conversionError);
  }
  return null;
};

// The primary function to get the authentication token.
export const getAuthToken = async () => {
  try {
    // 1. First, try to get the admin token (most common for admin panel).
    const adminToken = await getAdminToken();
    if (adminToken) {
      return adminToken;
    }

    // 2. If no admin token, try to get the manager token.
    const managerToken = await getManagerToken();
    if (managerToken) {
      return managerToken;
    }

    // 3. Finally, as a last resort, try face authentication conversion.
    const faceAuthToken = await getFaceAuthToken();
    if (faceAuthToken) {
      return faceAuthToken;
    }

    return null;
  } catch (error) {
    console.error('Error in getAuthToken:', error);
    return null;
  }
};

// Check if user is authenticated
export const isAuthenticated = async () => {
  const token = await getAuthToken();
  return !!token;
};

// Get user type (manager or admin)
export const getUserType = async () => {
  try {
    const adminAuthData = await AsyncStorage.getItem('adminAuth');
    if (adminAuthData) {
      const { token } = JSON.parse(adminAuthData);
      if (token) {
        return 'admin';
      }
    }

    const managerAuthData = await AsyncStorage.getItem('managerAuth');
    if (managerAuthData) {
      const { token } = JSON.parse(managerAuthData);
      if (token) {
        return 'manager';
      }
    }
  } catch (error) {
    console.error('Error getting user type:', error);
  }
  return null;
};

// Get user data (manager or admin)
export const getUserData = async () => {
  try {
    const adminAuthData = await AsyncStorage.getItem('adminAuth');
    if (adminAuthData) {
      const { admin } = JSON.parse(adminAuthData);
      if (admin) {
        return { type: 'admin', data: admin };
      }
    }

    const managerAuthData = await AsyncStorage.getItem('managerAuth');
    if (managerAuthData) {
      const { manager } = JSON.parse(managerAuthData);
      if (manager) {
        return { type: 'manager', data: manager };
      }
    }
  } catch (error) {
    console.error('Error getting user data:', error);
  }
  return null;
};

// Clear all authentication data
export const clearAuthData = async () => {
  try {
    await AsyncStorage.multiRemove([
      'managerAuth',
      'adminAuth',
      'managerToken',
      'authToken',
      'adminFullName',
      'adminEmail',
      'face_auth_token',
    ]);
    console.log('✅ All authentication data cleared');
  } catch (error) {
    console.error('Error clearing auth data:', error);
  }
};
