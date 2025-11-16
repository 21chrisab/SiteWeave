import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { fetchTodayEvents } from '@siteweave/core-logic';

export default function CalendarScreen() {
  const { supabase } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      const data = await fetchTodayEvents(supabase);
      setEvents(data);
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Today's Schedule</Text>
        <Text style={styles.date}>{new Date().toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })}</Text>
      </View>

      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.eventCard}>
            <View style={styles.eventTimeContainer}>
              <Text style={styles.eventTime}>
                {new Date(item.start_time).toLocaleTimeString('en-US', { 
                  hour: 'numeric', 
                  minute: '2-digit',
                  hour12: true 
                })}
              </Text>
              {item.end_time && (
                <Text style={styles.eventTimeEnd}>
                  - {new Date(item.end_time).toLocaleTimeString('en-US', { 
                    hour: 'numeric', 
                    minute: '2-digit',
                    hour12: true 
                  })}
                </Text>
              )}
            </View>
            <Text style={styles.eventTitle}>{item.title}</Text>
            {item.location && (
              <Text style={styles.eventLocation}>📍 {item.location}</Text>
            )}
            {item.description && (
              <Text style={styles.eventDescription}>{item.description}</Text>
            )}
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No events scheduled for today.</Text>
          </View>
        }
      />
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
    marginBottom: 4,
  },
  date: {
    fontSize: 16,
    color: '#6B7280',
  },
  eventCard: {
    backgroundColor: '#fff',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  eventTimeContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  eventTime: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  eventTimeEnd: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  eventLocation: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  eventDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
  },
});

