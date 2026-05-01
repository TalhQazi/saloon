// src/screens/admin/SubMarketplaceScreen.js

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
import { updateProduct } from '../../../../api';
import { BASE_URL } from '../../../../api/config';

import AddProductDetailModal from './modals/AddProductDetailModal';

// Import all necessary local images
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

// Helper to convert a backend relative path (e.g. "/uploads/...") into a full URL
const resolveImageUrl = image => {
  if (typeof image !== 'string') return image;

  if (image.startsWith('http://') || image.startsWith('https://')) {
    return image;
  }

  if (image.startsWith('/')) {
    const apiRoot = BASE_URL || '';
    const hostRoot = apiRoot.endsWith('/api')
      ? apiRoot.slice(0, -4)
      : apiRoot;
    return `${hostRoot}${image}`;
  }

  return image;
};

// Helper function to get image source (local asset or URI)
const getDisplayImageSource = image => {
  console.log('getDisplayImageSource called with:', image);

  if (
    typeof image === 'string' &&
    (image.startsWith('http://') ||
      image.startsWith('https://') ||
      image.startsWith('file://') ||
      image.startsWith('content://') ||
      image.startsWith('data:image'))
  ) {
    console.log('Using direct URI image:', image);
    return { uri: image };
  }

  if (typeof image === 'string' && image.startsWith('/')) {
    const resolved = resolveImageUrl(image);
    console.log('Resolved relative image path to:', resolved);
    return { uri: resolved };
  }

  if (typeof image === 'number') {
    console.log('Using local asset image:', image);
    return image;
  }

  if (!image || image === '') {
    console.log('No image provided, returning null');
    return null;
  }

  console.log('Unknown image format:', image, 'returning null');
  return null;
};

const getProductDetailImage = productDetailName => {
  switch (productDetailName) {
    case 'Standard Haircut Kit':
      return womanBluntCutImage;
    case 'Layered Cut Scissors Set':
      return layerCutImage;
    case 'Kids Hair Clipper':
      return bobLobCutImage;
    case 'Classic Manicure Kit':
      return mediumLengthLayerImage;
    case 'Gel Polish Collection':
      return vShapedCutImage;
    case 'French Nail Art Kit':
      return womanBluntCutImage;
    case 'Luxury Foot Spa Machine':
      return bobLobCutImage;
    case 'Express Pedicure Polish':
      return mediumLengthLayerImage;
    case 'Full Color Dye Pack':
      return vShapedCutImage;
    case 'Highlighting Kit':
      return layerCutImage;
    case 'Root Touch-up Kit':
      return womanBluntCutImage;
    case 'Strong Hold Gel':
      return haircutImage;
    case 'Professional Nail File':
      return manicureImage;
    case 'Deep Moisturizing Cream':
      return pedicureImage;
    case 'Hair Bleaching Powder':
      return hairColoringImage;
    case 'Cordless Beard Trimmer':
      return haircutImage;
    case 'Nourishing Cuticle Oil':
      return manicureImage;
    case 'Effective Callus Remover':
      return pedicureImage;
    case 'Color Lock Shampoo':
      return hairColoringImage;
    case 'Extra Hold Hair Spray':
      return hairColoringImage;
    case 'Professional Brush Set':
      return haircutImage;
    case 'Exfoliating Foot Scrub':
      return pedicureImage;
    case 'Stainless Steel Nail Clippers':
      return manicureImage;
    default:
      return userProfileImage;
  }
};

