import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Share, Alert, Image, Dimensions, Platform } from 'react-native';
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
  const [sharing, setSharing] = useState(false);
  const [renameDialogVisible, setRenameDialogVisible] = useState(false);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setError('Failed to load file details');
    } finally {
      setLoading(false);
    }
  };

  const handleRename = async () => {
    if (!file || !newFileName.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên file hợp lệ');
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
      Alert.alert('Thành công', 'Đổi tên file thành công');
      setRenameDialogVisible(false);
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể đổi tên file');
    } finally {
      setRenaming(false);
    }
  };

  const handleDownload = async () => {
    if (!file) return;

    try {
      setDownloading(true);
      console.log('Attempting to download file:', file.name, file._id);
      
      // Tạo đường dẫn file trong thư mục cache
      const fileUri = FileSystem.cacheDirectory + file.originalName;
      
      // Tải file xuống
      const downloadResult = await FileSystem.downloadAsync(
        `${API_URL}/files/${file._id}/download`,
        fileUri
      );

      console.log('Download result:', downloadResult);

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

  const handleShare = async () => {
    if (!file) return;

    try {
      setSharing(true);
      console.log('File object before sharing:', file); // Debug log
      if (!file.shareId) {
        Alert.alert('Lỗi', 'Share ID not available');
        return;
      }
      // Sử dụng URL của ứng dụng web để chia sẻ
      const webAppUrl = 'http://localhost:3000'; // URL cơ sở của ứng dụng web
      const shareUrl = `${webAppUrl}/share/${file.shareId}`;
      
      const result = await Share.share({
        url: shareUrl
      });
    } catch (error) {
      console.error('Share error:', error);
      Alert.alert('Lỗi', 'Không thể chia sẻ file');
    } finally {
      setSharing(false);
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
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  if (!file) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  // Định dạng ngày tải lên
  const uploadDate = new Date(file.createdAt).toLocaleDateString();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Chi tiết tệp</Text>

      <Portal>
        <Dialog visible={renameDialogVisible} onDismiss={() => setRenameDialogVisible(false)}>
          <Dialog.Title>Đổi tên file</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Tên file mới"
              value={newFileName}
              onChangeText={setNewFileName}
              style={styles.input}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setRenameDialogVisible(false)}>Hủy</Button>
            <Button onPress={handleRename} loading={renaming} disabled={renaming}>
              Đổi tên
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
          <View style={styles.fileInfo}>
            <Text style={styles.fileName}>{file.originalName}</Text>
            <Text style={styles.fileSize}>{formatFileSize(file.size)}</Text>
            <Text style={styles.fileType}>{file.mimeType}</Text>
          </View>
          <Text>Ngày tải lên: {uploadDate}</Text>
          {file.description && (
            <Text>{file.description}</Text>
          )}
        </Card.Content>

        <Card.Actions style={styles.actionButtons}>
          <View style={styles.actions}>
            <Button
              mode="contained"
              onPress={handleShare}
              loading={sharing}
              disabled={sharing}
              style={styles.button}
              icon="share"
            >
              Chia sẻ
            </Button>

            <Button
              mode="contained"
              onPress={() => setRenameDialogVisible(true)}
              style={styles.button}
              icon="pencil"
            >
              Đổi tên
            </Button>

            <Button
              mode="contained"
              onPress={() => setDeleteDialogVisible(true)}
              style={[styles.button, styles.deleteButton]}
              icon="delete"
            >
              Xóa
            </Button>
          </View>
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
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  fileInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fileName: {
    fontWeight: 'bold',
  },
  fileSize: {
    fontWeight: 'bold',
  },
  fileType: {
    fontWeight: 'bold',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  button: {
    margin: 4,
  },
  deleteButton: {
    backgroundColor: 'red',
  },
  error: {
    color: 'red',
    fontWeight: 'bold',
    marginTop: 10,
  },
  input: {
    marginBottom: 10,
  },
});

export default FileDetailScreen;