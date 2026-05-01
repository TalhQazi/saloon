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
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary } from 'react-native-image-picker';

const { width, height } = Dimensions.get('window');

const AddExpenseModal = ({ isVisible, onClose, onSave }) => {
  const [expenseName, setExpenseName] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [imageUri, setImageUri] = useState(null);
  const [saving, setSaving] = useState(false);

  const [customAlertVisible, setCustomAlertVisible] = useState(false);
  const [customAlertMessage, setCustomAlertMessage] = useState('');
  const [customAlertAction, setCustomAlertAction] = useState(null);

  const showCustomAlert = (message, action = null) => {
    setCustomAlertMessage(message);
    setCustomAlertAction(() => action);
    setCustomAlertVisible(true);
  };

  const hideCustomAlert = () => {
    setCustomAlertVisible(false);
    setCustomAlertMessage('');
    if (customAlertAction) {
      customAlertAction();
      setCustomAlertAction(null);
    }
  };

  const resetForm = () => {
    setExpenseName('');
    setAmount('');
    setDescription('');
    setImageUri(null);
  };

  const handleSave = () => {
    if (!expenseName.trim() || !amount.trim() || !description.trim()) {
      showCustomAlert(
        'Please fill all fields: Expense Name, Amount, and Description.',
      );
      return;
    }

    if (isNaN(parseFloat(amount.trim()))) {
      showCustomAlert('Amount must be a valid number.');
      return;
    }

    if (imageUri) {
      const formData = new FormData();
      formData.append('name', expenseName.trim());
      formData.append('price', parseFloat(amount.trim()));
      formData.append('description', description.trim());
      formData.append('userRole', 'admin'); // Add userRole for admin
      formData.append('image', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'expense_receipt.jpg',
      });

      setSaving(true);
      onSave(formData, true);
    } else {
      const expenseData = {
        name: expenseName.trim(),
        price: parseFloat(amount.trim()),
        description: description.trim(),
        userRole: 'admin', // Add userRole for admin
        image: null,
      };

      setSaving(true);
      onSave(expenseData, false);
    }

    // Reset form after saving
    resetForm();
  };

  const handleClose = () => {
    resetForm();
    setSaving(false);
    onClose();
  };

  // Reset form when modal becomes invisible
  React.useEffect(() => {
    if (!isVisible) {
      resetForm();
    }
    setSaving(false);
  }, [isVisible]);

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
                <Text style={styles.modalTitle}>Add Expense</Text>
                <TouchableOpacity onPress={handleClose}>
                  <Ionicons
                    name="close-circle-outline"
                    size={width * 0.025}
                    color="#fff"
                  />
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.modalInput}
                placeholder="Expense Name"
                placeholderTextColor="#A9A9A9"
                value={expenseName}
                onChangeText={setExpenseName}
              />
              <TextInput
                style={styles.modalInput}
                placeholder="Amount (PKR)"
                placeholderTextColor="#A9A9A9"
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
              />
              <TextInput
                style={[styles.modalInput, styles.descriptionInput]}
                placeholder="Description"
                placeholderTextColor="#A9A9A9"
                value={description}
                onChangeText={setDescription}
                multiline={true}
                numberOfLines={4}
              />

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
                      color="#A9A9A9"
                    />
                    <Text style={styles.fileUploadText}>
                      Drag & Drop files or browse files
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={handleClose}
                >
                  <Text style={styles.closeButtonText}>Close</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  {saving ? (
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
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalContent: {
    width: width * 0.6,
    backgroundColor: '#1E1E1E',
    borderRadius: 10,
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
  descriptionInput: {
    height: height * 0.1,
    textAlignVertical: 'top',
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
    height: height * 0.15,
  },
  fileUploadText: {
    color: '#A9A9A9',
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
  },
  customAlertCloseButtonText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default AddExpenseModal;
