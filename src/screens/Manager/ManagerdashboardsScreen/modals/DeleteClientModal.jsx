// src/screens/admin/ClientsScreen/modals/DeleteClientModal.jsx
import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const { width, height } = Dimensions.get('window');

const DeleteClientModal = ({ isVisible, onClose, onDeleteConfirm, clientDetails }) => {
    if (!clientDetails) {
        return null; // Don't render if no client details are provided
    }

    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={isVisible}
            onRequestClose={onClose}
        >
            <View style={styles.centeredView}>
                <View style={styles.modalView}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Delete Cleint</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Ionicons name="close-circle-outline" size={width * 0.03} color="#A9A9A9" />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.confirmationText}>
                        Are you sure you want to delete client 
                    </Text>

                    <View style={styles.buttonContainer}>
                        <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                            <Text style={styles.cancelButtonText}>Close</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.deleteButton} onPress={onDeleteConfirm}>
                            <Text style={styles.deleteButtonText}>Yes, Delete</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    centeredView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
    },
    modalView: {
        width: width * 0.5, // Adjust width as needed
        backgroundColor: '#1F1F1F',
        borderRadius: 10,
        padding: width * 0.02,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        marginBottom: height * 0.02,
    },
    modalTitle: {
        fontSize: width * 0.025,
        fontWeight: 'bold',
        color: '#fff',
    },
    closeButton: {
        padding: width * 0.005,
    },
    confirmationText: {
        fontSize: width * 0.020,
        color: '#fff',
        textAlign: 'center',
        marginBottom: height * 0.02,
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
    },
    cancelButton: {
        backgroundColor: '#2A2D32',
        borderRadius: 8,
        paddingVertical: height * 0.012,
        paddingHorizontal: width * 0.025,
        flex: 1,
        marginRight: width * 0.01,
        alignItems: 'center',
    },
    cancelButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: width * 0.017,
    },
    deleteButton: {
        backgroundColor: '#ff5555', // Red for delete action
        borderRadius: 8,
        paddingVertical: height * 0.012,
        paddingHorizontal: width * 0.025,
        flex: 1,
        marginLeft: width * 0.01,
        alignItems: 'center',
    },
    deleteButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: width * 0.017,
    },
});

export default DeleteClientModal;
