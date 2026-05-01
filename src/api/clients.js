// clients.js - Complete Updated Version
import axios from 'axios';
import { BASE_URL } from './config';
import AsyncStorage from '@react-native-async-storage/async-storage';

const getAuthToken = async () => {
  try {
    console.log('🔍 [getAuthToken] Starting token retrieval...');

    // 1. Check managerAuth
    const managerAuth = await AsyncStorage.getItem('managerAuth');
    if (managerAuth) {
      const parsed = JSON.parse(managerAuth);

      console.log('📦 [getAuthToken] Manager Auth:', {
        hasToken: !!parsed.token,
        hasManager: !!parsed.manager,
        managerId: parsed.manager?._id,
        tokenType: parsed.token?.substring(0, 20),
      });

      if (parsed.token && parsed.isAuthenticated && parsed.manager) {
        // Check if it's a JWT token
        if (parsed.token.startsWith('eyJ')) {
          console.log('✅ [getAuthToken] Using JWT token');
          return parsed.token;
        }

        // If fallback token, try to generate proper JWT
        if (parsed.token.startsWith('face_auth_')) {
          console.log(
            '🔄 [getAuthToken] Fallback token detected, generating proper JWT...',
          );

          try {
            const response = await axios.post(
              `${BASE_URL}/manager/face-login`,
              {
                managerId: parsed.manager._id,
                name: parsed.manager.name,
                faceVerified: true,
                email:
                  parsed.manager.email ||
                  `${parsed.manager.managerId}@salon.com`,
              },
            );

            const jwtToken = response.data?.data?.token || response.data?.token;

            if (jwtToken && jwtToken.startsWith('eyJ')) {
              // Save the new JWT token
              await AsyncStorage.setItem(
                'managerAuth',
                JSON.stringify({
                  ...parsed,
                  token: jwtToken,
                }),
              );

              console.log('✅ [getAuthToken] JWT token generated and saved');
              return jwtToken;
            }
          } catch (conversionError) {
            console.error(
              '❌ [getAuthToken] JWT generation failed:',
              conversionError.message,
            );
          }
        }

        // Last resort: return whatever token we have
        console.log('⚠️ [getAuthToken] Using existing token');
        return parsed.token;
      }
    }

    // 2. Check adminAuth
    const adminAuth = await AsyncStorage.getItem('adminAuth');
    if (adminAuth) {
      const parsed = JSON.parse(adminAuth);
      if (parsed.token && parsed.isAuthenticated) {
        console.log('✅ [getAuthToken] Using Admin token');
        return parsed.token;
      }
    }

    console.error('❌ [getAuthToken] No valid token found');
    return null;
  } catch (error) {
    console.error('❌ [getAuthToken] Error:', error);
    return null;
  }
};

const getAuthHeaders = async () => {
  const token = await getAuthToken();

  if (!token) {
    throw new Error('Authentication required. Please login again.');
  }

  console.log('🔑 [getAuthHeaders] Token type:', token.substring(0, 15));

  return {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };
};

// Rest of the functions remain same...
export const getAllClients = async () => {
  try {
    const config = await getAuthHeaders();
    console.log('📤 [getAllClients] Fetching clients...');

    const response = await axios.get(`${BASE_URL}/clients/all`, config);
    console.log('✅ [getAllClients] Success');
    return response.data;
  } catch (error) {
    console.error(
      '❌ [getAllClients] Error:',
      error.response?.data || error.message,
    );
    throw error;
  }
};

// Function to find an existing client by phone number or create a new one
export const findOrCreateClient = async clientData => {
  try {
    const config = await getAuthHeaders();
    const response = await axios.post(
      `${BASE_URL}/clients/findOrCreate`,
      clientData,
      config,
    );
    return response.data;
  } catch (error) {
    console.error(
      'Error in findOrCreateClient:',
      error.response?.data || error,
    );
    throw error;
  }
};

// Get client by ID
export const getClientById = async clientId => {
  try {
    const config = await getAuthHeaders();
    const response = await axios.get(`${BASE_URL}/clients/${clientId}`, config);
    return response.data;
  } catch (error) {
    console.error('Error fetching client:', error.response?.data || error);
    throw error;
  }
};

// Update client
export const updateClient = async (clientId, clientData) => {
  try {
    const config = await getAuthHeaders();
    const response = await axios.put(
      `${BASE_URL}/clients/${clientId}`,
      clientData,
      config,
    );
    return response.data;
  } catch (error) {
    console.error('Error updating client:', error.response?.data || error);
    throw error;
  }
};

// Delete client
export const deleteClient = async clientId => {
  try {
    const config = await getAuthHeaders();
    const response = await axios.delete(
      `${BASE_URL}/clients/${clientId}`,
      config,
    );
    return response.data;
  } catch (error) {
    console.error('Error deleting client:', error.response?.data || error);
    throw error;
  }
};

// Search clients
export const searchClients = async searchTerm => {
  try {
    const config = await getAuthHeaders();
    const response = await axios.get(
      `${BASE_URL}/clients/search?q=${encodeURIComponent(searchTerm)}`,
      config,
    );
    return response.data;
  } catch (error) {
    console.error('Error searching clients:', error.response?.data || error);
    throw error;
  }
};

// Create client (used by Cart screens when phone not found)
export const addClient = async clientData => {
  try {
    const config = await getAuthHeaders();
    const response = await axios.post(
      `${BASE_URL}/clients/add`,
      clientData,
      config,
    );
    return response.data;
  } catch (error) {
    console.error('Error creating client:', error.response?.data || error);
    throw error;
  }
};

// Get client statistics
export const getClientStats = async () => {
  try {
    const config = await getAuthHeaders();
    const response = await axios.get(`${BASE_URL}/clients/stats`, config);
    return response.data;
  } catch (error) {
    console.error(
      'Error fetching client stats:',
      error.response?.data || error,
    );
    throw error;
  }
};

// Add bill history to a client
export const addBillToClientHistory = async (clientId, billData) => {
  try {
    const config = await getAuthHeaders();
    const response = await axios.post(
      `${BASE_URL}/clients/add-bill/${clientId}`,
      billData,
      config,
    );
    return response.data;
  } catch (error) {
    console.error('Error adding bill history:', error.response?.data || error);
    throw error;
  }
};
