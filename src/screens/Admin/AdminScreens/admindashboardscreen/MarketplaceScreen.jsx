// src/screens/admin/MarketplaceScreen.jsx

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Image,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import NotificationBell from '../../../../components/NotificationBell';
// Import 'useRoute' to access navigation parameters
import {
  useNavigation,
  useRoute,
  useFocusEffect,
} from '@react-navigation/native';
import AddProductModal from './modals/AddProductModal';
import ProductOptionsModal from './modals/ProductOptionsModal';
import ProductDetailModal from './modals/ProductDetailModal';
import ConfirmationModal from './modals/ConfirmationModal';
import { getAdminToken } from '../../../../utils/authUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';
import {
  ADMIN_CART_UPDATED_EVENT,
  getAdminCartItems,
} from '../../../../utils/adminCart';
// Import API functions
import {
  getProducts,
  addProduct,
  updateProduct,
  deleteProduct,
  changeProductStatus,
} from '../../../../api';

const { width, height } = Dimensions.get('window');

const loadAdminCartCount = async setCartCount => {
  try {
    const items = await getAdminCartItems();
    setCartCount(Array.isArray(items) ? items.length : 0);
  } catch (err) {
    console.error('[MarketplaceScreen] Failed to load admin cart count:', err);
    setCartCount(0);
  }
};

// Import your local images (paths remain same, as requested)
import haircutImage from '../../../../assets/images/makeup.jpeg';
import userProfileImagePlaceholder from '../../../../assets/images/logo.png';

// Helper function to truncate username to 6 words maximum
const truncateUsername = username => {
  if (!username) return 'Guest';
  const words = username.split(' ');
  if (words.length <= 6) return username;
  return words.slice(0, 6).join(' ') + '...';
};

// Retrieve authenticated admin from AsyncStorage (consistent header)
const getAuthenticatedAdmin = async () => {
  try {
    const data = await AsyncStorage.getItem('adminAuth');
    if (data) {
      const parsed = JSON.parse(data);
      if (parsed.token && parsed.isAuthenticated) {
        return {
          token: parsed.token,
          name: parsed.admin?.name || 'Guest',
          profilePicture: parsed.admin?.profilePicture || parsed.admin?.livePicture,
        };
      }
    }
    return null;
  } catch (error) {
    console.error('Failed to get authenticated admin:', error);
    return null;
  }
};

// Helper function to get image source (local asset or URI)
const getDisplayImageSource = image => {
  if (
    typeof image === 'string' &&
    (image.startsWith('http://') ||
      image.startsWith('https://') ||
      image.startsWith('file://') ||
      image.startsWith('content://') ||
      image.startsWith('data:image'))
  ) {
    return { uri: image };
  }
  if (typeof image === 'number') {
    return image;
  }
  return null;
};

// **NAI FUNCTION SHAMIL KIYA GAYA HAI**
// Helper function to determine if a product is hidden
const isProductHidden = product => {
  return product && product.status && product.status.toLowerCase() === 'hide';
};

