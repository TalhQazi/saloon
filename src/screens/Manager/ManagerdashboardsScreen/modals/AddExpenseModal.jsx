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
  Image, // Import Image component
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary } from 'react-native-image-picker'; // Import image picker

const { width, height } = Dimensions.get('window');

const AddExpenseModal = ({ isVisible, onClose, onSave }) => {
  const [expenseName, setExpenseName] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [imageUri, setImageUri] = useState(null); // State for selected image URI

  const resetForm = () => {
    setExpenseName('');
    setAmount('');
    setDescription('');
    setImageUri(null); // Reset image URI
  };

  const handleSave = () => {
    if (!expenseName.trim() || !amount.trim() || !description.trim()) {
      Alert.alert(
        'Missing Information',
        'Please fill all fields: Expense Name, Amount, and Description.',
      );
      return;
    }
    if (isNaN(parseFloat(amount.trim()))) {
      Alert.alert('Invalid Amount', 'Amount must be a valid number.');
      return;
    }

    // If image is selected, create FormData for file upload
    if (imageUri) {
      const formData = new FormData();
      formData.append('name', expenseName.trim());
      formData.append('price', parseFloat(amount.trim()));
      formData.append('description', description.trim());
      formData.append('userRole', 'manager'); // Add userRole for manager
      formData.append('image', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'expense_receipt.jpg',
      });

      onSave(formData);
    } else {
      // For non-image expenses
      const expenseData = {
        name: expenseName.trim(),
        price: parseFloat(amount.trim()),
        description: description.trim(),
        userRole: 'manager', // Add userRole for manager
        image: null,
      };

      onSave(expenseData);
    }

    // Reset form after saving
    resetForm();
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Reset form when modal becomes invisible
  React.useEffect(() => {
    if (!isVisible) {
      resetForm();
    }
  }, [isVisible]);

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
        setImageUri(selectedImage.uri);
      }
    });
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

              {/* Drag & Drop / Browse Files Section (Functional) */}
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
                  style={styles.saveButton}
                  onPress={handleSave}
                >
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
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
    height: height * 0.15, // Fixed height for the upload area
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
    resizeMode: 'contain', // or 'cover' depending on desired fit
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
});

export default AddExpenseModal;
