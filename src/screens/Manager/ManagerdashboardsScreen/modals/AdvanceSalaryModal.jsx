import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Image,
  Alert,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import * as ImagePicker from 'react-native-image-picker';

const { width, height } = Dimensions.get('window');

const AdvanceSalaryModal = ({ isVisible, onClose, onSave }) => {
  const [salaryAmount, setSalaryAmount] = useState('');
  const [proofImage, setProofImage] = useState(null);

  // Custom alert component instead of the native Alert
  const customAlert = (title, message) => {
    Alert.alert(title, message, [{ text: 'OK' }]);
  };

  const handlePickImage = () => {
    Alert.alert(
      'Attach a Picture',
      'Choose a picture to attach as proof.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Choose from Gallery', onPress: () => chooseImage('gallery') },
      ],
      { cancelable: true },
    );
  };

  const chooseImage = source => {
    const options = {
      mediaType: 'photo',
      quality: 0.8,
      includeBase64: false,
    };

    if (source === 'camera') {
      ImagePicker.launchCamera(options, response => {
        if (!response.didCancel && !response.error) {
          setProofImage(response.assets[0]);
        }
      });
    } else {
      ImagePicker.launchImageLibrary(options, response => {
        if (!response.didCancel && !response.error) {
          setProofImage(response.assets[0]);
        }
      });
    }
  };

  const handleSave = () => {
    if (!salaryAmount) {
      customAlert('Error', 'Please enter the advance salary amount.');
      return;
    }

    if (!proofImage) {
      customAlert('Error', 'Please attach a proof picture.');
      return;
    }

    // Pass data to parent
    onSave({
      amount: salaryAmount,
      proofImageUri: proofImage.uri,
    });

    // Reset fields only
    setSalaryAmount('');
    setProofImage(null);
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
            <Text style={styles.modalTitle}>Add Adva</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#A9A9A9" />
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Amount (PKR)</Text>
            <TextInput
              style={styles.textInput}
              keyboardType="numeric"
              placeholder="Amount PKR"
              placeholderTextColor="#A9A9A9"
              value={salaryAmount}
              onChangeText={setSalaryAmount}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Attach Proof</Text>
            <TouchableOpacity
              style={styles.imagePickerButton}
              onPress={handlePickImage}
            >
              {proofImage ? (
                <Image
                  source={{ uri: proofImage.uri }}
                  style={styles.proofImage}
                  resizeMode="cover"
                />
              ) : (
                <>
                  <Ionicons
                    name="cloud-upload-outline"
                    size={40}
                    color="#A98C27"
                  />
                  <Text style={styles.imagePickerText}>
                    Drag & drop files or browse files
                  </Text>
                </>
              )}
            </TouchableOpacity>
            {proofImage && (
              <Text style={styles.imageNameText}>{proofImage.fileName}</Text>
            )}
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeBtnText}>Close</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  modalView: {
    width: width * 0.6,
    maxWidth: 500,
    backgroundColor: '#1C1C1C',
    borderRadius: 15,
    padding: 25,
    alignItems: 'center',
    elevation: 15,
  },
  modalHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: width * 0.032,
    fontWeight: '600',
    color: '#fff',
    fontFamily: 'Avenir',
  },
  closeButton: {
    padding: 5,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 20,
  },
  label: {
    color: '#A9A9A9',
    fontSize: width * 0.022,
    marginBottom: 5,
    fontFamily: 'Avenir',
  },
  textInput: {
    width: '100%',
    backgroundColor: '#2A2A2A',
    color: '#fff',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: width * 0.02,
    fontFamily: 'Avenir',
    borderWidth: 1,
    borderColor: '#4A4A4A',
  },
  imagePickerButton: {
    width: '100%',
    height: 150,
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4A4A4A',
    overflow: 'hidden',
    borderStyle: 'dashed',
  },
  proofImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  imagePickerText: {
    color: '#A9A9A9',
    fontSize: width * 0.015,
    marginTop: 5,
    fontFamily: 'Avenir',
  },
  imageNameText: {
    color: '#A9A9A9',
    fontSize: width * 0.02,
    marginTop: 5,
    textAlign: 'center',
    fontFamily: 'Avenir',
  },
  buttonContainer: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  closeBtn: {
    backgroundColor: 'transparent',
    paddingVertical: 10,
    paddingHorizontal: 68,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A9A9A9',
    marginRight: 10,
  },
  closeBtnText: {
    color: '#A9A9A9',
    fontWeight: 'bold',
    fontFamily: 'Avenir',
  },
  saveButton: {
    backgroundColor: '#A98C27',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 68,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontFamily: 'Avenir',
  },
});

export default AdvanceSalaryModal;
