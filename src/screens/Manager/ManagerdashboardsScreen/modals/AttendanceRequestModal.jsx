import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  TextInput,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

const { width, height } = Dimensions.get('window');

const AttendanceRequestModal = ({ visible, onClose, onSave }) => {
  const [requestType, setRequestType] = useState('');
  const [requestDate, setRequestDate] = useState(new Date());
  const [requestNote, setRequestNote] = useState('');

  // State for pop-ups
  const [showTypeOptions, setShowTypeOptions] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleSave = () => {
    // You can add validation here before saving
    if (requestType.trim() !== '' && requestNote.trim() !== '') {
      const formattedDate = requestDate.toLocaleDateString();
      onSave({ type: requestType, date: formattedDate, note: requestNote });
    } else {
      alert('Please fill in all the fields.');
    }
  };

  const onDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || requestDate;
    setShowDatePicker(Platform.OS === 'ios');
    setRequestDate(currentDate);
  };

  const handleTypeSelect = type => {
    setRequestType(type);
    setShowTypeOptions(false);
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <Text style={styles.modalTitle}>Request</Text>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Select Type</Text>
            <TouchableOpacity
              style={styles.input}
              onPress={() => setShowTypeOptions(true)}
            >
              <Text
                style={requestType ? styles.inputText : styles.placeholderText}
              >
                {requestType || 'Select an option'}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Select Date</Text>
            <TouchableOpacity
              style={styles.input}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.inputText}>
                {requestDate.toLocaleDateString()}
              </Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={requestDate}
                mode="date"
                display="default"
                onChange={onDateChange}
              />
            )}
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Note</Text>
            <TextInput
              style={[styles.input, styles.noteInput]}
              placeholder="Reason for request"
              placeholderTextColor="#888"
              value={requestNote}
              onChangeText={setRequestNote}
              multiline
            />
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.closeButton]}
              onPress={onClose}
            >
              <Text style={styles.buttonText}>Close</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.saveButton]}
              onPress={handleSave}
            >
              <Text style={styles.buttonText}>Save</Text>
            </TouchableOpacity>
          </View>

          {/* Type Selection Modal */}
          <Modal
            animationType="fade"
            transparent={true}
            visible={showTypeOptions}
            onRequestClose={() => setShowTypeOptions(false)}
          >
            <View style={styles.optionsCenteredView}>
              <View style={styles.optionsModalView}>
                <TouchableOpacity
                  onPress={() => handleTypeSelect('Check-in')}
                  style={styles.optionItem}
                >
                  <Text style={styles.optionText}>Check-in</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleTypeSelect('Check-out')}
                  style={styles.optionItem}
                >
                  <Text style={styles.optionText}>Check-out</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleTypeSelect('Request')}
                  style={styles.optionItem}
                >
                  <Text style={styles.optionText}>Request</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setShowTypeOptions(false)}
                  style={styles.cancelOptionButton}
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
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
    width: '90%',
    maxWidth: 350,
    backgroundColor: '#2A2A2A',
    borderRadius: 15,
    padding: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#E0E0E0',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputGroup: {
    width: '100%',
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    color: '#A9A9A9',
    marginBottom: 5,
  },
  input: {
    width: '100%',
    backgroundColor: '#383838',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#454545',
  },
  inputText: {
    color: '#E0E0E0',
    fontSize: 16,
  },
  placeholderText: {
    color: '#888',
    fontSize: 16,
  },
  noteInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    width: '100%',
    marginTop: 20,
  },
  button: {
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginLeft: 10,
  },
  closeButton: {
    backgroundColor: '#666',
  },
  saveButton: {
    backgroundColor: '#A98C27',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  // New styles for the Type options modal
  optionsCenteredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  optionsModalView: {
    width: '80%',
    backgroundColor: '#2A2A2A',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
  },
  optionItem: {
    width: '100%',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#454545',
  },
  optionText: {
    color: '#E0E0E0',
    fontSize: 18,
    textAlign: 'center',
  },
  cancelOptionButton: {
    marginTop: 20,
    padding: 10,
  },
  cancelText: {
    color: '#A98C27',
    fontSize: 16,
  },
});

export default AttendanceRequestModal;
