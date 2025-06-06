import React, { useState } from 'react';
import { View, StyleSheet, Alert, Clipboard } from 'react-native';
import { Text, TextInput, Button, Card } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '../../types/navigation';

export const SharedFileInputScreen = () => {
  const [shareUrl, setShareUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation<NavigationProp>();

  const handlePaste = async () => {
    try {
      const text = await Clipboard.getString();
      if (text) {
        setShareUrl(text);
      }
    } catch (error) {
      console.error('Error pasting from clipboard:', error);
    }
  };

  const handleOpenFile = () => {
    if (!shareUrl.trim()) {
      Alert.alert('Error', 'Please enter a share URL');
      return;
    }

    // Trích xuất shareId từ URL
    const shareIdMatch = shareUrl.match(/\/share\/([^\/]+)/);
    if (!shareIdMatch) {
      Alert.alert('Error', 'Invalid share URL format');
      return;
    }

    const shareId = shareIdMatch[1];
    navigation.navigate('SharedFile', { shareId });
  };

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.title}>Mở File Được Chia Sẻ</Text>
          <Text style={styles.subtitle}>
            Dán URL của file được chia sẻ bên dưới để xem và tải về file
          </Text>
          
          <TextInput
            label="Share URL"
            value={shareUrl}
            onChangeText={setShareUrl}
            style={styles.input}
            mode="outlined"
            placeholder="https://example.com/share/..."
            autoCapitalize="none"
            autoCorrect={false}
          />
        </Card.Content>
        
        <Card.Actions style={styles.actions}>
          <Button
            mode="outlined"
            onPress={handlePaste}
            style={styles.button}
          >
            Paste URL
          </Button>
          <Button
            mode="contained"
            onPress={handleOpenFile}
            style={styles.button}
            loading={loading}
            disabled={loading}
          >
            Open File
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
  card: {
    marginTop: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  input: {
    marginBottom: 16,
  },
  actions: {
    justifyContent: 'flex-end',
    padding: 8,
  },
  button: {
    marginLeft: 8,
  },
}); 