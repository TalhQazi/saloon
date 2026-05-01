// src/screens/admin/FaceRecognitionScreen.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
  Easing,
  Platform,
  Modal,
  Linking,
  Alert,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
} from 'react-native-vision-camera';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import useFaceRecognition from '../hooks/useFaceRecognition';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import { BASE_URL } from '../api/config';
import RNFS from 'react-native-fs';
import ImageResizer from 'react-native-image-resizer';

const { width, height } = Dimensions.get('window');

const FaceRecognitionScreen = ({ route }) => {
  const navigation = useNavigation();
  const { employee } = route.params || {};

  const {
    isLoading: isRecognitionLoading,
    error: recognitionError,
    lastResult: recognitionResult,
    registerEmployeeFace,
    clearError,
    clearResult,
  } = useFaceRecognition();

  const { hasPermission, requestPermission } = useCameraPermission();

  const [status, setStatus] = useState('Initializing camera...');
  const [isRecognitionActive, setIsRecognitionActive] = useState(false);
  const [capturedFaceUri, setCapturedFaceUri] = useState(null);
  const [cameraInitialized, setCameraInitialized] = useState(false);

  const cameraRef = useRef(null);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  const frontDevice = useCameraDevice('front');
  const backDevice = useCameraDevice('back');
  const [cameraPosition, setCameraPosition] = useState('front');
  const device =
    (cameraPosition === 'front' ? frontDevice : backDevice) ??
    (cameraPosition === 'front' ? backDevice : frontDevice) ??
    null;

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

  useEffect(() => {
    progressAnim.setValue(0);
    opacityAnim.setValue(0);
    scaleAnim.setValue(0.8);

    Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

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

  useEffect(() => {
    if (!hasPermission) {
      setStatus('Waiting for camera permission...');
      return;
    }
    if (!device) {
      setStatus(
        'No camera device found. If you are on an emulator, enable a virtual camera in AVD settings.',
      );
      return;
    }
    setStatus('Camera ready. Please align your face in the center.');
  }, [hasPermission, device]);

  const handleToggleCamera = useCallback(() => {
    setCameraInitialized(false);
    setIsRecognitionActive(false);
    setCameraPosition(prev => (prev === 'front' ? 'back' : 'front'));
  }, []);

  useEffect(() => {
    if (hasPermission && device && cameraInitialized && !isRecognitionActive) {
      setIsRecognitionActive(true);
    }
  }, [hasPermission, device, cameraInitialized, isRecognitionActive]);

  // ✅ FIXED: Updated registerEmployeeWithFace function with employeeId
  const registerEmployeeWithFace = async (originalImagePath, employeeData) => {
    try {
      console.log('🔄 Starting employee registration process...');
      console.log('📝 Employee Data:', employeeData);

      // ✅ ADDED: Get the employeeId from employee object
      const employeeId = employee?.id;
      console.log('🆕 Frontend Generated Employee ID:', employeeId);

      // 🔍 Log original image size
      const originalStats = await RNFS.stat(originalImagePath);
      const originalSizeKB = (originalStats.size / 1024).toFixed(2);
      console.log('📸 Original image path:', originalImagePath);
      console.log('📏 Original image size:', originalSizeKB, 'KB');

      // Use the ORIGINAL image first (better quality for backend face detection)
      setStatus('Preparing employee data for upload...');

      // ✅ FIXED: Create FormData with employeeId field
      const formData = new FormData();

      // Add employee data fields (EXACTLY as backend expects) - all as strings
      formData.append('name', String(employeeData.name ?? ''));
      formData.append('phoneNumber', String(employeeData.phoneNumber ?? ''));
      formData.append('idCardNumber', String(employeeData.idCardNumber ?? ''));
      formData.append('monthlySalary', String(parseFloat(employeeData.monthlySalary ?? 0)));
      const roleLower = String(employeeData.role || '').toLowerCase();
      formData.append('role', roleLower);

      // Do not send employeeId on add; backend generates it
      console.log('ℹ️ Backend will generate employeeId');

      // ✅ Primary upload will use ORIGINAL image for best detection
      const primaryUri = originalImagePath.startsWith('file://')
        ? originalImagePath
        : `file://${originalImagePath}`;
      console.log('📤 Primary upload will use: ORIGINAL image');

      const fileObj = {
        uri: primaryUri,
        type: 'image/jpeg',
        name: `employee_face_compressed_${Date.now()}.jpg`,
      };
      // Backend expects ONLY 'livePicture'
      formData.append('livePicture', fileObj);

      console.log('📤 FormData prepared with fields:', {
        name: employeeData.name,
        phoneNumber: employeeData.phoneNumber,
        idCardNumber: employeeData.idCardNumber,
        monthlySalary: parseFloat(employeeData.monthlySalary),
        role: employeeData.role,
        employeeId: employeeId, // ✅ This is new
        livePicture: `employee_face_${Date.now()}.jpg`,
      });

      // Get authentication token
      const getAuthToken = async () => {
        const adminAuth = await AsyncStorage.getItem('adminAuth');
        if (adminAuth) {
          const parsed = JSON.parse(adminAuth);
          return parsed.token;
        }
        throw new Error('No authentication token found');
      };

      const token = await getAuthToken();

      setStatus('Uploading employee data with face image...');

      console.log('🚀 Sending request to backend...');
      console.log('🔑 Token exists:', !!token);
      console.log('📡 URL:', `${BASE_URL}/employees/add`);

      const fetchRes = await fetch(`${BASE_URL}/employees/add`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
        body: formData,
      });
      let response;
      if (!fetchRes.ok) {
        let bodyText;
        try { bodyText = await fetchRes.text(); } catch (e) { bodyText = ''; }
        throw { response: { status: fetchRes.status, data: bodyText } };
      } else {
        let data;
        try { data = await fetchRes.json(); } catch (e) { data = {}; }
        response = { status: fetchRes.status, data };
      }

      console.log('✅ Backend Response:', response.data);

      if (response.status === 201) {
        console.log('✅ Employee registration SUCCESSFUL!');
        setStatus('Employee registered successfully!');

        const updatedEmployee = {
          ...employee,
          faceRecognized: true,
          faceImage: primaryUri,
          apiResponse: response.data,
          id: response.data.employeeId || employee.id,
        };

        // Success animation
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();

        setTimeout(() => {
          const getSuccessMessage = role => {
            const finalEmployeeId = response.data.employeeId || employeeId;
            switch (role) {
              case 'admin':
                return `Admin ${employeeData.name} has been added successfully!\nEmployee ID: ${finalEmployeeId}`;
              case 'manager':
                return `Manager ${employeeData.name} has been added successfully!\nEmployee ID: ${finalEmployeeId}`;
              default:
                return `Employee ${employeeData.name} has been added successfully!\nEmployee ID: ${finalEmployeeId}`;
            }
          };

          showCustomAlert(getSuccessMessage(employeeData.role), () => {
            // Navigate back to employees screen with success
            navigation.goBack();
          });
        }, 1000);
      }
    } catch (error) {
      console.error('❌ Employee registration failed:', error);

      // Normalize backend response (string or object)
      let respStatus = error.response?.status;
      let respData = error.response?.data;
      if (typeof respData === 'string') {
        try {
          respData = JSON.parse(respData);
        } catch (_) {
          // keep raw string
        }
      }

      // Detailed error logging
      if (error.response) {
        console.error('📡 Backend Error Response:', {
          status: respStatus,
          data: respData,
        });
      } else if (error.request) {
        console.error('📡 No response received:', error.request);
      } else {
        console.error('📡 Request setup error:', error.message);
      }

      const backendMsg = (respData && respData.message) || (typeof respData === 'string' ? respData : '');
      const backendCode = (respData && respData.error) || '';
      const errorMessage = backendMsg || backendCode || error.message || 'Unknown error occurred';

      // Retry strategy for face detection failures: now just show a clear message
      if (
        error.response?.status === 400 &&
        (backendCode === 'NO_FACE_DETECTED' || /no faces detected/i.test(backendMsg))
      ) {
        setStatus('No face detected. Please ensure your face is fully inside the circle, with good lighting, and try again.');
        showCustomAlert(
          'No face detected in the uploaded image.\n\nTips:\n- Center your face inside the dashed circle\n- Ensure good lighting (avoid backlight)\n- Hold still for a moment\n- Remove mask/sunglasses\n- Move a bit closer so face is larger',
        );
        return;
      }

      // Handle multiple faces detected
      if (
        error.response?.status === 400 &&
        (backendCode === 'MULTIPLE_FACES' || /multiple faces detected/i.test(backendMsg))
      ) {
        setStatus('Multiple faces detected. Please ensure only your face is in the frame.');
        showCustomAlert(
          'Multiple faces detected in the image.\n\nTips:\n- Make sure only you are in the frame\n- Ask others to step out of view\n- Fill the dashed circle with just your face'
        );
        return;
      }

      // Handle payload too large (413): adaptively retry with smaller sizes
      if (
        error.response?.status === 413 || /request entity too large/i.test(String(backendMsg || ''))
      ) {
        try {
          const adminAuth = await AsyncStorage.getItem('adminAuth');
          const tokenSmall = adminAuth ? JSON.parse(adminAuth).token : null;

          setStatus('Image too large. Retrying with 900x900...');
          const smaller1 = await ImageResizer.createResizedImage(
            `file://${originalImagePath}`,
            900,
            900,
            'JPEG',
            85,
            0,
            null,
            false,
            { mode: 'cover' },
          );
          const fdSmall1 = new FormData();
          fdSmall1.append('name', String(employeeData.name ?? ''));
          fdSmall1.append('phoneNumber', String(employeeData.phoneNumber ?? ''));
          fdSmall1.append('idCardNumber', String(employeeData.idCardNumber ?? ''));
          fdSmall1.append('monthlySalary', String(parseFloat(employeeData.monthlySalary ?? 0)));
          fdSmall1.append('role', (employeeData.role || '').toLowerCase());
          fdSmall1.append('livePicture', {
            uri: smaller1.path.startsWith('file://') ? smaller1.path : `file://${smaller1.path}`,
            type: 'image/jpeg',
            name: `employee_face_900_${Date.now()}.jpg`,
          });
          const rSmall1 = await fetch(`${BASE_URL}/employees/add`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${tokenSmall}`, Accept: 'application/json' },
            body: fdSmall1,
          });
          if (rSmall1.ok && rSmall1.status === 201) {
            setStatus('Employee registered successfully!');
            showCustomAlert('Employee registered successfully!', () => navigation.goBack());
            return;
          }

          setStatus('Still large. Retrying with 720x720...');
          const smaller2 = await ImageResizer.createResizedImage(
            `file://${originalImagePath}`,
            720,
            720,
            'JPEG',
            80,
            0,
            null,
            false,
            { mode: 'cover' },
          );
          const fdSmall2 = new FormData();
          fdSmall2.append('name', String(employeeData.name ?? ''));
          fdSmall2.append('phoneNumber', String(employeeData.phoneNumber ?? ''));
          fdSmall2.append('idCardNumber', String(employeeData.idCardNumber ?? ''));
          fdSmall2.append('monthlySalary', String(parseFloat(employeeData.monthlySalary ?? 0)));
          fdSmall2.append('role', (employeeData.role || '').toLowerCase());
          fdSmall2.append('livePicture', {
            uri: smaller2.path.startsWith('file://') ? smaller2.path : `file://${smaller2.path}`,
            type: 'image/jpeg',
            name: `employee_face_720_${Date.now()}.jpg`,
          });
          const rSmall2 = await fetch(`${BASE_URL}/employees/add`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${tokenSmall}`, Accept: 'application/json' },
            body: fdSmall2,
          });
          if (rSmall2.ok && rSmall2.status === 201) {
            setStatus('Employee registered successfully!');
            showCustomAlert('Employee registered successfully!', () => navigation.goBack());
            return;
          }
        } catch (sizeErr) {
          console.warn('413 adaptive retries failed:', sizeErr?.message || sizeErr);
        }
      }

      const statusLine = respStatus ? ` (HTTP ${respStatus})` : '';
      setStatus(`Registration failed${statusLine}: ${errorMessage}`);
      showCustomAlert(`Employee registration failed${statusLine}: ${errorMessage}`);
    }
  };

  const startFaceRecognitionProcess = async () => {
    if (!employee || !employee.apiData) {
      console.log('❌ Employee data missing');
      showCustomAlert('Employee data is missing. Please try again.');
      return;
    }

    // ✅ ADDED: Log employee ID before starting process
    console.log('🎯 Starting face recognition for employee:', {
      name: employee.apiData.name,
      role: employee.apiData.role,
      employeeId: employee.id,
    });

    setStatus('Capturing face image...');
    clearError();
    clearResult();

    try {
      if (!cameraRef.current) {
        throw new Error('Camera not available');
      }

      console.log('📸 Taking photo...');
      const photo = await cameraRef.current.takePhoto({
        qualityPrioritization: 'quality',
        // Force flash off so the camera works even on devices without flashlight
        flash: 'off',
        skipMetadata: true,
      });

      const originalImagePath = photo.path;
      setCapturedFaceUri(`file://${originalImagePath}`);
      console.log('✅ Photo captured:', originalImagePath);

      // ✅ Call the fixed registration function
      await registerEmployeeWithFace(originalImagePath, employee.apiData);
    } catch (error) {
      console.error('❌ Face capture failed:', error);
      setStatus('Face capture failed: ' + error.message);
      showCustomAlert('Face capture failed: ' + error.message);
    }
  };

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
      <Animated.View
        style={[
          styles.modalView,
          { opacity: opacityAnim, transform: [{ scale: scaleAnim }] },
        ]}
      >
        <View style={styles.modalHeader}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.closeButton}
          >
            <Ionicons
              name="close-circle-outline"
              size={width * 0.05}
              color="#fff"
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleToggleCamera}
            style={styles.switchCameraButton}
            disabled={!frontDevice && !backDevice}
          >
            <Ionicons
              name="camera-reverse-outline"
              size={width * 0.045}
              color="#fff"
            />
            <Text style={styles.switchCameraText}>Switch</Text>
          </TouchableOpacity>
          {/* <View style={styles.headerContainer}>
            <Text style={styles.faceRecognitionTitle}>Face Recognition</Text>
          </View> */}
          {/* <View style={styles.instructionContainer}>
            <Text style={styles.faceRecognitionInstruction}>
              Please look into the camera and hold still...
            </Text>
          </View> */}
        </View>

        <View style={styles.cameraContainer}>
          <Camera
            key={cameraPosition}
            ref={cameraRef}
            style={StyleSheet.absoluteFillObject}
            device={device}
            isActive={true}
            photo={true}
            zoom={0.8}
            onInitialized={() => setCameraInitialized(true)}
          />
          <View style={styles.faceOutline}></View>
        </View>

        <Text style={styles.statusText}>{status}</Text>

        {employee && employee.apiData && (
          <View style={styles.employeeInfo}>
            <Text style={styles.employeeInfoText}>
              Registering: {employee.apiData.name} ({employee.apiData.role})
            </Text>
            {/* ✅ ADDED: Show Employee ID */}
            <Text style={styles.employeeIdText}>
              Employee ID: {employee.id}
            </Text>
          </View>
        )}

        <TouchableOpacity
          disabled={!cameraInitialized || !employee?.apiData}
          style={[
            styles.cancelRecognitionButton,
            (!cameraInitialized || !employee?.apiData) && styles.buttonDisabled,
          ]}
          onPress={startFaceRecognitionProcess}
        >
          <Text style={styles.cancelRecognitionButtonText}>
            {cameraInitialized && employee?.apiData
              ? 'Register Employee with Face'
              : !employee?.apiData
              ? 'Missing Employee Data'
              : 'Initializing Camera...'}
          </Text>
        </TouchableOpacity>
      </Animated.View>

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
    backgroundColor: '#2A2D32',
  },
  modalView: {
    width: '100%',
    maxWidth: 650,
    backgroundColor: '#1F1F1F',
    borderRadius: 15,
    padding: width * 0.03,
    alignItems: 'center',
    elevation: 15,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: height * 0.02,
  },
  closeButton: {
    padding: 5,
    borderRadius: 150,
    elevation: 15,
  },
  switchCameraButton: {
    position: 'absolute',
    left: '50%',
    top: 5,
    transform: [{ translateX: -45 }],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#A98C27',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    elevation: 15,
  },
  switchCameraText: {
    color: '#fff',
    fontWeight: '700',
    marginLeft: 8,
    fontSize: width * 0.018,
  },
  headerContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: height * 0.01,
  },
  faceRecognitionTitle: {
    color: '#fff',
    fontSize: width * 0.03,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  instructionContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: height * 0.005,
    marginBottom: height * 0.01,
  },
  faceRecognitionInstruction: {
    color: '#fff',
    fontSize: width * 0.018,
    textAlign: 'center',
  },
  cameraContainer: {
    width: '100%',
    aspectRatio: 5 / 6,
    backgroundColor: '#000',
    borderRadius: 90,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: height * 0.02,
    position: 'relative',
  },
  faceOutline: {
    position: 'absolute',
    width: '80%',
    height: '80%',
    borderRadius: 999,
    borderWidth: 3,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderStyle: 'dashed',
  },
  statusText: {
    fontSize: width * 0.018,
    color: '#fff',
    marginBottom: height * 0.015,
    fontWeight: '600',
    textAlign: 'center',
  },
  employeeInfo: {
    backgroundColor: '#2A2D32',
    padding: 10,
    borderRadius: 8,
    marginBottom: height * 0.02,
    alignItems: 'center',
  },
  employeeInfoText: {
    color: '#A98C27',
    fontSize: width * 0.016,
    fontWeight: '600',
    textAlign: 'center',
  },
  employeeIdText: {
    color: '#fff',
    fontSize: width * 0.014,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 5,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  cancelRecognitionButton: {
    backgroundColor: '#A98C27',
    borderRadius: 10,
    paddingVertical: height * 0.015,
    paddingHorizontal: width * 0.03,
    width: '80%',
    alignItems: 'center',
    marginTop: height * 0.01,
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  alertModalView: {
    margin: 20,
    backgroundColor: '#1F1F1F',
    borderRadius: 10,
    padding: 35,
    alignItems: 'center',
    elevation: 5,
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
    elevation: 2,
  },
  alertCloseButtonText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default FaceRecognitionScreen;
