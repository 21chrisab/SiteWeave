import { View, Text, StyleSheet, FlatList, TextInput, ScrollView, KeyboardAvoidingView, Platform, Pressable, Alert } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { fetchMessageChannels, fetchChannelMessages, sendMessage } from '@siteweave/core-logic';
import PressableWithFade from '../../components/PressableWithFade';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useHaptics } from '../../hooks/useHaptics';
import ReportContentModal from '../../components/ReportContentModal';

export default function MessagesScreen() {
  const { user, supabase } = useAuth();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();
  const [channels, setChannels] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const subscriptionRef = useRef(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);

  useEffect(() => {
    loadChannels();
  }, [user]);

  useEffect(() => {
    if (selectedChannel) {
      loadMessages();
      subscribeToMessages();
    }
    
    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
    };
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
      const data = await fetchChannelMessages(supabase, selectedChannel.id, user?.id);
      setMessages(data);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const subscribeToMessages = () => {
    if (!selectedChannel) return;

    // Clean up previous subscription
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
    }

    const channel = supabase
      .channel(`messages:${selectedChannel.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `channel_id=eq.${selectedChannel.id}`,
      }, async (payload) => {
        // Fetch full message with user info
        try {
          const data = await fetchChannelMessages(supabase, selectedChannel.id, user?.id);
          setMessages(data);
        } catch (error) {
          console.error('Error loading new message:', error);
        }
      })
      .subscribe();

    subscriptionRef.current = channel;
  };

  const handleChannelSelect = (channel) => {
    haptics.selection();
    setSelectedChannel(channel);
    setMessages([]); // Clear messages while loading new channel
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedChannel || !user) return;

    try {
      haptics.light();
      await sendMessage(supabase, {
        channel_id: selectedChannel.id,
        user_id: user.id,
        content: messageText,
        topic: 'text',
        extension: 'txt',
        type: 'text',
      });
      haptics.success();
      setMessageText('');
    } catch (error) {
      console.error('Error sending message:', error);
      haptics.error();
    }
  };

  const handleMessageLongPress = (message) => {
    // Don't allow reporting your own messages
    if (message.user_id === user?.id) {
      return;
    }
    
    haptics.medium();
    setSelectedMessage(message);
    setShowReportModal(true);
  };

  if (channels.length === 0) {
    return (
      <View style={[styles.safeArea, { paddingTop: insets.top }]}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Messages</Text>
          </View>
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No channels available</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.safeArea, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Messages</Text>
        </View>

        {/* Channel Selector */}
        <View style={styles.channelSelectorContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.channelSelector}
          >
            {channels.map((channel) => (
              <PressableWithFade
                key={channel.id}
                style={[
                  styles.channelChip,
                  selectedChannel?.id === channel.id && styles.channelChipActive
                ]}
                onPress={() => handleChannelSelect(channel)}
                hapticType="selection"
              >
                <Text style={[
                  styles.channelChipText,
                  selectedChannel?.id === channel.id && styles.channelChipTextActive
                ]}>
                  {channel.name}
                </Text>
              </PressableWithFade>
            ))}
          </ScrollView>
        </View>

        {/* Messages List */}
        {selectedChannel ? (
          <>
            <FlatList
              data={messages}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.messagesList}
              renderItem={({ item }) => (
                <Pressable
                  style={[
                    styles.messageItem,
                    item.user_id === user?.id && styles.myMessage
                  ]}
                  onLongPress={() => handleMessageLongPress(item)}
                  disabled={item.user_id === user?.id}
                >
                  <Text style={styles.messageUser}>
                    {item.user?.name || 'Unknown'}
                  </Text>
                  <Text style={styles.messageText}>{item.content}</Text>
                  <Text style={styles.messageTime}>
                    {new Date(item.created_at).toLocaleTimeString()}
                  </Text>
                </Pressable>
              )}
              ListEmptyComponent={
                <View style={styles.emptyMessagesContainer}>
                  <Ionicons name="chatbubbles-outline" size={48} color="#9CA3AF" />
                  <Text style={styles.emptyMessagesText}>No messages yet</Text>
                  <Text style={styles.emptyMessagesSubtext}>Start the conversation!</Text>
                </View>
              }
            />

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={messageText}
                onChangeText={setMessageText}
                placeholder="Type a message..."
                multiline={true}
                placeholderTextColor="#9CA3AF"
              />
              <PressableWithFade
                style={[
                  styles.sendButton,
                  !messageText.trim() && styles.sendButtonDisabled
                ]}
                onPress={handleSendMessage}
                disabled={!messageText.trim()}
              >
                <Ionicons name="send" size={20} color="#fff" />
              </PressableWithFade>
            </View>
          </>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Select a channel to view messages</Text>
          </View>
        )}
      </KeyboardAvoidingView>

      <ReportContentModal
        visible={showReportModal}
        onClose={() => {
          setShowReportModal(false);
          setSelectedMessage(null);
        }}
        contentType="message"
        contentId={selectedMessage?.id}
        reportedUserId={selectedMessage?.user_id}
        reportedUserName={selectedMessage?.user?.name || 'Unknown'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
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
  channelSelectorContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingVertical: 12,
  },
  channelSelector: {
    paddingHorizontal: 16,
    gap: 8,
  },
  channelChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginRight: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
  channelChipActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  channelChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
  },
  channelChipTextActive: {
    color: '#fff',
  },
  messagesList: {
    paddingVertical: 8,
    flexGrow: 1,
  },
  messageItem: {
    backgroundColor: '#fff',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    maxWidth: '80%',
  },
  myMessage: {
    backgroundColor: '#DBEAFE',
    alignSelf: 'flex-end',
    marginRight: 16,
    marginLeft: 'auto',
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
    color: '#4B5563',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    marginRight: 8,
    maxHeight: 100,
    fontSize: 16,
    color: '#111827',
  },
  sendButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 44,
    minWidth: 44,
  },
  sendButtonDisabled: {
    backgroundColor: '#9CA3AF',
    opacity: 0.5,
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#4B5563',
    textAlign: 'center',
  },
  emptyMessagesContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    minHeight: 300,
  },
  emptyMessagesText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4B5563',
    marginTop: 16,
    marginBottom: 4,
  },
  emptyMessagesSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
  },
});

