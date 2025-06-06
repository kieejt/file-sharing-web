import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Share, Alert, Image, Dimensions } from 'react-native';
import { Text, Card, Button, ActivityIndicator, IconButton, TextInput, Portal, Dialog } from 'react-native-paper';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { fileAPI } from '../../services/api';
import { RootStackParamList, NavigationProp } from '../../types/navigation';
import * as FileSystem from 'expo-file-system';
import Constants from 'expo-constants';

// Lấy base URL từ biến môi trường hoặc sử dụng giá trị mặc định
const API_URL = Constants.expoConfig?.extra?.apiUrl || 'http://localhost:5000';

type FileDetailRouteProp = RouteProp<RootStackParamList, 'FileDetail'>;

type FileResponse = {
  _id: string;
  name: string;
  originalName: string;
  description?: string;
  isPublic: boolean;
  createdAt: string;
  user: string;
  shareId: string;
  mimeType: string;
  size: number;
};

type File = {
  _id: string;
  name: string;
  originalName: string;
  description?: string;
  isPublic: boolean;
  createdAt: string;
  shareId: string;
  mimeType: string;
  size: number;
  owner: {
    _id: string;
    name: string;
  };
};

const convertFileResponse = (response: FileResponse): File => {
  return {
    ...response,
    owner: {
      _id: response.user,
      name: 'Unknown User'
    }
  };
};

const isImageFile = (mimeType?: string): boolean => {
  if (!mimeType) return false;
  return mimeType.startsWith('image/');
};

const getImagePreviewUrl = (fileId: string): string => {
  return `${API_URL}/files/${fileId}/preview`;
};

// Helper function to format file size
const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' Bytes';
  else if (bytes < 1048576) return (bytes / 1024).toFixed(2) + ' KB';
  else if (bytes < 1073741824) return (bytes / 1048576).toFixed(2) + ' MB';
  else return (bytes / 1073741824).toFixed(2) + ' GB';
};

