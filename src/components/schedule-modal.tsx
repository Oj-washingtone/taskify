import React, { useState, useMemo, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, TextInput, Alert, KeyboardAvoidingView, FlatList, Modal, Animated, Keyboard, Switch } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTasks } from '@/context/TasksContext';
import { Task } from '@/types/task.types';

interface ScheduleModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function ScheduleModal({ visible, onClose }: ScheduleModalProps) {
  const { tasks, addTask, toggleTaskCompletion, removeTask } = useTasks();
  const insets = useSafeAreaInsets();
  
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  
  const weekDates = useMemo(() => {
    const dates = [];
    const baseDate = new Date();
    for (let i = -3; i <= 14; i++) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() + i);
      dates.push(d);
    }
    return dates;
  }, []);

  const [modalVisible, setModalVisible] = useState(false);
  const [taskDetailsVisible, setTaskDetailsVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isAllDay, setIsAllDay] = useState(false);
  const [startTime, setStartTime] = useState<Date>(new Date());
  const [endTime, setEndTime] = useState<Date>(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [selectedTimeBlock, setSelectedTimeBlock] = useState<{hour: number, date: Date} | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const keyboardHeight = useRef(new Animated.Value(0)).current;
  const timelineScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (visible) {
      setTimeout(() => {
        if (timelineScrollRef.current) {
          let targetHour: number | null = null;
          
          const taskHours = tasksForSelectedDate.map(t => new Date(t.dueDate!).getHours());
          
          if (taskHours.length > 0) {
            targetHour = Math.min(...taskHours); // Scroll to the first task
          } else if (isSameDay(selectedDate, new Date())) {
            targetHour = new Date().getHours(); // Or current time if today is empty
          }

          if (targetHour !== null) {
            timelineScrollRef.current.scrollTo({ y: Math.max(0, targetHour - 1) * 70, animated: true });
          }
        }
      }, 400); // Wait for modal animation to finish
    }
  }, [visible, selectedDate]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    
    // Android Modal breaks adjustResize, so we manually measure the keyboard
    const showSub = Keyboard.addListener('keyboardDidShow', (e) => {
      Animated.timing(keyboardHeight, {
        toValue: e.endCoordinates.height,
        duration: 150, // Fast to catch up with keyboard
        useNativeDriver: false,
      }).start();
    });

    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      Animated.timing(keyboardHeight, {
        toValue: 0,
        duration: 150,
        useNativeDriver: false,
      }).start();
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleClose = () => {
    setModalVisible(false);
    setSelectedTimeBlock(null);
  };

  const timeSlots = Array.from({length: 24}, (_, i) => i);

  const tasksForSelectedDate = useMemo(() => {
    return tasks.filter(t => {
      if (!t.dueDate) return false;
      const td = new Date(t.dueDate);
      return td.getDate() === selectedDate.getDate() && 
             td.getMonth() === selectedDate.getMonth() && 
             td.getFullYear() === selectedDate.getFullYear();
    });
  }, [tasks, selectedDate]);

  const handleTimeSlotPress = (hour: number) => {
    const d = new Date(selectedDate);
    d.setHours(hour, 0, 0, 0);
    const endD = new Date(d);
    endD.setHours(hour + 1, 0, 0, 0);
    
    setSelectedTimeBlock({ hour, date: d });
    setStartTime(d);
    setEndTime(endD);
    setIsAllDay(false);
    setTitle('');
    setDescription('');
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Title is required');
      return;
    }
    if (!isAllDay && endTime <= startTime) {
      Alert.alert('Error', 'End time must be after start time');
      return;
    }
    
    try {
      await addTask({ 
        title, 
        description, 
        isAllDay,
        dueDate: isAllDay ? selectedDate.toISOString() : startTime.toISOString(),
        endDate: isAllDay ? undefined : endTime.toISOString()
      });
      handleClose();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save task');
    }
  };

  const formatHour = (h: number) => {
    return `${h.toString().padStart(2, '0')}:00`;
  };

  const isSameDay = (d1: Date, d2: Date) => {
    return d1.getDate() === d2.getDate() && d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={onClose}>
            <Ionicons name="close" size={28} color="#010F1C" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Schedule</Text>
          <View style={{ width: 40 }} />
        </View>

      <TouchableOpacity style={styles.monthLabelContainer} onPress={() => setShowMonthPicker(true)}>
        <Text style={styles.monthLabel}>
          {selectedDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </Text>
        <Ionicons name="chevron-down" size={16} color="#646464" style={{ marginLeft: 4, marginTop: 2 }} />
      </TouchableOpacity>
      
      {showMonthPicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          onValueChange={(event, date) => {
            if (Platform.OS !== 'ios') setShowMonthPicker(false);
            if (date) setSelectedDate(date);
          }}
          onDismiss={() => setShowMonthPicker(false)}
        />
      )}

      {/* Week Calendar Strip */}
      <View style={{ height: 80, marginBottom: 10 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.calendarStrip}>
          {weekDates.map((date, index) => {
            const isSelected = isSameDay(date, selectedDate);
            const isToday = isSameDay(date, new Date());
            return (
              <TouchableOpacity 
                key={index} 
                style={[styles.dateCard, isSelected && styles.dateCardSelected]}
                onPress={() => setSelectedDate(date)}
              >
                <Text style={[styles.dateDay, isSelected && styles.dateDaySelected]}>
                  {date.toLocaleString('default', { weekday: 'short' })}
                </Text>
                <View style={[styles.dateNumberCircle, isSelected && styles.dateNumberCircleSelected]}>
                  <Text style={[styles.dateNumber, isSelected && styles.dateNumberSelected, isToday && !isSelected && { color: '#3BB77E' }]}>
                    {date.getDate()}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Timeline ScrollView */}
      <ScrollView 
        ref={timelineScrollRef}
        style={styles.timelineContainer} 
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingBottom: 100, paddingTop: 10, position: 'relative' }}>
          
          {/* Current Time Indicator */}
          {isSameDay(selectedDate, new Date()) && (
            <View style={{ 
              position: 'absolute', 
              top: 10 + new Date().getHours() * 70 + (new Date().getMinutes() / 60) * 70, 
              left: 56, 
              right: 0, 
              height: 2, 
              backgroundColor: '#FF4D4D', 
              zIndex: 50 
            }}>
              <View style={{ position: 'absolute', left: -4, top: -4, width: 10, height: 10, borderRadius: 5, backgroundColor: '#FF4D4D' }} />
            </View>
          )}

          {/* All-Day Tasks Section */}
          {tasksForSelectedDate.filter(t => t.isAllDay).length > 0 && (
            <View style={{ paddingLeft: 56, paddingRight: 16, marginBottom: 16, marginTop: 10 }}>
              {tasksForSelectedDate.filter(t => t.isAllDay).map((task) => (
                <TouchableOpacity 
                  key={task.id} 
                  style={[styles.taskBlock, { position: 'relative', left: 0, right: 0, top: 0, marginBottom: 4, paddingVertical: 10, minHeight: 40 }, task.completed && { opacity: 0.6 }]}
                  activeOpacity={0.7}
                  onPress={() => {
                    setSelectedTask(task);
                    setTaskDetailsVisible(true);
                  }}
                >
                  <View style={[styles.taskBlockColorBar, task.completed && { backgroundColor: '#939393' }]} />
                  <View style={[styles.taskBlockContent, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 12 }]}>
                    <Text style={[styles.taskBlockTitle, { marginBottom: 0, flex: 1 }, task.completed && { textDecorationLine: 'line-through', color: '#939393' }]} numberOfLines={1}>{task.title}</Text>
                    <View style={{ justifyContent: 'center', paddingRight: 0 }}>
                      <Ionicons 
                        name={task.completed ? "checkmark-circle" : "ellipse-outline"} 
                        size={22} 
                        color={task.completed ? "#3BB77E" : "#D0D0D0"} 
                      />
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {timeSlots.map(hour => {
            // Find tasks for this specific hour
            const blockTasks = tasksForSelectedDate.filter(t => new Date(t.dueDate!).getHours() === hour);
            const isSelectedBlock = selectedTimeBlock?.hour === hour;
            
            return (
              <TouchableOpacity 
                key={hour} 
                style={[styles.timeSlotRow, isSelectedBlock && { backgroundColor: '#E8F5EE' }]} 
                onPress={() => handleTimeSlotPress(hour)}
                activeOpacity={0.6}
              >
                <View style={styles.timeLabelContainer}>
                  <Text style={styles.timeLabel}>{formatHour(hour)}</Text>
                </View>
                
                <View style={styles.timeSlotLineContainer}>
                  <View style={styles.timeLine} />
                  
                  {/* Task Blocks */}
                  {blockTasks.length > 0 ? (
                    blockTasks.map((task, i) => (
                      <TouchableOpacity 
                        key={task.id} 
                        style={[styles.taskBlock, { top: i * 5 }, task.completed && { opacity: 0.6 }]}
                        activeOpacity={0.7}
                        onPress={() => {
                          setSelectedTask(task);
                          setTaskDetailsVisible(true);
                        }}
                      >
                        <View style={[styles.taskBlockColorBar, task.completed && { backgroundColor: '#939393' }]} />
                        <View style={styles.taskBlockContent}>
                          <Text style={[styles.taskBlockTitle, task.completed && { textDecorationLine: 'line-through', color: '#939393' }]} numberOfLines={1}>{task.title}</Text>
                          {!!task.description && (
                            <Text style={[styles.taskBlockDescription, task.completed && { color: '#B0B0B0' }]} numberOfLines={2}>
                              {task.description}
                            </Text>
                          )}
                          <Text style={styles.taskBlockTime}>
                            {new Date(task.dueDate!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                          </Text>
                        </View>
                        <View style={{ justifyContent: 'center', paddingRight: 8 }}>
                          <Ionicons 
                            name={task.completed ? "checkmark-circle" : "ellipse-outline"} 
                            size={22} 
                            color={task.completed ? "#3BB77E" : "#D0D0D0"} 
                          />
                        </View>
                      </TouchableOpacity>
                    ))
                  ) : null}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Creation Popup Modal */}
      {modalVisible && (
        <View style={[StyleSheet.absoluteFill, { zIndex: 1000 }]}>
          <TouchableOpacity 
            style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)' }]} 
            activeOpacity={1} 
            onPress={handleClose} 
          />
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
            style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
            pointerEvents="box-none"
          >
            <View style={[styles.modalContent, { width: '85%', paddingBottom: 24, alignSelf: 'center', margin: 20 }]}>
              
              <FlatList 
                data={[{ key: 'form' }]}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                renderItem={() => (
                  <View>
                    <Text style={styles.modalTitle}>New Task at {formatHour(selectedTimeBlock?.hour || 0)}</Text>
                    
                    <View style={styles.inputRow}>
                      <View style={styles.iconContainer}>
                        <Ionicons name="pencil-outline" size={20} color="#3BB77E" />
                      </View>
                      <View style={styles.inputWrapper}>
                        <Text style={styles.inputLabel}>Task title</Text>
                        <TextInput 
                          style={styles.sheetInput} 
                          placeholder="e.g. Review design system" 
                          placeholderTextColor="#939393"
                          value={title} 
                          onChangeText={setTitle}
                        />
                      </View>
                    </View>
                    
                    <View style={styles.inputRow}>
                      <View style={[styles.iconContainer, { backgroundColor: '#F4F4F4' }]}>
                        <Ionicons name="document-text-outline" size={20} color="#646464" />
                      </View>
                      <View style={styles.inputWrapper}>
                        <Text style={styles.inputLabel}>Description (Optional)</Text>
                        <TextInput 
                          style={[styles.sheetInput, { minHeight: 60, textAlignVertical: 'top' }]} 
                          placeholder="Add details..." 
                          placeholderTextColor="#939393"
                          value={description} 
                          onChangeText={setDescription}
                          multiline
                        />
                      </View>
                    </View>
                    
                    <View style={[styles.inputRow, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={[styles.iconContainer, { backgroundColor: '#F4F4F4', marginRight: 12 }]}>
                          <Ionicons name="time-outline" size={20} color="#646464" />
                        </View>
                        <Text style={{ fontSize: 15, color: '#010F1C', fontWeight: '500' }}>All-day</Text>
                      </View>
                      <Switch value={isAllDay} onValueChange={setIsAllDay} trackColor={{ true: '#3BB77E' }} />
                    </View>

                    {!isAllDay && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16, paddingLeft: 52, gap: 12 }}>
                        <TouchableOpacity style={styles.timeBtn} onPress={() => setShowStartPicker(true)}>
                          <Text style={styles.timeBtnText}>{startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</Text>
                        </TouchableOpacity>
                        <Text style={{ color: '#939393', fontWeight: '500' }}>to</Text>
                        <TouchableOpacity style={styles.timeBtn} onPress={() => setShowEndPicker(true)}>
                          <Text style={styles.timeBtnText}>{endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                    
                    <TouchableOpacity style={styles.primaryCreateButton} onPress={handleSave}>
                      <Text style={styles.primaryCreateButtonText}>Create</Text>
                    </TouchableOpacity>
                  </View>
                )}
              />
            </View>
          </KeyboardAvoidingView>
        </View>
      )}

      {/* Time Pickers */}
      {showStartPicker && (
        <DateTimePicker
          value={startTime}
          mode="time"
          is24Hour={true}
          display="spinner"
          onValueChange={(event, selectedDate) => {
            if (Platform.OS !== 'ios') setShowStartPicker(false);
            if (selectedDate) {
              setStartTime(selectedDate);
              if (endTime <= selectedDate) {
                const newEnd = new Date(selectedDate);
                newEnd.setHours(newEnd.getHours() + 1);
                setEndTime(newEnd);
              }
            }
          }}
          onDismiss={() => setShowStartPicker(false)}
        />
      )}

      {showEndPicker && (
        <DateTimePicker
          value={endTime}
          mode="time"
          is24Hour={true}
          display="spinner"
          onValueChange={(event, selectedDate) => {
            if (Platform.OS !== 'ios') setShowEndPicker(false);
            if (selectedDate) setEndTime(selectedDate);
          }}
          onDismiss={() => setShowEndPicker(false)}
        />
      )}

      {/* Task Details Bottom Sheet */}
      {taskDetailsVisible && selectedTask && (
        <View style={[StyleSheet.absoluteFill, { zIndex: 2000 }]}>
          <TouchableOpacity 
            style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)' }]} 
            activeOpacity={1} 
            onPress={() => setTaskDetailsVisible(false)} 
          />
          <View style={{ flex: 1, justifyContent: 'flex-end' }} pointerEvents="box-none">
            <View style={[styles.modalContent, { borderBottomLeftRadius: 0, borderBottomRightRadius: 0, paddingBottom: Math.max(insets.bottom + 20, 20) }]}>
              <View style={styles.sheetHandle} />
              
              <Text style={[styles.modalTitle, { textAlign: 'left', marginBottom: 20 }]}>{selectedTask.title}</Text>
              
              {!!selectedTask.description && (
                <View style={{ marginBottom: 20 }}>
                  <Text style={{ fontSize: 12, color: '#939393', fontWeight: '600', marginBottom: 4 }}>Description</Text>
                  <Text style={{ fontSize: 15, color: '#646464', lineHeight: 22 }}>{selectedTask.description}</Text>
                </View>
              )}
              
              <View style={{ marginBottom: 24 }}>
                <Text style={{ fontSize: 12, color: '#939393', fontWeight: '600', marginBottom: 4 }}>Time</Text>
                <Text style={{ fontSize: 15, color: '#646464' }}>
                  {new Date(selectedTask.dueDate!).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short', hour12: false })}
                </Text>
              </View>
              
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                <TouchableOpacity 
                  style={[styles.smallButton, { backgroundColor: '#FFF0F0', borderWidth: 1, borderColor: '#FF4D4D' }]} 
                  onPress={() => {
                    Alert.alert('Cancel Scheduled Task', 'Are you sure you want to cancel and delete this task?', [
                      { text: 'No, Keep It', style: 'cancel' },
                      { text: 'Yes, Cancel Task', style: 'destructive', onPress: async () => {
                        await removeTask(selectedTask.id);
                        setTaskDetailsVisible(false);
                      }}
                    ]);
                  }}
                >
                  <Text style={[styles.smallButtonText, { color: '#FF4D4D' }]}>Cancel Task</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.smallButton, { backgroundColor: selectedTask.completed ? '#F0F2F5' : '#3BB77E' }]} 
                  onPress={async () => {
                    await toggleTaskCompletion(selectedTask.id, !selectedTask.completed);
                    setTaskDetailsVisible(false);
                  }}
                >
                  <Text style={[styles.smallButtonText, { color: selectedTask.completed ? '#646464' : '#fff' }]}>
                    {selectedTask.completed ? 'Mark Undone' : 'Mark Done'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 16 },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#010F1C' },
  
  monthLabelContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 12 },
  monthLabel: { fontSize: 16, fontWeight: '600', color: '#646464' },
  
  calendarStrip: { paddingHorizontal: 16, gap: 8, alignItems: 'center' },
  dateCard: { width: 52, height: 72, borderRadius: 16, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.03, shadowOffset: { width: 0, height: 2 }, shadowRadius: 4, elevation: 1 },
  dateCardSelected: { backgroundColor: '#3BB77E' },
  dateDay: { fontSize: 12, color: '#939393', marginBottom: 6, fontWeight: '500' },
  dateDaySelected: { color: '#E8F5EE' },
  dateNumberCircle: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  dateNumberCircleSelected: { backgroundColor: '#fff' },
  dateNumber: { fontSize: 16, fontWeight: 'bold', color: '#010F1C' },
  dateNumberSelected: { color: '#3BB77E' },
  
  timelineContainer: { flex: 1, backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 16, paddingTop: 10 },
  timeSlotRow: { flexDirection: 'row', minHeight: 70 },
  timeLabelContainer: { width: 60, alignItems: 'flex-end', paddingRight: 12, paddingTop: 10 },
  timeLabel: { fontSize: 12, color: '#939393', fontWeight: '500' },
  
  timeSlotLineContainer: { flex: 1, position: 'relative', borderLeftWidth: 1, borderLeftColor: '#F0F2F5', paddingBottom: 20 },
  timeLine: { position: 'absolute', top: 18, left: -4, width: 8, height: 2, backgroundColor: '#E0E0E0', borderRadius: 2 },
  
  taskBlock: { position: 'absolute', left: 16, right: 16, top: 10, backgroundColor: '#F0F8F4', borderRadius: 12, flexDirection: 'row', overflow: 'hidden', paddingVertical: 12, paddingRight: 12 },
  taskBlockColorBar: { width: 4, backgroundColor: '#3BB77E', position: 'absolute', left: 0, top: 0, bottom: 0 },
  taskBlockContent: { paddingLeft: 16, flex: 1 },
  taskBlockTitle: { fontSize: 14, fontWeight: '600', color: '#010F1C', marginBottom: 2 },
  taskBlockDescription: { fontSize: 12, color: '#646464', marginBottom: 4 },
  taskBlockTime: { fontSize: 12, color: '#939393', fontWeight: '500' },
  
  modalContent: { backgroundColor: '#fff', borderRadius: 24, padding: 24, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E0E0E0', alignSelf: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 24, color: '#010F1C', textAlign: 'center' },
  inputRow: { flexDirection: 'row', marginBottom: 24, alignItems: 'flex-start' },
  iconContainer: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E8F5EE', justifyContent: 'center', alignItems: 'center', marginRight: 16, marginTop: 2 },
  inputWrapper: { flex: 1 },
  inputLabel: { fontSize: 12, color: '#939393', fontWeight: '600', marginBottom: 4 },
  sheetInput: { fontSize: 15, color: '#010F1C', fontWeight: '500', borderBottomWidth: 1, borderBottomColor: '#F0F2F5', paddingVertical: 6 },
  primaryCreateButton: { backgroundColor: '#3BB77E', borderRadius: 12, height: 44, justifyContent: 'center', alignItems: 'center', marginTop: 12, shadowColor: '#3BB77E', shadowOpacity: 0.3, shadowOffset: { width: 0, height: 4 }, shadowRadius: 8, elevation: 4 },
  primaryCreateButtonText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  smallButton: { height: 36, paddingHorizontal: 20, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  smallButtonText: { fontSize: 13, fontWeight: 'bold' },
  timeBtn: { backgroundColor: '#F4F4F4', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  timeBtnText: { fontSize: 14, fontWeight: '600', color: '#010F1C' }
});
