// src/screens/admin/AdminScreens/admindashboardscreen/SubServicesScreen.js

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  PixelRatio,
  ActivityIndicator,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useUser } from '../../../../context/UserContext';
import Sidebar from '../../../../components/Sidebar';
import { useNavigation, useRoute } from '@react-navigation/native';
import { getAdminToken } from '../../../../utils/authUtils';
import { addAdminCartItem } from '../../../../utils/adminCart';
import { updateService } from '../../../../api';
import AddSubServiceModal from './modals/AddSubServiceModal';

// Import placeholder images
import userProfileImage from '../../../../assets/images/kit.jpeg';
import womanBluntCutImage from '../../../../assets/images/coconut.jpeg';
import bobLobCutImage from '../../../../assets/images/growth.jpeg';
import mediumLengthLayerImage from '../../../../assets/images/onion.jpeg';
import vShapedCutImage from '../../../../assets/images/oil.jpeg';
import layerCutImage from '../../../../assets/images/growth.jpeg';
import haircutImage from '../../../../assets/images/makeup.jpeg';
import manicureImage from '../../../../assets/images/hair.jpeg';
import pedicureImage from '../../../../assets/images/product.jpeg';
import hairColoringImage from '../../../../assets/images/eyeshadow.jpeg';

const { width, height } = Dimensions.get('window');

const scale = width / 1280;
const normalize = size =>
  Math.round(PixelRatio.roundToNearestPixel(size * scale));

// Helper function to get image source
const getDisplayImageSource = image => {
  if (
    typeof image === 'string' &&
    (image.startsWith('http://') || image.startsWith('https://'))
  ) {
    return { uri: image };
  }

  if (typeof image === 'string' && image.startsWith('file://')) {
    return { uri: image };
  }

  if (typeof image === 'number') {
    return image;
  }

  if (!image || image === '') {
    return null;
  }

  return null;
};

// Get placeholder image based on service name
const getServiceDetailImage = serviceDetailName => {
  switch (serviceDetailName) {
    case 'Standard Haircut':
      return womanBluntCutImage;
    case 'Layered Cut':
      return layerCutImage;
    case 'Kids Haircut':
      return bobLobCutImage;
    case 'Classic Manicure':
      return mediumLengthLayerImage;
    case 'Gel Manicure':
      return vShapedCutImage;
    case 'French Manicure':
      return womanBluntCutImage;
    case 'Spa Pedicure':
      return bobLobCutImage;
    case 'Express Pedicure':
      return mediumLengthLayerImage;
    case 'Full Color':
      return vShapedCutImage;
    case 'Highlights':
      return layerCutImage;
    case 'Root Touch-up':
      return womanBluntCutImage;
    default:
      return userProfileImage;
  }
};

// **********************************************************
// ************ DYE SERVICE GROUP CARD COMPONENT **************
// **********************************************************

