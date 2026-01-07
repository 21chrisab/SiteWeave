import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function KPICarousel({ activeProjects, completedTasks, overdueTasks }) {
  const kpiData = [
    {
      title: 'Active Projects',
      value: activeProjects,
      color: '#3B82F6',
      bgColor: '#DBEAFE',
      icon: 'business-outline',
    },
    {
      title: 'Tasks Completed',
      value: completedTasks,
      color: '#10B981',
      bgColor: '#D1FAE5',
      icon: 'checkmark-circle-outline',
    },
    {
      title: 'Overdue Tasks',
      value: overdueTasks,
      color: overdueTasks > 0 ? '#EF4444' : '#6B7280',
      bgColor: overdueTasks > 0 ? '#FEE2E2' : '#F3F4F6',
      icon: 'alert-circle-outline',
    },
  ];

  return (
    <View style={styles.container}>
      {kpiData.map((kpi, index) => (
        <View
          key={index}
          style={[
            styles.card,
            {
              backgroundColor: kpi.bgColor,
              marginRight: index < kpiData.length - 1 ? 8 : 0,
            },
          ]}
        >
          <View style={styles.cardContent}>
            <View style={styles.iconContainer}>
              <Ionicons name={kpi.icon} size={24} color={kpi.color} />
            </View>
            <Text style={[styles.value, { color: kpi.color }]}>{kpi.value}</Text>
            <Text style={[styles.title, { color: kpi.color }]} numberOfLines={2}>{kpi.title}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  card: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    minHeight: 100,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardContent: {
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 8,
  },
  value: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  title: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});

