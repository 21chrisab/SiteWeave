import { View, Text, StyleSheet } from 'react-native';
import PressableWithFade from './PressableWithFade';
import { Ionicons } from '@expo/vector-icons';

export default function PhaseAccordion({ phase, onAdjustProgress, isUpdating = false }) {
  const progressValue = Number.isFinite(Number(phase.progress)) ? Number(phase.progress) : 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Text style={styles.phaseName}>{phase.name}</Text>
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { width: `${progressValue}%` }
                  ]} 
                />
              </View>
              <Text style={styles.progressText}>{progressValue}%</Text>
            </View>
            <View style={styles.progressControls}>
              <PressableWithFade
                style={[styles.progressButton, isUpdating && styles.progressButtonDisabled]}
                onPress={() => onAdjustProgress?.(phase, -5)}
                disabled={isUpdating}
                activeOpacity={0.7}
              >
                <Ionicons name="remove" size={18} color="#1E3A8A" />
              </PressableWithFade>
              <Text style={styles.adjustmentText}>Adjust by 5%</Text>
              <PressableWithFade
                style={[styles.progressButton, isUpdating && styles.progressButtonDisabled]}
                onPress={() => onAdjustProgress?.(phase, 5)}
                disabled={isUpdating}
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={18} color="#1E3A8A" />
              </PressableWithFade>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  header: {
    padding: 16,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flex: 1,
  },
  phaseName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    minWidth: 40,
  },
  progressControls: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressButtonDisabled: {
    opacity: 0.5,
  },
  adjustmentText: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '600',
  },
});

