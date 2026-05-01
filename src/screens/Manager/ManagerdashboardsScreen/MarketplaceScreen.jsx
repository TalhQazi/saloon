// manager marketplace screen
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import {
  MANAGER_CART_UPDATED_EVENT,
  getManagerCartItems,
} from '../../../utils/managerCart';

// Import API functions
import { getProducts } from '../../../api';

const { width, height } = Dimensions.get('window');

// Import your local images
import haircutImage from '../../../assets/images/makeup.jpeg';
const userProfileImagePlaceholder = require('../../../assets/images/logo.png');

// Helper function to truncate username
const truncateUsername = username => {
  if (!username) return 'Guest';
  const words = username.split(' ');
  if (words.length <= 6) return username;
  return words.slice(0, 6).join(' ') + '...';
};

// Helper function to get image source (local asset or URI)
const getDisplayImageSource = image => {
  if (typeof image === 'string' && image.startsWith('http')) {
    return { uri: image };
  } else if (typeof image === 'number') {
    return image;
  }
  return haircutImage;
};

const loadManagerCartCount = async setCartCount => {
  try {
    const items = await getManagerCartItems();
    setCartCount(Array.isArray(items) ? items.length : 0);
  } catch (err) {
    console.error('[ManagerMarketplaceScreen] Failed to load manager cart count:', err);
    setCartCount(0);
  }
};

// ProductCard component - Updated to match Admin Panel dimensions
const ProductCard = ({ product, onPress }) => {
  return (
    <TouchableOpacity
      style={styles.productCard}
      onPress={() => onPress(product)}
    >
      {product.image ? (
        <Image
          source={getDisplayImageSource(product.image)}
          style={styles.productImage}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.noProductImage}>
          <Ionicons name="image-outline" size={40} color="#999" />
          <Text style={styles.noImageText}>No Image</Text>
        </View>
      )}
      <Text style={styles.productName}>{product.name}</Text>
      {product.status?.toLowerCase() === 'hide' && (
        <View style={styles.hiddenBadge}>
          <Text style={styles.hiddenBadgeText}>Hidden</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const Marketplace = () => {
  const navigation = useNavigation();

  const [userData, setUserData] = useState({
    name: 'Guest',
    profileImage: userProfileImagePlaceholder,
  });

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cartCount, setCartCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      loadManagerCartCount(setCartCount);
    }, []),
  );

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener(
      MANAGER_CART_UPDATED_EVENT,
      payload => {
        const nextCount = payload?.count;
        if (typeof nextCount === 'number') {
          setCartCount(nextCount);
        } else {
          loadManagerCartCount(setCartCount);
        }
      },
    );

    return () => {
      subscription?.remove?.();
    };
  }, []);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const managerAuth = await AsyncStorage.getItem('managerAuth');
        const adminAuth = await AsyncStorage.getItem('adminAuth');

        if (managerAuth) {
          const parsedData = JSON.parse(managerAuth);
          if (parsedData.token && parsedData.isAuthenticated) {
            setUserData({
              name: parsedData.manager.name,
              profileImage: parsedData.manager.livePicture,
            });
          }
        } else if (adminAuth) {
          const parsedData = JSON.parse(adminAuth);
          if (parsedData.token && parsedData.isAuthenticated) {
            setUserData({
              name: parsedData.admin.name,
              profileImage: parsedData.admin.livePicture,
            });
          }
        }
      } catch (e) {
        console.error('Failed to load user data:', e);
      }
    };

    loadUserData();
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const authData = await AsyncStorage.getItem('managerAuth');
      const adminAuthData = await AsyncStorage.getItem('adminAuth');
      
      let token = null;
      if (authData) {
        const parsed = JSON.parse(authData);
        token = parsed.token;
      } else if (adminAuthData) {
        const parsed = JSON.parse(adminAuthData);
        token = parsed.token;
      }
      
      if (!token) {
        setLoading(false);
        return;
      }

      const data = await getProducts(token, { type: 'show' });
      const list = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
      // Filter out hidden products for manager view if needed
      setProducts(list.filter(p => p.status?.toLowerCase() !== 'hide'));
      setError(null);
    } catch (e) {
      setError(e.message || 'Failed to load products.');
    } finally {
      setLoading(false);
    }
  };

  const handleProductCardPress = product => {
    navigation.navigate('Submarket', { product: product });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#A99226" />
        <Text style={styles.loadingText}>Loading products...</Text>
      </View>
    );
  }

  const profileImageSource = userData.profileImage
    ? { uri: userData.profileImage }
    : userProfileImagePlaceholder;

  return (
    <View style={styles.container}>
      <View style={styles.mainContent}>
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.headerCenter}>
            <View style={styles.userInfo}>
              <Text style={styles.greeting}>Hello 👋</Text>
              <Text style={styles.userName}>
                {truncateUsername(userData.name)}
              </Text>
            </View>
          </View>

          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.cartButton}
              onPress={() => navigation.navigate('ManagerCartScreen')}
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
            <Image
              source={profileImageSource}
              style={styles.profileImage}
              resizeMode="cover"
            />
          </View>
        </View>

        <View style={styles.servicesHeader}>
          <Text style={styles.servicesTitle}>Products</Text>
        </View>

        {/* Products Grid - Synchronized with Admin UI */}
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
                onPress={handleProductCardPress}
              />
            </View>
          )}
          ListEmptyComponent={() => (
            <Text style={styles.loadingText}>No products available.</Text>
          )}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#1e1f20ff',
  },
  mainContent: {
    flex: 1,
    paddingTop: height * 0.03,
    paddingRight: width * 0.03,
    paddingLeft: width * 0.03, // Adjusted to match admin padding
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
  },
  userInfo: {
    marginRight: width * 0.1,
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cartButton: {
    marginRight: width * 0.045,
     backgroundColor: '#2A2D32',
    borderRadius: 12,
    padding: width * 0.000001,
    height: width * 0.078,
    width: width * 0.078,
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
  profileImage: {
    width: width * 0.058,
  },
  profileImage: {
    width: width * 0.058,
    height: width * 0.058,
    borderRadius: (width * 0.058) / 2,
  },
  servicesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: height * 0.03,
    marginHorizontal: width * 0.01,
    borderBottomWidth: 1,
    borderBottomColor: '#3C3C3C',
    paddingBottom: height * 0.03,
  },
  servicesTitle: {
    fontSize: width * 0.035,
    fontWeight: 'bold',
    color: '#fff',
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
    marginRight: width * 0.009, 
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
  noProductImage: {
    width: '100%',
    aspectRatio: 122 / 190,
    borderRadius: 4.9,
    marginBottom: height * 0.01,
    backgroundColor: '#2c2c2c',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noImageText: {
    color: '#999',
    fontSize: width * 0.015,
    marginTop: 5,
  },
  productName: {
    color: '#fff',
    fontSize: width * 0.018,
    fontWeight: '500',
    textAlign: 'center',
    paddingHorizontal: width * 0.01,
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

export default Marketplace;