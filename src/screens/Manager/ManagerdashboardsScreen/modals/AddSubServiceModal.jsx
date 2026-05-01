// src/screens/admin/modals/AddSubServiceModal.js

import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
  Alert,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import Ionicons from 'react-native-vector-icons/Ionicons';

const { width, height } = Dimensions.get('window');

const AddSubServiceModal = ({
  visible,
  onClose,
  onAddSubService,
  onUpdateSubService,
  initialSubServiceData,
}) => {
  const [subServiceName, setSubServiceName] = useState('');
  const [price, setPrice] = useState('');
  const [time, setTime] = useState('');
  const [description, setDescription] = useState('');
  const [imageUri, setImageUri] = useState(null);

  useEffect(() => {
    if (initialSubServiceData) {
      setSubServiceName(initialSubServiceData.subServiceName || '');
      setPrice(String(initialSubServiceData.price) || '');
      setTime(initialSubServiceData.time || '');
      setDescription(initialSubServiceData.description || '');
      setImageUri(initialSubServiceData.image || null);
    } else {
      setSubServiceName('');
      setPrice('');
      setTime('');
      setDescription('');
      setImageUri(null);
    }
  }, [initialSubServiceData]);

  const handleSave = () => {
    if (!subServiceName || !price || !time) {
      Alert.alert('Missing Information', 'Please fill in all required fields (Sub Service Name, Price, Time).');
      return;
    }

    const dataToSave = {
      subServiceName: subServiceName,
      price: price,
      time: time,
      description: description,
      image: imageUri,
    };

    if (initialSubServiceData) {
      onUpdateSubService({ ...initialSubServiceData, ...dataToSave });
    } else {
      onAddSubService({ id: Date.now().toString(), ...dataToSave });
    }

    setSubServiceName('');
    setPrice('');
    setTime('');
    setDescription('');
    setImageUri(null);
    onClose();
  };

  const pickImage = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 1,
      });

      if (result.didCancel) {
        console.log('User cancelled image picker');
      } else if (result.errorCode) {
        console.log('ImagePicker Error: ', result.errorMessage);
      } else if (result.assets && result.assets.length > 0) {
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
    }
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={modalStyles.centeredView}>
        <View style={modalStyles.modalContainer}>
          <Text style={modalStyles.modalTitle}>
            {initialSubServiceData ? 'Edit Sub Service' : 'Add New Sub Service'}
          </Text>

          <TextInput
            placeholder="Sub Service Name"
            placeholderTextColor="#999"
            value={subServiceName}
            onChangeText={setSubServiceName}
            style={modalStyles.input}
          />

          <TextInput
            placeholder="Price"
            placeholderTextColor="#999"
            keyboardType="numeric"
            value={price}
            onChangeText={setPrice}
            style={modalStyles.input}
          />

          <TextInput
            placeholder="Time (e.g., 30 min)"
            placeholderTextColor="#999"
            value={time}
            onChangeText={setTime}
            style={modalStyles.input}
          />

          <TextInput
            placeholder="Description"
            placeholderTextColor="#999"
            value={description}
            onChangeText={setDescription}
            multiline
            style={[modalStyles.input, modalStyles.descriptionInput]}
          />

          <TouchableOpacity onPress={pickImage} style={modalStyles.imagePlaceholder}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={modalStyles.selectedImage} />
            ) : (
              // FIX: Wrap the plain text "Tap to add image" in its own Text component
              <Text style={modalStyles.imagePlaceholderText}>
                <Ionicons name="cloud-upload-outline" size={40} color="#A9A9A9" />
                {' Tap to add image'} {/* Added curly braces and space for clarity */}
              </Text>
            )}
          </TouchableOpacity>

          <View style={modalStyles.modalButtons}>
            <TouchableOpacity style={modalStyles.cancelButton} onPress={onClose}>
              <Text style={modalStyles.buttonText}>Close</Text>
            </TouchableOpacity>
            <TouchableOpacity style={modalStyles.saveButton} onPress={handleSave}>
              <Text style={modalStyles.buttonText}>
                {initialSubServiceData ? 'Update' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const modalStyles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  modalContainer: {
    backgroundColor: '#1c1c1c',
    width: width * 0.75,
    maxWidth: 420,
    height: height * 0.50,
    padding: 30,
    borderRadius: 5,
  },
  modalTitle: {
    fontSize: width * 0.025,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#2a2a2a',
    color: '#fff',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    fontSize: width * 0.018,
  },
  descriptionInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  imagePlaceholder: {
    borderWidth: 1,
    borderColor: '#444',
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    marginBottom: 16,
    overflow: 'hidden',
  },
  imagePlaceholderText: {
    color: '#888',
    fontSize: width * 0.018,
  },
  selectedImage: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  cancelButton: {
    backgroundColor: '#333',
    padding: 12,
    borderRadius: 10,
    width: '48%',
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: '#FFD700',
    padding: 12,
    borderRadius: 10,
    width: '48%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: width * 0.018,
  },
});

export default AddSubServiceModal;