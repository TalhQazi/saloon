// src/screens/Admin/AdminScreens/adminauthscreen/AdminAuthGate.js
import React, { useEffect, useState } from 'react';
import {
  View,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
  Text,
} from 'react-native';
import { useUser } from '../../../../context/UserContext';

const { width } = Dimensions.get('window');

const AdminAuthGate = ({ navigation }) => {
  // We only care about isAppRegisteredInitially and isLoading for initial routing decision
  const { checkInitialRegistration, isLoading } = useUser(); // Removed isAuthenticated here
  const [isInitialCheckDone, setIsInitialCheckDone] = useState(false);
  const [isAppRegisteredInitially, setIsAppRegisteredInitially] =
    useState(false);

  useEffect(() => {
    const performInitialCheck = async () => {
      if (!isLoading) {
        // Ensure UserContext has finished its own loading
        const registered = await checkInitialRegistration();
        setIsAppRegisteredInitially(registered);
        setIsInitialCheckDone(true); // Mark initial check as complete
      }
    };
    performInitialCheck();
  }, [isLoading, checkInitialRegistration]);

  useEffect(() => {
    if (isInitialCheckDone) {
      if (!isAppRegisteredInitially) {
        // Scenario 1: App is NOT registered (first time install) -> Go to Register Screen.
        console.log(
          'AdminAuthGate: App not registered, navigating to AdminRegister',
        );
        navigation.replace('AdminRegister');
      } else {
        // Scenario 2: App IS registered (any subsequent launch) -> Always go to Login Screen
        console.log(
          'AdminAuthGate: App is registered, navigating to AdminLogin to re-authenticate',
        );
        navigation.replace('AdminLogin');
      }
    }
  }, [isInitialCheckDone, isAppRegisteredInitially, navigation]);

  if (isLoading || !isInitialCheckDone) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#A99226" />
        <Text style={styles.loadingText}>Preparing Admin Section...</Text>
      </View>
    );
  }

  return null; // This component will simply navigate away once conditions are met
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#161719',
    padding: width * 0.05,
  },
  loadingText: {
    marginTop: 10,
    color: '#fff',
    fontSize: width * 0.03,
  },
});

export default AdminAuthGate;
