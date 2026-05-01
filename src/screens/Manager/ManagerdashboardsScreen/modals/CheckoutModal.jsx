import React from 'react';
import {
  Modal,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  PixelRatio,
  Dimensions,
} from 'react-native';
// Dimensions and Scaling for Tablet
const { width } = Dimensions.get('window');
const scale = width / 1280;
const normalize = size =>
  Math.round(PixelRatio.roundToNearestPixel(size * scale));
const CheckoutModal = ({
  isVisible,
  onClose,
  subtotal,
  gst,
  discount,
  servicesCount,
  beautician,
  onConfirmOrder,
}) => {
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <Text style={styles.modalTitle}>Confirm Order</Text>
          {/* Price and Service Info */}
          <View style={styles.infoSection}>
            <View style={styles.modalInputContainer}>
              <Text style={styles.inputLabel}>Actual Price</Text>
              <TextInput
                style={styles.inputField}
                value={`PKR ${subtotal.toFixed(2)}`}
                editable={false}
              />
            </View>
            <View style={styles.modalInputContainer}>
              <Text style={styles.inputLabel}>Discount</Text>
              <TextInput
                style={styles.inputField}
                value={`PKR ${(discount || 0).toFixed(2)}`}
                editable={false}
              />
            </View>
            {/* <View style={styles.modalInputContainer}>
              <Text style={styles.inputLabel}>Beautician</Text>
              <TextInput
                style={styles.inputField}
                value={beautician || '-'}
                editable={false}
              />
            </View> */}
          </View>
          {/* Total Section */}
          <View style={styles.totalSection}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalAmount}>
              PKR {(subtotal + gst - (discount || 0)).toFixed(2)}
            </Text>
          </View>
          {/* Buttons */}
          <View style={styles.modalButtonRow}>
            <TouchableOpacity
              style={[styles.modalButton, styles.closeButton]}
              onPress={onClose}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.addToCartButton]}
              onPress={() => {
                console.log('🛒 Add to Cart button pressed!');
                // Call the new prop to confirm the order and open the print bill modal
                if (onConfirmOrder) {
                  console.log('✅ Calling onConfirmOrder...');
                  onConfirmOrder();
                } else {
                  console.log('❌ onConfirmOrder is not defined!');
                }
                onClose(); // Close this modal after confirming
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.addToCartButtonText}>Confirm Order</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  modalView: {
    backgroundColor: '#161719',
    borderRadius: normalize(20),
    padding: normalize(50),
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 10,
    width: '95%',
    maxWidth: normalize(700),
    minHeight: normalize(450),
  },
  modalTitle: {
    fontSize: normalize(42),
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: normalize(35),
  },
  infoSection: {
    width: '100%',
    borderRadius: normalize(10),
    padding: normalize(20),
    marginBottom: normalize(25),
  },
  modalInputContainer: {
    marginBottom: normalize(25),
  },
  totalSection: {
    width: '100%',
    backgroundColor: '#2A2D32',
    borderRadius: normalize(10),
    padding: normalize(20),
    marginVertical: normalize(20),
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: normalize(24),
    color: '#888',
    marginBottom: normalize(10),
  },
  totalAmount: {
    fontSize: normalize(36),
    fontWeight: 'bold',
    color: '#FFD700',
  },
  inputLabel: {
    fontSize: normalize(25),
    color: '#888',
    marginBottom: normalize(8),
  },
  inputField: {
    backgroundColor: '#424449ff',
    borderRadius: normalize(8),
    paddingHorizontal: normalize(19),
    paddingVertical: normalize(5),
    height: normalize(80),
    color: '#fff',
    fontSize: normalize(25),
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: normalize(10),
  },
  infoLabel: {
    fontSize: normalize(20),
    color: '#888',
  },
  infoValue: {
    fontSize: normalize(25),
    color: '#fff',
    fontWeight: 'bold',
  },
  modalButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: normalize(30),
  },
  modalButton: {
    flex: 1,
    paddingVertical: normalize(18),
    paddingHorizontal: normalize(25),
    borderRadius: normalize(10),
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: normalize(8),
    minHeight: normalize(60),
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  closeButton: {
    backgroundColor: '#666666',
    borderWidth: 1,
    borderColor: '#888888',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: normalize(16),
    fontWeight: '600',
  },
  addToCartButton: {
    backgroundColor: '#A98C27',
  },
  addToCartButtonText: {
    color: '#FFFFFF',
    fontSize: normalize(20),
    fontWeight: 'bold',
  },
});
export default CheckoutModal;
