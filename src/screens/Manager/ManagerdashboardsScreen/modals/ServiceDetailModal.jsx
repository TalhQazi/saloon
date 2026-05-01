// src/screens/admin/modals/ServiceDetailModal.js
import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Dimensions } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'; // For close icon

const { width, height } = Dimensions.get('window');

const ServiceDetailModal = ({ visible, onClose, service }) => {
  if (!service) {
    return null; // Don't render if no service data is provided
  }

  // Determine if the image source is a local asset or a URI
  const serviceImageSource = typeof service.image === 'string' ? { uri: service.image } : service.image;

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <TouchableOpacity style={styles.closeIcon} onPress={onClose}>
            <Icon name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <ScrollView contentContainerStyle={styles.scroll}>
            <Text style={styles.heading}>Service Details</Text>

            {service.image && (
              <Image source={serviceImageSource} style={styles.serviceImage} resizeMode="cover" />
            )}
            <Text style={styles.detailLabel}>Service Name:</Text>
            <Text style={styles.detailText}>{service.name}</Text>

            {service.subServices && service.subServices.length > 0 && (
              <View>
                <Text style={styles.detailLabel}>Sub Services:</Text>
                {service.subServices.map((sub, index) => (
                  <View key={index} style={styles.subServiceItem}>
                    {sub.subServiceImage && (
                      <Image source={{ uri: sub.subServiceImage }} style={styles.subServiceImage} resizeMode="cover" />
                    )}
                    <View style={styles.subServiceTextContainer}>
                      <Text style={styles.subServiceText}>Name: {sub.subServiceName}</Text>
                      <Text style={styles.subServiceText}>Price: ${sub.price}</Text>
                      <Text style={styles.subServiceText}>Time: {sub.time}</Text>
                      {sub.description && <Text style={styles.subServiceText}>Description: {sub.description}</Text>}
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Display other details if they are part of your service object */}
            {/* For example, if you add 'price' and 'time' directly to the main service */}
            {/* <Text style={styles.detailLabel}>Price:</Text>
            <Text style={styles.detailText}>${service.price}</Text>
            <Text style={styles.detailLabel}>Time:</Text>
            <Text style={styles.detailText}>{service.time}</Text>
            <Text style={styles.detailLabel}>Description:</Text>
            <Text style={styles.detailText}>{service.description}</Text> */}

            {service.isHiddenFromEmployee && (
              <Text style={styles.hiddenStatusText}>This service is currently hidden from employees.</Text>
            )}

          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export default ServiceDetailModal;

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
  serviceImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 15,
    resizeMode: 'cover',
  },
  detailLabel: {
    color: '#bbb',
    fontSize: 16,
    marginTop: 10,
    marginBottom: 5,
    fontWeight: 'bold',
  },
  detailText: {
    color: '#fff',
    fontSize: 18,
    marginBottom: 10,
  },
  subServiceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2c2c2c',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  subServiceImage: {
    width: 60,
    height: 60,
    borderRadius: 5,
    marginRight: 10,
  },
  subServiceTextContainer: {
    flex: 1,
  },
  subServiceText: {
    color: '#fff',
    fontSize: 14,
  },
  hiddenStatusText: {
    color: '#FFD700', // Gold color for warning
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 20,
    textAlign: 'center',
  },
});
