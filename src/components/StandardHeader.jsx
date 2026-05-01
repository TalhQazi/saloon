import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Image,
  TextInput,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage'; // ➡️ Import AsyncStorage
import { useNotifications } from '../context/NotificationContext';

const { width, height } = Dimensions.get('window');

const userProfileImagePlaceholder = require('../assets/images/logo.png');

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

const StandardHeader = ({
  showBackButton = false,
  onBackPress,
  searchPlaceholder = 'Search anything',
  onSearchChange,
  searchValue = '',
  showNotifications = true,
  sourcePanel = 'manager',
  profileImage,
}) => {
  const navigation = useNavigation();
  const { unreadCount, refreshNotifications } = useNotifications?.() || {};
  // ➡️ Initialize state to store user data
  const [userData, setUserData] = useState({
    name: 'Guest',
    profileImage: userProfileImagePlaceholder,
  });

  // ➡️ Use useEffect to load user data from AsyncStorage
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const managerAuth = await AsyncStorage.getItem('managerAuth');
        const adminAuth = await AsyncStorage.getItem('adminAuth');
        if (sourcePanel === 'admin') {
          if (adminAuth) {
            const parsedData = JSON.parse(adminAuth);
            setUserData({
              name: parsedData.admin?.name || 'Admin',
              profileImage:
                parsedData.admin?.livePicture || parsedData.admin?.profilePicture,
            });
          } else if (managerAuth) {
            const parsedData = JSON.parse(managerAuth);
            setUserData({
              name: parsedData.manager?.name || 'Manager',
              profileImage:
                parsedData.manager?.livePicture ||
                parsedData.manager?.profilePicture,
            });
          }
        } else {
          if (managerAuth) {
            const parsedData = JSON.parse(managerAuth);
            setUserData({
              name: parsedData.manager?.name || 'Manager',
              profileImage:
                parsedData.manager?.livePicture ||
                parsedData.manager?.profilePicture,
            });
          } else if (adminAuth) {
            const parsedData = JSON.parse(adminAuth);
            setUserData({
              name: parsedData.admin?.name || 'Admin',
              profileImage:
                parsedData.admin?.livePicture || parsedData.admin?.profilePicture,
            });
          }
        }
      } catch (e) {
        console.error('Failed to load user data from storage:', e);
      }
    };
    loadUserData();
  }, [sourcePanel]);

  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      if (sourcePanel === 'admin') {
        navigation.replace('AdminMainDashboard');
      } else {
        navigation.replace('ManagerHomeScreen', { targetTab: 'Home' });
      }
    }
  };
  // ➡️ Get the correct image source from the state, with a fallback
  const profileImageSource =
    getDisplayImageSource(userData.profileImage) || userProfileImagePlaceholder;

  return (
    <View style={styles.header}>
      <View style={styles.headerCenter}>
        <View style={styles.userInfo}>
          <Text style={styles.greeting}>Hello 👋</Text>
          {/* ➡️ Use the user name from the state */}
          <Text style={styles.userName}>{truncateUsername(userData.name)}</Text>
        </View>
        {/* <View style={styles.searchBarContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder={searchPlaceholder}
            placeholderTextColor="#A9A9A9"
            value={searchValue}
            onChangeText={onSearchChange}
          />
          <Ionicons
            name="search"
            size={width * 0.027}
            color="#A9A9A9"
            style={styles.searchIcon}
          />
        </View> */}
      </View>

      {showNotifications && (
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.cartButton}
            onPress={() => navigation.navigate('ManagerCartScreen')}
          >
            <Ionicons
              name="cart-outline"
              size={width * 0.055}
              color="#fff"
            />
          </TouchableOpacity>
          {sourcePanel === 'admin' && (
            <TouchableOpacity
              style={styles.notificationButton}
              onPress={() => navigation.navigate('AdminCartScreen')}
            >
              <MaterialCommunityIcons
                name="cart-outline"
                size={width * 0.037}
                color="#fff"
              />
            </TouchableOpacity>
          )}
          {/* ➡️ Use the dynamic profile image source */}
          <Image
            source={profileImageSource}
            style={styles.profileImage}
            resizeMode="cover"
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
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
  backButton: {
    backgroundColor: '#2A2D32',
    borderRadius: (width * 0.06) / 2,
    padding: width * 0.01,
    marginRight: width * 0.02,
    justifyContent: 'center',
    alignItems: 'center',
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
    borderRadius: 8,
    padding: width * 0.000001,
    marginRight: width * 0.015,
    height: width * 0.058,
    width: width * 0.058,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF3B30',
  },
  profileImage: {
    width: width * 0.058,
    height: width * 0.058,
    borderRadius: (width * 0.058) / 2,
  },
});

export default StandardHeader;
