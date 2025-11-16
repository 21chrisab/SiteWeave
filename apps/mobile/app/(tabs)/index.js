import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { fetchUserIncompleteTasks, fetchTodayEvents, fetchActivityLog } from '@siteweave/core-logic';
import QuickActionsModal from '../../components/QuickActionsModal';

export default function HomeScreen() {
  const { user, supabase } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [events, setEvents] = useState([]);
  const [activity, setActivity] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);

  const loadData = async () => {
    if (!user || !supabase) return;
    
    try {
      const [tasksData, eventsData, activityData] = await Promise.all([
        fetchUserIncompleteTasks(supabase, user.id),
        fetchTodayEvents(supabase),
        fetchActivityLog(supabase, 5)
      ]);
      
      setTasks(tasksData);
      setEvents(eventsData);
      setActivity(activityData);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  return (
    <>
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.header}>
          <Text style={styles.title}>My Day</Text>
        </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>TO-DO ({tasks.length})</Text>
        {tasks.length > 0 ? (
          tasks.map(task => (
            <View key={task.id} style={styles.taskItem}>
              <Text style={styles.taskText}>{task.text}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No tasks assigned to you.</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>RECENT ACTIVITY</Text>
        {activity.length > 0 ? (
          activity.map(item => (
            <View key={item.id} style={styles.activityItem}>
              <Text style={styles.activityText}>
                <Text style={styles.activityUser}>{item.user_name}</Text> {item.action}
              </Text>
              <Text style={styles.activityTime}>{formatTimeAgo(item.created_at)}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No recent activity.</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>TODAY'S CALENDAR ({events.length})</Text>
        {events.length > 0 ? (
          events.map(event => (
            <View key={event.id} style={styles.eventItem}>
              <Text style={styles.eventTitle}>{event.title}</Text>
              <Text style={styles.eventTime}>
                {new Date(event.start_time).toLocaleTimeString('en-US', { 
                  hour: 'numeric', 
                  minute: '2-digit',
                  hour12: true 
                })} • {event.location || 'No location'}
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No events scheduled today.</Text>
        )}
      </View>
      </ScrollView>
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowQuickActions(true)}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
      <QuickActionsModal
        visible={showQuickActions}
        onClose={() => setShowQuickActions(false)}
      />
    </>
  );
}

function formatTimeAgo(dateString) {
  const now = new Date();
  const activityDate = new Date(dateString);
  const diffInMinutes = Math.floor((now - activityDate) / (1000 * 60));
  
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  } else if (diffInMinutes < 1440) {
    return `${Math.floor(diffInMinutes / 60)}h ago`;
  } else {
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  }
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
  section: {
    padding: 20,
    backgroundColor: '#fff',
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  taskItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  taskText: {
    fontSize: 16,
    color: '#111827',
  },
  activityItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  activityText: {
    fontSize: 14,
    color: '#111827',
    marginBottom: 4,
  },
  activityUser: {
    fontWeight: '600',
  },
  activityTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  eventItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  eventTime: {
    fontSize: 14,
    color: '#6B7280',
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingVertical: 20,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  fabText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
  },
});

