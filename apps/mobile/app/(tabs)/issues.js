import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { fetchUserIncompleteTasks, completeTask } from '@siteweave/core-logic';

export default function IssuesScreen() {
  const { user, supabase } = useAuth();
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadIssues = async () => {
    if (!user) return;
    
    try {
      const tasks = await fetchUserIncompleteTasks(supabase, user.id);
      setIssues(tasks);
    } catch (error) {
      console.error('Error loading issues:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIssues();
  }, [user]);

  const handleCompleteTask = async (taskId) => {
    try {
      await completeTask(supabase, taskId);
      setIssues(issues.filter(issue => issue.id !== taskId));
    } catch (error) {
      console.error('Error completing task:', error);
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
        <Text style={styles.title}>Issues</Text>
      </View>
      
      <FlatList
        data={issues}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.issueCard}>
            <Text style={styles.issueTitle}>{item.text}</Text>
            {item.description && (
              <Text style={styles.issueDescription}>{item.description}</Text>
            )}
            <View style={styles.issueFooter}>
              {item.due_date && (
                <Text style={styles.issueDate}>
                  Due: {new Date(item.due_date).toLocaleDateString()}
                </Text>
              )}
              <TouchableOpacity
                style={styles.completeButton}
                onPress={() => handleCompleteTask(item.id)}
              >
                <Text style={styles.completeButtonText}>Complete</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No issues assigned to you.</Text>
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
  },
  issueCard: {
    backgroundColor: '#fff',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  issueTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  issueDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  issueFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  issueDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  completeButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  completeButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
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

