import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, Animated, Dimensions, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { createFieldIssue, fetchUserProjectsWithProgress } from '@siteweave/core-logic';
import { Ionicons } from '@expo/vector-icons';
import PressableWithFade from './PressableWithFade';
import { useHaptics } from '../hooks/useHaptics';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function QuickActionsModal({ visible, onClose }) {
  const { user, supabase } = useAuth();
  const haptics = useHaptics();
  const [issueData, setIssueData] = useState({
    title: '',
    description: '',
    project_id: null,
  });
  const [projects, setProjects] = useState([]);
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const modalTranslateY = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible && user && supabase) {
      haptics.light();
      loadProjects();
      // Reset form when modal opens
      setIssueData({ title: '', description: '', project_id: null });
    }
  }, [visible, user, supabase]);

  const loadProjects = async () => {
    if (!user || !supabase) return;
    try {
      const data = await fetchUserProjectsWithProgress(supabase, user.id);
      setProjects(data || []);
    } catch (error) {
      console.error('Error loading projects:', error);
      setProjects([]);
    }
  };

  const selectedProject = projects.find(p => p.id === issueData.project_id);

  useEffect(() => {
    if (visible) {
      // Reset animation values immediately when visible
      backdropOpacity.setValue(0);
      modalTranslateY.setValue(1);
      
      // Use requestAnimationFrame to ensure values are set before animating
      requestAnimationFrame(() => {
        Animated.parallel([
          Animated.timing(backdropOpacity, {
            toValue: 0.7,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(modalTranslateY, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();
      });
    } else {
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(modalTranslateY, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleReportIssue = async () => {
    if (!issueData.title || !issueData.description) {
      haptics.error();
      alert('Please fill in all fields');
      return;
    }

    if (!issueData.project_id) {
      haptics.error();
      alert('Please select a project');
      return;
    }

    try {
      haptics.medium();
      setLoading(true);
      await createFieldIssue(supabase, {
        ...issueData,
        created_by_user_id: user.id,
        status: 'open',
        priority: 'Medium',
      });
      haptics.success();
      alert('Issue reported successfully!');
      setIssueData({ title: '', description: '', project_id: null });
      onClose();
    } catch (error) {
      console.error('Error reporting issue:', error);
      haptics.error();
      alert('Error reporting issue');
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={!!visible}
      transparent={true}
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]} />
        
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalWrapper}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <Animated.View 
            style={[
              styles.modal,
              {
                transform: [{ translateY: modalTranslateY.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, SCREEN_HEIGHT],
                }) }],
              }
            ]}
          >
            <ScrollView 
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.modalTitle}>Report Field Issue</Text>
              
              {/* Project Selection */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Project *</Text>
                <PressableWithFade
                  style={styles.projectPicker}
                  onPress={() => {
                    haptics.selection();
                    setShowProjectPicker(!showProjectPicker);
                  }}
                  activeOpacity={0.7}
                  hapticType="selection"
                >
                  <Text style={[styles.projectPickerText, !selectedProject && styles.placeholderText]}>
                    {selectedProject ? selectedProject.name : 'Select a project'}
                  </Text>
                  <Ionicons 
                    name={showProjectPicker ? 'chevron-up' : 'chevron-down'} 
                    size={20} 
                    color="#6B7280" 
                  />
                </PressableWithFade>
                
                {showProjectPicker && (
                  <View style={styles.projectList}>
                    {projects.length === 0 ? (
                      <Text style={styles.emptyText}>No projects available</Text>
                    ) : (
                      projects.map((project) => (
                        <PressableWithFade
                          key={project.id}
                          style={[
                            styles.projectItem,
                            issueData.project_id === project.id && styles.projectItemSelected
                          ]}
                          onPress={() => {
                            haptics.selection();
                            setIssueData({ ...issueData, project_id: project.id });
                            setShowProjectPicker(false);
                          }}
                          activeOpacity={0.7}
                          hapticType="selection"
                        >
                          <Text style={[
                            styles.projectItemText,
                            issueData.project_id === project.id && styles.projectItemTextSelected
                          ]}>
                            {project.name}
                          </Text>
                          {issueData.project_id === project.id && (
                            <Ionicons name="checkmark" size={20} color="#3B82F6" />
                          )}
                        </PressableWithFade>
                      ))
                    )}
                  </View>
                )}
              </View>

              <TextInput
                style={styles.textInput}
                placeholder="Issue Title"
                value={issueData.title}
                onChangeText={(text) => setIssueData({ ...issueData, title: text })}
                editable={!loading}
              />
              <TextInput
                style={[styles.textInput, styles.textArea]}
                multiline={true}
                numberOfLines={4}
                placeholder="Issue Description"
                value={issueData.description}
                onChangeText={(text) => setIssueData({ ...issueData, description: text })}
                editable={!loading}
              />
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.submitButton, { marginRight: 6 }]}
                  onPress={handleReportIssue}
                  disabled={loading}
                >
                  <Text style={styles.submitButtonText}>
                    {loading ? 'Reporting...' : 'Report'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.cancelButton, { marginLeft: 6 }]}
                  onPress={() => {
                    haptics.light();
                    onClose();
                  }}
                  disabled={loading}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    position: 'relative',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    minHeight: 200,
    width: '100%',
  },
  scrollView: {
    flexGrow: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 32,
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
    flex: 1,
    backgroundColor: '#E5E7EB',
    padding: 16,
    borderRadius: 8,
    minHeight: 50,
    justifyContent: 'center',
    alignItems: 'center',
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
    gap: 12,
    marginTop: 8,
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#3B82F6',
    padding: 16,
    borderRadius: 8,
    minHeight: 50,
    justifyContent: 'center',
    alignItems: 'center',
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
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  projectPicker: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
    minHeight: 44,
  },
  projectPickerText: {
    fontSize: 16,
    color: '#111827',
    flex: 1,
  },
  placeholderText: {
    color: '#9CA3AF',
  },
  projectList: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#fff',
    maxHeight: 200,
    overflow: 'hidden',
  },
  projectItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    minHeight: 44,
  },
  projectItemSelected: {
    backgroundColor: '#EFF6FF',
  },
  projectItemText: {
    fontSize: 16,
    color: '#111827',
    flex: 1,
  },
  projectItemTextSelected: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  emptyText: {
    padding: 12,
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 14,
  },
});

