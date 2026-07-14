// src/components/Sidebar.jsx (or .js) - This is where the change is required
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Image,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigationState } from '@react-navigation/native';

import AppLogo from '../assets/images/logo.png';

const { width, height } = Dimensions.get('window');

const sidebarItems = [
  { name: 'Home', icon: 'room-service' },
  { name: 'Marketplaces', icon: 'store' },
  { name: 'Deals', icon: 'tag-multiple' },
 // { name: 'Attendance', icon: 'account-check' },
  { name: 'Expense', icon: 'cash-multiple' },
  { name: 'AdvanceSalary', icon: 'cash-plus' },
  { name: 'AdvanceBooking', icon: 'calendar-check' },
  { name: 'Reminder', icon: 'bell-ring' },
  { name: 'Clients', icon: 'account-group' },
  { name: 'Sales', icon: 'cart' },
  { name: 'PrinterSettings', icon: 'printer' },
];

const Sidebar = ({ activeTab, onSelect, navigation }) => {
  const navigationState = useNavigationState(state => state);
  // Get the name of the currently active route in the navigation stack
  const currentRouteName = navigationState.routes[navigationState.index].name;

  // Determine the effective active tab for the sidebar's visual state
  // If the current route is SubHome or CartService, we want 'Home' to appear active in the sidebar.
  // Otherwise, use the activeTab prop passed from the parent.
  let currentActiveTab = activeTab;
  if (currentRouteName === 'SubHome' || currentRouteName === 'CartService') {
    currentActiveTab = 'Home';
  }
  if (currentRouteName === 'Submarket' || currentRouteName === 'Cartproduct') {
    currentActiveTab = 'Marketplaces';
  }
  if (currentRouteName === 'CartDealsScreen') {
    currentActiveTab = 'Deals';
  }

  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  const timeoutIdRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
      }
    };
  }, []);

  const handleSidebarPress = useCallback(
    tabName => {
      const currentRoute = navigationState.routes[navigationState.index];

      // Check if we're currently on a sub-screen (cart or detail screens)
      const isCurrentlyOnSubScreen =
        currentRoute.name === 'SubHome' ||
        currentRoute.name === 'Submarket' ||
        currentRoute.name === 'CartService' ||
        currentRoute.name === 'Cartproduct' ||
        currentRoute.name === 'CartDealsScreen';

      if (isCurrentlyOnSubScreen) {
        // For cart screens, replace the current screen with ManagerHomeScreen
        if (navigation && typeof navigation.replace === 'function') {
          // Replace the current screen to clear the navigation stack
          navigation.replace('ManagerHomeScreen', { targetTab: tabName });
        }
      } else {
        // Direct navigation for main tabs
        if (onSelectRef.current) {
          onSelectRef.current(tabName);
        }
      }
    },
    [navigation, navigationState],
  );

  return (
    <View style={styles.sidebar}>
      {/* Logo Section */}
      <View style={styles.logoContainer}>
        <Image source={AppLogo} style={styles.logo} resizeMode="contain" />
      </View>

      {/* Navigation Tabs */}
      <View style={styles.tabsContainer}>
        {sidebarItems.map(item => (
          <TouchableOpacity
            key={item.name}
            onPress={() => handleSidebarPress(item.name)}
            style={[
              styles.tab,
              // Use currentActiveTab for styling
              currentActiveTab === item.name && styles.activeTab,
            ]}
          >
            <MaterialCommunityIcons
              name={item.icon}
              size={width * 0.04}
              // Use currentActiveTab for icon color
              color={currentActiveTab === item.name ? '#fff' : '#A9A9A9'}
              style={styles.tabIcon}
            />
            <Text
              style={[
                styles.tabText,
                // Use currentActiveTab for text color/weight
                currentActiveTab === item.name && styles.tabTextActive,
              ]}
            >
              {item.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  sidebar: {
    width: width * 0.25,
    maxWidth: 270,
    backgroundColor: '#2A2D32',
    paddingVertical: height * 0.001,
    borderRightWidth: 1,
    borderRightColor: '#2A2D32',
  },
  logoContainer: {
    alignItems: 'center',
    // marginBottom: height * 0.03,
  },
  logo: {
    width: width * 0.2,
    height: width * 0.2,
    borderRadius: (width * 0.1) / 2,
    // marginBottom: height * 0.0001,
  },
  logoText: {
    color: '#A98C27',
    fontSize: width * 0.025,
    fontWeight: 'bold',
    fontFamily: 'Poppins-Bold',
  },
  userInfo: {
    paddingVertical: height * 0.02,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2D32',
    marginBottom: height * 0.03,
    alignItems: 'center',
  },
  tabsContainer: {
    marginTop: height * -0.02,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: height * 0.015,
    paddingHorizontal: width * 0.02,
    borderRadius: 2,
    marginBottom: height * 0.001,
  },
  activeTab: {
    backgroundColor: '#A98C27',
  },
  tabIcon: {
    marginRight: width * 0.02,
  },
  tabText: {
    color: '#A9A9A9',
    fontSize: width * 0.018,
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default Sidebar;
