// src/screens/Admin/AdminScreens/adminauthscreen/AdminLoginScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Alert,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { BASE_URL } from '../../../../api/config';

const { width } = Dimensions.get('window');

// Utility: Save admin auth data
const saveAdminAuth = async authData => {
  try {
    await AsyncStorage.setItem('adminAuth', JSON.stringify(authData));
  } catch (error) {
    console.error('Failed to save admin session:', error);
  }
};

const AdminLoginScreen = () => { 
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secureText, setSecureText] = useState(true);
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();

  const gradientColors = ['#2A2D32', '#161719'];

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Login Error', 'Please enter both email and password.');
      return;
    }

    try {
      setLoading(true);
      console.log('🔍 Attempting admin login with:', email);

      const response = await axios.post(`${BASE_URL}/admin/login`, {
        email,
        password,
      });

      console.log('✅ Login Success:', response.data);

      const { token, admin } = response.data;

      if (response.status === 200 && token) {
        // 📦 Save full session with login type flag
        await saveAdminAuth({
          token,
          admin: { ...admin, loginType: 'credentials' },
          isAuthenticated: true,
        });

        Alert.alert(
          'Login Successful',
          `Welcome back, ${admin.name || 'Admin'}!`,
          [
            {
              text: 'OK',
              onPress: () => {
                console.log('✅ Navigating to AdminMainDashboard');
                navigation.replace('AdminMainDashboard');
              },
            },
          ],
        );
      }
    } catch (error) {
      console.error('❌ Login Error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });

      let errorMessage = 'An unknown error occurred.';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.status === 401) {
        errorMessage = 'Invalid credentials.';
      } else if (error.request) {
        errorMessage = 'No response from server. Check your connection.';
      }

      Alert.alert('Login Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor={gradientColors[0]} />
      <LinearGradient colors={gradientColors} style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollViewContent}>
          <View style={styles.loginBox}>
            {/* Welcome Header */}
            <Text style={styles.welcomeText}>Welcome back!</Text>
            <Text style={styles.instructionText}>
              Please sign in to access your admin dashboard
            </Text>

            {/* Email Input */}
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#A9A9A9"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              textContentType="emailAddress"
            />

            {/* Password Input with Eye Toggle */}
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Password"
                placeholderTextColor="#A9A9A9"
                secureTextEntry={secureText}
                value={password}
                onChangeText={setPassword}
                autoComplete="password"
                textContentType="password"
              />
              <TouchableOpacity
                onPress={() => setSecureText(!secureText)}
                style={styles.eyeIcon}
              >
                <Ionicons
                  name={secureText ? 'eye-off-outline' : 'eye-outline'}
                  size={24}
                  color="#A9A9A9"
                />
              </TouchableOpacity>
            </View>

            {/* Login Button */}
            <TouchableOpacity
              style={styles.loginButton}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Login</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
};

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loginBox: {
    width: width * 0.85,
    maxWidth: 400,
    backgroundColor: 'rgba(40, 40, 40, 0.6)',
    borderRadius: 12,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  instructionText: {
    fontSize: 14,
    color: '#BBBBBB',
    marginBottom: 30,
    textAlign: 'center',
    lineHeight: 18,
  },
  input: {
    width: '100%',
    height: 50,
    borderColor: '#4E4E4E',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    color: '#FFFFFF',
    backgroundColor: 'transparent',
    marginBottom: 20,
    fontSize: 16,
  },
  passwordContainer: {
    width: '100%',
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: '#4E4E4E',
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 25,
    paddingHorizontal: 4,
  },
  passwordInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 16,
    color: '#FFFFFF',
    fontSize: 16,
  },
  eyeIcon: {
    padding: 8,
  },
  loginButton: {
    backgroundColor: '#A99226',
    width: '100%',
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});

export default AdminLoginScreen;
