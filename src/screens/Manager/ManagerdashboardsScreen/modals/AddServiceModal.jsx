import React, { useState, useEffect, useRef } from 'react'; // Import useRef
import {
    Modal,
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    Image,
    ScrollView,
    Dimensions,
    Alert,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';

const { width } = Dimensions.get('window');

// Helper function to get image source (local asset number or URI string)
const getServiceImageSource = (image) => {
    if (typeof image === 'string') {
        return { uri: image };
    } else if (typeof image === 'number') {
        return image; // For local `require` images
    }
    return null;
};

const AddServiceModal = ({ visible, onClose, onSave, initialServiceData }) => {
    // State for main service details
    const [serviceName, setServiceName] = useState('');
    const [serviceImage, setServiceImage] = useState(null); // Stores URI string or local asset number
    const [subServices, setSubServices] = useState([]); // Array of sub-service objects

    // State for current sub-service being added/edited
    const [currentSubServiceId, setCurrentSubServiceId] = useState(null);
    const [currentSubServiceName, setCurrentSubServiceName] = useState('');
    const [currentPrice, setCurrentPrice] = useState('');
    const [currentTime, setCurrentTime] = useState('');
    const [currentDescription, setCurrentDescription] = useState('');
    const [currentSubServiceImage, setCurrentSubServiceImage] = useState(null);

    // Ref to track if data has been initialized to prevent re-initialization on every render
    const isInitialDataLoaded = useRef(false);

    // Helper to reset current sub-service input fields
    const resetCurrentSubServiceFields = () => {
        setCurrentSubServiceId(null);
        setCurrentSubServiceName('');
        setCurrentPrice('');
        setCurrentTime('');
        setCurrentDescription('');
        setCurrentSubServiceImage(null);
    };

    // Effect to handle modal visibility and initial data loading
    useEffect(() => {
        console.log("AddServiceModal useEffect triggered. Visible:", visible, "initialServiceData:", initialServiceData?.id);

        if (visible) {
            // Reset the flag when modal becomes visible, preparing for new data load
            isInitialDataLoaded.current = false;

            if (initialServiceData) {
                // Pre-fill main service details ONLY if in edit mode
                console.log("EDIT MODE: Pre-filling serviceName with:", initialServiceData.name);
                console.log("EDIT MODE: Pre-filling serviceImage with:", initialServiceData.image);
                setServiceName(initialServiceData.name || '');
                setServiceImage(initialServiceData.image || null);
                setSubServices(initialServiceData.subServices || []);
            } else {
                // Clear all fields if in add mode (no initialServiceData)
                console.log("ADD MODE: Clearing all service fields.");
                setServiceName('');
                setServiceImage(null);
                setSubServices([]);
            }
            // Always reset sub-service input fields when modal becomes visible,
            // regardless of add or edit mode for the main service.
            resetCurrentSubServiceFields();
        } else {
            // When modal is hidden, reset all states to ensure clean slate for next open
            console.log("Modal is hidden, resetting all states.");
            setServiceName('');
            setServiceImage(null);
            setSubServices([]);
            resetCurrentSubServiceFields();
            isInitialDataLoaded.current = false; // Reset the flag
        }
    }, [visible, initialServiceData]); // Depend on 'visible' and 'initialServiceData'


    // Function to handle picking an image (for main service or sub-service)
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
                Alert.alert('Error', 'Failed to pick image. Please try again.');
            } else if (response.assets && response.assets.length > 0) {
                const uri = response.assets[0].uri;
                if (type === 'service') {
                    console.log("Selected service image URI:", uri);
                    setServiceImage(uri);
                } else {
                    console.log("Selected sub-service image URI:", uri);
                    setCurrentSubServiceImage(uri);
                }
            }
        });
    };

    // Function to add a new sub-service or update an existing one
    const handleAddOrUpdateSubService = () => {
        if (!currentSubServiceName.trim() || !currentPrice.trim() || !currentTime.trim()) {
            Alert.alert('Missing Info', 'Please fill in Sub Service Name, Price, and Time.');
            return;
        }

        const newOrUpdatedSubService = {
            id: currentSubServiceId || Date.now().toString(), // Use existing ID or generate new
            subServiceName: currentSubServiceName.trim(),
            price: currentPrice.trim(),
            time: currentTime.trim(),
            description: currentDescription.trim(),
            subServiceImage: currentSubServiceImage,
        };

        let updatedSubServices;
        if (currentSubServiceId) {
            // Update existing sub-service
            updatedSubServices = subServices.map((sub) =>
                sub.id === currentSubServiceId ? newOrUpdatedSubService : sub
            );
            Alert.alert('Success', 'Sub-service updated successfully!');
        } else {
            // Add new sub-service
            updatedSubServices = [...subServices, newOrUpdatedSubService];
            Alert.alert('Success', 'Sub-service added successfully!');
        }
        setSubServices(updatedSubServices); // Update the state
        resetCurrentSubServiceFields(); // Clear input fields after action
    };

    // Function to load a sub-service into the input fields for editing
    const handleEditSubService = (sub) => {
        console.log("Editing sub-service:", sub.subServiceName);
        setCurrentSubServiceId(sub.id);
        setCurrentSubServiceName(sub.subServiceName);
        setCurrentPrice(sub.price);
        setCurrentTime(sub.time);
        setCurrentDescription(sub.description);
        setCurrentSubServiceImage(sub.subServiceImage);
    };

    // Function to delete a sub-service
    const handleDeleteSubService = (id) => {
        Alert.alert(
            "Delete Sub-service",
            "Are you sure you want to delete this sub-service?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    onPress: () => {
                        setSubServices((prevSubServices) => prevSubServices.filter((sub) => sub.id !== id));
                        Alert.alert('Success', 'Sub-service deleted successfully!');
                        // If the deleted sub-service was currently being edited, clear the fields
                        if (currentSubServiceId === id) {
                            resetCurrentSubServiceFields();
                        }
                    },
                    style: "destructive",
                },
            ],
            { cancelable: true }
        );
    };

    // Function to save the main service (called by Save/Update button)
    const handleSave = () => {
        if (!serviceName.trim() || serviceImage === null) {
            Alert.alert('Missing Info', 'Please fill in Service Name and select a Service Image.');
            return;
        }

        // Before saving the main service, ensure any *currently entered* sub-service data
        // in the input fields is either added/updated, or the user is warned.
        if (currentSubServiceName.trim() || currentPrice.trim() || currentTime.trim() || currentDescription.trim() || currentSubServiceImage !== null) {
            Alert.alert(
                'Unsaved Sub-service Changes',
                'You have unsaved changes in the sub-service input fields. Please "Add/Update Current Sub Service" or clear the fields by cancelling to discard before saving the main service.',
                [{ text: 'OK' }]
            );
            return;
        }

        // Final check for sub-services: ensure there's at least one sub-service in the array.
        if (subServices.length === 0) {
            Alert.alert('Missing Info', 'Please add at least one sub-service.');
            return;
        }

        const serviceToSave = {
            id: initialServiceData?.id, // Use existing ID if in edit mode
            serviceName: serviceName.trim(),
            serviceImage: serviceImage,
            subServices: subServices, // Use the current state of subServices
            // Pass along isHiddenFromEmployee if it exists in initialServiceData, otherwise default to false
            isHiddenFromEmployee: initialServiceData?.isHiddenFromEmployee || false,
        };
        console.log("Saving service:", serviceToSave);
        onSave(serviceToSave); // Pass the finalized service data to the parent
    };

    return (
        <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={styles.modalContainer}>
                    <TouchableOpacity style={styles.closeIcon} onPress={() => {
                        resetCurrentSubServiceFields(); // Clear sub-service fields on close
                        onClose(); // Call parent's onClose
                    }}>
                        <Icon name="close" size={24} color="#fff" />
                    </TouchableOpacity>
                    <ScrollView contentContainerStyle={styles.scroll}>
                        <Text style={styles.heading}>{initialServiceData ? 'Edit Service' : 'Add New Service'}</Text>

                        <Text style={styles.label}>Service Details</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Service Name"
                            placeholderTextColor="#999"
                            value={serviceName} // THIS SHOULD NOW BE PRE-FILLED
                            onChangeText={setServiceName}
                        />

                        <TouchableOpacity style={styles.imageBox} onPress={() => pickImage('service')}>
                            {serviceImage ? (
                                <Image source={getServiceImageSource(serviceImage)} style={styles.image} />
                            ) : (
                                <>
                                    <Icon name="file-image" size={40} color="#999" style={styles.dragDropIcon} />
                                    <Text style={styles.imageText}>Drag & drop files or browse files</Text>
                                </>
                            )}
                        </TouchableOpacity>

                        <Text style={styles.label}>Sub Service Details</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Sub Service Name"
                            placeholderTextColor="#999"
                            value={currentSubServiceName}
                            onChangeText={setCurrentSubServiceName}
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Price"
                            placeholderTextColor="#999"
                            value={currentPrice}
                            onChangeText={setCurrentPrice}
                            keyboardType="numeric"
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Time"
                            placeholderTextColor="#999"
                            value={currentTime}
                            onChangeText={setCurrentTime}
                        />
                        <TextInput
                            style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
                            placeholder="Description"
                            placeholderTextColor="#999"
                            value={currentDescription}
                            onChangeText={setCurrentDescription}
                            multiline
                        />

                        <TouchableOpacity style={styles.imageBox} onPress={() => pickImage('sub')}>
                            {currentSubServiceImage ? (
                                <Image source={getServiceImageSource(currentSubServiceImage)} style={styles.image} />
                            ) : (
                                <>
                                    <Icon name="file-image" size={40} color="#999" style={styles.dragDropIcon} />
                                    <Text style={styles.imageText}>Drag & drop files or browse files</Text>
                                </>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.subServiceButton} onPress={handleAddOrUpdateSubService}>
                            <Ionicons name={currentSubServiceId ? "save-outline" : "add"} size={20} color="#fff" />
                            <Text style={styles.subServiceButtonText}>
                                {currentSubServiceId ? 'Update Current Sub Service' : 'Add New Sub Service'}
                            </Text>
                        </TouchableOpacity>

                        {/* List of existing sub-services */}
                        {subServices.map((sub, index) => (
                            <View key={sub.id || index} style={styles.subServiceItem}>
                                <View style={styles.subServiceTextContainer}>
                                    <Text style={styles.subServiceItemText}>{sub.subServiceName} - ${sub.price} - {sub.time}</Text>
                                    {sub.description ? <Text style={styles.subServiceDescriptionText}>{sub.description}</Text> : null}
                                </View>
                                {sub.subServiceImage && <Image source={getServiceImageSource(sub.subServiceImage)} style={styles.subServicePreviewImage} />}
                                <View style={styles.subServiceActions}>
                                    <TouchableOpacity onPress={() => handleEditSubService(sub)}>
                                        <Ionicons name="create-outline" size={20} color="#A98C27" />
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => handleDeleteSubService(sub.id)}>
                                        <Ionicons name="trash-outline" size={20} color="#FF6347" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))}


                        <View style={styles.buttonRow}>
                            <TouchableOpacity style={styles.closeButton} onPress={() => {
                                resetCurrentSubServiceFields(); // Clear sub-service fields on close
                                onClose(); // Call parent's onClose
                            }}>
                                <Text style={styles.closeButtonText}>Close</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                                <Text style={styles.saveButtonText}>{initialServiceData ? 'Update Service' : 'Save Service'}</Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};

export default AddServiceModal;

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        width: '60%', // Adjusted from 60% for better responsiveness if needed
        maxWidth: 500, // Max width for larger screens
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
        borderWidth: 1,
        borderColor: '#444',
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
    subServiceButton: {
        backgroundColor: '#A98C27',
        padding: 12,
        borderRadius: 8,
        marginTop: 10,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#444',
    },
    subServiceButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        marginLeft: 5,
    },
    subServiceItem: {
        backgroundColor: '#333',
        padding: 10,
        borderRadius: 8,
        marginBottom: 5,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: '#444',
        marginTop: 10,
    },
    subServiceTextContainer: {
        flex: 1,
        marginRight: 10,
    },
    subServiceItemText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    },
    subServiceDescriptionText: {
        color: '#ccc',
        fontSize: 12,
        marginTop: 2,
    },
    subServicePreviewImage: {
        width: 50,
        height: 50,
        borderRadius: 5,
        marginLeft: 10,
        resizeMode: 'cover',
    },
    subServiceActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
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
        backgroundColor: '#A98C27',
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