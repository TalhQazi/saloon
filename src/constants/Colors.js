// src/constants/Colors.js
// Consistent color scheme for the entire app

export const Colors = {
  // Primary Colors
  primary: '#A98C27',        // Gold color for buttons and accents
  primaryDark: '#8B7A1F',    // Darker gold for pressed states
  
  // Background Colors
  sidebarBg: '#2A2D32',      // Sidebar background
  mainBg: '#161719',         // Main content background (dark)
  cardBg: '#2A2D32',         // Card backgrounds
  modalBg: '#2A2D32',        // Modal backgrounds
  
  // Text Colors
  textPrimary: '#FFFFFF',    // Primary white text
  textSecondary: '#A9A9A9',  // Secondary gray text
  textMuted: '#666666',      // Muted text
  
  // Border Colors
  borderPrimary: '#3C3C3C',  // Primary borders
  borderSecondary: '#4A4A4A', // Secondary borders
  
  // Status Colors
  success: '#34C759',        // Success green
  error: '#FF3B30',          // Error red
  warning: '#FF9500',        // Warning orange
  
  // Input Colors
  inputBg: '#2A2D32',        // Input background
  inputBorder: '#4A4A4A',    // Input border
  placeholder: '#A9A9A9',    // Placeholder text
};

export const ButtonSizes = {
  // Button padding based on screen size
  small: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    fontSize: 14,
  },
  medium: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    fontSize: 16,
  },
  large: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    fontSize: 18,
  },
};

export default Colors;
