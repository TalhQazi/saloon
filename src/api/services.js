// src/api/services.js
import axios from 'axios';
import { BASE_URL } from './config';
import { createAuthenticatedInstance } from '../utils/authUtils';

// Base URL for service-related endpoints
const SERVICE_API_URL = `${BASE_URL}/services`;

// Helper function to handle API errors
const handleApiError = (error, operation = 'API call') => {
  console.error(
    `Error during ${operation}:`,
    error.response?.data || error.message,
  );
  throw (
    error.response?.data?.message ||
    error.message ||
    `Failed to perform ${operation}.`
  );
};

// Helper function to process service data for backend compatibility
const processServiceData = data => {
  const processed = { ...data };

  // Ensure title field is present (backend expects 'title')
  if (processed.serviceName && !processed.title) {
    processed.title = processed.serviceName;
  }
  if (processed.name && !processed.title) {
    processed.title = processed.name;
  }

  // Map user-selected service image to the expected backend field
  if (processed.serviceImage && !processed.image) {
    processed.image = processed.serviceImage;
  }

  // Process sub-services to match backend expectations
  if (Array.isArray(processed.subServices)) {
    const processedSubServices = processed.subServices.map(sub => ({
      name: sub.name || sub.subServiceName, // Backend expects 'name'
      price: parseFloat(sub.price) || 0, // Convert to number
      time: sub.time,
      description: sub.description,
      image: sub.image || sub.subServiceImage, // Backend expects 'image'
    }));
    processed.subServices = JSON.stringify(processedSubServices);
  }

  console.log('Processed service data:', processed);
  return processed;
};

// Helper: decide if we should upload image as file (FormData)
const shouldUploadFile = image => {
  return (
    typeof image === 'string' &&
    (image.startsWith('file://') ||
      image.startsWith('content://') ||
      image.startsWith('data:image'))
  );
};

// Helper: build form data payload for service create/update
const buildServiceFormData = data => {
  // Don't stringify subServices yet so we can attach images as files
  const processed = { ...data };

  // Normalize title and image mapping similar to processServiceData
  if (processed.serviceName && !processed.title) {
    processed.title = processed.serviceName;
  }
  if (processed.name && !processed.title) {
    processed.title = processed.name;
  }
  if (processed.serviceImage && !processed.image) {
    processed.image = processed.serviceImage;
  }

  const form = new FormData();
  if (processed.title) form.append('title', processed.title);

  // Append main service image
  if (processed.image && shouldUploadFile(processed.image)) {
    const uri = processed.image;
    const isBase64 = typeof uri === 'string' && uri.startsWith('data:image');
    const name = `service_${Date.now()}.jpg`;
    const type = 'image/jpeg';
    form.append('image', isBase64 ? uri : { uri, name, type });
  } else if (processed.image) {
    form.append('image', processed.image);
  }

  // Handle sub-services: send JSON without image blobs, and attach images separately
  const subServicesRaw = Array.isArray(processed.subServices)
    ? processed.subServices
    : Array.isArray(data?.subServices)
    ? data.subServices
    : [];

  if (subServicesRaw.length > 0) {
    const subServicesForJson = subServicesRaw.map(sub => ({
      name: sub.name || sub.subServiceName || '',
      price: parseFloat(sub.price) || 0,
      time: sub.time || '',
      description: sub.description || '',
    }));
    form.append('subServices', JSON.stringify(subServicesForJson));

    subServicesRaw.forEach((sub, index) => {
      const subImg = sub.image || sub.subServiceImage;
      if (typeof subImg === 'string') {
        // Attach local file/content/base64 as file, URLs as plain field
        if (shouldUploadFile(subImg)) {
          let fileType = 'image/jpeg';
          let fileName = `subServiceImage${index}.jpg`;
          if (subImg.includes('.png')) {
            fileType = 'image/png';
            fileName = `subServiceImage${index}.png`;
          } else if (subImg.includes('.gif')) {
            fileType = 'image/gif';
            fileName = `subServiceImage${index}.gif`;
          } else if (subImg.includes('.webp')) {
            fileType = 'image/webp';
            fileName = `subServiceImage${index}.webp`;
          }
          const file = subImg.startsWith('data:image')
            ? subImg
            : { uri: subImg, type: fileType, name: fileName };
          form.append(`subServiceImage${index}`, file);
        } else if (
          subImg.startsWith('http://') ||
          subImg.startsWith('https://')
        ) {
          // Backend may accept URL for image too
          form.append(`subServiceImage${index}`, subImg);
        }
      }
    });
  }

  if (processed.isHiddenFromEmployee != null) {
    form.append('isHiddenFromEmployee', String(processed.isHiddenFromEmployee));
  }

  return form;
};

