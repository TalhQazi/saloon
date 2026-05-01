// src/screens/admin/modals/DealDetailModal.js
import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Dimensions } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const { width, height } = Dimensions.get('window');

const DealDetailModal = ({ visible, onClose, deal }) => {
    if (!deal) {
        return null;
    }

    const mainImageSource = typeof deal.dealImage === 'string' ? { uri: deal.dealImage } : deal.dealImage;

    return (
        <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
            <View style={detailStyles.overlay}>
                <View style={detailStyles.modalContainer}>
                    <TouchableOpacity style={detailStyles.closeIcon} onPress={onClose}>
                        <Icon name="close" size={width * 0.025} color="#fff" />
                    </TouchableOpacity>
                    <ScrollView contentContainerStyle={detailStyles.scroll}>
                        <Text style={detailStyles.heading}>Deal Details</Text>

                        {deal.dealImage && (
                            <Image source={mainImageSource} style={detailStyles.dealMainImage} resizeMode="cover" />
                        )}
                        <Text style={detailStyles.detailLabel}>Deal Name:</Text>
                        <Text style={detailStyles.detailText}>{deal.dealName}</Text>

                        <Text style={detailStyles.detailLabel}>Price:</Text>
                        <Text style={detailStyles.detailText}>${deal.price}</Text>

                        {deal.description && (
                            <View>
                                <Text style={detailStyles.detailLabel}>Description:</Text>
                                <Text style={detailStyles.detailText}>{deal.description}</Text>
                            </View>
                        )}

                        {deal.isHiddenFromEmployee && (
                            <Text style={detailStyles.hiddenStatusText}>This deal is currently hidden from employees.</Text>
                        )}

                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};

const detailStyles = StyleSheet.create({
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
        padding: width * 0.02,
        maxHeight: '90%',
        position: 'relative',
    },
    closeIcon: {
        position: 'absolute',
        top: height * 0.01,
        right: width * 0.01,
        zIndex: 1,
        padding: width * 0.01,
    },
    scroll: {
        paddingBottom: height * 0.02,
    },
    heading: {
        color: '#fff',
        fontSize: width * 0.025,
        fontWeight: 'bold',
        marginBottom: height * 0.015,
        textAlign: 'center',
    },
    dealMainImage: {
        width: '100%',
        height: height * 0.25,
        borderRadius: 8,
        marginBottom: height * 0.015,
        resizeMode: 'cover',
    },
    detailLabel: {
        color: '#bbb',
        fontSize: width * 0.016,
        marginTop: height * 0.01,
        marginBottom: height * 0.005,
        fontWeight: 'bold',
    },
    detailText: {
        color: '#fff',
        fontSize: width * 0.018,
        marginBottom: height * 0.01,
    },
    hiddenStatusText: {
        color: '#FFD700',
        fontSize: width * 0.016,
        fontWeight: 'bold',
        marginTop: height * 0.02,
        textAlign: 'center',
    },
});

export default DealDetailModal;