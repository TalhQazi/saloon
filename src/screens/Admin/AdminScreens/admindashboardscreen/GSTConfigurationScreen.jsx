// src/screens/admin/GSTConfigurationScreen.jsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Switch,
  TouchableOpacity,
  Alert,
  Dimensions,
  PixelRatio,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { getGstConfig, saveGstConfig } from '../../../../api/gst';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import NotificationBell from '../../../../components/NotificationBell';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');
const scale = width / 1280;
const normalize = size =>
  Math.round(PixelRatio.roundToNearestPixel(size * scale));

const userProfileImagePlaceholder = require('../../../../assets/images/logo.png');

// Helper function to truncate username to 6 words maximum
const truncateUsername = username => {
  if (!username) return 'Guest';
  const words = username.split(' ');
  if (words.length <= 6) return username;
  return words.slice(0, 6).join(' ') + '...';
};

// 🔐 Retrieve full admin object from AsyncStorage
const getAuthenticatedAdmin = async () => {
  try {
    const data = await AsyncStorage.getItem('adminAuth');
    if (data) {
      const parsed = JSON.parse(data);
      if (parsed.token && parsed.isAuthenticated) {
        return {
          token: parsed.token,
          name: parsed.admin?.name || 'Guest',
          profilePicture:
            parsed.admin?.profilePicture || parsed.admin?.livePicture,
        };
      }
    }
    return null;
  } catch (error) {
    console.error('Failed to get authenticated admin:', error);
    return null;
  }
};