const DyeServiceGroupCard = ({
  serviceDetails,
  onOptionsPress,
  onAddPress,
}) => {
  console.log(
    '🎨 DyeServiceGroupCard RENDERED with serviceDetails:',
    serviceDetails,
  );

  // Extract common details (they should be the same for all 4)
  const firstService = serviceDetails[0];
  const detailName =
    firstService?.name?.replace(/\s*\(.*?\)/, '') || 'Keratin-Extanso Botox'; // Remove "(Shoulder Length)" etc.
  const imageSource =
    getDisplayImageSource(firstService?.image) ||
    getServiceDetailImage(detailName) ||
    userProfileImage;

  // Create prices array from all 4 services
  const prices = serviceDetails.map(service => {
    // Extract length type from name (e.g., "Keratin-Extanso Botox (Shoulder Length)" -> "Shoulder Length")
    const match = service.name.match(/\(([^)]+)\)/);
    const lengthType = match ? match[1] : 'Unknown';
    return {
      lengthType,
      price: service.price,
      id: service.id, // Store ID for edit/delete
    };
  });

  return (
    <View style={styles.dyeGroupCard}>
      {/* Left: Big Image */}
      <View style={styles.imageContainer}>
        <Image source={imageSource} style={styles.bigImage} />
      </View>

      {/* Right: Title and Price Buttons */}
      <View style={styles.detailsContainer}>
        {/* Title */}
        <Text style={styles.groupTitle}>{detailName}</Text>

        {/* Price Buttons */}
        <View style={styles.priceButtonsContainer}>
          {prices.map((priceItem, index) => (
            <TouchableOpacity
              key={index}
              style={styles.priceButton}
              onPress={() => {
                console.log('🛒 ADD TO CART clicked for:', priceItem);
                onAddPress({
                  ...firstService, // Use first service as base
                  selectedLength: priceItem.lengthType,
                  price: priceItem.price,
                  id: priceItem.id, // Pass ID for cart
                });
              }}
            >
              <Text style={styles.priceButtonText}>
                {priceItem.lengthType} — {priceItem.price}PKR/-
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Edit/Delete Actions */}
        {/* <View style={styles.actionsContainer}>
          <TouchableOpacity
            onPress={() => {
              // Open edit modal for the first service (you can customize this)
              onOptionsPress('edit', firstService);
            }}
            style={styles.actionButton}
          >
            <Ionicons
              name="create-outline"
              size={normalize(20)}
              color="#FFD700"
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              // Delete all 4 services
              Alert.alert(
                'Delete Dye Service',
                'Are you sure you want to delete all 4 lengths of this service?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                      serviceDetails.forEach(service => {
                        onOptionsPress('delete', service);
                      });
                    },
                  },
                ],
              );
            }}
            style={styles.actionButton}
          >
            <Ionicons
              name="trash-outline"
              size={normalize(20)}
              color="#FFD700"
            />
          </TouchableOpacity>
        </View> */}
      </View>
    </View>
  );
};

// **********************************************************
// ************ REGULAR SERVICE CARD COMPONENT **************
// **********************************************************

const ServiceDetailCard = ({ serviceDetail, onOptionsPress, onAddPress }) => {
  console.log(
    '🧾 ServiceDetailCard RENDERED with serviceDetail:',
    serviceDetail,
  );

  const detailName =
    serviceDetail?.name || serviceDetail?.subServiceName || 'N/A';
  const detailPrice =
    serviceDetail?.price != null ? String(serviceDetail.price) : 'N/A';
  const detailTime = serviceDetail?.time || serviceDetail?.duration || '';
  const detailDescription = serviceDetail?.description || '';

  // Get image source with proper fallback logic (similar to ProductDetailCard)
  let imageSource = null;

  if (serviceDetail?.image || serviceDetail?.subServiceImage) {
    const img = serviceDetail.image || serviceDetail.subServiceImage;
    imageSource = getDisplayImageSource(img);
  }

  if (!imageSource) {
    imageSource = getServiceDetailImage(detailName);
  }

  if (!imageSource) {
    imageSource = userProfileImage;
  }

  return (
    <View style={styles.cardContainer}>
      <TouchableOpacity
        style={styles.imageWrapper}
        activeOpacity={0.8}
        onPress={() => onAddPress(serviceDetail)}
      >
        <Image source={imageSource} style={styles.cardImage} />
      </TouchableOpacity>
      <View style={styles.cardInfo}>
        <View style={styles.infoRow}>
          <View style={styles.infoColumnLeft}>
            <Text
              style={styles.serviceNameText}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {detailName}
            </Text>
            <Text
              style={styles.cardPrice}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {`PKR ${detailPrice}`}
            </Text>
            {detailTime ? (
              <Text
                style={styles.timeText}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {detailTime}
              </Text>
            ) : null}
          </View>
          <View style={styles.infoColumnRight}>
            {detailDescription ? (
              <Text
                style={styles.cardDescription}
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                {detailDescription}
              </Text>
            ) : null}
          </View>
        </View>
      </View>
      <View style={styles.cardActions}>
        <TouchableOpacity
          onPress={() => onOptionsPress('edit', serviceDetail)}
          style={styles.iconButton}
        >
          <Ionicons
            name="create-outline"
            size={normalize(44)}
            color="#FFD700"
          />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => onOptionsPress('delete', serviceDetail)}
          style={styles.iconButton}
        >
          <Ionicons name="trash-outline" size={normalize(44)} color="#FFD700" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

// **********************************************************
// ************ MAIN SCREEN COMPONENT ***********************
// **********************************************************

const SubServicesScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { userName } = useUser();

  const service = route.params?.service || {};

  const [addModalVisible, setAddModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedServiceDetail, setSelectedServiceDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [serviceDetails, setServiceDetails] = useState(
    service.subServices || [],
  );

  useEffect(() => {
    const subServices = service.subServices || [];
    console.log('📥 useEffect: Received service.subServices:', subServices);
    setServiceDetails(subServices);
  }, [service.subServices]);

  // Save to backend
  const saveServiceDetailsToBackend = async updatedServiceDetails => {
    console.log(
      '📤 Saving to backend - updatedServiceDetails:',
      updatedServiceDetails,
    );
    const serviceId = service._id || service.id;

    if (!serviceId) {
      Alert.alert('Error', 'Service ID not found. Cannot save changes.');
      return;
    }

    setLoading(true);
    try {
      const token = await getAdminToken();
      if (!token) {
        Alert.alert(
          'Error',
          'Authentication token not found. Please login again.',
        );
        return;
      }
      const serviceData = {
        title: service.name || service.title || service.serviceName,
        image: service.image,
        subServices: updatedServiceDetails.map(detail => {
          // 🔍 Check if this is a dye service (more robust check)
          const isDyeService =
            detail.type === 'dye' ||
            (detail.prices &&
              Array.isArray(detail.prices) &&
              detail.prices.length > 0);

          console.log(
            '📤 Mapping subservice - detail:',
            detail,
            'isDyeService:',
            isDyeService,
          );

          // ✅ Ensure we ALWAYS send type and prices for dye services
          const subserviceToSave = {
            name: detail.name || detail.subServiceName,
            price: isDyeService ? 0 : parseFloat(detail.price) || 0,
            time: detail.time,
            description: detail.description,
            image: detail.image || detail.subServiceImage,
          };

          // 🔑 CRITICAL: Always include type and prices if it's a dye service
          if (isDyeService) {
            subserviceToSave.type = 'dye';
            subserviceToSave.prices = detail.prices || [];
            console.log('📤 FORCE SENDING dye service data:', subserviceToSave);
          }

          return subserviceToSave;
        }),
      };

      await updateService(serviceId, serviceData, token);
      Alert.alert('Success', 'Service details updated successfully!');
      setServiceDetails(updatedServiceDetails);
    } catch (error) {
      console.error('Error saving service details:', error);
      Alert.alert('Error', error.message || 'Failed to save service details.');
    } finally {
      setLoading(false);
    }
  };

  // Handle options (edit/delete)
  const handleOptionSelect = (option, serviceDetail) => {
    console.log(
      '⚙️ handleOptionSelect called with option:',
      option,
      'serviceDetail:',
      serviceDetail,
    );
    setSelectedServiceDetail(serviceDetail);

    if (option === 'edit') {
      // Check if it's a dye service
      const isDyeService =
        serviceDetail?.type === 'dye' ||
        (serviceDetail?.prices &&
          Array.isArray(serviceDetail.prices) &&
          serviceDetail.prices.length > 0);

      console.log('⚙️ Edit check - isDyeService:', isDyeService);

      if (isDyeService) {
        Alert.alert(
          'Edit Dye Service',
          'To edit this service, please delete it and add again with updated details.',
          [{ text: 'OK' }],
        );
        return;
      }

      setIsEditing(true);
      setAddModalVisible(true);
    } else if (option === 'delete') {
      Alert.alert(
        'Confirm Deletion',
        `Are you sure you want to delete "${
          serviceDetail?.name ||
          serviceDetail?.subServiceName ||
          'this service detail'
        }"?`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => handleDeleteServiceDetail(serviceDetail),
          },
        ],
        { cancelable: true },
      );
    }
  };

  // Handle delete
  const handleDeleteServiceDetail = serviceDetailToDelete => {
    console.log('🗑️ Deleting serviceDetail:', serviceDetailToDelete);
    const targetId = serviceDetailToDelete._id || serviceDetailToDelete.id;
    const targetName =
      serviceDetailToDelete.name || serviceDetailToDelete.subServiceName;

    if (!targetId && !targetName) {
      Alert.alert('Error', 'Cannot delete item: No valid identifier found');
      return;
    }

    const updatedServiceDetails = serviceDetails.filter(detail => {
      const detailId = detail._id || detail.id;
      const detailName = detail.name || detail.subServiceName;

      if (targetId) {
        return detailId !== targetId;
      }
      return detailName !== targetName;
    });

    saveServiceDetailsToBackend(updatedServiceDetails);
  };

  // Handle add to cart (admin universal cart)
  const handleAddPress = async serviceDetail => {
    console.log('🛒 handleAddPress called with serviceDetail:', serviceDetail);
    await addAdminCartItem({
      ...serviceDetail,
      type: 'service',
    });
    Alert.alert('Added to Cart', 'Service has been added to the cart.', [
      {
        text: 'OK',
        onPress: () => navigation.goBack(),
      },
    ]);
  };

  // Handle add new sub-service
  const handleAddServiceDetail = newServiceDetail => {
    console.log('➕ Adding new service detail:', newServiceDetail);
    const serviceWithTempId = {
      ...newServiceDetail,
      id: new Date().getTime().toString(),
    };
    const updatedServiceDetails = [...serviceDetails, serviceWithTempId];
    saveServiceDetailsToBackend(updatedServiceDetails);
  };

  // Handle update sub-service
  const handleUpdateServiceDetail = updatedServiceDetail => {
    console.log('✏️ Updating service detail:', updatedServiceDetail);
    const targetId = updatedServiceDetail._id || updatedServiceDetail.id;

    if (!targetId) {
      Alert.alert('Error', 'Cannot update item: No valid ID found');
      return;
    }

    const updatedServiceDetails = serviceDetails.map(detail => {
      const detailId = detail._id || detail.id;

      if (detailId === targetId) {
        const updatedFields = {
          name:
            updatedServiceDetail.subServiceName || updatedServiceDetail.name,
          price: updatedServiceDetail.price,
          time: updatedServiceDetail.time,
          description: updatedServiceDetail.description,
          image: updatedServiceDetail.image,
          prices: updatedServiceDetail.prices || detail.prices,
          type: updatedServiceDetail.type || detail.type,
        };

        if (updatedFields.prices && updatedFields.prices.length > 0) {
          updatedFields.price = 0;
        }

        return { ...detail, ...updatedFields };
      }
      return detail;
    });

    saveServiceDetailsToBackend(updatedServiceDetails);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#A98C27" />
        <Text style={styles.loadingText}>Saving changes...</Text>
      </View>
    );
  }

  // Group dye services together
  const groupDyeServices = services => {
    const grouped = {};

    services.forEach(service => {
      // Check if it's a dye service (name contains "Keratin-Extanso Botox" and has a length type in parentheses)
      if (
        service.name?.includes('Keratin-Extanso Botox') &&
        service.name.match(/\(([^)]+)\)/)
      ) {
        const baseName = 'Keratin-Extanso Botox';
        if (!grouped[baseName]) {
          grouped[baseName] = [];
        }
        grouped[baseName].push(service);
      }
    });

    // Return: [groupedDyeServices..., otherServices...]
    const groupedArray = Object.values(grouped);
    const otherServices = services.filter(
      service =>
        !service.name?.includes('Keratin-Extanso Botox') ||
        !service.name.match(/\(([^)]+)\)/),
    );

    return [...groupedArray, ...otherServices];
  };

  const processedServices = groupDyeServices(serviceDetails);
  const isDyeServiceGroup = processedServices.some(
    item => Array.isArray(item) && item.length > 0,
  );

  return (
    <View style={styles.container}>
      <Sidebar
        activeTab="Services"
        navigation={navigation}
        onSelect={tabName => {
          switch (tabName) {
            case 'Services':
              navigation.navigate('Services');
              break;
            case 'Marketplace':
              navigation.navigate('Marketplace');
              break;
            case 'Deals':
              navigation.navigate('Deals');
              break;
            case 'Attendance':
              navigation.navigate('Attendance');
              break;
            case 'PendingApprovals':
              navigation.navigate('PendingApprovals');
              break;
            case 'Expense':
              navigation.navigate('Expense');
              break;
            case 'AdvanceSalary':
              navigation.navigate('AdvanceSalary');
              break;
            case 'AdvanceBooking':
              navigation.navigate('AdvanceBooking');
              break;
            case 'Employees':
              navigation.navigate('Employees');
              break;
            case 'Clients':
              navigation.navigate('Clients');
              break;
            default:
              break;
          }
        }}
      />
      <View style={styles.mainContent}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={normalize(44)} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {service.name || service.title || 'Service'}
          </Text>
          {!isDyeServiceGroup && (
            <TouchableOpacity
              onPress={() => {
                setIsEditing(false);
                setSelectedServiceDetail(null);
                setAddModalVisible(true);
              }}
              style={styles.addNewServicesButton}
            >
              <Text style={styles.addNewServicesButtonText}>
                Add New Sub Service
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.subServicesGridContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.subServicesGrid}>
            {processedServices && processedServices.length > 0 ? (
              processedServices.map((item, index) => {
                if (Array.isArray(item)) {
                  // This is a group of dye services
                  console.log('✅ RENDERING DYE GROUP CARD for:', item[0].name);
                  return (
                    <View key={`dye-${index}`} style={styles.dyeGroupWrapper}>
                      <DyeServiceGroupCard
                        serviceDetails={item}
                        onOptionsPress={handleOptionSelect}
                        onAddPress={handleAddPress}
                      />
                    </View>
                  );
                } else {
                  // This is a normal service
                  console.log('✅ RENDERING NORMAL CARD for:', item.name);
                  return (
                    <View key={`normal-${index}`} style={styles.cardWrapper}>
                      <ServiceDetailCard
                        serviceDetail={item}
                        onOptionsPress={handleOptionSelect}
                        onAddPress={handleAddPress}
                      />
                    </View>
                  );
                }
              })
            ) : (
              <Text style={styles.noSubServicesText}>
                No sub-services available for this service.
              </Text>
            )}
          </View>
        </ScrollView>

        <AddSubServiceModal
          visible={addModalVisible}
          onClose={() => {
            setAddModalVisible(false);
            setIsEditing(false);
            setSelectedServiceDetail(null);
          }}
          onAddSubService={handleAddServiceDetail}
          onUpdateSubService={handleUpdateServiceDetail}
          initialSubServiceData={isEditing ? selectedServiceDetail : null}
        />
      </View>
    </View>
  );
};

