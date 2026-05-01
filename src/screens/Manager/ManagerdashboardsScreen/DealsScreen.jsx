// manager deals screen
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
  Modal,
  ActivityIndicator,
  Alert,
  FlatList,
} from 'react-native';
import { DeviceEventEmitter } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import NotificationBell from '../../../components/NotificationBell';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { getDeals } from '../../../api';

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  MANAGER_CART_UPDATED_EVENT,
  addManagerCartItem,
  getManagerCartItems,
} from '../../../utils/managerCart';

const { width, height } = Dimensions.get('window');

// Import your local images
import bridalDealImage from '../../../assets/images/makeup.jpeg';
import keratinImage from '../../../assets/images/hair.jpeg';
import studentDiscountImage from '../../../assets/images/product.jpeg';
import colorBundleImage from '../../../assets/images/eyeshadow.jpeg';
const userProfileImagePlaceholder = require('../../../assets/images/logo.png');

const loadManagerCartCount = async setCartCount => {
  try {
    const items = await getManagerCartItems();
    setCartCount(Array.isArray(items) ? items.length : 0);
  } catch (err) {
    console.error('[ManagerDealsScreen] Failed to load manager cart count:', err);
    setCartCount(0);
  }
};

// Helper function to get image based on deal name
const getDealImageFallback = dealName => {
  switch (dealName) {
    case 'Bridal Deal & Spa':
      return bridalDealImage;
    case 'Keratin Treatment':
    case 'Complete Hair Care':
      return keratinImage;
    case 'Student Discounts':
    case 'Spa Day Package':
      return studentDiscountImage;
    case 'Colour Bundle':
      return colorBundleImage;
    default:
      return userProfileImagePlaceholder;
  }
};

const DealCard = ({ deal, onAddToCartPress }) => {
  let imageSource = null;

  const imageUri = deal?.image || deal?.dealImage;

  if (
    typeof imageUri === 'string' &&
    (imageUri.startsWith('http://') ||
      imageUri.startsWith('https://') ||
      imageUri.startsWith('file://'))
  ) {
    imageSource = { uri: imageUri };
  }

  if (!imageSource) {
    imageSource = getDealImageFallback(deal.name || deal.dealName);
  }

  if (!imageSource) {
    imageSource = null;
  }

  return (
    <View style={styles.dealCard}>
      {imageSource ? (
        <Image
          source={imageSource}
          style={styles.dealImage}
          resizeMode="cover"
          onError={error => console.log('Manager Image load error:', error)}
        />
      ) : (
        <View style={styles.dealImageNoImage}>
          <Text style={styles.noImageText}>No Image</Text>
        </View>
      )}
      <View style={styles.dealInfo}>
        <View>
          <Text style={styles.dealName}>
            {deal.name || deal.dealName || 'No Name'}
          </Text>
          {deal.description ? (
            <Text style={styles.dealDescription}>{deal.description}</Text>
          ) : (
            <Text style={styles.dealDescription}>
              No description available.
            </Text>
          )}
          <Text style={styles.dealPriceLabel}>
            Price:{' '}
            <Text style={styles.dealPriceValue}>{deal.price || 'N/A'} PKR</Text>
          </Text>
        </View>
        <TouchableOpacity
          style={styles.addToCartButton}
          onPress={() => onAddToCartPress(deal)}
        >
          <Text style={styles.addToCartButtonText}>Add To Cart</Text>
        </TouchableOpacity>
      </View>
      {deal.isHiddenFromEmployee && (
        <View style={styles.hiddenBadge}>
          <Text style={styles.hiddenBadgeText}>Hidden</Text>
        </View>
      )}
    </View>
  );
};

