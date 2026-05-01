import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { UserProvider } from './src/context/UserContext';
import { NotificationProvider } from './src/context/NotificationContext';
import { View, StyleSheet } from 'react-native'; 
import Toast from 'react-native-toast-message'; 

const App = () => {
  return (
    <View style={styles.container}>
      <UserProvider>
        <NotificationProvider>
          <SafeAreaProvider>
            <AppNavigator />
          </SafeAreaProvider>
        </NotificationProvider>
      </UserProvider>
      <Toast />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1, 
  },
});

export default App;
