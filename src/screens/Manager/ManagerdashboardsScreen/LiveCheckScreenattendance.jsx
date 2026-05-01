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
import Svg, { Circle, Path, Rect } from 'react-native-svg';

const { width } = Dimensions.get('window');

const LiveCheckScreenAttendance = ({ navigation }) => {
  const handleStartLiveCheck = () => {
    navigation.navigate('AttendanceFaceRecognitionScreen');
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#1F1F22', '#2D2D31']} style={styles.gradient}>
        <View style={styles.content}>
          <Text style={styles.title}>Attendance Live Check......</Text>
          <Text style={styles.subtitle}>
            Please look into the camera and hold still
          </Text>

          {/* Center Icon */}
          <View style={styles.iconWrapper}>
            <View style={styles.outerCircle}>
              <View style={styles.middleCircle}>
                <View style={styles.innerCircle}>
                  <Svg width={40} height={40} viewBox="0 0 80 80">
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
            You have <Text style={styles.boldText}>5 minutes</Text> to complete
            the follow instruction for <Text style={styles.boldText}>move</Text>{' '}
            or <Text style={styles.boldText}>speak</Text>
          </Text>

          {/* Start Button */}
          <TouchableOpacity
            onPress={handleStartLiveCheck}
            activeOpacity={0.8}
            style={styles.button}
          >
            <Text style={styles.buttonText}>Start Live Check</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
};

export default LiveCheckScreenAttendance;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1F1F22',
  },
  gradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  content: {
    alignItems: 'center',
    width: '100%',
  },
  title: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#AFAFAF',
    marginBottom: 40,
    textAlign: 'center',
  },
  iconWrapper: {
    marginBottom: 28,
  },
  outerCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#2D2D31',
    justifyContent: 'center',
    alignItems: 'center',
  },
  middleCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#909092',
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#DDAD25',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerText: {
    fontSize: 12,
    color: '#AFAFAF',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 30,
  },
  boldText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  button: {
    backgroundColor: '#C19D3F',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 48,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
});
