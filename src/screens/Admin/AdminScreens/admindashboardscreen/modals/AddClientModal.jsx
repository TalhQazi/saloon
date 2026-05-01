// src/screens/Admin/AddClientModal.js

import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  TouchableWithoutFeedback,
  Alert,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import DatePicker from 'react-native-date-picker';
import moment from 'moment';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage'; // 👈 Import AsyncStorage
import { BASE_URL } from '../../../../../api/config';

const { width, height } = Dimensions.get('window');

const AddClientModal = ({ isVisible, onClose, onSave }) => {
  const [clientName, setClientName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [comingDate, setComingDate] = useState(new Date());
  const [openDatePicker, setOpenDatePicker] = useState(false);

  const showCustomAlert = message => {
    Alert.alert('Message', message);
  };

  const resetForm = () => {
    setClientName('');
    setPhoneNumber('');
    setComingDate(new Date());
  };

  // 🔐 Retrieve token from AsyncStorage
  const getAuthToken = async () => {
    try {
      const authData = await AsyncStorage.getItem('adminAuth');
      if (authData) {
        const { token } = JSON.parse(authData);
        return token; // 👈 Return JWT token
      }
      return null;
    } catch (error) {
      console.error('Failed to load token from storage:', error);
      return null;
    }
  };

  // 💾 Handle Save with Dynamic Token
  const handleSave = async () => {
    const trimmedClientName = clientName.trim();
    const trimmedPhoneNumber = phoneNumber.trim();

    if (!trimmedClientName || !trimmedPhoneNumber) {
      showCustomAlert('Please fill in Client Name and Phone Number.');
      return;
    }

    // Clean phone number (remove spaces, dashes, parentheses)
    const cleanPhoneNumber = trimmedPhoneNumber.replace(/[\s\-\(\)]/g, '');

    // Validate phone number length (11-13 digits)
    if (cleanPhoneNumber.length < 11 || cleanPhoneNumber.length > 13) {
      showCustomAlert('Phone number must be 11-13 digits long');
      return;
    }

    // Validate phone number format (must start with 03 or +92)
    if (
      !cleanPhoneNumber.startsWith('03') &&
      !cleanPhoneNumber.startsWith('+92')
    ) {
      showCustomAlert('Phone number must start with 03 or +92');
      return;
    }

    const clientData = {
      name: trimmedClientName,
      phoneNumber: cleanPhoneNumber,
      comingDate: moment(comingDate).format('MMMM DD, YYYY'),
    };

    const apiUrl = `${BASE_URL}/clients/add`;

    try {
      // 🛑 Get token dynamically
      const token = await getAuthToken();
      if (!token) {
        showCustomAlert('Session expired. Please log in again.');
        onClose();
        // Optionally: navigate to login
        return;
      }

      const response = await axios.post(apiUrl, clientData, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`, // ✅ Now using real token.
        },
      });

      console.log('API Response:', response.data);

      if (response.data.success) {
        // Check if this is an existing client or new client
        if (response.data.existingClient) {
          // Existing client found - visit was added
          showCustomAlert(
            `Client with phone number ${trimmedPhoneNumber} already exists!\n\nName: ${response.data.existingClient.name}\nTotal Visits: ${response.data.existingClient.totalVisits}\nTotal Spent: ${response.data.existingClient.totalSpent} PKR\n\n✅ New visit added to existing client!`,
          );
          onSave(response.data.existingClient);
        } else {
          // New client created with initial visit
          showCustomAlert('Client added successfully with initial visit!');
          onSave(response.data.client);
        }
        resetForm();
        onClose();
      } else {
        showCustomAlert(response.data.message || 'Failed to add client.');
      }
    } catch (error) {
      console.error('API Error:', error.response?.data || error.message);
      if (error.response?.status === 401) {
        showCustomAlert('Unauthorized. Session expired.');
        // Optionally clear session and redirect to login
      } else if (error.response?.status === 400) {
        showCustomAlert(error.response.data.message || 'Invalid data.');
      } else {
        showCustomAlert('Network error. Please try again later.');
      }
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={isVisible}
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.centeredView}>
          <TouchableWithoutFeedback>
            <View style={styles.modalView}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add Direct New Client</Text>
                <TouchableOpacity
                  onPress={handleClose}
                  style={styles.crossButton}
                >
                  <Ionicons
                    name="close-circle-outline"
                    size={width * 0.03}
                    color="#A9A9A9"
                  />
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.input}
                placeholder="Client Name"
                placeholderTextColor="#A9A9A9"
                value={clientName}
                onChangeText={setClientName}
              />
              <TextInput
                style={styles.input}
                placeholder="e.g., 03001234567 or +923001234567"
                placeholderTextColor="#A9A9A9"
                keyboardType="phone-pad"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
              />

              <TouchableOpacity
                style={styles.datePickerInput}
                onPress={() => setOpenDatePicker(true)}
              >
                <Text style={styles.datePickerText}>
                  {moment(comingDate).format('MMMM DD, YYYY')}
                </Text>
                <Ionicons
                  name="calendar-outline"
                  size={width * 0.018}
                  color="#A9A9A9"
                />
              </TouchableOpacity>

              <DatePicker
                modal
                mode="date"
                open={openDatePicker}
                date={comingDate}
                onConfirm={date => {
                  setOpenDatePicker(false);
                  setComingDate(date);
                }}
                onCancel={() => setOpenDatePicker(false)}
              />

              <View style={styles.buttons}>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={handleClose}
                >
                  <Text style={styles.closeButtonText}>Close</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleSave}
                >
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

// --- Styles (Unchanged) ---
const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalView: {
    width: width * 0.48,
    backgroundColor: '#1F1F1F',
    borderRadius: 10,
    padding: width * 0.02,
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
    marginBottom: height * 0.02,
  },
  modalTitle: {
    fontSize: width * 0.025,
    fontWeight: 'bold',
    color: '#fff',
  },
  crossButton: {
    padding: width * 0.004,
  },
  input: {
    width: '100%',
    backgroundColor: '#2A2D32',
    borderRadius: 8,
    padding: width * 0.022,
    marginBottom: height * 0.015,
    color: '#fff',
    fontSize: width * 0.014,
    borderWidth: 1,
    borderColor: '#4A4A4A',
  },
  datePickerInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    backgroundColor: '#2A2D32',
    borderRadius: 8,
    padding: width * 0.022,
    marginBottom: height * 0.015,
    borderWidth: 1,
    borderColor: '#4A4A4A',
  },
  datePickerText: {
    color: '#fff',
    fontSize: width * 0.014,
  },
  buttons: {
    justifyContent: 'space-between',
    flexDirection: 'row',
    gap: width * 0.02,
  },
  saveButton: {
    backgroundColor: '#A98C27',
    borderRadius: 8,
    paddingHorizontal: width * 0.08,
    paddingVertical: height * 0.015,
    alignItems: 'center',
    marginTop: height * 0.02,
    marginBottom: height * 0.01,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: width * 0.018,
    fontWeight: 'bold',
  },
  closeButton: {
    borderRadius: 8,
    paddingHorizontal: width * 0.08,
    paddingVertical: height * 0.015,
    alignItems: 'center',
    marginTop: height * 0.02,
    marginBottom: height * 0.01,
    backgroundColor: '#A98C27',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: width * 0.018,
    fontWeight: 'bold',
  },
  customAlertCenteredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  customAlertModalView: {
    margin: 20,
    backgroundColor: '#1F1F1F',
    borderRadius: 10,
    padding: 35,
    alignItems: 'center',
    elevation: 5,
  },
  customAlertModalText: {
    marginBottom: 15,
    textAlign: 'center',
    color: '#fff',
    fontSize: width * 0.02,
  },
  customAlertCloseButton: {
    backgroundColor: '#A98C27',
    borderRadius: 5,
    padding: 10,
    elevation: 2,
  },
  customAlertCloseButtonText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default AddClientModal;
