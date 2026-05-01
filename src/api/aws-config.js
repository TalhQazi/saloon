// AWS Configuration for Rekognition
import AWS from 'aws-sdk';
import { Buffer } from 'buffer';

// Polyfill Buffer for React Native
if (typeof global !== 'undefined' && typeof global.Buffer === 'undefined') {
  // @ts-ignore
  global.Buffer = Buffer;
}

// AWS Configuration
const awsConfig = {
  region: 'us-east-1', // Change to your preferred region
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '', // Replace with your actual access key
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '', // Replace with your actual secret key
  },
};

// Initialize AWS services
AWS.config.update(awsConfig);

// Initialize Rekognition service
export const rekognition = new AWS.Rekognition();

// Face Collection Name for your salon
export const FACE_COLLECTION_NAME = 'sarte-salon-employees';

// AWS Regions available for Rekognition
export const SUPPORTED_REGIONS = [
  'us-east-1',
  'us-east-2',
  'us-west-1',
  'us-west-2',
  'eu-west-1',
  'eu-west-2',
  'eu-central-1',
  'ap-southeast-2',
  'ap-northeast-1',
];

// Environment configuration
export const isProduction = __DEV__ ? false : true;

// Logging configuration
export const logAWS = (message, data = null) => {
  if (__DEV__) {
    console.log(`[AWS Rekognition] ${message}`, data);
  }
};

export default awsConfig;
