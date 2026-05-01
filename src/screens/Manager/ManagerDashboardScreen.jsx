import React, { useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, BackHandler, Alert } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ManagerDashboardScreen = () => {
  const navigation = useNavigation();

  // Confirm Logout logic (Manager root)
  const isProcessingRef = useRef(false);
  const hasConfirmedLogoutRef = useRef(false);

  const doLogout = useCallback(async () => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    try {
      await AsyncStorage.removeItem('managerAuth');
    } catch (e) {
      // no-op
    }
    navigation.reset({ index: 0, routes: [{ name: 'LiveCheck' }] });
  }, [navigation]);

  const confirmLogout = useCallback(() => {
    if (isProcessingRef.current) return;
    if (hasConfirmedLogoutRef.current) {
      doLogout();
      return;
    }
    Alert.alert(
      'Confirm Logout',
      'Are you sure you want to logout from this panel?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: () => {
            hasConfirmedLogoutRef.current = true;
            doLogout();
          },
        },
      ],
      { cancelable: true },
    );
  }, [doLogout]);

  // Intercept Android hardware back only on this root screen
  useFocusEffect(
    useCallback(() => {
      const onHardwareBack = () => {
        if (isProcessingRef.current) return true;
        confirmLogout();
        return true; // consume
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onHardwareBack);
      return () => sub.remove();
    }, [confirmLogout]),
  );

  // Intercept navigation back/gesture
  useEffect(() => {
    const unsub = navigation.addListener('beforeRemove', e => {
      // Only block when this screen is actually focused.
      // Otherwise, when resetting/navigating from child screens, multiple screens can trigger the same alert.
      if (!navigation.isFocused()) {
        return;
      }
      if (isProcessingRef.current) return; // allow removal
      e.preventDefault();
      confirmLogout();
    });
    return unsub;
  }, [navigation, confirmLogout]);

  useEffect(() => {
    navigation.replace('LiveCheck');
  }, [navigation]); 

  return (
    <View style={styles.container}>
      <Text style={styles.loadingText}>Loading Manager Panel.....</Text>
      <Text style={styles.loadingText}>Redirecting to Live Check for authentication.</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E1E1E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 18,
    marginBottom: 10,
  },
});

export default ManagerDashboardScreen;
