// src/screens/admin/modals/ProductDetailModal.js
import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Dimensions } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'; // For close icon

const { width, height } = Dimensions.get('window');

const ProductDetailModal = ({ visible, onClose, product }) => {
    if (!product) {
        return null; // Don't render if no product data is provided
    }

    // Determine if the image source is a local asset or a URI
    const mainImageSource = typeof product.productImage === 'string' ? { uri: product.productImage } : product.productImage;

    // Helper for sub-images, assuming they can also be local 'require()' or URI strings
    const getSubImageSource = (image) => {
        if (typeof image === 'string') {
            return { uri: image };
        } else if (typeof image === 'number') { // For local require() images
            return image;
        }
        return null;
    };

    return (
        <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={styles.modalContainer}>
                    <TouchableOpacity style={styles.closeIcon} onPress={onClose}>
                        <Icon name="close" size={width * 0.025} color="#fff" />
                    </TouchableOpacity>
                    <ScrollView contentContainerStyle={styles.scroll}>
                        <Text style={styles.heading}>Product Details</Text>

                        {product.productImage && (
                            <Image source={mainImageSource} style={styles.productMainImage} resizeMode="cover" />
                        )}
                        <Text style={styles.detailLabel}>Product Name:</Text>
                        <Text style={styles.detailText}>{product.productName}</Text>

                        {product.productDetails && product.productDetails.length > 0 ? ( // Added conditional rendering for sub-section
                            <View>
                                <Text style={styles.detailLabel}>Product Items:</Text>
                                {product.productDetails.map((detail, index) => (
                                    <View key={detail.id || index.toString()} style={styles.subServiceItem}>
                                        {detail.image && getSubImageSource(detail.image) && (
                                            <Image source={getSubImageSource(detail.image)} style={styles.subServiceImage} resizeMode="cover" />
                                        )}
                                        <View style={styles.subServiceTextContainer}>
                                            {/* Ensured all text strings are wrapped in <Text> components */}
                                            <Text style={styles.subServiceText}>Name: {detail.productDetailName}</Text>
                                            <Text style={styles.subServiceText}>Price: ${detail.price}</Text>
                                            <Text style={styles.subServiceText}>Time: {detail.time}</Text>
                                            {detail.description && <Text style={styles.subServiceText}>{detail.description}</Text>}
                                        </View>
                                    </View>
                                ))}
                            </View>
                        ) : ( // Added fallback text if no product details exist
                            <Text style={styles.noDetailsText}>No specific items available for this product.</Text>
                        )}


                        {product.isHiddenFromEmployee && (
                            <Text style={styles.hiddenStatusText}>This product is currently hidden from employees.</Text>
                        )}

                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};

export default ProductDetailModal;

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
        padding: width * 0.02, // Use dynamic padding
        maxHeight: '90%',
        position: 'relative',
    },
    closeIcon: {
        position: 'absolute',
        top: height * 0.01, // Use dynamic position
        right: width * 0.01, // Use dynamic position
        zIndex: 1,
        padding: width * 0.01, // Use dynamic padding
    },
    scroll: {
        paddingBottom: height * 0.02, // Use dynamic padding
    },
    heading: {
        color: '#fff',
        fontSize: width * 0.025, // Dynamic font size
        fontWeight: 'bold',
        marginBottom: height * 0.015, // Dynamic margin
        textAlign: 'center',
    },
    productMainImage: { // Renamed from serviceImage
        width: '100%',
        height: height * 0.25, // Dynamic height
        borderRadius: 8,
        marginBottom: height * 0.015, // Dynamic margin
        resizeMode: 'cover',
    },
    detailLabel: {
        color: '#bbb',
        fontSize: width * 0.016, // Dynamic font size
        marginTop: height * 0.01, // Dynamic margin
        marginBottom: height * 0.005, // Dynamic margin
        fontWeight: 'bold',
    },
    detailText: {
        color: '#fff',
        fontSize: width * 0.018, // Dynamic font size
        marginBottom: height * 0.01, // Dynamic margin
    },
    subServiceItem: { // This style name is fine, it represents an item in the details list
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#2c2c2c',
        borderRadius: 8,
        padding: width * 0.01, // Dynamic padding
        marginBottom: height * 0.008, // Dynamic margin
    },
    subServiceImage: { // This style name is fine
        width: width * 0.06, // Dynamic width
        height: width * 0.06, // Dynamic height
        borderRadius: 5,
        marginRight: width * 0.01, // Dynamic margin
    },
    subServiceTextContainer: {
        flex: 1,
    },
    subServiceText: {
        color: '#fff',
        fontSize: width * 0.014, // Dynamic font size
    },
    hiddenStatusText: {
        color: '#FFD700',
        fontSize: width * 0.016, // Dynamic font size
        fontWeight: 'bold',
        marginTop: height * 0.02, // Dynamic margin
        textAlign: 'center',
    },
    noDetailsText: { // Added style for the new fallback text
        color: '#aaa',
        fontSize: width * 0.015,
        textAlign: 'center',
        marginTop: height * 0.01,
        fontStyle: 'italic',
    },
});