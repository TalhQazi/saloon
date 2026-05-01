// src/screens/Admin/AdminScreens/adminauthscreen/AdminRegisterScreen.js
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
import axios from 'axios';
import { useUser } from '../../../../context/UserContext';
import { BASE_URL } from '../../../../api/config';

const { width, height } = Dimensions.get('window');

const AdminRegisterScreen = ({ navigation }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { registerUser } = useUser();

  const gradientColors = ['#161719', '#2A2D32'];

  const isValidEmail = email => {
    const regex = /\S+@\S+\.\S+/;
    return regex.test(email);
  };

  const handleRegister = async () => {
    if (!name || !email || !password || !confirmPassword || !phoneNumber) {
      Alert.alert('Registration Error', 'Please fill all fields.');
      return;
    }

    if (!isValidEmail(email)) {
      Alert.alert('Registration Error', 'Please enter a valid email address.');
      return;
    }

    if (password.length < 8) {
      Alert.alert(
        'Registration Error',
        'Password must be at least 8 characters long.',
      );
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Registration Error', 'Passwords do not match.');
      return;
    }

    // Clean phone number (remove spaces, dashes, parentheses)
    const cleanPhoneNumber = phoneNumber.replace(/[\s\-\(\)]/g, '');

    // Validate phone number length (11-13 digits)
    if (cleanPhoneNumber.length < 11 || cleanPhoneNumber.length > 13) {
      Alert.alert(
        'Registration Error',
        'Phone number must be 11-13 digits long',
      );
      return;
    }

    // Validate phone number format (must start with 03 or +92)
    if (
      !cleanPhoneNumber.startsWith('03') &&
      !cleanPhoneNumber.startsWith('+92')
    ) {
      Alert.alert(
        'Registration Error',
        'Phone number must start with 03 or +92',
      );
      return;
    }

    try {
      setLoading(true);
      console.log('🔍 Attempting admin registration...');
      console.log('🔍 Registration URL:', `${BASE_URL}/admin/add`);
      console.log('🔍 Registration data:', { name, email, phoneNumber });

      // API Call
      const response = await axios.post(`${BASE_URL}/admin/add`, {
        name,
        email,
        password,
        confirmPassword,
        phoneNumber: cleanPhoneNumber,
      });

      console.log('✅ Registration Response Status:', response.status);
      console.log('✅ Registration Response Data:', response.data);

      if (response.status === 201) {
        // Also save user data to AsyncStorage using UserContext
        await registerUser(name, email, password, cleanPhoneNumber);
        console.log('✅ UserContext registration completed');

        Alert.alert(
          'Registration Successful!',
          response.data.message ||
            'Your admin account has been created successfully.',
          [
            {
              text: 'OK',
              onPress: () => {
                console.log('✅ Navigating to AdminLogin');
                navigation.replace('AdminLogin');
              },
            },
          ],
        );
      }
    } catch (error) {
      console.error('❌ Registration Error Details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        config: error.config,
      });
      Alert.alert(
        'Error',
        error.response?.data?.message ||
          error.message ||
          'Registration failed. Please try again.',
      );
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
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scrollViewContent}>
          <Text style={styles.welcomeText}>Admin Registration</Text>
          <Text style={styles.instructionText}>
            Please enter your details to create an admin account
          </Text>

          {/* Name */}
          <TextInput
            style={styles.input}
            placeholder="Full Name"
            placeholderTextColor="#888"
            value={name}
            onChangeText={setName}
          />

          {/* Email */}
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#888"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          {/* Phone Number */}
          <TextInput
            style={styles.input}
            placeholder="e.g., 03001234567 or +923001234567"
            placeholderTextColor="#888"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
          />

          {/* Password */}
          <TextInput
            style={styles.input}
            placeholder="Password (min 8 char)"
            placeholderTextColor="#888"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          {/* Confirm Password */}
          <TextInput
            style={styles.input}
            placeholder="Confirm Password"
            placeholderTextColor="#888"
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />

          {/* Register Button */}
          <TouchableOpacity
            style={styles.registerButton}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#222" />
            ) : (
              <Text style={styles.buttonText}>Register</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: width * 0.05,
    paddingVertical: height * 0.05,
  },
  welcomeText: {
    fontSize: width * 0.05,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: height * 0.01,
    textAlign: 'center',
  },
  instructionText: {
    fontSize: width * 0.03,
    color: '#bbb',
    marginBottom: height * 0.03,
    textAlign: 'center',
  },
  input: {
    width: '80%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: '#fff',
    padding: width * 0.025,
    borderRadius: 8,
    fontSize: width * 0.035,
    marginBottom: height * 0.02,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  registerButton: {
    backgroundColor: '#A99226',
    paddingVertical: height * 0.018,
    paddingHorizontal: width * 0.05,
    borderRadius: 8,
    width: '80%',
    alignItems: 'center',
    marginTop: height * 0.03,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  buttonText: {
    color: '#222',
    fontSize: width * 0.04,
    fontWeight: 'bold',
  },
});

export default AdminRegisterScreen;
