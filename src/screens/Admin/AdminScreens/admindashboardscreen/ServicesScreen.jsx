// src/screens/AdminPanel/ServicesScreen.js

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
// Icon libraries
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import NotificationBell from '../../../../components/NotificationBell';
// Import your local context and components
import AddServiceModal from './modals/AddServiceModal';
import ServiceOptionsModal from './modals/ServiceOptionsModal';
import ServiceDetailModal from './modals/ServiceDetailModal';
import ConfirmationModal from './modals/ConfirmationModal';
import userProfileImagePlaceholder from '../../../../assets/images/logo.png';
// Navigation and API library
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { getAdminToken } from '../../../../utils/authUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';
import {
  ADMIN_CART_UPDATED_EVENT,
  getAdminCartItems,
} from '../../../../utils/adminCart';
// Import your API functions from the centralized API folder
import {
  addService,
  getServices,
  updateService,
  deleteService,
  changeServiceStatus,
} from '../../../../api';

const { width, height } = Dimensions.get('window');

// Using centralized auth utils for token handling

// Local images (These should be dynamic from your API in a real app)
import haircutImage from '../../../../assets/images/haircut.jpeg';
import manicureImage from '../../../../assets/images/manicure.jpeg';
import pedicureImage from '../../../../assets/images/pedicure.jpeg';
import hairColoringImage from '../../../../assets/images/color.jpeg';

// Helper: show up to 6 words of the username
const truncateUsername = username => {
  if (!username) return 'Guest';
  const words = username.split(' ');
  if (words.length <= 6) return username;
  return words.slice(0, 6).join(' ') + '...';
};

const loadAdminCartCount = async setCartCount => {
  try {
    const items = await getAdminCartItems();
    setCartCount(Array.isArray(items) ? items.length : 0);
  } catch (err) {
    console.error('[ServicesScreen] Failed to load admin cart count:', err);
    setCartCount(0);
  }
};

// Retrieve current admin from AsyncStorage (same as Employees screen)
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

/**
 * Helper function to handle different image sources (local asset or URI).
 * @param {string|number} image - The source of the image.
 * @returns {object|number} - The image source object for React Native or local asset number.
 */
const getDisplayImageSource = image => {
  if (typeof image === 'string') {
    const val = image.trim();
    if (
      val.startsWith('http://') ||
      val.startsWith('https://') ||
      val.startsWith('file://') ||
      val.startsWith('content://') ||
      val.startsWith('data:image')
    ) {
      return { uri: val };
    }
    // As a safe fallback, try to treat non-empty strings as URIs
    if (val.length > 0) {
      return { uri: val };
    }
  } else if (typeof image === 'number') {
    // Local asset
    return image;
  }
  // Fallback: placeholder
  return haircutImage;
};

/**
 * ServiceCard component to display an individual service with options.
 * @param {object} props - Component props.
 * @param {object} props.service - The service data object.
 * @param {function} props.onOptionsPress - Function to handle the options button press.
 * @param {function} props.onPress - Function to handle the card press (e.g., for navigation).
 */
const isServiceHidden = svc => {
  if (!svc) return false;
  // Backend uses status: 'show' | 'hide'
  if (typeof svc.status === 'string') {
    return svc.status.toLowerCase() === 'hide';
  }
  return false;
};

