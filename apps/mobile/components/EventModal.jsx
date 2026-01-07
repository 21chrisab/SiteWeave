import { View, Text, StyleSheet, Modal, TextInput, ScrollView, KeyboardAvoidingView, Platform, Animated, Dimensions } from 'react-native';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { createCalendarEvent } from '@siteweave/core-logic';
import PressableWithFade from './PressableWithFade';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useHaptics } from '../hooks/useHaptics';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function EventModal({ visible, onClose, selectedDate, onEventCreated }) {
  const { user, supabase } = useAuth();
  const haptics = useHaptics();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [category, setCategory] = useState('meeting');
  const [isAllDay, setIsAllDay] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const modalTranslateY = useRef(new Animated.Value(1)).current;
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (visible) {
      haptics.light();
      Animated.timing(backdropOpacity, {
        toValue: 0.7,
        duration: 150,
        useNativeDriver: true,
      }).start();
      
      Animated.timing(modalTranslateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
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

  const categories = [
    { value: 'meeting', label: 'Meeting', color: '#3B82F6' },
    { value: 'site-visit', label: 'Site Visit', color: '#10B981' },
    { value: 'progress-review', label: 'Progress Review', color: '#EF4444' },
    { value: 'other', label: 'Other', color: '#6B7280' },
  ];

  const handleSave = async () => {
    if (!title.trim() || !user || !supabase || !selectedDate) return;

    try {
      haptics.medium();
      setLoading(true);
      
      const dateStr = selectedDate ? selectedDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
      let startDateTime, endDateTime;

      if (isAllDay) {
        startDateTime = new Date(`${dateStr}T00:00:00`).toISOString();
        endDateTime = new Date(`${dateStr}T23:59:59`).toISOString();
      } else {
        startDateTime = new Date(`${dateStr}T${startTime}:00`).toISOString();
        endDateTime = new Date(`${dateStr}T${endTime}:00`).toISOString();
      }

      const eventData = {
        title: title.trim(),
        description: description.trim() || null,
        location: location.trim() || null,
        start_time: startDateTime,
        end_time: endDateTime,
        category,
        is_all_day: isAllDay,
        user_id: user.id,
      };

      await createCalendarEvent(supabase, eventData);
      
      // Reset form
      setTitle('');
      setDescription('');
      setLocation('');
      setStartTime('09:00');
      setEndTime('10:00');
      setCategory('meeting');
      setIsAllDay(false);
      
      haptics.success();
      onEventCreated?.();
      onClose();
    } catch (error) {
      console.error('Error creating event:', error);
      haptics.error();
      alert('Failed to create event. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      haptics.light();
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.modalContainer}>
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]} />
        
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <Animated.View 
            style={[
              styles.modalContentWrapper,
              {
                transform: [{ translateY: modalTranslateY.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, SCREEN_HEIGHT],
                }) }],
              }
            ]}
          >
            <View style={[styles.modalContent, { paddingTop: insets.top }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Event</Text>
            <PressableWithFade
              style={styles.closeButton}
              onPress={handleClose}
              disabled={loading}
              hapticType="light"
            >
              <Ionicons name="close" size={24} color="#111827" />
            </PressableWithFade>
          </View>

          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
              <View style={styles.formGroup}>
                <Text style={styles.label}>Title *</Text>
                <TextInput
                  style={styles.input}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Event title"
                  placeholderTextColor="#9CA3AF"
                  editable={!loading}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Add description"
                  placeholderTextColor="#9CA3AF"
                  multiline={true}
                  numberOfLines={4}
                  editable={!loading}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Location</Text>
                <TextInput
                  style={styles.input}
                  value={location}
                  onChangeText={setLocation}
                  placeholder="Event location"
                  placeholderTextColor="#9CA3AF"
                  editable={!loading}
                />
              </View>

              <View style={styles.formGroup}>
                <PressableWithFade
                  style={styles.checkboxRow}
                  onPress={() => {
                    if (!loading) {
                      haptics.selection();
                      setIsAllDay(!isAllDay);
                    }
                  }}
                  disabled={loading}
                  hapticType="selection"
                >
                  <Ionicons
                    name={isAllDay ? "checkbox" : "square-outline"}
                    size={24}
                    color={isAllDay ? "#3B82F6" : "#4B5563"}
                  />
                  <Text style={styles.checkboxLabel}>All day event</Text>
                </PressableWithFade>
              </View>

              {!isAllDay && (
                <>
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Start Time</Text>
                    <TextInput
                      style={styles.input}
                      value={startTime}
                      onChangeText={setStartTime}
                      placeholder="09:00"
                      placeholderTextColor="#9CA3AF"
                      editable={!loading}
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>End Time</Text>
                    <TextInput
                      style={styles.input}
                      value={endTime}
                      onChangeText={setEndTime}
                      placeholder="10:00"
                      placeholderTextColor="#9CA3AF"
                      editable={!loading}
                    />
                  </View>
                </>
              )}

              <View style={styles.formGroup}>
                <Text style={styles.label}>Category</Text>
                <View style={styles.categoryContainer}>
                  {categories.map((cat) => (
                    <PressableWithFade
                      key={cat.value}
                      style={[
                        styles.categoryChip,
                        category === cat.value && styles.categoryChipActive,
                        { borderColor: cat.color }
                      ]}
                      onPress={() => {
                        if (!loading) {
                          haptics.selection();
                          setCategory(cat.value);
                        }
                      }}
                      disabled={loading}
                      hapticType="selection"
                    >
                      <Text
                        style={[
                          styles.categoryChipText,
                          category === cat.value && { color: cat.color }
                        ]}
                      >
                        {cat.label}
                      </Text>
                    </PressableWithFade>
                  ))}
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <PressableWithFade
                style={[styles.button, styles.cancelButton]}
                onPress={handleClose}
                disabled={loading}
                hapticType="light"
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </PressableWithFade>
              <PressableWithFade
                style={[
                  styles.button,
                  styles.saveButton,
                  (!title.trim() || loading) && styles.saveButtonDisabled
                ]}
                onPress={handleSave}
                disabled={!title.trim() || loading}
                hapticType="medium"
              >
                <Text style={styles.saveButtonText}>
                  {loading ? 'Saving...' : 'Save'}
                </Text>
              </PressableWithFade>
            </View>
            </View>
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
  modalOverlay: {
    flex: 1,
  },
  modalContentWrapper: {
    flex: 1,
  },
  modalContent: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexGrow: 1,
  },
  formGroup: {
    marginTop: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#fff',
    minHeight: 44,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 44,
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#111827',
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    minHeight: 44,
    justifyContent: 'center',
  },
  categoryChipActive: {
    backgroundColor: '#fff',
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#fff',
    justifyContent: 'flex-end',
  },
  button: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
    flex: 0,
    paddingHorizontal: 20,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4B5563',
  },
  saveButton: {
    backgroundColor: '#3B82F6',
    flex: 0,
    paddingHorizontal: 25,
    minWidth: 110,
  },
  saveButtonDisabled: {
    backgroundColor: '#9CA3AF',
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

