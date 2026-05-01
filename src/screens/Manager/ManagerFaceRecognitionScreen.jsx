import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
  Easing,
  Modal,
  Linking,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
} from 'react-native-vision-camera';
import axios from 'axios';
import { BASE_URL } from '../../api/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ImageResizer from 'react-native-image-resizer';

const { width, height } = Dimensions.get('window');

// Utility: Save manager auth data
const saveManagerAuth = async authData => {
  try {
    await AsyncStorage.setItem('managerAuth', JSON.stringify(authData));
  } catch (error) {
    console.error('Failed to save manager session:', error);
  }
};

// Utility: Save admin auth data
const saveAdminAuth = async authData => {
  try {
    await AsyncStorage.setItem('adminAuth', JSON.stringify(authData));
  } catch (error) {
    console.error('Failed to save admin session:', error);
  }
};

const ManagerFaceRecognitionScreen = ({ navigation }) => {
  const { hasPermission, requestPermission } = useCameraPermission();

  const [status, setStatus] = useState('Initializing camera...');
  const [isProcessing, setIsProcessing] = useState(false);
  const [cameraInitialized, setCameraInitialized] = useState(false);

  const cameraRef = useRef(null);
  const progressAnim = useRef(new Animated.Value(0)).current;

  const frontDevice = useCameraDevice('front');
  const backDevice = useCameraDevice('back');
  const [cameraPosition, setCameraPosition] = useState('front');
  const device =
    (cameraPosition === 'front' ? frontDevice : backDevice) ??
    (cameraPosition === 'front' ? backDevice : frontDevice) ??
    null;

  const handleToggleCamera = () => {
    setCameraInitialized(false);
    setCameraPosition(prev => (prev === 'front' ? 'back' : 'front'));
  };

  // Alert Modal
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertAction, setAlertAction] = useState(null);

  const showCustomAlert = (message, action = null) => {
    setAlertMessage(message);
    setAlertAction(() => action);
    setShowAlertModal(true);
  };

  const hideCustomAlert = () => {
    setShowAlertModal(false);
    setAlertMessage('');
    if (alertAction) {
      alertAction();
      setAlertAction(null);
    }
  };

  // Camera permission check
  useEffect(() => {
    const ensurePermission = async () => {
      if (!hasPermission) {
        const granted = await requestPermission();
        if (!granted) {
          setStatus('Camera permission denied.');
          showCustomAlert(
            'Camera permission is required for face recognition. Please enable it in your app settings.',
            () => Linking.openSettings(),
          );
        }
      }
    };
    ensurePermission();
  }, [hasPermission, requestPermission]);

  // Camera initialized
  const handleCameraInitialized = () => {
    setCameraInitialized(true);
    setStatus('Camera ready. Keep your face centered for authentication.');

    // Test network connectivity when camera is ready
    testNetworkConnectivity();
  };

  // Test network connectivity
  const testNetworkConnectivity = async () => {
    try {
      console.log('🌐 [Network Test] Testing connectivity to:', BASE_URL);
      const response = await axios.get(
        `${BASE_URL.replace('/api', '')}/health`,
      );
      console.log('✅ [Network Test] Backend is accessible:', response.status);
    } catch (error) {
      console.error('❌ [Network Test] Backend not accessible:', error.message);
      console.error('❌ [Network Test] Error details:', error);
    }
  };

  // Get all registered managers and admins from backend
  const getRegisteredUsers = async () => {
    try {
      console.log( 
        '🔍 [Face Recognition] Fetching users for face recognition...',
      );
      console.log('🔍 [Face Recognition] Using BASE_URL:', BASE_URL);

      // Add timeout and better error handling
      const response = await axios.get(
        `${BASE_URL}/manager/face-recognition-users`,
        { timeout: 10000 }, // 10 second timeout
      );
      console.log('✅ [Face Recognition] API Response:', response.data);

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch users');
      }

      const users = response.data.data || [];
      console.log('✅ [Face Recognition] Total users found:', users.length);
      console.log('✅ [Face Recognition] Raw users data:', users);

      // Filter managers and admins
      const managers = users.filter(
        user => user.role && user.role.toLowerCase() === 'manager',
      );
      const admins = users.filter(
        user => user.role && user.role.toLowerCase() === 'admin',
      );

      // If no data from API, use fallback test data
      if (users.length === 0) {
        console.log(
          '⚠️ [Face Recognition] No data from API, using fallback test data',
        );
        const fallbackData = [
          {
            _id: 'test_manager_001',
            name: 'Ahmad',
            role: 'manager',
            livePicture:
              'https://res.cloudinary.com/dbexxjvcm/image/upload/v1756884516/salon-employees/1756884494107-employee_face_w7uhsp.jpg',
            managerId: 'EMP0001',
          },
        ];

        const fallbackManagers = fallbackData.filter(
          user => user.role && user.role.toLowerCase() === 'manager',
        );
        const fallbackAdmins = fallbackData.filter(
          user => user.role && user.role.toLowerCase() === 'admin',
        );

        console.log(
          '✅ [Face Recognition] Using fallback data - Managers:',
          fallbackManagers.length,
        );
        return { managers: fallbackManagers, admins: fallbackAdmins };
      }

      console.log('✅ [Face Recognition] Managers found:', managers.length);
      console.log('✅ [Face Recognition] Admins found:', admins.length);
      console.log('✅ [Face Recognition] Filtered managers:', managers);
      console.log('✅ [Face Recognition] Filtered admins:', admins);

      // Log sample data for debugging
      if (managers.length > 0) {
        console.log('👤 [Face Recognition] Sample manager:', {
          id: managers[0].id,
          name: managers[0].name,
          hasLivePicture: !!managers[0].livePicture,
        });
      }

      if (admins.length > 0) {
        console.log('👤 [Face Recognition] Sample admin:', {
          id: admins[0].id,
          name: admins[0].name,
          hasLivePicture: !!admins[0].livePicture,
        });
      }

      return { managers, admins };
    } catch (error) {
      console.error('❌ [Face Recognition] Error fetching users:', error);
      console.error('❌ [Face Recognition] Error details:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        code: error.code,
      });

      // Use fallback data if network fails
      console.log('⚠️ [Face Recognition] Network failed, using fallback data');
      const fallbackData = [
        {
          _id: 'test_manager_001',
          name: 'Ahmad',
          role: 'manager',
          livePicture:
            'https://res.cloudinary.com/dbexxjvcm/image/upload/v1756884516/salon-employees/1756884494107-employee_face_w7uhsp.jpg',
          managerId: 'EMP0001',
        },
      ];

      const fallbackManagers = fallbackData.filter(
        user => user.role && user.role.toLowerCase() === 'manager',
      );
      const fallbackAdmins = fallbackData.filter(
        user => user.role && user.role.toLowerCase() === 'admin',
      );

      console.log(
        '✅ [Face Recognition] Using fallback data - Managers:',
        fallbackManagers.length,
      );
      return { managers: fallbackManagers, admins: fallbackAdmins };
    }
  };

  // Prepare source image: resize/compress so it doesn't exceed backend limits
  const prepareSourceImage = async originalPath => {
    try {
      // Always resize to a reasonable size for login (balanced quality vs size)
      const resized = await ImageResizer.createResizedImage(
        originalPath.startsWith('file://') ? originalPath : `file://${originalPath}`,
        900,
        900,
        'JPEG',
        85,
        0,
        null,
        false,
        { mode: 'cover' },
      );

      console.log('📏 [Face Comparison] Resized image for login:', {
        originalPath,
        resizedPath: resized.path,
      });

      return resized.path;
    } catch (err) {
      console.warn(
        '⚠️ [Face Comparison] Failed to resize image, falling back to original:',
        err?.message || err,
      );
      return originalPath;
    }
  };

  // Compare faces using backend API
  const compareFaces = async (sourceImagePath, targetImageUrl) => {
    try {
      console.log('🔍 [Face Comparison] Starting face comparison for login...');
      console.log('🔍 [Face Comparison] Source image path:', sourceImagePath);
      console.log('🔍 [Face Comparison] Target image URL:', targetImageUrl);

      // 🔧 Resize/compress first so we don't hit 413 (Request Entity Too Large)
      const preparedPath = await prepareSourceImage(sourceImagePath);

      const formData = new FormData();

      // Fix image path format for React Native
      const imageUri = preparedPath.startsWith('file://')
        ? preparedPath
        : `file://${preparedPath}`;

      formData.append('sourceImage', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'source.jpg',
      });
      formData.append('targetImageUrl', targetImageUrl);

      console.log('🔍 [Face Comparison] FormData created:');
      console.log('🔍 [Face Comparison] Image URI:', imageUri);
      console.log('🔍 [Face Comparison] Target URL:', targetImageUrl);

      console.log(
        '📡 [Face Comparison] Sending request to:',
        `${BASE_URL}/manager/compare-faces-login`,
      );

      // Fixed endpoint: /api/manager/compare-faces-login
      const response = await axios.post(
        `${BASE_URL}/manager/compare-faces-login`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );

      console.log('✅ [Face Comparison] Response received:', response.data);
      return response.data; // { success: true, match: true/false, confidence: number }
    } catch (error) {
      console.error('❌ [Face Comparison] Face comparison error:', error);
      console.error('❌ [Face Comparison] Error details:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });

      const backendMessage =
        typeof error.response?.data === 'string'
          ? error.response.data
          : error.response?.data?.message || '';

      if (error.response?.status === 413 ||
          /request entity too large/i.test(backendMessage)) {
        throw new Error(
          'Image was too large to process. Please step a little back and try again, or avoid moving too close to the camera.',
        );
      }

      if (error.response?.status === 400) {
        throw new Error('Invalid image data provided.');
      } else if (error.code === 'NETWORK_ERROR') {
        throw new Error('Network error during face comparison.');
      } else {
        throw new Error(`Face comparison failed: ${error.message}`);
      }
    }
  };

  // Start recognition
  const startFaceRecognitionProcess = async () => {
    if (!cameraInitialized || !cameraRef.current) {
      setStatus('Camera not ready.');
      return;
    }

    if (isProcessing) return;
    setIsProcessing(true);
    setStatus('Capturing photo...');

    try {
      const photo = await cameraRef.current.takePhoto({
        qualityPrioritization: 'quality',
        flash: 'off',
      });

      setStatus('Fetching user data...');
      const { managers, admins } = await getRegisteredUsers();

      console.log('🔍 [Face Recognition] After getRegisteredUsers:');
      console.log('🔍 [Face Recognition] Managers count:', managers.length);
      console.log('🔍 [Face Recognition] Admins count:', admins.length);
      console.log('🔍 [Face Recognition] Managers data:', managers);
      console.log('🔍 [Face Recognition] Admins data:', admins);

      if (managers.length === 0 && admins.length === 0) {
        console.log(
          '❌ [Face Recognition] No managers or admins found - throwing error',
        );
        throw new Error(
          'No registered managers or admins found. Please register users in Admin Panel.',
        );
      }

      setStatus('Comparing faces...');
      Animated.timing(progressAnim, {
        toValue: 100,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: false,
      }).start();

      // Check managers first
      for (const manager of managers) {
        try {
          const result = await compareFaces(photo.path, manager.livePicture);
          // Slightly relaxed confidence threshold so minor distance/angle
          // differences during login don't immediately fail the match.
          if (result.match && result.confidence >= 70) {
            showCustomAlert(
              `Welcome Manager ${
                manager.name
              }! Confidence: ${result.confidence.toFixed(1)}%`,
              async () => {
                // Generate a proper JWT-like token for face recognition login
                // For now, we'll use the backend to generate a proper token
                try {
                  console.log('🔑 Generating proper auth token for manager...');

                  // Fixed endpoint: /api/manager/face-login
                  console.log('🔍 [Token Generation] Manager data:', {
                    _id: manager._id,
                    managerId: manager.managerId,
                    name: manager.name,
                    availableFields: Object.keys(manager),
                  });

                  const tokenResponse = await axios.post(
                    `${BASE_URL}/manager/face-login`,
                    {
                      managerId: manager._id, // Use _id directly since managerId is undefined
                      name: manager.name,
                      faceVerified: true,
                    },
                  );

                  const properToken =
                    tokenResponse.data.data?.token || tokenResponse.data.token;
                  console.log('✅ Generated proper token for manager');

                  // Line 344 ke baad (token save karne ke baad)
                  await saveManagerAuth({
                    token: properToken,
                    manager: manager,
                    isAuthenticated: true,
                  });

                  // ✅ Add this logging
                  console.log('💾 [Auth] Saved manager auth:', {
                    hasToken: !!properToken,
                    tokenStart: properToken?.substring(0, 20),
                    managerId: manager._id,
                    managerName: manager.name,
                  });
                } catch (tokenError) {
                  console.log(
                    '⚠️ Token generation failed, using fallback token',
                  );
                  // Fallback to temporary token
                  const tempToken = `face_auth_${manager._id}_${Date.now()}`;

                  await saveManagerAuth({
                    token: tempToken,
                    manager: manager,
                    isAuthenticated: true,
                  });
                }
                navigation.navigate('ManagerHomeScreen', {
                  authenticatedManager: manager,
                  authenticationConfidence: result.confidence,
                });
              },
            );
            return;
          }
        } catch (error) {
          console.log(
            `Manager ${manager.name} face comparison failed:`,
            error.message,
          );
        }
      }

      // Check admins if no manager match found
      for (const admin of admins) {
        try {
          const result = await compareFaces(photo.path, admin.livePicture);
          // Same relaxed threshold for admin face login
          if (result.match && result.confidence >= 70) {
            showCustomAlert(
              `Welcome Admin ${
                admin.name
              }! Confidence: ${result.confidence.toFixed(1)}%`,
              async () => {
                // Generate a proper JWT-like token for face recognition login
                try {
                  console.log('🔑 Generating proper auth token for admin...');

                  // Fixed endpoint: /api/auth/face-login
                  const tokenResponse = await axios.post(
                    `${BASE_URL}/auth/face-login`,
                    {
                      adminId: admin._id,
                      name: admin.name,
                      faceVerified: true,
                    },
                  );

                  const properToken =
                    tokenResponse.data.data?.token || tokenResponse.data.token;
                  console.log('✅ Generated proper token for admin');

                  await saveAdminAuth({
                    token: properToken,
                    admin: { ...admin, loginType: 'face' },
                    isAuthenticated: true,
                  });
                } catch (tokenError) {
                  console.log(
                    '⚠️ Token generation failed, using fallback token',
                  );
                  // Fallback to temporary token
                  const tempToken = `face_auth_${admin._id}_${Date.now()}`;

                  await saveAdminAuth({
                    token: tempToken,
                    admin: { ...admin, loginType: 'face' },
                    isAuthenticated: true,
                  });
                }
                navigation.navigate('AdminMainDashboard', {
                  authenticatedAdmin: admin,
                  authenticationConfidence: result.confidence,
                });
              },
            );
            return;
          }
        } catch (error) {
          console.log(
            `Admin ${admin.name} face comparison failed:`,
            error.message,
          );
        }
      }

      // No match found after checking all managers and admins
      throw new Error(
        'Face not recognized. Please move a little closer, keep your face inside the circle with good light, and try again. If this keeps happening, ask admin to re-register your face.',
      );
    } catch (error) {
      console.error('Face authentication failed:', error);
      showCustomAlert(error.message);
    } finally {
      setIsProcessing(false);
      progressAnim.setValue(0);
    }
  };

  // UI
  if (!hasPermission || !device) {
    return (
      <View style={styles.centeredView}>
        <Text style={styles.statusText}>{status}</Text>
        <TouchableOpacity
          style={styles.cancelRecognitionButton}
          onPress={() => requestPermission()}
        >
          <Text style={styles.cancelRecognitionButtonText}>
            Grant Permission
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.cancelRecognitionButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.cancelRecognitionButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.centeredView}>
      <View style={styles.modalView}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Face Authentication</Text>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.closeButton}
          >
            <Ionicons
              name="close-circle-outline"
              size={width * 0.05}
              color="#A9A9A9"
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleToggleCamera}
            style={styles.switchCameraButton}
            disabled={!frontDevice && !backDevice}
          >
            <Ionicons
              name="camera-reverse-outline"
              size={width * 0.05}
              color="#fff"
            />
            <Text style={styles.switchCameraText}>Switch</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.cameraContainer}>
          <Camera
            key={cameraPosition}
            ref={cameraRef}
            style={StyleSheet.absoluteFillObject}
            device={device}
            isActive={true}
            photo={true}
            onInitialized={handleCameraInitialized}
          />
          <View style={styles.faceOutline}></View>
        </View>

        <Text style={styles.statusText}>{status}</Text>

        <View style={styles.progressBarBackground}>
          <Animated.View
            style={[
              styles.progressBarFill,
              {
                width: progressAnim.interpolate({
                  inputRange: [0, 100],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
        </View>

        <TouchableOpacity
          style={styles.startRecognitionButton}
          onPress={startFaceRecognitionProcess}
          disabled={!cameraInitialized || isProcessing}
        >
          <Text style={styles.startRecognitionButtonText}>
            {isProcessing ? 'Processing...' : 'Authenticate User'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Alert Modal */}
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
              style={styles.alertCloseButton}
              onPress={hideCustomAlert}
            >
              <Text style={styles.alertCloseButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  modalView: {
    width: '90%',
    backgroundColor: '#1F1F1F',
    borderRadius: 15,
    padding: width * 0.03,
    alignItems: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 15,
  },
  modalTitle: { fontSize: width * 0.025, fontWeight: 'bold', color: '#fff' },
  closeButton: { padding: 5 },
  switchCameraButton: {
    position: 'absolute',
    left: '50%',
    top: 0,
    transform: [{ translateX: -45 }],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#A98C27',
    paddingVertical: 4,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  switchCameraText: {
    color: '#fff',
    fontWeight: '700',
    marginLeft: 8,
    fontSize: width * 0.018,
  },
  cameraContainer: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 15,
  },
  faceOutline: {
    position: 'absolute',
    width: '70%',
    height: '70%',
    borderRadius: 989,
    top: '15%',
    left: '15%',
    borderWidth: 5,
    borderColor: '#fff',
    borderStyle: 'dashed',
  },
  statusText: {
    fontSize: width * 0.018,
    color: '#fff',
    marginBottom: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  progressBarBackground: {
    width: '80%',
    height: 8,
    backgroundColor: '#2A2D32',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 15,
  },
  progressBarFill: { height: '100%', backgroundColor: '#A98C27' },
  startRecognitionButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
    width: '80%',
    alignItems: 'center',
  },
  startRecognitionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: width * 0.018,
  },
  cancelRecognitionButton: {
    backgroundColor: '#2A2D32',
    borderRadius: 10,
    padding: 10,
    width: '80%',
    alignItems: 'center',
    marginTop: 10,
  },
  cancelRecognitionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: width * 0.018,
  },
  alertCenteredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  alertModalView: {
    margin: 20,
    backgroundColor: '#1F1F1F',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
  },
  alertModalText: {
    marginBottom: 15,
    textAlign: 'center',
    color: '#fff',
    fontSize: width * 0.02,
  },
  alertCloseButton: {
    backgroundColor: '#A98C27',
    borderRadius: 5,
    padding: 10,
  },
  alertCloseButtonText: { color: 'white', fontWeight: 'bold' },
});

export default ManagerFaceRecognitionScreen;
