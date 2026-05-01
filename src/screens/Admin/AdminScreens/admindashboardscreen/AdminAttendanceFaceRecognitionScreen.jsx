import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
  Easing,
  Modal,
  ActivityIndicator,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
} from 'react-native-vision-camera';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { adminCheckIn, adminCheckOut } from '../../../../api/attendanceService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import moment from 'moment';

const { width, height } = Dimensions.get('window');

// Define BASE_URL - you should replace this with your actual backend URL
const BASE_URL = 'https://your-ngrok-url.ngrok.io'; // Replace with your actual ngrok URL

const AdminAttendanceFaceRecognitionScreen = ({ route }) => {
  const { adminId, adminName, attendanceStatus, attendanceDate, onSuccess } =
    route.params || {};
  const navigation = useNavigation();

  // VisionCamera permission hook
  const { hasPermission, requestPermission } = useCameraPermission();

  const [status, setStatus] = useState('Initializing camera...');
  const [isProcessing, setIsProcessing] = useState(false);
  const [capturedImageUri, setCapturedImageUri] = useState(null);
  const [cameraInitialized, setCameraInitialized] = useState(false);

  // State for custom alert modal
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertCallback, setAlertCallback] = useState(null);

  // Refs & animations
  const cameraRef = useRef(null);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  // Get camera devices - prefer front camera for face recognition
  const frontDevice = useCameraDevice('front');
  const backDevice = useCameraDevice('back');
  const device = frontDevice ?? backDevice ?? null;

  // Show custom alert modal
  const showCustomAlert = useCallback((message, callback = null) => {
    setAlertMessage(message);
    setAlertCallback(() => callback);
    setShowAlertModal(true);
  }, []);

  const hideCustomAlert = useCallback(() => {
    setShowAlertModal(false);
    setAlertMessage('');
    if (alertCallback) {
      alertCallback();
      setAlertCallback(null);
    }
  }, [alertCallback]);

  // 🔐 Retrieve token from AsyncStorage
  const getAuthToken = async () => {
    try {
      console.log('🔑 [Auth] Retrieving token from AsyncStorage...');
      const data = await AsyncStorage.getItem('adminAuth');
      console.log('🔑 [Auth] Raw auth data:', data ? 'Found' : 'Not found');

      if (data) {
        const { token, admin } = JSON.parse(data);
        console.log('🔑 [Auth] Parsed auth data:', {
          tokenExists: !!token,
          adminExists: !!admin,
          adminName: admin?.name,
        });
        return token;
      }

      console.log('❌ [Auth] No auth data found in AsyncStorage');
      return null;
    } catch (error) {
      console.error('❌ [Auth] Failed to read token from storage:', error);
      return null;
    }
  };

  // Initialize camera
  useEffect(() => {
    const initializeCamera = async () => {
      if (hasPermission && device) {
        // Add a small delay to ensure camera is ready
        setTimeout(() => {
          setStatus('Camera ready. Position your face in the frame.');
          setCameraInitialized(true);

          // Fade in animation
          Animated.parallel([
            Animated.timing(opacityAnim, {
              toValue: 1,
              duration: 800,
              useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
              toValue: 1,
              duration: 800,
              easing: Easing.out(Easing.back(1.7)),
              useNativeDriver: true,
            }),
          ]).start();
        }, 500);
      } else {
        setStatus('Camera permission required');
      }
    };

    initializeCamera();
  }, [hasPermission, device, opacityAnim, scaleAnim]);

  // Ensure camera stays active when screen is focused
  useFocusEffect(
    useCallback(() => {
      if (hasPermission && device) {
        setCameraInitialized(true);
      }
      return () => {
        // Cleanup when screen loses focus
        setCameraInitialized(false);
      };
    }, [hasPermission, device]),
  );

  // Test network connectivity with ngrok-specific handling
  const testNetworkConnection = async () => {
    try {
      console.log('🌐 [Network Test] Testing ngrok connection...');
      console.log('🌐 [Network Test] Base URL:', BASE_URL);

      // Test the actual API endpoint we'll be using
      const testUrl = `${BASE_URL}/admin/all`; // Simple GET endpoint
      console.log('🌐 [Network Test] Testing API endpoint:', testUrl);

      const response = await fetch(testUrl, {
        method: 'GET',
        headers: {
          'ngrok-skip-browser-warning': 'true',
          Accept: 'application/json',
        },
        timeout: 10000,
      });

      console.log('🌐 [Network Test] API test result:', response.status);

      if (response.status === 200 || response.status === 401) {
        console.log('✅ [Network Test] Server is reachable');
        return true;
      }

      return response.status < 500;
    } catch (error) {
      console.error('🌐 [Network Test] Connection failed:', error.message);

      // Check if it's a network issue or server issue
      if (
        error.message.includes('Network request failed') ||
        error.code === 'NETWORK_ERROR'
      ) {
        console.error('❌ [Network Test] Network connectivity issue detected');

        // Try to ping a reliable external service to check general internet connectivity
        try {
          const internetTest = await fetch('https://httpbin.org/status/200', {
            method: 'HEAD',
            timeout: 5000,
          });
          console.log('🌐 [Network Test] Internet connectivity: OK');
          console.log(
            '❌ [Network Test] Issue is with ngrok server connectivity',
          );
          return false; // Internet works, but our server doesn't
        } catch (internetError) {
          console.error('❌ [Network Test] No internet connectivity');
          return false;
        }
      }

      return false;
    }
  };

  // Capture photo and process attendance
  const capturePhoto = useCallback(async () => {
    if (!cameraRef.current || isProcessing || !cameraInitialized) {
      console.log('Camera not ready:', {
        cameraRef: !!cameraRef.current,
        isProcessing,
        cameraInitialized,
      });
      return;
    }

    try {
      setIsProcessing(true);
      setStatus('Capturing photo...');

      // Check if camera is still active
      if (!device) {
        throw new Error('Camera device not available');
      }

      // Start progress animation
      progressAnim.setValue(0);
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: false,
      }).start();

      console.log('Taking photo with camera...');
      const photo = await cameraRef.current.takePhoto({
        quality: 0.8,
        skipMetadata: true,
        flash: 'off',
      });

      console.log('Photo captured:', photo);
      setCapturedImageUri(`file://${photo.path}`);
      setStatus('Processing face recognition...');

      // Process admin attendance
      await processAdminAttendance(`file://${photo.path}`);
    } catch (error) {
      console.error('Photo capture failed:', error);
      let errorMessage = 'Failed to capture photo. Please try again.';

      if (error.message.includes('Camera is closed')) {
        errorMessage = 'Camera is not active. Please go back and try again.';
      } else if (error.message.includes('permission')) {
        errorMessage =
          'Camera permission is required. Please grant permission.';
      }

      showCustomAlert(errorMessage);
    } finally {
      setIsProcessing(false);
      progressAnim.setValue(0);
    }
  }, [isProcessing, progressAnim, cameraInitialized, device]);

  // Process admin attendance with face recognition
  const processAdminAttendance = async photoUri => {
    try {
      console.log('🔍 [Admin Attendance] Starting face recognition process...');

      // Test network connectivity first (but don't block if test fails)
      console.log('🌐 [Network Test] Testing connectivity...');
      const isConnected = await testNetworkConnection();
      
      if (!isConnected) {
        showCustomAlert(
          'Network connection issue detected. Please check:\n\n1. Internet connection\n2. Ngrok server is running\n3. Try again in a moment',
          () => {
            setStatus('Ready to capture. Position your face in the frame.');
          }
        );
        return;
      }

      // Get admin token directly from AsyncStorage (same as attendance service)
      let token = null;
      try {
        const adminAuthData = await AsyncStorage.getItem('adminAuth');
        console.log(
          '🔍 [Admin Attendance] Admin auth data:',
          adminAuthData ? 'Found' : 'Not found',
        );

        if (adminAuthData) {
          const parsedData = JSON.parse(adminAuthData);
          console.log('🔍 [Admin Attendance] Parsed admin auth data:', {
            hasToken: !!parsedData.token,
            tokenType: parsedData.token
              ? parsedData.token.startsWith('eyJ')
                ? 'JWT'
                : 'Face Auth'
              : 'None',
            hasAdmin: !!parsedData.admin,
            isAuthenticated: parsedData.isAuthenticated,
          });

          token = parsedData.token;
          console.log(
            '🔍 [Admin Attendance] Admin token found:',
            token ? token.substring(0, 20) + '...' : 'null',
          );
        }
      } catch (error) {
        console.error(
          '❌ [Admin Attendance] Failed to read admin token:',
          error,
        );
      }

      if (!token) {
        console.error(
          '❌ [Admin Attendance] No admin authentication token found',
        );
        showCustomAlert('Session expired. Please log in again.', () => {
          navigation.goBack();
        });
        return;
      }

      console.log(
        '✅ [Admin Attendance] Using admin token:',
        token.substring(0, 20) + '...',
      );

      const attendanceType =
        attendanceStatus === 'Check-In' ? 'checkin' : 'checkout';

      console.log('📡 [API] Sending admin attendance request:', {
        adminId,
        attendanceType,
      });

      console.log('📤 [FormData] AdminId:', adminId);
      console.log('📤 [FormData] AttendanceType:', attendanceType);
      console.log('📤 [FormData] Photo URI:', photoUri);

      // Validate required parameters
      if (!adminId || !attendanceType) {
        throw new Error('Admin ID and attendance type are required');
      }

      // Use attendance service
      let response;
      if (attendanceType === 'checkin') {
        response = await adminCheckIn(adminId, photoUri);
      } else {
        response = await adminCheckOut(adminId, photoUri);
      }

      console.log('✅ [API Success] Admin attendance response:', response);

      if (response && (response.success || response.message)) {
        const attendanceData = response.attendance || response;

        showCustomAlert(
          `✅ Admin ${attendanceStatus} successful!\n\nWelcome ${adminName}!\n\nTime: ${moment().format(
            'hh:mm A',
          )}\nDate: ${moment(attendanceDate).format('MMM DD, YYYY')}`,
          () => {
            // Call success callback and navigate back
            if (onSuccess) {
              onSuccess({
                adminId,
                adminName,
                attendanceStatus,
                attendanceDate,
                timestamp: new Date(),
                response: attendanceData,
              });
            }
            navigation.goBack();
          },
        );
      } else {
        throw new Error('Unexpected response status');
      }
    } catch (error) {
      console.error('🚨 [API Error] Admin attendance failed:', {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        responseData: error.response?.data,
        config: {
          url: error.config?.url,
          method: error.config?.method,
        },
      });

      let errorMessage = 'Face recognition failed. ';

      if (error.response?.status === 401) {
        errorMessage = 'Session expired. Please log in again.';
      } else if (error.response?.status === 404) {
        errorMessage =
          'You are not registered as an admin. Please contact system administrator.';
      } else if (error.response?.status === 400) {
        const responseMessage = error.response?.data?.message || '';
        if (
          responseMessage.includes('face') ||
          responseMessage.includes('match')
        ) {
          errorMessage =
            'Face verification failed. You are not recognized as a registered admin.';
        } else {
          errorMessage =
            responseMessage || 'Invalid request. Please check your details.';
        }
      } else if (
        error.code === 'ENETUNREACH' ||
        error.code === 'ECONNREFUSED'
      ) {
        errorMessage =
          'Network error. Cannot reach server. Please check your internet connection.';
      } else if (
        error.code === 'ECONNABORTED' ||
        error.message.includes('timeout')
      ) {
        errorMessage =
          'Request timed out. Server is taking too long to respond. Please try again.';
      } else if (
        error.message.includes('Network Error') ||
        error.message.includes('Network request failed')
      ) {
        errorMessage =
          'Network connection failed. Please check:\n\n1. Internet connection\n2. Ngrok server is running\n3. Ngrok URL is correct\n4. Try again in a moment';
      } else if (!error.response && error.request) {
        errorMessage =
          'No response from server. Please check:\n\n1. Internet connection\n2. Ngrok server is running\n3. Backend server is active\n4. API endpoint is correct';
      } else if (error.code === 'ERR_NETWORK') {
        errorMessage =
          'Network error detected. Please verify:\n\n1. Ngrok tunnel is active\n2. Backend server is running\n3. Internet connection is stable';
      } else if (error.message.includes('Admin ID and attendance type are required')) {
        errorMessage = 'Missing required information. Please try again.';
      } else {
        errorMessage = `Unexpected error: ${error.message}`;
      }

      showCustomAlert(`❌ ${errorMessage}`, () => {
        setStatus('Ready to capture. Position your face in the frame.');
      });
    }
  };

  // Handle back navigation
  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // Permission request UI
  if (!hasPermission) {
    return (
      <View style={styles.centeredView}>
        <Text style={styles.statusText}>
          Camera permission required for face recognition
        </Text>
        <TouchableOpacity
          style={styles.permissionButton}
          onPress={() => requestPermission()}
        >
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.permissionButton, styles.backButton]}
          onPress={handleGoBack}
        >
          <Text style={styles.permissionButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // No camera device
  if (!device) {
    return (
      <View style={styles.centeredView}>
        <Text style={styles.statusText}>No camera device found</Text>
        <TouchableOpacity
          style={[styles.permissionButton, styles.backButton]}
          onPress={handleGoBack}
        >
          <Text style={styles.permissionButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Admin Face Recognition</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Camera View */}
      <View style={styles.cameraContainer}>
        <Animated.View
          style={[
            styles.cameraWrapper,
            {
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <Camera
            ref={cameraRef}
            style={styles.camera}
            device={device}
            isActive={cameraInitialized && hasPermission}
            photo={true}
            enableZoomGesture={false}
            enableHighQualityPhotos={true}
          />

          {/* Face detection overlay */}
          <View style={styles.overlay}>
            <View style={styles.faceFrame} />
          </View>
        </Animated.View>
      </View>

      {/* Status and Info */}
      <View style={styles.infoContainer}>
        <Text style={styles.adminInfo}>
          Admin: {adminName} (ID: {adminId})
        </Text>
        <Text style={styles.attendanceInfo}>
          {attendanceStatus} • {moment(attendanceDate).format('MMM DD, YYYY')}
        </Text>
        <Text style={styles.statusText}>{status}</Text>

        {isProcessing && (
          <View style={styles.processingContainer}>
            <ActivityIndicator size="large" color="#A98C27" />
            <Animated.View
              style={[
                styles.progressBar,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>
        )}
      </View>

      {/* Capture Button */}
      <View style={styles.captureContainer}>
        <TouchableOpacity
          style={[
            styles.captureButton,
            isProcessing && styles.captureButtonDisabled,
          ]}
          onPress={capturePhoto}
          disabled={isProcessing || !cameraInitialized}
        >
          <View style={styles.captureButtonInner}>
            {isProcessing ? (
              <ActivityIndicator size="large" color="#fff" />
            ) : (
              <Ionicons name="camera" size={40} color="#fff" />
            )}
          </View>
        </TouchableOpacity>
        <Text style={styles.captureText}>
          {isProcessing ? 'Processing...' : 'Tap to Capture'}
        </Text>
      </View>

      {/* Custom Alert Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showAlertModal}
        onRequestClose={hideCustomAlert}
      >
        <View style={styles.alertCenteredView}>
          <View style={styles.alertModalView}>
            <Text style={styles.alertModalText}>{alertMessage}</Text>
            <TouchableOpacity
              style={styles.alertButton}
              onPress={hideCustomAlert}
            >
              <Text style={styles.alertButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#1a1a1a',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  placeholder: {
    width: 40,
  },
  cameraContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  cameraWrapper: {
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  faceFrame: {
    width: '70%',
    height: '70%',
    borderWidth: 3,
    borderColor: '#A98C27',
    borderRadius: 150,
    borderStyle: 'dashed',
  },
  infoContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    alignItems: 'center',
  },
  adminInfo: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  attendanceInfo: {
    color: '#A98C27',
    fontSize: 14,
    marginBottom: 10,
  },
  statusText: {
    color: '#ccc',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 10,
  },
  processingContainer: {
    alignItems: 'center',
    width: '100%',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#A98C27',
    marginTop: 10,
    borderRadius: 2,
  },
  captureContainer: {
    alignItems: 'center',
    paddingBottom: 50,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#A98C27',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  captureButtonDisabled: {
    backgroundColor: '#666',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureText: {
    color: '#ccc',
    fontSize: 12,
  },
  permissionButton: {
    backgroundColor: '#A98C27',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    marginVertical: 10,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  alertCenteredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  alertModalView: {
    margin: 20,
    backgroundColor: '#1F1F1F',
    borderRadius: 15,
    padding: 30,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    maxWidth: width * 0.8,
  },
  alertModalText: {
    marginBottom: 20,
    textAlign: 'center',
    color: '#fff',
    fontSize: 16,
    lineHeight: 24,
  },
  alertButton: {
    backgroundColor: '#A98C27',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 30,
    elevation: 2,
  },
  alertButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 16,
  },
});

export default AdminAttendanceFaceRecognitionScreen;