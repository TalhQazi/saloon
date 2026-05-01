import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';

const SubServiceCard = ({ subService }) => {
  return (
    <View style={styles.card}>
      {subService.image && (
        <Image source={{ uri: subService.image }} style={styles.image} />
      )}
      <Text style={styles.name}>{subService.name}</Text>
      <Text style={styles.price}>PKR {subService.price}</Text>
      <Text style={styles.time}>{subService.time}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#222',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: 100,
    borderRadius: 8,
    marginBottom: 8,
  },
  name: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  price: { color: '#aaa', marginTop: 4 },
  time: { color: '#aaa', fontSize: 12 },
});

export default SubServiceCard;
