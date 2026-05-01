import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NotificationProvider } from '../context/NotificationContext';

// Core app screens
import SplashScreen from '../screens/Auth/SplashScreen';
import RoleSelectionScreen from '../screens/Auth/RoleSelectionScreen';
import ManagerDashboardScreen from '../screens/Manager/ManagerDashboardScreen';
import LiveCheckScreen from '../screens/Manager/LiveCheckScreen';

// Admin auth screens
import AdminMainDashboardScreen from '../screens/Admin/AdminScreens/admindashboardscreen/AdminMainDashboardScreen';
import AdminAuthGate from '../screens/Admin/AdminScreens/adminauthscreen/AdminAuthGate';
import AdminRegisterScreen from '../screens/Admin/AdminScreens/adminauthscreen/AdminRegisterScreen';
import AdminLoginScreen from '../screens/Admin/AdminScreens/adminauthscreen/AdminLoginScreen';
import ManagerFaceRecognitionScreen from '../screens/Manager/ManagerFaceRecognitionScreen';
import ManagerHomeScreen from '../screens/Manager/ManagerdashboardsScreen/ManagerHomeScreen';
import HomeScreen from '../screens/Manager/ManagerdashboardsScreen/HomeScreen';
import SubHome from '../screens/Manager/ManagerdashboardsScreen/SubHomeScreen';
import CartServiceScreen from '../screens/Manager/ManagerdashboardsScreen/modals/CartServiceScreen';
import Marketplace from '../screens/Manager/ManagerdashboardsScreen/MarketplaceScreen';
import Submarket from '../screens/Manager/ManagerdashboardsScreen/submarket';
import Cartproduct from '../screens/Manager/ManagerdashboardsScreen/modals/cartproduct';
import CartDealsScreen from '../screens/Manager/ManagerdashboardsScreen/modals/CartDeals.jsx';
import AdminCartScreen from '../screens/Admin/AdminScreens/admindashboardscreen/AdminCartScreen.jsx';
import ManagerCartScreen from '../screens/Manager/ManagerdashboardsScreen/ManagerCartScreen.jsx';
import AttendanceScreen from '../screens/Manager/ManagerdashboardsScreen/AttendanceScreen';
import LiveCheckupScreen from '../screens/Manager/ManagerdashboardsScreen/modals/LiveCheckupScreen';

// Admin dashboard screens (to be part of the drawer)
import ServicesScreen from '../screens/Admin/AdminScreens/admindashboardscreen/ServicesScreen';
import SubServicesScreen from '../screens/Admin/AdminScreens/admindashboardscreen/SubServicesScreen';
import MarketplaceScreen from '../screens/Admin/AdminScreens/admindashboardscreen/MarketplaceScreen';
import SubMarketplaceScreen from '../screens/Admin/AdminScreens/admindashboardscreen/SubMarketplaceScreen';
import ClientsScreen from '../screens/Admin/AdminScreens/admindashboardscreen/ClientsScreen';
import ClientHistoryScreen from '../screens/Admin/AdminScreens/admindashboardscreen/modals/ClientHistoryScreen';
import EmployeesScreen from '../screens/Admin/AdminScreens/admindashboardscreen/EmployeesScreen';
import AdvanceSalary from '../screens/Admin/AdminScreens/admindashboardscreen/AdvanceSalary';
import AttendanceConfirmationRecognitionScreen from '../screens/Manager/ManagerdashboardsScreen/AttendanceConfirmfacerecognization';

// Other screens
import FaceRecognitionScreen from '../components/FaceRecognitionScreen';
import LiveCheckScreenAttendance from '../screens/Manager/ManagerdashboardsScreen/LiveCheckScreenattendance';
import LiveCheckScreenSalary from '../screens/Manager/ManagerdashboardsScreen/LiveCheckScreenSalary';
import AttendanceFaceRecognitionScreen from '../screens/Manager/ManagerdashboardsScreen/AttendanceFaceRecognitionScreen';
import SalaryFaceRecognitionScreen from '../screens/Manager/ManagerdashboardsScreen/SalaryFaceRecognitionScreen';
import AdminAttendanceFaceRecognitionScreen from '../screens/Admin/AdminScreens/admindashboardscreen/AdminAttendanceFaceRecognitionScreen';
import EmployeeAttendanceFaceRecognitionScreen from '../screens/Manager/ManagerdashboardsScreen/EmployeeAttendanceFaceRecognitionScreen';
import EmployeeAttendanceModal from '../screens/Manager/ManagerdashboardsScreen/modals/EmployeeAttendanceModal';
import AdvanceSalaryFaceRecognitionScreen from '../screens/Manager/ManagerdashboardsScreen/AdvanceSalaryFaceRecognitionScreen';
import AdvanceSalaryRequestModal from '../screens/Manager/ManagerdashboardsScreen/modals/AdvanceSalaryRequestModal';
import GSTConfigurationScreen from '../screens/Admin/AdminScreens/admindashboardscreen/GSTConfigurationScreen';
import NotificationsScreen from '../screens/NotificationSceen';

