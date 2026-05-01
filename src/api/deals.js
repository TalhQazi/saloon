// src/api/deals.js
import { BASE_URL } from './config';

// Backend mounts deals at /api/deals
const DEALS_ENDPOINT = `${BASE_URL}/deals`;

// Helper function to create FormData for deals with images
const createDealFormData = dealData => {
  const formData = new FormData();

  // Add basic deal data - map frontend field names to backend field names
  formData.append('name', dealData.dealName || dealData.name || '');
  formData.append('price', dealData.price || '0');
  formData.append('description', dealData.description || '');
  formData.append(
    'isHiddenFromEmployee',
    dealData.isHiddenFromEmployee || false,
  );

  // Handle deal image - map frontend field names to backend field names
  if (dealData.dealImage || dealData.image) {
    const imageUri = dealData.dealImage || dealData.image;

    // Determine file type from URI
    let fileType = 'image/jpeg';
    let fileName = 'deal.jpg';

    if (typeof imageUri === 'string') {
      if (imageUri.includes('.png')) {
        fileType = 'image/png';
        fileName = 'deal.png';
      } else if (imageUri.includes('.gif')) {
        fileType = 'image/gif';
        fileName = 'deal.gif';
      } else if (imageUri.includes('.webp')) {
        fileType = 'image/webp';
        fileName = 'deal.webp';
      }
    }

    formData.append('image', {
      uri: imageUri,
      type: fileType,
      name: fileName,
    });
  }

  console.log('Deal FormData created:', {
    name: dealData.dealName || dealData.name,
    price: dealData.price,
    description: dealData.description,
    hasImage: !!(dealData.dealImage || dealData.image),
  });

  return formData;
};

const dealsApi = {
  /**
   * Fetches all deals from the backend.
   */
  getAllDeals: async token => {
    try {
      // Fixed endpoint: /api/deals/all
      const response = await fetch(`${DEALS_ENDPOINT}/all`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        const errorBody = await response.text();
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorJson = JSON.parse(errorBody);
          errorMessage = errorJson.message || errorMessage;
        } catch (parseError) {
          errorMessage = `${errorMessage}, response: ${errorBody}`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('Get deals response:', data);
      return data;
    } catch (error) {
      console.error('Error fetching deals:', error);
      throw error;
    }
  },

  /**
   * Change deal status (show/hide) for employee visibility
   */
  changeStatus: async (id, status, token) => {
    try {
      const response = await fetch(`${DEALS_ENDPOINT}/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorJson = JSON.parse(errorBody);
          errorMessage = errorJson.message || errorMessage;
        } catch (parseError) {
          errorMessage = `${errorMessage}, response: ${errorBody}`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error changing deal status:', error);
      throw error;
    }
  },

  /**
   * Adds a new deal to the backend.
   */
  addDeal: async (dealData, token) => {
    try {
      const formData = createDealFormData(dealData);

      console.log('Adding deal with data:', {
        name: dealData.dealName || dealData.name,
        price: dealData.price,
        description: dealData.description,
        hasImage: !!(dealData.dealImage || dealData.image),
      });

      // Fixed endpoint: /api/deals/add
      const response = await fetch(`${DEALS_ENDPOINT}/add`, {
        method: 'POST',
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
          // Don't set Content-Type for FormData
        },
        body: formData,
      });

      console.log('Add deal response status:', response.status);
      console.log('Add deal response headers:', response.headers);

      if (!response.ok) {
        const errorBody = await response.text();
        console.log('Add deal error body:', errorBody);
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorJson = JSON.parse(errorBody);
          errorMessage = errorJson.message || errorMessage;
        } catch (parseError) {
          errorMessage = `${errorMessage}, response: ${errorBody}`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('Add deal success:', data);
      return data;
    } catch (error) {
      console.error('Error adding deal:', error);
      throw error;
    }
  },

  /**
   * Edits an existing deal in the backend.
   */
  editDeal: async (id, dealData, token) => {
    try {
      const formData = createDealFormData(dealData);

      console.log('Editing deal with ID:', id);
      console.log('Edit deal data:', {
        name: dealData.dealName || dealData.name,
        price: dealData.price,
        description: dealData.description,
        hasImage: !!(dealData.dealImage || dealData.image),
      });

      // Fixed endpoint: /api/deals/:id
      const response = await fetch(`${DEALS_ENDPOINT}/${id}`, {
        method: 'PUT',
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
          // Don't set Content-Type for FormData
        },
        body: formData,
      });

      console.log('Edit deal response status:', response.status);

      if (!response.ok) {
        const errorBody = await response.text();
        console.log('Edit deal error body:', errorBody);
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorJson = JSON.parse(errorBody);
          errorMessage = errorJson.message || errorMessage;
        } catch (parseError) {
          errorMessage = `${errorMessage}, response: ${errorBody}`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('Edit deal success:', data);
      return data;
    } catch (error) {
      console.error('Error editing deal:', error);
      throw error;
    }
  },

  /**
   * Deletes a deal from the backend.
   */
  deleteDeal: async (id, token) => {
    try {
      console.log('Deleting deal with ID:', id);

      // Fixed endpoint: /api/deals/:id
      const response = await fetch(`${DEALS_ENDPOINT}/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      console.log('Delete deal response status:', response.status);

      if (!response.ok) {
        const errorBody = await response.text();
        console.log('Delete deal error body:', errorBody);
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorJson = JSON.parse(errorBody);
          errorMessage = errorJson.message || errorMessage;
        } catch (parseError) {
          errorMessage = `${errorMessage}, response: ${errorBody}`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('Delete deal success:', data);
      return data;
    } catch (error) {
      console.error('Error deleting deal:', error);
      throw error;
    }
  },
};

// Named exports for consistency with other API files
export const getDeals = dealsApi.getAllDeals;
export const addDeal = dealsApi.addDeal;
export const updateDeal = dealsApi.editDeal;
export const deleteDeal = dealsApi.deleteDeal;

export default dealsApi;
