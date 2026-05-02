import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Dimensions,
  Platform,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import NotificationBell from '../../../components/NotificationBell';
import DateTimePicker from '@react-native-community/datetimepicker';
import moment from 'moment';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';
import {
  MANAGER_CART_UPDATED_EVENT,
  getManagerCartItems,
} from '../../../utils/managerCart';

import { BASE_URL } from '../../../api/config';
import ViewBillModal from './modals/ViewClientModal';
import RNHTMLtoPDF from 'react-native-html-to-pdf';
import RNFS from 'react-native-fs';

const { width, height } = Dimensions.get('window');

const PAGE_SIZE = 25;

// Responsive column widths - use percentages for tablet, minimum for mobile
const getResponsiveColWidths = (screenWidth) => {
  // For tablets (width > 768), use percentage-based widths
  // For mobile, use minimum fixed widths
  const isTablet = screenWidth > 768;
  const baseWidth = isTablet ? screenWidth * 0.8 : Math.min(screenWidth * 0.9, 460);

  return {
    clientName: baseWidth * 0.22,
    clientPhone: baseWidth * 0.22,
    clientId: baseWidth * 0.18,
    viewBill: baseWidth * 0.18,
    amount: baseWidth * 0.20,
  };
};

// Default for initial render, will be calculated dynamically
const COL_WIDTHS = {
  clientName: 100,
  clientPhone: 100,
  clientId: 80,
  viewBill: 80,
  amount: 100,
};

const TABLE_MIN_WIDTH =
  COL_WIDTHS.clientName +
  COL_WIDTHS.clientPhone +
  COL_WIDTHS.clientId +
  COL_WIDTHS.viewBill +
  COL_WIDTHS.amount;

const userProfileImagePlaceholder = require('../../../assets/images/logo.png');

const getAuthenticatedUser = async () => {
  try {
    // Try manager auth first (for manager panel)
    const managerData = await AsyncStorage.getItem('managerAuth');
    if (managerData) {
      const parsed = JSON.parse(managerData);
      if (parsed.token && parsed.isAuthenticated) {
        return {
          token: parsed.token,
          name: parsed.manager?.name || 'Guest',
          profilePicture: parsed.manager?.profilePicture || parsed.manager?.livePicture,
          role: 'manager',
        };
      }
    }

    // Fallback to admin auth
    const adminData = await AsyncStorage.getItem('adminAuth');
    if (adminData) {
      const parsed = JSON.parse(adminData);
      if (parsed.token && parsed.isAuthenticated) {
        return {
          token: parsed.token,
          name: parsed.admin?.name || 'Guest',
          profilePicture: parsed.admin?.profilePicture || parsed.admin?.livePicture,
          role: 'admin',
        };
      }
    }

    return null;
  } catch (error) {
    console.error('Failed to get authenticated user:', error);
    return null;
  }
};

const loadManagerCartCount = async setCartCount => {
  try {
    const items = await getManagerCartItems();
    setCartCount(Array.isArray(items) ? items.length : 0);
  } catch (err) {
    console.error('[SalesScreen] Failed to load manager cart count:', err);
    setCartCount(0);
  }
};

