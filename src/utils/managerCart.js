import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';

const MANAGER_CART_KEY = 'MANAGER_UNIVERSAL_CART_V1';

export const MANAGER_CART_UPDATED_EVENT = 'MANAGER_CART_UPDATED_EVENT';

const emitCartUpdated = items => {
  try {
    const count = Array.isArray(items) ? items.length : 0;
    DeviceEventEmitter.emit(MANAGER_CART_UPDATED_EVENT, { count });
  } catch (error) {
    console.error('[ManagerCart] emitCartUpdated error:', error);
  }
};

export const getManagerCartItems = async () => {
  try {
    const raw = await AsyncStorage.getItem(MANAGER_CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('[ManagerCart] getManagerCartItems error:', error);
    return [];
  }
};

export const setManagerCartItems = async items => {
  try {
    const safeItems = items || [];
    await AsyncStorage.setItem(MANAGER_CART_KEY, JSON.stringify(safeItems));
    emitCartUpdated(safeItems);
  } catch (error) {
    console.error('[ManagerCart] setManagerCartItems error:', error);
  }
};

export const addManagerCartItem = async item => {
  try {
    const items = await getManagerCartItems();
    const baseRaw = item && item.raw ? item.raw : item;
    const safeItem = {
      id: item.id || item._id || baseRaw?.id || baseRaw?._id || `temp-${Date.now()}`,
      type: item.type || baseRaw?.type || 'service',
      name:
        item.name ||
        baseRaw?.name ||
        baseRaw?.subServiceName ||
        baseRaw?.dealName ||
        'N/A',
      price:
        item.price != null
          ? Number(item.price)
          : baseRaw?.price != null
          ? Number(baseRaw.price)
          : 0,
      raw: baseRaw,
    };
    const exists = items.some(existing => existing.id === safeItem.id && existing.type === safeItem.type);
    if (exists) {
      emitCartUpdated(items);
      return items;
    }
    const updated = [...items, safeItem];
    await setManagerCartItems(updated);
    return updated;
  } catch (error) {
    console.error('[ManagerCart] addManagerCartItem error:', error);
    return [];
  }
};

export const removeManagerCartItem = async id => {
  try {
    const items = await getManagerCartItems();
    const updated = items.filter(item => item.id !== id);
    await setManagerCartItems(updated);
    return updated;
  } catch (error) {
    console.error('[ManagerCart] removeManagerCartItem error:', error);
    return [];
  }
};

export const clearManagerCart = async () => {
  try {
    await setManagerCartItems([]);
    emitCartUpdated([]);
  } catch (error) {
    console.error('[ManagerCart] clearManagerCart error:', error);
  }
};
