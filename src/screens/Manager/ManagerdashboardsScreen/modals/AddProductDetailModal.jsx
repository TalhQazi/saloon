// src/screens/admin/modals/AddProductDetailModal.js

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

// Renamed AddSubServiceModal to AddProductDetailModal
const AddProductDetailModal = ({
    visible,
    onClose,
    onAddProductDetail, // Renamed from onAddSubService
    onUpdateProductDetail, // Renamed from onUpdateSubService
    initialProductDetailData, // Renamed from initialSubServiceData
}) => {
    // Renamed state variables
    const [productDetailName, setProductDetailName] = useState('');
    const [price, setPrice] = useState('');
    const [time, setTime] = useState(''); // Could be 'duration' for products
    const [description, setDescription] = useState('');
    const [imageUri, setImageUri] = useState(null);

    useEffect(() => {
        if (initialProductDetailData) {
            setProductDetailName(initialProductDetailData.productDetailName || ''); // Renamed property
            setPrice(String(initialProductDetailData.price) || '');
            setTime(initialProductDetailData.time || '');
            setDescription(initialProductDetailData.description || '');
            setImageUri(initialProductDetailData.image || null);
        } else {
            // Clear all fields when modal is opened for adding a new item
            setProductDetailName('');
            setPrice('');
            setTime('');
            setDescription('');
            setImageUri(null);
        }
    }, [initialProductDetailData, visible]); // Added 'visible' to dependency array to ensure reset on modal open

    const handleSave = () => {
        // Updated validation message
        if (!productDetailName || !price || !time) {
            Alert.alert('Missing Information', 'Please fill in all required fields (Product Item Name, Price, Time/Duration).');
            return;
        }

        const dataToSave = {
            productDetailName: productDetailName, // Renamed property
            price: price,
            time: time,
            description: description,
            image: imageUri,
        };

        if (initialProductDetailData) {
            // When updating, include the original ID to identify which item to update
            onUpdateProductDetail({ ...initialProductDetailData, ...dataToSave }); // Renamed function
        } else {
            // When adding, generate a new temporary ID for local state management (actual ID from backend upon successful save)
            onAddProductDetail({ id: Date.now().toString(), ...dataToSave }); // Renamed function
        }

        // Reset form fields after save (or update) and close the modal
        setProductDetailName('');
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
                Alert.alert('Image Pick Error', 'Failed to pick image. Please try again.');
            } else if (result.assets && result.assets.length > 0) {
                setImageUri(result.assets[0].uri);
            }
        } catch (error) {
            console.error('Error picking image:', error);
            Alert.alert('Image Error', 'An unexpected error occurred while picking the image.');
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
                        {initialProductDetailData ? 'Edit Product Item' : 'Add New Product Item'} {/* Renamed text */}
                    </Text>

                    <TextInput
                        placeholder="Product Item Name" // Renamed placeholder
                        placeholderTextColor="#999"
                        value={productDetailName}
                        onChangeText={setProductDetailName}
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
                        placeholder="Time / Duration (e.g., 1 hour, 5 days)" // Updated placeholder
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
                            <Text style={modalStyles.imagePlaceholderText}>
                                <Ionicons name="cloud-upload-outline" size={40} color="#A9A9A9" />
                                {' Tap to add image'}
                            </Text>
                        )}
                    </TouchableOpacity>

                    <View style={modalStyles.modalButtons}>
                        <TouchableOpacity style={modalStyles.cancelButton} onPress={onClose}>
                            <Text style={modalStyles.buttonText}>Close</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={modalStyles.saveButton} onPress={handleSave}>
                            <Text style={modalStyles.buttonText}>
                                {initialProductDetailData ? 'Update' : 'Save'}
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
        height: height * 0.50, // Consider if a fixed height is always appropriate or if max-height/flex-grow is better
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

export default AddProductDetailModal;