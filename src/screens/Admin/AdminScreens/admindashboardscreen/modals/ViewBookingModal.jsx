import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Dimensions, TouchableWithoutFeedback, Image } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const { width, height } = Dimensions.get('window');

const ViewBookingModal = ({ isVisible, onClose, bookingDetails }) => {
    const {
        clientName = 'N/A',
        dateTime = 'N/A',
        phoneNumber = 'N/A',
        advancePayment = 'N/A',
        description = 'N/A',
        reminder = 'N/A',
        imageUri = null,
    } = bookingDetails || {};

    // Determine the image source based on whether it's a URI string or a require() number
    const imageSource = typeof imageUri === 'string' ? { uri: imageUri } : imageUri;

    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={isVisible}
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.modalOverlay}>
                    <TouchableWithoutFeedback>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Booking Details</Text>
                                <TouchableOpacity onPress={onClose}>
                                    <Ionicons name="close-circle-outline" size={width * 0.025} color="#fff" />
                                </TouchableOpacity>
                            </View>

                            {/* Image Display - Now handles both string URI and require() number */}
                            {imageUri && (
                                <View style={styles.imageContainer}>
                                    <Image source={imageSource} style={styles.bookingImage} />
                                </View>
                            )}

                            {/* Details Section */}
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Client Name</Text>
                                <Text style={styles.detailValue}>{clientName}</Text>
                            </View>
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Date & Time</Text>
                                <Text style={styles.detailValue}>{dateTime}</Text>
                            </View>
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Phone Number</Text>
                                <Text style={styles.detailValue}>{phoneNumber}</Text>
                            </View>
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Advance Payment</Text>
                                <Text style={styles.detailValue}>{advancePayment}</Text>
                            </View>
                            <View style={styles.noteRow}>
                                <Text style={styles.detailLabel}>Description</Text>
                                <Text style={styles.noteValue}>{description}</Text>
                            </View>
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Reminder</Text>
                                <Text style={styles.detailValue}>{reminder}</Text>
                            </View>

                            {/* Modal Buttons */}
                            <View style={styles.modalButtons}>
                                <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                                    <Text style={styles.closeButtonText}>Close</Text>
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
        width: width * 0.55,
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
    imageContainer: {
        width: '100%',
        height: height * 0.2,
        marginBottom: height * 0.02,
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: '#2A2D32',
        justifyContent: 'center',
        alignItems: 'center',
    },
    bookingImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'contain',
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: height * 0.015,
    },
    detailLabel: {
        color: '#A9A9A9',
        fontSize: width * 0.016,
        fontWeight: '500',
        flex: 1,
    },
    detailValue: {
        color: '#fff',
        fontSize: width * 0.016,
        flex: 1,
        textAlign: 'right',
    },
    noteRow: {
        marginBottom: height * 0.02,
    },
    noteValue: {
        color: '#fff',
        fontSize: width * 0.016,
        marginTop: height * 0.01,
        lineHeight: width * 0.02,
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: height * 0.02,
    },
    closeButton: {
        backgroundColor: '#A98C27',
        paddingVertical: height * 0.015,
        paddingHorizontal: width * 0.11,
        marginRight: width*0.10,
        borderRadius: 8,
    },
    closeButtonText: {
        color: '#fff',
        fontSize: width * 0.016,
        fontWeight: '600',
    },
});

export default ViewBookingModal;