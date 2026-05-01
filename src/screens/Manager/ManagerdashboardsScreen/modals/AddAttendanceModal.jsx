import React, { useState } from 'react';
import {
    Modal,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
    TouchableWithoutFeedback,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import DatePicker from 'react-native-date-picker';
import moment from 'moment';

const { width, height } = Dimensions.get('window');

const AddAttendanceModal = ({ isVisible, onClose, onSave }) => {
    // Employee ID state is back for internal use within the modal
    const [employeeId, setEmployeeId] = useState(''); 
    const [employeeName, setEmployeeName] = useState('');
    const [attendanceStatus, setAttendanceStatus] = useState(''); // Will be 'Check-In' or 'Check-Out'
    const [attendanceDate, setAttendanceDate] = useState(new Date());
    const [openDatePicker, setOpenDatePicker] = useState(false);
    const [showAttendanceStatusPicker, setShowAttendanceStatusPicker] = useState(false);

    const [customAlertVisible, setCustomAlertVisible] = useState(false);
    const [customAlertMessage, setCustomAlertMessage] = useState('');

    const showCustomAlert = (message) => {
        setCustomAlertMessage(message);
        setCustomAlertVisible(true);
    };

    const hideCustomAlert = () => {
        setCustomAlertVisible(false);
        setCustomAlertMessage('');
    };

    const resetForm = () => {
        setEmployeeId(''); // Reset employee ID field
        setEmployeeName('');
        setAttendanceStatus('');
        setAttendanceDate(new Date());
        setShowAttendanceStatusPicker(false);
    };

    const handleSave = () => {
        const trimmedEmployeeId = employeeId.trim(); // Get the manually entered ID
        const trimmedEmployeeName = employeeName.trim();
        const trimmedAttendanceStatus = attendanceStatus.trim();

        if (!trimmedEmployeeId || !trimmedEmployeeName || !trimmedAttendanceStatus) {
            showCustomAlert('Missing Information: Please fill all required fields (Employee ID, Employee Name, and Attendance Status).');
            return;
        }

        if (!['Check-In', 'Check-Out'].includes(trimmedAttendanceStatus)) {
            showCustomAlert('Invalid Attendance Status: Status must be "Check-In" or "Check-Out".');
            return;
        }

        // Pass all collected data, including the manually entered employeeId, to the parent.
        // The parent will decide which ID to use for display.
        const newEntryData = {
            employeeId: trimmedEmployeeId, // Send the manually entered ID
            employeeName: trimmedEmployeeName,
            attendanceStatus: trimmedAttendanceStatus,
            attendanceDate: attendanceDate,
        };

        onSave(newEntryData);
        resetForm();
        onClose();
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={isVisible}
            onRequestClose={handleClose}
        >
            <TouchableWithoutFeedback onPress={handleClose}>
                <View style={styles.modalOverlay}>
                    <TouchableWithoutFeedback>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Add Attendance</Text>
                                <TouchableOpacity onPress={handleClose}>
                                    <Ionicons name="close-circle-outline" size={width * 0.025} color="#fff" />
                                </TouchableOpacity>
                            </View>

                            {/* Employee ID TextInput - RE-ADDED */}
                            <TextInput
                                style={styles.modalInput}
                                placeholder="Employee ID (Internal)"
                                placeholderTextColor="#A9A9A9"
                                value={employeeId}
                                onChangeText={setEmployeeId}
                            />
                            <TextInput
                                style={styles.modalInput}
                                placeholder="Employee Name"
                                placeholderTextColor="#A9A9A9"
                                value={employeeName}
                                onChangeText={setEmployeeName}
                            />

                            {/* Select Attendance Status (Check-In/Check-Out) */}
                            <TouchableOpacity
                                style={styles.modalInputTouchable}
                                onPress={() => setShowAttendanceStatusPicker(!showAttendanceStatusPicker)}
                            >
                                <Text style={attendanceStatus ? styles.modalInputText : styles.modalInputPlaceholderText}>
                                    {attendanceStatus || "Select Attendance Status"}
                                </Text>
                                <Ionicons name="chevron-down" size={width * 0.018} color="#A9A9A9" />
                            </TouchableOpacity>

                            {showAttendanceStatusPicker && (
                                <View style={styles.pickerOptionsContainer}>
                                    <TouchableOpacity
                                        style={styles.pickerOption}
                                        onPress={() => { setAttendanceStatus('Check-In'); setShowAttendanceStatusPicker(false); }}
                                    >
                                        <Text style={styles.pickerOptionText}>Check-In</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.pickerOption}
                                        onPress={() => { setAttendanceStatus('Check-Out'); setShowAttendanceStatusPicker(false); }}
                                    >
                                        <Text style={styles.pickerOptionText}>Check-Out</Text>
                                    </TouchableOpacity>
                                </View>
                            )}

                            {/* Date Picker Trigger */}
                            <TouchableOpacity
                                style={styles.modalInputTouchable}
                                onPress={() => setOpenDatePicker(true)}
                            >
                                <Text style={styles.modalInputText}>
                                    {moment(attendanceDate).format('MMM DD, YYYY')}
                                </Text>
                                <Ionicons name="calendar-outline" size={width * 0.018} color="#A9A9A9" />
                            </TouchableOpacity>

                            <DatePicker
                                modal
                                mode="date"
                                open={openDatePicker}
                                date={attendanceDate}
                                onConfirm={(date) => {
                                    setOpenDatePicker(false);
                                    setAttendanceDate(date);
                                }}
                                onCancel={() => setOpenDatePicker(false)}
                            />

                            {/* Modal Buttons */}
                            <View style={styles.modalButtons}>
                                <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
                                    <Text style={styles.closeButtonText}>Close</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                                    <Text style={styles.saveButtonText}>Save</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>

            {/* Custom Alert Modal */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={customAlertVisible}
                onRequestClose={hideCustomAlert}
            >
                <View style={styles.customAlertCenteredView}>
                    <View style={styles.customAlertModalView}>
                        <Text style={styles.customAlertModalText}>{customAlertMessage}</Text>
                        <TouchableOpacity
                            style={styles.customAlertCloseButton}
                            onPress={hideCustomAlert}
                        >
                            <Text style={styles.customAlertCloseButtonText}>OK</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
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
        width: width * 0.6,
        backgroundColor: '#1E1E1E',
        borderRadius: 8,
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
    modalInput: {
        backgroundColor: '#2A2D32',
        color: '#fff',
        fontSize: width * 0.018,
        paddingVertical: height * 0.015,
        paddingHorizontal: width * 0.015,
        borderRadius: 8,
        marginBottom: height * 0.015,
        borderWidth: 1,
        borderColor: '#4A4A4A',
    },
    modalInputTouchable: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#2A2D32',
        paddingVertical: height * 0.015,
        paddingHorizontal: width * 0.015,
        borderRadius: 8,
        marginBottom: height * 0.015,
        borderWidth: 1,
        borderColor: '#4A4A4A',
    },
    modalInputText: {
        color: '#fff',
        fontSize: width * 0.018,
    },
    modalInputPlaceholderText: {
        color: '#A9A9A9',
        fontSize: width * 0.018,
    },
    pickerOptionsContainer: {
        backgroundColor: '#2A2D32',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#4A4A4A',
        marginBottom: height * 0.015,
        overflow: 'hidden',
    },
    pickerOption: {
        paddingVertical: height * 0.015,
        paddingHorizontal: width * 0.015,
        borderBottomWidth: 1,
        borderBottomColor: '#3C3C3C',
    },
    pickerOptionText: {
        color: '#fff',
        fontSize: width * 0.018,
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: height * 0.02,
    },
    closeButton: {
        backgroundColor: '#3C3C3C',
        paddingVertical: height * 0.015,
        paddingHorizontal: width * 0.120,
        borderRadius: 8,
        marginRight: width * 0.01,
    },
    closeButtonText: {
        color: '#fff',
        fontSize: width * 0.016,
        fontWeight: '600',
    },
    saveButton: {
        backgroundColor: '#A98C27',
        paddingVertical: height * 0.015,
        paddingHorizontal: width * 0.120,
        borderRadius: 8,
    },
    saveButtonText: {
        color: '#fff',
        fontSize: width * 0.016,
        fontWeight: '600',
    },
    customAlertCenteredView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    customAlertModalView: {
        margin: 20,
        backgroundColor: '#1F1F1F',
        borderRadius: 10,
        padding: 35,
        alignItems: 'center',
        elevation: 5,
    },
    customAlertModalText: {
        marginBottom: 15,
        textAlign: 'center',
        color: '#fff',
        fontSize: width * 0.02,
    },
    customAlertCloseButton: {
        backgroundColor: '#A98C27',
        borderRadius: 5,
        padding: 10,
        elevation: 2,
    },
    customAlertCloseButtonText: {
        color: 'white',
        fontWeight: 'bold',
        textAlign: 'center'
    },
});

export default AddAttendanceModal;