const GSTConfigurationScreen = () => {
  const navigation = useNavigation();
  
  // ✅ State for admin profile
  const [authenticatedAdmin, setAuthenticatedAdmin] = useState(null);
  const userName = authenticatedAdmin?.name || 'Guest';
  const userProfileImage = authenticatedAdmin?.profilePicture;
  const profileImageSource = userProfileImage
    ? { uri: userProfileImage }
    : userProfileImagePlaceholder;

  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(true);
  const [ratePercent, setRatePercent] = useState('7');
  const [applyTo, setApplyTo] = useState({
    services: true,
    products: true,
    deals: true,
  });
  const [updatedAt, setUpdatedAt] = useState(null);
  const [updatedBy, setUpdatedBy] = useState(null);
  const [searchText, setSearchText] = useState('');

  // ✅ Load admin profile on mount
  useEffect(() => {
    const loadAdminProfile = async () => {
      const admin = await getAuthenticatedAdmin();
      if (admin) {
        setAuthenticatedAdmin(admin);
      } else {
        Alert.alert('Authentication Error', 'Please login again.', [
          {
            text: 'OK',
            onPress: () => navigation.replace('AdminLogin'),
          },
        ]);
      }
    };
    loadAdminProfile();
  }, []);

  // 🔁 Load GST config
  useEffect(() => {
    (async () => {
      try {
        const cfg = await getGstConfig();
        setEnabled(Boolean(cfg.enabled));
        setRatePercent(String(cfg.ratePercent ?? 7));
        setApplyTo(
          cfg.applyTo || { services: true, products: true, deals: true },
        );
        setUpdatedAt(cfg.updatedAt || null);
        setUpdatedBy(cfg.updatedBy || null);
      } catch (error) {
        console.error('Failed to fetch GST config:', error);
        Alert.alert('Error', 'Failed to load GST configuration.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const onSave = async () => {
    const percent = Number(ratePercent);
    if (Number.isNaN(percent) || percent < 0 || percent > 100) {
      Alert.alert('Invalid GST', 'GST Percentage must be between 0 and 100');
      return;
    }
    try {
      setLoading(true);
      const saved = await saveGstConfig({
        enabled,
        ratePercent: percent,
        applyTo,
      });
      setUpdatedAt(saved.updatedAt || new Date().toISOString());
      Alert.alert('Saved', 'GST configuration updated successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to save GST configuration.');
      console.error('Error saving GST config:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !authenticatedAdmin) {
    return (
      <View style={styles.loadingView}>
        <ActivityIndicator size="large" color="#A98C27" />
        <Text style={{ color: '#fff', marginTop: 10 }}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ✅ DYNAMIC HEADER — Same as AdvanceSalary screen */}
      <View style={styles.header}>
        <View style={styles.headerCenter}>
          <View style={styles.userInfo}>
            <Text style={styles.greeting}>Hello 👋</Text>
            <Text style={styles.userName}>{truncateUsername(userName)}</Text>
          </View>
          {/* <View style={styles.searchBarContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search anything"
              placeholderTextColor="#A9A9A9"
              onChangeText={setSearchText}
              value={searchText}
            />
            <Ionicons
              name="search"
              size={width * 0.027}
              color="#A9A9A9"
              style={styles.searchIcon}
            />
          </View> */}
        </View>
        <View style={styles.headerRight}>
           <TouchableOpacity
              style={styles.cartButton}
              onPress={() => navigation.navigate('AdminCartScreen')}
            >
              <Ionicons
                name="cart-outline"
                size={width * 0.039}
                color="#fff"
              />
            </TouchableOpacity>
          <NotificationBell containerStyle={styles.notificationButton} />
          <Image
            source={profileImageSource}
            style={styles.profileImage}
            resizeMode="cover"
          />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.label}>
            Current GST Rate: {Number(ratePercent) || 0}%
          </Text>

          <View style={styles.rowBetween}>
            <Text style={styles.label}>Enable GST for all transactions</Text>
            <Switch value={enabled} onValueChange={setEnabled} />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>GST Percentage</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={String(ratePercent)}
              onChangeText={setRatePercent}
              placeholder="e.g. 7"
              placeholderTextColor="#9aa"
              editable={enabled} // Only editable if GST is enabled
            />
          </View>

          <Text style={[styles.sectionTitle]}>Applied to</Text>
          <View style={styles.checkboxRow}>
            <TouchableOpacity
              style={styles.checkbox}
              onPress={() => setApplyTo(v => ({ ...v, services: !v.services }))}
            >
              <View
                style={[styles.box, applyTo.services && styles.boxChecked]}
              />
              <Text style={styles.checkboxLabel}>Services</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.checkbox}
              onPress={() => setApplyTo(v => ({ ...v, products: !v.products }))}
            >
              <View
                style={[styles.box, applyTo.products && styles.boxChecked]}
              />
              <Text style={styles.checkboxLabel}>Products</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.checkbox}
              onPress={() => setApplyTo(v => ({ ...v, deals: !v.deals }))}
            >
              <View style={[styles.box, applyTo.deals && styles.boxChecked]} />
              <Text style={styles.checkboxLabel}>Deals</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.saveBtn} onPress={onSave}>
            <Text style={styles.saveBtnText}>Save Configuration</Text>
          </TouchableOpacity>

          <Text style={styles.meta}>
            Last Updated:{' '}
            {updatedAt ? new Date(updatedAt).toLocaleString() : '—'}
          </Text>
          {updatedBy ? (
            <Text style={styles.meta}>Updated By: {updatedBy}</Text>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1e1f20ff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: width * 0.02,
    borderBottomWidth: 1,
    borderBottomColor: '#3C3C3C',
    marginBottom: width * 0.02,
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginLeft: width * 0.0001,
    marginRight: width * 0.0001,
  },
  userInfo: {
    marginRight: width * 0.16,
  },
  greeting: {
    fontSize: width * 0.019,
    color: '#A9A9A9',
  },
  userName: {
    fontSize: width * 0.03,
    fontWeight: 'bold',
    color: '#fff',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2D32',
    borderRadius: 10,
    paddingHorizontal: width * 0.0003,
    flex: 1,
    height: width * 0.05,
    borderWidth: 1,
    borderColor: '#4A4A4A',
  },
  searchIcon: {
    marginRight: width * 0.01,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: width * 0.021,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: width * 0.01,
  },
  cartButton: {
    backgroundColor: '#2A2D32',
    borderRadius: 8,
    padding: width * 0.000001,
    marginRight: width * 0.015,
    height: width * 0.058,
    width: width * 0.058,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationButton: {
    backgroundColor: '#2A2D32',
    borderRadius: 8,
    padding: width * 0.000001,
    marginRight: width * 0.015,
    height: width * 0.058,
    width: width * 0.058,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImage: {
    width: width * 0.058,
    height: width * 0.058,
    borderRadius: (width * 0.058) / 2,
  },
  loadingView: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#161719',
  },
  content: { padding: normalize(20) },
  card: {
    borderWidth: 1,
    borderColor: '#2A2D32',
    borderRadius: normalize(12),
    padding: normalize(20),
    backgroundColor: '#1d1f24',
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: normalize(16),
  },
  label: {
    color: '#fff',
    fontSize: normalize(26),
    marginBottom: normalize(18),
  },
  inputGroup: { marginBottom: normalize(26) },
  input: {
    backgroundColor: '#2A2D32',
    color: '#fff',
    paddingVertical: normalize(16),
    paddingHorizontal: normalize(19),
    borderRadius: normalize(8),
  },
  sectionTitle: {
    color: '#fff',
    fontSize: normalize(25),
    marginVertical: normalize(8),
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: normalize(6),
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: normalize(20),
  },
  box: {
    width: normalize(22),
    height: normalize(22),
    borderWidth: 2,
    borderColor: '#A98C27',
    marginRight: normalize(8),
    borderRadius: 4,
  },
  boxChecked: { backgroundColor: '#A98C27' },
  checkboxLabel: { color: '#fff', fontSize: normalize(21) },
  saveBtn: {
    backgroundColor: '#A98C27',
    paddingVertical: normalize(16),
    borderRadius: normalize(8),
    alignItems: 'center',
    marginTop: normalize(16),
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: normalize(24),
    marginBottom: normalize(8),
  },
  meta: { color: '#9aa', marginTop: normalize(8) },
});

export default GSTConfigurationScreen;
