import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Image,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import * as ImagePicker from 'react-native-image-picker';
import { useNavigation } from '@react-navigation/native';
import moment from 'moment';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../../../../api/config';
import { getManagerToken, getAdminToken } from '../../../../utils/authUtils';
import ImageResizer from 'react-native-image-resizer';

const { width, height } = Dimensions.get('window');

// 🔐 Prefer real JWTs (manager first, then admin). Do not use face_auth here.
const getAuthToken = async () => {
  try {
    const mgr = await getManagerToken();
    if (mgr) return mgr;
    const adm = await getAdminToken();
    if (adm) return adm;
    return null;
  } catch (e) {
    console.error('Failed to get auth token:', e);
    return null;
  }
};

const AdvanceSalaryRequestModal = ({ isVisible, onClose, route }) => {
  const navigation = useNavigation();
  const { employee, capturedImagePath } = route?.params || {};

  const [amount, setAmount] = useState('');
  const [proofImage, setProofImage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-fill employee data (read-only)
  const employeeId = employee?.id || '';
  const employeeName = employee?.name || '';
  const employeeRole = employee?.role || '';

  const handlePickImage = () => {
    Alert.alert(
      'Attach Proof Picture',
      'Choose a picture to attach as proof for advance salary request.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Choose from Gallery', onPress: () => chooseImage('gallery') },
        { text: 'Take Photo', onPress: () => chooseImage('camera') },
      ],
      { cancelable: true },
    );
  };

  const chooseImage = source => {
    const options = {
      mediaType: 'photo',
      quality: 0.8,
      includeBase64: false,
    };

    if (source === 'camera') {
      ImagePicker.launchCamera(options, response => {
        if (!response.didCancel && !response.error) {
          setProofImage(response.assets[0]);
        }
      });
    } else {
      ImagePicker.launchImageLibrary(options, response => {
        if (!response.didCancel && !response.error) {
          setProofImage(response.assets[0]);
        }
      });
    }
  };

  const handleSubmit = async () => {
    if (!amount.trim()) {
      Alert.alert('Error', 'Please enter the advance salary amount.');
      return;
    }

    if (!proofImage) {
      Alert.alert('Error', 'Please attach a proof picture.');
      return;
    }

    if (isNaN(parseFloat(amount.trim()))) {
      Alert.alert('Error', 'Please enter a valid amount.');
      return;
    }

    try {
      setIsSubmitting(true);

      // 🔽 Reduce image sizes to avoid HTTP 413 (payload too large)
      let employeeLiveUri = capturedImagePath
        ? `file://${capturedImagePath}`
        : null;
      let proofUri = proofImage?.uri || null;

      // Resize captured face image
      if (employeeLiveUri) {
        try {
          const resizedLive = await ImageResizer.createResizedImage(
            employeeLiveUri,
            900,
            900,
            'JPEG',
            85,
            0,
            null,
            false,
            { mode: 'cover' },
          );

          const livePath = resizedLive.uri || resizedLive.path;
          employeeLiveUri = livePath.startsWith('file://')
            ? livePath
            : `file://${livePath}`;
        } catch (resizeError) {
          console.warn(
            '[AdvanceSalaryRequestModal] Failed to resize employee live picture, using original:',
            resizeError?.message || resizeError,
          );
        }
      }

      // Resize proof image
      if (proofUri) {
        try {
          const resizedProof = await ImageResizer.createResizedImage(
            proofUri,
            900,
            900,
            'JPEG',
            85,
            0,
            null,
            false,
            { mode: 'cover' },
          );

          const proofPath = resizedProof.uri || resizedProof.path;
          proofUri = proofPath.startsWith('file://')
            ? proofPath
            : `file://${proofPath}`;
        } catch (resizeError) {
          console.warn(
            '[AdvanceSalaryRequestModal] Failed to resize proof image, using original:',
            resizeError?.message || resizeError,
          );
        }
      }

      const formData = new FormData();
      formData.append('employeeId', employeeId);
      formData.append('employeeName', employeeName);
      formData.append('amount', amount.trim());
      if (employeeLiveUri) {
        formData.append('employeeLivePicture', {
          uri: employeeLiveUri,
          type: 'image/jpeg',
          name: 'employee_live.jpg',
        });
      }
      if (proofUri) {
        formData.append('image', {
          uri: proofUri,
          type: 'image/jpeg',
          name: 'proof.jpg',
        });
      }

      // Get token and convert if needed
      const token = await getAuthToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      console.log(
        '🔑 [AdvanceSalaryRequestModal] Using token:',
        token.substring(0, 20) + '...',
      );

      // Make direct API call
      const response = await fetch(`${BASE_URL}/advance-salary/add`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        // Read raw text first – in production the backend may return HTML error pages
        const errorText = await response.text();
        let message = `HTTP ${response.status}`;
        try {
          const parsed = JSON.parse(errorText);
          message = parsed.message || message;
        } catch (_e) {
          // Not JSON (likely HTML like "<html>...") – keep short safe message
          if (errorText && !errorText.trim().startsWith('<')) {
            message = errorText.slice(0, 200);
          }
        }
        throw new Error(message);
      }

      const responseData = await response.json();

      Alert.alert(
        'Success',
        'Your advance salary request has been sent to admin for approval.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Navigate back 3 screens (skip intermediate face screens)
              navigation.pop(3);
            },
          },
        ],
      );
    } catch (error) {
      console.error('Submit advance salary request error:', error);

      const rawMessage = error.message || '';
      let friendlyMessage = rawMessage;

      // Special handling for HTTP 413 or payload-too-large errors
      if (
        /413/.test(rawMessage) ||
        /payload too large/i.test(rawMessage) ||
        /request entity too large/i.test(rawMessage)
      ) {
        friendlyMessage =
          'Image size is too large. Please try again with a clearer picture where your face fills the frame but the file size is smaller.';
      }

      Alert.alert('Error', `Failed to submit request: ${friendlyMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    if (typeof onClose === 'function') {
      onClose();
    } else {
      navigation.goBack();
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isVisible}
      onRequestClose={handleClose}
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Advance Salary Request</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#A9A9A9" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
          >
            {/* Employee Information (Read-only) */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Employee Information</Text>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Employee ID</Text>
                <TextInput
                  style={[styles.textInput, styles.readOnlyInput]}
                  value={employeeId}
                  editable={false}
                  placeholder="Employee ID"
                  placeholderTextColor="#666"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Name</Text>
                <TextInput
                  style={[styles.textInput, styles.readOnlyInput]}
                  value={employeeName}
                  editable={false}
                  placeholder="Employee Name"
                  placeholderTextColor="#666"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Role</Text>
                <TextInput
                  style={[styles.textInput, styles.readOnlyInput]}
                  value={employeeRole}
                  editable={false}
                  placeholder="Role"
                  placeholderTextColor="#666"
                />
              </View>
            </View>

            {/* Request Details */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Request Details</Text>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Amount (PKR) *</Text>
                <TextInput
                  style={styles.textInput}
                  keyboardType="numeric"
                  placeholder="Enter amount"
                  placeholderTextColor="#A9A9A9"
                  value={amount}
                  onChangeText={setAmount}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Proof Picture *</Text>
                <TouchableOpacity
                  style={styles.imagePickerButton}
                  onPress={handlePickImage}
                >
                  {proofImage ? (
                    <Image
                      source={{ uri: proofImage.uri }}
                      style={styles.selectedImage}
                    />
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <Ionicons name="camera" size={32} color="#A98C27" />
                      <Text style={styles.imagePlaceholderText}>
                        Attach Proof Picture
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Captured Face Image */}
            {capturedImagePath && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Captured Face</Text>
                <Image
                  source={{ uri: `file://${capturedImagePath}` }}
                  style={styles.capturedImage}
                  resizeMode="cover"
                />
              </View>
            )}
          </ScrollView>

          {/* Submit Button */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[
                styles.submitButton,
                isSubmitting && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>Submit Request</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    width: width * 0.9,
    maxHeight: height * 0.8,
    backgroundColor: '#2D2D31',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  closeButton: {
    padding: 5,
  },
  scrollView: {
    width: '100%',
    maxHeight: height * 0.6,
  },
  section: {
    width: '100%',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#A98C27',
    marginBottom: 15,
  },
  inputContainer: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#1F1F22',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#444',
  },
  readOnlyInput: {
    backgroundColor: '#333',
    color: '#999',
  },
  imagePickerButton: {
    width: '100%',
    height: 120,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#444',
    borderStyle: 'dashed',
  },
  imagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1F1F22',
  },
  imagePlaceholderText: {
    color: '#A98C27',
    fontSize: 14,
    marginTop: 8,
  },
  selectedImage: {
    width: '100%',
    height: '100%',
  },
  capturedImage: {
    width: '100%',
    height: 150,
    borderRadius: 10,
  },
  buttonContainer: {
    width: '100%',
    marginTop: 20,
  },
  submitButton: {
    backgroundColor: '#A98C27',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#666',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default AdvanceSalaryRequestModal;
