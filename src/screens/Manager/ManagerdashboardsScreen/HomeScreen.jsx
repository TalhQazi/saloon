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
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import NotificationBell from '../../../components/NotificationBell';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { getServices } from '../../../api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ServiceDetailModal from './modals/ServiceDetailModal';
import { DeviceEventEmitter } from 'react-native';
import {
  MANAGER_CART_UPDATED_EVENT,
  getManagerCartItems,
} from '../../../utils/managerCart';

const { width, height } = Dimensions.get('window');

const userProfileImagePlaceholder = require('../../../assets/images/logo.png');

const truncateUsername = username => {
  if (!username) return 'Guest';
  const words = username.split(' ');
  if (words.length <= 6) return username;
  return words.slice(0, 6).join(' ') + '...';
};

const getDisplayImageSource = image => {
  if (typeof image === 'string' && image.startsWith('http')) {
    return { uri: image };
  } else if (typeof image === 'number') {
    return image;
  }
  return null;
};

const loadManagerCartCount = async setCartCount => {
  try {
    const items = await getManagerCartItems();
    setCartCount(Array.isArray(items) ? items.length : 0);
  } catch (err) {
    console.error('[ManagerHomeScreen] Failed to load manager cart count:', err);
    setCartCount(0);
  }
};

const ServiceCard = ({ service, onPress }) => {
  const imageSource = getDisplayImageSource(service.image);
  return (
    <View style={styles.serviceCol}>
      <TouchableOpacity
        style={styles.serviceCard}
        onPress={() => onPress(service)}
      >
        {service.isHiddenFromEmployee && (
          <View style={styles.hiddenBadge}>
            <Text style={styles.hiddenBadgeText}>Hidden</Text>
          </View>
        )}
        
        {imageSource ? (
          <Image
            source={imageSource}
            style={styles.serviceImage}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.serviceImage, styles.noServiceImage]}>
            <Ionicons name="image-outline" size={width * 0.05} color="#999" />
            <Text style={styles.noImageText}>No Image</Text>
          </View>
        )}
        <Text style={styles.serviceName} numberOfLines={2}>
          {service.title || service.name}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const HomeScreen = () => {
  const navigation = useNavigation();
  const [userData, setUserData] = useState({
    name: 'Guest',
    profileImage: userProfileImagePlaceholder,
  });
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
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
          } else {
            navigation.replace('RoleSelection');
          }
        } else if (adminAuth) {
          const parsedData = JSON.parse(adminAuth);
          setUserData({
            name: parsedData.admin.name,
            profileImage: parsedData.admin.livePicture,
          });
        }
      } catch (e) {
        console.error('Failed to load user data:', e);
      }
    };
    loadUserData();
  }, []);

  const isServiceHidden = svc => {
    if (!svc) return false;
    return svc.status?.toLowerCase() === 'hide';
  };

  const fetchServices = async () => {
    setLoading(true);
    try {
      const data = await getServices({ type: 'show' });
      const list = Array.isArray(data) ? data : data?.services || [];
      const visible = list.filter(svc => !isServiceHidden(svc));
      setServices(visible);
      setError(null);
    } catch (e) {
      setError('Failed to load services.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const handleServiceCardPress = service => {
    const normalized = { ...service, id: service._id || service.id };
    navigation.navigate('SubHome', { service: normalized });
  };

  const profileImageSource = getDisplayImageSource(userData.profileImage) || userProfileImagePlaceholder;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#A99226" />
        <Text style={styles.loadingText}>Loading services...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerCenter}>
          <View style={styles.userInfo}>
            <Text style={styles.greeting}>Hello 👋</Text>
            <Text style={styles.userName}>{truncateUsername(userData.name)}</Text>
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
        <Text style={styles.servicesTitle}>Services</Text>
      </View>

      <ScrollView contentContainerStyle={styles.servicesGridContainer}>
        <View style={styles.servicesGrid}>
          {services.length > 0 ? (
            services.map(service => (
              <ServiceCard
                key={service._id}
                service={service}
                onPress={handleServiceCardPress}
              />
            ))
          ) : (
            <Text style={styles.noServicesText}>No services available.</Text>
          )}
        </View>
      </ScrollView>

      <ServiceDetailModal
        visible={detailModalVisible}
        onClose={() => setDetailModalVisible(false)}
        service={selectedService}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e1f20ff',
    paddingTop: height * 0.03,
    paddingHorizontal: width * 0.03, // Matches Admin
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
  servicesGridContainer: {
    paddingBottom: height * 0.05,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  // --- UPDATED CARD STYLING TO MATCH ADMIN ---
  serviceCol: {
    width: '31.5%',
    marginRight: width * 0.009, 
  },
  serviceCard: {
    backgroundColor: '#3C3C3C',
    borderRadius: 3,
    width: '100%',
    minHeight: 250,
    marginBottom: height * 0.025,
    overflow: 'hidden',
    paddingBottom: height * 0.01,
    position: 'relative',
  },
  serviceImage: {
    width: '100%',
    aspectRatio: 122 / 190, // Exact ratio from Admin
    borderRadius: 4.9,
    marginBottom: height * 0.01,
  },
  noServiceImage: {
    backgroundColor: '#2c2c2c',
    justifyContent: 'center',
    alignItems: 'center',
  },
  serviceName: {
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
  noImageText: {
    color: '#999',
    fontSize: width * 0.015,
    marginTop: 5,
  },
  noServicesText: {
    color: '#A9A9A9',
    fontSize: width * 0.025,
    textAlign: 'center',
    width: '100%',
    marginTop: 50,
  },
});

export default HomeScreen;