// ProductCard component to display individual product
const ProductCard = ({ product, onOptionsPress, onPress }) => {
  let imageSource = null;
  if (product?.image) {
    imageSource = getDisplayImageSource(product.image);
  }
  if (!imageSource) {
    imageSource = haircutImage; // Fallback to a default image
  }

  return (
    <TouchableOpacity
      style={styles.productCard}
      onPress={() => onPress(product)}
    >
      <Image
        source={imageSource}
        style={styles.productImage}
        resizeMode="cover"
      />
      <Text style={styles.productName}>{product.name}</Text>
      {/* Yahan pe humne ProductCard component mein 'isProductHidden' helper function ka istemaal kiya hai. */}
      {isProductHidden(product) && (
        <View style={styles.hiddenBadge}>
          <Text style={styles.hiddenBadgeText}>Hidden</Text>
        </View>
      )}
      <TouchableOpacity
        style={styles.cardOptionsButton}
        onPress={event => onOptionsPress(event, product)}
      >
        <Ionicons name="ellipsis-vertical" size={width * 0.022} color="#fff" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const MarketplaceScreen = () => {
  const navigation = useNavigation();
  // const route = useRoute(); // 👈 Was used to read params
  // 1. Route-based admin (replaced by storage-based)
  // const { authenticatedAdmin } = route.params || {};

  // State for products data and loading status
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cartCount, setCartCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      loadAdminCartCount(setCartCount);
    }, []),
  );

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener(
      ADMIN_CART_UPDATED_EVENT,
      payload => {
        const nextCount = payload?.count;
        if (typeof nextCount === 'number') {
          setCartCount(nextCount);
        } else {
          loadAdminCartCount(setCartCount);
        }
      },
    );

    return () => {
      subscription?.remove?.();
    };
  }, []);
  const [authenticatedAdmin, setAuthenticatedAdmin] = useState(null);

  const [addEditModalVisible, setAddEditModalVisible] = useState(false);
  const [productToEdit, setProductToEdit] = useState(null);

  const [optionsModalVisible, setOptionsModalVisible] = useState(false);
  const [optionsModalPosition, setOptionsModalPosition] = useState({
    top: 0,
    left: 0,
  });
  const [selectedProduct, setSelectedProduct] = useState(null);

  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);

  // Load admin for header
  useEffect(() => {
    const loadAdmin = async () => {
      const admin = await getAuthenticatedAdmin();
      if (admin) {
        setAuthenticatedAdmin(admin);
      } else {
        Alert.alert('Authentication Error', 'Please login again.', [
          { text: 'OK', onPress: () => navigation.replace('AdminLogin') },
        ]);
      }
    };
    loadAdmin();
  }, []);

  // Function to fetch all products from the backend API
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const token = await getAdminToken();
      if (!token) {
        setError('Authentication token not found. Please login again.');
        setLoading(false);
        Alert.alert('Authentication Error', 'Please login again.', [
          {
            text: 'OK',
            onPress: () => navigation.replace('AdminLogin'),
          },
        ]);
        return;
      }
      const data = await getProducts(token);
      // **TABDEELI YAHAN HAI**
      // Hum har product object mein isHiddenFromEmployee property add kar rahe hain.
      const updatedProducts = data.map(product => ({
        ...product,
        isHiddenFromEmployee: isProductHidden(product),
      }));

      setProducts(updatedProducts); // Ab hum updated array ko state mein set kar rahe hain.
      setError(null);
    } catch (e) {
      console.error('Error fetching products:', e);
      setError(
        e.message ||
          'Failed to load products. Please ensure your backend server is running and the IP address is correct.',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleSaveProduct = async productData => {
    try {
      const token = await getAdminToken();
      if (!token) {
        Alert.alert(
          'Error',
          'Authentication token not found. Please login again.',
        );
        return;
      }

      if (productToEdit) {
        await updateProduct(productToEdit.id, productData, token);
        Alert.alert('Success', 'Product updated successfully!');
      } else {
        await addProduct(productData, token);
        Alert.alert('Success', 'Product added successfully!');
      }
      fetchProducts();
    } catch (e) {
      console.error('Error saving product:', e);
      Alert.alert('Error', e.message || 'Failed to save the product.');
    }
    setAddEditModalVisible(false);
    setProductToEdit(null);
  };

  const handleCardOptionsPress = (event, product) => {
    const buttonX = event.nativeEvent.pageX;
    const buttonY = event.nativeEvent.pageY;

    const modalWidth = width * 0.15;
    const modalHeight = height * 0.2;

    // Always prefer opening the options panel to the LEFT of the icon
    let left = buttonX - modalWidth - 10;
    // Vertically, center the modal around the tap position
    let top = buttonY - modalHeight / 2;

    // Keep the modal fully inside the screen horizontally
    if (left < 10) left = 10;
    if (left + modalWidth > width - 10) {
      left = width - modalWidth - 10;
    }

    // And vertically
    if (top < 10) top = 10;
    if (top + modalHeight > height - 10) {
      top = height - modalHeight - 10;
    }

    setOptionsModalPosition({ top, left });
    setSelectedProduct(product);
    setOptionsModalVisible(true);
  };

  const handleOptionSelect = option => {
    setOptionsModalVisible(false);
    if (!selectedProduct) return;
    switch (option) {
      case 'view':
        setDetailModalVisible(true);
        break;
      case 'edit':
        const mappedProductData = {
          id: selectedProduct._id,
          productName: selectedProduct.name,
          productImage: selectedProduct.image,
          productDetails: selectedProduct.subProducts
            ? selectedProduct.subProducts.map(sub => ({
                productDetailName: sub.name,
                price: sub.price,
                time: sub.time,
                description: sub.description,
                productDetailImage: sub.image,
              }))
            : [],
          isHiddenFromEmployee: selectedProduct.isHiddenFromEmployee || false,
        };
        setProductToEdit(mappedProductData);
        setAddEditModalVisible(true);
        break;
      case 'delete':
        setProductToDelete(selectedProduct);
        setConfirmModalVisible(true);
        break;
      case 'hide':
        (async () => {
          try {
            const token = await getAdminToken();
            if (!token) {
              Alert.alert(
                'Error',
                'Auth token not found. Please login again as admin.',
              );
              return;
            }
            const next =
              (selectedProduct?.status || '').toLowerCase() === 'hide'
                ? 'show'
                : 'hide';
            await changeProductStatus(selectedProduct._id, next, token);
            Alert.alert('Success', `Product marked as ${next}.`);
            fetchProducts();
          } catch (e) {
            console.error('Error changing product status:', e);
            Alert.alert(
              'Error',
              e.message || 'Failed to change product status.',
            );
          }
        })();
        break;
      default:
        break;
    }
  };

  const confirmDeleteProduct = async () => {
    if (!productToDelete) return;
    try {
      const token = await getAdminToken();
      if (!token) {
        Alert.alert(
          'Error',
          'Auth token not found. Please login again as admin.',
        );
        return;
      }
      await deleteProduct(productToDelete._id, token);
      Alert.alert('Success', 'Product deleted successfully!');
      fetchProducts();
    } catch (e) {
      console.error('Error deleting product:', e);
      Alert.alert('Error', e.message || 'Failed to delete the product.');
    }
    setProductToDelete(null);
    setConfirmModalVisible(false);
  };

  const handleProductCardPress = product => {
    navigation.navigate('SubMarketplace', { product: product });
  };

  // 2. Build username and profile picture from stored admin
  const userName = authenticatedAdmin?.name || 'Guest';
  const userProfileImage = authenticatedAdmin?.profilePicture;
  const profileImageSource = userProfileImage
    ? { uri: userProfileImage }
    : userProfileImagePlaceholder;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#A99226" />
        <Text style={styles.loadingText}>Loading products...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Error: {error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchProducts}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.mainContent}>
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.headerCenter}>
            <View style={styles.userInfo}>
              <Text style={styles.greeting}>Hello 👋</Text>
              {/* 3. Use the dynamic userName from route params */}
              <Text style={styles.userName}>{truncateUsername(userName)}</Text>
            </View>
            {/* <View style={styles.searchBarContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search anything"
                placeholderTextColor="#A9A9A9"
              />
              <Ionicons
                name="search"
                size={width * 0.027}
                color="#A9A9A9"
                style={styles.searchIcon}
              />
            </View> */}
          </View>
          <View style={styles.headerRight}>
            {/* Existing headerRight content including cart button */}
            <TouchableOpacity
              style={styles.cartButton}
              onPress={() => navigation.navigate('AdminCartScreen')}
            >
              <View style={styles.cartIconWrapper}>
                <Ionicons
                  name="cart-outline"
                  size={width * 0.039}
                  color="#fff"
                />
                {cartCount > 0 && (
                  <View style={styles.cartBadge}>
                    <Text style={styles.cartBadgeText} numberOfLines={1}>
                      {cartCount}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
            <NotificationBell containerStyle={styles.notificationButton} />
            {/* 4. Use the dynamic profile image source */}
            <Image
              source={profileImageSource}
              style={styles.profileImage}
              resizeMode="cover"
            />
          </View>
        </View>

        {/* Products Title and Add New Products Button */}
        <View style={styles.productsHeader}>
          <Text style={styles.productsTitle}>Products</Text>
          <TouchableOpacity
            style={styles.addNewProductsButton}
            onPress={() => {
              setProductToEdit(null);
              setAddEditModalVisible(true);
            }}
          >
            <Text style={styles.addNewProductsButtonText}>
              Add New Products
            </Text>
          </TouchableOpacity>
        </View>

        {/* Products Grid */}
        <FlatList
          data={products}
          keyExtractor={item => (item._id || item.id).toString()}
          numColumns={3}
          columnWrapperStyle={styles.productsRow}
          contentContainerStyle={styles.productsGridContainer}
          renderItem={({ item }) => (
            <View style={styles.productCol}>
              <ProductCard
                product={item}
                onOptionsPress={handleCardOptionsPress}
                onPress={handleProductCardPress}
              />
            </View>
          )}
          ListEmptyComponent={() => (
            <Text style={styles.loadingText}>No products available.</Text>
          )}
        />
      </View>

      {/* Modals */}
      <AddProductModal
        visible={addEditModalVisible}
        onClose={() => setAddEditModalVisible(false)}
        onSave={handleSaveProduct}
        initialProductData={productToEdit}
      />
      <ProductOptionsModal
        visible={optionsModalVisible}
        onClose={() => setOptionsModalVisible(false)}
        onSelectOption={handleOptionSelect}
        position={optionsModalPosition}
      />
      <ProductDetailModal
        visible={detailModalVisible}
        onClose={() => setDetailModalVisible(false)}
        product={selectedProduct}
      />
      <ConfirmationModal
        visible={confirmModalVisible}
        onClose={() => setConfirmModalVisible(false)}
        onConfirm={confirmDeleteProduct}
        message={`Are you sure you want to delete "${productToDelete?.name}"? This action cannot be undone.`}
      />
    </View>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e1f20ff',
    paddingTop: height * 0.03,
    paddingHorizontal: width * 0.03,
  },
  mainContent: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1e1f20ff',
  },
  loadingText: {
    color: '#fff',
    fontSize: width * 0.03,
    marginTop: height * 0.02,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: width * 0.025,
    textAlign: 'center',
    marginBottom: height * 0.02,
  },
  retryButton: {
    backgroundColor: '#A99226',
    paddingVertical: height * 0.012,
    paddingHorizontal: width * 0.035,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: width * 0.018,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: height * 0.02,
    borderBottomWidth: 1,
    borderBottomColor: '#3C3C3C',
    marginBottom: height * 0.02,
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginLeft: width * 0.0001,
    marginRight: width * 0.0001,
  },
  userInfo: {
    marginRight: width * 0.16,
  },
  greeting: {
    fontSize: width * 0.019,
    color: '#A9A9A9',
  },
  userName: {
    fontSize: width * 0.03,
    fontWeight: 'bold',
    color: '#fff',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2D32',
    borderRadius: 10,
    paddingHorizontal: width * 0.0003,
    flex: 1,
    height: height * 0.035,
    borderWidth: 1,
    borderColor: '#4A4A4A',
  },
  searchIcon: {
    marginRight: width * 0.01,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: width * 0.021,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: width * 0.01,
  },
  cartButton: {
    backgroundColor: '#2A2D32',
    borderRadius: 8,
    padding: width * 0.000001,
    marginRight: width * 0.016,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartIconWrapper: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadge: {
    position: 'absolute',
    top: -height * 0.008,
    right: -width * 0.01,
    minWidth: width * 0.022,
    height: width * 0.022,
    borderRadius: width * 0.011,
    paddingHorizontal: width * 0.004,
    backgroundColor: '#ff3b30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadgeText: {
    color: '#fff',
    fontSize: width * 0.012,
    fontWeight: '700',
  },
  notificationButton: {
    backgroundColor: '#2A2D32',
    borderRadius: 16,
    padding: width * 0.000001,
    marginRight: width * 0.012,
    width: width * 0.055,
    height: width * 0.055,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImage: {
    width: width * 0.058,
    height: width * 0.058,
    borderRadius: (width * 0.058) / 2,
  },
  productsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: height * 0.03,
    marginHorizontal: width * 0.01,
    borderBottomWidth: 1,
    borderBottomColor: '#3C3C3C',
    paddingBottom: height * 0.03,
  },
  productsTitle: {
    fontSize: width * 0.035,
    fontWeight: 'bold',
    color: '#fff',
  },
  addNewProductsButton: {
    backgroundColor: '#A99226',
    paddingVertical: height * 0.012,
    paddingHorizontal: width * 0.035,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  addNewProductsButtonText: {
    color: '#fff',
    fontSize: width * 0.018,
    fontWeight: '600',
  },
  productsGridContainer: {
    paddingBottom: height * 0.05,
  },
  productsRow: {
    justifyContent: 'flex-start',
    marginBottom: height * 0.025,
  },
  productCol: {
    width: '31.5%',
    marginRight: width * 0.009, // small horizontal gap between cards
  },
  productCard: {
    backgroundColor: '#3C3C3C',
    borderRadius: 3,
    width: '100%',
    minHeight: 250,
    marginBottom: 0,
    overflow: 'hidden',
    paddingBottom: height * 0.01,
    position: 'relative',
  },
  productImage: {
    width: '100%',
    aspectRatio: 122 / 190,
    borderRadius: 4.9,
    marginBottom: height * 0.01,
  },
  productName: {
    color: '#fff',
    fontSize: width * 0.018,
    fontWeight: '500',
    textAlign: 'center',
    paddingHorizontal: width * 0.01,
  },
  cardOptionsButton: {
    position: 'absolute',
    top: height * 0.002,
    right: width * 0.002,
    backgroundColor: '#424040ff',
    borderRadius: (width * 0.02 + width * 0.01) / 2,
    padding: width * 0.0015,
  },
  hiddenBadge: {
    position: 'absolute',
    top: 5,
    left: 5,
    backgroundColor: 'rgba(255, 0, 0, 0.7)',
    borderRadius: 3,
    paddingHorizontal: 5,
    paddingVertical: 2,
    zIndex: 1,
  },
  hiddenBadgeText: {
    color: '#fff',
    fontSize: width * 0.015,
    fontWeight: 'bold',
  },
});

export default MarketplaceScreen;
