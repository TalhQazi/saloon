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
  Image,
  ActivityIndicator,                                  
  ScrollView,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import DatePicker from 'react-native-date-picker';
import { launchImageLibrary } from 'react-native-image-picker';
import { addAdminAdvanceSalary } from '../../../../../api/adminAdvanceSalaryService';
import { getEmployeesByRoleApi } from '../../../../../api/attendanceService';

const { width, height } = Dimensions.get('window');

const AddAdvanceSalaryModal = ({ isVisible, onClose, onSave }) => {
  const [amount, setAmount] = useState('');
  const [selectedDate, setSelectedDate] = useState(null);
  const [openDatePicker, setOpenDatePicker] = useState(false);
  const [imageUri, setImageUri] = useState(null);
  const [loading, setLoading] = useState(false);

  const [selectedRole, setSelectedRole] = useState(''); // 'manager' | 'employee'
  const [rolePickerOpen, setRolePickerOpen] = useState(false);
  const [userPickerOpen, setUserPickerOpen] = useState(false);
  const [userOptions, setUserOptions] = useState([]); // [{employeeId,name,role}]
  const [usersLoading, setUsersLoading] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [selectedEmployeeName, setSelectedEmployeeName] = useState('');

  // Custom Alert Modal States
  const [customAlertVisible, setCustomAlertVisible] = useState(false);
  const [customAlertMessage, setCustomAlertMessage] = useState('');
  const [customAlertAction, setCustomAlertAction] = useState(null);

  // Function to show custom alert
  const showCustomAlert = (message, action = null) => {
    setCustomAlertMessage(message);
    setCustomAlertAction(() => action);
    setCustomAlertVisible(true);
  };

  // Function to hide custom alert
  const hideCustomAlert = () => {
    setCustomAlertVisible(false);
    setCustomAlertMessage('');
    if (customAlertAction) {
      customAlertAction();
      setCustomAlertAction(null);
    }
  };

  const resetForm = () => {
    setAmount('');
    setSelectedDate(null);
    setImageUri(null);
    setSelectedRole('');
    setRolePickerOpen(false);
    setUserPickerOpen(false);
    setUserOptions([]);
    setSelectedEmployeeId('');
    setSelectedEmployeeName('');
  };

  const loadUsersForRole = async role => {
    try {
      setUsersLoading(true);
      const list = await getEmployeesByRoleApi(role);
      setUserOptions(list || []);
    } catch (error) {
      console.error('❌ [AddAdvanceSalaryModal] Error loading users:', error);
      setUserOptions([]);
    } finally {
      setUsersLoading(false);
    }
  };

  const handleSave = async () => {
    if (!amount.trim()) {
      showCustomAlert('Please enter the amount.');
      return;
    }

    if (isNaN(parseFloat(amount.trim()))) {
      showCustomAlert('Amount must be a valid number.');
      return;
    }

    if (!selectedRole) {
      showCustomAlert('Please select a role (Manager or Employee).');
      return;
    }

    if (!selectedEmployeeId || !selectedEmployeeName) {
      showCustomAlert('Please select a user for advance salary.');
      return;
    }

    if (!imageUri) {
      showCustomAlert('Please select an image.');
      return;
    }

    setLoading(true);

    try {
      const response = await addAdminAdvanceSalary(
        parseFloat(amount.trim()),
        imageUri,
        selectedEmployeeId,
      );

      showCustomAlert('Advance salary added successfully!', () => {
        resetForm();
        onClose();
        if (onSave) {
          onSave(response.advanceSalary);
        }
      });
    } catch (error) {
      console.error('Error adding advance salary:', error);
      let errorMessage = 'Failed to add advance salary.';

      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      showCustomAlert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleImagePicker = async () => {
    const options = {
      mediaType: 'photo',
      quality: 0.8,
      maxWidth: 800,
      maxHeight: 800,
    };

    try {
      const response = await launchImageLibrary(options);

      if (response.didCancel) {
        console.log('User cancelled image picker');
      } else if (response.errorCode) {
        console.log(
          'ImagePicker Error: ',
          response.errorCode,
          response.errorMessage,
        );
        showCustomAlert(
          `Image Picker Error: ${
            response.errorMessage || 'Something went wrong.'
          }`,
        );
      } else if (response.assets && response.assets.length > 0) {
        const selectedImage = response.assets[0];
        setImageUri(selectedImage.uri);
      }
    } catch (error) {
      console.error('Error launching image library:', error);
      showCustomAlert(
        'Failed to open image library. Please check permissions.',
      );
    }
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
                <Text style={styles.modalTitle}>Add Advance Salary</Text>
                <TouchableOpacity onPress={handleClose}>
                  <Ionicons
                    name="close-circle-outline"
                    size={width * 0.025}
                    color="#fff"
                  />
                </TouchableOpacity>
              </View>

              {/* Amount */}
              <TextInput
                style={styles.modalInput}
                placeholder="Amount (PKR)"
                placeholderTextColor="#fff"
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
              />

              {/* Role Picker */}
              <View style={{ marginBottom: height * 0.015 }}>
                <Text style={styles.modalInputLabel}>Select Role *</Text>
                <TouchableOpacity
                  style={styles.modalInputTouchable}
                  onPress={() => {
                    setRolePickerOpen(prev => !prev);
                    setUserPickerOpen(false);
                  }}
                >
                  <Text style={styles.modalInputText}>
                    {selectedRole === 'manager'
                      ? 'Manager'
                      : selectedRole === 'employee'
                      ? 'Employee'
                      : 'Tap to select role'}
                  </Text>
                  <Ionicons
                    name={rolePickerOpen ? 'chevron-up' : 'chevron-down'}
                    size={width * 0.018}
                    color="#A9A9A9"
                  />
                </TouchableOpacity>
                {rolePickerOpen && (
                  <View style={styles.dropdownContainer}>
                    <TouchableOpacity
                      style={styles.dropdownItem}
                      onPress={() => {
                        setSelectedRole('manager');
                        setRolePickerOpen(false);
                        setSelectedEmployeeId('');
                        setSelectedEmployeeName('');
                        loadUsersForRole('manager');
                      }}
                    >
                      <Text style={styles.dropdownText}>Manager</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.dropdownItem}
                      onPress={() => {
                        setSelectedRole('employee');
                        setRolePickerOpen(false);
                        setSelectedEmployeeId('');
                        setSelectedEmployeeName('');
                        loadUsersForRole('employee');
                      }}
                    >
                      <Text style={styles.dropdownText}>Employee</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* User Picker */}
              <View style={{ marginBottom: height * 0.015 }}>
                <Text style={styles.modalInputLabel}>Select User *</Text>
                <TouchableOpacity
                  style={styles.modalInputTouchable}
                  onPress={() => {
                    if (!selectedRole) return;
                    setUserPickerOpen(prev => !prev);
                    setRolePickerOpen(false);
                  }}
                >
                  <Text style={styles.modalInputText}>
                    {selectedEmployeeId && selectedEmployeeName
                      ? `${selectedEmployeeName} (${selectedEmployeeId})`
                      : selectedRole
                      ? usersLoading
                        ? 'Loading users...'
                        : 'Tap to select user'
                      : 'Select role first'}
                  </Text>
                  <Ionicons
                    name={userPickerOpen ? 'chevron-up' : 'chevron-down'}
                    size={width * 0.018}
                    color="#fff"
                  />
                </TouchableOpacity>
                {userPickerOpen && !usersLoading && (
                  <View style={styles.dropdownContainer}>
                    {userOptions.length === 0 ? (
                      <Text style={styles.dropdownEmptyText}>
                        No users found for selected role
                      </Text>
                    ) : (
                      <ScrollView style={{ maxHeight: height * 0.25 }}>
                        {userOptions.map(user => (
                          <TouchableOpacity
                            key={user._id || user.employeeId}
                            style={styles.dropdownItem}
                            onPress={() => {
                              setSelectedEmployeeId(user.employeeId);
                              setSelectedEmployeeName(user.name);
                              setUserPickerOpen(false);
                            }}
                          >
                            <Text style={styles.dropdownText}>
                              {user.name} ({user.employeeId})
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    )}
                  </View>
                )}
              </View>

              {/* Date Picker Trigger (optional, currently commented) */}
              {/* <TouchableOpacity
                style={styles.modalInputTouchable}
                onPress={() => setOpenDatePicker(true)}
              >
                <Text
                  style={[
                    styles.modalInputText,
                    !selectedDate && styles.placeholderText,
                  ]}
                >
                  {selectedDate
                    ? selectedDate.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : 'Select Date (Required)'}
                </Text>
                <Ionicons
                  name="calendar-outline"
                  size={width * 0.018}
                  color="#A9A9A9"
                />
              </TouchableOpacity> */}

              <DatePicker
                modal
                mode="date"
                open={openDatePicker}
                date={selectedDate || new Date()}
                onConfirm={date => {
                  setOpenDatePicker(false);
                  setSelectedDate(date);
                }}
                onCancel={() => setOpenDatePicker(false)}
              />

              {/* Image Picker Section */}
              <TouchableOpacity
                style={styles.fileUploadContainer}
                onPress={handleImagePicker}
              >
                {imageUri ? (
                  <Image
                    source={{ uri: imageUri }}
                    style={styles.selectedImagePreview}
                  />
                ) : (
                  <>
                    <Ionicons
                      name="cloud-upload-outline"
                      size={width * 0.03}
                      color="#fff"
                    />
                    <Text style={styles.fileUploadText}>
                      Select Image (Required)
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={handleClose}
                  disabled={loading}
                >
                  <Text style={styles.closeButtonText}>Close</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.saveButton,
                    loading && styles.saveButtonDisabled,
                  ]}
                  onPress={handleSave}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.saveButtonText}>Save</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>

      {/* Custom Alert Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={customAlertVisible}
        onRequestClose={hideCustomAlert}
      >
        <View style={styles.customAlertCenteredView}>
          <View style={styles.customAlertModalView}>
            <Text style={styles.customAlertModalText}>
              {customAlertMessage}
            </Text>
            <TouchableOpacity
              style={styles.customAlertCloseButton}
              onPress={hideCustomAlert}
            >
              <Text style={styles.customAlertCloseButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(53, 53, 53, 0.9)',
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
  modalInputLabel:{
 color: '#fff',
    fontSize: width * 0.018,
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
  modalInput: {
    backgroundColor: '#2A2D32',
    color: '#fff',
    fontSize: width * 0.018,
    paddingVertical: height * 0.015,
    paddingHorizontal: width * 0.015,
    borderRadius: 8,
    marginBottom: height * 0.015,
    borderWidth: 1,
    borderColor: '#4A4A4A',
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
  modalInputText: {
    color: '#fff',
    fontSize: width * 0.018,
  },
  placeholderText: {
    color: '#fff',
  },
  // Dropdown styles (shared by Select Role / Select User)
  dropdownContainer: {
    marginTop: height * 0.007,
    backgroundColor: '#161719',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#3C3C3C',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },
  dropdownItem: {
    paddingVertical: height * 0.014,
    paddingHorizontal: width * 0.015,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2D32',
    backgroundColor: '#212327',
  },
  dropdownText: {
    color: '#faf9f6',
    fontSize: width * 0.017,
    fontWeight: '500',
  },
  dropdownEmptyText: {
    paddingVertical: height * 0.012,
    paddingHorizontal: width * 0.015,
    color: '#A9A9A9',
    fontSize: width * 0.016,
  },
  fileUploadContainer: {
    backgroundColor: '#2A2D32',
    borderWidth: 1,
    borderColor: '#4A4A4A',
    borderRadius: 8,
    borderStyle: 'dashed',
    paddingVertical: height * 0.03,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: height * 0.02,
    height: height * 0.15, // Fixed height for the upload area
  },
  fileUploadText: {
    color: '#fff',
    fontSize: width * 0.015,
    marginTop: height * 0.01,
  },
  selectedImagePreview: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    resizeMode: 'contain',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: height * 0.02,
  },
  closeButton: {
    backgroundColor: '#3C3C3C',
    paddingVertical: height * 0.015,
    paddingHorizontal: width * 0.11,
    borderRadius: 8,
    marginRight: width * 0.02,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: width * 0.016,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#A98C27',
    paddingVertical: height * 0.015,
    paddingHorizontal: width * 0.11,
    borderRadius: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: width * 0.016,
    fontWeight: '600',
  },
  saveButtonDisabled: {
    backgroundColor: '#4A4A4A', // Gray out the button when disabled
    opacity: 0.7,
  },
  // Styles for custom alert modal (local to this component)
  customAlertCenteredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Dim background
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

export default AddAdvanceSalaryModal;
