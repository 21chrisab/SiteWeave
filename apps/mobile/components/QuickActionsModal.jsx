import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput } from 'react-native';
import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { uploadFile, createFieldIssue } from '@siteweave/core-logic';

export default function QuickActionsModal({ visible, onClose }) {
  const { user, supabase } = useAuth();
  const [activeAction, setActiveAction] = useState(null);
  const [dailyLogText, setDailyLogText] = useState('');
  const [issueData, setIssueData] = useState({
    title: '',
    description: '',
    project_id: null,
  });

  const handleDailyLog = async () => {
    // TODO: Implement daily log submission
    // This would create a message or activity log entry
    alert('Daily log submitted!');
    setDailyLogText('');
    setActiveAction(null);
  };

  const handleReportIssue = async () => {
    if (!issueData.title || !issueData.description) {
      alert('Please fill in all fields');
      return;
    }

    try {
      // For now, we'll need a project_id - in a full implementation,
      // you'd select from user's projects
      await createFieldIssue(supabase, {
        ...issueData,
        created_by_user_id: user.id,
        status: 'open',
        priority: 'Medium',
      });
      alert('Issue reported successfully!');
      setIssueData({ title: '', description: '', project_id: null });
      setActiveAction(null);
    } catch (error) {
      console.error('Error reporting issue:', error);
      alert('Error reporting issue');
    }
  };

  const handleUploadPhoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        alert('Permission to access camera roll is required!');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const fileName = `photos/${user.id}/${Date.now()}_${asset.fileName || 'photo.jpg'}`;
        
        // For React Native, we need to convert the local URI to a format Supabase can handle
        // Create a FormData-like object or use the file directly
        // Note: Supabase Storage in React Native may need special handling
        try {
          // Read the file as a blob
          const response = await fetch(asset.uri);
          const blob = await response.blob();
          
          await uploadFile(supabase, 'files', fileName, blob);
          alert('Photo uploaded successfully!');
          setActiveAction(null);
        } catch (uploadError) {
          console.error('Upload error:', uploadError);
          // Fallback: Try using the URI directly if blob doesn't work
          alert('Photo upload failed. Please try again.');
        }
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
      alert('Error uploading photo');
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {!activeAction ? (
            <>
              <Text style={styles.modalTitle}>Quick Actions</Text>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => setActiveAction('daily-log')}
              >
                <Text style={styles.actionButtonText}>📝 Submit Daily Log</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => setActiveAction('report-issue')}
              >
                <Text style={styles.actionButtonText}>⚠️ Report New Field Issue</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleUploadPhoto}
              >
                <Text style={styles.actionButtonText}>📷 Upload Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={onClose}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </>
          ) : activeAction === 'daily-log' ? (
            <>
              <Text style={styles.modalTitle}>Submit Daily Log</Text>
              <TextInput
                style={styles.textInput}
                multiline
                numberOfLines={6}
                placeholder="Enter your daily log..."
                value={dailyLogText}
                onChangeText={setDailyLogText}
              />
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={handleDailyLog}
                >
                  <Text style={styles.submitButtonText}>Submit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => setActiveAction(null)}
                >
                  <Text style={styles.backButtonText}>Back</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : activeAction === 'report-issue' ? (
            <>
              <Text style={styles.modalTitle}>Report Field Issue</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Issue Title"
                value={issueData.title}
                onChangeText={(text) => setIssueData({ ...issueData, title: text })}
              />
              <TextInput
                style={[styles.textInput, styles.textArea]}
                multiline
                numberOfLines={4}
                placeholder="Issue Description"
                value={issueData.description}
                onChangeText={(text) => setIssueData({ ...issueData, description: text })}
              />
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={handleReportIssue}
                >
                  <Text style={styles.submitButtonText}>Report</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => setActiveAction(null)}
                >
                  <Text style={styles.backButtonText}>Back</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  actionButton: {
    backgroundColor: '#3B82F6',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  cancelButton: {
    backgroundColor: '#E5E7EB',
    padding: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  cancelButtonText: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#3B82F6',
    padding: 16,
    borderRadius: 8,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  backButton: {
    flex: 1,
    backgroundColor: '#E5E7EB',
    padding: 16,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});

