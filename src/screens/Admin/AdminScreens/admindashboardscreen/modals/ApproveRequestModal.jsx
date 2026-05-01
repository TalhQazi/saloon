import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Dimensions, TouchableWithoutFeedback } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const { width, height } = Dimensions.get('window');

const ApproveRequestModal = ({ isVisible, onClose, onApprove, requestDetails }) => {
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
                                <Text style={styles.modalTitle}>Approve Request?</Text>
                                <TouchableOpacity onPress={onClose}>
                                    <Ionicons name="close-circle-outline" size={width * 0.025} color="#fff" />
                                </TouchableOpacity>
                            </View>

                            <Text style={styles.modalMessage}>
                                Are you sure you want to Approve Request?
                            </Text>
                            
                            {requestDetails && (
                                <View style={styles.detailsContainer}>
                                    <Text style={styles.detailText}>ID: {requestDetails.id}</Text>
                                    <Text style={styles.detailText}>Name: {requestDetails.name}</Text>
                                    <Text style={styles.detailText}>Type: {requestDetails.requestType}</Text>
                                </View>
                            )}

                            <View style={styles.modalButtons}>
                                <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                                    <Text style={styles.closeButtonText}>Close</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.approveButton} onPress={onApprove}>
                                    <Text style={styles.approveButtonText}>Yes, Approve</Text>
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
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
    },
    modalContent: {
        width: width * 0.55, // Adjusted width to match screenshot
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
    modalMessage: {
        color: '#fff',
        fontSize: width * 0.018,
        textAlign: 'center',
        marginBottom: height * 0.03,
    },
    detailsContainer: {
        backgroundColor: '#2A2D32',
        borderRadius: 8,
        padding: width * 0.015,
        marginBottom: height * 0.02,
    },
    detailText: {
        color: '#A9A9A9',
        fontSize: width * 0.015,
        marginBottom: height * 0.005,
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-around', // Adjusted to space-around for buttons
        marginTop: height * 0.02,
    },
    closeButton: {
        backgroundColor: '#3C3C3C',
        paddingVertical: height * 0.015,
        paddingHorizontal: width * 0.025,
        borderRadius: 8,
        flex: 1, // Make buttons take equal space
        marginRight: width * 0.01,
        alignItems: 'center',
    },
    closeButtonText: {
        color: '#fff',
        fontSize: width * 0.016,
        fontWeight: '600',
    },
    approveButton: {
        backgroundColor: '#4CAF50', // Green color for approve
        paddingVertical: height * 0.015,
        paddingHorizontal: width * 0.025,
        borderRadius: 8,
        flex: 1, // Make buttons take equal space
        marginLeft: width * 0.01,
        alignItems: 'center',
    },
    approveButtonText: {
        color: '#fff',
        fontSize: width * 0.016,
        fontWeight: '600',
    },
});

export default ApproveRequestModal;