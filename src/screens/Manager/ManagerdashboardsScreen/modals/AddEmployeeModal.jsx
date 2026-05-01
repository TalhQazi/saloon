// src/screens/admin/modals/AddEmployeeModal.jsx
import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Alert,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import moment from 'moment';

const { width, height } = Dimensions.get('window');

const AddEmployeeModal = ({ isVisible, onClose, onSave }) => {
  const navigation = useNavigation();

  const [employeeId, setEmployeeId] = useState('');
  const [employeeName, setEmployeeName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [idCardNumber, setIdCardNumber] = useState('');
  const [monthlySalary, setMonthlySalary] = useState('');

  const handleSave = () => {
    if (
      !employeeId ||
      !employeeName ||
      !phoneNumber ||
      !idCardNumber ||
      !monthlySalary
    ) {
      Alert.alert(
        'Missing Information',
        'Please fill in all employee details.',
      );
      return;
    }

    // Clean phone number (remove spaces, dashes, parentheses)
    const cleanPhoneNumber = phoneNumber.replace(/[\s\-\(\)]/g, '');

    // Validate phone number length (11-13 digits)
    if (cleanPhoneNumber.length < 11 || cleanPhoneNumber.length > 13) {
      Alert.alert('Error', 'Phone number must be 11-13 digits long');
      return;
    }

    // Validate phone number format (must start with 03 or +92)
    if (
      !cleanPhoneNumber.startsWith('03') &&
      !cleanPhoneNumber.startsWith('+92')
    ) {
      Alert.alert('Error', 'Phone number must start with 03 or +92');
      return;
    }

    const newEmployee = {
      id: employeeId,
      name: employeeName,
      phoneNumber: cleanPhoneNumber,
      idCardNumber: idCardNumber,
      salary: monthlySalary,
      joiningDate: moment().format('MMMM DD, YYYY'),
    };

    // Call the onSave prop. While EmployeesScreen doesn't update its local state
    // or navigate based on this anymore, it's good practice to keep this if
    // AddEmployeeModal is meant to "report" the new employee data upwards.
    onSave(newEmployee);

    // Reset fields immediately
    setEmployeeId('');
    setEmployeeName('');
    setPhoneNumber('');
    setIdCardNumber('');
    setMonthlySalary('');

    // Navigate to Face Recognition Screen FIRST
    // Ensure 'FaceRecognition' matches the exact name in your React Navigation stack navigator.
    navigation.navigate('FaceRecognitionScreen', { employee: newEmployee });

    // THEN close the modal
    onClose();
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add New Employee</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons
                name="close-outline"
                size={width * 0.03}
                color="#A9A9A9"
              />
            </TouchableOpacity>
          </View>

          {/* Input Fields */}
          <TextInput
            style={styles.input}
            placeholder="Employee ID"
            placeholderTextColor="#A9A9A9"
            value={employeeId}
            onChangeText={setEmployeeId}
          />
          <TextInput
            style={styles.input}
            placeholder="Employee Name"
            placeholderTextColor="#A9A9A9"
            value={employeeName}
            onChangeText={setEmployeeName}
          />
          <TextInput
            style={styles.input}
            placeholder="e.g., 03001234567 or +923001234567"
            placeholderTextColor="#A9A9A9"
            keyboardType="phone-pad"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
          />
          <TextInput
            style={styles.input}
            placeholder="ID Card Number"
            placeholderTextColor="#A9A9A9"
            value={idCardNumber}
            onChangeText={setIdCardNumber}
          />
          <TextInput
            style={styles.input}
            placeholder="Monthly Salary"
            placeholderTextColor="#A9A9A9"
            keyboardType="numeric"
            value={monthlySalary}
            onChangeText={setMonthlySalary}
          />

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.closeModalButton} onPress={onClose}>
              <Text style={styles.closeModalButtonText}>Close</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Styles (unchanged as they were already good)
const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalView: {
    width: width * 0.5,
    backgroundColor: '#1E2021',
    borderRadius: 10,
    padding: width * 0.03,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
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
    fontSize: width * 0.03,
    fontWeight: 'bold',
    color: '#fff',
  },
  closeButton: {
    padding: width * 0.005,
  },
  input: {
    width: '100%',
    backgroundColor: '#2A2D32',
    borderRadius: 8,
    padding: width * 0.025,
    marginBottom: height * 0.015,
    color: '#fff',
    fontSize: width * 0.014,
    borderWidth: 1,
    borderColor: '#4A4A4A',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: height * 0.01,
  },
  closeModalButton: {
    backgroundColor: '#2A2D32',
    borderRadius: 8,
    paddingVertical: height * 0.012,
    paddingHorizontal: width * 0.025,
    flex: 1,
    marginRight: width * 0.01,
    alignItems: 'center',
  },
  closeModalButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: width * 0.015,
  },
  saveButton: {
    backgroundColor: '#A98C27',
    borderRadius: 8,
    paddingVertical: height * 0.012,
    paddingHorizontal: width * 0.025,
    flex: 1,
    marginLeft: width * 0.01,
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: width * 0.015,
  },
});

export default AddEmployeeModal;
