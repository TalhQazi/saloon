// src/screens/Admin/AdminScreens/admindashboardscreen/modals/ViewExpenseModal.jsx

import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  TouchableWithoutFeedback,
  Image,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const { width, height } = Dimensions.get('window');

// 🌟 DUMMY IMAGE IMPORT FOR DEMONSTRATION 🌟
const dummyScreenshotImage = require('../../../../assets/images/ss.jpg');

const ViewExpenseModal = ({ isVisible, onClose, expenseDetails }) => {
  // Correctly destructure all necessary properties, including image
  const {
    name = 'N/A',
    amount = 'N/A',
    description = 'N/A',
    date = 'N/A',
    image = null, // Ensure image property is destructured
  } = expenseDetails || {};

  // Determine the image source based on its type and presence
  let imageSource = null;

  if (image) {
    if (
      typeof image === 'string' &&
      (image.startsWith('http') ||
        image.startsWith('file') ||
        image.startsWith('data'))
    ) {
      // String URL or data URI
      imageSource = { uri: image };
    } else if (typeof image === 'number') {
      // Local asset (require)
      imageSource = image;
    } else if (typeof image === 'object' && image.uri) {
      // Already a valid source object: { uri: '...' }
      imageSource = image;
    }
  }

  if (!imageSource) {
    // Fallback to a placeholder if no valid image is available
    imageSource = dummyScreenshotImage;
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
                <Text style={styles.modalTitle}>Expense Details</Text>
                <TouchableOpacity onPress={onClose}>
                  <Ionicons
                    name="close-circle-outline"
                    size={width * 0.025}
                    color="#fff"
                  />
                </TouchableOpacity>
              </View>

              {/* 🌟 IMAGE SECTION MOVED TO TOP 🌟 */}
              {imageSource && (
                <View style={styles.imageContainer}>
                  <Image
                    source={imageSource}
                    style={styles.detailImage}
                    resizeMode="contain"
                  />
                </View>
              )}

              {/* Details Section */}
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Name</Text>
                <Text style={styles.detailValue}>{name}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Amount</Text>
                <Text style={styles.detailValue}>{amount}</Text>
              </View>
              <View style={styles.noteRow}>
                <Text style={styles.detailLabel}>Description</Text>
                <Text style={styles.noteValue}>{description}</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalContent: {
    width: width * 0.5, // Adjusted width
    backgroundColor: '#1E1E1E',
    borderRadius: 10,
    padding: width * 0.05,
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
    alignItems: 'center',
    marginBottom: height * 0.02,
  },
  detailImage: {
    width: '80%',
    height: height * 0.2,
    borderRadius: 8,
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
    marginRight: width * 0.07,
    paddingHorizontal: width * 0.1,
    borderRadius: 8,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: width * 0.016,
    fontWeight: '600',
  },
});

export default ViewExpenseModal;
