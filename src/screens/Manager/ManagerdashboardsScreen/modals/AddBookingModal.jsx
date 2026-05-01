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
  const [time, setTime] = useState('10:00');
  const [advancePayment, setAdvancePayment] = useState('');
  const [description, setDescription] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [image, setImage] = useState(null);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const resetForm = () => {
    setClientName('');
    setDate(new Date());
    setTime('10:00');
    setAdvancePayment('');
    setDescription('');
    setPhoneNumber('');
    setImage(null);
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

    // ⭐ FIX: Automatically format the phone number to start with '+92'
    let formattedPhoneNumber = phoneNumber.trim().replace(/[\s\-\(\)]/g, '');

    // If the number starts with '0', replace it with '+92'
    if (formattedPhoneNumber.startsWith('0')) {
      formattedPhoneNumber = '+92' + formattedPhoneNumber.substring(1);
    }
    // If the number doesn't start with '+92', prepend it
    else if (!formattedPhoneNumber.startsWith('+92')) {
      formattedPhoneNumber = '+92' + formattedPhoneNumber;
    }

    // Validate the new, formatted phone number
    if (formattedPhoneNumber.length !== 13) {
      Alert.alert(
        'Error',
        'Phone number must be 11 digits (e.g., 03001234567) or 13 digits (+923001234567).',
      );
      return;
    }

    const bookingData = {
      clientId: uuidv4(),
      clientName: clientName.trim(),
      date: moment(date).format('YYYY-MM-DD'),
      time: time.trim(),
      advancePayment: parseFloat(advancePayment),
      description: description.trim(),
      phoneNumber: formattedPhoneNumber, // Use the formatted phone number
      image: image,
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

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const onTimeChange = (event, selectedTime) => {
    setShowTimePicker(false);
    if (selectedTime) {
      setTime(moment(selectedTime).format('HH:mm'));
    }
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
                      }
                      keyboardType="phone-pad"
                    />
                  </View>
                </View>
                {/* --- End of Phone Number Input --- */}

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Client Image (Optional)</Text>
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
          value={moment(`2000-01-01 ${time}`).toDate()}
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
});

export default AddBookingModal;
