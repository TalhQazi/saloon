//admin deals screen 
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
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import NotificationBell from '../../../../components/NotificationBell';
import { addAdminCartItem } from '../../../../utils/adminCart';
// Import 'useRoute' to access navigation parameters
import {
  useNavigation,
  useFocusEffect,
  useRoute,
} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';
import {
  ADMIN_CART_UPDATED_EVENT,
  getAdminCartItems,
} from '../../../../utils/adminCart';

// Import API functions
import { getDeals, addDeal, updateDeal, deleteDeal } from '../../../../api/deals';
import dealsApi from '../../../../api/deals';

// Assuming these modal files will be created/adapted similar to product ones
import AddDealModal from './modals/AddDealModal';
import DealOptionsModal from './modals/DealOptionsModal';
import DealDetailModal from './modals/DealDetailModal';
import ConfirmationModal from './modals/ConfirmationModal';

const { width, height } = Dimensions.get('window');

const loadAdminCartCount = async setCartCount => {
  try {
    const items = await getAdminCartItems();
    setCartCount(Array.isArray(items) ? items.length : 0);
  } catch (err) {
    console.error('[DealsScreen] Failed to load admin cart count:', err);
    setCartCount(0);
  }
};

// Import your local images (ensure these paths are correct for your project structure)
import bridalDealImage from '../../../../assets/images/makeup.jpeg';
import keratinImage from '../../../../assets/images/hair.jpeg';
import studentDiscountImage from '../../../../assets/images/product.jpeg';
import colorBundleImage from '../../../../assets/images/eyeshadow.jpeg';
const userProfileImagePlaceholder = require('../../../../assets/images/logo.png');