const ProductDetailCard = ({ productDetail, onOptionsPress, onAddPress }) => {
  const detailName =
    productDetail?.name || productDetail?.productDetailName || 'N/A';

  const rawPrice =
    productDetail?.price ??
    productDetail?.productPrice ??
    productDetail?.productDetailPrice;
  const detailPrice = rawPrice != null ? String(rawPrice) : 'N/A';
  const detailDescription = productDetail?.description || '';

  let imageSource = null;

  if (productDetail?.image || productDetail?.productDetailImage) {
    const img = productDetail.image || productDetail.productDetailImage;
    imageSource = getDisplayImageSource(img);
  }

  if (!imageSource) {
    imageSource = getProductDetailImage(detailName);
  }

  if (!imageSource) {
    imageSource = userProfileImage;
  }

  console.log(
    'ProductDetailCard image source for',
    detailName,
    ':',
    imageSource,
  );

  return (
    <View style={styles.cardContainer}>
      <TouchableOpacity
        style={styles.imageWrapper}
        activeOpacity={0.8}
        onPress={() => onAddPress(productDetail)}
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
          onPress={() => onOptionsPress('edit', productDetail)}
          style={styles.iconButton}
        >
          <Ionicons
            name="create-outline"
            size={normalize(44)}
            color="#FFD700"
          />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => onOptionsPress('delete', productDetail)}
          style={styles.iconButton}
        >
          <Ionicons name="trash-outline" size={normalize(44)} color="#FFD700" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const SubMarketplaceScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { userName } = useUser();

  const product = route.params?.product || {};

  const [addModalVisible, setAddModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedProductDetail, setSelectedProductDetail] = useState(null);
  const [loading, setLoading] = useState(false);

  const [productDetails, setProductDetails] = useState(
    product.subProducts || product.productDetails || [],
  );

  useEffect(() => {
    setProductDetails(product.subProducts || product.productDetails || []);
  }, [product.subProducts, product.productDetails]);

  // FIXED: Function to save product details to backend
  const saveProductDetailsToBackend = async updatedProductDetails => {
    const productId = product._id || product.id;

    if (!productId) {
      Alert.alert('Error', 'Product ID not found. Cannot save changes.');
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
        setLoading(false);
        return;
      }

      console.log('Saving product details with ID:', productId);
      console.log('Updated product details:', updatedProductDetails);

      // CRITICAL FIX: Send data in the format backend expects
      const productData = {
        // Backend expects 'name' field
        name: product.name || product.productName || '',
        
        // Backend expects 'image' field for main product image
        image: product.image || product.productImage || '',
        
        // Map subProducts with correct field names
        subProducts: updatedProductDetails.map(detail => ({
          name: detail.name || detail.productDetailName || '',
          price: parseFloat(detail.price) || 0,
          time: detail.time || '',
          description: detail.description || '',
          // Backend expects 'image' field (not productDetailImage)
          image: detail.image || detail.productDetailImage || '',
        })),
      };

      console.log('Product data being sent to backend:', JSON.stringify(productData, null, 2));

      const response = await updateProduct(productId, productData, token);
      
      console.log('Backend response:', response);
      
      Alert.alert('Success', 'Product details updated successfully!');

      if (response && response.subProducts) {
        setProductDetails(response.subProducts);
      } else {
        setProductDetails(updatedProductDetails);
      }
    } catch (error) {
      console.error('Error saving product details:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      
      let errorMessage = 'Failed to save product details.';
      
      if (error.message.includes('Network Error')) {
        errorMessage = 'Network Error: Please check your internet connection and try again.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleOptionSelect = (option, productDetail) => {
    setSelectedProductDetail(productDetail);

    if (option === 'edit') {
      setIsEditing(true);
      setAddModalVisible(true);
    } else if (option === 'delete') {
      Alert.alert(
        'Confirm Deletion',
        `Are you sure you want to delete "${
          productDetail?.name ||
          productDetail?.productDetailName ||
          'this product detail'
        }"?`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => console.log('Delete cancelled'),
          },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => handleDeleteProductDetail(productDetail),
          },
        ],
        { cancelable: true },
      );
    }
  };

  const handleDeleteProductDetail = productDetailToDelete => {
    console.log('=== Deleting product detail ===');
    console.log('Product detail to delete:', productDetailToDelete);

    const targetId = productDetailToDelete?._id || productDetailToDelete?.id;
    const targetName =
      productDetailToDelete?.name ||
      productDetailToDelete?.productDetailName ||
      'Unknown';

    if (!targetId && !targetName) {
      Alert.alert('Error', 'Cannot delete item: No valid identifier found');
      return;
    }

    const updatedProductDetails = productDetails.filter(detail => {
      const detailId = detail._id || detail.id;
      const detailName = detail.name || detail.productDetailName;

      if (targetId) {
        const keep = detailId !== targetId;
        console.log(
          `Comparing id ${detailId} with ${targetId}: ${
            keep ? 'KEEP' : 'DELETE'
          }`,
        );
        return keep;
      }

      const keep = detailName !== targetName;
      console.log(
        `Comparing name "${detailName}" with "${targetName}": ${
          keep ? 'KEEP' : 'DELETE'
        }`,
      );
      return keep;
    });

    console.log(
      'Product details after deletion:',
      updatedProductDetails.map(detail => ({
        id: detail.id,
        _id: detail._id,
        name: detail.name || detail.productDetailName,
      })),
    );

    saveProductDetailsToBackend(updatedProductDetails);
  };

  const handleAddPress = async productDetail => {
    await addAdminCartItem({
      ...productDetail,
      type: 'product',
    });
    Alert.alert('Added to Cart', 'Product has been added to the cart.', [
      {
        text: 'OK',
        onPress: () => navigation.goBack(),
      },
    ]);
  };

  const handleAddProductDetail = newProductDetail => {
    const updatedProductDetails = [...productDetails, newProductDetail];
    saveProductDetailsToBackend(updatedProductDetails);
  };

  const handleUpdateProductDetail = updatedProductDetail => {
    console.log('=== Updating product detail ===');
    console.log('Updated product detail:', updatedProductDetail);

    const targetId = updatedProductDetail._id || updatedProductDetail.id;

    if (!targetId) {
      console.error('No valid ID found for update');
      Alert.alert('Error', 'Cannot update item: No valid ID found');
      return;
    }

    const updatedProductDetails = productDetails.map(detail => {
      const detailId = detail._id || detail.id;

      if (detailId === targetId) {
        console.log(`Updating item with ID: ${detailId}`);
        return {
          ...detail,
          name:
            updatedProductDetail.productDetailName || updatedProductDetail.name,
          price: updatedProductDetail.price,
          time: updatedProductDetail.time,
          description: updatedProductDetail.description,
          image: updatedProductDetail.image || updatedProductDetail.productDetailImage,
        };
      }
      return detail;
    });

    console.log(
      'Product details after update:',
      updatedProductDetails.map(detail => ({
        id: detail.id,
        _id: detail._id,
        name: detail.name || detail.productDetailName,
      })),
    );

    saveProductDetailsToBackend(updatedProductDetails);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#A99226" />
        <Text style={styles.loadingText}>Saving changes...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Sidebar
        activeTab="Marketplace"
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
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {product.name || 'Product'} 
          </Text>
          <TouchableOpacity
            onPress={() => setAddModalVisible(true)}
            style={styles.addNewServicesButton}
          >
            <Text style={styles.addNewServicesButtonText}>
              Add New Sub product
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.subServicesGridContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.subServicesGrid}>
            {productDetails && productDetails.length > 0 ? (
              productDetails.map((productDetail, index) => (
                <View
                  key={productDetail._id || productDetail.id || index}
                  style={styles.cardWrapper}
                >
                  <ProductDetailCard
                    productDetail={productDetail}
                    onOptionsPress={handleOptionSelect}
                    onAddPress={handleAddPress}
                  />
                </View>
              ))
            ) : (
              <Text style={styles.noSubServicesText}>
                No sub-products available for this product.
              </Text>
            )}
          </View>
        </ScrollView>

        <AddProductDetailModal
          visible={addModalVisible}
          onClose={() => {
            setAddModalVisible(false);
            setIsEditing(false);
            setSelectedProductDetail(null);
          }}
          onAddProductDetail={handleAddProductDetail}
          onUpdateProductDetail={handleUpdateProductDetail}
          initialProductDetailData={isEditing ? selectedProductDetail : null}
        />
      </View>
    </View>
  );
};

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
    marginRight: width * 0.3,
    textAlign: 'center',
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
  addButton: {
    padding: 10,
  },
  scrollView: {
    flex: 1,
  },
  subServicesGridContainer: {
    paddingBottom: height * 0.05,
  },
  subServicesGrid: {
    flexDirection: 'column',
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
  },
  cardContainer: {
    backgroundColor: '#1f1f1f',
    borderRadius: normalize(6),
    paddingHorizontal: normalize(14),
    paddingVertical: 0,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 4,
    height: height * 0.08,
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
    color: '#fff',
    fontWeight: 'bold',
    fontSize: normalize(20),
  },
  overlayTime: {
    position: 'absolute',
    top: '39%',
    left: 110,
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
    fontSize: normalize(16),
    textAlign: 'left',
    marginVertical: normalize(2),
  },
  cardPrice: {
    color: '#FFD700',
    fontSize: normalize(18),
    fontWeight: 'bold',
  },
  cardActions: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: normalize(4),
    height: '100%',
  },
  iconButton: {
    padding: normalize(8),
  },
  timeText: {
    color: '#A98C27',
    fontSize: normalize(18),
    fontWeight: '600',
  },
});

export default SubMarketplaceScreen;