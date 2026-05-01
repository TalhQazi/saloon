import { BASE_URL } from './config'; // default export exists
import axios from 'axios';

// Define the base endpoint for products mounted at /api/products
const PRODUCTS_ENDPOINT = `${BASE_URL}/products`;

// Helper to decide if a string image URI should be uploaded as a file
const shouldUploadFile = image => {
  return (
    typeof image === 'string' &&
    (image.startsWith('file://') ||
      image.startsWith('content://') ||
      image.startsWith('data:image'))
  );
};

// Helper function to create FormData for product uploads
const createProductFormData = productData => {
  const formData = new FormData(); // Add main product data

  formData.append('name', productData.productName || productData.name || ''); // Add main product image

  if (productData.productImage) {
    // Handle both URI strings and local asset numbers
    let imageUri = productData.productImage; // If it's a local asset (number), we need to handle it differently

    if (typeof productData.productImage === 'number') {
      // For local assets, we'll skip the image upload for now
      // You might want to convert local assets to base64 or handle them differently
      console.log('Local asset detected, skipping image upload');
    } else if (typeof productData.productImage === 'string') {
      // If this is already a remote URL or a backend relative path (e.g. "/uploads/.."),
      // do not re-upload it as a file; the backend can keep the existing image reference.
      if (
        imageUri.startsWith('http://') ||
        imageUri.startsWith('https://') ||
        imageUri.startsWith('/')
      ) {
        console.log(
          'Remote or relative product image path detected, skipping file upload',
        );
      } else {
        // For local URI strings (from image picker), create proper file object

        // Determine file type from URI
        let fileType = 'image/jpeg'; // default
        let fileName = 'product_image.jpg'; // default

        if (imageUri.includes('.png')) {
          fileType = 'image/png';
          fileName = 'product_image.png';
        } else if (imageUri.includes('.gif')) {
          fileType = 'image/gif';
          fileName = 'product_image.gif';
        } else if (imageUri.includes('.webp')) {
          fileType = 'image/webp';
          fileName = 'product_image.webp';
        }

        const imageFile = {
          uri: imageUri,
          type: fileType,
          name: fileName,
        }; // Log the image file being created

        console.log('Creating image file for upload:', imageFile);

        formData.append('image', imageFile);
      }
    }
  } // Add sub-products data

  const subProducts =
    productData.productDetails || productData.subProducts || [];

  // Always send subProducts to backend, even when empty, so that
  // removing the last sub-product actually clears it in the database.
  formData.append(
    'subProducts',
    JSON.stringify(
      subProducts.map((sub, index) => ({
        name: sub.productDetailName || sub.name || '',
        price: parseFloat(sub.price) || 0,
        time: sub.time || '',
        description: sub.description || '', // Include image hint in JSON for backends that read this field
        image: sub.productDetailImage || sub.image || '',
      })),
    ),
  );

  // Only append image files when there actually are subProducts
  if (subProducts.length > 0) {
    subProducts.forEach((sub, index) => {
      if (sub.productDetailImage || sub.image) {
        let subImageUri = sub.productDetailImage || sub.image; // Only handle string URIs for sub-product images

        if (typeof subImageUri === 'string') {
          // If it is already a remote URL or a backend relative path (e.g. "/uploads/.."),
          // skip uploading a new file to minimize payload size and keep the existing image.
          if (
            subImageUri.startsWith('http://') ||
            subImageUri.startsWith('https://') ||
            subImageUri.startsWith('/')
          ) {
            console.log(
              `Remote or relative sub-product image path detected for index ${index}, skipping file upload`,
            );
          } else if (shouldUploadFile(subImageUri)) {
            // Determine file type from URI
            let fileType = 'image/jpeg'; // default
            let fileName = `subProductImage${index}.jpg`; // default

            if (subImageUri.includes('.png')) {
              fileType = 'image/png';
              fileName = `subProductImage${index}.png`;
            } else if (subImageUri.includes('.gif')) {
              fileType = 'image/gif';
              fileName = `subProductImage${index}.gif`;
            } else if (subImageUri.includes('.webp')) {
              fileType = 'image/webp';
              fileName = `subProductImage${index}.webp`;
            }

            const subImageFile = {
              uri: subImageUri,
              type: fileType,
              name: fileName,
            };

            // Backend expects sub-product image fields named "subProductImage{index}"
            formData.append(`subProductImage${index}`, subImageFile);
          }
        }
      }
    });
  }

  // New: Add the 'isHiddenFromEmployee' status to the form data
  if (productData.isHiddenFromEmployee != null) {
    formData.append(
      'isHiddenFromEmployee',
      String(productData.isHiddenFromEmployee),
    );
  } // Log the FormData contents for debugging

  console.log('FormData created with:', {
    name: productData.productName || productData.name,
    hasImage: !!productData.productImage,
    subProductsCount: subProducts.length,
  });

  return formData;
};