// **********************************************************
// ************ STYLESHEET **********************************
// **********************************************************

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#1e1f20ff',
  },
  mainContent: {
    flex: 1,
    paddingTop: height * 0.03,
    paddingRight: width * 0.03,
    paddingLeft: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1e1f20ff',
  },
  loadingText: {
    color: '#fff',
    fontSize: width * 0.03,
    marginTop: height * 0.02,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: height * 0.02,
    borderBottomWidth: 1,
    borderBottomColor: '#3C3C3C',
    marginBottom: height * 0.02,
  },
  backButton: {
    padding: 10,
  },
  headerTitle: {
    fontSize: width * 0.035,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
    marginRight: width * 0.2,
  },
  addNewServicesButton: {
    backgroundColor: '#A99226',
    paddingVertical: height * 0.012,
    paddingHorizontal: width * 0.035,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  addNewServicesButtonText: {
    color: '#fff',
    fontSize: width * 0.018,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  subServicesGridContainer: {
    paddingBottom: height * 0.05,
  },
  subServicesGrid: {
    flexDirection: 'column', // one card per row
    paddingHorizontal: width * 0.02,
  },
  cardWrapper: {
    width: '100%',
    marginBottom: height * 0.02,
  },
  noSubServicesText: {
    color: '#A9A9A9',
    fontSize: width * 0.025,
    textAlign: 'center',
    marginTop: height * 0.05,
    width: '100%',
  },
  cardContainer: {
    backgroundColor: '#1f1f1f',
    borderRadius: normalize(6),
    paddingHorizontal: normalize(12),
    paddingVertical: 0,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 4,
    height: height * 0.08, // slightly smaller, more compact card height
    paddingRight: normalize(8), // ensure a bit of card space to the right of icons
  },
  cardImage: {
    width: normalize(160),
    height: '100%',
    borderRadius: normalize(8),
    resizeMode: 'cover',
  },
  imageWrapper: {
    position: 'relative',
    marginRight: normalize(12),
    height: '100%',
    justifyContent: 'center',
  },
  overlayName: {
    position: 'absolute',
    top: normalize(8),
    left: normalize(180),
    //right: normalize(8),
    color: '#fff',
    fontWeight: 'bold',
    fontSize: normalize(20),
  },
  overlayTime: {
    position: 'absolute',
    top: '39%',
    left: 115,

    textAlign: 'center',
    color: '#fff',
    fontSize: normalize(18),
  },
  overlayPrice: {
    position: 'absolute',
    bottom: normalize(22),
    left: normalize(180),
    color: '#FFD700',
    fontWeight: 'bold',
    fontSize: normalize(18),
  },
  cardInfo: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  infoColumnLeft: {
    flex: 1,
    paddingRight: normalize(6),
  },
  infoColumnRight: {
    flex: 1,
    paddingLeft: normalize(2),
    alignItems: 'flex-start',
  },
  serviceNameText: {
    fontSize: normalize(28),
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: normalize(4),
  },
  cardTitle: {
    fontSize: normalize(20),
    fontWeight: 'bold',
    color: '#fff',
  },
  cardDescription: {
    color: '#ccc',
    fontSize: normalize(20),
    textAlign: 'left',
    marginVertical: normalize(2),
  },
  cardPrice: {
    color: '#FFD700',
    fontSize: normalize(24),
    fontWeight: 'bold',
  },
  cardActions: {
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: normalize(4),
    height: '100%',
  },
  iconButton: {
    padding: normalize(8),
  },
  // Dye Service Group Card Styles
  dyeGroupWrapper: {
    width: '100%',
    marginBottom: height * 0.02,
  },
  dyeGroupCard: {
    backgroundColor: '#1e1f20ff',
    borderRadius: 12,
    padding: normalize(12),
    flexDirection: 'row',
    borderColor: '#fff',
    borderWidth: 2,
  },
  imageContainer: {
    width: '50%',
    alignItems: 'center',
  },
  bigImage: {
    width: '100%',
    height: height * 0.4,
    borderRadius: 12,
    resizeMode: 'cover',
  },
  detailsContainer: {
    flex: 1,
    marginLeft: normalize(20),
  },
  groupTitle: {
    fontSize: normalize(38),
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: normalize(10),
  },
  groupDescription: {
    color: '#ccc',
    fontSize: normalize(25),
    marginBottom: normalize(10),
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: normalize(40),
  },
  timeText: {
    color: '#FFD700',
    fontSize: normalize(25),
    fontWeight: '600',
  },
  priceButtonsContainer: {
    marginBottom: normalize(30),
  },
  priceButton: {
    backgroundColor: '#A98C27',
    paddingVertical: normalize(30),
    paddingHorizontal: normalize(-5),

    borderRadius: 8,
    marginVertical: normalize(30),
    marginRight: normalize(20),
    marginLeft: normalize(20),
    width: '90%',
    alignItems: 'center',
  },
  priceButtonText: {
    color: '#000',
    fontSize: normalize(25),
    fontWeight: 'bold',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: normalize(15),
    marginTop: normalize(10),
  },
  actionButton: {
    padding: normalize(5),
  },
});

export default SubServicesScreen;
