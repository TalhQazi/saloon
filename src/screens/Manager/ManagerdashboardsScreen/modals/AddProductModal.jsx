// src/screens/admin/AdminScreens/adminauthscreen/AddProductModal.js
import React, { useState, useEffect } from 'react';
import {
    Modal,
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    Image,
    ScrollView,
    Alert,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';

const AddProductModal = ({ visible, onClose, onSave, initialProductData }) => {
    const [productName, setProductName] = useState('');
    const [productImage, setProductImage] = useState(null);

    const [productDetailName, setProductDetailName] = useState('');
    const [price, setPrice] = useState('');
    const [time, setTime] = useState('');
    const [description, setDescription] = useState('');
    const [productDetailImage, setProductDetailImage] = useState(null);
    const [productDetails, setProductDetails] = useState([]);

    useEffect(() => {
        if (initialProductData) {
            setProductName(initialProductData.productName || '');
            // For images, ensure they are handled correctly as URIs or local assets
            setProductImage(initialProductData.productImage ? (typeof initialProductData.productImage === 'number' ? initialProductData.productImage : initialProductData.productImage) : null);
            setProductDetails(initialProductData.productDetails || []);

            if (initialProductData.productDetails && initialProductData.productDetails.length > 0) {
                setProductDetailName(initialProductData.productDetails[0].productDetailName || '');
                setPrice(String(initialProductData.productDetails[0].price || '')); // Ensure price is string
                setTime(String(initialProductData.productDetails[0].time || ''));   // Ensure time is string
                setDescription(initialProductData.productDetails[0].description || '');
                setProductDetailImage(initialProductData.productDetails[0].productDetailImage ? (typeof initialProductData.productDetails[0].productDetailImage === 'number' ? initialProductData.productDetails[0].productDetailImage : initialProductData.productDetails[0].productDetailImage) : null);
            } else {
                setProductDetailName('');
                setPrice('');
                setTime('');
                setDescription('');
                setProductDetailImage(null);
            }
        } else {
            setProductName('');
            setProductDetailName('');
            setPrice('');
            setTime('');
            setDescription('');
            setProductImage(null);
            setProductDetailImage(null);
            setProductDetails([]);
        }
    }, [initialProductData, visible]);

    const pickImage = (type) => {
        const options = {
            mediaType: 'photo',
            quality: 1,
        };

        launchImageLibrary(options, (response) => {
            if (response.didCancel) {
                console.log('User cancelled image picker');
            } else if (response.errorCode) {
                console.log('ImagePicker Error: ', response.errorCode);
                Alert.alert('Image Pick Error', 'Failed to pick image. Please try again.');
            } else if (response.assets && response.assets.length > 0) {
                const uri = response.assets[0].uri;
                if (type === 'product') {
                    setProductImage(uri);
                } else {
                    setProductDetailImage(uri);
                }
            }
        });
    };

    const handleAddProductDetail = () => {
        if (!productDetailName || !price || !time) {
            Alert.alert('Missing Product Detail Information', 'Please fill in Product Detail Name, Price, and Time before adding.');
            return;
        }
        setProductDetails([...productDetails, { productDetailName, price, time, description, productDetailImage }]);
        setProductDetailName('');
        setPrice('');
        setTime('');
        setDescription('');
        setProductDetailImage(null);
    };

    const handleSave = () => {
        const productToSave = {
            id: initialProductData?.id,
            productName,
            productImage,
            productDetails: productDetails.length > 0
                ? productDetails
                : (productDetailName && price && time)
                    ? [{ productDetailName, price, time, description, productDetailImage }]
                    : [],
            isHiddenFromEmployee: initialProductData?.isHiddenFromEmployee || false,
        };

        if (!productName || !productImage) {
            Alert.alert('Missing Product Information', 'Please fill in Product Name and select a Product Image.');
            return;
        }

        if (productToSave.productDetails.length === 0) {
            Alert.alert('Missing Product Detail Information', 'Please add at least one product detail or fill in the current product detail fields.');
            return;
        }

        onSave(productToSave);
    };

    const getProductImageSource = (image) => {
        if (typeof image === 'string') {
            return { uri: image };
        } else if (typeof image === 'number') {
            return image; // It's a local asset import (e.g., require('...'))
        }
        return null; // No image or invalid format
    };

    return (
        <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={styles.modalContainer}>
                    <TouchableOpacity style={styles.closeIcon} onPress={onClose}>
                        <Icon name="close" size={24} color="#fff" />
                    </TouchableOpacity>
                    <ScrollView contentContainerStyle={styles.scroll}>
                        <Text style={styles.heading}>{initialProductData ? 'Edit Product' : 'Add New Product'}</Text>

                        <Text style={styles.label}>Add Product Details</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Product Name"
                            placeholderTextColor="#999"
                            value={productName}
                            onChangeText={setProductName}
                        />

                        <TouchableOpacity style={styles.imageBox} onPress={() => pickImage('product')}>
                            {productImage ? (
                                <Image source={getProductImageSource(productImage)} style={styles.image} />
                            ) : (
                                <>
                                    <Icon name="file-image" size={40} color="#999" style={styles.dragDropIcon} />
                                    <Text style={styles.imageText}>Drag & drop files or browse files</Text>
                                </>
                            )}
                        </TouchableOpacity>

                        <Text style={styles.label}>Add Product Item Details</Text>
                        {productDetails.map((detail, index) => (
                            <View key={index} style={styles.productDetailItem}>
                                {/* Explicitly convert non-string values to string if they might not be */}
                                <Text style={styles.productDetailItemText}>
                                    {detail.productDetailName} - ${String(detail.price)} - {String(detail.time)}
                                </Text>
                                {detail.productDetailImage && getProductImageSource(detail.productDetailImage) && (
                                    <Image source={getProductImageSource(detail.productDetailImage)} style={styles.productDetailPreviewImage} />
                                )}
                            </View>
                        ))}
                        <TextInput
                            style={styles.input}
                            placeholder="Product Item Name"
                            placeholderTextColor="#999"
                            value={productDetailName}
                            onChangeText={setProductDetailName}
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Price"
                            placeholderTextColor="#999"
                            value={price}
                            onChangeText={setPrice}
                            keyboardType="numeric"
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Time / Duration"
                            placeholderTextColor="#999"
                            value={time}
                            onChangeText={setTime}
                        />
                        <TextInput
                            style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
                            placeholder="Description"
                            placeholderTextColor="#999"
                            value={description}
                            onChangeText={setDescription}
                            multiline
                        />

                        <TouchableOpacity style={styles.productDetailButton} onPress={handleAddProductDetail}>
                            <Ionicons name="add" size={20} color="#fff" />
                            <Text style={styles.productDetailButtonText}>Add Sub Product</Text>
                        </TouchableOpacity>

                        <View style={styles.buttonRow}>
                            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                                <Text style={styles.closeButtonText}>Close</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                                <Text style={styles.saveButtonText}>{initialProductData ? 'Update' : 'Save'}</Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};

export default AddProductModal;

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        width: '60%',
        borderWidth: 1,
        borderColor: '#000000ff',
        borderRadius: 10,
        backgroundColor: '#1E2021',
        padding: 20,
        maxHeight: '90%',
        position: 'relative',
    },
    closeIcon: {
        position: 'absolute',
        top: 10,
        right: 10,
        zIndex: 1,
        padding: 5,
    },
    scroll: {
        paddingBottom: 20,
    },
    heading: {
        color: '#fff',
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 15,
        textAlign: 'center',
    },
    label: {
        color: '#bbb',
        fontSize: 14,
        marginTop: 15,
        marginBottom: 5,
    },
    input: {
        backgroundColor: '#2c2c2c',
        borderRadius: 8,
        padding: 10,
        color: '#fff',
        marginBottom: 10,
        fontSize: 16,
    },
    imageBox: {
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
    dragDropIcon: {
        marginBottom: 10,
    },
    imageText: {
        color: '#999',
        fontSize: 14,
    },
    image: {
        width: '100%',
        height: '100%',
        borderRadius: 8,
        resizeMode: 'cover',
    },
    productDetailButton: {
        backgroundColor: '#2c2c2c',
        padding: 12,
        borderRadius: 8,
        marginTop: 10,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#444',
    },
    productDetailButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        marginLeft: 5,
    },
    productDetailItem: {
        backgroundColor: '#333',
        padding: 10,
        borderRadius: 8,
        marginBottom: 5,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    productDetailItemText: {
        color: '#fff',
        fontSize: 14,
        // Removed flex: 1 here to avoid potential wrapping issues or unexpected layout behavior
        // if the string conversion below leads to very long strings.
    },
    productDetailPreviewImage: {
        width: 50,
        height: 50,
        borderRadius: 5,
        marginLeft: 10,
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 20,
    },
    closeButton: {
        backgroundColor: '#333',
        padding: 12,
        borderRadius: 8,
        flex: 1,
        marginRight: 10,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#444',
    },
    saveButton: {
        backgroundColor: '#e0b000',
        padding: 12,
        borderRadius: 8,
        flex: 1,
        marginLeft: 10,
        alignItems: 'center',
    },
    closeButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    saveButtonText: {
        color: '#000',
        fontWeight: 'bold',
    },
});