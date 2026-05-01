import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  FlatList,
  ActivityIndicator,
  Alert,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BLEPrinter } from 'react-native-thermal-receipt-printer-image-qr';
import { printBillToThermal, setThermalPrinterAddress, getThermalPrinterAddress } from '../../../utils/thermalPrinter';

const { width, height } = Dimensions.get('window');

const PRINTER_MAC_STORAGE_KEY = 'THERMAL_PRINTER_MAC';

const PrinterSettingsScreen = () => {
  const [activeTab, setActiveTab] = useState('attached'); // 'attached' | 'scan'
  const [devices, setDevices] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const [selectedMac, setSelectedMac] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [defaultMac, setDefaultMac] = useState(null);

  const requestBluetoothPermissions = useCallback(async () => {
    if (Platform.OS !== 'android') {
      return true;
    }

    try {
      // Android 12+ requires explicit BLUETOOTH_* runtime permissions
      if (Platform.Version >= 31) {
        const result = await PermissionsAndroid.requestMultiple([
          'android.permission.BLUETOOTH_CONNECT',
          'android.permission.BLUETOOTH_SCAN',
        ]);

        const connectGranted =
          result['android.permission.BLUETOOTH_CONNECT'] ===
          PermissionsAndroid.RESULTS.GRANTED;
        const scanGranted =
          result['android.permission.BLUETOOTH_SCAN'] ===
          PermissionsAndroid.RESULTS.GRANTED;

        if (!connectGranted || !scanGranted) {
          Alert.alert(
            'Bluetooth Permission Required',
            'Bluetooth permissions are required to scan and list printers. Please grant them in system settings.',
          );
          return false;
        }
        return true;
      }

      // Older Android versions: BLEPrinter may work without extra permissions,
      // but if needed you can also request location here.
      return true;
    } catch (error) {
      console.error('[PrinterSettings] Bluetooth permission error:', error);
      Alert.alert(
        'Permission Error',
        'Could not request Bluetooth permissions. Please check your settings.',
      );
      return false;
    }
  }, []);

  const loadSavedPrinter = useCallback(async () => {
    try {
      const savedMac = await AsyncStorage.getItem(PRINTER_MAC_STORAGE_KEY);
      if (savedMac) {
        setDefaultMac(savedMac);
        setSelectedMac(savedMac);
        setThermalPrinterAddress(savedMac);
        setStatusMessage(`Loaded saved printer: ${savedMac}`);
      }
    } catch (error) {
      console.error('[PrinterSettings] Failed to load saved printer MAC:', error);
    }
  }, []);

  useEffect(() => {
    // Load any previously saved default printer
    loadSavedPrinter();
    // Proactively ask for Bluetooth permissions when user opens this screen
    requestBluetoothPermissions();
  }, [loadSavedPrinter, requestBluetoothPermissions]);

  const handleScanPrinters = useCallback(async () => {
    try {
      const hasPermission = await requestBluetoothPermissions();
      if (!hasPermission) {
        return;
      }

      setIsScanning(true);
      setStatusMessage('Scanning for Bluetooth printers...');

      await BLEPrinter.init();
      const foundDevices = await BLEPrinter.getDeviceList();

      console.log('[PrinterSettings] Raw devices from BLEPrinter:', foundDevices);

      const normalizedDevices = (foundDevices || []).map(d => {
        const name = d.device_name || d.name || 'Unknown Printer';
        const address =
          d.inner_mac_address || d.address || d.macAddress || d.id || 'UNKNOWN';
        return {
          ...d,
          name,
          address,
        };
      });

      setDevices(normalizedDevices);
      if (!normalizedDevices || normalizedDevices.length === 0) {
        setStatusMessage('No Bluetooth printers found. Please make sure the printer is on and paired.');
      } else {
        setStatusMessage(`Found ${normalizedDevices.length} device(s). Tap one to select.`);
      }
    } catch (error) {
      console.error('[PrinterSettings] Scan error:', error);
      Alert.alert(
        'Scan Error',
        'Failed to scan for Bluetooth printers. Please make sure Bluetooth is enabled and try again.',
      );
    } finally {
      setIsScanning(false);
    }
  }, []);

  const handleSelectDevice = useCallback(device => {
    if (!device) {
      return;
    }

    const address =
      device.inner_mac_address || device.address || device.macAddress || device.id;
    const name = device.device_name || device.name || 'Unknown Printer';

    if (!address) {
      console.log('[PrinterSettings] Device without usable address tapped:', device);
      return;
    }

    console.log('[PrinterSettings] Selected device:', { name, address });
    setSelectedMac(address);
    setStatusMessage(`Selected printer: ${name} (${address})`);
  }, []);

  const handleSavePrinter = useCallback(async macToSave => {
    try {
      const mac = macToSave || selectedMac;
      if (!mac) {
        Alert.alert('No Printer Selected', 'Please scan and select a printer first.');
        return;
      }

      await AsyncStorage.setItem(PRINTER_MAC_STORAGE_KEY, mac);
      setThermalPrinterAddress(mac);
      setDefaultMac(mac);
      setStatusMessage(`Saved printer: ${mac}`);
      Alert.alert('Printer Saved', 'Default thermal printer has been saved successfully.');
    } catch (error) {
      console.error('[PrinterSettings] Save error:', error);
      Alert.alert('Save Error', 'Failed to save printer. Please try again.');
    }
  }, [selectedMac]);

  const renderDeviceItem = ({ item }) => {
    const mac =
      item.inner_mac_address || item.address || item.macAddress || item.id;
    const isSelected = mac === selectedMac;
    return (
      <TouchableOpacity
        style={[styles.deviceItem, isSelected && styles.deviceItemSelected]}
        onPress={() => handleSelectDevice(item)}
      >
        <View style={styles.deviceInfoRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.deviceName}>{item.device_name || item.name || 'Unknown Printer'}</Text>
            <Text style={styles.deviceAddress}>{mac || 'UNKNOWN'}</Text>
            {isSelected && <Text style={styles.deviceSelectedLabel}>Selected</Text>}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Thermal Printer Settings</Text>
      {/* Top tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'attached' && styles.tabButtonActive,
          ]}
          onPress={() => setActiveTab('attached')}
        >
          <Text
            style={[
              styles.tabButtonText,
              activeTab === 'attached' && styles.tabButtonTextActive,
            ]}
          >
            Attached Devices
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'scan' && styles.tabButtonActive,
          ]}
          onPress={() => setActiveTab('scan')}
        >
          <Text
            style={[
              styles.tabButtonText,
              activeTab === 'scan' && styles.tabButtonTextActive,
            ]}
          >
            Scan for Devices
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'attached' ? (
        <View style={{ marginTop: height * 0.02 }}>
          {defaultMac ? (
            <Text style={[styles.subtitle, { textAlign: 'center' }]}>
              Default device: {defaultMac}
            </Text>
          ) : (
            <Text style={[styles.subtitle, { textAlign: 'center' }]}>
              No device has been selected as default.
            </Text>
          )}
        </View>
      ) : (
        <>
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[
                styles.button,
                !isScanning ? styles.primaryButton : styles.buttonDisabled,
              ]}
              onPress={handleScanPrinters}
              disabled={isScanning}
            >
              {isScanning ? (
                <ActivityIndicator color="#161719" />
              ) : (
                <Text style={styles.buttonText}>Scan for Printers</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                selectedMac ? styles.primaryButton : styles.buttonDisabled,
              ]}
              onPress={() => handleSavePrinter()}
              disabled={!selectedMac}
            >
              <Text style={styles.buttonText}>Save as Default</Text>
            </TouchableOpacity>
          </View>

          {statusMessage ? (
            <Text style={styles.statusText}>{statusMessage}</Text>
          ) : null}

          <FlatList
            data={devices}
            keyExtractor={item => item.address}
            renderItem={renderDeviceItem}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              !isScanning && (
                <Text style={styles.emptyText}>
                  No devices listed. Tap "Scan for Printers" to search.
                </Text>
              )
            }
          />
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: width * 0.02,
    backgroundColor: '#161719',
  },
  title: {
    fontSize: width * 0.025,
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: height * 0.01,
  },
  subtitle: {
    fontSize: width * 0.016,
    color: '#A9A9A9',
    marginBottom: height * 0.02,
  },
  tabRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: height * 0.02,
  },
  tabButton: {
    paddingVertical: height * 0.012,
    paddingHorizontal: width * 0.025,
    borderRadius: 6,
    marginRight: width * 0.015,
    backgroundColor: '#000',
  },
  tabButtonActive: {
    backgroundColor: '#FFD700',
  },
  tabButtonText: {
    color: '#fff',
    fontSize: width * 0.017,
    fontWeight: '600',
  },
  tabButtonTextActive: {
    color: '#fff',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: height * 0.02,
  },
  button: {
    flex: 1,
    paddingVertical: height * 0.015,
    marginHorizontal: width * 0.005,
    borderRadius: 8,
    backgroundColor: '#000',
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#FFD700',
  },
  buttonDisabled: {
    backgroundColor: '#000',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: width * 0.016,
  },
  statusText: {
    color: '#A9A9A9',
    fontSize: width * 0.015,
    marginBottom: height * 0.01,
  },
  listContent: {
    paddingBottom: height * 0.02,
  },
  deviceItem: {
    paddingVertical: height * 0.015,
    paddingHorizontal: width * 0.015,
    backgroundColor: '#1F1F1F',
    borderRadius: 8,
    marginBottom: height * 0.01,
  },
  deviceItemSelected: {
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  deviceName: {
    color: '#fff',
    fontSize: width * 0.018,
    fontWeight: '600',
    marginBottom: height * 0.005,
  },
  deviceAddress: {
    color: '#A9A9A9',
    fontSize: width * 0.015,
  },
  deviceSelectedLabel: {
    marginTop: height * 0.005,
    color: '#FFD700',
    fontSize: width * 0.014,
    fontWeight: '600',
  },
  emptyText: {
    color: '#A9A9A9',
    fontSize: width * 0.016,
    textAlign: 'center',
    marginTop: height * 0.05,
  },
});

export default PrinterSettingsScreen;
