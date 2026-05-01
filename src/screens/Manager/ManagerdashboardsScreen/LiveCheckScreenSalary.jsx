import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Circle, Path } from 'react-native-svg';

const { width } = Dimensions.get('window');

const LiveCheckScreenSalary = ({ navigation }) => {
  const handleStartFaceScan = () => {
    navigation.navigate('AdvanceSalaryFaceRecognition');
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#1F1F22', '#2D2D31']} style={styles.gradient}>
        <View style={styles.content}>
          <Text style={styles.title}>Face Scan for Request</Text>
          <Text style={styles.subtitle}>
            Please look into the camera and hold still
          </Text>

          {/* Center Icon */}
          <View style={styles.iconWrapper}>
            <View style={styles.outerCircle}>
              <View style={styles.middleCircle}>
                <View style={styles.innerCircle}>
                  <Svg width={60} height={60} viewBox="0 0 80 80">
                    <Circle cx="40" cy="40" r="40" fill="#DDAD25" />
                    <Circle cx="31" cy="30" r="4" fill="#1F1F22" />
                    <Circle cx="49" cy="30" r="4" fill="#1F1F22" />
                    <Path
                      d="M28 50 C34 56 46 56 52 50"
                      stroke="#1F1F22"
                      strokeWidth="3"
                      strokeLinecap="round"
                      fill="none"
                    />
                  </Svg>
                </View>
              </View>
            </View>
          </View>

          {/* Timer Text */}
          <Text style={styles.timerText}>
            Face recognition will start in 3 seconds
          </Text>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.startButton}
              onPress={handleStartFaceScan}
            >
              <Text style={styles.startButtonText}>Start Face Scan</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.backButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#CCCCCC',
    textAlign: 'center',
    marginBottom: 40,
  },
  iconWrapper: {
    marginBottom: 40,
  },
  outerCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(221, 173, 37, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  middleCircle: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(221, 173, 37, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(221, 173, 37, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerText: {
    fontSize: 14,
    color: '#A98C27',
    marginBottom: 40,
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    gap: 15,
  },
  startButton: {
    backgroundColor: '#A98C27',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    alignItems: 'center',
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backButton: {
    backgroundColor: 'transparent',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#A98C27',
  },
  backButtonText: {
    color: '#A98C27',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default LiveCheckScreenSalary;
