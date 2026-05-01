// src/screens/admin/modals/DealOptionsModal.js
import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons'; // Import Ionicons

const { width } = Dimensions.get('window');

// Fix: Provide a default value for isHidden in the prop destructuring
const DealOptionsModal = ({
  visible,
  onClose,
  onSelectOption,
  position,
  isHidden = false,
}) => {
  // <<< FIX: Added = false

  // Helper function to get the correct icon name and label for Hide/Unhide
  // const getHideUnhideOption = (isCurrentlyHidden) => {
  //     return {
  //         label: isCurrentlyHidden ? 'Show' : 'Hide', // Label changes based on current state
  //         value: 'hide', // The value remains 'hide' for the action
  //         icon: isCurrentlyHidden ? 'eye-outline' : 'eye-off-outline', // Icon changes based on current state
  //     };
  // };

  // Define options with their corresponding Ionicons names
  const options = [
    { label: 'View', value: 'view', icon: 'eye-outline' },
    { label: 'Edit', value: 'edit', icon: 'create-outline' },
    // Static Hide/Show option that maps to the 'hide' action
    { label: 'Hide/Show', value: 'hide', icon: 'eye-off-outline' },
    { label: 'Delete', value: 'delete', icon: 'trash-outline' },
  ];

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={optionsStyles.overlay}
        onPress={onClose}
        activeOpacity={1}
      >
        <View
          style={[
            optionsStyles.optionsContainer,
            { top: position.top, left: position.left },
          ]}
        >
          {options.map((option, index) => (
            <TouchableOpacity
              // The key is now safe because isHidden will always be a boolean
              key={
                option.value +
                (option.label === 'Show' || option.label === 'Hide'
                  ? isHidden.toString()
                  : '')
              }
              style={optionsStyles.optionItem}
              onPress={() => onSelectOption(option.value)}
            >
              <Ionicons
                name={option.icon} // Use the icon from the options array directly
                size={width * 0.02}
                color="#fff"
                style={optionsStyles.optionIcon}
              />
              <Text style={optionsStyles.optionText}>{option.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const optionsStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  optionsContainer: {
    position: 'absolute',
    backgroundColor: '#1E2021',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    minWidth: width * 0.25,
    paddingVertical: width * 0.005,
    borderWidth: 1,
    borderColor: '#3C3C3C',
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: width * 0.008,
    paddingHorizontal: width * 0.015,
  },
  optionIcon: {
    marginRight: width * 0.01,
  },
  optionText: {
    color: '#fff',
    fontSize: width * 0.021,
    fontWeight: '300',
  },
});

export default DealOptionsModal;
