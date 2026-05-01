import React from 'react';
import { View, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { useNotifications } from '../context/NotificationContext';

const { width } = Dimensions.get('window');

const NotificationBell = ({ size = width * 0.037, containerStyle }) => {
  const navigation = useNavigation();
  const { unreadCount, refreshNotifications } = useNotifications();

  return (
    <TouchableOpacity
      onPress={() => {
        navigation.navigate('NotificationsScreen');
        if (typeof refreshNotifications === 'function') {
          refreshNotifications();
        }
      }}
      style={[styles.button, containerStyle]}
    >
      <MaterialCommunityIcons name="bell-outline" size={size} color="#fff" />
      {!!unreadCount && unreadCount > 0 && <View style={styles.dot} />}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#2A2D32',
    borderRadius: 8,
    height: width * 0.058,
    width: width * 0.058,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  dot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF3B30',
  },
});

export default NotificationBell;
