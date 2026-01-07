import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useState } from 'react';
import PressableWithFade from './PressableWithFade';
import { useHaptics } from '../hooks/useHaptics';

export default function DatePickerStrip({ selectedDate, onDateSelect, eventsByDate = {} }) {
  const haptics = useHaptics();
  const [showMonthView, setShowMonthView] = useState(false);
  
  // Get current week dates
  const getWeekDates = () => {
    const dates = [];
    const today = selectedDate || new Date();
    const startOfWeek = new Date(today);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day;
    startOfWeek.setDate(diff);

    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  // Get month dates for month view
  const getMonthDates = () => {
    const dates = [];
    const today = selectedDate || new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startDate.getDay()); // Start from Sunday

    for (let i = 0; i < 42; i++) { // 6 weeks
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const weekDates = getWeekDates();
  const monthDates = getMonthDates();
  const selectedDateStr = selectedDate ? selectedDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

  const isSameDay = (date1, date2) => {
    if (!date1 || !date2) return false;
    return date1.toISOString().split('T')[0] === date2.toISOString().split('T')[0];
  };

  const hasEvents = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return eventsByDate[dateStr] && eventsByDate[dateStr].length > 0;
  };

  const renderWeekView = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.weekContainer}>
      {weekDates.map((date, index) => {
        const dateStr = date.toISOString().split('T')[0];
        const isSelected = isSameDay(date, selectedDate);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        const dayNumber = date.getDate();
        const isToday = isSameDay(date, new Date());

        return (
          <PressableWithFade
            key={index}
            style={[
              styles.dayButton,
              isSelected && styles.dayButtonSelected,
              isToday && !isSelected && styles.dayButtonToday,
            ]}
            onPress={() => {
              haptics.selection();
              onDateSelect(date);
            }}
            activeOpacity={0.7}
            hapticType="selection"
          >
            <Text style={[styles.dayName, isSelected && styles.dayNameSelected]}>
              {dayName}
            </Text>
            <View style={[styles.dayNumberContainer, isSelected && styles.dayNumberContainerSelected]}>
              <Text style={[styles.dayNumber, isSelected && styles.dayNumberSelected]}>
                {dayNumber}
              </Text>
            </View>
            {hasEvents(date) && (
              <View style={[styles.eventDot, isSelected && styles.eventDotSelected]} />
            )}
          </PressableWithFade>
        );
      })}
    </ScrollView>
  );

  const renderMonthView = () => {
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    return (
      <View style={styles.monthContainer}>
        <View style={styles.monthHeader}>
          {weekDays.map((day, index) => (
            <View key={index} style={styles.monthDayHeader}>
              <Text style={styles.monthDayHeaderText}>{day}</Text>
            </View>
          ))}
        </View>
        <View style={styles.monthGrid}>
          {monthDates.map((date, index) => {
            const dateStr = date.toISOString().split('T')[0];
            const isSelected = isSameDay(date, selectedDate);
            const isCurrentMonth = date.getMonth() === (selectedDate || new Date()).getMonth();
            const dayNumber = date.getDate();
            const isToday = isSameDay(date, new Date());

            return (
              <PressableWithFade
                key={index}
                style={[
                  styles.monthDay,
                  isSelected && styles.monthDaySelected,
                  isToday && !isSelected && styles.monthDayToday,
                  !isCurrentMonth && styles.monthDayOtherMonth,
                ]}
                onPress={() => {
                  haptics.selection();
                  onDateSelect(date);
                  setShowMonthView(false);
                }}
                activeOpacity={0.7}
                hapticType="selection"
              >
                <Text
                  style={[
                    styles.monthDayNumber,
                    isSelected && styles.monthDayNumberSelected,
                    !isCurrentMonth && styles.monthDayNumberOtherMonth,
                  ]}
                >
                  {dayNumber}
                </Text>
                {hasEvents(date) && (
                  <View style={[styles.monthEventDot, isSelected && styles.monthEventDotSelected]} />
                )}
              </PressableWithFade>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {selectedDate ? selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : ''}
        </Text>
        <PressableWithFade
          style={styles.toggleButton}
          onPress={() => {
            haptics.selection();
            setShowMonthView(!showMonthView);
          }}
          activeOpacity={0.7}
          hapticType="selection"
        >
          <Text style={styles.toggleButtonText}>
            {showMonthView ? 'Week' : 'Month'}
          </Text>
        </PressableWithFade>
      </View>
      {showMonthView ? renderMonthView() : renderWeekView()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    minHeight: 44,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  toggleButton: {
    padding: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  weekContainer: {
    paddingHorizontal: 8,
    paddingBottom: 12,
  },
  dayButton: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 4,
    borderRadius: 12,
    minWidth: 60,
    minHeight: 44,
  },
  dayButtonSelected: {
    backgroundColor: '#3B82F6',
  },
  dayButtonToday: {
    backgroundColor: '#DBEAFE',
  },
  dayName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  dayNameSelected: {
    color: '#fff',
  },
  dayNumberContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  dayNumberContainerSelected: {
    backgroundColor: '#fff',
  },
  dayNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  dayNumberSelected: {
    color: '#3B82F6',
  },
  eventDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#3B82F6',
    marginTop: 2,
  },
  eventDotSelected: {
    backgroundColor: '#fff',
  },
  monthContainer: {
    padding: 8,
  },
  monthHeader: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  monthDayHeader: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  monthDayHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  monthDay: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    margin: 2,
    minHeight: 44,
  },
  monthDaySelected: {
    backgroundColor: '#3B82F6',
  },
  monthDayToday: {
    backgroundColor: '#DBEAFE',
  },
  monthDayOtherMonth: {
    opacity: 0.3,
  },
  monthDayNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  monthDayNumberSelected: {
    color: '#fff',
  },
  monthDayNumberOtherMonth: {
    color: '#4B5563',
  },
  monthEventDot: {
    position: 'absolute',
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#3B82F6',
  },
  monthEventDotSelected: {
    backgroundColor: '#fff',
  },
});

