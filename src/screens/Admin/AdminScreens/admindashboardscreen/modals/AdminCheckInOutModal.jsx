import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
  Image,
  PixelRatio,
  TextInput,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker';
import moment from 'moment';
import { getEmployeesByRoleApi } from '../../../../../api/attendanceService';

const { width } = Dimensions.get('window');
const scale = width / 1280;
const normalize = size =>
  Math.round(PixelRatio.roundToNearestPixel(size * scale));

const AdminCheckInOutModal = ({
  isVisible,
  onClose,
  onSubmit,
  selectType,
  slectType,
  isLoading = false,
  adminInfo = null,
}) => {
  const [employId, setEmployId] = useState('');
  const [employeName, setEmployeName] = useState('');
  const [selectedRole, setSelectedRole] = useState(''); // 'manager' | 'employee'
  const [rolePickerOpen, setRolePickerOpen] = useState(false);
  const [userPickerOpen, setUserPickerOpen] = useState(false);
  const [userOptions, setUserOptions] = useState([]); // [{employeeId,name,role}]
  const [usersLoading, setUsersLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [errors, setErrors] = useState({});
  const [imageUri, setImageUri] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');

  useEffect(() => {
    if (isVisible) {
      // Reset all fields when modal opens
      setEmployId('');
      setEmployeName('');
      setSelectedRole('');
      setUserOptions([]);
      setRolePickerOpen(false);
      setUserPickerOpen(false);
      const now = new Date();
      setSelectedDate(now);
      setSelectedTime(now);
      setErrors({});
      setImageUri(null);
      setAdminNotes('');
    }
  }, [isVisible]);

  const validateForm = () => {
    const newErrors = {};
    if (!selectedRole) newErrors.role = 'Role is required';
    if (!employId.trim()) newErrors.employId = 'Employee ID is required';
    if (!employeName.trim())
      newErrors.employeName = 'Employee Name is required';
    if (!adminNotes.trim()) newErrors.adminNotes = 'Notes are required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const loadUsersForRole = async role => {
    try {
      setUsersLoading(true);
      const list = await getEmployeesByRoleApi(role);
      setUserOptions(list || []);
    } catch (e) {
      console.error('❌ Error loading users for role', role, e);
      setUserOptions([]);
    } finally {
      setUsersLoading(false);
    }
  };

  const handleImagePick = async () => {
    console.log(
      'Image picker button pressed. Implement your image selection logic here.',
    );
    // setImageUri('https://placehold.co/150x150');
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    const normalizedType = (slectType || selectType || '').toLowerCase();
    const attendanceData = {
      employId: (employId || adminInfo?.adminId || '').toString().trim(),
      date: moment(selectedDate).format('YYYY-MM-DD'),
      // Send only the selected clock time (not full ISO) so backend & UI use this exact time
      // Example format: "16:00" for 4 PM
      time: moment(selectedTime).format('HH:mm'),
      slectType: normalizedType,
      employeName: (employeName || adminInfo?.name || '').toString().trim(),
      imageUri: imageUri,
      adminNotes: adminNotes.trim(),
    };

    console.log(
      '📤 [AdminCheckInOutModal] Submitting data to parent:',
      attendanceData,
    );
    onSubmit(attendanceData);
  };

  const handleDateChange = (event, date) => {
    setShowDatePicker(false);
    if (date) setSelectedDate(date);
  };

  const handleTimeChange = (event, time) => {
    setShowTimePicker(false);
    if (time) setSelectedTime(time);
  };

  const getTitle = () => {
    const type = (slectType || selectType || '').toLowerCase();
    return type === 'checkin' ? 'Employee Check-In' : 'Employee Check-Out';
  };

  const getButtonText = () => {
    const type = (slectType || selectType || '').toLowerCase();
    if (isLoading)
      return type === 'checkin' ? 'Checking In...' : 'Checking Out...';
    return type === 'checkin' ? 'Check In' : 'Check Out';
  };

  const getButtonColor = () => {
    const type = (slectType || selectType || '').toLowerCase();
    return type === 'checkin' ? '#A98C27' : '#dc3545';
  };

  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{getTitle()}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={normalize(24)} color="#fff" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Role Picker */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Select Role *</Text>
              <TouchableOpacity
                style={styles.readOnlyInput}
                onPress={() => {
                  setRolePickerOpen(prev => !prev);
                  setUserPickerOpen(false);
                }}
              >
                <Text style={styles.readOnlyText}>
                  {selectedRole === 'manager'
                    ? 'Manager'
                    : selectedRole === 'employee'
                    ? 'Employee'
                    : 'Tap to select role'}
                </Text>
                <Ionicons
                  name={rolePickerOpen ? 'chevron-up' : 'chevron-down'}
                  size={normalize(24)}
                  color="#A98C27"
                />
              </TouchableOpacity>
              {errors.role && (
                <Text style={styles.errorText}>{errors.role}</Text>
              )}
              {rolePickerOpen && (
                <View style={styles.dropdownContainer}>
                  <TouchableOpacity
                    style={styles.dropdownItem}
                    onPress={() => {
                      setSelectedRole('manager');
                      setRolePickerOpen(false);
                      setEmployId('');
                      setEmployeName('');
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
                      setEmployId('');
                      setEmployeName('');
                      loadUsersForRole('employee');
                    }}
                  >
                    <Text style={styles.dropdownText}>Employee</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Employee/User Picker */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Select User *</Text>
              <TouchableOpacity
                style={styles.readOnlyInput}
                onPress={() => {
                  if (!selectedRole) return;
                  setUserPickerOpen(prev => !prev);
                  setRolePickerOpen(false);
                }}
              >
                <Text style={styles.readOnlyText}>
                  {employeName && employId
                    ? `${employeName} (${employId})`
                    : selectedRole
                    ? usersLoading
                      ? 'Loading...'
                      : 'Tap to select user'
                    : 'Select role first'}
                </Text>
                <Ionicons
                  name={userPickerOpen ? 'chevron-up' : 'chevron-down'}
                  size={normalize(24)}
                  color="#A98C27"
                />
              </TouchableOpacity>
              {errors.employId && (
                <Text style={styles.errorText}>{errors.employId}</Text>
              )}
              {errors.employeName && (
                <Text style={styles.errorText}>{errors.employeName}</Text>
              )}
              {userPickerOpen && !usersLoading && (
                <View style={styles.dropdownContainer}>
                  {userOptions.length === 0 ? (
                    <Text style={styles.dropdownEmptyText}>
                      No users found for selected role
                    </Text>
                  ) : (
                    <ScrollView style={{ maxHeight: normalize(220) }}>
                      {userOptions.map(user => (
                        <TouchableOpacity
                          key={user._id || user.employeeId}
                          style={styles.dropdownItem}
                          onPress={() => {
                            setEmployId(user.employeeId);
                            setEmployeName(user.name);
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

            {/* Employee ID - Read Only */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Employee ID *</Text>
              <View style={styles.readOnlyInput}>
                <Text style={styles.readOnlyText}>{employId}</Text>
                <Ionicons
                  name="checkmark-circle"
                  size={normalize(30)}
                  color="#A98C27"
                />
              </View>
              {errors.employId && (
                <Text style={styles.errorText}>{errors.employId}</Text>
              )}
            </View>

            {/* Employee Name - Read Only */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Employee Name *</Text>
              <View style={styles.readOnlyInput}>
                <Text style={styles.readOnlyText}>{employeName}</Text>
                <Ionicons
                  name="checkmark-circle"
                  size={normalize(30)}
                  color="#A98C27"
                />
              </View>
              {errors.employeName && (
                <Text style={styles.errorText}>{errors.employeName}</Text>
              )}
            </View>

            {/* Date Picker */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Date *</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons
                  name="calendar-outline"
                  size={normalize(35)}
                  color="#A9A9A9"
                />
                <Text style={styles.dateText}>
                  {moment(selectedDate).format('MMMM DD, YYYY')}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Time Picker */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Time *</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowTimePicker(true)}
              >
                <Ionicons
                  name="time-outline"
                  size={normalize(35)}
                  color="#A9A9A9"
                />
                <Text style={styles.dateText}>
                  {moment(selectedTime).format('hh:mm A')}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Image Upload */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Image (Optional)</Text>
              {imageUri ? (
                <View style={styles.imageContainer}>
                  <Image
                    source={{ uri: imageUri }}
                    style={styles.previewImage}
                  />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => setImageUri(null)}
                  >
                    <Ionicons
                      name="close-circle"
                      size={normalize(24)}
                      color="#FF6347"
                    />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.imagePickerButton}
                  onPress={handleImagePick}
                >
                  <Ionicons
                    name="camera-outline"
                    size={normalize(50)}
                    color="#A9A9A9"
                  />
                  <Text style={styles.imagePickerText}>Select Image</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Notes (Required) */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Notes *</Text>
              <TextInput
                style={styles.notesInput}
                placeholder="Add a note (e.g., reason for manual check-in/out)"
                placeholderTextColor="#A9A9A9"
                multiline={true}
                value={adminNotes}
                onChangeText={setAdminNotes}
              />
              {errors.adminNotes && (
                <Text style={styles.errorText}>{errors.adminNotes}</Text>
              )}
            </View>

          </ScrollView>

          {/* Footer */}
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              disabled={isLoading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.submitButton,
                { backgroundColor: getButtonColor() },
              ]}
              onPress={handleSubmit}
              disabled={isLoading}
            >
              <Ionicons
                name={
                  (slectType || selectType || '').toLowerCase() === 'checkin'
                    ? 'log-in-outline'
                    : 'log-out-outline'
                }
                size={normalize(30)}
                color="#fff"
              />
              <Text style={styles.submitButtonText}>{getButtonText()}</Text>
            </TouchableOpacity>
          </View>

          {/* Date Picker */}
          {showDatePicker && (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display="default"
              onChange={handleDateChange}
              maximumDate={new Date()}
            />
          )}

          {/* Time Picker */}
          {showTimePicker && (
            <DateTimePicker
              value={selectedTime}
              mode="time"
              display="default"
              onChange={handleTimeChange}
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: normalize(20),
  },
  modalContainer: {
    backgroundColor: '#1E1E1E',
    borderRadius: normalize(10),
    width: '75%',
    maxWidth: width * 0.9,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: '#1E1E1E',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: normalize(20),
    borderBottomWidth: 1,
    borderBottomColor: '#3C3C3C',
    backgroundColor: '#161719',
    borderTopLeftRadius: normalize(10),
    borderTopRightRadius: normalize(10),
  },
  modalTitle: {
    fontSize: normalize(24),
    fontWeight: '600',
    color: '#fff',
  },
  closeButton: {
    padding: normalize(5),
    borderRadius: normalize(5),
    backgroundColor: '#3C3C3C',
  },
  modalContent: {
    padding: normalize(25),
  },
  inputContainer: {
    marginBottom: normalize(25),
  },
  inputLabel: {
    fontSize: normalize(23),
    color: '#faf9f6',
    marginBottom: normalize(10),
    fontWeight: '600',
  },
  readOnlyInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2A2D32',
    borderColor: '#2A2D32',
    borderWidth: 1,
    borderRadius: normalize(8),
    padding: normalize(30),
  },
  readOnlyText: {
    color: '#faf9f6',
    fontSize: normalize(22),
    fontWeight: '600',
  },
  dropdownContainer: {
    marginTop: normalize(10),
    backgroundColor: '#161719',
    borderRadius: normalize(10),
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
    paddingVertical: normalize(18),
    paddingHorizontal: normalize(22),
    borderBottomWidth: 1,
    borderBottomColor: '#2A2D32',
    backgroundColor: '#212327',
  },
  dropdownText: {
    color: '#faf9f6',
    fontSize: normalize(20),
    fontWeight: '500',
  },
  dropdownEmptyText: {
    paddingVertical: normalize(16),
    paddingHorizontal: normalize(22),
    color: '#A9A9A9',
    fontSize: normalize(18),
  },
  errorText: {
    color: '#FF6347',
    fontSize: normalize(14),
    marginTop: normalize(5),
  },
  dateButton: {
    backgroundColor: '#424449',
    borderRadius: normalize(8),
    padding: normalize(28),
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    color: '#fff',
    fontSize: normalize(22),
    marginLeft: normalize(10),
  },
  notesInput: {
    backgroundColor: '#2A2D32',
    borderColor: '#4A4A4A',
    borderWidth: 1,
    borderRadius: normalize(8),
    paddingHorizontal: normalize(20),
    paddingVertical: normalize(18),
    color: '#faf9f6',
    fontSize: normalize(20),
    textAlignVertical: 'top',
    minHeight: normalize(120),
  },
  imagePickerButton: {
    backgroundColor: '#424449',
    borderRadius: normalize(8),
    padding: normalize(45),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePickerText: {
    color: '#fff',
    fontSize: normalize(35),
    marginLeft: normalize(10),
  },
  imageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  previewImage: {
    width: normalize(150),
    height: normalize(150),
    borderRadius: normalize(10),
    borderWidth: 2,
    borderColor: '#A9A9A9',
  },
  removeImageButton: {
    position: 'absolute',
    top: -normalize(10),
    right: -normalize(10),
    backgroundColor: '#2A2D32',
    borderRadius: normalize(15),
  },
  typeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: normalize(25),
    borderRadius: normalize(8),
    marginHorizontal: normalize(100),
  },
  typeText: {
    color: '#fff',
    fontSize: normalize(18),
    fontWeight: '600',
    marginLeft: normalize(10),
  },
  // infoContainer: {
  //   flexDirection: 'row',
  //   alignItems: 'flex-start',
  //   backgroundColor: '#424449',
  //   padding: normalize(15),
  //   borderRadius: normalize(8),
  //   marginTop: normalize(10),
  // },
  // infoText: {
  //   color: '#A9A9A9',
  //   fontSize: normalize(14),
  //   marginLeft: normalize(10),
  //   flex: 1,
  //   lineHeight: normalize(20),
  // },
  modalFooter: {
    flexDirection: 'row',
    padding: normalize(20),
    borderTopWidth: 1,
    borderTopColor: '#3C3C3C',
    backgroundColor: '#161719',
    borderBottomLeftRadius: normalize(10),
    borderBottomRightRadius: normalize(10),
    gap: normalize(15),
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#6c757d',
    paddingVertical: normalize(38),
    borderRadius: normalize(8),
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: normalize(16),
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    paddingVertical: normalize(12),
    backgroundColor: '#28a745',
    borderRadius: normalize(8),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: normalize(16),
    fontWeight: '600',
    marginLeft: normalize(8),
  },
});

export default AdminCheckInOutModal;
