import React, { useState } from 'react';
import {
  Modal,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  PixelRatio,
  Dimensions,
  Image,
  Alert,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary } from 'react-native-image-picker';

// Tablet ke liye Dimensions aur Scaling
const { width } = Dimensions.get('window');
const scale = width / 1280;
const normalize = size =>
  Math.round(PixelRatio.roundToNearestPixel(size * scale));

// Prop mein 'onServiceSave' function receive karega, jo parent se aayega
// 'onClose' prop ko bhi rakha gaya hai taake user 'Close' button se modal band kar sake
const AddCustomServiceModal = ({ isVisible, onServiceSave, onClose }) => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [serviceName, setServiceName] = useState('');
  const [servicePrice, setServicePrice] = useState('');
  const [serviceDuration, setServiceDuration] = useState('');
  const [serviceDescription, setServiceDescription] = useState('');

  const handleImagePick = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.5,
      });

      if (result.didCancel) {
        console.log('User cancelled image picker');
        return;
      }

      if (result.errorCode) {
        console.log('ImagePicker Error: ', result.errorMessage);
        Alert.alert('Error', 'Failed to pick image. Please try again.');
        return;
      }

      const imageUri = result.assets[0].uri;
      setSelectedImage(imageUri);
    } catch (error) {
      console.error('Error picking image: ', error);
      Alert.alert(
        'Error',
        'An unexpected error occurred while picking the image.',
      );
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
  };

  const handleSave = () => {
    if (
      !serviceName ||
      !servicePrice ||
      !serviceDuration ||
      !serviceDescription
    ) {
      Alert.alert('Error', 'Please fill all fields.');
      return;
    }

    const data = {
      name: serviceName,
      price: servicePrice,
      duration: serviceDuration,
      description: serviceDescription,
      image: selectedImage, // Change this to 'image' to match parent's expected prop
    };

    // 'Save' button ki functionality ko parent component ko pass kar rahe hain.
    // Agar onServiceSave prop मौजूद hai, to usko call karein
    if (onServiceSave) {
      onServiceSave(data);
    }

    // Clear the form fields after saving
    setServiceName('');
    setServicePrice('');
    setServiceDuration('');
    setServiceDescription('');
    setSelectedImage(null);
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
          <Text style={styles.modalTitle}>Add Custom Service</Text>
          <View style={styles.modalInputContainer}>
            <TextInput
              style={styles.modalInputField}
              placeholder="Name"
              placeholderTextColor="#666"
              value={serviceName}
              onChangeText={setServiceName}
            />
          </View>
          <View style={styles.modalInputContainer}>
            <TextInput
              style={styles.modalInputField}
              placeholder="Price"
              placeholderTextColor="#666"
              keyboardType="numeric"
              value={servicePrice}
              onChangeText={setServicePrice}
            />
          </View>
          <View style={styles.modalInputContainer}>
            <TextInput
              style={[styles.modalInputField, styles.modalInputField]}
              placeholder="Duration"
              placeholderTextColor="#666"
              keyboardType="numeric"
              value={serviceDuration}
              onChangeText={setServiceDuration}
            />
          </View>
          <View style={styles.modalInputContainer}>
            <TextInput
              style={[styles.modalInputField, styles.modalNotesInput]}
              placeholder="Description"
              placeholderTextColor="#666"
              multiline={true}
              numberOfLines={4}
              value={serviceDescription}
              onChangeText={setServiceDescription}
            />
          </View>

          {/* File Upload Section */}
          <TouchableOpacity
            style={styles.uploadSection}
            onPress={handleImagePick}
          >
            {selectedImage ? (
              <View style={styles.selectedImageContainer}>
                <Image
                  source={{ uri: selectedImage }}
                  style={styles.previewImage}
                />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={handleRemoveImage}
                >
                  <Ionicons
                    name="close-circle"
                    size={normalize(24)}
                    color="#fff"
                  />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.uploadPlaceholder}>
                <Ionicons
                  name="cloud-upload-outline"
                  size={normalize(39)}
                  color="#fce14bff"
                />
                <Text style={styles.uploadText}>
                  Drag & drop files or browse picture
                </Text>
                <Text style={styles.uploadText}>Attach image</Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.modalButtonRow}>
            <TouchableOpacity
              style={[styles.modalButton, styles.closeButton]}
              onPress={onClose}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.saveButton]}
              onPress={handleSave}
            >
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
    backgroundColor: 'rgba(0, 0, 0, 0.8)', // Semi-transparent overlay
  },
  modalView: {
    backgroundColor: '#161719',
    borderRadius: normalize(16),
    padding: normalize(35),
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '70%', // Adjust modal width as needed for tablet
    maxWidth: normalize(750),
    height: '60%', // Adjusted height to auto to fit content
  },
  modalTitle: {
    fontSize: normalize(38),
    fontWeight: 'bold',
    color: '#fff',
    marginTop: normalize(30),
    marginBottom: normalize(50),
  },
  modalInputContainer: {
    width: '100%',
    marginBottom: normalize(33),
  },
  modalInputLabel: {
    fontSize: normalize(36),
    color: 'white',
    marginBottom: normalize(18),
  },
  modalInputField: {
    width: '100%',
    backgroundColor: '#2A2D32',
    borderRadius: normalize(8),
    paddingHorizontal: normalize(15),
    paddingVertical: normalize(22),
    color: '#fff',
    fontSize: normalize(33),
  },
  modalNotesInput: {
    height: normalize(190),
    textAlignVertical: 'top',
  },
  uploadSection: {
    width: '100%',
    backgroundColor: '#2A2D32',
    borderWidth: 1,
    borderColor: '#4A4A4A',
    borderRadius: normalize(8),
    padding: normalize(30),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: normalize(40),
  },
  uploadPlaceholder: {
    alignItems: 'center',
  },
  uploadText: {
    fontSize: normalize(18),
    color: '#fff',
    marginTop: normalize(10),
  },
  selectedImageContainer: {
    position: 'relative',
    width: '100%',
    height: normalize(150),
  },
  previewImage: {
    width: '100%',
    height: '100%',
    borderRadius: normalize(8),
    resizeMode: 'cover',
  },
  removeImageButton: {
    position: 'absolute',
    top: normalize(10),
    right: normalize(10),
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: normalize(12),
  },
  modalButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: normalize(30),
  },
  modalButton: {
    flex: 1,
    paddingVertical: normalize(17),
    borderRadius: normalize(10),
    alignItems: 'center',
    marginRight: 5,
    marginHorizontal: normalize(5),
  },
  closeButton: {
    backgroundColor: '#444',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: normalize(27),
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: '#fce14bff',
  },
  saveButtonText: {
    color: '#161719',
    fontSize: normalize(27),
    fontWeight: 'bold',
  },
});

export default AddCustomServiceModal;
