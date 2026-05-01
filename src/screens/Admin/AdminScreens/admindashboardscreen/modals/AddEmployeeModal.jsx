// src/screens/admin/modals/AddEmployeeModal.jsx
import React, { useState, useEffect } from 'react';
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
import axios from 'axios';
import { BASE_URL } from '../../../../../api/config';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

// 🔐 Get authentication token
const getAuthenticatedAdmin = async () => {
  try {
    const data = await AsyncStorage.getItem('adminAuth');
    if (data) {
      const parsed = JSON.parse(data);
      if (parsed.token && parsed.isAuthenticated) {
        return parsed.token;
      }
    }
    return null;
  } catch (error) {
    console.error('Failed to get authenticated admin:', error);
    return null;
  }
};

// ✅ FIXED: Function to generate sequential IDs (PROPERLY WORKING)
const generateSequentialId = async employeeType => {
  try {
    // Get authentication token
    const token = await getAuthenticatedAdmin();
    const headers = token
      ? {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      : {};

    console.log('🔄 Generating ID for:', employeeType);

    // Fetch existing employees to get the next number
    const response = await axios.get(`${BASE_URL}/employees/all`, { headers });

    if (response.status === 200 && response.data.data) {
      const admins = response.data.grouped?.admins || [];
      const managers = response.data.grouped?.managers || [];
      const employees = response.data.grouped?.employees || [];
      const allEmployees = [...admins, ...managers, ...employees];

      console.log('📊 Total employees found:', allEmployees.length);

      // ✅ FIXED: Get ALL IDs of this type (including invalid ones for debugging)
      let allIdsOfType = [];

      if (employeeType === 'Admin') {
        allIdsOfType = allEmployees
          .filter(emp => emp.role === 'admin')
          .map(emp => emp.employeeId)
          .filter(id => id && typeof id === 'string');
      } else if (employeeType === 'Manager') {
        allIdsOfType = allEmployees
          .filter(emp => emp.role === 'manager')
          .map(emp => emp.employeeId)
          .filter(id => id && typeof id === 'string');
      } else {
        allIdsOfType = allEmployees
          .filter(emp => emp.role === 'employee')
          .map(emp => emp.employeeId)
          .filter(id => id && typeof id === 'string');
      }

      console.log(`📝 All ${employeeType} IDs:`, allIdsOfType);

      // ✅ FIXED: Filter only VALID format IDs (ADM001, MGR002, EMP003, etc.)
      const validIds = allIdsOfType.filter(id => {
        if (employeeType === 'Admin') {
          return /^ADM\d+$/.test(id); // ADM followed by numbers only
        } else if (employeeType === 'Manager') {
          return /^MGR\d+$/.test(id); // MGR followed by numbers only
        } else {
          return /^EMP\d+$/.test(id); // EMP followed by numbers only
        }
      });

      console.log(`✅ Valid ${employeeType} IDs:`, validIds);

      // ✅ FIXED: Extract numbers safely
      const numbers = validIds
        .map(id => {
          const numberPart = id.replace(/^[A-Z]+/, ''); // Remove prefix
          const number = parseInt(numberPart);

          // Return only valid positive numbers
          if (!isNaN(number) && number > 0) {
            return number;
          }
          return 0;
        })
        .filter(num => num > 0); // Remove zeros

      console.log(`🔢 Extracted numbers:`, numbers);

      // Find the highest number
      const highestNumber = numbers.length > 0 ? Math.max(...numbers) : 0;
      const nextNumber = highestNumber + 1;

      console.log(`🎯 Next ${employeeType} number:`, nextNumber);

      // Generate new ID
      let newId;
      if (employeeType === 'Admin') {
        newId = `ADM${nextNumber.toString().padStart(3, '0')}`;
      } else if (employeeType === 'Manager') {
        newId = `MGR${nextNumber.toString().padStart(3, '0')}`;
      } else {
        newId = `EMP${nextNumber.toString().padStart(3, '0')}`;
      }

      console.log(`🆕 Generated new ID:`, newId);
      return newId;
    } else {
      console.log('❌ API response issue, using fallback');
      // Fallback if API response issue
      return employeeType === 'Admin'
        ? 'ADM001'
        : employeeType === 'Manager'
        ? 'MGR001'
        : 'EMP001';
    }
  } catch (error) {
    console.error('❌ Error generating sequential ID:', error);
    // Fallback if API fails completely
    return employeeType === 'Admin'
      ? 'ADM001'
      : employeeType === 'Manager'
      ? 'MGR001'
      : 'EMP001';
  }
};

const AddEmployeeModal = ({ isVisible, onClose, onSave }) => {
  const navigation = useNavigation();

  const [employeeId, setEmployeeId] = useState(''); // Employee ID state
  const [employeeName, setEmployeeName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [idCardNumber, setIdCardNumber] = useState('');
  const [monthlySalary, setMonthlySalary] = useState('');
  const [employeeType, setEmployeeType] = useState('Employee');

  // ✅ CORRECTED: Single useEffect with proper logging
  useEffect(() => {
    if (isVisible) {
      console.log('🎯 Modal opened, generating ID for:', employeeType);
      generateSequentialId(employeeType).then(id => {
        console.log('✅ Final ID set to:', id);
        setEmployeeId(id);
      });
    }
  }, [isVisible, employeeType]);

  // Function to regenerate ID when employee type changes
  const handleEmployeeTypeChange = type => {
    console.log('🔄 Employee type changed to:', type);
    setEmployeeType(type);
    // Regenerate ID for the new type
    generateSequentialId(type).then(id => {
      console.log('✅ New ID generated:', id);
      setEmployeeId(id);
    });
  };

  const handleSave = () => {
    if (
      !employeeId ||
      !employeeName ||
      !phoneNumber ||
      !idCardNumber ||
      !monthlySalary ||
      !employeeType
    ) {
      Alert.alert(
        'Missing Information',
        'Please fill in all employee details.',
      );
      return;
    }

    try {
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

      // ✅ FIXED: Ensure correct ID format before sending to backend
      let finalEmployeeId = employeeId;

      // If backend returns wrong ID (like EMP006 for admin), fix it here
      if (employeeType === 'Admin' && !employeeId.startsWith('ADM')) {
        // Extract number from wrong ID and create correct admin ID
        const numberMatch = employeeId.match(/\d+/);
        if (numberMatch) {
          const number = numberMatch[0];
          finalEmployeeId = `ADM${number.padStart(3, '0')}`;
          console.log('🔄 Corrected employee ID:', finalEmployeeId);
        }
      } else if (employeeType === 'Manager' && !employeeId.startsWith('MGR')) {
        // Extract number from wrong ID and create correct manager ID
        const numberMatch = employeeId.match(/\d+/);
        if (numberMatch) {
          const number = numberMatch[0];
          finalEmployeeId = `MGR${number.padStart(3, '0')}`;
          console.log('🔄 Corrected employee ID:', finalEmployeeId);
        }
      }
      // For Employee type, EMP prefix should already be correct

      // Prepare employee data for API
      const employeeData = {
        name: employeeName,
        phoneNumber: cleanPhoneNumber,
        idCardNumber: idCardNumber,
        monthlySalary: monthlySalary,
        role: employeeType.toLowerCase(),
        // ✅ ADD THIS: Send employeeId to backend
        employeeId: finalEmployeeId,
      };

      const newEmployee = {
        id: finalEmployeeId, // ✅ Use the corrected ID
        name: employeeName,
        phoneNumber: cleanPhoneNumber,
        idCardNumber: idCardNumber,
        salary: monthlySalary,
        joiningDate: moment().format('MMMM DD, YYYY'),
        faceImage: null,
        type: employeeType,
        apiData: employeeData,
      };

      console.log('💾 Final employee data:', newEmployee);

      onSave(newEmployee);

      // Reset fields
      setEmployeeId('');
      setEmployeeName('');
      setPhoneNumber('');
      setIdCardNumber('');
      setMonthlySalary('');
      setEmployeeType('Employee');

      onClose();
      navigation.navigate('FaceRecognitionScreen', { employee: newEmployee });
    } catch (error) {
      console.error('Error preparing employee data:', error);
      Alert.alert(
        'Error',
        'Failed to prepare employee data. Please try again.',
      );
    }
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

          {/* Employee ID Display */}
          <View style={styles.idContainer}>
            <Text style={styles.idLabel}>Employee ID:</Text>
            <Text style={styles.idValue}>{employeeId}</Text>
          </View>

          {/* Input Fields */}
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

          {/* Employee Type Selection */}
          <View style={styles.typeSelectionContainer}>
            <Text style={styles.typeLabel}>Employee Type:</Text>

            <View style={styles.typeButtonsRow}>
              {['Admin', 'Manager', 'Employee'].map(type => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.typeButton,
                    employeeType === type && styles.selectedTypeButton,
                  ]}
                  onPress={() => handleEmployeeTypeChange(type)}
                >
                  <Text
                    style={[
                      styles.typeButtonText,
                      employeeType === type && styles.selectedTypeButtonText,
                    ]}
                  >
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

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
  idContainer: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2A2D32',
    borderRadius: 8,
    padding: width * 0.02,
    marginBottom: height * 0.015,
    borderWidth: 1,
    borderColor: '#4A4A4A',
  },
  idLabel: {
    color: '#A9A9A9',
    fontSize: width * 0.014,
    fontWeight: '600',
  },
  idValue: {
    color: '#A98C27',
    fontSize: width * 0.014,
    fontWeight: 'bold',
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
  typeSelectionContainer: {
    width: '100%',
    marginBottom: height * 0.02,
  },
  typeLabel: {
    color: '#fff',
    fontSize: width * 0.015,
    marginBottom: height * 0.01,
  },
  typeButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  typeButton: {
    flex: 1,
    paddingVertical: height * 0.01,
    alignItems: 'center',
    backgroundColor: '#2A2D32',
    borderRadius: 5,
    marginHorizontal: width * 0.005,
    borderWidth: 1,
    borderColor: '#4A4A4A',
  },
  selectedTypeButton: {
    backgroundColor: '#A98C27',
    borderColor: '#A98C27',
  },
  typeButtonText: {
    color: '#fff',
    fontSize: width * 0.014,
  },
  selectedTypeButtonText: {
    fontWeight: 'bold',
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
