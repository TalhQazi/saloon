  const requestImagePermission = async () => {
    try {
      if (Platform.OS !== 'android') return true;
      const sdk = Platform.Version || 0;
      if (sdk >= 33) {
        const granted = await PermissionsAndroid.request(
          'android.permission.READ_MEDIA_IMAGES',
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } else {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
    } catch (e) {
      return false;
    }
  };
// src/screens/Admin/adminScreens/modals/AddServiceModal.js

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
  Platform,
  PermissionsAndroid,
  ActivityIndicator,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';

// Helper function to get image source
const getServiceImageSource = image => {
  if (
    typeof image === 'string' &&
    (image.startsWith('http') ||
      image.startsWith('file://') ||
      image.startsWith('content://'))
  ) {
    return { uri: image };
  } else if (typeof image === 'number') {
    return image;
  }
  return null;
};

// Define initial state for dye services
const initialDyeServiceState = {
  commonImage: null,
  commonDescription: '',
  commonTime: '',
  types: [
    { name: 'Shoulder Length', price: '' },
    { name: 'Arm Length', price: '' },
    { name: 'Mid Length', price: '' },
    { name: 'Waist Length', price: '' },
  ],
};

const AddServiceModal = ({ visible, onClose, onSave, initialServiceData }) => {
  console.log(
    '🔍 AddServiceModal RENDERED with visible:',
    visible,
    'initialServiceData:',
    initialServiceData,
  );

  // State for main service details
  const [serviceName, setServiceName] = useState('');
  const [serviceImage, setServiceImage] = useState(null);
  const [subServices, setSubServices] = useState([]);

  // State for tab selection (Add Sub-Service or Dye)
  const [activeTab, setActiveTab] = useState('subservice');

  // State for current sub-service being added/edited (Normal Subservices)
  const [currentSubServiceId, setCurrentSubServiceId] = useState(null);
  const [currentSubServiceName, setCurrentSubServiceName] = useState('');
  const [currentPrice, setCurrentPrice] = useState('');
  const [currentTime, setCurrentTime] = useState('');
  const [currentDescription, setCurrentDescription] = useState('');
  const [currentSubServiceImage, setCurrentSubServiceImage] = useState(null);

  // State for Dye Services (common fields + price array)
  const [dyeServices, setDyeServices] = useState(() => JSON.parse(JSON.stringify(initialDyeServiceState)));
  const [dyeResetKey, setDyeResetKey] = useState(0);

  const [idCounter, setIdCounter] = useState(0);
  const [saving, setSaving] = useState(false);

  const generateUniqueId = () => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    const counter = idCounter;
    setIdCounter(prev => prev + 1);
    return `sub_${timestamp}_${random}_${counter}`;
  };

  const resetCurrentSubServiceFields = () => {
    console.log('🧹 Resetting normal subservice fields');
    setCurrentSubServiceId(null);
    setCurrentSubServiceName('');
    setCurrentPrice('');
    setCurrentTime('');
    setCurrentDescription('');
    setCurrentSubServiceImage(null);
  };

  const resetDyeServices = () => {
    console.log('🧹 Resetting dye services to initial state');
    setDyeServices(JSON.parse(JSON.stringify(initialDyeServiceState)));
    setDyeResetKey(prev => prev + 1);
  };

  useEffect(() => {
    console.log(
      '🔄 useEffect triggered - visible:',
      visible,
      'initialServiceData:',
      initialServiceData,
    );
    if (visible) {
      if (initialServiceData) {
        // EDIT MODE
        console.log('✏️ EDIT MODE - Loading existing service data');
        setServiceName(
          initialServiceData.serviceName || initialServiceData.title || '',
        );
        setServiceImage(
          initialServiceData.serviceImage || initialServiceData.image || null,
        );

        const normalizedSubServices = (
          initialServiceData.subServices || []
        ).map(sub => ({
          ...sub,
          id: sub.id || sub._id || generateUniqueId(),
          name: sub.name || sub.subServiceName || '',
          image: sub.image || sub.subServiceImage || null,
          type:
            sub.type ||
            (sub.prices && sub.prices.length > 0 ? 'dye' : 'subservice'),
          prices: sub.prices || null,
        }));
        console.log(
          '✏️ Normalized subServices for edit mode:',
          normalizedSubServices,
        );
        setSubServices(normalizedSubServices);
      } else {
        // ADD MODE
        console.log('➕ ADD MODE - Resetting all fields');
        setServiceName('');
        setServiceImage(null);
        setSubServices([]);
      }
      resetCurrentSubServiceFields();
      resetDyeServices();
      setActiveTab('subservice');
    }
  }, [visible, initialServiceData]);

  const pickImage = async type => {
    const hasPermission = await requestImagePermission();
    if (!hasPermission) {
      Alert.alert('Permission required', 'Storage permission is needed to pick images.');
      return;
    }
    const options = { mediaType: 'photo', quality: 0.7 };
    launchImageLibrary(options, response => {
      if (response.didCancel) {
        console.log('📸 User cancelled image picker');
      } else if (response.errorCode) {
        console.log('📸 ImagePicker Error: ', response.errorCode);
        Alert.alert('Error', 'Failed to pick image. Please try again.');
      } else if (response.assets && response.assets.length > 0) {
        const asset = response.assets[0];
        console.log('📸 Selected image for type:', type, 'URI:', asset.uri);
        if (type === 'service') {
          setServiceImage(asset.uri);
        } else {
          setCurrentSubServiceImage(asset.uri);
        }
      }
    });
  };

  const pickCommonDyeImage = async () => {
    const hasPermission = await requestImagePermission();
    if (!hasPermission) {
      Alert.alert('Permission required', 'Storage permission is needed to pick images.');
      return;
    }
    const options = { mediaType: 'photo', quality: 0.7 };
    launchImageLibrary(options, response => {
      if (response.didCancel) {
        console.log('📸 User cancelled dye image picker');
      } else if (response.errorCode) {
        console.log('📸 Dye ImagePicker Error: ', response.errorCode);
        Alert.alert('Error', 'Failed to pick image. Please try again.');
      } else if (response.assets && response.assets.length > 0) {
        const asset = response.assets[0];
        console.log('📸 Selected common dye image URI:', asset.uri);
        setDyeServices(prev => ({
          ...prev,
          commonImage: asset.uri,
        }));
      }
    });
  };

  const handleAddOrUpdateSubService = () => {
    console.log(
      '➕ handleAddOrUpdateSubService called - activeTab:',
      activeTab,
    );
    if (activeTab === 'subservice') {
      // Regular Sub-Service Logic
      if (
        !currentSubServiceName.trim() ||
        !currentPrice.trim() ||
        !currentTime.trim()
      ) {
        Alert.alert(
          'Missing Info',
          'Please fill in Sub Service Name, Price, and Time.',
        );
        return;
      }

      if (!currentSubServiceImage) {
        Alert.alert('Missing Info', 'Please add the picture.');
        return;
      }

      const newOrUpdatedSubService = {
        id: currentSubServiceId || generateUniqueId(),
        name: currentSubServiceName.trim(),
        price: parseFloat(currentPrice.trim()) || 0,
        time: currentTime.trim(),
        description: currentDescription.trim(),
        image: currentSubServiceImage,
        type: 'subservice',
      };

      console.log(
        '➕ Adding/Updating normal subservice:',
        newOrUpdatedSubService,
      );

      let updatedSubServices;
      if (currentSubServiceId) {
        updatedSubServices = subServices.map(sub =>
          sub.id === currentSubServiceId ? newOrUpdatedSubService : sub,
        );
      } else {
        updatedSubServices = [...subServices, newOrUpdatedSubService];
      }
      setSubServices(updatedSubServices);
      resetCurrentSubServiceFields();
    } else if (activeTab === 'dye') {
      // Validate dye service inputs
      const validPrices = dyeServices.types.filter(
        type =>
          type.price.trim() !== '' && !isNaN(parseFloat(type.price.trim())),
      );

      console.log('🎨 Dye service validation - validPrices:', validPrices);

      if (validPrices.length === 0) {
        Alert.alert('Missing Info', 'Please enter at least one valid price.');
        return;
      }

      if (!dyeServices.commonTime.trim()) {
        Alert.alert('Missing Info', 'Please fill in the Time.');
        return;
      }

      if (!dyeServices.commonImage) {
        Alert.alert('Missing Info', 'Please add the picture.');
        return;
      }

      // Create 4 separate subservices (one for each length)
      const newDyeSubServices = validPrices.map(type => ({
        id: generateUniqueId(),
        name: `Keratin-Extanso Botox (${type.name})`, // e.g., "Keratin-Extanso Botox (Shoulder Length)"
        price: parseFloat(type.price.trim()),
        time: dyeServices.commonTime.trim(),
        description: dyeServices.commonDescription.trim(),
        image: dyeServices.commonImage,
        type: 'dye', // We'll use this to identify dye services
        lengthType: type.name, // Store the length type
      }));

      const updatedSubServices = [...subServices, ...newDyeSubServices];
      setSubServices(updatedSubServices);
      resetDyeServices();

      Alert.alert('Success', 'Keratin-Extanso service added successfully!');
    }
  };

  const handleEditSubService = sub => {
    console.log('✏️ handleEditSubService called with sub:', sub);
    if (sub.type === 'dye') {
      Alert.alert(
        'Edit Dye Service',
        'To edit this service, please delete it and add again with updated details.',
        [{ text: 'OK' }],
      );
      return;
    }

    // Normal sub-service edit
    setCurrentSubServiceId(sub.id);
    setCurrentSubServiceName(sub.name || '');
    setCurrentPrice(sub.price ? sub.price.toString() : '');
    setCurrentTime(sub.time || '');
    setCurrentDescription(sub.description || '');
    setCurrentSubServiceImage(sub.image || null);
    setActiveTab('subservice');
  };

  const handleDeleteSubService = id => {
    console.log('🗑️ handleDeleteSubService called with id:', id);
    Alert.alert(
      'Delete Sub-service',
      'Are you sure you want to delete this sub-service?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          onPress: () => {
            const updatedSubServices = subServices.filter(sub => sub.id !== id);
            console.log(
              '🗑️ Updated subServices after delete:',
              updatedSubServices,
            );
            setSubServices(updatedSubServices);
            if (currentSubServiceId === id) {
              resetCurrentSubServiceFields();
            }
          },
          style: 'destructive',
        },
      ],
    );
  };

  const handleSave = () => {
    console.log('💾 handleSave called - preparing to save service');
    if (!serviceName.trim()) {
      Alert.alert('Missing Info', 'Please fill in Service Name.');
      return;
    }
    if (!serviceImage) {
      Alert.alert('Missing Info', 'Please select a Service Image.');
      return;
    }

    // Check for unsaved changes
    const hasUnsavedSubChanges =
      activeTab === 'subservice' &&
      (currentSubServiceName.trim() ||
        currentTime.trim() ||
        currentPrice.trim());

    const hasUnsavedDyeData =
      activeTab === 'dye' &&
      (dyeServices.types.some(type => type.price.trim() !== '') ||
        dyeServices.commonTime.trim());

    console.log(
      '💾 Unsaved changes check - hasUnsavedSubChanges:',
      hasUnsavedSubChanges,
      'hasUnsavedDyeData:',
      hasUnsavedDyeData,
    );

    if (hasUnsavedSubChanges || hasUnsavedDyeData) {
      Alert.alert(
        'Unsaved Changes',
        'You have unsaved details. Please click "Add Sub Service" / "Add Dye Service" first or clear the fields.',
        [{ text: 'OK' }],
      );
      return;
    }

    if (subServices.length === 0) {
      Alert.alert('Missing Info', 'Please add at least one sub-service.');
      return;
    }

    // Prepare data for backend (remove local 'id' property)
    const subServicesToSave = subServices.map(({ id, ...rest }) => {
      console.log(
        '📤 Mapping subservice for save - original:',
        { id, ...rest },
        'to save:',
        rest,
      );
      return rest;
    });

    const serviceToSave = {
      id: initialServiceData?.id,
      serviceName: serviceName.trim(),
      serviceImage: serviceImage,
      subServices: subServicesToSave,
      isHiddenFromEmployee: initialServiceData?.isHiddenFromEmployee || false,
    };

    console.log('📤 FINAL SERVICE DATA TO SAVE:', serviceToSave);
    setSaving(true);
    onSave(serviceToSave);
  };

  const renderSubServiceDisplay = sub => {
    console.log('📱 renderSubServiceDisplay called with sub:', sub);
    if (sub.type === 'dye' && sub.prices) {
      return `${sub.name} (${sub.prices.length} Prices) - ${sub.time}`;
    }
    return `${sub.name} - PKR ${sub.price || 0} - ${sub.time || 'N/A'}`;
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
              {initialServiceData ? 'Edit Service' : 'Add New Service'}
            </Text>

            {/* Service Details Section */}
            <Text style={styles.label}>Service Details</Text>
            <TextInput
              style={styles.input}
              placeholder="Service Name"
              placeholderTextColor="#999"
              value={serviceName}
              onChangeText={setServiceName}
            />
            <TouchableOpacity
              style={styles.imageBox}
              onPress={() => pickImage('service')}
            >
              {serviceImage ? (
                <Image
                  source={getServiceImageSource(serviceImage)}
                  style={styles.image}
                />
              ) : (
                <>
                  <Icon name="file-image" size={40} color="#999" />
                  <Text style={styles.imageText}>Browse Service Image</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Tab Buttons */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[
                  styles.tabButton,
                  activeTab === 'subservice' && styles.tabButtonActive,
                ]}
                onPress={() => {
                  console.log('탭 switched to: subservice');
                  setActiveTab('subservice');
                  resetCurrentSubServiceFields();
                }}
              >
                <Text
                  style={[
                    styles.tabButtonText,
                    activeTab === 'subservice' && styles.tabButtonTextActive,
                  ]}
                >
                  Add Sub-Service
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.tabButton,
                  activeTab === 'dye' && styles.tabButtonActive,
                ]}
                onPress={() => {
                  console.log('탭 switched to: dye');
                  setActiveTab('dye');
                  resetCurrentSubServiceFields();
                }}
              >
                <Text
                  style={[
                    styles.tabButtonText,
                    activeTab === 'dye' && styles.tabButtonTextActive,
                  ]}
                >
                  Keratin-Extensio
                </Text>
              </TouchableOpacity>
            </View>

            {/* List of existing sub-services */}
            <Text style={styles.label}>Added Sub-Services</Text>
            {subServices.length === 0 && (
              <Text style={styles.noSubServiceText}>
                No sub-services added yet.
              </Text>
            )}
            {subServices.map(sub => (
              <View key={sub.id} style={styles.subServiceItem}>
                <View style={styles.subServiceTextContainer}>
                  <Text style={styles.subServiceItemText}>
                    {renderSubServiceDisplay(sub)}
                  </Text>
                  {sub.type === 'dye' && (
                    <View style={styles.dyeBadgeContainer}>
                      <Text style={styles.dyeBadge}>Special Service</Text>
                    </View>
                  )}
                </View>
                {sub.image && (
                  <Image
                    source={getServiceImageSource(sub.image)}
                    style={styles.subServicePreviewImage}
                  />
                )}
                <View style={styles.subServiceActions}>
                  <TouchableOpacity onPress={() => handleEditSubService(sub)}>
                    <Ionicons
                      name="create-outline"
                      size={20}
                      color={sub.type === 'dye' ? '#999' : '#A98C27'}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDeleteSubService(sub.id)}
                  >
                    <Ionicons name="trash-outline" size={20} color="#FF6347" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            {/* Sub Service Input Section */}
            {activeTab === 'subservice' ? (
              <>
                <Text style={styles.label}>
                  {currentSubServiceId
                    ? 'Edit Sub-Service'
                    : 'Add New Sub-Service'}
                </Text>

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
                  style={[styles.input, styles.textArea]}
                  placeholder="Description"
                  placeholderTextColor="#999"
                  value={currentDescription}
                  onChangeText={setCurrentDescription}
                  multiline
                />
                <TouchableOpacity
                  style={styles.imageBox}
                  onPress={() => pickImage('sub')}
                >
                  {currentSubServiceImage ? (
                    <Image
                      source={getServiceImageSource(currentSubServiceImage)}
                      style={styles.image}
                    />
                  ) : (
                    <>
                      <Icon name="file-image" size={40} color="#999" />
                      <Text style={styles.imageText}>
                        Browse Sub-Service Image
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.subServiceButton}
                  onPress={handleAddOrUpdateSubService}
                >
                  <Ionicons
                    name={currentSubServiceId ? 'save-outline' : 'add'}
                    size={20}
                    color="#fff"
                  />
                  <Text style={styles.subServiceButtonText}>
                    {currentSubServiceId
                      ? 'Update Sub Service'
                      : 'Add Sub Service'}
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                {/* Dye Service Section */}
                <Text style={styles.label}>Add Keratin-Extensio Service</Text>
                <Text style={styles.dyeInstruction}>
                  Add prices for different hair lengths. Image, description, and
                  time are common for all lengths.
                </Text>

                {/* Common Fields */}
                <Text style={styles.dyeSectionTitle}>Common Details</Text>

                <TextInput
                  style={styles.input}
                  placeholder="Time (e.g., 2 hours)"
                  placeholderTextColor="#999"
                  value={dyeServices.commonTime}
                  onChangeText={text =>
                    setDyeServices(prev => ({
                      ...prev,
                      commonTime: text,
                    }))
                  }
                />

                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Description (common for all lengths)"
                  placeholderTextColor="#999"
                  value={dyeServices.commonDescription}
                  onChangeText={text =>
                    setDyeServices(prev => ({
                      ...prev,
                      commonDescription: text,
                    }))
                  }
                  multiline
                />

                <TouchableOpacity
                  style={styles.imageBox}
                  onPress={pickCommonDyeImage}
                >
                  {dyeServices.commonImage ? (
                    <Image
                      source={getServiceImageSource(dyeServices.commonImage)}
                      style={styles.image}
                    />
                  ) : (
                    <>
                      <Icon name="file-image" size={40} color="#999" />
                      <Text style={styles.imageText}>Browse Common Image</Text>
                    </>
                  )}
                </TouchableOpacity>

                {/* Price Fields for Each Length */}
                <Text style={styles.dyeSectionTitle}>
                  Length-wise Prices (PKR)
                </Text>

                {dyeServices.types.map((type, index) => (
                  <View key={`${type.name}-${index}-${dyeResetKey}`} style={styles.dyePriceRow}>
                    <Text style={styles.dyeLengthName}>{type.name}</Text>
                    <TextInput
                      style={[styles.input, styles.dyePriceInput]}
                      placeholder="Price"
                      placeholderTextColor="#999"
                      value={type.price}
                      onChangeText={text => {
                        const updatedTypes = [...dyeServices.types];
                        updatedTypes[index].price = text;
                        setDyeServices(prev => ({
                          ...prev,
                          types: updatedTypes,
                        }));
                        console.log(
                          `✏️ Updated price for ${type.name}: ${text}`,
                        );
                      }}
                      keyboardType="numeric"
                    />
                  </View>
                ))}

                <TouchableOpacity
                  style={styles.subServiceButton}
                  onPress={handleAddOrUpdateSubService}
                >
                  <Ionicons name="add" size={20} color="#fff" />
                  <Text style={styles.subServiceButtonText}>
                    Add Keratin-Extensio Service
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {/* Action Buttons */}
            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
                {saving ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <Text style={styles.saveButtonText}>
                    {initialServiceData ? 'Update Service' : 'Save Service'}
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

export default AddServiceModal;

// ... (Your existing styles remain exactly the same)
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '60%',
    maxWidth: 500,
    borderWidth: 1,
    borderColor: '#000000ff',
    borderRadius: 10,
    backgroundColor: '#1E2021',
    padding: 20,
    maxHeight: '90%',
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
    fontWeight: 'bold',
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
  textArea: {
    height: 80,
    textAlignVertical: 'top',
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
  tabContainer: {
    flexDirection: 'row',
    marginTop: 15,
    marginBottom: 10,
    gap: 10,
  },
  tabButton: {
    flex: 1,
    backgroundColor: '#2c2c2c',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#444',
  },
  tabButtonActive: {
    backgroundColor: '#A98C27',
    borderColor: '#A98C27',
  },
  tabButtonText: {
    color: '#999',
    fontWeight: 'bold',
    fontSize: 14,
  },
  tabButtonTextActive: {
    color: '#fff',
  },
  dyeInstruction: {
    color: '#888',
    fontSize: 12,
    marginBottom: 15,
    fontStyle: 'italic',
  },
  dyeSectionTitle: {
    color: '#A98C27',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  dyePriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  dyeLengthName: {
    color: '#A9A9A9',
    fontSize: 14,
    fontWeight: 'bold',
    width: 120,
  },
  dyePriceInput: {
    flex: 1,
    marginBottom: 0,
  },
  subServiceButton: {
    backgroundColor: '#A98C27',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  subServiceButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 5,
  },
  noSubServiceText: {
    color: '#888',
    textAlign: 'center',
    marginVertical: 10,
  },
  subServiceItem: {
    backgroundColor: '#333',
    padding: 10,
    borderRadius: 8,
    marginBottom: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  dyeBadgeContainer: {
    marginTop: 3,
  },
  dyeBadge: {
    backgroundColor: '#A98C2720',
    color: '#A98C27',
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
    alignSelf: 'flex-start',
  },
  subServicePreviewImage: {
    width: 40,
    height: 40,
    borderRadius: 5,
  },
  subServiceActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
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
    color: '#fff',
    fontWeight: 'bold',
  },
});