const ServiceCard = ({ service, onOptionsPress, onPress }) => {
  // Prefer backend image, but also accept legacy 'serviceImage' from client
  const imageSource = getDisplayImageSource(
    service.image || service.serviceImage,
  );

  return (
    <TouchableOpacity
      style={styles.serviceCard}
      onPress={() => onPress(service)}
    >
      <Image
        source={imageSource}
        style={styles.serviceImage}
        resizeMode="cover"
      />
      <Text style={styles.serviceName}>{service.title || service.name}</Text>
      {isServiceHidden(service) && (
        <View style={styles.hiddenBadge}>
          <Ionicons name="eye-off-outline" size={width * 0.028} color="#fff" />
          <Text style={styles.hiddenBadgeText}>Hidden</Text>
        </View>
      )}
      <TouchableOpacity
        style={styles.cardOptionsButton}
        onPress={event => onOptionsPress(event, service)}
      >
        <Ionicons name="ellipsis-vertical" size={width * 0.022} color="#fff" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

/**
 * The main ServicesScreen component for the Admin Panel.
 * Manages fetching, adding, editing, and deleting services.
 */
const ServicesScreen = () => {
  const navigation = useNavigation();
  // const route = useRoute(); // useRoute hook to get route params
  // Get user data from route params passed from face recognition screen
  // const { authenticatedAdmin } = route.params || {};

  // State for services data and loading status
  const [services, setServices] = useState([]);
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
  const [serviceToEdit, setServiceToEdit] = useState(null);

  const [optionsModalVisible, setOptionsModalVisible] = useState(false);
  const [optionsModalPosition, setOptionsModalPosition] = useState({
    top: 0,
    left: 0,
  });
  const [selectedService, setSelectedService] = useState(null);

  const [detailModalVisible, setDetailModalVisible] = useState(false);

  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState(null);

  // Load admin from storage to keep header consistent with Employees screen
  useEffect(() => {
    const loadAdminProfile = async () => {
      const admin = await getAuthenticatedAdmin();
      if (admin) {
        setAuthenticatedAdmin(admin);
      } else {
        Alert.alert('Authentication Error', 'Please login again.', [
          { text: 'OK', onPress: () => navigation.replace('AdminLogin') },
        ]);
      }
    };
    loadAdminProfile();
  }, []);

  // Function to fetch all services from the backend API
  const fetchServices = async () => {
    setLoading(true);
    try {
      // Public endpoint; token not required for fetching services
      const data = await getServices();
      setServices(data);
      setError(null);
    } catch (e) {
      console.error('Error fetching services:', e);
      setError(
        e.message ||
          'Failed to load services. Please ensure your backend server is running and the IP address is correct.',
      );
    } finally {
      setLoading(false);
    }
  };

  // Load services on component mount
  useEffect(() => {
    fetchServices();
  }, []);

  // Function to handle saving a new service or updating an existing one
  const handleSaveService = async serviceData => {
    try {
      console.log('Saving service data:', serviceData);

      // Ensure admin is authenticated for add/update operations
      const token = await getAdminToken();
      if (!token) {
        Alert.alert(
          'Error',
          'Authentication token not found. Please login again.',
          [
            {
              text: 'OK',
              onPress: () => navigation.replace('AdminLogin'),
            },
          ]
        );
        return;
      }

      if (serviceToEdit) {
        // It's an edit operation - use the id from the mapped data
        console.log('Editing service with ID:', serviceToEdit.id);
        await updateService(serviceToEdit.id, serviceData, token);
        Alert.alert('Success', 'Service updated successfully!');
      } else {
        // It's an add operation
        console.log('Adding new service');
        await addService(serviceData, token);
        Alert.alert('Success', 'Service added successfully!');
      }
      fetchServices(); // Refresh the services list
    } catch (e) {
      console.error('Error saving service:', e);
      console.error('Error details:', {
        message: e.message,
        response: e.response?.data,
        status: e.response?.status,
      });
      Alert.alert('Error', e.message || 'Failed to save the service.');
    }
    setAddEditModalVisible(false);
    setServiceToEdit(null);
  };

  // Function to handle opening the ServiceOptionsModal
  const handleCardOptionsPress = (event, service) => {
    const buttonX = event.nativeEvent.pageX;
    const buttonY = event.nativeEvent.pageY;

    const modalWidth = width * 0.15;
    const modalHeight = height * 0.2;

    // Always prefer opening the options panel to the LEFT of the icon
    let left = buttonX - modalWidth - 10;
    // Vertically, center the modal around the button tap if possible
    let top = buttonY - modalHeight / 2;

    // Basic boundary checks: keep the modal fully inside the screen
    if (left < 10) left = 10; // small padding from left edge
    if (left + modalWidth > width - 10) {
      // Clamp so it never overflows to the right
      left = width - modalWidth - 10;
    }

    if (top < 10) top = 10; // top padding
    if (top + modalHeight > height - 10) {
      top = height - modalHeight - 10; // bottom padding
    }

    setOptionsModalPosition({ top, left });
    setSelectedService(service);
    setOptionsModalVisible(true);
  };

  // Function to handle selection of an option from ServiceOptionsModal
  const handleOptionSelect = option => {
    setOptionsModalVisible(false); // Always close options modal
    if (!selectedService) return;

    switch (option) {
      case 'view':
        // Set the service to be viewed and open the ServiceDetailModal
        setDetailModalVisible(true);
        break;
      case 'edit':
        // Map the backend data structure to match what AddServiceModal expects
        const mappedServiceData = {
          id: selectedService._id,
          serviceName: selectedService.title || selectedService.name, // Backend returns 'title'
          serviceImage: selectedService.image,
          subServices: selectedService.subServices
            ? selectedService.subServices.map((sub, index) => ({
                id:
                  sub._id ||
                  sub.id ||
                  `sub_${Date.now()}_${Math.random()
                    .toString(36)
                    .substring(2, 15)}_${index}`, // Ensure unique ID with index
                name: sub.name || sub.subServiceName, // Use 'name' for backend compatibility
                price: sub.price,
                time: sub.time,
                description: sub.description,
                image: sub.image || sub.subServiceImage, // Use 'image' for backend compatibility
              }))
            : [],
          isHiddenFromEmployee: selectedService.isHiddenFromEmployee || false,
        };
        console.log('Mapped service data for editing:', mappedServiceData);
        setServiceToEdit(mappedServiceData);
        setAddEditModalVisible(true);
        break;
      case 'delete':
        setServiceToDelete(selectedService);
        setConfirmModalVisible(true);
        break;
      case 'hide':
        (async () => {
          try {
            const token = await getAdminToken();
            if (!token) {
              Alert.alert(
                'Error',
                'Authentication token not found. Please login again.',
              );
              return;
            }
            const next = isServiceHidden(selectedService) ? 'show' : 'hide';
            await changeServiceStatus(selectedService._id, next, token);
            Alert.alert('Success', `Service marked as ${next}.`);
            fetchServices();
          } catch (e) {
            console.error('Error changing service status:', e);
            Alert.alert(
              'Error',
              e.message || 'Failed to change service status.',
            );
          }
        })();
        break;
      default:
        break;
    }
  };
  

  // Function to confirm deletion
  const confirmDeleteService = async () => {
    if (!serviceToDelete) return;

    try {
      // Ensure admin is authenticated for delete operation
      const token = await getAdminToken();
      if (!token) {
        Alert.alert(
          'Error',
          'Authentication token not found. Please login again.',
          [
            {
              text: 'OK',
              onPress: () => navigation.replace('AdminLogin'),
            },
          ]
        );
        setServiceToDelete(null);
        setConfirmModalVisible(false);
        return;
      }

      await deleteService(serviceToDelete._id, token);
      Alert.alert('Success', 'Service deleted successfully!');
      fetchServices(); // Refresh the services list

      setServiceToDelete(null);
      setConfirmModalVisible(false);
    } catch (e) {
      console.error('Error deleting service:', e);
      Alert.alert('Error', e.message || 'Failed to delete the service.');

      // Keep the modal open for retry
      // setServiceToDelete(serviceToDelete); // Keep the service selected
      // setConfirmModalVisible(true); // Keep modal open

      // Or close it but show error
      setServiceToDelete(null);
      setConfirmModalVisible(false);
    }
  };
  // Function to handle navigation to SubServicesScreen
  const handleServiceCardPress = service => {
    navigation.navigate('SubServices', { service: service });
  };

  // Build profile image like Employees screen
  const userProfileImage = authenticatedAdmin?.profilePicture;
  const profileImageSource = userProfileImage
    ? { uri: userProfileImage }
    : userProfileImagePlaceholder;

  const userName = authenticatedAdmin?.name || 'Guest';

  // Show loading state
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#A99226" />
        <Text style={styles.loadingText}>Loading services...</Text>
      </View>
    );
  }

  // Show error state
  if (error) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Error: {error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchServices}>
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
          <Image
            source={profileImageSource}
            style={styles.profileImage}
            resizeMode="cover"
          />
        </View>
      </View>

      {/* Services Title and Add New Services Button */}
      <View style={styles.servicesHeader}>
        <Text style={styles.servicesTitle}>Services</Text>
        <TouchableOpacity
          style={styles.addNewServicesButton}
          onPress={() => {
            setServiceToEdit(null);
            setAddEditModalVisible(true);
          }}
        >
          <Text style={styles.addNewServicesButtonText}>
            Add New Services
          </Text>
        </TouchableOpacity>
      </View>

      {/* Services Grid */}
      <FlatList
        data={services}
        keyExtractor={item => (item._id || item.id).toString()}
        numColumns={3}
        columnWrapperStyle={styles.servicesRow}
        contentContainerStyle={styles.servicesGridContainer}
        renderItem={({ item }) => (
          <View style={styles.serviceCol}>
            <ServiceCard
              service={item}
              onOptionsPress={handleCardOptionsPress}
              onPress={handleServiceCardPress}
            />
          </View>
        )}
        ListEmptyComponent={() => (
          <Text style={styles.loadingText}>No services available.</Text>
        )}
      />
    </View>

    {/* Modals */}
    <AddServiceModal
      visible={addEditModalVisible}
      onClose={() => setAddEditModalVisible(false)}
      onSave={handleSaveService}
      initialServiceData={serviceToEdit}
    />
    <ServiceOptionsModal
      visible={optionsModalVisible}
      onClose={() => setOptionsModalVisible(false)}
      onSelectOption={handleOptionSelect}
      position={optionsModalPosition}
    />
    <ServiceDetailModal
      visible={detailModalVisible}
      onClose={() => setDetailModalVisible(false)}
      service={selectedService}
    />
    <ConfirmationModal
      visible={confirmModalVisible}
      onClose={() => setConfirmModalVisible(false)}
      onConfirm={confirmDeleteService}
      message={`Are you sure you want to delete "${
        serviceToDelete?.name || serviceToDelete?.title
      }"? This action cannot be undone.`}
    />
  </View>
);
};

export default ServicesScreen;

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
  addNewServicesButton: {
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
  addNewServicesButtonText: {
    color: '#fff',
    fontSize: width * 0.018,
    fontWeight: '600',
  },
  servicesGridContainer: {
    paddingBottom: height * 0.05,
  },
  servicesRow: {
    justifyContent: 'flex-start',
    marginBottom: height * 0.025,
  },
  serviceCol: {
    width: '31.5%',
    marginRight: width * 0.009, // small horizontal gap between cards
  },
  serviceCard: {
    backgroundColor: '#3C3C3C',
    borderRadius: 3,
    width: '100%',
    minHeight: 250,
    marginBottom: 0,
    overflow: 'hidden',
    paddingBottom: height * 0.01,
    position: 'relative',
  },
  serviceImage: {
    width: '100%',
    aspectRatio: 122 / 190,
    borderRadius: 4.9,
    marginBottom: height * 0.01,
  },
  serviceName: {
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
