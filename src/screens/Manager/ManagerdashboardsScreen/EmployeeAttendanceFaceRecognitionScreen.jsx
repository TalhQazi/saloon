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
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../../../api/config';
import ImageResizer from 'react-native-image-resizer';

const { width, height } = Dimensions.get('window');

const EmployeeAttendanceFaceRecognitionScreen = () => {
  const navigation = useNavigation();

  // VisionCamera permission hook
  const { hasPermission, requestPermission } = useCameraPermission();

  const [status, setStatus] = useState('Initializing camera...');
  const [isProcessing, setIsProcessing] = useState(false);
  const [capturedImageUri, setCapturedImageUri] = useState(null);
  const [cameraInitialized, setCameraInitialized] = useState(false);
  const [authToken, setAuthToken] = useState(null); // Added auth token state

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
  const [cameraPosition, setCameraPosition] = useState('front');
  const device =
    (cameraPosition === 'front' ? frontDevice : backDevice) ??
    (cameraPosition === 'front' ? backDevice : frontDevice) ??
    null;

  const handleToggleCamera = useCallback(() => {
    setCameraInitialized(false);
    setCameraPosition(prev => (prev === 'front' ? 'back' : 'front'));
  }, []);

  // Load authentication token on component mount
  useEffect(() => {
    const loadAuthToken = async () => {
      try {
        // Try to get token from different storage keys
        const adminAuth = await AsyncStorage.getItem('adminAuth');
        const managerAuth = await AsyncStorage.getItem('managerAuth');
        const employeeAuth = await AsyncStorage.getItem('employeeAuth');

        let token = null;
        let authData = null;

        if (adminAuth) {
          authData = JSON.parse(adminAuth);
          if (authData.token && authData.isAuthenticated) {
            token = authData.token;
          }
        } else if (managerAuth) {
          authData = JSON.parse(managerAuth);
          if (authData.token && authData.isAuthenticated) {
            token = authData.token;
          }
        } else if (employeeAuth) {
          authData = JSON.parse(employeeAuth);
          if (authData.token && authData.isAuthenticated) {
            token = authData.token;
          }
        }

        if (token) {
          setAuthToken(token);
          console.log('✅ Auth token loaded successfully');
        } else {
          console.log('⚠️ No auth token found');
          showCustomAlert(
            'Authentication required. Please login again.',
            () => {
              navigation.replace('RoleSelection');
            },
          );
        }
      } catch (error) {
        console.error('❌ Failed to load auth token:', error);
        showCustomAlert('Authentication error. Please login again.', () => {
          navigation.replace('RoleSelection');
        });
      }
    };

    loadAuthToken();
  }, []);

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

  // Initialize camera
  useEffect(() => {
    const initializeCamera = async () => {
      if (hasPermission && device) {
        // Add a small delay to ensure camera is ready
        setTimeout(() => {
          setStatus('Camera ready. Position face in the frame to scan.');
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

  // Get all registered employees and managers from backend with authentication
  const getRegisteredEmployees = async () => {
    try {
      if (!authToken) {
        throw new Error('Authentication token not available');
      }

      console.log('🔍 Fetching employees from backend...');
      console.log('🔍 API URL:', `${BASE_URL}/employees/all`);

      const response = await axios.get(`${BASE_URL}/employees/all`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });

      console.log('✅ Employees API Response Status:', response.status);

      let allEmployees = [];
      if (Array.isArray(response.data)) {
        allEmployees = response.data;
      } else if (Array.isArray(response.data.data)) {
        allEmployees = response.data.data;
      } else if (response.data.grouped) {
        // Handle grouped response format
        const {
          admins = [],
          managers = [],
          employees = [],
        } = response.data.grouped;
        allEmployees = [...admins, ...managers, ...employees];
        console.log('✅ Using grouped data format');
      }

      console.log('📋 All employees fetched:', allEmployees.length);

      // Filter employees and managers with face images
      const employeesWithFaces = allEmployees.filter(emp => {
        const isValidRole =
          emp.role?.toLowerCase() === 'employee' ||
          emp.role?.toLowerCase() === 'manager' ||
          emp.role?.toLowerCase() === 'admin';
        const hasLivePicture = !!emp.livePicture;

        return isValidRole && hasLivePicture;
      });

      console.log(
        '✅ Employees/Managers/Admins with face images found:',
        employeesWithFaces.length,
      );

      return employeesWithFaces;
    } catch (error) {
      console.error('❌ Failed to fetch employees:', error);
      if (error.response?.status === 401) {
        showCustomAlert('Session expired. Please login again.', () => {
          navigation.navigate('LoginScreen');
        });
      }
      throw error;
    }
  };

  // Compare faces using backend API with authentication
  const compareFaces = async (sourceImagePath, targetImageUrl) => {
    try {
      if (!authToken) {
        throw new Error('Authentication token not available');
      }

      console.log('🔍 [Face Compare] Starting face comparison...');

      const formData = new FormData();
      formData.append('sourceImage', {
        uri: sourceImagePath,
        type: 'image/jpeg',
        name: 'captured_face.jpg',
      });
      formData.append('targetImageUrl', targetImageUrl);

      const apiUrl = `${BASE_URL}/employees/compare-faces`;
      console.log('📤 [Face Compare] API URL:', apiUrl);

      const response = await axios.post(apiUrl, formData, {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'multipart/form-data',
        },
        timeout: 15000,
      });

      console.log('✅ [Face Compare] API Response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ [Face Compare] API Error:', error);
      if (error.response?.status === 401) {
        showCustomAlert('Session expired. Please login again.', () => {
          navigation.navigate('LoginScreen');
        });
      }
      return { match: false, confidence: 0 };
    }
  };

  const prepareSourceImage = useCallback(async originalFileUri => {
    const inputUri =
      typeof originalFileUri === 'string' && originalFileUri.startsWith('file://')
        ? originalFileUri
        : `file://${String(originalFileUri || '')}`;

    const resized = await ImageResizer.createResizedImage(
      inputUri,
      900,
      900,
      'JPEG',
      85,
      0,
      null,
    );

    const outputUri = resized?.uri || resized?.path || inputUri;
    return outputUri;
  }, []);

  // Capture photo and process face recognition
  const capturePhoto = useCallback(async () => {
    if (
      !cameraRef.current ||
      isProcessing ||
      !cameraInitialized ||
      !authToken
    ) {
      console.log('Camera or auth not ready:', {
        cameraRef: !!cameraRef.current,
        isProcessing,
        cameraInitialized,
        authToken: !!authToken,
      });

      if (!authToken) {
        showCustomAlert('Authentication required. Please login again.', () => {
          navigation.navigate('LoginScreen');
        });
      }
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
        qualityPrioritization: 'quality',
        skipMetadata: true,
        flash: 'off',
      });

      console.log('Photo captured:', photo);
      const rawUri = `file://${photo.path}`;
      setCapturedImageUri(rawUri);
      setStatus('Optimizing image...');

      const optimizedUri = await prepareSourceImage(rawUri);
      setStatus('Recognizing employee...');

      // Process employee face recognition
      await processEmployeeFaceRecognition(optimizedUri);
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
  }, [isProcessing, progressAnim, cameraInitialized, device, authToken, prepareSourceImage]);

  // Process employee face recognition
  const processEmployeeFaceRecognition = async photoUri => {
    try {
      console.log(
        '🔍 [Employee Face Recognition] Starting face recognition...',
      );

      setStatus('Fetching employee data...');
      const employees = await getRegisteredEmployees();

      if (employees.length === 0) {
        throw new Error(
          'No registered employees found. Please register employees first.',
        );
      }

      setStatus('Comparing faces...');

      // Check employees and managers
      for (const employee of employees) {
        try {
          const result = await compareFaces(photoUri, employee.livePicture);
          if (result.match && result.confidence >= 70) {
            console.log(
              `✅ Employee match found: ${employee.name} (${result.confidence}%)`,
            );

            console.log(
              '🔍 Employee object structure:',
              JSON.stringify(employee, null, 2),
            );
            console.log('🔍 Employee ID fields:', {
              _id: employee._id,
              employeeId: employee.employeeId,
              id: employee.id,
            });

            showCustomAlert(
              `✅ Employee Recognized!\n\n${employee.name}\nRole: ${
                employee.role
              }\nConfidence: ${result.confidence.toFixed(1)}%`,
              () => {
                // Navigate to attendance modal with employee data
                navigation.navigate('EmployeeAttendanceModal', {
                  employee: {
                    ...employee,
                    // Ensure employeeId is available for API call
                    employeeId:
                      employee.employeeId || employee._id || employee.id,
                  },
                  capturedImage: photoUri,
                  confidence: result.confidence,
                });
              },
            );
            return;
          }
        } catch (error) {
          console.log(
            `Employee ${employee.name} face comparison failed:`,
            error.message,
          );
        }
      }

      // No match found
      throw new Error(
        'Face not recognized. Please ensure you are a registered employee or manager.',
      );
    } catch (error) {
      console.error('❌ Employee face recognition failed:', error);
      showCustomAlert(`❌ ${error.message}`, () => {
        setStatus('Ready to capture. Position face in the frame.');
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
        <Text style={styles.headerTitle}>Employee Face Recognition</Text>
        <TouchableOpacity
          onPress={handleToggleCamera}
          style={styles.switchCameraButton}
          disabled={!frontDevice && !backDevice}
        >
          <Ionicons name="camera-reverse-outline" size={20} color="#fff" />
          <Text style={styles.switchCameraText}>Switch</Text>
        </TouchableOpacity>
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
            key={cameraPosition}
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
        <Text style={styles.instructionText}>
          Position employee/manager face in the frame
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
          disabled={isProcessing || !cameraInitialized || !authToken}
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
          {isProcessing ? 'Processing...' : 'Tap to Scan Face'}
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

// Styles remain the same as in your original code
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
  switchCameraButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#A98C27',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    minWidth: 90,
  },
  switchCameraText: {
    color: '#fff',
    fontWeight: '700',
    marginLeft: 8,
    fontSize: 12,
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
  instructionText: {
    color: '#A98C27',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    textAlign: 'center',
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

export default EmployeeAttendanceFaceRecognitionScreen;
