import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function KPICarousel({ activeProjects, completedTasks, overdueTasks }) {
  const kpiData = [
    {
      title: 'Active',
      subtitle: 'Projects',
      value: activeProjects,
      color: '#3B82F6',
      icon: 'business-outline',
    },
    {
      title: 'Tasks',
      subtitle: 'Completed',
      value: completedTasks,
      color: '#10B981',
      icon: 'checkmark-circle-outline',
    },
    {
      title: 'Overdue',
      subtitle: 'Tasks',
      value: overdueTasks,
      color: overdueTasks > 0 ? '#EF4444' : '#6B7280',
      icon: 'alert-circle-outline',
    },
  ];

  return (
    <View style={styles.container}>
      {/* Single merged card with all stats */}
      <View style={styles.dashboardCard}>
        {kpiData.map((kpi, index) => (
          <View key={index} style={styles.statContainer}>
            {/* Stat content */}
            <View style={styles.statContent}>
              <Ionicons name={kpi.icon} size={20} color={kpi.color} style={styles.icon} />
              <Text style={[styles.value, { color: kpi.color }]}>{kpi.value}</Text>
              <View style={styles.labelContainer}>
                <Text style={styles.title} numberOfLines={1}>{kpi.title}</Text>
                <Text style={styles.subtitle} numberOfLines={1}>{kpi.subtitle}</Text>
              </View>
            </View>
            
            {/* Vertical divider (not for last item) */}
            {index < kpiData.length - 1 && <View style={styles.divider} />}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dashboardCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 20,
    paddingHorizontal: 8,
    // Subtle border instead of shadow - makes it feel like a container, not a button
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginBottom: 4,
  },
  value: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  labelContainer: {
    marginTop: 2,
  },
  title: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 14,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 14,
    marginTop: 1,
  },
  divider: {
    width: 1,
    height: '70%',
    backgroundColor: '#E5E7EB',
    marginHorizontal: 8,
  },
});

