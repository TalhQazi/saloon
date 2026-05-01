// src/api/gst.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from './config';
import { getAuthToken } from '../utils/authUtils';

const STORAGE_KEY = 'gst_config_v1';

export async function getGstConfig() {
  try {
    const token = await getAuthToken();
    if (token) {
      const res = await fetch(`${BASE_URL}/gst/config`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        return data;
      }
    }
  } catch (error) {
    // fall back to storage
  }
  const local = await AsyncStorage.getItem(STORAGE_KEY);
  if (local) return JSON.parse(local);
  const defaultConfig = {
    enabled: true,
    ratePercent: 7,
    applyTo: { services: true, products: true, deals: true },
    updatedAt: null,
    updatedBy: null,
  };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(defaultConfig));
  return defaultConfig;
}

export async function saveGstConfig(config) {
  const payload = { ...config, ratePercent: Number(config.ratePercent) };
  try {
    const token = await getAuthToken();
    if (token) {
      const res = await fetch(`${BASE_URL}/gst/config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        return data;
      }
    }
  } catch (error) {
    // ignore and use local
  }
  const data = {
    ...payload,
    updatedAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  return data;
}
