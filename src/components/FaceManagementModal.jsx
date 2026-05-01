// Face Management Modal Component
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  Image,
  Alert,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import useFaceRecognition from '../hooks/useFaceRecognition';

const { width, height } = Dimensions.get('window');

const FaceManagementModal = ({ visible, onClose, onFaceDeleted }) => {
  const {
    isLoading,
    error,
    lastResult,
    listRegisteredFaces,
    deleteEmployeeFace,
    getCollectionInfo,
    clearError,
  } = useFaceRecognition();

  const [faces, setFaces] = useState([]);
  const [collectionInfo, setCollectionInfo] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Load faces when modal opens
  useEffect(() => {
    if (visible) {
      loadFaces();
      loadCollectionInfo();
    }
  }, [visible]);

  const loadFaces = async () => {
    try {
      setRefreshing(true);
      const result = await listRegisteredFaces();
      if (result.success) {
        setFaces(result.faces || []);
      }
    } catch (error) {
      console.error('Failed to load faces:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const loadCollectionInfo = async () => {
    try {
      const result = await getCollectionInfo();
      if (result.success) {
        setCollectionInfo(result.collection);
      }
    } catch (error) {
      console.error('Failed to load collection info:', error);
    }
  };

  const handleDeleteFace = (faceId, externalImageId) => {
    Alert.alert(
      'Delete Face',
      `Are you sure you want to delete the face for ${
        externalImageId || 'this employee'
      }?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await deleteEmployeeFace(faceId);
              if (result.success) {
                Alert.alert('Success', 'Face deleted successfully');
                loadFaces(); // Reload the list
                if (onFaceDeleted) {
                  onFaceDeleted(faceId);
                }
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to delete face: ' + error.message);
            }
          },
        },
      ],
    );
  };

  const renderFaceItem = ({ item }) => (
    <View style={styles.faceItem}>
      <View style={styles.faceInfo}>
        <Text style={styles.employeeId}>
          Employee ID: {item.ExternalImageId || 'Unknown'}
        </Text>
        <Text style={styles.faceId}>Face ID: {item.FaceId}</Text>
        <Text style={styles.confidence}>
          Confidence: {item.Confidence?.toFixed(2) || 'N/A'}%
        </Text>
      </View>

      <View style={styles.faceActions}>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteFace(item.FaceId, item.ExternalImageId)}
        >
          <Ionicons name="trash-outline" size={20} color="#ff4444" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="face-outline" size={60} color="#A9A9A9" />
      <Text style={styles.emptyStateText}>No faces registered yet</Text>
      <Text style={styles.emptyStateSubtext}>
        Register employee faces to get started with face recognition
      </Text>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Face Management</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close-circle-outline" size={24} color="#A9A9A9" />
            </TouchableOpacity>
          </View>

          {/* Collection Info */}
          {collectionInfo && (
            <View style={styles.collectionInfo}>
              <Text style={styles.collectionInfoText}>
                Collection: {collectionInfo.CollectionId}
              </Text>
              <Text style={styles.collectionInfoText}>
                Face Count: {collectionInfo.FaceCount || 0}
              </Text>
              <Text style={styles.collectionInfoText}>
                Created:{' '}
                {new Date(
                  collectionInfo.CreationTimestamp * 1000,
                ).toLocaleDateString()}
              </Text>
            </View>
          )}

          {/* Refresh Button */}
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={loadFaces}
            disabled={refreshing}
          >
            <Ionicons
              name="refresh"
              size={20}
              color="#fff"
              style={refreshing && styles.rotating}
            />
            <Text style={styles.refreshButtonText}>
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Text>
          </TouchableOpacity>

          {/* Error Display */}
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity
                onPress={clearError}
                style={styles.clearErrorButton}
              >
                <Text style={styles.clearErrorButtonText}>Clear</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Faces List */}
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#A98C27" />
              <Text style={styles.loadingText}>Loading faces...</Text>
            </View>
          ) : (
            <FlatList
              data={faces}
              renderItem={renderFaceItem}
              keyExtractor={item => item.FaceId}
              style={styles.facesList}
              contentContainerStyle={
                faces.length === 0 && styles.emptyListContainer
              }
              ListEmptyComponent={renderEmptyState}
              refreshing={refreshing}
              onRefresh={loadFaces}
            />
          )}

          {/* Footer */}
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.closeModalButton} onPress={onClose}>
              <Text style={styles.closeModalButtonText}>Close</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    width: '90%',
    maxWidth: 600,
    maxHeight: '80%',
    backgroundColor: '#1F1F1F',
    borderRadius: 15,
    padding: 20,
    elevation: 15,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  closeButton: {
    padding: 5,
  },
  collectionInfo: {
    backgroundColor: '#2A2D32',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  collectionInfoText: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 5,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#A98C27',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    marginBottom: 20,
  },
  refreshButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  rotating: {
    transform: [{ rotate: '360deg' }],
  },
  errorContainer: {
    backgroundColor: '#ff4444',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorText: {
    color: '#fff',
    flex: 1,
    marginRight: 10,
  },
  clearErrorButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 15,
  },
  clearErrorButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 16,
  },
  facesList: {
    flex: 1,
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  faceItem: {
    flexDirection: 'row',
    backgroundColor: '#2A2D32',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    alignItems: 'center',
  },
  faceInfo: {
    flex: 1,
  },
  employeeId: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  faceId: {
    color: '#A9A9A9',
    fontSize: 12,
    marginBottom: 3,
  },
  confidence: {
    color: '#A9A9A9',
    fontSize: 12,
  },
  faceActions: {
    marginLeft: 15,
  },
  deleteButton: {
    padding: 10,
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    borderRadius: 20,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyStateText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    color: '#A9A9A9',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  modalFooter: {
    marginTop: 20,
    alignItems: 'center',
  },
  closeModalButton: {
    backgroundColor: '#2A2D32',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
  },
  closeModalButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default FaceManagementModal;

