// ManagerHomeScreen.js
import React, { useState, useCallback, useEffect, useRef } from 'react'; // Import useCallback
import { View, StyleSheet, Alert, Text, BackHandler } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import Sidebar from '../../../components/ManagerSidebar';

import HomeScreen from './HomeScreen';
import AdvanceBookingScreen from './AdvanceBookingScreen';
import AttendanceScreen from './AttendanceScreen';
import ClientsScreen from './ClientsScreen';
import DealsScreen from './DealsScreen';
import ExpenseScreen from './ExpenseScreen';
import Marketplace from './MarketplaceScreen';
import AdvanceSalary from './AdvanceSalary';
import PrinterSettingsScreen from './PrinterSettingsScreen';
import SalesScreen from './ManagerSalesScreen';

const ManagerHomeScreen = ({ navigation, route }) => {
  const [activeTab, setActiveTab] = useState('Home');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Authentication check function
  const checkAuthentication = async () => {
    try {
      const managerAuthData = await AsyncStorage.getItem('managerAuth');
      const adminAuthData = await AsyncStorage.getItem('adminAuth');
      
      if (managerAuthData) {
        const { token, isAuthenticated: authStatus } = JSON.parse(managerAuthData);
        if (token && authStatus) {
          setIsAuthenticated(true);
          return;
        }
      }
      
      if (adminAuthData) {
        const { token, isAuthenticated: authStatus } = JSON.parse(adminAuthData);
        if (token && authStatus) {
          setIsAuthenticated(true);
          return;
        }
      }
      
      Alert.alert('Authentication Error', 'Please login again.');
      navigation.replace('LiveCheck');
    } catch (error) {
      console.error('Authentication check failed:', error);
      Alert.alert('Authentication Error', 'Please login again.');
      navigation.replace('LiveCheck');
    } finally {
      setIsLoading(false);
    }
  };

  // Check authentication on component mount
  useEffect(() => {
    checkAuthentication();
  }, []);

  // Handle targetTab parameter from navigation
  useEffect(() => {
    if (route.params?.targetTab) {
      setActiveTab(route.params.targetTab);
      // Clear the parameter after using it
      navigation.setParams({ targetTab: undefined });
    }
  }, [route.params?.targetTab, navigation]);

  const handleTabSelect = useCallback(tabName => {
    setActiveTab(tabName);
  }, []);

  const isProcessingRef = useRef(false);
  const hasConfirmedLogoutRef = useRef(false);
  const isLogoutAlertVisibleRef = useRef(false);

  const doLogout = useCallback(async () => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    try {
      await AsyncStorage.removeItem('managerAuth');
    } catch (e) {
    }
    navigation.reset({ index: 0, routes: [{ name: 'LiveCheck' }] });
  }, [navigation]);

  const confirmLogout = useCallback(() => {
    if (isProcessingRef.current) return;
    if (isLogoutAlertVisibleRef.current) return;
    // If user has already confirmed once in this flow, don't show alert again
    if (hasConfirmedLogoutRef.current) {
      doLogout();
      return;
    }
    isLogoutAlertVisibleRef.current = true;
    Alert.alert(
      'Confirm Logout',
      'Are you sure you want to logout from this panel?',
      [
        {
          text: 'No',
          style: 'cancel',
          onPress: () => {
            isLogoutAlertVisibleRef.current = false;
          },
        },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: () => {
            hasConfirmedLogoutRef.current = true;
            isLogoutAlertVisibleRef.current = false;
            doLogout();
          },
        },
      ],
      { cancelable: true },
    );
  }, [doLogout]);

  useFocusEffect(
    useCallback(() => {
      const onHardwareBack = () => {
        if (isProcessingRef.current) return true;
        confirmLogout();
        return true;
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onHardwareBack);
      return () => sub.remove();
    }, [confirmLogout]),
  );

  useEffect(() => {
    const unsub = navigation.addListener('beforeRemove', e => {
      if (!navigation.isFocused()) {
        return;
      }
      if (isProcessingRef.current) return;
      e.preventDefault();
      confirmLogout();
    });
    return unsub;
  }, [navigation, confirmLogout]);
  const renderContent = () => {
    switch (activeTab) {
      case 'Home':
        return <HomeScreen />;
      case 'AdvanceBooking':
        return <AdvanceBookingScreen />;
      case 'Attendance':
        return <AttendanceScreen />;
      case 'Clients':
        return <ClientsScreen />;
      case 'Deals':
        return <DealsScreen />;
      case 'Expense':
        return <ExpenseScreen />;
      case 'Marketplaces':
        return <Marketplace />;
      case 'AdvanceSalary':
        return <AdvanceSalary />;
      case 'PrinterSettings':
        return <PrinterSettingsScreen />;
      case 'Sales':
        return <SalesScreen />;
      default:
        return <HomeScreen />;
    }
  };

  // Show loading screen while checking authentication
  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: '#fff', fontSize: 18 }}>Loading...</Text>
      </View>
    );
  }

  // Show authentication error if not authenticated
  if (!isAuthenticated) {
    return null; // Will redirect to login
  }

  return (
    <View style={styles.container}>
      {/* Pass the memoized handleTabSelect function as 'onSelect' */}
      <Sidebar
        activeTab={activeTab}
        onSelect={handleTabSelect}
        navigation={navigation}
      />
      <View style={styles.content}>{renderContent()}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#161719',
  },
  content: {
    flex: 1,
    backgroundColor: '#161719',
  },
});

export default ManagerHomeScreen;
