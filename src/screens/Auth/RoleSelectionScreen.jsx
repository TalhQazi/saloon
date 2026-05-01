import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Image } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

// Assuming your logo is in 'assets/images/your_logo.png'
// Adjust the path according to your actual folder structure
import YourLogo from '../../assets/images/logo.png'; 

const { height, width } = Dimensions.get('window');

const RoleSelectionScreen = ({ navigation }) => {
  return (
    <LinearGradient
      colors={['#2A2D32', '#161719']}
      style={styles.container}
    >
      {/* Logo Picture */}
      <Image
        source={YourLogo} // Use the imported image variable here
        style={styles.logo}
        resizeMode="contain"
      />

      {/* Title */}
      <Text style={styles.title}>Please select your role to continue</Text>

      {/* Buttons Container for Horizontal Layout */}
      <View style={styles.buttonsContainer}>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('AdminAuthGate')}
        >
          <Text style={styles.buttonText}>Login as Admin</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('ManagerDashboard')}
        >
          <Text style={styles.buttonText}>Login as Manager</Text>
        </TouchableOpacity>
      </View>

    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: width * 0.06,
  },
  logo: {
    width: width * 0.6,
    height: height * 0.3,
    marginBottom: height * 0.05,
    marginTop: -height * 0.1,
  },
  title: {
    fontSize: height * 0.020,
    fontFamily: 'Sans-serif',
    fontWeight: 'normal',
    color: '#fff',
    marginBottom: height * 0.05,
    textAlign: 'center',
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: width * 0.02,
    marginBottom: height * 0.03,
  },
  button: {
    backgroundColor: '#A99226',
    paddingVertical: height * 0.020,
    paddingHorizontal: width * 0.09,
    borderRadius: 10,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: width * 0.01,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  buttonText: {
    color: '#fff',
    fontSize: height * 0.02,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default RoleSelectionScreen;
