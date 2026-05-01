//manager pannel subhome
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Image,
  ScrollView,
  TextInput,
  PixelRatio,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useUser } from '../../../context/UserContext';
import Sidebar from '../../../components/ManagerSidebar';
import { useNavigation, useRoute } from '@react-navigation/native';
import StandardHeader from '../../../components/StandardHeader';
import { getServiceById } from '../../../api';
import { addManagerCartItem } from '../../../utils/managerCart';

import userProfileImage from '../../../assets/images/cut.jpeg';
import womanBluntCutImage from '../../../assets/images/cut.jpeg';
import bobLobCutImage from '../../../assets/images/color.jpeg';
import mediumLengthLayerImage from '../../../assets/images/haircut.jpeg';
import vShapedCutImage from '../../../assets/images/manicure.jpeg';
import layerCutImage from '../../../assets/images/pedicure.jpeg';

const { width, height } = Dimensions.get('window');

const scale = width / 1280;
const normalize = size =>
  Math.round(PixelRatio.roundToNearestPixel(size * scale));

const getSubServiceImage = subServiceName => {
  switch (subServiceName) {
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
  return null;
};

const DyeServiceGroupCard = ({ serviceDetails, onAddPress }) => {
  const firstService = serviceDetails[0] || {};
  const detailName =
    (firstService?.name || firstService?.subServiceName || '').replace(
      /\s*\(.*?\)/,
      '',
    ) || 'Keratin-Extanso Botox';
  const detailTime = firstService?.time || 'N/A';
  const detailDescription = firstService?.description || '';
  const imageSource =
    getDisplayImageSource(
      firstService?.image || firstService?.subServiceImage,
    ) ||
    getSubServiceImage(detailName) ||
    userProfileImage;

  const prices = serviceDetails.map(svc => {
    const match = (svc.name || svc.subServiceName || '').match(/\(([^)]+)\)/);
    const lengthType = match ? match[1] : 'Unknown';
    return { lengthType, price: svc.price, id: svc.id || svc._id, base: svc };
  });

  return (
    <View style={styles.dyeGroupCard}>
      <View style={styles.imageContainer}>
        <Image source={imageSource} style={styles.bigImage} />
      </View>
      <View style={styles.detailsContainer}>
        <Text style={styles.groupTitle}>{detailName}</Text>
        {detailDescription !== '' ? (
          <Text style={styles.groupDescription} numberOfLines={2}>
            {detailDescription}
          </Text>
        ) : null}
        {detailTime !== 'N/A' ? (
          <View style={styles.timeContainer}>
            <Ionicons
              name="time-outline"
              size={normalize(30)}
              color="#A98C27"
            />
            <Text style={styles.timeText}>{detailTime}</Text>
          </View>
        ) : null}
        <View style={styles.priceButtonsContainer}>
          {prices.map((p, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.priceButton}
              onPress={() => {
                const toAdd = {
                  ...p.base,
                  selectedLength: p.lengthType,
                  price: p.price,
                  id: p.id,
                  name: p.base?.name || p.base?.subServiceName,
                };
                onAddPress(toAdd);
              }}
            >
              <Text style={styles.priceButtonText}>{`${p.lengthType} — ${p.price} PKR/-`}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
};

const SubServiceCard = ({ subService, onAddToCartPress }) => {
  const getSubServiceName = () => {
    return subService?.subServiceName || subService?.name || 'N/A';
  };

  const getSubServiceTime = () => {
    return subService?.time || 'N/A';
  };

  const getSubServicePrice = () => {
    return subService?.price != null ? String(subService.price) : 'N/A';
  };

  const getImageSource = () => {
    if (subService?.subServiceImage) {
      const src = getDisplayImageSource(subService.subServiceImage);
      if (src) return src;
    }
    if (subService?.image) {
      const src = getDisplayImageSource(subService.image);
      if (src) return src;
    }
    return getSubServiceImage(getSubServiceName());
  };

  const serviceName = getSubServiceName();
  const serviceTime = getSubServiceTime();
  const servicePrice = getSubServicePrice();
  const imageSource = getImageSource();

  return (
    <View style={styles.cardContainer}>
      <TouchableOpacity
        style={styles.imageWrapper}
        activeOpacity={0.8}
        onPress={() => onAddToCartPress(subService)}
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
              {serviceName}
            </Text>
            <Text
              style={styles.cardPrice}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {`PKR ${servicePrice}`}
            </Text>
            {serviceTime ? (
              <Text
                style={styles.timeText}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {serviceTime}
              </Text>
            ) : null}
          </View>
          <View style={styles.infoColumnRight}>
            {subService?.description ? (
              <Text
                style={styles.cardDescription}
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                {subService.description}
              </Text>
            ) : null}
          </View>
        </View>
      </View>
    </View>
  );
};

const SubHome = () => {
  const navigation = useNavigation();
  const route = useRoute();

  const service = route.params?.service || {};

  const { userName, isLoading } = useUser();
  const [subServices, setSubServices] = useState([]);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (service && Array.isArray(service.subServices)) {
      setSubServices(service.subServices);
      setFetchLoading(false);
      setError(null);
      return;
    }
    const fetchById = async () => {
      try {
        if (!service || !service.id) {
          setFetchLoading(false);
          setError('No service selected');
          return;
        }
        const data = await getServiceById(service.id);
        const list = data?.service?.subServices || data?.subServices || [];
        setSubServices(list);
        setError(null);
      } catch (e) {
        console.error('Error fetching sub-services:', e);
        setSubServices([]);
        setError('Failed to fetch sub-services. Please try again.');
      } finally {
        setFetchLoading(false);
      }
    };
    fetchById();
  }, [service]);

  const onAddToCart = async subService => {
    const price =
      subService?.price != null
        ? Number(subService.price)
        : 0;

    await addManagerCartItem({
      id: subService._id || subService.id,
      type: 'service',
      name: subService.subServiceName || subService.name || 'N/A',
      price,
      raw: subService,
    });

    Alert.alert('Added to Cart', 'Service has been added to the cart.', [
      {
        text: 'OK',
        onPress: () => {},
      },
    ]);
  };

  if (isLoading || fetchLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#A98C27" />
        <Text style={styles.loadingText}>Loading sub-services...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => {
            setFetchLoading(true);
            setError(null);
            if (service && service.id) {
              getServiceById(service.id)
                .then(data => {
                  const list =
                    data?.service?.subServices || data?.subServices || [];
                  setSubServices(list);
                  setFetchLoading(false);
                })
                .catch(e => {
                  setError('Failed to fetch sub-services. Please try again.');
                  setFetchLoading(false);
                });
            }
          }}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Sidebar
        navigation={navigation}
        userName={userName}
        activeTab="Services"
      />
      <View style={styles.mainContent}>
        <StandardHeader
          showBackButton={true}
          onBackPress={() => navigation.goBack()}
        />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.subServicesGridContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.subServicesGrid}>
            {(() => {
              const groupDyeServices = services => {
                const grouped = {};
                services.forEach(svc => {
                  const nm = svc.name || svc.subServiceName || '';
                  if (
                    nm.includes('Keratin-Extanso Botox') &&
                    nm.match(/\(([^)]+)\)/)
                  ) {
                    const baseName = 'Keratin-Extanso Botox';
                    if (!grouped[baseName]) grouped[baseName] = [];
                    grouped[baseName].push(svc);
                  }
                });
                const groupedArray = Object.values(grouped);
                const others = services.filter(svc => {
                  const nm = svc.name || svc.subServiceName || '';
                  return (
                    !nm.includes('Keratin-Extanso Botox') ||
                    !nm.match(/\(([^)]+)\)/)
                  );
                });
                return [...groupedArray, ...others];
              };
              const processed = groupDyeServices(subServices || []);
              if (!processed || processed.length === 0) {
                return (
                  <Text style={styles.noSubServicesText}>
                    No sub-services available for this service.
                  </Text>
                );
              }
              return processed.map((item, index) => {
                if (Array.isArray(item)) {
                  return (
                    <View key={`dye-${index}`} style={styles.dyeGroupWrapper}>
                      <DyeServiceGroupCard
                        serviceDetails={item}
                        onAddPress={svc => onAddToCart(svc)}
                      />
                    </View>
                  );
                }
                return (
                  <View key={`normal-${index}`} style={styles.cardWrapper}>
                    <SubServiceCard
                      subService={item}
                      onAddToCartPress={onAddToCart}
                    />
                  </View>
                );
              });
            })()}
          </View>
        </ScrollView>
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
  errorText: {
    color: '#ff6b6b',
    fontSize: width * 0.025,
    textAlign: 'center',
    marginBottom: height * 0.02,
  },
  retryButton: {
    backgroundColor: '#A99226',
    paddingVertical: height * 0.012,
    paddingHorizontal: width * 0.035,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: width * 0.018,
    fontWeight: '600',
  },
  mainContent: {
    flex: 1,
    paddingTop: height * 0.03,
    paddingRight: width * 0.03,
    paddingLeft: 0,
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
  imageWrapper: {
    position: 'relative',
    marginRight: normalize(12),
    height: '100%',
    justifyContent: 'center',
  },
  cardImage: {
    width: normalize(160),
    height: '100%',
    borderRadius: normalize(8),
    resizeMode: 'cover',
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
  cardDescription: {
    color: '#ccc',
    fontSize: normalize(16),
    textAlign: 'left',
    marginVertical: normalize(2),
  },
  cardPrice: {
    color: '#FFD700',
    fontSize: normalize(20),
    fontWeight: 'bold',
  },
  noSubServicesText: {
    color: '#A9A9A9',
    fontSize: width * 0.025,
    textAlign: 'center',
    marginTop: height * 0.05,
    width: '100%',
  },
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
    fontSize: normalize(22),
    marginLeft: 2,
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
});

export default SubHome;