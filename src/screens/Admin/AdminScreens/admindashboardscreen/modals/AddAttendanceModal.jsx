// src/screens/Admin/AddAttendanceModal.js
import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  TouchableWithoutFeedback,
  Image,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import DatePicker from 'react-native-date-picker';
import moment from 'moment';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { useUser } from '../../../../../context/UserContext';

const { width, height } = Dimensions.get('window');

const AddAttendanceModal = ({ isVisible, onClose, onSave }) => {
  const navigation = useNavigation();
  const { userName } = useUser();

  const [adminId, setAdminId] = useState('');
  const [adminName, setAdminName] = useState('');
  const [attendanceStatus, setAttendanceStatus] = useState('');
  const [attendanceDate, setAttendanceDate] = useState(new Date());
  const [openDatePicker, setOpenDatePicker] = useState(false);
  const [showAttendanceStatusPicker, setShowAttendanceStatusPicker] =
    useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertVisible, setAlertVisible] = useState(false);

  // Load current admin info on modal open
  useEffect(() => {
    if (isVisible) {
      loadCurrentAdminInfo();
    }
  }, [isVisible]);

  const loadCurrentAdminInfo = async () => {
    try {
      const adminAuthData = await AsyncStorage.getItem('adminAuth');
      if (adminAuthData) {
        const { admin } = JSON.parse(adminAuthData);
        if (admin) {
          const empId = admin.employeeId || admin.adminId || '';
          setAdminId(empId.trim());
          setAdminName(admin.name || userName);
        }
      } else if (userName) {
        setAdminName(userName);
      }
    } catch (error) {
      console.error('❌ Failed to load admin data:', error);
    }
  };

  const showAlert = message => {
    setAlertMessage(message);
    setAlertVisible(true);
  };

  const hideAlert = () => {
    setAlertVisible(false);
    setAlertMessage('');

    // ✅ Close modal only if success message
    if (alertMessage && alertMessage.includes('✅')) {
      resetForm();
      onClose();
    }
  };

  const resetForm = () => {
    setAdminId('');
    setAdminName('');
    setAttendanceStatus('');
    setAttendanceDate(new Date());
  };

  const handleSubmit = async () => {
    if (!adminId || adminId.trim() === '') {
      showAlert('Employee ID is required.');
      return;
    }

    if (!adminName || adminName.trim() === '') {
      showAlert('Employee Name is required.');
      return;
    }

    if (!attendanceStatus) {
      showAlert('Please select attendance type (Check-In or Check-Out).');
      return;
    }

    const selectType = attendanceStatus.toLowerCase().replace(/-/g, '');
    if (!['checkin', 'checkout'].includes(selectType)) {
      showAlert('Invalid attendance type.');
      return;
    }

    const dateStr = moment(attendanceDate).toISOString();

    const payload = {
      employId: adminId,
      employeName: adminName,
      slectType: selectType,
      date: dateStr,
    };

    setIsSubmitting(true);

    try {
      const token = await AsyncStorage.getItem('adminAuth');
      const authToken = token ? JSON.parse(token).token : null;

      const response = await axios.post(
        'https://sartesalon.com/api/admin/attendance',
        payload,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (response.data && response.data.message) {
        showAlert(`✅ ${response.data.message}`);
        onSave?.(response.data.attendance);
      }
    } catch (error) {
      console.error(
        '❌ Attendance submission failed:',
        error.response?.data || error.message,
      );
      const errorMsg =
        error.response?.data?.message || 'Failed to record attendance.';
      showAlert(errorMsg);
    } finally {
      setIsSubmitting(false);
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
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add Admin Attendance</Text>
                <TouchableOpacity onPress={handleClose}>
                  <Ionicons
                    name="close-circle-outline"
                    size={width * 0.025}
                    color="#fff"
                  />
                </TouchableOpacity>
              </View>

              {/* Admin ID */}
              <View style={styles.modalInputReadOnly}>
                <Text style={styles.modalInputLabel}>Employee ID:</Text>
                <Text style={styles.modalInputText}>{adminId || 'N/A'}</Text>
              </View>

              {/* Admin Name */}
              <View style={styles.modalInputReadOnly}>
                <Text style={styles.modalInputLabel}>Name:</Text>
                <Text style={styles.modalInputText}>{adminName || 'N/A'}</Text>
              </View>

              {/* Attendance Status Picker */}
              <TouchableOpacity
                style={styles.modalInputTouchable}
                onPress={() =>
                  setShowAttendanceStatusPicker(!showAttendanceStatusPicker)
                }
              >
                <Text
                  style={
                    attendanceStatus
                      ? styles.modalInputText
                      : styles.modalInputPlaceholderText
                  }
                >
                  {attendanceStatus || 'Select Type'}
                </Text>
                <Ionicons
                  name="chevron-down"
                  size={width * 0.018}
                  color="#A98C27"
                />
              </TouchableOpacity>

              {showAttendanceStatusPicker && (
                <View style={styles.pickerOptionsContainer}>
                  <TouchableOpacity
                    style={styles.pickerOption}
                    onPress={() => {
                      setAttendanceStatus('Check-In');
                      setShowAttendanceStatusPicker(false);
                    }}
                  >
                    <Text style={styles.pickerOptionText}>Check-In</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.pickerOption}
                    onPress={() => {
                      setAttendanceStatus('Check-Out');
                      setShowAttendanceStatusPicker(false);
                    }}
                  >
                    <Text style={styles.pickerOptionText}>Check-Out</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Date Picker */}
              <TouchableOpacity
                style={styles.modalInputTouchable}
                onPress={() => setOpenDatePicker(true)}
              >
                <Text style={styles.modalInputText}>
                  {moment(attendanceDate).format('MMM DD, YYYY')}
                </Text>
                <Ionicons
                  name="calendar-outline"
                  size={width * 0.018}
                  color="#A98C27"
                />
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

              {/* Action Buttons */}
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleClose}
                  disabled={isSubmitting}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.saveButton,
                    isSubmitting && styles.saveButtonDisabled,
                  ]}
                  onPress={handleSubmit}
                  disabled={isSubmitting}
                >
                  <Text style={styles.saveButtonText}>
                    {isSubmitting ? 'Saving...' : 'Save Attendance'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>

      {/* Alert Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={alertVisible}
        onRequestClose={hideAlert}
      >
        <View style={styles.customAlertCenteredView}>
          <View style={styles.customAlertModalView}>
            <Text style={styles.customAlertModalText}>{alertMessage}</Text>
            <TouchableOpacity
              style={styles.customAlertCloseButton}
              onPress={hideAlert}
            >
              <Text style={styles.customAlertCloseButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </Modal>
  );
};

// ✅ Styles - Improved Save Button Styling
const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  modalContent: {
    width: width * 0.6,
    backgroundColor: '#1E1E1E',
    borderRadius: 8,
    padding: width * 0.02,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: height * 0.02,
    paddingBottom: height * 0.01,
    borderBottomWidth: 1,
    borderBottomColor: '#3C3C3C',
  },
  modalTitle: {
    color: '#fff',
    fontSize: width * 0.02,
    fontWeight: 'bold',
  },
  modalInputReadOnly: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2A2D32',
    paddingVertical: height * 0.015,
    paddingHorizontal: width * 0.015,
    borderRadius: 8,
    marginBottom: height * 0.015,
    borderWidth: 1,
    borderColor: '#4A4A4A',
  },
  modalInputLabel: {
    color: '#A98C27',
    fontSize: width * 0.016,
    fontWeight: '600',
  },
  modalInputText: {
    color: '#fff',
    fontSize: width * 0.018,
  },
  modalInputPlaceholderText: {
    color: '#A9A9A9',
    fontSize: width * 0.018,
  },
  modalInputTouchable: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2A2D32',
    paddingVertical: height * 0.015,
    paddingHorizontal: width * 0.015,
    borderRadius: 8,
    marginBottom: height * 0.015,
    borderWidth: 1,
    borderColor: '#4A4A4A',
  },
  pickerOptionsContainer: {
    backgroundColor: '#2A2D32',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4A4A4A',
    marginBottom: height * 0.015,
    overflow: 'hidden',
  },
  pickerOption: {
    paddingVertical: height * 0.015,
    paddingHorizontal: width * 0.015,
    borderBottomWidth: 1,
    borderBottomColor: '#3C3C3C',
  },
  pickerOptionText: {
    color: '#fff',
    fontSize: width * 0.018,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: height * 0.02,
  },
  cancelButton: {
    backgroundColor: '#3C3C3C',
    paddingVertical: height * 0.015,
    paddingHorizontal: width * 0.08,
    borderRadius: 8,
    flex: 1,
    marginRight: width * 0.01,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: width * 0.016,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#A98C27',
    paddingVertical: height * 0.015,
    paddingHorizontal: width * 0.08,
    borderRadius: 8,
    flex: 1,
    marginLeft: width * 0.01,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#666',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: width * 0.016,
    fontWeight: '600',
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
    minWidth: 80,
    alignItems: 'center',
  },
  customAlertCloseButtonText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default AddAttendanceModal;
