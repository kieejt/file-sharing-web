import React, { useState, useEffect, useCallback } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, Alert } from 'react-native';
import { Text, Card, Searchbar, ActivityIndicator, IconButton, Portal, Dialog, Button } from 'react-native-paper';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { fileAPI } from '../../services/api';
import { RootStackParamList, NavigationProp } from '../../types/navigation';

type User = {
  _id: string;
  name: string;
  email: string;
};

type FileResponse = {
  _id: string;
  name: string;
  originalName: string;
  description?: string;
  isPublic: boolean;
  shareId: string;
  size: number;
  mimeType: string;
  user: string;
  createdAt: string;
  updatedAt: string;
  uploader?: {
    name: string;
    email: string;
  };
};

type File = FileResponse & {
  userDetails?: User;
};

export const FileListScreen = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [userCache, setUserCache] = useState<Record<string, User>>({});
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [deleting, setDeleting] = useState(false);

  const navigation = useNavigation<NavigationProp>();

  const fetchUserDetails = async (userId: string): Promise<User | undefined> => {
    try {
      if (!userId) {
        console.warn('No userId provided for fetching user details');
        return undefined;
      }

      if (userCache[userId]) {
        return userCache[userId];
      }

      const response = await fileAPI.getUserDetails(userId);
      const userData = response.data;
      
      setUserCache(prev => ({
        ...prev,
        [userId]: userData
      }));

      return userData;
    } catch (error) {
      console.error('Error fetching user details:', error);
      return undefined;
    }
  };

  const loadFiles = async (pageNum = 1, search = '') => {
    try {
      const response = await fileAPI.getFiles(pageNum, 10, search);
      const { data } = response.data;
      
      const filesWithUserDetails = data.map((file: FileResponse) => {
        return {
          ...file,
          userDetails: file.uploader ? {
            _id: file.user,
            name: file.uploader.name,
            email: file.uploader.email
          } : undefined
        } as File;
      });
      
      if (pageNum === 1) {
        setFiles(filesWithUserDetails);
      } else {
        setFiles(prev => [...prev, ...filesWithUserDetails]);
      }
      
      setHasMore(data.length === 10);
    } catch (error) {
      console.error('Error loading files:', error);
      Alert.alert('Error', 'Failed to load files');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setPage(1);
    loadFiles(1, searchQuery);
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadFiles(nextPage, searchQuery);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setPage(1);
    loadFiles(1, query);
  };

  const handleDelete = async (file: File) => {
    setSelectedFile(file);
    setDeleteDialogVisible(true);
  };

  const confirmDelete = async () => {
    if (!selectedFile) return;

    try {
      setDeleting(true);
      await fileAPI.deleteFile(selectedFile._id);
      // Cập nhật danh sách file sau khi xóa
      setFiles(files.filter(f => f._id !== selectedFile._id));
      Alert.alert('Success', 'File deleted successfully');
    } catch (error) {
      console.error('Delete error:', error);
      Alert.alert('Error', 'Failed to delete file');
    } finally {
      setDeleting(false);
      setDeleteDialogVisible(false);
      setSelectedFile(null);
    }
  };

  const renderFileItem = ({ item }: { item: File }) => (
    <Card style={styles.card} onPress={() => navigation.navigate('FileDetail', { fileId: item._id })}>
      <Card.Title
        title={item.name}
        subtitle={`Uploaded by ${item.uploader?.name || 'Unknown'}`}
        right={(props) => (
          <View style={styles.cardActions}>
            {/* Icon public/private đã bị loại bỏ */}
            {/* <IconButton
              {...props}
              icon={item.isPublic ? 'earth' : 'lock'}
              onPress={() => {}}
            /> */}
            <IconButton
              {...props}
              icon="delete"
              onPress={() => handleDelete(item)}
              iconColor="red"
            />
          </View>
        )}
      />
      {item.description && (
        <Card.Content>
          <Text>{item.description}</Text>
        </Card.Content>
      )}
    </Card>
  );

  // Tải danh sách file khi màn hình được focus
  useFocusEffect(
    useCallback(() => {
      console.log('FileListScreen focused, loading files...');
      // Reset về trang 1 và tải lại file khi màn hình focus
      setFiles([]); // Xóa danh sách cũ
      setPage(1); // Reset về trang 1
      setHasMore(true);
      loadFiles(1, searchQuery); // Tải lại từ trang 1
    }, [searchQuery]) // Dependency array
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Portal>
        <Dialog visible={deleteDialogVisible} onDismiss={() => setDeleteDialogVisible(false)}>
          <Dialog.Title>Delete File</Dialog.Title>
          <Dialog.Content>
            <Text>Are you sure you want to delete this file? This action cannot be undone.</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button mode="text" onPress={() => setDeleteDialogVisible(false)}>
              Cancel
            </Button>
            <Button mode="text" onPress={confirmDelete} loading={deleting} disabled={deleting} textColor="red">
              Delete
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Searchbar
        placeholder="Search files"
        onChangeText={handleSearch}
        value={searchQuery}
        style={styles.searchBar}
      />

      <FlatList
        data={files}
        renderItem={renderFileItem}
        keyExtractor={(item) => item._id}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={loading ? <ActivityIndicator /> : null}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text>No files found</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBar: {
    margin: 10,
    elevation: 2,
  },
  list: {
    padding: 10,
  },
  card: {
    marginBottom: 10,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
});

export default FileListScreen;