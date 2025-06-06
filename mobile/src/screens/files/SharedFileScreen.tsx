import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, Platform, Share } from 'react-native';
import { Text, Card, Button, ActivityIndicator } from 'react-native-paper';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { fileAPI } from '../../services/api';
import { RootStackParamList, NavigationProp } from '../../types/navigation';
import * as FileSystem from 'expo-file-system';
import { API_URL } from '../../config';

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
  originalName: string;
  accessCount?: number;
  downloadCount?: number;
  size?: number;
};

// Hàm định dạng kích thước file
const formatFileSize = (bytes?: number) => {
  if (!bytes) return '0 B';
  
  if (bytes < 1024) {
    return bytes + ' B';
  } else if (bytes < 1024 * 1024) {
    return (bytes / 1024).toFixed(2) + ' KB';
  } else {
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }
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
      const fileData = response.data.data || response.data;
      
      setFile({
        ...fileData,
        owner: {
          name: fileData.uploader?.name || 'Người dùng không xác định'
        },
        originalName: fileData.name
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
      
      // Tạo đường dẫn file trong thư mục cache
      const fileUri = FileSystem.cacheDirectory + file.originalName;
      
      // Tải file xuống
      const downloadResult = await FileSystem.downloadAsync(
        `${API_URL}/files/share/${shareId}/download`,
        fileUri
      );

      if (downloadResult.status === 200) {
        // Kiểm tra xem file có tồn tại không
        const fileInfo = await FileSystem.getInfoAsync(fileUri);
        if (!fileInfo.exists) {
          throw new Error('File not found after download');
        }

        // Sử dụng Share để người dùng lưu hoặc mở file
        const shareResult = await Share.share({
          url: Platform.OS === 'ios' ? fileUri : `file://${fileUri}`,
          title: file.originalName,
          message: `Here's the file: ${file.originalName}`,
        });

        if (shareResult.action === Share.sharedAction) {
          Alert.alert('Success', 'File shared successfully');
        }
      } else {
        throw new Error(`Download failed with status: ${downloadResult.status}`);
      }
    } catch (error) {
      console.error('Download error:', error);
      Alert.alert('Error', 'Failed to download file. Please try again.');
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
        <Card.Content>
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Kích thước</Text>
              <Text style={styles.statValue}>{formatFileSize(file.size)}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Lượt truy cập</Text>
              <Text style={styles.statValue}>{file.accessCount || 0}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Lượt tải</Text>
              <Text style={styles.statValue}>{file.downloadCount || 0}</Text>
            </View>
          </View>
        </Card.Content>
        <Card.Actions>
          <Button
            mode="contained"
            onPress={handleDownload}
            loading={downloading}
            disabled={downloading}
            style={styles.button}
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
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  button: {
    backgroundColor: '#1976D2',
  },
});

export default SharedFileScreen;