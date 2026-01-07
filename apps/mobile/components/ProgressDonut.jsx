import { View, Text, StyleSheet } from 'react-native';

export default function ProgressDonut({ progress, size = 60, color = '#3B82F6' }) {
  const radius = size / 2 - 4;
  const circumference = 2 * Math.PI * radius;
  const progressLength = (progress / 100) * circumference;
  
  // Simple visual representation using View with border
  // For a true donut chart, react-native-svg would be needed
  // This is a simplified version that works without dependencies
  const progressPercent = Math.round(progress);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <View style={[styles.outerCircle, { width: size, height: size, borderRadius: size / 2 }]}>
        <View style={[styles.innerCircle, { width: size - 8, height: size - 8, borderRadius: (size - 8) / 2, borderColor: color, borderWidth: 4 }]}>
          <Text style={[styles.progressText, { color, fontSize: size * 0.2 }]}>
            {progressPercent}%
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  outerCircle: {
    borderWidth: 4,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerCircle: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  progressText: {
    fontWeight: 'bold',
  },
});