/**
 * Add new service
 */
export const addService = async (serviceData, tokenOverride) => {
  try {
    console.log('addService called with:', serviceData);

    const config = tokenOverride
      ? {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${tokenOverride}`,
          },
        }
      : await createAuthenticatedInstance();

    let payload = serviceData;

    // Decide payload type based on image source
    const imageCandidate = serviceData?.image || serviceData?.serviceImage;
    if (serviceData instanceof FormData) {
      payload = serviceData;
      config.headers['Content-Type'] = 'multipart/form-data';
      config.transformRequest = formData => formData;
    } else if (shouldUploadFile(imageCandidate)) {
      payload = buildServiceFormData(serviceData);
      config.headers['Content-Type'] = 'multipart/form-data';
      config.transformRequest = formData => formData;
    } else {
      payload = processServiceData(serviceData);
    }

    // Fixed endpoint: /api/services/admin/add
    const url = `${SERVICE_API_URL}/admin/add`;

    const response = await axios.post(url, payload, config);
    return response.data;
  } catch (error) {
    handleApiError(error, 'add service');
  }
};

/**
 * Get all services
 */
export const getServices = async queryParams => {
  try {
    // Fixed endpoint: /api/services (no token required for public access)
    // Accept optional query params e.g., { type: 'show' }
    const config = queryParams ? { params: queryParams } : {};
    const response = await axios.get(SERVICE_API_URL, config);
    return response.data;
  } catch (error) {
    handleApiError(error, 'get all services');
  }
};

/**
 * Get service by ID
 */
export const getServiceById = async id => {
  try {
    const response = await axios.get(`${SERVICE_API_URL}/${id}`);
    return response.data;
  } catch (error) {
    handleApiError(error, `get service by ID ${id}`);
  }
};

/**
 * Update service
 */
export const updateService = async (id, updatedData, tokenOverride) => {
  try {
    console.log('updateService called with:', { id, updatedData });

    const config = tokenOverride
      ? {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${tokenOverride}`,
          },
        }
      : await createAuthenticatedInstance();

    let payload = updatedData;

    const imageCandidate = updatedData?.image || updatedData?.serviceImage;
    if (updatedData instanceof FormData) {
      payload = updatedData;
      config.headers['Content-Type'] = 'multipart/form-data';
      config.transformRequest = formData => formData;
    } else if (shouldUploadFile(imageCandidate)) {
      payload = buildServiceFormData(updatedData);
      config.headers['Content-Type'] = 'multipart/form-data';
      config.transformRequest = formData => formData;
    } else {
      payload = processServiceData(updatedData);
    }

    // Fixed endpoint: /api/services/admin/:id
    const response = await axios.put(
      `${SERVICE_API_URL}/admin/${id}`,
      payload,
      config,
    );
    return response.data;
  } catch (error) {
    handleApiError(error, `update service ${id}`);
  }
};

/**
 * Change service status (show/hide)
 */
export const changeServiceStatus = async (id, status, tokenOverride) => {
  try {
    const config = tokenOverride
      ? {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${tokenOverride}`,
          },
        }
      : await createAuthenticatedInstance();

    const response = await axios.put(
      `${SERVICE_API_URL}/admin/${id}/status`,
      { status },
      config,
    );
    return response.data;
  } catch (error) {
    handleApiError(error, `change service status ${id} -> ${status}`);
  }
};

/**
 * Delete service
 */
export const deleteService = async (id, tokenOverride) => {
  try {
    const config = tokenOverride
      ? {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${tokenOverride}`,
          },
        }
      : await createAuthenticatedInstance();
    // Fixed endpoint: /api/services/admin/:id
    const response = await axios.delete(
      `${SERVICE_API_URL}/admin/${id}`,
      config,
    );
    return response.data;
  } catch (error) {
    handleApiError(error, `delete service ${id}`);
  }
};