const productsApi = {
  /**
   * Fetches all products from the backend.
   * @returns {Promise<Array>} A promise that resolves to an array of product objects.
   * @throws {Error} If the network request fails or the server responds with an error.
   */
  getAllProducts: async (token, queryParams) => {
    try {
      let url = `${PRODUCTS_ENDPOINT}/all`;
      if (queryParams && typeof queryParams === 'object') {
        const usp = new URLSearchParams();
        Object.entries(queryParams).forEach(([k, v]) => {
          if (v != null && v !== '') usp.append(k, v);
        });
        const qs = usp.toString();
        if (qs) url += `?${qs}`;
      }
      console.log('🔍 Fetching products from:', url);
      console.log('🔍 Token provided:', !!token); // Fixed endpoint: /api/products/all

      const response = await fetch(url, {
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
      return data;
    } catch (error) {
      console.error('Error fetching products:', error);
      throw error;
    }
  },
  

  getProductById: async (id, token) => {
    try {
      const url = `${PRODUCTS_ENDPOINT}/${id}`;
      console.log('🔍 Fetching product by id from:', url);

      const response = await axios.get(url, {
        headers: token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : {},
      });

      return response.data;
    } catch (error) {
      console.error(`Error fetching product by ID ${id}:`, error);
      throw error;
    }
  },
  

  changeStatus: async (id, status, token) => {
    try {
      // Products router uses "/:id/status" (no /admin prefix)
      const response = await fetch(`${PRODUCTS_ENDPOINT}/${id}/status`, {
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
      console.error('Error changing product status:', error);
      throw error;
    }
  }
  /**
   * Adds a new product to the backend.
   * @param {Object} productData - The data for the new product with images.
   * @param {string} token - Authentication token.
   * @returns {Promise<Object>} A promise that resolves to the newly created product object.
   * @throws {Error} If the network request fails or the server responds with an error.
   */,

  addProduct: async (productData, token) => {
    try {
      console.log('Adding product with data:', {
        name: productData.productName || productData.name,
        hasImage: !!productData.productImage,
        imageType: typeof productData.productImage,
        subProductsCount: (
          productData.productDetails ||
          productData.subProducts ||
          []
        ).length,
      });

      const formData = createProductFormData(productData); // Fixed endpoint: /api/products/add

      const url = `${PRODUCTS_ENDPOINT}/add`;
      console.log('addProduct URL:', url);

      const response = await axios.post(url, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('Product added successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error adding product:', error.response?.data || error.message);
      throw new Error(
        error.response?.data?.message || error.message || 'Failed to add product',
      );
    }
  }
  /**
   * Edits an existing product in the backend.
   * @param {string} id - The ID of the product to edit.
   * @param {Object} productData - The updated data for the product with images.
   * @param {string} token - Authentication token.
   * @returns {Promise<Object>} A promise that resolves to the updated product object.
   * @throws {Error} If the network request fails or the server responds with an error.
   */,

  editProduct: async (id, productData, token) => {
    try {
      const url = `${PRODUCTS_ENDPOINT}/${id}`;
      console.log('editProduct URL:', url);

      // Decide whether we actually need multipart (new local images)
      const subProducts =
        productData.productDetails || productData.subProducts || [];

      const hasLocalMainImage = shouldUploadFile(productData.productImage);
      const hasLocalSubImage = subProducts.some(sub =>
        shouldUploadFile(sub?.productDetailImage || sub?.image),
      );

      const needsMultipart = hasLocalMainImage || hasLocalSubImage;

      if (needsMultipart) {
        // Use FormData when there are new local images to upload
        const formData = createProductFormData(productData);

        const response = await axios.put(url, formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        });

        return response.data;
      }

      // Otherwise send a simple JSON payload (lighter and less error-prone)
      const response = await axios.put(url, productData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      return response.data;
    } catch (error) {
      console.error(
        `Error editing product with ID ${id}:`,
        error.response?.data || error.message,
      );
      throw new Error(
        error.response?.data?.message || error.message || 'Failed to edit product',
      );
    }
  }
  /**
   * Deletes a product from the backend.
   * @param {string} id - The ID of the product to delete.
   * @param {string} token - Authentication token.
   * @returns {Promise<Object>} A promise that resolves to a success message or confirmation.
   * @throws {Error} If the network request fails or the server responds with an error.
   */,

  deleteProduct: async (id, token) => {
    try {
      // Fixed endpoint: /api/products/:id
      const response = await fetch(`${PRODUCTS_ENDPOINT}/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
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

      const text = await response.text();
      return text
        ? JSON.parse(text)
        : { message: 'Product deleted successfully' };
    } catch (error) {
      console.error(`Error deleting product with ID ${id}:`, error);
      throw error;
    }
  },
};

// Named exports for individual functions
export const getProducts = productsApi.getAllProducts;
export const addProduct = productsApi.addProduct;
export const updateProduct = productsApi.editProduct;
export const deleteProduct = productsApi.deleteProduct;
export const changeProductStatus = productsApi.changeStatus;

export default productsApi;