const DealsScreen = () => {
  const navigation = useNavigation();

  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cartCount, setCartCount] = useState(0);

  const [userData, setUserData] = useState({
    userName: 'Guest',
    userProfileImage: userProfileImagePlaceholder,
  });

  const profileImageSource =
    typeof userData.userProfileImage === 'string' &&
    (userData.userProfileImage.startsWith('http://') ||
      userData.userProfileImage.startsWith('https://'))
      ? { uri: userData.userProfileImage }
      : userProfileImagePlaceholder;

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

  // Load user data from AsyncStorage
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const managerAuth = await AsyncStorage.getItem('managerAuth');
        const adminAuth = await AsyncStorage.getItem('adminAuth');

        if (managerAuth) {
          const parsedData = JSON.parse(managerAuth);
          if (parsedData.token && parsedData.isAuthenticated) {
            setUserData({
              userName: parsedData.manager.name,
              userProfileImage: parsedData.manager.livePicture,
            });
          } else {
            Alert.alert('Authentication Error', 'Please login again.', [
              {
                text: 'OK',
                onPress: () => navigation.replace('RoleSelection'),
              },
            ]);
          }
        } else if (adminAuth) {
          const parsedData = JSON.parse(adminAuth);
          if (parsedData.token && parsedData.isAuthenticated) {
            setUserData({
              userName: parsedData.admin.name,
              userProfileImage: parsedData.admin.livePicture,
            });
          } else {
            Alert.alert('Authentication Error', 'Please login again.', [
              {
                text: 'OK',
                onPress: () => navigation.replace('RoleSelection'),
              },
            ]);
          }
        } else {
          Alert.alert('Authentication Error', 'Please login again.', [
            {
              text: 'OK',
              onPress: () => navigation.replace('RoleSelection'),
            },
          ]);
        }
      } catch (e) {
        console.error('Failed to load user data from storage:', e);
        Alert.alert('Authentication Error', 'Please login again.', [
          {
            text: 'OK',
            onPress: () => navigation.replace('RoleSelection'),
          },
        ]);
      }
    };

    loadUserData();
  }, []);

  const fetchDeals = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const managerAuth = await AsyncStorage.getItem('managerAuth');
      const adminAuth = await AsyncStorage.getItem('adminAuth');

      let authToken = null;
      if (managerAuth) {
        const parsed = JSON.parse(managerAuth);
        if (parsed.token && parsed.isAuthenticated) {
          authToken = parsed.token;
        }
      } else if (adminAuth) {
        const parsed = JSON.parse(adminAuth);
        if (parsed.token && parsed.isAuthenticated) {
          authToken = parsed.token;
        }
      }

      if (!authToken) {
        Alert.alert('Authentication Error', 'Please login again.', [
          {
            text: 'OK',
            onPress: () => navigation.replace('RoleSelection'),
          },
        ]);
        return;
      }

      const response = await getDeals(authToken);
      console.log('Manager Fetched deals response:', response);

      if (response.success && response.deals) {
        console.log('Manager Deals data:', response.deals);
        setDeals(response.deals);
      } else if (Array.isArray(response)) {
        console.log('Manager Deals array data:', response);
        setDeals(response);
      } else {
        console.log('No deals found or invalid response format');
        setDeals([]);
      }
    } catch (error) {
      console.error('Error fetching deals:', error);
      setError('Failed to load deals. Please try again.');
      setDeals([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  const handleAddToCart = async deal => {
    await addManagerCartItem({
      id: deal._id || deal.id,
      type: 'deal',
      name: deal.name || deal.dealName || 'N/A',
      price: deal.price,
      raw: deal,
    });

    Alert.alert(
      'Added to Cart',
      `${deal.name || deal.dealName} has been added to the cart.`,
    );
  };

  const dealsToDisplay = deals.filter(deal => !deal.isHiddenFromEmployee);

  useEffect(() => {
    if (deals.length > 0) {
      console.log('Manager All deals data:', deals);
    }
  }, [deals]);

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.mainContent}>
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchDeals}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        </View>
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
              <Text style={styles.userName}>
                {userData.userName || 'Guest'}
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
          <Text style={styles.servicesTitle}>Deals</Text>
        </View>

        {/* Deals Grid - Now using FlatList with same structure as admin */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#A99226" />
            <Text style={styles.loadingText}>Loading Deals...</Text>
          </View>
        ) : (
          <FlatList
            data={dealsToDisplay}
            keyExtractor={item => (item._id || item.id).toString()}
            numColumns={2}
            columnWrapperStyle={styles.dealsRow}
            contentContainerStyle={styles.dealsGridContainer}
            ListEmptyComponent={() => (
              <Text style={styles.noDealsText}>No deals available.</Text>
            )}
            renderItem={({ item }) => (
              <View style={styles.cardCol}>
                <DealCard deal={item} onAddToCartPress={handleAddToCart} />
              </View>
            )}
          />
        )}
      </View>
    </View>
  );
};

