// src/components/modals/EmployeeAttendanceModal.jsx

import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Image,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TextInput,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import DatePicker from 'react-native-date-picker';
import moment from 'moment';
import { submitAttendanceRequest } from '../../../../api/attendanceRequestService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const EmployeeAttendanceModal = ({ route, navigation }) => {
  const { employee, capturedImage, confidence } = route.params || {};

  const [attendanceType, setAttendanceType] = useState('');
  const [attendanceDate, setAttendanceDate] = useState(new Date());
  const [openDatePicker, setOpenDatePicker] = useState(false);
  const [showAttendanceTypePicker, setShowAttendanceTypePicker] =
    useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [attendanceTime, setAttendanceTime] = useState(new Date());
  const [openTimePicker, setOpenTimePicker] = useState(false);
  const [note, setNote] = useState('');

  const [customAlertVisible, setCustomAlertVisible] = useState(false);
  const [customAlertMessage, setCustomAlertMessage] = useState('');
  const [customAlertCallback, setCustomAlertCallback] = useState(null);

  useEffect(() => {
    console.log(
      '🟢 [EmployeeAttendanceModal] Modal opened with employee:',
      employee,
    );
    console.log('🟢 [EmployeeAttendanceModal] Employee ID:', employee?._id);
  }, [employee]);

  const showCustomAlert = (message, callback = null) => {
    setCustomAlertMessage(message);
    setCustomAlertCallback(() => callback);
    setCustomAlertVisible(true);
  };

  const hideCustomAlert = () => {
    setCustomAlertVisible(false);
    setCustomAlertMessage('');
    if (customAlertCallback) {
      customAlertCallback();
      setCustomAlertCallback(null);
    }
  };

  const goBackTwoOrToAttendance = () => {
    try {
      const state = navigation.getState ? navigation.getState() : null;
      if (state && typeof state.index === 'number' && state.index >= 2) {
        // Pop two screens from the stack (Modal -> FaceRecognition -> AttendanceScreen)
        navigation.pop(2);
      } else {
        // Fallback: ensure we end up on AttendanceScreen
        navigation.navigate('AttendanceScreen');
      }
    } catch (e) {
      navigation.navigate('AttendanceScreen');
    }
  };

  const handleSubmitAttendance = async () => {
    if (!employee || !employee._id) {
      showCustomAlert(
        'Error: Employee data is missing. Please try again from the previous screen.',
      );
      console.error(
        ' Employee ID or data not found in route params:',
        employee,
      );
      return;
    }

    const employeeId = employee.employeeId || employee._id || employee.id;

    if (typeof employeeId !== 'string' || employeeId.trim() === '') {
      showCustomAlert('Invalid employee ID. Please try again.');
      return;
    }

    if (!attendanceType) {
      showCustomAlert('Please select attendance type (Check-In or Check-Out).');
      return;
    }

    const attendanceApiType =
      attendanceType === 'Check-In' ? 'checkin' : 'checkout';

    try {
      setIsSubmitting(true);

      const requestData = {
        employeeId: employeeId,
        employeeName: employee.name,
        requestType: attendanceApiType,
        date: attendanceDate.toISOString().split('T')[0],
        requestedTime: attendanceTime.toISOString(),
        note: note || 'Manual attendance request by manager',
      };

      console.log(' Submitting request with data:', requestData);

      const response = await submitAttendanceRequest(requestData);

      console.log(' API Response:', response);

      if (response?.success) {
        // On success, always end up back on AttendanceScreen (2 screens back)
        showCustomAlert(
          ` Attendance request for ${employee.name} submitted successfully!`,
          () => {
            goBackTwoOrToAttendance();
          },
        );
      } else if (response?.message) {
        // Even if backend only sends a message, treat as success and go back
        showCustomAlert(` ${response.message}`, () => {
          goBackTwoOrToAttendance();
        });
      } else {
        throw new Error('Unexpected response from server.');
      }
    } catch (error) {
      console.error(' API Error:', error.response?.data || error.message);
      let errorMessage = 'Failed to submit attendance. ';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      } else {
        errorMessage = 'An unknown error occurred.';
      }
      showCustomAlert(`❌ ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleClose = () => {
    navigation.goBack();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: '#1a1a1a' }}
      enabled
    >
      <ScrollView
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Employee Attendance</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.content}>
          <View style={styles.employeeInfoContainer}>
            <Text style={styles.sectionTitle}>Recognized Employee</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>ID:</Text>
              <Text style={styles.infoValue}>
                {employee?.employeeId || 'N/A'}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Name:</Text>
              <Text style={styles.infoValue}>
                {employee?.name || 'Unknown'}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Role:</Text>
              <Text style={styles.infoValue}>
                {employee?.role === 'manager' ? 'Manager' : 'Employee'}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Confidence:</Text>
              <Text style={styles.confidenceValue}>
                {confidence?.toFixed(1)}%
              </Text>
            </View>
          </View>

          {capturedImage && (
            <View style={styles.imageContainer}>
              <Text style={styles.sectionTitle}>Captured Face</Text>
              <Image
                source={{ uri: capturedImage }}
                style={styles.capturedImage}
                resizeMode="cover"
              />
            </View>
          )}

          <View style={styles.inputContainer}>
            <Text style={styles.sectionTitle}>Attendance Details</Text>

            <TouchableOpacity
              style={styles.inputTouchable}
              onPress={() =>
                setShowAttendanceTypePicker(!showAttendanceTypePicker)
              }
            >
              <Text
                style={
                  attendanceType
                    ? styles.inputText
                    : styles.inputPlaceholderText
                }
              >
                {attendanceType || 'Select Attendance Type'}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#A9A9A9" />
            </TouchableOpacity>

            {showAttendanceTypePicker && (
              <View style={styles.pickerContainer}>
                <TouchableOpacity
                  style={styles.pickerOption}
                  onPress={() => {
                    setAttendanceType('Check-In');
                    setShowAttendanceTypePicker(false);
                  }}
                >
                  <Text style={styles.pickerOptionText}>Check-In</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.pickerOption}
                  onPress={() => {
                    setAttendanceType('Check-Out');
                    setShowAttendanceTypePicker(false);
                  }}
                >
                  <Text style={styles.pickerOptionText}>Check-Out</Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              style={styles.inputTouchable}
              onPress={() => setOpenDatePicker(true)}
            >
              <Text style={styles.inputText}>
                {moment(attendanceDate).format('MMM DD, YYYY')}
              </Text>
              <Ionicons name="calendar-outline" size={20} color="#A9A9A9" />
            </TouchableOpacity>

            <DatePicker
              modal
              mode="date"
              open={openDatePicker}
              date={attendanceDate}
              onConfirm={date => {
                setOpenDatePicker(false);
                setAttendanceDate(date);
              }}
              onCancel={() => setOpenDatePicker(false)}
            />

            <TouchableOpacity
              style={styles.inputTouchable}
              onPress={() => setOpenTimePicker(true)}
            >
              <Text style={styles.inputText}>
                {moment(attendanceTime).format('hh:mm A')}
              </Text>
              <Ionicons name="time-outline" size={20} color="#A9A9A9" />
            </TouchableOpacity>

            <DatePicker
              modal
              mode="time"
              open={openTimePicker}
              date={attendanceTime}
              onConfirm={time => {
                setOpenTimePicker(false);
                setAttendanceTime(time);
              }}
              onCancel={() => setOpenTimePicker(false)}
            />

            <TextInput
              style={styles.noteInput}
              placeholder="Add a note (e.g., 'Forgot to check out')"
              placeholderTextColor="#A9A9A9"
              multiline={true}
              value={note}
              onChangeText={setNote}
            />
          </View>

          <TouchableOpacity
            style={[
              styles.submitButton,
              isSubmitting && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmitAttendance}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Save Attendance</Text>
            )}
          </TouchableOpacity>
        </View>

        <Modal
          animationType="fade"
          transparent={true}
          visible={customAlertVisible}
          onRequestClose={hideCustomAlert}
        >
          <View style={styles.alertCenteredView}>
            <View style={styles.alertModalView}>
              <Text style={styles.alertModalText}>{customAlertMessage}</Text>
              <TouchableOpacity
                style={styles.alertButton}
                onPress={hideCustomAlert}
              >
                <Text style={styles.alertButtonText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  scrollViewContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#2a2a2a',
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
  content: {
    padding: 20,
  },
  employeeInfoContainer: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#A98C27',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoLabel: {
    color: '#ccc',
    fontSize: 14,
    fontWeight: '600',
  },
  infoValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  confidenceValue: {
    color: '#A98C27',
    fontSize: 14,
    fontWeight: 'bold',
  },
  imageContainer: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  capturedImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#A98C27',
  },
  inputContainer: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  inputTouchable: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#4A4A4A',
  },
  inputText: {
    color: '#fff',
    fontSize: 16,
  },
  inputPlaceholderText: {
    color: '#A9A9A9',
    fontSize: 16,
  },
  pickerContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4A4A4A',
    marginBottom: 15,
    overflow: 'hidden',
  },
  pickerOption: {
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#3C3C3C',
  },
  pickerOptionText: {
    color: '#fff',
    fontSize: 16,
  },
  submitButton: {
    backgroundColor: '#A98C27',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: 'rgba(0, 0, 0, 0.5)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 2,
    marginVertical: 10,
  },
  submitButtonDisabled: {
    backgroundColor: '#666',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  noteInput: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    paddingVertical: 15,
    paddingHorizontal: 15,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#4A4A4A',
    minHeight: 100,
    textAlignVertical: 'top',
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

export default EmployeeAttendanceModal;
