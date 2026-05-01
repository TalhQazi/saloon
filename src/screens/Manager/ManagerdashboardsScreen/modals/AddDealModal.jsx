// src/screens/admin/modals/AddDealModal.js
import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, Dimensions, ScrollView, Alert, Image } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'; // For close icon
import Ionicons from 'react-native-vector-icons/Ionicons'; // For upload icon
import { launchImageLibrary } from 'react-native-image-picker';

const { width, height } = Dimensions.get('window');

const AddDealModal = ({ visible, onClose, onSave, initialDealData }) => {
    // Renamed state variables to match API expectations (name, image)
    const [name, setName] = useState(''); // Changed from dealName
    const [price, setPrice] = useState(''); // Changed from dealPrice
    const [description, setDescription] = useState(''); // Changed from dealDescription
    const [imageUri, setImageUri] = useState(null); // Changed from dealImage to represent URI

    useEffect(() => {
        if (initialDealData) {
            // When editing, initialize with existing deal data from `initialDealData`
            setName(initialDealData.name || ''); // Use initialDealData.name
            setPrice(initialDealData.price ? initialDealData.price.toString() : ''); // Ensure price is string
            setDescription(initialDealData.description || '');
            setImageUri(initialDealData.image || null); // Use initialDealData.image (which is a URI)
        } else {
            // Reset for adding new deal
            setName('');
            setPrice('');
            setDescription('');
            setImageUri(null); // Reset to null for new deals
        }
    }, [initialDealData]);

    const handleSave = () => {
        if (!name.trim() || !price.trim()) {
            Alert.alert("Missing Info", "Please provide deal name and price.");
            return;
        }

        // Validate price is a valid number
        const numericPrice = parseFloat(price);
        if (isNaN(numericPrice)) {
            Alert.alert("Invalid Input", "Price must be a valid number.");
            return;
        }

        const dataToSave = {
            id: initialDealData ? initialDealData.id : null, // Pass ID for editing
            name, // Use 'name'
            price: numericPrice, // Pass as a number for the API
            description,
            image: imageUri, // Pass the image URI
        };
        onSave(dataToSave);
        // onClose(); // Closing handled by parent component (DealsScreen) after API call success/failure
    };

    const handleImagePick = async () => {
        const options = {
            mediaType: 'photo',
            includeBase64: false,
        };

        launchImageLibrary(options, (response) => {
            if (response.didCancel) {
                console.log('User cancelled image picker');
            } else if (response.errorCode) {
                console.log('Image Picker Error: ', response.errorMessage);
                Alert.alert("Image Error", `Failed to pick image: ${response.errorMessage}`);
            } else {
                const uri = response.assets && response.assets.length > 0 ? response.assets[0].uri : null;
                if (uri) {
                    setImageUri(uri); // Store the URI directly
                }
            }
        });
    };

    return (
        <Modal visible={visible} animationType="fade" transparent={true} onRequestClose={onClose}>
            <View style={modalStyles.overlay}>
                <View style={modalStyles.modalContainer}>
                    <TouchableOpacity style={modalStyles.closeIcon} onPress={onClose}>
                        <Icon name="close" size={width * 0.025} color="#fff" />
                    </TouchableOpacity>
                    <Text style={modalStyles.heading}>{initialDealData ? 'Edit Deal' : 'Add New Deal'}</Text>
                    <ScrollView contentContainerStyle={modalStyles.scrollContent}>
                        <Text style={modalStyles.label}>Name</Text>
                        <TextInput
                            style={modalStyles.input}
                            value={name} // Use 'name' state
                            onChangeText={setName} // Update 'name' state
                            placeholder="Enter deal name"
                            placeholderTextColor="#A9A9A9"
                        />

                        <Text style={modalStyles.label}>Price (PKR)</Text>
                        <TextInput
                            style={modalStyles.input}
                            value={price} // Use 'price' state
                            onChangeText={setPrice} // Update 'price' state
                            placeholder="Enter price"
                            placeholderTextColor="#A9A9A9"
                            keyboardType="numeric"
                        />

                        <Text style={modalStyles.label}>Description</Text>
                        <TextInput
                            style={[modalStyles.input, modalStyles.multilineInput]}
                            value={description} // Use 'description' state
                            onChangeText={setDescription} // Update 'description' state
                            placeholder="Enter deal description"
                            placeholderTextColor="#A9A9A9"
                            multiline
                            numberOfLines={4}
                        />

                        {/* Image Import Field */}
                        <View style={modalStyles.imageUploadContainer}>
                            {imageUri ? ( // Use imageUri for preview
                                <Image source={{ uri: imageUri }} style={modalStyles.uploadedImagePreview} resizeMode="cover" />
                            ) : (
                                <View style={modalStyles.imageUploadPlaceholder}>
                                    <Ionicons name="cloud-upload-outline" size={width * 0.05} color="#A9A9A9" />
                                    <Text style={modalStyles.imageUploadText}>Drag & drop files or browse files</Text>
                                    <Text style={modalStyles.imageUploadSubText}>Attach image</Text>
                                </View>
                            )}
                            <TouchableOpacity style={modalStyles.imageUploadButton} onPress={handleImagePick}>
                                <Text style={modalStyles.imageUploadButtonText}>Select Image</Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity style={modalStyles.saveButton} onPress={handleSave}>
                            <Text style={modalStyles.saveButtonText}>Save</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={modalStyles.closeButton} onPress={onClose}>
                            <Text style={modalStyles.closeButtonText}>Close</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};

const modalStyles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        width: width * 0.55,
        maxHeight: height * 0.67,
        backgroundColor: '#2A2D32',
        borderRadius: 10,
        padding: width * 0.02,
        position: 'relative',
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
        fontSize: width * 0.025,
        fontWeight: 'bold',
        marginBottom: height * 0.02,
        textAlign: 'center',
    },
    scrollContent: {
        paddingBottom: height * 0.02,
    },
    label: {
        color: '#A9A9A9',
        fontSize: width * 0.016,
        marginBottom: height * 0.008,
    },
    input: {
        backgroundColor: '#1E2021',
        color: '#fff',
        borderRadius: 8,
        paddingHorizontal: width * 0.015,
        paddingVertical: height * 0.012,
        fontSize: width * 0.016,
        marginBottom: height * 0.02,
        borderWidth: 1,
        borderColor: '#3C3C3C',
    },
    multilineInput: {
        height: height * 0.1,
        textAlignVertical: 'top',
    },
    imageUploadContainer: {
        backgroundColor: '#1E2021',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#3C3C3C',
        borderStyle: 'dashed',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: height * 0.03,
        marginBottom: height * 0.02,
        height: height * 0.15,
        overflow: 'hidden', // Ensure image doesn't overflow
    },
    imageUploadPlaceholder: {
        alignItems: 'center',
    },
    imageUploadText: {
        color: '#A9A9A9',
        fontSize: width * 0.015,
        marginTop: height * 0.005,
    },
    imageUploadSubText: {
        color: '#A9A9A9',
        fontSize: width * 0.012,
        marginTop: height * 0.002,
    },
    uploadedImagePreview: {
        width: '100%',
        height: '100%',
        borderRadius: 7,
    },
    imageUploadButton: {
        backgroundColor: 'transparent',
        marginTop: height * 0.015,
        position: 'absolute',
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
        paddingVertical: height * 0.015,
        alignItems: 'center',
        marginTop: height * 0.02,
        marginBottom: height * 0.01,
    },
    saveButtonText: {
        color: '#fff',
        fontSize: width * 0.018,
        fontWeight: 'bold',
    },
    closeButton: {
        backgroundColor: 'transparent',
        borderRadius: 8,
        paddingVertical: height * 0.015,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#3C3C3C',
    },
    closeButtonText: {
        color: '#fff',
        fontSize: width * 0.018,
        fontWeight: 'bold',
    },
    buttons: {
        justifyContent: 'space-between',
        alignItems: 'row',
    }
});

export default AddDealModal;