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
  Image,
  ScrollView,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { launchImageLibrary } from 'react-native-image-picker';
import moment from 'moment';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

const { width, height } = Dimensions.get('window');

const AddBookingModal = ({ isVisible, onClose, onSave }) => {
  const [clientName, setClientName] = useState('');
  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState('10:00 AM');
  const [advancePayment, setAdvancePayment] = useState('');
  const [description, setDescription] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [image, setImage] = useState(null);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const resetForm = () => {
    setClientName('');
    setDate(new Date());
    setTime('10:00 AM');
    setAdvancePayment('');
    setDescription('');
    setPhoneNumber('');
    setImage(null);
  };

  // Helper function to parse time string
  const parseTimeString = (timeStr) => {
    // Handle both "HH:mm" and "hh:mm A" formats
    if (timeStr.includes('AM') || timeStr.includes('PM')) {
      return moment(timeStr, 'hh:mm A');
    } else {
      // Assume 24-hour format
      return moment(timeStr, 'HH:mm');
    }
  };

  const handleSave = () => {
    if (
      !clientName.trim() ||
      !date ||
      !time.trim() ||
      !advancePayment.trim() ||
      !description.trim() ||
      !phoneNumber.trim()
    ) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }

    if (isNaN(parseFloat(advancePayment))) {
      Alert.alert('Error', 'Advance Payment must be a valid number.');
      return;
    }

    // ⭐ Phone number formatting
    let formattedPhoneNumber = phoneNumber.trim().replace(/[\s\-\(\)]/g, '');
    if (formattedPhoneNumber.startsWith('03')) {
      formattedPhoneNumber = '+92' + formattedPhoneNumber.substring(1);
    } else if (!formattedPhoneNumber.startsWith('+92')) {
      formattedPhoneNumber = '+92' + formattedPhoneNumber;
    }

    if (formattedPhoneNumber.length !== 13) {
      Alert.alert(
        'Error',
        'Phone number must be 11 digits (e.g., 03001234567) or 13 digits (+923001234567).',
      );
      return;
    }

    // ⭐ Always format time in AM/PM before saving
    const formattedTime = moment(time, ['HH:mm', 'hh:mm A']).format('hh:mm A');

    // ✅ Validate time format
    const timeRegex = /^(0[1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM)$/i;
    if (!timeRegex.test(formattedTime)) {
      Alert.alert('Error', 'Invalid time format. Please select a valid time.');
      return;
    }

    // Generate unique ID
    const uniqueClientId = uuidv4();

    const calculateReminderTime = (bookingDate, bookingTime) => {
      // bookingDate: string "YYYY-MM-DD"
      // bookingTime: string "hh:mm A"

      // Combine date and time into a single moment
      const combinedDateTime = moment(
        `${bookingDate} ${bookingTime}`,
        'YYYY-MM-DD hh:mm A',
      );

      if (!combinedDateTime.isValid()) {
        console.error('❌ Invalid booking date or time provided.');
        return null;
      }

      // Subtract 24 hours
      const reminderMoment = combinedDateTime.clone().subtract(24, 'hours');
      return reminderMoment.format('YYYY-MM-DD hh:mm A');
    };

    const bookingData = {
      clientId: uniqueClientId,
      clientName: clientName.trim(),
      date: moment(date).format('YYYY-MM-DD'),
      time: formattedTime,
      advancePayment: parseFloat(advancePayment),
      description: description.trim(),
      phoneNumber: formattedPhoneNumber,
      image: image,
      reminderDate: calculateReminderTime(
        moment(date).format('YYYY-MM-DD'),
        formattedTime,
      ), // ✅ reminder added here
    };

    console.log('🔍 Sending booking data:', bookingData);
    onSave(bookingData);
    resetForm();
    onClose();
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const onTimeChange = (event, selectedTime) => {
    setShowTimePicker(false);
    if (selectedTime) {
      // Format to 12-hour with AM/PM consistently
      setTime(moment(selectedTime).format('hh:mm A'));
    }
  };

  const handleImagePicker = () => {
    const options = {
      mediaType: 'photo',
      quality: 0.8,
      maxWidth: 800,
      maxHeight: 800,
    };

    launchImageLibrary(options, response => {
      if (response.didCancel) {
        console.log('User cancelled image picker');
      } else if (response.errorCode) {
        console.log(
          'ImagePicker Error: ',
          response.errorCode,
          response.errorMessage,
        );
        Alert.alert('Image Picker Error', response.errorMessage);
      } else if (response.assets && response.assets.length > 0) {
        const selectedImage = response.assets[0];
        setImage(selectedImage);
      }
    });
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isVisible}
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add Advance Booking</Text>
                <TouchableOpacity onPress={handleClose}>
                  <Ionicons
                    name="close-circle-outline"
                    size={24}
                    color="#fff"
                  />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Client Name *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter Client Name"
                    placeholderTextColor="#A9A9A9"
                    value={clientName}
                    onChangeText={setClientName}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Date *</Text>
                  <TouchableOpacity
                    style={styles.input}
                    onPress={() => setShowDatePicker(true)}
                  >
                    <Text style={styles.dateText}>
                      {moment(date).format('DD/MM/YYYY')}
                    </Text>
                    <Ionicons
                      name="calendar-outline"
                      size={20}
                      color="#A9A9A9"
                    />
                  </TouchableOpacity>
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Time *</Text>
                  <TouchableOpacity
                    style={styles.input}
                    onPress={() => setShowTimePicker(true)}
                  >
                    <Text style={styles.dateText}>{time}</Text>
                    <Ionicons name="time-outline" size={20} color="#A9A9A9" />
                  </TouchableOpacity>
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Advance Payment (PKR) *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter Amount"
                    placeholderTextColor="#A9A9A9"
                    value={advancePayment}
                    onChangeText={setAdvancePayment}
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Description *</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Enter Description"
                    placeholderTextColor="#A9A9A9"
                    value={description}
                    onChangeText={setDescription}
                    multiline={true}
                    numberOfLines={4}
                  />
                </View>

                {/* --- Phone Number Input with new logic --- */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Phone Number *</Text>
                  <View style={styles.phoneInputWrapper}>
                    <Text style={styles.countryCodeText}>+92</Text>
                    <TextInput
                      style={styles.phoneInput}
                      placeholder="e.g., 3001234567"
                      placeholderTextColor="#A9A9A9"
                      value={phoneNumber}
                      onChangeText={text =>
                        setPhoneNumber(text.replace(/[\s\-\(\)]/g, ''))
                      } // Remove all non-digit characters except +
                      keyboardType="phone-pad"
                    />
                  </View>
                </View>
                {/* --- End of Phone Number Input --- */}

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Payment proof(Optional)</Text>
                  <TouchableOpacity
                    style={styles.imageUploadContainer}
                    onPress={handleImagePicker}
                  >
                    {image ? (
                      <View style={styles.imagePreviewContainer}>
                        <Image
                          source={{ uri: image.uri }}
                          style={styles.imagePreview}
                        />
                        <Text style={styles.imageName}>
                          {image.fileName || 'Selected Image'}
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.uploadPlaceholder}>
                        <Ionicons
                          name="cloud-upload-outline"
                          size={40}
                          color="#A98C27"
                        />
                        <Text style={styles.uploadText}>
                          Tap to select image
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>

              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleClose}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleSave}
                >
                  <Text style={styles.saveButtonText}>Save Booking</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>

      {showDatePicker && (
        <DateTimePicker
          value={date}
          mode="date"
          display="default"
          onChange={onDateChange}
          minimumDate={new Date()}
        />
      )}

      {showTimePicker && (
        <DateTimePicker
          value={parseTimeString(time).toDate() || new Date()}
          mode="time"
          display="default"
          onChange={onTimeChange}
        />
      )}
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1F1F1F',
    borderRadius: 15,
    width: width * 0.9,
    maxHeight: height * 0.8,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  scrollView: {
    maxHeight: height * 0.6,
  },
  inputContainer: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#444',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  dateText: {
    color: '#fff',
    fontSize: 16,
  },
  imageUploadContainer: {
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#444',
    borderStyle: 'dashed',
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  uploadPlaceholder: {
    alignItems: 'center',
  },
  uploadText: {
    color: '#A9A9A9',
    fontSize: 14,
    marginTop: 8,
  },
  imagePreviewContainer: {
    alignItems: 'center',
  },
  imagePreview: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginBottom: 8,
  },
  imageName: {
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  cancelButton: {
    backgroundColor: '#444',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    flex: 0.48,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#A98C27',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    flex: 0.48,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // --- New styles for phone number input ---
  phoneInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#444',
    paddingHorizontal: 15,
  },
  countryCodeText: {
    color: '#A9A9A9',
    fontSize: 16,
    marginRight: 8,
    fontWeight: 'bold',
  },
  phoneInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    paddingVertical: 12,
  },
  // --- End of new styles ---
});

export default AddBookingModal;