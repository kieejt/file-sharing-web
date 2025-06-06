import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Share, Alert, Image, Dimensions, Platform, Linking } from 'react-native';
import { Text, Card, Button, ActivityIndicator, IconButton, TextInput, Portal, Dialog } from 'react-native-paper';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { fileAPI } from '../../services/api';
import { RootStackParamList, NavigationProp } from '../../types/navigation';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';

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

const isMediaFile = (mimeType?: string): boolean => {
  if (!mimeType) return false;
  return mimeType.startsWith('image/') || mimeType.startsWith('video/');
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
      console.log('Bắt đầu tải xuống file:', file.originalName, 'ID:', file._id, 'Type:', file.mimeType);

      // Kiểm tra và yêu cầu quyền truy cập Photo Library nếu là file media
      if (Platform.OS === 'ios' && isMediaFile(file.mimeType)) {
        console.log('Đang kiểm tra quyền truy cập Photo Library...');
        
        const { status: photoStatus } = await MediaLibrary.requestPermissionsAsync();
        console.log('Trạng thái quyền Photo Library:', photoStatus);
        
        if (photoStatus !== 'granted') {
          Alert.alert(
            'Cần quyền truy cập',
            'Ứng dụng cần quyền truy cập vào Bộ sưu tập để lưu ảnh và video. Vui lòng cấp quyền trong Cài đặt.',
            [
              { text: 'Đóng', style: 'cancel' },
              { text: 'Mở Cài đặt', onPress: () => Linking.openSettings() }
            ]
          );
          return;
        }
      }

      // Lấy token từ AsyncStorage
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        throw new Error('Không tìm thấy token xác thực');
      }

      // Tạo đường dẫn tạm thời cho file
      const fileUri = `${FileSystem.cacheDirectory}${file.originalName}`;
      console.log('Đường dẫn file tạm:', fileUri);

      // Tải file từ server
      const downloadUrl = `${API_URL}/files/${file._id}/download`;
      console.log('URL tải xuống:', downloadUrl);

      const downloadResult = await FileSystem.downloadAsync(
        downloadUrl,
        fileUri,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log('Kết quả tải xuống:', downloadResult);

      if (downloadResult.status === 200) {
        // Kiểm tra file đã tải xuống
        const fileInfo = await FileSystem.getInfoAsync(fileUri);
        console.log('Thông tin file sau khi tải:', fileInfo);

        if (!fileInfo.exists) {
          throw new Error('Không tìm thấy file sau khi tải xuống');
        }

        // Xử lý file media
        if (isMediaFile(file.mimeType)) {
          console.log('Đang xử lý file media');
          try {
            // Lưu vào thư viện
            const asset = await MediaLibrary.createAssetAsync(fileUri);
            console.log('Đã tạo asset:', asset);

            // Kiểm tra album đã tồn tại
            const albums = await MediaLibrary.getAlbumsAsync();
            console.log('Danh sách album:', albums);
            
            let album = albums.find(a => a.title === 'File Sharing');
            
            if (!album) {
              console.log('Tạo album mới');
              album = await MediaLibrary.createAlbumAsync('File Sharing', asset, false);
            } else {
              console.log('Thêm vào album hiện có');
              await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
            }

            Alert.alert('Thành công', 'File đã được lưu vào thư viện');
          } catch (error: any) {
            console.error('Lỗi khi lưu vào thư viện:', error);
            Alert.alert('Lỗi', 'Không thể lưu file vào thư viện: ' + (error?.message || 'Lỗi không xác định'));
          }
        } else {
          // Nếu không phải file media, sử dụng Share để người dùng lưu hoặc mở file
          console.log('Đang chia sẻ file thông thường');
          const fileUrl = Platform.OS === 'ios' ? `file://${fileUri}` : fileUri;
          console.log('URL chia sẻ:', fileUrl);

          const shareResult = await Share.share({
            url: fileUrl,
            title: file.originalName,
          });

          console.log('Kết quả chia sẻ:', shareResult);

          if (shareResult.action === Share.sharedAction) {
            Alert.alert('Thành công', 'File đã được chia sẻ thành công');
          }
        }
      } else {
        throw new Error(`Tải xuống thất bại với mã lỗi: ${downloadResult.status}`);
      }
    } catch (error: any) {
      console.error('Lỗi tải xuống:', error);
      Alert.alert('Lỗi', 'Không thể tải xuống file: ' + (error?.message || 'Lỗi không xác định'));
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
    backgroundColor: '#1976D2',
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