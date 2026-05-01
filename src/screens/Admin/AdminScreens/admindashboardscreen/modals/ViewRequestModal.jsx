import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Dimensions, TouchableWithoutFeedback } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const { width, height } = Dimensions.get('window');

const ViewRequestModal = ({ isVisible, onClose, onApprove, requestDetails }) => {
    // Provide default empty values if requestDetails is null or undefined
    const {
        id = 'N/A',
        name = 'N/A',
        requestType = 'N/A',
        time = 'N/A',
        date = 'N/A',
        // Amount will primarily be used for Expense Request rows (from PendingApprovalsScreen)
        amount = null,
        note = 'Lorem ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry\'s standard dummy text ever since the 1500s.', // Default note as per screenshot
    } = requestDetails || {}; // Destructure with default empty object

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
                                <Text style={styles.modalTitle}>View Pending Details</Text>
                                <TouchableOpacity onPress={onClose}>
                                    <Ionicons name="close-circle-outline" size={width * 0.025} color="#fff" />
                                </TouchableOpacity>
                            </View>

                            {/* Details Section */}
                            {/* <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Employee ID</Text>
                                <Text style={styles.detailValue}>{id}</Text>
                            </View> */}
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Name</Text>
                                <Text style={styles.detailValue}>{name}</Text>
                            </View>
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Request Type</Text>
                                <Text style={styles.detailValue}>{requestType}</Text>
                            </View>
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Amount</Text>
                                <Text style={styles.detailValue}>
                                    {amount !== null && amount !== undefined
                                        ? `PKR ${Number(amount).toFixed(2)}`
                                        : '--'}
                                </Text>
                            </View>
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Time</Text>
                                <Text style={styles.detailValue}>{time}</Text>
                            </View>
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Date</Text>
                                <Text style={styles.detailValue}>{date}</Text>
                            </View>
                            <View style={styles.noteRow}>
                                <Text style={styles.detailLabel}>Note</Text>
                                <Text style={styles.noteValue}>{note}</Text>
                            </View>

                            {/* Modal Buttons */}
                            <View style={styles.modalButtons}>
                                <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                                    <Text style={styles.closeButtonText}>Close</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.approveButton} onPress={onApprove}>
                                    <Text style={styles.approveButtonText}>Approve</Text>
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
        width: width * 0.5, // Adjusted width to match screenshot
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
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: height * 0.015,
    },
    detailLabel: {
        color: '#A9A9A9',
        fontSize: width * 0.016,
        fontWeight: '500',
        flex: 1, // Take equal space with value
    },
    detailValue: {
        color: '#fff',
        fontSize: width * 0.016,
        flex: 1, // Take equal space with label
        textAlign: 'right', // Align value to the right
    },
    noteRow: {
        marginBottom: height * 0.02,
    },
    noteValue: {
        color: '#fff',
        fontSize: width * 0.016,
        marginTop: height * 0.01, // Space between "Note" label and its content
        lineHeight: width * 0.02, // Adjust line height for readability
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end', // Aligned to the right as per screenshot
        marginTop: height * 0.02,
    },
    closeButton: {
        backgroundColor: '#3C3C3C',
        paddingVertical: height * 0.015,
        paddingHorizontal: width * 0.025,
        borderRadius: 8,
        marginRight: width * 0.01,
    },
    closeButtonText: {
        color: '#fff',
        fontSize: width * 0.016,
        fontWeight: '600',
    },
    approveButton: {
        backgroundColor: '#A98C27', // Golden color for approve
        paddingVertical: height * 0.015,
        paddingHorizontal: width * 0.025,
        borderRadius: 8,
    },
    approveButtonText: {
        color: '#fff',
        fontSize: width * 0.016,
        fontWeight: '600',
    },
});

export default ViewRequestModal;