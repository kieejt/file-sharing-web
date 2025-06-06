import { NativeStackNavigationProp } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Login: undefined;
  Register: undefined;
  FileList: undefined;
  FileDetail: { fileId: string };
  FileUpload: undefined;
  Profile: undefined;
  SharedFile: { shareId: string };
  SharedFileInput: undefined;
  EditProfile: undefined;
  ChangePassword: undefined;
};

export type BottomTabParamList = {
  Home: undefined;
  Upload: undefined;
  SharedFileInput: undefined;
  Profile: undefined;
};

export type RootStackNavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Helper type for useNavigation hook
export type NavigationProp = NativeStackNavigationProp<RootStackParamList>;