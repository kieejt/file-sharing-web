import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, Card, Button, ActivityIndicator } from 'react-native-paper';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { fileAPI } from '../../services/api';
import { RootStackParamList, NavigationProp } from '../../types/navigation';
import * as FileSystem from 'expo-file-system';

type SharedFileRouteProp = RouteProp<RootStackParamList, 'SharedFile'>;

type File = {
  _id: string;
  name: string;
  description?: string;
  isPublic: boolean;
  createdAt: string;
  owner: {
    name: string;
  };
};

export const SharedFileScreen = () => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  const route = useRoute<SharedFileRouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const { shareId } = route.params;

  useEffect(() => {
    loadSharedFile();
  }, [shareId]);

  const loadSharedFile = async () => {
    try {
      const response = await fileAPI.getSharedFile(shareId);
      setFile({
        ...response.data,
        owner: {
          name: response.data.owner?.name || 'Unknown'
        }
      });
    } catch (error) {
      console.error('Error loading shared file:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!file) return;

    try {
      setDownloading(true);
      const response = await fileAPI.downloadSharedFile(shareId);
      const fileUri = FileSystem.documentDirectory + file.name;
      
      await FileSystem.writeAsStringAsync(fileUri, response.data, {
        encoding: FileSystem.EncodingType.Base64,
      });

      
      Alert.alert('Success', 'File downloaded successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to download file');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!file) {
    return (
      <View style={styles.centerContainer}>
        <Text>Shared file not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Card.Title
          title={file.name}
          subtitle={`Shared by ${file.owner.name}`}
        />
        {file.description && (
          <Card.Content>
            <Text>{file.description}</Text>
          </Card.Content>
        )}
        <Card.Actions>
          <Button
            mode="contained"
            onPress={handleDownload}
            loading={downloading}
            disabled={downloading}
          >
            Download
          </Button>
        </Card.Actions>
      </Card>
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
    marginBottom: 10,
  },
});

export default SharedFileScreen;