// Layout constants - MATCHING ADMIN PANEL
const CARD_SPACING = 11;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#1e1f20ff',
  },
  mainContent: {
    flex: 1,
    paddingTop: height * 0.03,
    paddingHorizontal: CARD_SPACING,
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: width * 0.01,
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
  dealsGridContainer: {
    paddingBottom: height * 0.05,
    paddingHorizontal: CARD_SPACING,
  },
  dealsRow: {
    justifyContent: 'space-between',
    paddingHorizontal: CARD_SPACING,
    marginBottom: CARD_SPACING,
  },
  cardCol: {
    width: '48%',
    paddingHorizontal: 0,
  },
  dealCard: {
    width: '100%',
    height: 'auto',
    minHeight: height * 0.33,
    backgroundColor: '#3C3C3C',
    borderRadius: 12,
    marginBottom: 0,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    position: 'relative',
  },
  dealImage: {
    width: '100%',
    aspectRatio: 16 / 10,
  },
  dealImageNoImage: {
    width: '100%',
    aspectRatio: 16 / 10,
    backgroundColor: '#555',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noImageText: {
    color: '#fff',
    fontSize: width * 0.02,
    fontWeight: '600',
  },
  dealInfo: {
    padding: width * 0.02,
    justifyContent: 'space-between',
    flex: 1,
  },
  dealName: {
    color: '#fff',
    fontSize: width * 0.025,
    fontWeight: 'bold',
    marginBottom: height * 0.005,
  },
  dealDescription: {
    color: '#A9A9A9',
    fontSize: width * 0.018,
    marginBottom: height * 0.01,
    lineHeight: width * 0.025,
  },
  dealPriceLabel: {
    color: '#A9A9A9',
    fontSize: width * 0.018,
    marginBottom: height * 0.01,
  },
  dealPriceValue: {
    color: '#A99226',
    fontWeight: 'bold',
  },
  addToCartButton: {
    backgroundColor: '#A99226',
    paddingVertical: height * 0.01,
    paddingHorizontal: width * 0.02,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 'auto',
  },
  addToCartButtonText: {
    color: '#fff',
    fontSize: width * 0.018,
    fontWeight: '600',
  },
  hiddenBadge: {
    position: 'absolute',
    top: width * 0.02,
    left: width * 0.02,
    backgroundColor: 'rgba(255, 69, 58, 0.9)',
    paddingVertical: width * 0.005,
    paddingHorizontal: width * 0.015,
    borderRadius: 4,
  },
  hiddenBadgeText: {
    color: '#fff',
    fontSize: width * 0.015,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: width * 0.025,
    marginTop: height * 0.02,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#fff',
    fontSize: width * 0.025,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#A99226',
    paddingVertical: height * 0.015,
    paddingHorizontal: width * 0.1,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: width * 0.02,
    fontWeight: '600',
  },
  noDealsText: {
    color: '#A9A9A9',
    fontSize: width * 0.02,
    textAlign: 'center',
    marginTop: height * 0.1,
  },
});

export default DealsScreen;