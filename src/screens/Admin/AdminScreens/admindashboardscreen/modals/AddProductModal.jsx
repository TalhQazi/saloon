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
  ActivityIndicator,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import ImageResizer from 'react-native-image-resizer';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';

const AddProductModal = ({ visible, onClose, onSave, initialProductData }) => {
  const [productName, setProductName] = useState('');
  const [productImage, setProductImage] = useState(null);

  const [productDetailName, setProductDetailName] = useState('');
  const [price, setPrice] = useState('');
  const [time, setTime] = useState(''); // kept only for backward compatibility; not sent
  const [description, setDescription] = useState('');
  const [productDetailImage, setProductDetailImage] = useState(null);
  const [productDetails, setProductDetails] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initialProductData) {
      setProductName(initialProductData.productName || '');
      // For images, ensure they are handled correctly as URIs or local assets
      setProductImage(
        initialProductData.productImage
          ? typeof initialProductData.productImage === 'number'
            ? initialProductData.productImage
            : initialProductData.productImage
          : null,
      );
      setProductDetails(initialProductData.productDetails || []);

      if (
        initialProductData.productDetails &&
        initialProductData.productDetails.length > 0
      ) {
        setProductDetailName(
          initialProductData.productDetails[0].productDetailName || '',
        );
        setPrice(String(initialProductData.productDetails[0].price || '')); // Ensure price is string
        setTime(String(initialProductData.productDetails[0].time || '')); // legacy value (not shown / not re-sent)
        setDescription(initialProductData.productDetails[0].description || '');
        setProductDetailImage(
          initialProductData.productDetails[0].productDetailImage
            ? typeof initialProductData.productDetails[0].productDetailImage ===
              'number'
              ? initialProductData.productDetails[0].productDetailImage
              : initialProductData.productDetails[0].productDetailImage
            : null,
        );
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
    setSaving(false);
  }, [initialProductData, visible]);

  const pickImage = async type => {
    const options = {
      mediaType: 'photo',
      // Keep original picker quality fairly high; actual compression is done
      // by ImageResizer below.
      quality: 1,
      includeBase64: false,
      maxWidth: 1024,
      maxHeight: 1024,
      selectionLimit: 1,
      includeExtra: true,
    };

    try {
      const response = await launchImageLibrary(options);

      if (response.didCancel) {
        console.log('User cancelled image picker');
        return;
      }

      if (response.errorCode) {
        console.log('ImagePicker Error: ', response.errorCode);
        Alert.alert(
          'Image Pick Error',
          `Failed to pick image: ${
            response.errorMessage || response.errorCode
          }. Please try again.`,
        );
        return;
      }

      if (!response.assets || response.assets.length === 0) {
        Alert.alert('Error', 'No image selected. Please try again.');
        return;
      }

      const asset = response.assets[0];
      const uri = asset.uri;

      console.log('Selected image (before resize):', {
        uri,
        type: asset.type,
        fileName: asset.fileName,
        fileSize: asset.fileSize,
        width: asset.width,
        height: asset.height,
      });

      if (!uri) {
        Alert.alert(
          'Error',
          'Selected image has no URI. Please try selecting a different image.',
        );
        return;
      }

      try {
        // Further compress images to reduce payload size as much as possible.
        // Smaller target size and lower quality dramatically shrink upload.
        const resized = await ImageResizer.createResizedImage(
          uri,
          700,
          700,
          'JPEG',
          70,
        );

        console.log('Resized image:', resized);

        if (type === 'product') {
          setProductImage(resized.uri);
        } else {
          setProductDetailImage(resized.uri);
        }
      } catch (resizeError) {
        console.error('Error resizing image:', resizeError);
        // Fallback to original URI if resize fails
        if (type === 'product') {
          setProductImage(uri);
        } else {
          setProductDetailImage(uri);
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert(
        'Image Error',
        'An unexpected error occurred while picking the image.',
      );
    }
  };

  const handleAddProductDetail = () => {
    if (!productDetailName || !price) {
      Alert.alert(
        'Missing Product Detail Information',
        'Please fill in Product Detail Name and Price before adding.',
      );
      return;
    }
    setProductDetails([
      ...productDetails,
      {
        productDetailName,
        price,
        time: time || 'N/A',
        description,
        productDetailImage,
        // Mirror services: include generic 'image' for backend compatibility
        image: productDetailImage,
      },
    ]);
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
      productDetails:
        productDetails.length > 0
          ? productDetails
          : productDetailName && price
          ? [
              {
                productDetailName,
                price,
                time: time || 'N/A',
                description,
                productDetailImage,
                image: productDetailImage,
              },
            ]
          : [],
      isHiddenFromEmployee: initialProductData?.isHiddenFromEmployee || false,
    };

    if (!productName || !productImage) {
      Alert.alert(
        'Missing Product Information',
        'Please fill in Product Name and select a Product Image.',
      );
      return;
    }

    if (productToSave.productDetails.length === 0) {
      Alert.alert(
        'Missing Product Detail Information',
        'Please add at least one product detail or fill in the current product detail fields.',
      );
      return;
    }

    setSaving(true);
    onSave(productToSave);
  };

  const getProductImageSource = image => {
    if (typeof image === 'string') {
      return { uri: image };
    } else if (typeof image === 'number') {
      return image; // It's a local asset import (e.g., require('...'))
    }
    return null; // No image or invalid format
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <TouchableOpacity style={styles.closeIcon} onPress={onClose}>
            <Icon name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <ScrollView contentContainerStyle={styles.scroll}>
            <Text style={styles.heading}>
              {initialProductData ? 'Edit Product' : 'Add New Product'}
            </Text>

            <Text style={styles.label}>Add Product Details</Text>
            <TextInput
              style={styles.input}
              placeholder="Product Name"
              placeholderTextColor="#999"
              value={productName}
              onChangeText={setProductName}
            />

            <TouchableOpacity
              style={styles.imageBox}
              onPress={() => pickImage('product')}
            >
              {productImage ? (
                <Image
                  source={getProductImageSource(productImage)}
                  style={styles.image}
                />
              ) : (
                <>
                  <Icon
                    name="file-image"
                    size={40}
                    color="#999"
                    style={styles.dragDropIcon}
                  />
                  <Text style={styles.imageText}>
                    Drag & drop files or browse files
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <Text style={styles.label}>Add Sub Product Detail</Text>
            {productDetails.map((detail, index) => (
              <View key={index} style={styles.productDetailItem}>
                {/* Explicitly convert non-string values to string if they might not be */}
                <Text style={styles.productDetailItemText}>
                  {detail.productDetailName} - ${String(detail.price)}
                </Text>
                {detail.productDetailImage &&
                  getProductImageSource(detail.productDetailImage) && (
                    <Image
                      source={getProductImageSource(detail.productDetailImage)}
                      style={styles.productDetailPreviewImage}
                    />
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
              style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
              placeholder="Description"
              placeholderTextColor="#999"
              value={description}
              onChangeText={setDescription}
              multiline
            />

            {/* Sub Product Image Picker */}
            <TouchableOpacity
              style={styles.imageBox}
              onPress={() => pickImage('subproduct')}
            >
              {productDetailImage ? (
                <Image
                  source={getProductImageSource(productDetailImage)}
                  style={styles.image}
                />
              ) : (
                <>
                  <Icon
                    name="file-image"
                    size={40}
                    color="#999"
                    style={styles.dragDropIcon}
                  />
                  <Text style={styles.imageText}>Tap to add sub product image</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.productDetailButton}
              onPress={handleAddProductDetail}
            >
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.productDetailButtonText}>
                Add Sub Product
              </Text>
            </TouchableOpacity>

            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
                {saving ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <Text style={styles.saveButtonText}>
                    {initialProductData ? 'Update' : 'Save'}
                  </Text>
                )}
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
    color: '#fff',
    fontWeight: 'bold',
  },
  description: {
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
    color: '#fff',
    fontWeight: 'bold',
  },
});
