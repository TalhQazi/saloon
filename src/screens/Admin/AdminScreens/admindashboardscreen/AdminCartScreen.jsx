import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import Sidebar from '../../../../components/Sidebar';
import {
  getAdminCartItems,
  removeAdminCartItem,
} from '../../../../utils/adminCart';

const { width, height } = Dimensions.get('window');

const AdminCartScreen = () => {
  const navigation = useNavigation();
  const [items, setItems] = useState([]);

  const loadItems = useCallback(async () => {
    const data = await getAdminCartItems();
    setItems(data);
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadItems();
    });
    loadItems();
    return unsubscribe;
  }, [navigation, loadItems]);

  const handleRemove = async id => {
    const updated = await removeAdminCartItem(id);
    setItems(updated);
  };

  const subtotal = items.reduce((sum, item) => sum + (Number(item.price) || 0), 0);

  const getItemImageSource = item => {
    const raw = item.raw || {};
    const img =
      raw.subServiceImage ||
      raw.image ||
      raw.productDetailImage ||
      raw.dealImage ||
      null;

    if (!img) return null;
    if (typeof img === 'string') {
      return { uri: img };
    }
    return img;
  };

  const handleCheckout = () => {
    if (!items.length) {
      Alert.alert('Empty Cart', 'Please add items to the cart before checkout.');
      return;
    }

    const mappedServices = items.map(it => ({
      name: it.name,
      price: Number(it.price) || 0,
      type: it.type,
      sourceType: it.type,
      image:
        (it.raw &&
          (it.raw.subServiceImage ||
            it.raw.image ||
            it.raw.productDetailImage ||
            it.raw.dealImage)) ||
        null,
      description: it.raw?.description,
      time: it.raw?.time || it.raw?.duration,
    }));

    navigation.navigate('CartService', {
      initialServices: mappedServices,
      sourcePanel: 'admin',
    });
  };

  const renderTypeLabel = type => {
    switch (type) {
      case 'product':
        return 'Product';
      case 'deal':
        return 'Deal';
      default:
        return 'Service';
    }
  };

  return (
    <View style={styles.container}>
      <Sidebar
        activeTab="Services"
        navigation={navigation}
        onSelect={() => {
          navigation.goBack();
        }}
      />
      <View style={styles.mainContent}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={width * 0.03} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Cart</Text>
        </View>

        <ScrollView style={styles.contentArea}>
          {items.length === 0 ? (
            <Text style={styles.emptyText}>No items in cart.</Text>
          ) : (
            items.map(item => {
              const imageSource = getItemImageSource(item);
              return (
                <View key={item.id} style={styles.cartItemRow}>
                  {imageSource && (
                    <Image source={imageSource} style={styles.cartItemImage} />
                  )}
                  <View style={styles.cartItemInfo}>
                    <Text style={styles.cartItemName}>{item.name}</Text>
                    <Text style={styles.cartItemMeta}>{renderTypeLabel(item.type)}</Text>
                  </View>
                  <View style={styles.cartItemRight}>
                    <Text style={styles.cartItemPrice}>PKR {Number(item.price || 0).toFixed(2)}</Text>
                    <TouchableOpacity onPress={() => handleRemove(item.id)} style={styles.removeButton}>
                      <Ionicons name="trash-outline" size={width * 0.025} color="#FF6347" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>

        <View style={styles.footer}>
          <View style={styles.footerLeft}>
            <Text style={styles.footerLabel}>Items: {items.length}</Text>
            <Text style={styles.footerLabel}>Subtotal: PKR {subtotal.toFixed(2)}</Text>
          </View>
          <TouchableOpacity style={styles.checkoutButton} onPress={handleCheckout}>
            <Text style={styles.checkoutButtonText}>Checkout</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#121212',
  },
  mainContent: {
    flex: 1,
    padding: width * 0.02,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginBottom: height * 0.02,
  },
  backButton: {
    marginRight: width * 0.01,
  },
  headerTitle: {
    fontSize: width * 0.025,
    fontWeight: 'bold',
    color: '#fff',
  },
  contentArea: {
    flex: 1,
  },
  emptyText: {
    color: '#A9A9A9',
    fontSize: width * 0.02,
    marginTop: height * 0.02,
  },
  cartItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: height * 0.015,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2D32',
  },
  cartItemImage: {
    width: width * 0.06,
    height: width * 0.06,
    borderRadius: 6,
    marginRight: width * 0.015,
    backgroundColor: '#333',
  },
  cartItemInfo: {
    flex: 1,
  },
  cartItemName: {
    color: '#fff',
    fontSize: width * 0.02,
    fontWeight: '600',
  },
  cartItemMeta: {
    color: '#A9A9A9',
    fontSize: width * 0.016,
    marginTop: 4,
  },
  cartItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cartItemPrice: {
    color: '#fff',
    fontSize: width * 0.02,
    marginRight: width * 0.015,
  },
  removeButton: {
    padding: 4,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: height * 0.015,
    borderTopWidth: 1,
    borderTopColor: '#3C3C3C',
    marginTop: height * 0.01,
  },
  footerLeft: {
    flexDirection: 'column',
  },
  footerLabel: {
    color: '#fff',
    fontSize: width * 0.018,
  },
  checkoutButton: {
    backgroundColor: '#A98C27',
    paddingHorizontal: width * 0.03,
    paddingVertical: height * 0.012,
    borderRadius: 8,
  },
  checkoutButtonText: {
    color: '#fff',
    fontSize: width * 0.018,
    fontWeight: '600',
  },
});

export default AdminCartScreen;
