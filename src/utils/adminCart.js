import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';

const ADMIN_CART_KEY = 'ADMIN_UNIVERSAL_CART_V1';

export const ADMIN_CART_UPDATED_EVENT = 'ADMIN_CART_UPDATED_EVENT';

const emitCartUpdated = items => {
  try {
    const count = Array.isArray(items) ? items.length : 0;
    DeviceEventEmitter.emit(ADMIN_CART_UPDATED_EVENT, { count });
  } catch (err) {
    console.error('[AdminCart] emitCartUpdated error:', err);
  }
};

export const getAdminCartItems = async () => {
  try {
    const raw = await AsyncStorage.getItem(ADMIN_CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('[AdminCart] getAdminCartItems error:', err);
    return [];
  }
};

export const setAdminCartItems = async items => {
  try {
    const safeItems = items || [];
    await AsyncStorage.setItem(ADMIN_CART_KEY, JSON.stringify(safeItems));
    emitCartUpdated(safeItems);
  } catch (err) {
    console.error('[AdminCart] setAdminCartItems error:', err);
  }
};

export const addAdminCartItem = async item => {
  try {
    const items = await getAdminCartItems();
    const safeItem = {
      id: item.id || item._id || `temp-${Date.now()}`,
      type: item.type || 'service',
      name: item.name || item.subServiceName || item.dealName || 'N/A',
      price: Number(item.price || 0),
      raw: item,
    };
    const exists = items.some(existing => existing.id === safeItem.id && existing.type === safeItem.type);
    if (exists) {
      emitCartUpdated(items);
      return items;
    }
    const updated = [...items, safeItem];
    await setAdminCartItems(updated);
    return updated;
  } catch (err) {
    console.error('[AdminCart] addAdminCartItem error:', err);
    return [];
  }
};

export const removeAdminCartItem = async id => {
  try {
    const items = await getAdminCartItems();
    const updated = items.filter(item => item.id !== id);
    await setAdminCartItems(updated);
    return updated;
  } catch (err) {
    console.error('[AdminCart] removeAdminCartItem error:', err);
    return [];
  }
};

export const clearAdminCart = async () => {
  try {
    await setAdminCartItems([]);
    emitCartUpdated([]);
  } catch (err) {
    console.error('[AdminCart] clearAdminCart error:', err);
  }
};
