// Environment Configuration
const ENV = {
  development: {
    AWS_REGION: 'us-east-1',
    AWS_ACCESS_KEY_ID: 'YOUR_DEV_ACCESS_KEY_ID',
    AWS_SECRET_ACCESS_KEY: 'YOUR_DEV_SECRET_ACCESS_KEY',
    FACE_COLLECTION_NAME: 'sarte-salon-employees-dev',
    RECOGNITION_THRESHOLD: 90,
    API_TIMEOUT: 30000,
  },
  production: {
    AWS_REGION: 'us-east-1',
    AWS_ACCESS_KEY_ID: 'YOUR_PROD_ACCESS_KEY_ID',
    AWS_SECRET_ACCESS_KEY: 'YOUR_PROD_SECRET_ACCESS_KEY',
    FACE_COLLECTION_NAME: 'sarte-salon-employees-prod',
    RECOGNITION_THRESHOLD: 95,
    API_TIMEOUT: 15000,
  },
  staging: {
    AWS_REGION: 'us-east-1',
    AWS_ACCESS_KEY_ID: 'YOUR_STAGING_ACCESS_KEY_ID',
    AWS_SECRET_ACCESS_KEY: 'YOUR_STAGING_SECRET_ACCESS_KEY',
    FACE_COLLECTION_NAME: 'sarte-salon-employees-staging',
    RECOGNITION_THRESHOLD: 90,
    API_TIMEOUT: 20000,
  },
};

// Get current environment
const getEnvironment = () => {
  if (__DEV__) return 'development';
  // You can add logic here to detect staging vs production
  return 'production';
};

// Get current config
export const getConfig = () => {
  const env = getEnvironment();
  return ENV[env] || ENV.development;
};

// Export individual config values
export const config = getConfig();

export default config;

