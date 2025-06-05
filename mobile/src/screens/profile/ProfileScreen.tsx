import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, Avatar, Card, ActivityIndicator } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { NavigationProp } from '../../types/navigation';

export const ProfileScreen = () => {
  const [loading, setLoading] = useState(false);
  const { user, logout } = useAuth();
  const navigation = useNavigation<NavigationProp>();

  const handleLogout = async () => {
    try {
      setLoading(true);
      await logout();
      navigation.navigate('Login');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <View style={styles.avatarContainer}>
          <Avatar.Text 
            size={80} 
            label={user.name.substring(0, 2).toUpperCase()} 
            style={styles.avatar}
          />
        </View>

        <Card.Content>
          <View style={styles.infoContainer}>
            <Text style={styles.name}>{user.name}</Text>
            <Text style={styles.email}>{user.email}</Text>
          </View>
        </Card.Content>
      </Card>

      <View style={styles.buttonContainer}>
        <Button
          mode="contained"
          onPress={() => navigation.navigate('EditProfile')}
          style={styles.button}
        >
          Edit Profile
        </Button>

        <Button
          mode="contained"
          onPress={() => navigation.navigate('ChangePassword')}
          style={styles.button}
        >
          Change Password
        </Button>

        <Button
          mode="outlined"
          onPress={handleLogout}
          loading={loading}
          style={styles.button}
        >
          Logout
        </Button>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    marginBottom: 16,
  },
  avatarContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  avatar: {
    backgroundColor: '#1976D2',
  },
  infoContainer: {
    alignItems: 'center',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  email: {
    fontSize: 16,
    color: '#666',
  },
  buttonContainer: {
    gap: 12,
  },
  button: {
    marginBottom: 8,
  },
});

export default ProfileScreen;