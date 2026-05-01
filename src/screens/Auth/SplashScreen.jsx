// src/screens/Auth/SplashScreen.js
import React, { useEffect } from 'react';
import { StyleSheet, Dimensions, StatusBar } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Video from 'react-native-video'; // ✅ Correct import

import video from '../../assets/icons/splash.mp4';

const { height, width } = Dimensions.get('window');

const SplashScreen = ({ navigation }) => {
  useEffect(() => {
    StatusBar.setHidden(true);
    const timer = setTimeout(() => {
      StatusBar.setHidden(false);
      navigation.replace('LiveCheck');
    }, 4000);
    return () => {
      clearTimeout(timer);
      StatusBar.setHidden(false);
    };
  }, [navigation]);

  const gradientColors = ['#000000', '#000000'];

  return (
    <LinearGradient
      colors={gradientColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <Video
        source={video}
        style={styles.video}
        resizeMode="cover"
        repeat={false}
        onEnd={() => navigation.replace('LiveCheck')}
        muted={false}
        paused={false}
        playInBackground={false}
        playWhenInactive={false}
        ignoreSilentSwitch="obey"
      />
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  video: {
    width: width,
    height: height,
    position: 'absolute',
  },
});

export default SplashScreen;
