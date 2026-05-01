import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Dimensions, TouchableWithoutFeedback, Image } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const { width, height } = Dimensions.get('window');

const ViewAdvanceSalaryModal = ({ isVisible, onClose, salaryDetails }) => {
    const {
        id = 'N/A',
        name = 'N/A',
        amount = 'N/A',
        date = 'N/A',
        image = null, // Ensure image property is destructured, defaulting to null
    } = salaryDetails || {};

    // Determine the image source based on its type and presence
    let imageSource = null;
    if (image) {
        if (typeof image === 'string' && image.length > 0) {
            imageSource = { uri: image }; // User-uploaded image (URI)
        } else if (typeof image === 'number') {
            imageSource = image; // Local dummy image (from require)
        }
    }

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
                                <Text style={styles.modalTitle}>Advance Salary Details</Text>
                                <TouchableOpacity onPress={onClose}>
                                    <Ionicons name="close-circle-outline" size={width * 0.025} color="#fff" />
                                </TouchableOpacity>
                            </View>

                            {/* Image Section - Conditionally rendered */}
                            {imageSource && (
                                <View style={styles.imageContainer}>
                                    <Image source={imageSource} style={styles.detailImage} resizeMode="contain" />
                                </View>
                            )}

                            {/* Details Section */}
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Employee ID</Text>
                                <Text style={styles.detailValue}>{id}</Text>
                            </View>
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Name</Text>
                                <Text style={styles.detailValue}>{name}</Text>
                            </View>
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Amount</Text>
                                <Text style={styles.detailValue}>{amount}</Text>
                            </View>
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Date</Text>
                                <Text style={styles.detailValue}>{date}</Text>
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
        backgroundColor: 'rgba(53, 53, 53, 0.9)',
    },
    modalContent: {
        width: width * 0.5, // Consistent width with other View modals
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
        fontSize: width * 0.03,
        fontWeight: 'bold',
    },
    imageContainer: {
        alignItems: 'center', // Center the image horizontally
        marginBottom: height * 0.02,
    },
    detailImage: {
        width: '80%', // Adjust as needed
        height: height * 0.2, // Adjust as needed
        borderRadius: 8,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: height * 0.015,
    },
    detailLabel: {
        color: '#A9A9A9',
        fontSize: width * 0.019,
        fontWeight: '500',
        flex: 1,
    },
    detailValue: {
        color: '#fff',
        fontSize: width * 0.016,
        flex: 1,
        textAlign: 'right',
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: height * 0.02,
    },
    closeButton: {
        backgroundColor: '#A98C27',
        paddingVertical: height * 0.015,
        paddingHorizontal: width * 0.12,
        marginRight: width * 0.07,
        borderRadius: 8,
    },
    closeButtonText: {
        color: '#fff',
        fontSize: width * 0.016,
        fontWeight: '600',
    },
});

export default ViewAdvanceSalaryModal;
