import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'; // For View, Edit, Delete icons
import Ionicons from 'react-native-vector-icons/Ionicons'; // For Hide icon

const { width, height } = Dimensions.get('window');

const ProductOptionsModal = ({
  visible,
  onClose,
  onSelectOption,
  position,
}) => {
  // Default position if not provided, though it will be calculated in ServicesScreen
  const modalPosition = position || { top: 0, left: 0 };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade" // A subtle fade animation for a small modal
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View
          style={[
            styles.modalContainer,
            { top: modalPosition.top, left: modalPosition.left },
          ]}
          onStartShouldSetResponder={() => true} // Prevents closing when tapping inside the modal
        >
          {/* View Option */}
          <TouchableOpacity
            style={styles.optionItem}
            onPress={() => {
              onSelectOption('view');
              onClose();
            }}
          >
            <Icon
              name="eye-outline"
              size={width * 0.02}
              color="#fff"
              style={styles.optionIcon}
            />
            <Text style={styles.optionText}>View</Text>
          </TouchableOpacity>
          {/* Edit Option */}
          <TouchableOpacity
            style={styles.optionItem}
            onPress={() => {
              onSelectOption('edit');
              onClose();
            }}
          >
            <Icon
              name="pencil-outline"
              size={width * 0.02}
              color="#fff"
              style={styles.optionIcon}
            />
            <Text style={styles.optionText}>Edit</Text>
          </TouchableOpacity>
          {/* Delete Option */}
          <TouchableOpacity
            style={styles.optionItem}
            onPress={() => {
              onSelectOption('delete');
              onClose();
            }}
          >
            <Icon
              name="delete-outline"
              size={width * 0.02}
              color="#fff"
              style={styles.optionIcon}
            />
            <Text style={styles.optionText}>Delete</Text>
          </TouchableOpacity>
          {/* Hide from employee side Option */}
          <TouchableOpacity
            style={styles.optionItem}
            onPress={() => {
              onSelectOption('hide');
              onClose();
            }}
          >
            <Ionicons
              name="eye-off-outline"
              size={width * 0.02}
              color="#fff"
              style={styles.optionIcon}
            />
            <Text style={styles.optionText}>Hide/Show</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

export default ProductOptionsModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.1)', // Very light overlay to simulate a slight blur/dim
    justifyContent: 'flex-start', // Align to top-left for absolute positioning
    alignItems: 'flex-start',
  },
  modalContainer: {
    backgroundColor: '#3C3C3C', // Dark background like your cards
    borderRadius: 8,
    paddingVertical: height * 0.01,
    paddingHorizontal: width * 0.01,
    position: 'absolute', // Absolute positioning to place it near the tapped card
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8, // For Android shadow
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: height * 0.01,
    paddingHorizontal: width * 0.015,
    borderRadius: 5,
  },
  optionIcon: {
    marginRight: width * 0.01,
  },
  optionText: {
    color: '#fff',
    fontSize: width * 0.018, // Slightly smaller font for options
    fontWeight: '500',
  },
});
