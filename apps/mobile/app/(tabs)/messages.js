import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity } from 'react-native';
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { fetchMessageChannels, fetchChannelMessages, sendMessage } from '@siteweave/core-logic';

export default function MessagesScreen() {
  const { user, supabase } = useAuth();
  const [channels, setChannels] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');

  useEffect(() => {
    loadChannels();
  }, [user]);

  useEffect(() => {
    if (selectedChannel) {
      loadMessages();
      subscribeToMessages();
    }
  }, [selectedChannel]);

  const loadChannels = async () => {
    try {
      const data = await fetchMessageChannels(supabase);
      setChannels(data);
      if (data.length > 0 && !selectedChannel) {
        setSelectedChannel(data[0]);
      }
    } catch (error) {
      console.error('Error loading channels:', error);
    }
  };

  const loadMessages = async () => {
    if (!selectedChannel) return;
    
    try {
      const data = await fetchChannelMessages(supabase, selectedChannel.id);
      setMessages(data);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const subscribeToMessages = () => {
    if (!selectedChannel) return;

    const channel = supabase
      .channel(`messages:${selectedChannel.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `channel_id=eq.${selectedChannel.id}`,
      }, (payload) => {
        setMessages(prev => [...prev, payload.new]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedChannel || !user) return;

    try {
      await sendMessage(supabase, {
        channel_id: selectedChannel.id,
        user_id: user.id,
        content: messageText,
        topic: 'text',
        extension: 'txt',
        type: 'text',
      });
      setMessageText('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  if (!selectedChannel) {
    return (
      <View style={styles.container}>
        <Text>No channels available</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{selectedChannel.name}</Text>
      </View>

      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={[
            styles.messageItem,
            item.user_id === user?.id && styles.myMessage
          ]}>
            <Text style={styles.messageUser}>
              {item.user?.name || 'Unknown'}
            </Text>
            <Text style={styles.messageText}>{item.content}</Text>
            <Text style={styles.messageTime}>
              {new Date(item.created_at).toLocaleTimeString()}
            </Text>
          </View>
        )}
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={messageText}
          onChangeText={setMessageText}
          placeholder="Type a message..."
          multiline
        />
        <TouchableOpacity
          style={styles.sendButton}
          onPress={handleSendMessage}
        >
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
  },
  messageItem: {
    backgroundColor: '#fff',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  myMessage: {
    backgroundColor: '#DBEAFE',
    alignSelf: 'flex-end',
    marginRight: 16,
    marginLeft: 60,
  },
  messageUser: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3B82F6',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 16,
    color: '#111827',
    marginBottom: 4,
  },
  messageTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    marginRight: 8,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});

