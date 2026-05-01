// src/screens/admin/modals/AddDealModal.js
import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'; // For close icon
import Ionicons from 'react-native-vector-icons/Ionicons'; // For upload icon
import { launchImageLibrary } from 'react-native-image-picker';

const { width, height } = Dimensions.get('window');

const AddDealModal = ({ visible, onClose, onSave, initialDealData }) => {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [imageUri, setImageUri] = useState(null); // State for selected image URI
  const [saving, setSaving] = useState(false);

  // Custom Alert Modal States (local to this modal for direct feedback)
  const [customAlertVisible, setCustomAlertVisible] = useState(false);
  const [customAlertMessage, setCustomAlertMessage] = useState('');
  const [customAlertAction, setCustomAlertAction] = useState(null);

  // Function to show custom alert
  const showCustomAlert = (message, action = null) => {
    setCustomAlertMessage(message);
    setCustomAlertAction(() => action); // Store action to be called on OK
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

  useEffect(() => {
    if (visible) {
      if (initialDealData) {
        // When editing, initialize with existing deal data
        setName(initialDealData.dealName || ''); // Use initialDealData.dealName
        setPrice(initialDealData.price ? initialDealData.price.toString() : '');
        setDescription(initialDealData.description || '');
        // For existing deals, dealImage can be a number (local asset) or a string (URI)
        // We need to handle both cases for initial setup in the modal
        if (typeof initialDealData.dealImage === 'string') {
          setImageUri(initialDealData.dealImage);
        } else if (typeof initialDealData.dealImage === 'number') {
          // If it's a local asset number, we might not want to display it in the picker preview
          // or convert it to a URI if possible. For simplicity, we'll treat it as null
          // for the picker if it's a local asset, forcing re-selection if desired.
          // Or, you could pass the local asset number directly if your image picker can handle it.
          // For now, setting it to null for visual consistency in the picker.
          setImageUri(null); // Or keep the number if your Image component can handle it
        } else {
          setImageUri(null);
        }
      } else {
        // Reset for adding new deal
        setName('');
        setPrice('');
        setDescription('');
        setImageUri(null); // Reset to null for new deals
      }
    }
    setSaving(false);
  }, [visible, initialDealData]);

  const handleSave = () => {
    if (!name.trim() || !price.trim()) {
      showCustomAlert('Please provide deal name and price.');
      return;
    }

    const numericPrice = parseFloat(price);
    if (isNaN(numericPrice)) {
      showCustomAlert('Price must be a valid number.');
      return;
    }

    const dataToSave = {
      id: initialDealData ? initialDealData.id : null, // Pass ID for editing
      dealName: name, // Use 'dealName' to match DealsScreen's expected key
      price: numericPrice, // Pass as a number
      description,
      dealImage: imageUri, // <--- IMPORTANT: Pass the image URI under 'dealImage'
    };
    setSaving(true);
    onSave(dataToSave);
    // onClose() is handled by parent component (DealsScreen) after save success
  };

  const handleImagePick = async () => {
    // Made async
    const options = {
      mediaType: 'photo',
      quality: 0.8,
      maxWidth: 800,
      maxHeight: 800,
    };

    try {
      const response = await launchImageLibrary(options); // Used await

      if (response.didCancel) {
        console.log('User cancelled image picker');
      } else if (response.errorCode) {
        console.log(
          'Image Picker Error: ',
          response.errorCode,
          response.errorMessage,
        );
        showCustomAlert(
          `Image Picker Error: ${
            response.errorMessage || 'Something went wrong.'
          }`,
        );
      } else if (response.assets && response.assets.length > 0) {
        const uri = response.assets[0].uri;
        setImageUri(uri); // Store the URI directly
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
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={modalStyles.overlay}>
        <View style={modalStyles.modalContainer}>
          <TouchableOpacity style={modalStyles.closeIcon} onPress={onClose}>
            <Icon name="close" size={width * 0.025} color="#fff" />
          </TouchableOpacity>
          <Text style={modalStyles.heading}>
            {initialDealData ? 'Edit Deal' : 'Add New Deal'}
          </Text>
          <ScrollView contentContainerStyle={modalStyles.scrollContent}>
            <Text style={modalStyles.label}>Name</Text>
            <TextInput
              style={modalStyles.input}
              value={name}
              onChangeText={setName}
              placeholder="Enter deal name"
              placeholderTextColor="#999"
            />

            <Text style={modalStyles.label}>Price (PKR)</Text>
            <TextInput
              style={modalStyles.input}
              value={price}
              onChangeText={setPrice}
              placeholder="Enter price"
              placeholderTextColor="#999"
              keyboardType="numeric"
            />

            <Text style={modalStyles.label}>Description</Text>
            <TextInput
              style={[modalStyles.input, modalStyles.multilineInput]}
              value={description}
              onChangeText={setDescription}
              placeholder="Enter deal description"
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
            />

            {/* Image Import Field */}
            <TouchableOpacity
              style={modalStyles.imageUploadContainer}
              onPress={handleImagePick}
            >
              {imageUri ? (
                <Image
                  source={{ uri: imageUri }}
                  style={modalStyles.uploadedImagePreview}
                  resizeMode="cover"
                />
              ) : (
                <View style={modalStyles.imageUploadPlaceholder}>
                  <Ionicons
                    name="cloud-upload-outline"
                    size={width * 0.05}
                    color="#A9A9A9"
                  />
                  <Text style={modalStyles.imageUploadText}>
                    Drag & drop files or browse files
                  </Text>
                  <Text style={modalStyles.imageUploadSubText}>
                    Attach image
                  </Text>
                </View>
              )}
              {/* This button is now redundant if the whole container is touchable, but keeping for clear interaction point */}
              {/* <TouchableOpacity style={modalStyles.imageUploadButton} onPress={handleImagePick}>
                                <Text style={modalStyles.imageUploadButtonText}>Select Image</Text>
                            </TouchableOpacity> */}
            </TouchableOpacity>

            <View style={modalStyles.buttonRow}>
              <TouchableOpacity style={modalStyles.closeButton} onPress={onClose}>
                <Text style={modalStyles.closeButtonText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={modalStyles.saveButton}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <Text style={modalStyles.saveButtonText}>
                    {initialDealData ? 'Update Deal' : 'Save Deal'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>

      {/* Custom Alert Modal (local to AddDealModal) */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={customAlertVisible}
        onRequestClose={hideCustomAlert}
      >
        <View style={modalStyles.customAlertCenteredView}>
          <View style={modalStyles.customAlertModalView}>
            <Text style={modalStyles.customAlertModalText}>
              {customAlertMessage}
            </Text>
            <TouchableOpacity
              style={modalStyles.customAlertCloseButton}
              onPress={hideCustomAlert}
            >
              <Text style={modalStyles.customAlertCloseButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </Modal>
  );
};

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '60%',
    maxWidth: 500,
    maxHeight: '90%',
    backgroundColor: '#1E2021',
    borderRadius: 10,
    padding: 20,
    position: 'relative',
    borderWidth: 1,
    borderColor: '#000000ff',
  },
  closeIcon: {
    position: 'absolute',
    top: height * 0.015,
    right: width * 0.015,
    zIndex: 1,
    padding: width * 0.01,
  },
  heading: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  scrollContent: {
    paddingBottom: height * 0.02,
  },
  label: {
    color: '#bbb',
    fontSize: 14,
    marginTop: 15,
    marginBottom: 5,
    fontWeight: 'bold',
  },
  input: {
    backgroundColor: '#2c2c2c',
    color: '#fff',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#444',
  },
  multilineInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  imageUploadContainer: {
    backgroundColor: '#2c2c2c',
    height: 150,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#444',
  },
  imageUploadPlaceholder: {
    alignItems: 'center',
  },
  imageUploadText: {
    color: '#999',
    fontSize: 14,
    marginTop: 8,
  },
  imageUploadSubText: {
    color: '#999',
    fontSize: 12,
    marginTop: 4,
  },
  uploadedImagePreview: {
    width: '100%',
    height: '100%',
    borderRadius: 7,
  },
  imageUploadButton: {
    backgroundColor: 'transparent',
    marginTop: height * 0.015,
    position: 'absolute', // Position it over the container
    bottom: height * 0.01,
  },
  imageUploadButtonText: {
    color: '#A98C27',
    fontSize: width * 0.014,
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: '#A98C27',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    flex: 1,
    marginLeft: 10,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  closeButton: {
    backgroundColor: '#333',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#444',
    flex: 1,
    marginRight: 10,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
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

export default AddDealModal;
