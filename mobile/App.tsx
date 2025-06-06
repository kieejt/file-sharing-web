import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Provider as PaperProvider } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { AuthProvider } from './src/context/AuthContext';
import { RootStackParamList, BottomTabParamList } from './src/types/navigation';
import { Platform } from 'react-native';

// Create navigation stacks
const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<BottomTabParamList>();

// Placeholder components - we'll create these next
import {LoginScreen} from './src/screens/auth/LoginScreen';
import {RegisterScreen} from './src/screens/auth/RegisterScreen';
import {FileListScreen} from './src/screens/files/FileListScreen';
import {FileDetailScreen} from './src/screens/files/FileDetailScreen';
import {FileUploadScreen} from './src/screens/files/FileUploadScreen';
import {SharedFileScreen} from './src/screens/files/SharedFileScreen';
import {SharedFileInputScreen} from './src/screens/files/SharedFileInputScreen';
import {ProfileScreen} from './src/screens/profile/ProfileScreen'
import {EditProfileScreen} from './src/screens/profile/EditProfileScreen';
import {ChangePasswordScreen} from './src/screens/profile/ChangePasswordScreen';

// Bottom tab navigator
const MainTabs = () => (
  <Tab.Navigator
    screenOptions={{
      tabBarActiveTintColor: '#1976D2',
      tabBarInactiveTintColor: '#666',
      tabBarStyle: {
        paddingTop: 5,
        height: 60,
        paddingBottom: Platform.OS === 'ios' ? 25 : 5,
      },
    }}
  >
    <Tab.Screen
      name="Home"
      component={FileListScreen}
      options={{
        tabBarIcon: ({ color, size }) => (
          <MaterialCommunityIcons name="file-document-multiple" size={size} color={color} />
        ),
        title: 'Files',
      }}
    />
    <Tab.Screen
      name="Upload"
      component={FileUploadScreen}
      options={{
        tabBarIcon: ({ color, size }) => (
          <MaterialCommunityIcons name="upload" size={size} color={color} />
        ),
      }}
    />
    <Tab.Screen
      name="SharedFileInput"
      component={SharedFileInputScreen}
      options={{
        tabBarIcon: ({ color, size }) => (
          <MaterialCommunityIcons name="link-variant" size={size} color={color} />
        ),
        title: 'Open Shared',
      }}
    />
    <Tab.Screen
      name="Profile"
      component={ProfileScreen}
      options={{
        tabBarIcon: ({ color, size }) => (
          <MaterialCommunityIcons name="account" size={size} color={color} />
        ),
      }}
    />
  </Tab.Navigator>
);

// Main app component
export default function App() {
  return (
    <PaperProvider>
      <AuthProvider>
        <NavigationContainer>
          <Stack.Navigator
            screenOptions={{
              headerShown: true,
            }}
            initialRouteName="Login"
          >
            <Stack.Screen
              name="Login"
              component={LoginScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Register"
              component={RegisterScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Main"
              component={MainTabs}
              options={{
                headerShown: false,
                gestureEnabled: false,
              }}
            />
            <Stack.Screen name="FileDetail" component={FileDetailScreen} />
            <Stack.Screen name="SharedFile" component={SharedFileScreen} />
            <Stack.Screen name="EditProfile" component={EditProfileScreen} />
            <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </AuthProvider>
    </PaperProvider>
  );
}
