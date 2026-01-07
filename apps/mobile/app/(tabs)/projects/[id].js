import { View, Text, StyleSheet, ScrollView, SectionList, FlatList } from 'react-native';
import { useState, useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../../context/AuthContext';
import { 
  fetchProject, 
  fetchTasksByProject,
  fetchUserProjectsWithProgress,
  completeTask,
  updateTask,
  fetchProjectIssues
} from '@siteweave/core-logic';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import PhaseAccordion from '../../../components/PhaseAccordion';
import ProjectTeamModal from '../../../components/ProjectTeamModal';
import PressableWithFade from '../../../components/PressableWithFade';

export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { supabase } = useAuth();
  const insets = useSafeAreaInsets();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [phases, setPhases] = useState([]);
  const [files, setFiles] = useState([]);
  const [issues, setIssues] = useState([]);
  const [activeTab, setActiveTab] = useState('tasks');
  const [loading, setLoading] = useState(true);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    loadProjectData();
  }, [id]);

  useEffect(() => {
    if (activeTab === 'issues' && id && supabase) {
      loadIssues();
    }
  }, [activeTab, id, supabase]);

  const loadIssues = async () => {
    if (!id || !supabase) return;
    try {
      const issuesData = await fetchProjectIssues(supabase, id, 'open').catch(err => {
        console.error('Error fetching issues:', err);
        return [];
      });
      setIssues(issuesData || []);
    } catch (error) {
      console.error('Error loading issues:', error);
      setIssues([]);
    }
  };

  const loadProjectData = async () => {
    if (!id || !supabase) return;
    
    try {
      setLoading(true);
      const [projectData, tasksData, phasesResult, filesResult] = await Promise.all([
        fetchProject(supabase, id).catch(err => {
          console.error('Error fetching project:', err);
          return null;
        }),
        fetchTasksByProject(supabase, id).catch(err => {
          console.error('Error fetching tasks:', err);
          return [];
        }),
        supabase.from('project_phases').select('*').eq('project_id', id).order('order', { ascending: true }).then(
          ({ data, error }) => {
            if (error) {
              console.error('Error fetching phases:', error);
              return { data: [], error };
            }
            return { data: data || [], error: null };
          }
        ).catch(err => {
          console.error('Error fetching phases:', err);
          return { data: [], error: err };
        }),
        supabase.from('files').select('*').eq('project_id', id).order('modified_at', { ascending: false }).then(
          ({ data, error }) => {
            if (error) {
              console.error('Error fetching files:', error);
              return { data: [], error };
            }
            return { data: data || [], error: null };
          }
        ).catch(err => {
          console.error('Error fetching files:', err);
          return { data: [], error: err };
        }),
      ]);

      // Handle project data - if null, project doesn't exist or user doesn't have access
      if (!projectData) {
        setProject(null);
        setLoading(false);
        return;
      }

      setProject(projectData);
      setTasks(tasksData || []);
      setPhases(phasesResult.data || []);
      setFiles(filesResult.data || []);

      // Calculate progress
      if (phasesResult.data && phasesResult.data.length > 0) {
        const totalBudget = phasesResult.data.reduce((sum, phase) => sum + (phase.budget || 0), 0);
        if (totalBudget > 0) {
          const totalWeightedProgress = phasesResult.data.reduce((sum, phase) => {
            const phaseWeight = (phase.budget || 0) / totalBudget;
            return sum + (phase.progress * phaseWeight);
          }, 0);
          setProgress(Math.round(totalWeightedProgress));
        }
      }
    } catch (error) {
      console.error('Error loading project data:', error);
      setProject(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteTask = async (taskId) => {
    try {
      await completeTask(supabase, taskId);
      loadProjectData(); // Reload tasks
    } catch (error) {
      console.error('Error completing task:', error);
    }
  };

  const groupTasksByStatus = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    const late = tasks.filter(task => 
      !task.completed && 
      task.due_date && 
      task.due_date < todayStr
    );
    
    const todayTasks = tasks.filter(task => 
      !task.completed && 
      task.due_date === todayStr
    );
    
    const upcoming = tasks.filter(task => 
      !task.completed && 
      (!task.due_date || task.due_date > todayStr)
    );

    const completed = tasks.filter(task => task.completed);

    const sections = [];
    if (late.length > 0) {
      sections.push({ title: 'Late', data: late });
    }
    if (todayTasks.length > 0) {
      sections.push({ title: 'Today', data: todayTasks });
    }
    if (upcoming.length > 0) {
      sections.push({ title: 'Upcoming', data: upcoming });
    }
    if (completed.length > 0) {
      sections.push({ title: 'Completed', data: completed });
    }

    return sections;
  };

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high':
        return '#EF4444';
      case 'medium':
        return '#F59E0B';
      case 'low':
        return '#6B7280';
      default:
        return '#6B7280';
    }
  };

  const renderTaskItem = ({ item }) => (
    <PressableWithFade
      style={styles.taskItem}
      onPress={() => handleCompleteTask(item.id)}
      activeOpacity={0.7}
    >
      <View style={styles.taskContent}>
        <View style={styles.taskLeft}>
          <Ionicons 
            name={item.completed ? "checkmark-circle" : "ellipse-outline"} 
            size={24} 
            color={item.completed ? "#10B981" : "#4B5563"} 
          />
          <View style={styles.taskText}>
            <Text style={[styles.taskTitle, item.completed && styles.taskCompleted]}>
              {item.text}
            </Text>
            {item.due_date && (
              <Text style={styles.taskDueDate}>
                Due: {new Date(item.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </Text>
            )}
          </View>
        </View>
        {item.priority && (
          <View style={[styles.priorityPill, { backgroundColor: getPriorityColor(item.priority) + '20' }]}>
            <Text style={[styles.priorityText, { color: getPriorityColor(item.priority) }]}>
              {item.priority}
            </Text>
          </View>
        )}
      </View>
    </PressableWithFade>
  );

  const renderFileItem = ({ item }) => (
    <PressableWithFade style={styles.fileItem} activeOpacity={0.7}>
      <Ionicons name="document-outline" size={24} color="#3B82F6" />
      <View style={styles.fileInfo}>
        <Text style={styles.fileName} numberOfLines={1}>{item.name}</Text>
        {item.modified_at && (
          <Text style={styles.fileDate}>
            {new Date(item.modified_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={20} color="#4B5563" />
    </PressableWithFade>
  );

  const getIssuePriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'critical':
        return '#DC2626';
      case 'high':
        return '#EF4444';
      case 'medium':
        return '#F59E0B';
      case 'low':
        return '#6B7280';
      default:
        return '#6B7280';
    }
  };

  const formatIssueDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const renderIssueItem = ({ item }) => (
    <View style={styles.issueItem}>
      <View style={styles.issueContent}>
        <View style={styles.issueLeft}>
          <View style={[styles.issuePriorityIndicator, { backgroundColor: getIssuePriorityColor(item.priority) }]} />
          <View style={styles.issueText}>
            <Text style={styles.issueTitle} numberOfLines={2}>
              {item.title}
            </Text>
            {item.description && (
              <Text style={styles.issueDescription} numberOfLines={2}>
                {item.description}
              </Text>
            )}
            <View style={styles.issueMeta}>
              {item.created_at && (
                <Text style={styles.issueDate}>
                  {formatIssueDate(item.created_at)}
                </Text>
              )}
              {item.priority && (
                <View style={[styles.issuePriorityBadge, { backgroundColor: getIssuePriorityColor(item.priority) + '20' }]}>
                  <Text style={[styles.issuePriorityText, { color: getIssuePriorityColor(item.priority) }]}>
                    {item.priority}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.safeArea, { paddingTop: insets.top }]}>
        <View style={styles.loadingContainer}>
          <Text>Loading...</Text>
        </View>
      </View>
    );
  }

  if (!project) {
    return (
      <View style={[styles.safeArea, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <PressableWithFade 
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </PressableWithFade>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.emptyText}>Project not found</Text>
        </View>
      </View>
    );
  }

  const taskSections = groupTasksByStatus();

  return (
    <View style={[styles.safeArea, { paddingTop: insets.top }]}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <PressableWithFade 
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </PressableWithFade>
          <View style={styles.headerRight}>
            <PressableWithFade
              style={styles.teamButton}
              onPress={() => setShowTeamModal(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="people-outline" size={24} color="#3B82F6" />
            </PressableWithFade>
          </View>
        </View>

        {/* Project Title and Progress */}
        <View style={styles.projectHeader}>
          <Text style={styles.projectTitle}>{project.name}</Text>
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
            <Text style={styles.progressText}>{progress}%</Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          <PressableWithFade
            style={[styles.tab, activeTab === 'tasks' && styles.tabActive]}
            onPress={() => setActiveTab('tasks')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === 'tasks' && styles.tabTextActive]}>
              Tasks
            </Text>
          </PressableWithFade>
          <PressableWithFade
            style={[styles.tab, activeTab === 'details' && styles.tabActive]}
            onPress={() => setActiveTab('details')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === 'details' && styles.tabTextActive]}>
              Details
            </Text>
          </PressableWithFade>
          <PressableWithFade
            style={[styles.tab, activeTab === 'files' && styles.tabActive]}
            onPress={() => setActiveTab('files')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === 'files' && styles.tabTextActive]}>
              Files
            </Text>
          </PressableWithFade>
          <PressableWithFade
            style={[styles.tab, activeTab === 'issues' && styles.tabActive]}
            onPress={() => setActiveTab('issues')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === 'issues' && styles.tabTextActive]}>
              Issues
            </Text>
          </PressableWithFade>
        </View>

        {/* Tab Content */}
        <View style={styles.tabContent}>
          {activeTab === 'tasks' && (
            <View>
              {taskSections.length > 0 ? (
                <SectionList
                  sections={taskSections}
                  keyExtractor={(item) => item.id}
                  renderItem={renderTaskItem}
                  renderSectionHeader={({ section: { title } }) => (
                    <View style={styles.sectionHeader}>
                      <Text style={styles.sectionHeaderText}>{title}</Text>
                    </View>
                  )}
                  scrollEnabled={false}
                />
              ) : (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No tasks for this project.</Text>
                </View>
              )}
            </View>
          )}

          {activeTab === 'details' && (
            <View>
              {phases.length > 0 ? (
                phases.map((phase) => (
                  <PhaseAccordion key={phase.id} phase={phase} />
                ))
              ) : (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No phases defined for this project.</Text>
                </View>
              )}
            </View>
          )}

          {activeTab === 'files' && (
            <View>
              {files.length > 0 ? (
                <FlatList
                  data={files}
                  keyExtractor={(item) => item.id}
                  renderItem={renderFileItem}
                  scrollEnabled={false}
                />
              ) : (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No files for this project.</Text>
                </View>
              )}
            </View>
          )}

          {activeTab === 'issues' && (
            <View>
              {issues.length > 0 ? (
                <FlatList
                  data={issues}
                  keyExtractor={(item) => item.id}
                  renderItem={renderIssueItem}
                  scrollEnabled={false}
                />
              ) : (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No open issues for this project.</Text>
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      <ProjectTeamModal
        visible={showTeamModal}
        projectId={id}
        onClose={() => setShowTeamModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    minHeight: 44,
  },
  backButton: {
    padding: 8,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    gap: 12,
  },
  teamButton: {
    padding: 8,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  projectHeader: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  projectTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
  },
  progressText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    minWidth: 50,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingHorizontal: 8,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    minHeight: 44,
  },
  tabActive: {
    borderBottomColor: '#3B82F6',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#3B82F6',
  },
  tabContent: {
    padding: 16,
    backgroundColor: '#fff',
    marginTop: 8,
  },
  sectionHeader: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
  },
  sectionHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
    textTransform: 'uppercase',
  },
  taskItem: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    minHeight: 44,
  },
  taskContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taskLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  taskText: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  taskCompleted: {
    textDecorationLine: 'line-through',
    color: '#4B5563',
  },
  taskDueDate: {
    fontSize: 14,
    color: '#4B5563',
  },
  priorityPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '600',
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 12,
    minHeight: 44,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  fileDate: {
    fontSize: 14,
    color: '#4B5563',
  },
  issueItem: {
    backgroundColor: '#fff',
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  issueContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  issueLeft: {
    flex: 1,
    flexDirection: 'row',
    gap: 12,
  },
  issuePriorityIndicator: {
    width: 4,
    borderRadius: 2,
  },
  issueText: {
    flex: 1,
  },
  issueTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  issueDescription: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 8,
    lineHeight: 20,
  },
  issueMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  issueDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  issuePriorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  issuePriorityText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#4B5563',
  },
});