const fetchClients = async token => {
  if (!token) throw new Error('No authentication token found');

  const response = await axios.get(`${BASE_URL}/clients/all`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  return response.data.clients || [];
};

const fetchClientHistory = async (clientId, token) => {
  if (!token) throw new Error('No authentication token found');
  const response = await axios.get(`${BASE_URL}/clients/${clientId}/history`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  return response.data?.client;
};

const fetchBillById = async (billId, token) => {
  if (!token) throw new Error('No authentication token found');
  const response = await axios.get(`${BASE_URL}/bills/${billId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  return response.data?.bill;
};

const normalizeVisitAmount = visit => {
  const val =
    visit?.finalAmount ??
    visit?.totalAmount ??
    visit?.totalBill ??
    visit?.total;
  return Number(val || 0);
};

const SalesScreen = ({ navigation }) => {
  const [authenticatedUser, setAuthenticatedUser] = useState(null);
  const [userName, setUserName] = useState('Guest');
  const [profileImageSource, setProfileImageSource] = useState(
    userProfileImagePlaceholder,
  );
  const [cartCount, setCartCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isBackgroundLoading, setIsBackgroundLoading] = useState(false);

  const [searchText, setSearchText] = useState('');
  const [fromDate, setFromDate] = useState(new Date());
  const [toDate, setToDate] = useState(new Date());
  const [showFromDatePicker, setShowFromDatePicker] = useState(false);
  const [showToDatePicker, setShowToDatePicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [page, setPage] = useState(1);

  const [salesRowsSource, setSalesRowsSource] = useState([]);

  const [isViewBillModalVisible, setIsViewBillModalVisible] = useState(false);
  const [selectedBillData, setSelectedBillData] = useState(null);
  const [selectedBillClient, setSelectedBillClient] = useState(null);
  const [isLoadingBill, setIsLoadingBill] = useState(false);
  const [businessDay, setBusinessDay] = useState(null);

  useEffect(() => {
    const init = async () => {
      const userData = await getAuthenticatedUser();
      setAuthenticatedUser(userData);
      setUserName(userData?.name || 'Guest');

      const image = userData?.profilePicture;
      if (typeof image === 'string' && image.trim().length > 0) {
        setProfileImageSource({ uri: image });
      } else {
        setProfileImageSource(userProfileImagePlaceholder);
      }

      // Load business day from database
      try {
        const token = userData?.token;
        if (token) {
          const response = await axios.get(`${BASE_URL}/settings/business-day`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          if (response.data && response.data.businessDay) {
            const dbDate = moment(response.data.businessDay).toDate();
            setBusinessDay(dbDate);
            await AsyncStorage.setItem('businessDay', dbDate.toISOString());
          } else {
            const today = new Date();
            setBusinessDay(today);
            await AsyncStorage.setItem('businessDay', today.toISOString());
          }
        } else {
          const storedBusinessDay = await AsyncStorage.getItem('businessDay');
          if (storedBusinessDay) {
            setBusinessDay(moment(storedBusinessDay).toDate());
          } else {
            const today = new Date();
            await AsyncStorage.setItem('businessDay', today.toISOString());
            setBusinessDay(today);
          }
        }
      } catch (error) {
        console.error('[SalesScreen] Error loading business day:', error);
        const today = new Date();
        setBusinessDay(today);
      }
    };

    init();
  }, []);

  useEffect(() => {
    loadManagerCartCount(setCartCount);
    const sub = DeviceEventEmitter.addListener(MANAGER_CART_UPDATED_EVENT, () => {
      loadManagerCartCount(setCartCount);
    });
    return () => sub.remove();
  }, []);

  const CACHE_KEY = 'managerSalesScreenCache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Helper function to extract visits from client data
  const extractVisitsFromClient = useCallback((client) => {
    // Check if client already has visits embedded
    if (client?.visits && Array.isArray(client.visits) && client.visits.length > 0) {
      return client.visits;
    }
    return null;
  }, []);

const loadSales = useCallback(
    async (showLoading = true) => {
      if (showLoading) setLoading(true);
      try {
        const token = authenticatedUser?.token;
        if (!token) {
          Alert.alert('Authentication Error', 'Please log in again.');
          return;
        }

        // Try to load cached data first for instant display
        if (showLoading) {
          try {
            const cached = await AsyncStorage.getItem(CACHE_KEY);
            if (cached) {
              const { data, timestamp } = JSON.parse(cached);
              if (Date.now() - timestamp < CACHE_DURATION) {
                console.log('[SalesScreen] Using cached data');
                setSalesRowsSource(data);
                setLoading(false);
                setIsBackgroundLoading(true);
              }
            }
          } catch (cacheError) {
            console.log('[SalesScreen] Cache read failed:', cacheError);
          }
        }

        const clients = await fetchClients(token);
        console.log('[SalesScreen] Clients loaded:', clients.length);

        const allRows = [];
        const clientsNeedingHistoryFetch = [];

        // First pass: extract visits from clients that have them embedded
        for (const client of clients) {
          const embeddedVisits = extractVisitsFromClient(client);
          if (embeddedVisits) {
            // Use embedded visits - no API call needed
            for (const visit of embeddedVisits) {
              const visitDate = visit?.date || visit?.appointmentDate || visit?.createdAt;
              const amount = normalizeVisitAmount(visit);
              allRows.push({
                key: `${client?._id || client?.clientId || 'client'}-${visit?.visitId || visit?.billId || visit?.billNumber || Math.random()}`,
                clientName: client?.name || visit?.clientName || 'Guest',
                clientPhone: client?.phoneNumber || visit?.phoneNumber || visit?.clientPhone || '-',
                clientId: client?.clientId || '-',
                billId: visit?.billId || null,
                billNumber: visit?.billNumber || visit?.visitId || '-',
                amount,
                date: visitDate,
                rawVisit: visit,
                rawClient: client,
              });
            }
          } else {
            // Need to fetch history for this client
            clientsNeedingHistoryFetch.push(client);
          }
        }

        console.log(`[SalesScreen] ${allRows.length} rows from embedded data, ${clientsNeedingHistoryFetch.length} clients need history fetch`);

        // Second pass: fetch history only for clients without embedded visits
        // Use smaller batch size and add timeout to prevent hanging
        const batchSize = 15;
        const totalBatches = Math.ceil(clientsNeedingHistoryFetch.length / batchSize);

        for (let i = 0; i < clientsNeedingHistoryFetch.length; i += batchSize) {
          const batch = clientsNeedingHistoryFetch.slice(i, i + batchSize);
          const batchNum = Math.floor(i / batchSize) + 1;

          console.log(`[SalesScreen] Loading batch ${batchNum}/${totalBatches} (${batch.length} clients)...`);

          // Add timeout to each batch to prevent hanging
          const batchPromise = Promise.all(
            batch.map(async c => {
              try {
                // Add a timeout wrapper
                const timeoutPromise = new Promise((_, reject) =>
                  setTimeout(() => reject(new Error('Timeout')), 10000)
                );
                const fetchPromise = fetchClientHistory(c._id, token);
                return await Promise.race([fetchPromise, timeoutPromise]);
              } catch (e) {
                if (e.message === 'Timeout') {
                  console.log(`[SalesScreen] Timeout fetching history for client: ${c?._id}`);
                } else {
                  console.error(
                    '[SalesScreen] History fetch failed for client:',
                    c?._id,
                    e?.response?.data || e?.message,
                  );
                }
                return null;
              }
            }),
          );

          const histories = await batchPromise;

          for (const histClient of histories) {
            if (!histClient) continue;
            const visits = Array.isArray(histClient?.visits) ? histClient.visits : [];

            for (const visit of visits) {
              const visitDate = visit?.date || visit?.appointmentDate || visit?.createdAt;
              const amount = normalizeVisitAmount(visit);
              allRows.push({
                key: `${histClient?._id || histClient?.clientId || 'client'}-${visit?.visitId || visit?.billId || visit?.billNumber || Math.random()}`,
                clientName: histClient?.name || visit?.clientName || 'Guest',
                clientPhone: histClient?.phoneNumber || visit?.phoneNumber || visit?.clientPhone || '-',
                clientId: histClient?.clientId || '-',
                billId: visit?.billId || null,
                billNumber: visit?.billNumber || visit?.visitId || '-',
                amount,
                date: visitDate,
                rawVisit: visit,
                rawClient: histClient,
              });
            }
          }

          // Update UI progressively every 3 batches for better perceived performance
          if (batchNum % 3 === 0 || batchNum === totalBatches) {
            setSalesRowsSource([...allRows]);
            console.log(`[SalesScreen] Progress updated: ${allRows.length} rows so far`);
          }
        }

        console.log('[SalesScreen] Total rows built:', allRows.length);
        setSalesRowsSource(allRows);

        // Save to cache
        try {
          await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({
            data: allRows,
            timestamp: Date.now(),
          }));
          console.log('[SalesScreen] Data cached successfully');
        } catch (cacheError) {
          console.log('[SalesScreen] Cache save failed:', cacheError);
        }
      } catch (error) {
        console.error('[SalesScreen] Failed to load sales:', error?.response?.data || error?.message);
        Alert.alert('Error', 'Failed to load sales. Please check your connection.');
      } finally {
        setLoading(false);
        setRefreshing(false);
        setIsBackgroundLoading(false);
      }
    },
    [authenticatedUser?.token, extractVisitsFromClient],
  );

  useEffect(() => {
    if (authenticatedUser?.token) {
      loadSales();
    }
  }, [authenticatedUser?.token, loadSales]);

  const onRefresh = () => {
    setRefreshing(true);
    loadSales(false);
  };

  const handleSearch = text => {
    setSearchText(text);
    setPage(1);
  };

  const onDateChange = (event, date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (date) {
      setSelectedFilterDate(date);
      setPage(1);
    }
  };

  const handleOpenDatePicker = () => {
    setShowDatePicker(true);
  };

  const handleClearDateFilter = () => {
    setFromDate(null);
    setToDate(null);
    setPage(1);
  };

  const handleEndDay = useCallback(async () => {
    try {
      // Get current business day and add 1 day
      const currentBusinessDay = businessDay || new Date();
      const nextBusinessDay = moment(currentBusinessDay).add(1, 'day').toDate();

      const token = authenticatedUser?.token;
      if (token) {
        await axios.post(`${BASE_URL}/settings/business-day`, {
          nextBusinessDay: nextBusinessDay.toISOString(),
        }, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      }

      // Save to AsyncStorage
      await AsyncStorage.setItem('businessDay', nextBusinessDay.toISOString());
      setBusinessDay(nextBusinessDay);

      Alert.alert(
        'Day Ended',
        `Business day ended for ${moment(currentBusinessDay).format('DD MMM YYYY')}.\n\nNew business day started: ${moment(nextBusinessDay).format('DD MMM YYYY')}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('[SalesScreen] Error ending day:', error);
      Alert.alert('Error', 'Failed to end day. Please try again.');
    }
  }, [businessDay, authenticatedUser?.token]);

  const handleDownloadPDF = useCallback(async () => {
    console.log('[SalesScreen] PDF Download - allSalesRows count:', allSalesRows.length);
    console.log('[SalesScreen] PDF Download - fromDate:', fromDate, 'toDate:', toDate);

    if (!allSalesRows || allSalesRows.length === 0) {
      Alert.alert('No Data', 'No sales data to download. Please check date filters.');
      return;
    }

    try {
      const dateRangeText = fromDate && toDate
        ? `${moment(fromDate).format('DD MMM YYYY')} - ${moment(toDate).format('DD MMM YYYY')}`
        : 'All Dates';

      let tableRows = allSalesRows.map((row, index) => `
        <tr style="background-color: ${index % 2 === 0 ? '#2A2D32' : '#26292E'};">
          <td style="padding: 10px; color: #fff; border: 1px solid #3C3C3C;">${row.clientName}</td>
          <td style="padding: 10px; color: #fff; border: 1px solid #3C3C3C;">${row.clientPhone}</td>
          <td style="padding: 10px; color: #fff; border: 1px solid #3C3C3C;">${row.clientId}</td>
          <td style="padding: 10px; color: #fff; border: 1px solid #3C3C3C; text-align: right;">Rs ${Number(row.amount || 0).toLocaleString()}</td>
        </tr>
      `).join('');

      const html = `
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; background-color: #1e1f20; margin: 0; padding: 20px; }
              .header { text-align: center; margin-bottom: 20px; }
              .title { color: #A98C27; font-size: 24px; font-weight: bold; }
              .date-range { color: #fff; font-size: 14px; margin-top: 5px; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th { background-color: #A98C27; color: #fff; padding: 12px; text-align: left; border: 1px solid #3C3C3C; }
              td { padding: 10px; border: 1px solid #3C3C3C; }
              .total-row { background-color: #A98C27 !important; font-weight: bold; }
              .total-row td { color: #fff; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="title">Sales Report</div>
              <div class="date-range">${dateRangeText}</div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Client Name</th>
                  <th>Phone Number</th>
                  <th>Client ID</th>
                  <th style="text-align: right;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${tableRows}
                <tr class="total-row">
                  <td colspan="3" style="text-align: right; padding: 12px;">Total Sales:</td>
                  <td style="text-align: right; padding: 12px;">Rs ${Number(totalSalesForRange || 0).toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </body>
        </html>
      `;

      const fileName = `Sales_Report_${moment().format('YYYYMMDD_HHmmss')}`;
      const options = {
        html,
        fileName: fileName,
        directory: 'Documents',
        width: 595,
      };

      const file = await RNHTMLtoPDF.convert(options);

      if (file && file.filePath) {
        // Move file to Downloads folder for better accessibility
        try {
          const downloadsPath = Platform.OS === 'ios'
            ? RNFS.DocumentDirectoryPath
            : RNFS.DownloadDirectoryPath || RNFS.ExternalDirectoryPath;

          if (downloadsPath && downloadsPath !== RNFS.DocumentDirectoryPath) {
            const destPath = `${downloadsPath}/${fileName}.pdf`;
            await RNFS.moveFile(file.filePath, destPath);

            Alert.alert(
              'PDF Downloaded',
              `Sales report saved to Downloads: ${destPath}`,
              [{ text: 'OK' }]
            );
          } else {
            Alert.alert(
              'PDF Downloaded',
              `Sales report saved to: ${file.filePath}`,
              [{ text: 'OK' }]
            );
          }
        } catch (moveError) {
          console.log('[SalesScreen] Could not move to Downloads, using default path:', moveError);
          Alert.alert(
            'PDF Downloaded',
            `Sales report saved to: ${file.filePath}`,
            [{ text: 'OK' }]
          );
        }
      } else {
        Alert.alert('Error', 'Failed to generate PDF.');
      }
    } catch (error) {
      console.error('[SalesScreen] PDF generation failed:', error);
      Alert.alert('Error', 'Failed to generate PDF. Please try again.');
    }
  }, [allSalesRows, fromDate, toDate, totalSalesForRange]);

  const onFromDateChange = (event, date) => {
    if (Platform.OS === 'android') {
      setShowFromDatePicker(false);
    }
    if (date) {
      setFromDate(date);
      setPage(1);
    }
  };

  const onToDateChange = (event, date) => {
    if (Platform.OS === 'android') {
      setShowToDatePicker(false);
    }
    if (date) {
      setToDate(date);
      setPage(1);
    }
  };

  const paginationItems = useMemo(() => {
    if (totalPages <= 1) return [1];
    if (totalPages <= 6) return Array.from({ length: totalPages }, (_, i) => i + 1);

    const items = [1];
    const left = Math.max(2, page - 1);
    const right = Math.min(totalPages - 1, page + 1);

    if (left > 2) items.push('...');
    for (let p = left; p <= right; p += 1) items.push(p);
    if (right < totalPages - 1) items.push('...');
    items.push(totalPages);
    return items;
  }, [page, totalPages]);

  const allSalesRows = useMemo(() => {
    const fromKey = fromDate ? moment(fromDate).format('YYYY-MM-DD') : null;
    const toKey = toDate ? moment(toDate).format('YYYY-MM-DD') : null;

    let rows = Array.isArray(salesRowsSource) ? [...salesRowsSource] : [];

    // Apply date filtering if at least one date is set
    if (fromKey || toKey) {
      rows = rows.filter(r => {
        const visitKey = r?.date ? moment(r.date).format('YYYY-MM-DD') : null;
        if (!visitKey) return false;

        // If both dates set, check range
        if (fromKey && toKey) {
          return visitKey >= fromKey && visitKey <= toKey;
        }
        // If only from date set, check >= fromDate
        if (fromKey) {
          return visitKey >= fromKey;
        }
        // If only to date set, check <= toDate
        if (toKey) {
          return visitKey <= toKey;
        }
        return true;
      });
    }

    rows.sort((a, b) => {
      const ad = a?.date ? new Date(a.date).getTime() : 0;
      const bd = b?.date ? new Date(b.date).getTime() : 0;
      return bd - ad;
    });

    if (searchText.trim().length > 0) {
      const q = searchText.toLowerCase().trim();
      rows = rows.filter(r => {
        return (
          String(r.clientName || '').toLowerCase().includes(q) ||
          String(r.clientPhone || '').toLowerCase().includes(q) ||
          String(r.clientId || '').toLowerCase().includes(q) ||
          String(r.billNumber || '').toLowerCase().includes(q)
        );
      });
    }

    console.log(
      '[SalesScreen] Filtered rows for date range:',
      fromKey || 'all',
      'to',
      toKey || 'all',
      'count:',
      rows.length,
    );

    return rows;
  }, [salesRowsSource, fromDate, toDate, searchText]);

  const totalPages = Math.max(1, Math.ceil(allSalesRows.length / PAGE_SIZE));

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return allSalesRows.slice(start, start + PAGE_SIZE);
  }, [allSalesRows, page]);

  const totalSalesForRange = useMemo(() => {
    return allSalesRows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  }, [allSalesRows]);

  const handleViewBill = useCallback(
    row => {
      const visit = row?.rawVisit;
      if (!visit) {
        Alert.alert('Bill Not Available', 'This record has no bill data attached.');
        return;
      }

      // Map visit data exactly like ClientHistoryScreen does
      const visitData = visit.visitData || visit;

      // Services extraction with proper fallback
      let services = [];
      if (Array.isArray(visitData.services)) {
        services = visitData.services;
      } else if (Array.isArray(visit.services)) {
        services = visit.services;
      }

      // Calculate subtotal from services if not provided
      const servicesSubtotal = services.reduce(
        (sum, service) => sum + (Number(service.price) || 0),
        0,
      );

      // Build mapped bill data exactly like ClientHistoryScreen
      const mappedBillData = {
        _id: visit._id,
        visitId: visit.visitId,
        services: services,
        subtotal: visit.subtotal || servicesSubtotal,
        discount: visit.discount || 0,
        notes: visit.notes || '',
        beautician: visit.specialist || '',
        clientName: row.clientName || visit.clientName || 'Guest',
        phoneNumber: row.clientPhone || visit.phoneNumber || '-',
        billNumber: visit.billNumber || visit.visitId || `BILL-${Date.now()}`,
        date: visit.date || new Date().toISOString(),
        totalBill:
          visit.finalAmount ||
          visit.totalBill ||
          servicesSubtotal - (visit.discount || 0),
      };

      setSelectedBillClient({
        name: mappedBillData.clientName,
        phoneNumber: mappedBillData.phoneNumber,
      });
      setSelectedBillData(mappedBillData);
      setIsViewBillModalVisible(true);
    },
    [],
  );

  const renderRow = ({ item, index }) => {
    return (
      <View style={[styles.row, index % 2 === 0 ? styles.rowEven : styles.rowOdd]}>
        <Text style={styles.clientNameCell} numberOfLines={1}>
          {item.clientName}
        </Text>
        <Text style={styles.clientPhoneCell} numberOfLines={1}>
          {item.clientPhone}
        </Text>
        <Text style={styles.clientIdCell} numberOfLines={1}>
          {item.clientId}
        </Text>
        <View style={styles.viewBillCell}>
          <TouchableOpacity
            style={styles.viewBillButton}
            onPress={() => handleViewBill(item)}
            disabled={isLoadingBill}
          >
            <Text style={styles.viewBillButtonText}>View Bill</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.amountCell} numberOfLines={1}>
          Rs {Number(item.amount || 0).toLocaleString()}
        </Text>
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#A98C27" />
        <Text style={styles.loadingText}>Loading sales...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerCenter}>
          <View style={styles.userInfo}>
            <Text style={styles.greeting}>Hello 👋</Text>
            <Text style={styles.userName}>{userName}</Text>
          </View>
          {/* <View style={styles.searchBarContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search sales..."
              placeholderTextColor="#A9A9A9"
              value={searchText}
              onChangeText={handleSearch}
              autoCapitalize="none"
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
            onPress={() => navigation.navigate('ManagerCartScreen')}
          >
            <View style={styles.cartIconWrapper}>
              <Ionicons
                name="cart-outline"
                size={width * 0.039}
                color="#fff"
              />
              {cartCount > 0 && (
                <View style={styles.cartBadge}>
                  <Text style={styles.cartBadgeText} numberOfLines={1}>
                    {cartCount}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
          <NotificationBell containerStyle={styles.notificationButton} />
          <Image
            source={profileImageSource}
            style={styles.profileImage}
            resizeMode="cover"
          />
        </View>
      </View>

      <View style={styles.contentArea}>
        <View style={styles.titleAndFilterRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.screenTitle}>Sales</Text>
            {isBackgroundLoading && (
              <ActivityIndicator size="small" color="#A98C27" style={{ marginLeft: 10 }} />
            )}
          </View>
          <View style={styles.dateRangeContainer}>
            <TouchableOpacity
              style={styles.datePickerButton}
              onPress={() => setShowFromDatePicker(true)}
            >
              <Ionicons
                name="calendar-outline"
                size={16}
                color="#fff"
                style={{ marginRight: 6 }}
              />
              <Text style={styles.datePickerButtonText}>
                From: {fromDate ? moment(fromDate).format('DD MMM') : '---'}
              </Text>
            </TouchableOpacity>
            <Text style={styles.dateRangeSeparator}>→</Text>
            <TouchableOpacity
              style={styles.datePickerButton}
              onPress={() => setShowToDatePicker(true)}
            >
              <Ionicons
                name="calendar-outline"
                size={16}
                color="#fff"
                style={{ marginRight: 6 }}
              />
              <Text style={styles.datePickerButtonText}>
                To: {toDate ? moment(toDate).format('DD MMM') : '---'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleClearDateFilter}
              style={styles.clearDateButton}
            >
              <Ionicons name="close-circle" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.actionRow}>
          <View style={styles.businessDayInfo}>
            <Text style={styles.businessDayLabel}>Current Business Day:</Text>
            <Text style={styles.businessDayValue}>
              {businessDay ? moment(businessDay).format('DD MMM YYYY') : '---'}
            </Text>
          </View>
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity
              style={styles.downloadPdfButton}
              onPress={handleDownloadPDF}
            >
              <Ionicons name="download-outline" size={16} color="#fff" style={{ marginRight: 4 }} />
              <Text style={styles.downloadPdfButtonText}>PDF</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.endDayButton}
              onPress={handleEndDay}
            >
              <Ionicons name="moon-outline" size={16} color="#fff" style={{ marginRight: 4 }} />
              <Text style={styles.endDayButtonText}>End Day</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          horizontal={true}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tableScrollContainer}
        >
          <View style={styles.tableContainer}>
            <View style={styles.tableHeader}>
              <Text style={styles.clientNameHeader}>Client Name</Text>
              <Text style={styles.clientPhoneHeader}>Client Num</Text>
              <Text style={styles.clientIdHeader}>CST Detail</Text>
              <Text style={styles.viewBillHeader}>View Bill</Text>
              <Text style={styles.amountHeader}>Amount</Text>
            </View>

            <FlatList
              data={paginatedRows}
              renderItem={renderRow}
              keyExtractor={item => item.key}
              nestedScrollEnabled
              ListEmptyComponent={
                <View style={styles.noDataContainer}>
                  <Text style={styles.noDataText}>No bills found for selected date.</Text>
                </View>
              }
              refreshing={refreshing}
              onRefresh={onRefresh}
            />
          </View>
        </ScrollView>

        <View style={styles.paginationContainer}>
          <TouchableOpacity
            style={[styles.pageButton, page === 1 && styles.pageButtonDisabled]}
            onPress={() => page > 1 && setPage(p => p - 1)}
            disabled={page === 1}
          >
            <Text style={styles.pageButtonText}>Prev</Text>
          </TouchableOpacity>
          <View style={styles.pageNumbersContainer}>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
              <TouchableOpacity
                key={`pg-${n}`}
                style={[styles.pageNumber, n === page && styles.pageNumberActive]}
                onPress={() => setPage(n)}
              >
                <Text style={[styles.pageNumberText, n === page && styles.pageNumberTextActive]}>
                  {n}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            style={[styles.pageButton, page === totalPages && styles.pageButtonDisabled]}
            onPress={() => page < totalPages && setPage(p => p + 1)}
            disabled={page === totalPages}
          >
            <Text style={styles.pageButtonText}>Next</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.totalBar}>
          <Text style={styles.totalBarTitle}>Total Sales</Text>
          <Text style={styles.totalBarAmount}>Rs {Number(totalSalesForRange || 0).toLocaleString()}</Text>
        </View>
      </View>

      {showFromDatePicker && (
        <DateTimePicker
          value={fromDate || new Date()}
          mode="date"
          display="default"
          onChange={onFromDateChange}
        />
      )}
      {showToDatePicker && (
        <DateTimePicker
          value={toDate || new Date()}
          mode="date"
          display="default"
          onChange={onToDateChange}
        />
      )}

      <ViewBillModal
        isVisible={isViewBillModalVisible}
        onClose={() => {
          setIsViewBillModalVisible(false);
          setSelectedBillData(null);
          setSelectedBillClient(null);
        }}
        billData={selectedBillData}
        client={selectedBillClient}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e1f20ff',
    paddingHorizontal: width * 0.02,
    paddingTop: height * 0.03,
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
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: width * 0.001,
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
    paddingHorizontal: width * 0.006,
    flex: 1,
    minWidth: width * 0.22,
    maxWidth: width * 0.36,
    height: height * 0.04,
    borderWidth: 1,
    borderColor: '#4A4A4A',
  },
  searchIcon: {
    marginRight: width * 0.01,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: width * 0.018,
    paddingVertical: 0,
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
  cartIconWrapper: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadge: {
    position: 'absolute',
    top: -height * 0.008,
    right: -width * 0.01,
    minWidth: width * 0.022,
    height: width * 0.022,
    borderRadius: width * 0.011,
    paddingHorizontal: width * 0.004,
    backgroundColor: '#ff3b30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadgeText: {
    color: '#fff',
    fontSize: width * 0.012,
    fontWeight: '700',
  },
  notificationButton: {
    backgroundColor: '#2A2D32',
    borderRadius: 9,
    padding: 0,
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
  contentArea: {
    flex: 1,
    paddingHorizontal: width * 0.005,
  },
  titleAndFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: height * 0.02,
  },
  screenTitle: {
    color: '#fff',
    fontSize: width * 0.029,
    fontWeight: '600',
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2D32',
    borderRadius: 10,
    paddingVertical: height * 0.009,
    paddingHorizontal: width * 0.02,
    borderWidth: 1,
    borderColor: '#4A4A4A',
  },
  datePickerButtonText: {
    color: '#fff',
    fontSize: width * 0.016,
    fontWeight: '500',
  },
  datePickerIcon: {
    marginLeft: width * 0.008,
  },
  dateRangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: width * 0.01,
  },
  dateRangeSeparator: {
    color: '#fff',
    fontSize: width * 0.018,
    fontWeight: '600',
  },
  clearDateButton: {
    padding: 4,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2A2D32',
    borderRadius: 12,
    paddingVertical: height * 0.012,
    paddingHorizontal: width * 0.02,
    marginBottom: height * 0.015,
  },
  businessDayInfo: {
    flexDirection: 'column',
  },
  businessDayLabel: {
    color: '#A9A9A9',
    fontSize: width * 0.012,
    marginBottom: 2,
  },
  businessDayValue: {
    color: '#A98C27',
    fontSize: width * 0.018,
    fontWeight: '700',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: width * 0.01,
  },
  endDayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#A98C27',
    borderRadius: 8,
    paddingVertical: height * 0.008,
    paddingHorizontal: width * 0.015,
  },
  endDayButtonText: {
    color: '#fff',
    fontSize: width * 0.014,
    fontWeight: '600',
  },
  downloadPdfButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#A98C27',
    borderRadius: 8,
    paddingVertical: height * 0.008,
    paddingHorizontal: width * 0.015,
  },
  downloadPdfButtonText: {
    color: '#fff',
    fontSize: width * 0.014,
    fontWeight: '600',
  },
  tableScrollContainer: {
    paddingBottom: height * 0.01,
    flexGrow: 1,
  },
  tableContainer: {
    width: '100%',
    minWidth: TABLE_MIN_WIDTH,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#2A2D32',
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: height * 0.015,
    paddingHorizontal: width * 0.01,
    backgroundColor: '#24262B',
  },
  clientNameHeader: {
    flex: 2.2,
    minWidth: 100,
    color: '#fff',
    fontWeight: '500',
    fontSize: width * 0.015,
  },
  clientPhoneHeader: {
    flex: 2.2,
    minWidth: 100,
    color: '#fff',
    fontWeight: '500',
    fontSize: width * 0.015,
  },
  clientIdHeader: {
    flex: 1.8,
    minWidth: 80,
    color: '#fff',
    fontWeight: '500',
    fontSize: width * 0.015,
  },
  viewBillHeader: {
    flex: 1.8,
    minWidth: 80,
    color: '#fff',
    fontWeight: '500',
    fontSize: width * 0.015,
    textAlign: 'center',
  },
  amountHeader: {
    flex: 2,
    minWidth: 85,
    color: '#fff',
    fontWeight: '500',
    fontSize: width * 0.015,
    textAlign: 'right',
    paddingRight: 8,
    marginRight: 15,
  },
  row: {
    flexDirection: 'row',
    paddingVertical: height * 0.015,
    paddingHorizontal: width * 0.01,
    alignItems: 'center',
  },
  rowEven: {
    backgroundColor: '#2A2D32',
  },
  rowOdd: {
    backgroundColor: '#26292E',
  },
  clientNameCell: {
    flex: 2.2,
    minWidth: 100,
    color: '#fff',
    fontSize: width * 0.016,
  },
  clientPhoneCell: {
    flex: 2.2,
    minWidth: 100,
    color: '#fff',
    fontSize: width * 0.016,
  },
  clientIdCell: {
    flex: 1.8,
    minWidth: 80,
    color: '#fff',
    fontSize: width * 0.016,
  },
  viewBillCell: {
    flex: 1.8,
    minWidth: 80,
    alignItems: 'center',
  },
  viewBillButton: {
    backgroundColor: '#A98C27',
    paddingVertical: height * 0.008,
    paddingHorizontal: width * 0.02,
    borderRadius: 8,
  },
  viewBillButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: width * 0.015,
  },
  amountCell: {
    flex: 2,
    minWidth: 85,
    color: '#fff',
    fontWeight: '700',
    textAlign: 'right',
    fontSize: width * 0.016,
    paddingRight: 8,
    marginRight: 15,
  },
  paginationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: height * 0.02,
    gap: width * 0.01,
  },
  pageButton: {
    backgroundColor: '#2A2D32',
    paddingVertical: height * 0.012,
    paddingHorizontal: width * 0.02,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#4A4A4A',
  },
  pageButtonDisabled: { opacity: 0.5 },
  pageButtonText: { color: '#fff', fontWeight: '600', fontSize: width * 0.014 },
  pageNumbersContainer: { flexDirection: 'row', alignItems: 'center', gap: width * 0.005 },
  pageNumber: {
    backgroundColor: '#2A2D32',
    paddingVertical: height * 0.008,
    paddingHorizontal: width * 0.012,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#4A4A4A',
    marginHorizontal: width * 0.002,
  },
  pageNumberActive: { backgroundColor: '#A98C27', borderColor: '#A98C27' },
  pageNumberText: { color: '#fff', fontSize: width * 0.014 },
  pageNumberTextActive: { color: '#fff', fontWeight: '700' },
  totalBar: {
    marginTop: height * 0.018,
    marginBottom: height * 0.025,
    borderRadius: 12,
    paddingVertical: height * 0.016,
    paddingHorizontal: width * 0.02,
    backgroundColor: '#2A2D32',
    borderWidth: 1,
    borderColor: '#4A4A4A',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalBarTitle: {
    color: '#fff',
    fontSize: width * 0.02,
    fontWeight: '700',
  },
  totalBarAmount: {
    color: '#fff',
    fontSize: width * 0.025,
    fontWeight: '800',
  },
  noDataContainer: {
    paddingVertical: height * 0.03,
    alignItems: 'center',
  },
  noDataText: {
    color: '#A9A9A9',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#161719',
  },
  loadingText: {
    color: '#fff',
    marginTop: 12,
  },
});

export default SalesScreen;