export const FileDetailScreen = () => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [renameDialogVisible, setRenameDialogVisible] = useState(false);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const route = useRoute<FileDetailRouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const { fileId } = route.params;

  useEffect(() => {
    loadFileDetails();
  }, [fileId]);

  const loadFileDetails = async () => {
    try {
      const response = await fileAPI.getFile(fileId);
      console.log('API Response:', response.data); // Debug log
      // Lấy dữ liệu từ trường data của response
      const fileData = response.data.data || response.data;
      
      // Lấy thông tin người dùng nếu có
      let ownerName = 'Unknown User';
      if (fileData.uploader?.name) {
        ownerName = fileData.uploader.name;
      } else if (fileData.user) {
        try {
          const userResponse = await fileAPI.getUserDetails(fileData.user);
          ownerName = userResponse.data.name || 'Unknown User';
        } catch (error) {
          console.error('Error fetching user details:', error);
        }
      }

      setFile({
        ...convertFileResponse(fileData),
        owner: {
          _id: fileData.user,
          name: ownerName
        }
      });
      // Lấy phần tên trước dấu chấm
      const nameWithoutExtension = fileData.name.split('.').slice(0, -1).join('.');
      setNewFileName(nameWithoutExtension);
    } catch (error) {
      console.error('Error loading file:', error);
      Alert.alert('Error', 'Failed to load file details');
    } finally {
      setLoading(false);
    }
  };

  const handleRename = async () => {
    if (!file || !newFileName.trim()) {
      Alert.alert('Error', 'Please enter a valid file name');
      return;
    }

    // Lấy phần đuôi của tên file gốc
    const originalExtension = file.originalName.split('.').pop();
    // Tạo tên file mới bằng cách thêm phần đuôi vào
    const newFullFileName = `${newFileName.trim()}.${originalExtension}`;

    try {
      setRenaming(true);
      await fileAPI.updateFile(file._id, { name: newFullFileName });
      await loadFileDetails();
      setRenameDialogVisible(false);
      Alert.alert('Success', 'File renamed successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to rename file');
    } finally {
      setRenaming(false);
    }
  };

  const handleDownload = async () => {
    if (!file) return;

    try {
      setDownloading(true);
      console.log('Attempting to download file:', file.name, file._id);
      
      // Tải file xuống thư mục cache tạm thời
      const downloadResult = await FileSystem.downloadAsync(
        `${API_URL}/files/${file._id}/download`,
        FileSystem.cacheDirectory + file.originalName
      );

      console.log('Download result:', downloadResult);

      if (downloadResult.status === 200) {
        console.log('Download successful, sharing file:', downloadResult.uri);
        // Sử dụng Share để người dùng lưu hoặc mở file
        await Share.share({
          url: downloadResult.uri,
          title: `Share ${file.originalName}`,
        });
        Alert.alert('Success', 'File downloaded and ready to share/save.');
      } else {
        Alert.alert('Error', `Failed to download file. Status: ${downloadResult.status}`);
        console.error('Download failed with status:', downloadResult.status);
      }
      
    } catch (error) {
      console.error('Download error:', error);
      Alert.alert('Error', 'Failed to download file');
    } finally {
      setDownloading(false);
    }
  };

  const handleShare = async () => {
    if (!file) return;

    try {
      console.log('File object before sharing:', file); // Debug log
      if (!file.shareId) {
        Alert.alert('Error', 'Share ID not available');
        return;
      }
      // Sử dụng URL của ứng dụng web để chia sẻ
      const webAppUrl = 'http://localhost:3000'; // URL cơ sở của ứng dụng web
      const shareUrl = `${webAppUrl}/share/${file.shareId}`;
      const shareMessage = `Check out this file: ${file.name}\n${shareUrl}`; // Thông báo bao gồm tên file và URL
      
      const result = await Share.share({
        message: shareMessage,
        url: shareUrl
      });
    } catch (error) {
      console.error('Share error:', error);
      Alert.alert('Error', 'Failed to share file');
    }
  };

  const handleDelete = async () => {
    if (!file) return;

    try {
      setDeleting(true);
      await fileAPI.deleteFile(file._id);
      Alert.alert('Success', 'File deleted successfully');
      navigation.goBack();
    } catch (error) {
      console.error('Delete error:', error);
      Alert.alert('Error', 'Failed to delete file');
    } finally {
      setDeleting(false);
      setDeleteDialogVisible(false);
    }
  };

  const renderFilePreview = () => {
    if (!file || !file.mimeType) return null;

    if (isImageFile(file.mimeType)) {
      return (
        <Card.Content style={styles.previewContainer}>
          <Image
            source={{ uri: getImagePreviewUrl(file._id) }}
            style={styles.imagePreview}
            resizeMode="contain"
          />
        </Card.Content>
      );
    }

    return null;
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
        <Text>File not found</Text>
      </View>
    );
  }

  // Định dạng ngày tải lên
  const uploadDate = new Date(file.createdAt).toLocaleDateString();

  return (
    <View style={styles.container}>
      <Portal>
        <Dialog visible={renameDialogVisible} onDismiss={() => setRenameDialogVisible(false)}>
          <Dialog.Title>Rename File</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="New File Name"
              value={newFileName}
              onChangeText={setNewFileName}
              disabled={renaming}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button mode="text" onPress={() => setRenameDialogVisible(false)}>
              Cancel
            </Button>
            <Button mode="text" onPress={handleRename} loading={renaming} disabled={renaming}>
              Rename
            </Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={deleteDialogVisible} onDismiss={() => setDeleteDialogVisible(false)}>
          <Dialog.Title>Delete File</Dialog.Title>
          <Dialog.Content>
            <Text>Are you sure you want to delete this file? This action cannot be undone.</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button mode="text" onPress={() => setDeleteDialogVisible(false)}>
              Cancel
            </Button>
            <Button mode="text" onPress={handleDelete} loading={deleting} disabled={deleting} textColor="red">
              Delete
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Card style={styles.card}>
        <Card.Title
          title={file.name}
          subtitle={`Uploaded by ${file.owner.name}`}
          right={(props) => (
            <View style={styles.topRightIcons}>
              <IconButton
                {...props}
                icon="download"
                onPress={handleDownload}
                disabled={downloading || loading}
                loading={downloading}
              />
            </View>
          )}
        />

        {renderFilePreview()}

        <Card.Content>
          <Text>Tên gốc: {file.originalName}</Text>
          <Text>Kích thước: {formatFileSize(file.size)}</Text>
          <Text>Loại file: {file.mimeType}</Text>
          <Text>Ngày tải lên: {uploadDate}</Text>
          {file.description && (
            <Text>{file.description}</Text>
          )}
        </Card.Content>

        <Card.Actions style={styles.actionButtons}>
          <Button
            mode="outlined"
            onPress={() => setRenameDialogVisible(true)}
            style={styles.actionButton}
          >
            Rename
          </Button>
          <Button
            mode="outlined"
            onPress={handleShare}
            style={styles.actionButton}
          >
            Share
          </Button>
          <Button
            mode="outlined"
            onPress={() => setDeleteDialogVisible(true)}
            style={styles.actionButton}
            textColor="red"
          >
            Delete
          </Button>
        </Card.Actions>
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 15,
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
  topRightIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start', // Căn trái các nút
    padding: 8,
  },
  actionButton: {
    margin: 4, // Thêm margin để tạo khoảng cách giữa các nút
  },
  previewContainer: {
    alignItems: 'center',
    padding: 10,
  },
  imagePreview: {
    width: Dimensions.get('window').width - 50,
    height: 300,
    borderRadius: 8,
  },
});

export default FileDetailScreen;