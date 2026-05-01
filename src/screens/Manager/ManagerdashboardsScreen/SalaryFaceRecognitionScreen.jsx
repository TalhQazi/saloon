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
  Alert,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
} from 'react-native-vision-camera';
import AdvanceSalaryModal from './modals/AdvanceSalaryModal'; // AdvanceSalaryModal ko import karen

const { width, height } = Dimensions.get('window');

const SalaryFaceRecognitionScreen = ({ navigation }) => {
  // VisionCamera permissions
  const { hasPermission, requestPermission } = useCameraPermission();

  const [status, setStatus] = useState('Camera tayyar ho rahi hai...');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);

  // Animation values
  const progressAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  // Front camera ka device talash karen
  const device = useCameraDevice('front');
  const cameraRef = useRef(null);

  useEffect(() => {
    // Initial animations chalayen
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
    // Camera permissions ki darkhwast karen
    const ensurePermission = async () => {
      if (!hasPermission) {
        const granted = await requestPermission();
        if (!granted) {
          setStatus('Camera ki ijazat nahi hai.');
          // Agar ijazat nahi di, to settings kholne ke liye kehna
          Alert.alert(
            'Ijazat Darqaar',
            'Chehra pehchan ne ke liye Camera ki ijazat zaroori hai. Bara-e-meherbani settings mein jakar ijazat den.',
            [{ text: 'Settings', onPress: () => Linking.openSettings() }],
          );
        }
      }
    };
    ensurePermission();
  }, [hasPermission, requestPermission]);

  useEffect(() => {
    // Camera device ke status ke mutabiq status update karen
    if (hasPermission && device) {
      setStatus('Chehra pehchan ne ke liye tayyar hain.');
    } else if (!device) {
      setStatus('Koi camera device nahi mila.');
    } else if (!hasPermission) {
      setStatus('Camera ki ijazat ka intezar...');
    }
  }, [hasPermission, device]);

  const startFaceRecognitionProcess = async () => {
    if (isProcessing) return;

    setIsProcessing(true);
    setStatus('Chehra scan kar rahe hain...');
    progressAnim.setValue(0); // Progress bar ko shuru mein layen

    // Progress bar animation shuru karen
    Animated.timing(progressAnim, {
      toValue: 100,
      duration: 2000,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start(() => {
      // Animation ke baad, modal show karen
      setIsProcessing(false);
      setStatus('Face Recognized Completed!');
      setIsModalVisible(true);
    });
  };

  const handleSaveAdvanceSalary = salaryData => {
    // Close modal first
    setIsModalVisible(false);

    // Show alert and navigate back after OK is pressed
    Alert.alert(
      'Advance Salary Request',
      'Dear, Your Request has been received.',
      [
        {
          text: 'OK',
          onPress: () => {
            navigation.pop(2);
            // 👆 this will go back 2 screens in the stack
          },
        },
      ],
      { cancelable: false },
    );
  };

  if (!hasPermission || !device) {
    return (
      <View style={styles.centeredView}>
        <Text style={styles.statusText}>{status}</Text>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.actionButtonText}>Wapis Jayen</Text>
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
          <Text style={styles.modalTitle}>Salary Face Recognition...</Text>
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
          disabled={isProcessing}
          style={[styles.actionButton, isProcessing && { opacity: 0.5 }]}
          onPress={startFaceRecognitionProcess}
        >
          <Text style={styles.actionButtonText}>
            {isProcessing ? 'Processing...' : 'Check Shuru Karen'}
          </Text>
        </TouchableOpacity>
      </Animated.View>

      {/* The new modal component */}
      <AdvanceSalaryModal
        isVisible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        onSave={handleSaveAdvanceSalary}
      />
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
  actionButton: {
    backgroundColor: '#2A2D32',
    borderRadius: 10,
    paddingVertical: height * 0.015,
    paddingHorizontal: width * 0.03,
    width: '80%',
    alignItems: 'center',
    marginTop: height * 0.01,
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: width * 0.018,
  },
});

export default SalaryFaceRecognitionScreen;
