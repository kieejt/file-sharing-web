import React, { useState } from 'react';
import { View, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Button, Text } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { fileAPI } from '../../services/api';

// Helper function to attempt converting UTF-8 string to Latin-1 bytes
const utf8ToLatin1Bytes = (str: string): string => {
  let bytes = [];
  for (let i = 0; i < str.length; i++) {
    let charCode = str.charCodeAt(i);
    // If character is in Latin-1 range (0-255), use its code
    if (charCode >= 0 && charCode <= 255) {
      bytes.push(charCode);
    } else {
      // Replace non-Latin-1 characters with a placeholder (e.g., underscore)
      // This might be the cause of '%%' or similar on the server if it interprets invalid bytes
      // A common approach is to replace with '?' or '_'
      bytes.push('%'.charCodeAt(0)); // Using '%' as seen in your error
      bytes.push('%'.charCodeAt(0)); // Repeat if server expects two bytes for invalid UTF-8 sequences
    }
  }
  return String.fromCharCode(...bytes);
};

export const FileUploadScreen = () => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState([]);

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 1,
        allowsEditing: true,
      });

      if (!result.canceled) {
        const fileName = result.assets[0].fileName || 'image.jpg';
        await uploadFile(result.assets[0].uri, fileName);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled) {
        await uploadFile(result.assets[0].uri, result.assets[0].name);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const uploadFile = async (uri: string, fileName: string) => {
    try {
      setUploading(true);

      // Attempt to convert filename to Latin-1 bytes for compatibility with server's Buffer.from("latin1")
      const latin1FileName = utf8ToLatin1Bytes(fileName);

      const fileData = {
        file: {
          uri,
          type: 'application/octet-stream',
          name: latin1FileName, // Sử dụng tên file đã mã hóa Latin-1
        },
        name: fileName, // Giữ nguyên tên gốc để hiển thị (có thể không dùng trên server nếu chỉ dùng originalname)
      };

      console.log('Uploading file:', {
        originalName: fileName,
        latin1EncodedName: latin1FileName
      });

      await fileAPI.uploadFile(fileData);
      Alert.alert('Success', 'File uploaded successfully');
    } catch (error: any) {
      console.error('Upload error:', error);
      let errorMessage = 'Failed to upload file';
      
      // Kiểm tra lỗi từ response của API
      if (error.response && error.response.data && error.response.data.error === 'File too large') {
        errorMessage = 'File quá lớn, không thể tải lên.';
      } else if (error.message) {
        errorMessage = `Failed to upload file: ${error.message}`;
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tải lên tệp</Text>

      <View style={styles.uploadOptions}>
        <Button
          mode="contained"
          onPress={handlePickImage}
          style={styles.uploadButton}
          icon="image"
        >
          Chọn ảnh
        </Button>

        <Button
          mode="contained"
          onPress={handlePickDocument}
          style={styles.uploadButton}
          icon="file-document"
        >
          Chọn tài liệu
        </Button>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {uploading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0000ff" />
          <Text style={styles.loadingText}>Đang tải lên...</Text>
        </View>
      )}

      {uploadedFiles.length > 0 && (
        <View style={styles.uploadedFiles}>
          <Text style={styles.uploadedFilesTitle}>Tệp đã tải lên:</Text>
          {uploadedFiles.map((file, index) => (
            <Text key={index} style={styles.uploadedFile}>
              {file.name}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  uploadOptions: {
    gap: 16,
  },
  uploadButton: {
    marginBottom: 8,
  },
  error: {
    color: 'red',
    marginBottom: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
  },
  uploadedFiles: {
    marginTop: 16,
  },
  uploadedFilesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  uploadedFile: {
    marginBottom: 8,
  },
});

export default FileUploadScreen;