// Create our main navigators
const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{ headerShown: false }}
      >
        {/* Auth and other full-screen flow */}
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen
          name="GSTConfigurationScreen"
          component={GSTConfigurationScreen}
        />
        <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
        <Stack.Screen
          name="NotificationsScreen"
          component={NotificationsScreen}
        />
        <Stack.Screen name="AdminAuthGate" component={AdminAuthGate} />
        <Stack.Screen name="AdminRegister" component={AdminRegisterScreen} />
        <Stack.Screen name="AdminLogin" component={AdminLoginScreen} />
        <Stack.Screen name="Services" component={ServicesScreen} />
        <Stack.Screen name="SubServices" component={SubServicesScreen} />
        <Stack.Screen name="Marketplace" component={MarketplaceScreen} />
        <Stack.Screen name="SubMarketplace" component={SubMarketplaceScreen} />
        <Stack.Screen name="Clients" component={ClientsScreen} />
        <Stack.Screen name="ClientHistory" component={ClientHistoryScreen} />
        <Stack.Screen name="Employees" component={EmployeesScreen} />
        <Stack.Screen name="AdvanceSalary" component={AdvanceSalary} />

        {/* Admin-specific screens */}
        <Stack.Screen
          name="AdminMainDashboard"
          component={AdminMainDashboardScreen}
        />

        {/* Manager-specific screens */}
        <Stack.Screen
          name="ManagerDashboard"
          component={ManagerDashboardScreen}
        />
        <Stack.Screen name="LiveCheck" component={LiveCheckScreen} />
        <Stack.Screen
          name="ManagerFaceRecognitionScreen"
          component={ManagerFaceRecognitionScreen}
        />
        <Stack.Screen name="ManagerHomeScreen" component={ManagerHomeScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="SubHome" component={SubHome} />
        <Stack.Screen name="CartService" component={CartServiceScreen} />
        <Stack.Screen name="Marketplaces" component={Marketplace} />
        <Stack.Screen name="Submarket" component={Submarket} />
        <Stack.Screen name="Cartproduct" component={Cartproduct} />
        <Stack.Screen name="CartDealsScreen" component={CartDealsScreen} />
        <Stack.Screen name="AdminCartScreen" component={AdminCartScreen} />
        <Stack.Screen name="ManagerCartScreen" component={ManagerCartScreen} />
        <Stack.Screen name="AttendanceScreen" component={AttendanceScreen} />
        <Stack.Screen name="LiveCheckupScreen" component={LiveCheckupScreen} />
        <Stack.Screen
          name="LiveCheckScreenAttendance"
          component={LiveCheckScreenAttendance}
        />
        <Stack.Screen name="AdvanceSalaryScreen" component={AdvanceSalary} />
        <Stack.Screen
          name="AttendanceConfirmationRecognitionScreen"
          component={AttendanceConfirmationRecognitionScreen}
        />
        <Stack.Screen
          name="LiveCheckScreenSalary"
          component={LiveCheckScreenSalary}
        />
        <Stack.Screen
          name="AttendanceFaceRecognitionScreen"
          component={AttendanceFaceRecognitionScreen}
        />
        <Stack.Screen
          name="SalaryFaceRecognitionScreen"
          component={SalaryFaceRecognitionScreen}
        />
        <Stack.Screen
          name="AdminAttendanceFaceRecognition"
          component={AdminAttendanceFaceRecognitionScreen}
        />
        <Stack.Screen
          name="EmployeeAttendanceFaceRecognition"
          component={EmployeeAttendanceFaceRecognitionScreen}
        />
        <Stack.Screen
          name="EmployeeAttendanceModal"
          component={EmployeeAttendanceModal}
        />
        <Stack.Screen
          name="AdvanceSalaryFaceRecognition"
          component={AdvanceSalaryFaceRecognitionScreen}
        />
        <Stack.Screen
          name="AdvanceSalaryRequestModal"
          component={AdvanceSalaryRequestModal}
        />
        {/* This is the full-screen modal-like screen that doesn't have a sidebar */}
        <Stack.Screen
          name="FaceRecognitionScreen"
          component={FaceRecognitionScreen}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