// Helper function to truncate username to 6 words maximum
const truncateUsername = username => {
  if (!username) return 'Guest';
  const words = username.split(' ');
  if (words.length <= 6) return username;
  return words.slice(0, 6).join(' ') + '...';
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

const DealCard = ({ deal, onOptionsPress, onPress, onAddToCartPress }) => {
  let imageSource = null;
  if (deal?.image || deal?.dealImage) {
    imageSource = getDisplayImageSource(deal.image || deal.dealImage);
  }

  return (
    <TouchableOpacity style={styles.dealCard} onPress={() => onPress(deal)}>
      {imageSource ? (
        <Image
          source={imageSource}
          style={styles.dealImage}
          resizeMode="cover"
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
      <TouchableOpacity
        style={styles.cardOptionsButton}
        onPress={event => onOptionsPress(event, deal)}
      >
        <Ionicons name="ellipsis-vertical" size={width * 0.025} color="#fff" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const DealsScreen = () => {
  const navigation = useNavigation();
  // const route = useRoute(); // 👈 Previously used for params
  // 1. Route-based admin (now replaced by storage-based)
  // const { authenticatedAdmin } = route.params || {};

  // Deals state ko yahan manage karein
  const [deals, setDeals] = useState([]);
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
  const [cartItems, setCartItems] = useState([]); // Cart ka state yahan rakhein
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [authenticatedAdmin, setAuthenticatedAdmin] = useState(null);

  // Modals states
  const [addEditModalVisible, setAddEditModalVisible] = useState(false);
  const [dealToEdit, setDealToEdit] = useState(null);

  const [optionsModalVisible, setOptionsModalVisible] = useState(false);
  const [optionsModalPosition, setOptionsModalPosition] = useState({
    top: 0,
    left: 0,
  });
  const [selectedDeal, setSelectedDeal] = useState(null);

  // Retrieve authenticated admin from storage for header consistency
  const getAuthenticatedAdmin = async () => {
    try {
      const data = await AsyncStorage.getItem('adminAuth');
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed.token && parsed.isAuthenticated) {
          return {
            token: parsed.token,
            name: parsed.admin?.name || 'Guest',
            profilePicture:
              parsed.admin?.profilePicture || parsed.admin?.livePicture,
          };
        }
      }
      return null;
    } catch (error) {
      console.error('Failed to get authenticated admin:', error);
      return null;
    }
  };

  useEffect(() => {
    (async () => {
      const admin = await getAuthenticatedAdmin();
      if (admin) {
        setAuthenticatedAdmin(admin);
      } else {
        Alert.alert('Authentication Error', 'Please login again.', [
          { text: 'OK', onPress: () => navigation.replace('AdminLogin') },
        ]);
      }
    })();
  }, []);

  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [dealToDelete, setDealToDelete] = useState(null);

  // Custom Alert Modal States
  const [customAlertVisible, setCustomAlertVisible] = useState(false);
  const [customAlertMessage, setCustomAlertMessage] = useState('');
  const [customAlertAction, setCustomAlertAction] = useState(null);

  // Function to get auth token from AsyncStorage
  const getAuthToken = async () => {
    try {
      const authData = await AsyncStorage.getItem('adminAuth');
      if (authData) {
        const { token, isAuthenticated } = JSON.parse(authData);
        if (token && isAuthenticated) {
          return token;
        }
      }
      return null;
    } catch (error) {
      console.error('Failed to get auth token from storage:', error);
      return null;
    }
  };

  const showCustomAlert = (message, action = null) => {
    setCustomAlertMessage(message);
    setCustomAlertAction(() => action);
    setCustomAlertVisible(true);
  };

  const hideCustomAlert = () => {
    setCustomAlertVisible(false);
    setCustomAlertMessage('');
    if (customAlertAction) {
      customAlertAction();
      setCustomAlertAction(null);
    }
  };

  // Fetch deals from backend
  const fetchDeals = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const token = await getAuthToken();
      if (!token) {
        console.log('No auth token available');
        Alert.alert('Authentication Error', 'Please login again.', [
          {
            text: 'OK',
            onPress: () => navigation.replace('AdminLogin'),
          },
        ]);
        return;
      }
      const response = await getDeals(token);
      setDeals(response.deals || response);
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

  useFocusEffect(
    useCallback(() => {
      const updatedCart = navigation
        .getState()
        .routes.find(route => route.name === 'CartDealsScreen')
        ?.params?.updatedCart;
      if (updatedCart) {
        setCartItems(updatedCart);
        navigation.setParams({ updatedCart: undefined });
      }
    }, [navigation]),
  );

  const handleCloseModal = () => {
    setAddEditModalVisible(false);
    setDealToEdit(null);
  };

  const handleSaveDeal = async dealData => {
    setLoading(true);
    try {
      if (dealToEdit && dealToEdit.id) {
        const token = await getAuthToken();
        if (!token) {
          showCustomAlert('Authentication required. Please login again.');
          return;
        }
        await updateDeal(dealToEdit.id, dealData, token);
        showCustomAlert('Deal updated successfully!');
      } else {
        const token = await getAuthToken();
        if (!token) {
          showCustomAlert('Authentication required. Please login again.');
          return;
        }
        await addDeal(dealData, token);
        showCustomAlert('Deal added successfully!');
      }
      await fetchDeals();
      handleCloseModal();
    } catch (error) {
      console.error('Error saving deal:', error);
      let errorMessage = 'Failed to save deal';
      if (error.message) {
        if (error.message.includes('Validation error')) {
          errorMessage = `Validation error: ${
            error.message.split('Validation error:')[1] || error.message
          }`;
        } else if (error.message.includes('Missing required fields')) {
          errorMessage = 'Please fill in all required fields (name and price)';
        } else {
          errorMessage = error.message;
        }
      }
      showCustomAlert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCardOptionsPress = (event, deal) => {
    setSelectedDeal(deal);
    const buttonX = event.nativeEvent.pageX;
    const buttonY = event.nativeEvent.pageY;
    const modalWidth = width * 0.15;
    const modalHeight = height * 0.2;
    // Always open the options panel to the LEFT of the icon
    let left = buttonX - modalWidth - 10;
    // Vertically center the modal relative to the tap position
    let top = buttonY - modalHeight / 2;

    // Clamp horizontally inside the screen
    if (left < 10) left = 10;
    if (left + modalWidth > width - 10) {
      left = width - modalWidth - 10;
    }

    // Clamp vertically inside the screen
    if (top < 10) top = 10;
    if (top + modalHeight > height - 10) {
      top = height - modalHeight - 10;
    }
    setOptionsModalPosition({ top, left });
    setOptionsModalVisible(true);
  };

  const handleOptionSelect = option => {
    setOptionsModalVisible(false);
    if (!selectedDeal) return;

    switch (option) {
      case 'view':
        setDetailModalVisible(true);
        break;
      case 'edit':
        const mappedDealData = {
          id: selectedDeal._id || selectedDeal.id,
          dealName: selectedDeal.name || selectedDeal.dealName,
          dealImage: selectedDeal.image,
          price: selectedDeal.price,
          description: selectedDeal.description,
          isHiddenFromEmployee: selectedDeal.isHiddenFromEmployee || false,
        };
        setDealToEdit(mappedDealData);
        setAddEditModalVisible(true);
        break;
      case 'delete':
        setDealToDelete(selectedDeal);
        setConfirmModalVisible(true);
        break;
      case 'hide':
        (async () => {
          try {
            const token = await getAuthToken();
            if (!token) {
              showCustomAlert('Authentication required. Please login again.');
              return;
            }

            const currentlyHidden =
              selectedDeal?.isHiddenFromEmployee === true;
            const nextStatus = currentlyHidden ? 'show' : 'hide';

            const dealId = selectedDeal._id || selectedDeal.id;
            if (!dealId) {
              showCustomAlert('Cannot change visibility: invalid deal ID');
              return;
            }

            await dealsApi.changeStatus(dealId, nextStatus, token);
            showCustomAlert(
              `Deal marked as ${nextStatus === 'hide' ? 'hidden' : 'visible'} for employees.`,
            );
            await fetchDeals();
          } catch (error) {
            console.error('Error changing deal visibility:', error);
            showCustomAlert(
              error.message || 'Failed to change deal visibility. Please try again.',
            );
          }
        })();
        break;
      default:
        break;
    }
  };

  const handleAddToCart = async deal => {
    const dealToAdd = {
      id: deal._id || deal.id,
      name: deal.name || deal.dealName,
      dealName: deal.name || deal.dealName,
      dealImage: deal.image,
      price: deal.price,
      description: deal.description,
      type: 'deal',
    };

    await addAdminCartItem(dealToAdd);

    Alert.alert(
      'Added to Cart',
      `${deal.name || deal.dealName} has been added to the cart.`,
    );
  };

  const confirmDeleteDeal = async () => {
    setLoading(true);
    try {
      const token = await getAuthToken();
      if (!token) {
        showCustomAlert('Authentication required. Please login again.');
        return;
      }
      const dealId = dealToDelete._id || dealToDelete.id;
      if (!dealId) {
        showCustomAlert('Cannot delete deal: No valid ID found');
        return;
      }
      await deleteDeal(dealId, token);
      showCustomAlert('Deal deleted successfully!');
      await fetchDeals();
      setDealToDelete(null);
      setConfirmModalVisible(false);
    } catch (error) {
      console.error('Error deleting deal:', error);
      let errorMessage = 'Failed to delete deal';
      if (error.message) {
        if (error.message.includes('Deal not found')) {
          errorMessage = 'Deal not found. Please refresh and try again.';
        } else if (error.message.includes('Authentication')) {
          errorMessage = 'Authentication required. Please login again.';
        } else {
          errorMessage = error.message;
        }
      }
      showCustomAlert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDealCardPress = deal => {
    setSelectedDeal(deal);
    setDetailModalVisible(true);
  };

  // Admin should see all deals (including ones hidden from employees),
  // with a "Hidden" badge. Employee/manager screens handle filtering.
  const dealsToDisplay = deals;

  // 2. Build username and profile image from stored admin
  const userName = authenticatedAdmin?.name || 'Guest';
  const userProfileImage = authenticatedAdmin?.profilePicture;
  const profileImageSource = userProfileImage
    ? { uri: userProfileImage }
    : userProfileImagePlaceholder;

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

        <View style={styles.dealsHeader}>
          <Text style={styles.dealsTitle}>Deals</Text>
          <TouchableOpacity
            style={styles.addNewDealButton}
            onPress={() => {
              setDealToEdit(null);
              setAddEditModalVisible(true);
            }}
          >
            <Text style={styles.addNewDealButtonText}>Add New Deal</Text>
          </TouchableOpacity>
        </View>

        {/* Deals Grid */}
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
                <DealCard
                  deal={item}
                  onOptionsPress={handleCardOptionsPress}
                  onPress={handleDealCardPress}
                  onAddToCartPress={handleAddToCart}
                />
              </View>
            )}
          />
        )}
      </View>

      <AddDealModal
        visible={addEditModalVisible}
        onClose={handleCloseModal}
        onSave={handleSaveDeal}
        initialDealData={dealToEdit}
      />
      <DealOptionsModal
        visible={optionsModalVisible}
        onClose={() => setOptionsModalVisible(false)}
        onSelectOption={handleOptionSelect}
        position={optionsModalPosition}
      />
      <DealDetailModal
        visible={detailModalVisible}
        onClose={() => setDetailModalVisible(false)}
        deal={selectedDeal}
      />
      <ConfirmationModal
        visible={confirmModalVisible}
        onClose={() => setConfirmModalVisible(false)}
        onConfirm={confirmDeleteDeal}
        message={`Are you sure you want to delete "${
          dealToDelete?.name || dealToDelete?.dealName
        }"? This action cannot be undone.`}
      />

      <Modal
        animationType="fade"
        transparent={true}
        visible={customAlertVisible}
        onRequestClose={hideCustomAlert}
      >
        <View style={styles.customAlertCenteredView}>
          <View style={styles.customAlertModalView}>
            <Text style={styles.customAlertModalText}>
              {customAlertMessage}
            </Text>
            <TouchableOpacity
              style={styles.customAlertCloseButton}
              onPress={hideCustomAlert}
            >
              <Text style={styles.customAlertCloseButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// Styles ko unchanged rakhein
const CARD_SPACING = 11;
const NUM_COLUMNS = 2; // Changed to 2 cards per row
const SCREEN_WIDTH = Dimensions.get('window').width;

const CARD_WIDTH =
  (SCREEN_WIDTH * 0.8 - CARD_SPACING * (NUM_COLUMNS + 6)) / NUM_COLUMNS; // retained for backward compatibility (not used for width)

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
    marginRight: width * 0.015,
    height: width * 0.058,
    width: width * 0.058,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImage: {
    width: width * 0.058,
    height: width * 0.058,
    borderRadius: (width * 0.058) / 2,
  },
  dealsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: height * 0.03,
    marginHorizontal: width * 0.01,
    borderBottomWidth: 1,
    borderBottomColor: '#3C3C3C',
    paddingBottom: height * 0.03,
  },
  dealsTitle: {
    fontSize: width * 0.035,
    fontWeight: 'bold',
    color: '#fff',
  },
  addNewDealButton: {
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
  addNewDealButtonText: {
    color: '#fff',
    fontSize: width * 0.018,
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
    marginTop: 'auto', // Push to the bottom
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
  cardOptionsButton: {
    position: 'absolute',
    top: width * 0.02,
    right: width * 0.02,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 4,
    padding: width * 0.01,
  },
  customAlertCenteredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  customAlertModalView: {
    backgroundColor: '#3C3C3C',
    borderRadius: 12,
    padding: width * 0.05,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    maxWidth: width * 0.8,
  },
  customAlertModalText: {
    color: '#fff',
    fontSize: width * 0.025,
    textAlign: 'center',
    marginBottom: height * 0.03,
  },
  customAlertCloseButton: {
    backgroundColor: '#A99226',
    paddingVertical: height * 0.015,
    paddingHorizontal: width * 0.08,
    borderRadius: 8,
  },
  customAlertCloseButtonText: {
    color: '#fff',
    fontSize: width * 0.02,
    fontWeight: '600',
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
