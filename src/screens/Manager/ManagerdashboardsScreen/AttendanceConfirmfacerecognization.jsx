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
  Linking,
  Alert,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
} from 'react-native-vision-camera';
import useFaceRecognition from '../../../hooks/useFaceRecognition';

const { width, height } = Dimensions.get('window');

const AttendanceConfirmationRecognitionScreen = ({ route, navigation }) => {
  const { employee, requestDetails } = route.params || {};

  // Face recognition hook
  const {
    isLoading: isRecognitionLoading,
    error: recognitionError,
    lastResult: recognitionResult,
    registerEmployeeFace,
    clearError,
    clearResult,
  } = useFaceRecognition();

  // VisionCamera permission hook
  const { hasPermission, requestPermission } = useCameraPermission();

  const [status, setStatus] = useState('Initializing camera...');
  const [isRecognitionActive, setIsRecognitionActive] = useState(false);
  const [cameraInitialized, setCameraInitialized] = useState(false);

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

  // Initial animations
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

  // Request camera permission on mount if needed
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

  // Update status as devices/permission change
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

  // Trigger recognition only after camera initialized
  useEffect(() => {
    if (hasPermission && device && cameraInitialized && !isRecognitionActive) {
      setIsRecognitionActive(true);
    }
  }, [hasPermission, device, cameraInitialized, isRecognitionActive]);

  // Face recognition process
  const startFaceRecognitionProcess = async () => {
    if (!isRecognitionActive || !cameraInitialized) {
      console.warn('Recognition not active or camera not initialized.');
      return;
    }

    setStatus('Scanning for face...');
    clearError();
    clearResult();

    try {
      if (!cameraRef.current) {
        throw new Error('Camera not available');
      }

      const photo = await cameraRef.current.takePhoto({
        qualityPrioritization: 'quality',
        flash: 'off',
        skipMetadata: true,
      });

      const imagePath = photo.path;
      setStatus('Processing face recognition...');

      Animated.timing(progressAnim, {
        toValue: 100,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: false,
      }).start();

      // Simulate the API call for face recognition
      const result = await registerEmployeeFace(
        imagePath,
        employee?.id || `emp_${Date.now()}`,
        employee?.name || 'Unknown Employee',
      );

      if (result.success) {
        setStatus('Face recognized successfully!');

        // This is the final step: show the success alert and navigate back
        Alert.alert(
          'Success',
          'Your attendance has been requested.',
          [
            {
              text: 'OK',
              onPress: () => {
                // Navigate back three screens to the main attendance screen
                // Make sure your navigation stack is set up for this
                navigation.pop(3);
              },
            },
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => {
                // You can choose a different action here, e.g., pop back to the previous screen
                navigation.pop(2);
              },
            },
          ],
          { cancelable: false },
        );

        // Here you would also make the final API call to save the attendance request
        console.log('Final attendance request with data:', requestDetails);
      } else {
        // If the face recognition fails
        setStatus('Recognition failed: ' + result.message);
        showCustomAlert('Face recognition failed: ' + result.message);
      }
    } catch (error) {
      console.error('Face recognition failed:', error);
      setStatus('Recognition failed: ' + error.message);
      showCustomAlert('Face recognition failed: ' + error.message);
    }
  };

  // Render logic based on camera readiness
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
          <Text style={styles.modalTitle}>Attendance Confirmation</Text>
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
        </View>

        <View style={styles.cameraContainer}>
          <Camera
            ref={cameraRef}
            style={StyleSheet.absoluteFillObject}
            device={device}
            isActive={true}
            photo={true}
            onInitialized={() => setCameraInitialized(true)}
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
          disabled={!cameraInitialized}
          style={styles.cancelRecognitionButton}
          onPress={startFaceRecognitionProcess}
        >
          <Text style={styles.cancelRecognitionButtonText}>
            {cameraInitialized
              ? 'Confirm Attendance'
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
    backgroundColor: '#000',
  },
  modalView: {
    width: '90%',
    maxWidth: 600,
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
  modalTitle: {
    fontSize: width * 0.025,
    fontWeight: 'bold',
    color: '#fff',
  },
  closeButton: {
    padding: width * 0.008,
  },
  cameraContainer: {
    width: '100%',
    aspectRatio: 3 / 4,
    backgroundColor: '#000',
    borderRadius: 10,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: height * 0.02,
    position: 'relative',
  },
  faceOutline: {
    position: 'absolute',
    width: '70%',
    height: '70%',
    borderRadius: 999,
    borderWidth: 3,
    borderColor: '#A98C27',
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
  progressBarBackground: {
    width: '80%',
    height: height * 0.015,
    backgroundColor: '#2A2D32',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: height * 0.02,
    justifyContent: 'center',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#A98C27',
    borderRadius: 5,
  },
  cancelRecognitionButton: {
    backgroundColor: '#2A2D32',
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

export default AttendanceConfirmationRecognitionScreen;
