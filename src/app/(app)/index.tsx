import { useAuth } from '@/context/AuthContext';
import { useTasks } from '@/context/TasksContext';
import { Task } from '@/types/task.types';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, FlatList, Keyboard, KeyboardAvoidingView, LayoutAnimation, Platform, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const TASK_COLORS = ['#3BB77E', '#FF8A65', '#4FC3F7', '#BA68C8', '#FFD54F'];

export default function ScheduleScreen() {
  const { width: screenWidth } = useWindowDimensions();
  const router = useRouter();
  const { tasks, isLoading, addTask, editTask, toggleTaskCompletion, removeTask } = useTasks();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const userInitial = user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U';

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [displayDate, setDisplayDate] = useState(new Date());
  const [stripBaseDate, setStripBaseDate] = useState(new Date());

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const weekDates = useMemo(() => {
    const dates = [];
    const baseDate = new Date(stripBaseDate);
    for (let i = -1; i <= 21; i++) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() + i);
      dates.push(d);
    }
    return dates;
  }, [stripBaseDate]);

  const [modalVisible, setModalVisible] = useState(false);
  const [taskDetailsVisible, setTaskDetailsVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isAllDay, setIsAllDay] = useState(false);
  const [startTime, setStartTime] = useState<Date>(new Date());
  const [endTime, setEndTime] = useState<Date>(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [selectedTimeBlock, setSelectedTimeBlock] = useState<{ hour: number, date: Date } | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [viewMode, setViewMode] = useState<'timeline' | 'list'>('timeline');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState(TASK_COLORS[0]);

  const keyboardHeight = useRef(new Animated.Value(0)).current;
  const timelineScrollRef = useRef<ScrollView>(null);
  const calendarStripRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (calendarStripRef.current) {
      calendarStripRef.current.scrollTo({ x: 0, animated: true });
    }
  }, [stripBaseDate]);

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setTimeout(() => {
      if (timelineScrollRef.current) {
        let targetHour: number | null = null;

        if (isSameDay(selectedDate, new Date())) {
          targetHour = new Date().getHours();
        } else {
          const taskHours = tasksForSelectedDate.map(t => new Date(t.dueDate!).getHours());
          if (taskHours.length > 0) {
            targetHour = Math.min(...taskHours);
          }
        }

        if (targetHour !== null) {

          timelineScrollRef.current.scrollTo({ y: Math.max(0, targetHour - 1) * 70, animated: true });
        }
      }
    }, 400);
  }, [selectedDate]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;


    const showSub = Keyboard.addListener('keyboardDidShow', (e) => {
      Animated.timing(keyboardHeight, {
        toValue: e.endCoordinates.height,
        duration: 150,
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
    setEditingTaskId(null);
    setSelectedColor(TASK_COLORS[0]);
  };

  const timeSlots = Array.from({ length: 24 }, (_, i) => i);

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
    setSelectedColor(TASK_COLORS[0]);
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
      const taskData = {
        title,
        description,
        isAllDay,
        color: selectedColor,
        dueDate: isAllDay ? selectedDate.toISOString() : startTime.toISOString(),
        endDate: isAllDay ? undefined : endTime.toISOString()
      };

      if (editingTaskId) {
        await editTask(editingTaskId, taskData);
      } else {
        await addTask(taskData);
      }
      handleClose();
    } catch (e: any) {
      if (e?.isOfflineAction) {
        Alert.alert('Saved Offline 📡', 'You are currently offline. Your task has been saved locally and will sync automatically when your connection returns.');
      } else {
        Alert.alert('API Error', e?.message || e?.error || 'Failed to communicate with server.');
      }
    }
  };

  const handleEdit = () => {
    if (!selectedTask) return;
    setTitle(selectedTask.title);
    setDescription(selectedTask.description || '');
    setIsAllDay(selectedTask.isAllDay || false);
    setSelectedColor(selectedTask.color || TASK_COLORS[0]);
    if (selectedTask.dueDate) setStartTime(new Date(selectedTask.dueDate));
    if (selectedTask.endDate) setEndTime(new Date(selectedTask.endDate));

    setEditingTaskId(selectedTask.id);
    setTaskDetailsVisible(false);
    setModalVisible(true);
  };

  const formatHour = (h: number) => {
    return `${h.toString().padStart(2, '0')}:00`;
  };

  const isSameDay = (d1: Date, d2: Date) => {
    return d1.getDate() === d2.getDate() && d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear();
  };

  const confirmDelete = (taskId: string) => {
    Alert.alert('Delete Task', 'Are you sure you want to delete this task?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await removeTask(taskId);
          } catch (e: any) {
            if (e?.isOfflineAction) {
              Alert.alert('Deleted Offline 📡', 'Task queued for deletion upon reconnection.');
            } else {
              Alert.alert('API Error', e?.message || 'Failed to delete task.');
            }
          }
        }
      }
    ]);
  };

  const sendEmailDigest = () => {
    const pendingTasks = tasks.filter(t => !t.completed);
    if (pendingTasks.length === 0) {
      Alert.alert('Inbox Zero!', 'You have no pending tasks to send!');
      return;
    }

    let emailBody = 'Here is your Taskify pending to-do list:\\n\\n';
    pendingTasks.forEach((task, index) => {
      emailBody += `${index + 1}. ${task.title}\\n`;
      if (task.dueDate) {
        emailBody += `   Due: ${new Date(task.dueDate).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}\\n`;
      }
      emailBody += '\\n';
    });

    emailBody += '\\nStay productive!\\n- Taskify';

    const subject = encodeURIComponent('Your Taskify Digest');
    const body = encodeURIComponent(emailBody);


    import('expo-linking').then(Linking => {
      Linking.openURL(`mailto:?subject=${subject}&body=${body}`);
    });
  };

  const renderTaskBlock = (task: Task, extraStyles?: any) => (
    <TouchableOpacity
      key={task.id}
      style={[
        styles.taskBlock,
        {
          position: 'relative',
          top: 0, left: 0, right: 0,
          minHeight: 60, zIndex: 1,
          backgroundColor: (task.color || '#3BB77E') + '1A'
        },
        extraStyles,
        task.completed && { opacity: 0.6 }
      ]}
      activeOpacity={0.7}
      onLongPress={() => confirmDelete(task.id)}
      onPress={() => {
        setSelectedTask(task);
        setTaskDetailsVisible(true);
      }}
    >
      <View style={[styles.taskBlockColorBar, { backgroundColor: task.color || '#3BB77E' }, task.completed && { backgroundColor: '#939393' }]} />
      <View style={styles.taskBlockContent}>
        <Text style={[styles.taskBlockTitle, task.completed && { textDecorationLine: 'line-through', color: '#939393' }]} numberOfLines={1}>{task.title}</Text>
        {!!task.description && (
          <Text style={[styles.taskBlockDescription, task.completed && { color: '#B0B0B0' }]} numberOfLines={2}>
            {task.description}
          </Text>
        )}
        {(!task.isAllDay && task.dueDate) && (
          <Text style={styles.taskBlockTime}>
            {new Date(task.dueDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
            {task.endDate ? ` - ${new Date(task.endDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}` : ''}
          </Text>
        )}
      </View>
      <View style={{ justifyContent: 'center', paddingRight: 8 }}>
        <TouchableOpacity
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          onPress={async () => {
            try {
              await toggleTaskCompletion(task.id, !task.completed);
            } catch (e: any) {
              if (e?.isOfflineAction) {

              } else {
                Alert.alert('API Error', e?.message || 'Failed to update task.');
              }
            }
          }}
        >
          <Ionicons
            name={task.completed ? "checkmark-circle" : "ellipse-outline"}
            size={26}
            color={task.completed ? (task.color || "#3BB77E") : "#D0D0D0"}
          />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Schedule</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <TouchableOpacity onPress={sendEmailDigest} style={{ padding: 6, backgroundColor: '#E8F5EE', borderRadius: 16 }}>
              <Ionicons name="mail-outline" size={22} color="#3BB77E" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setViewMode(v => v === 'timeline' ? 'list' : 'timeline');
              }}
              style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#E8F5EE', borderRadius: 16 }}
            >
              <Text style={{ color: '#3BB77E', fontWeight: 'bold', fontSize: 13 }}>{viewMode === 'timeline' ? 'List' : 'Timeline'}</Text>
            </TouchableOpacity>
            <TouchableOpacity>
              <Ionicons name="notifications-outline" size={26} color="#010F1C" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/profile')}>
              <View style={styles.avatarContainer}>
                <Text style={styles.avatarText}>{userInitial}</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={styles.monthLabelContainer}
          onPress={() => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setDisplayDate(new Date(selectedDate));
            setShowMonthPicker(!showMonthPicker);
          }}
        >
          <Text style={styles.monthLabel}>
            {selectedDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </Text>
          <Ionicons name={showMonthPicker ? "chevron-up" : "chevron-down"} size={16} color="#646464" style={{ marginLeft: 4, marginTop: 2 }} />
        </TouchableOpacity>

        {showMonthPicker ? (
          <View style={{ backgroundColor: '#fff', paddingHorizontal: 16, paddingBottom: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <TouchableOpacity onPress={() => setDisplayDate(new Date(displayDate.getFullYear(), displayDate.getMonth() - 1, 1))}>
                <Ionicons name="chevron-back" size={24} color="#010F1C" />
              </TouchableOpacity>
              <Text style={{ fontSize: 16, fontWeight: 'bold' }}>{displayDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</Text>
              <TouchableOpacity onPress={() => setDisplayDate(new Date(displayDate.getFullYear(), displayDate.getMonth() + 1, 1))}>
                <Ionicons name="chevron-forward" size={24} color="#010F1C" />
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 8 }}>
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => <Text key={i} style={{ color: '#939393', fontWeight: 'bold', width: 32, textAlign: 'center' }}>{day}</Text>)}
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {Array.from({ length: getFirstDayOfMonth(displayDate.getFullYear(), displayDate.getMonth()) }).map((_, i) => (
                <View key={`empty-${i}`} style={{ width: `${100 / 7}%`, height: 40 }} />
              ))}
              {Array.from({ length: getDaysInMonth(displayDate.getFullYear(), displayDate.getMonth()) }).map((_, i) => {
                const dateNum = i + 1;
                const isSelected = selectedDate.getDate() === dateNum && selectedDate.getMonth() === displayDate.getMonth() && selectedDate.getFullYear() === displayDate.getFullYear();
                const isToday = new Date().getDate() === dateNum && new Date().getMonth() === displayDate.getMonth() && new Date().getFullYear() === displayDate.getFullYear();
                return (
                  <TouchableOpacity
                    key={dateNum}
                    style={{ width: `${100 / 7}%`, height: 40, justifyContent: 'center', alignItems: 'center' }}
                    onPress={() => {
                      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                      const pickedDate = new Date(displayDate.getFullYear(), displayDate.getMonth(), dateNum);
                      setSelectedDate(pickedDate);
                      setStripBaseDate(pickedDate);
                      setShowMonthPicker(false);
                    }}
                  >
                    <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: isSelected ? '#3BB77E' : 'transparent', justifyContent: 'center', alignItems: 'center', borderWidth: isToday && !isSelected ? 1 : 0, borderColor: '#3BB77E' }}>
                      <Text style={{ color: isSelected ? '#fff' : (isToday ? '#3BB77E' : '#010F1C'), fontWeight: isSelected || isToday ? 'bold' : 'normal' }}>{dateNum}</Text>
                    </View>
                  </TouchableOpacity>
                )
              })}
            </View>

            {/* Months Row at the bottom */}
            <View style={{ marginTop: 16, borderTopWidth: 1, borderTopColor: '#F0F2F5', paddingTop: 16 }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((monthStr, index) => {
                  const isSelectedMonth = displayDate.getMonth() === index;
                  return (
                    <TouchableOpacity
                      key={monthStr}
                      style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: isSelectedMonth ? '#E8F5EE' : '#F4F4F4' }}
                      onPress={() => setDisplayDate(new Date(displayDate.getFullYear(), index, 1))}
                    >
                      <Text style={{ color: isSelectedMonth ? '#3BB77E' : '#646464', fontWeight: '600' }}>{monthStr}</Text>
                    </TouchableOpacity>
                  )
                })}
              </ScrollView>
            </View>
          </View>
        ) : (
          /* Week Calendar Strip */
          <View style={{ height: 80, marginBottom: 10 }}>
            <ScrollView ref={calendarStripRef} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.calendarStrip}>
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
        )}

        {isLoading && tasks.length === 0 ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#3BB77E" />
            <Text style={{ marginTop: 12, color: '#939393', fontWeight: '500' }}>Syncing your schedule...</Text>
          </View>
        ) : viewMode === 'list' ? (
          <ScrollView style={{ flex: 1, paddingHorizontal: 16, paddingTop: 10 }} showsVerticalScrollIndicator={false}>
            <View style={{ marginBottom: 24 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#010F1C', marginBottom: 12 }}>Pending Tasks</Text>
              {tasksForSelectedDate.filter(t => !t.completed).length === 0 && (
                <Text style={{ color: '#939393', fontStyle: 'italic', marginBottom: 12 }}>No pending tasks for this day.</Text>
              )}
              {tasksForSelectedDate.filter(t => !t.completed).map(task => renderTaskBlock(task, { marginBottom: 10 }))}
            </View>

            <View style={{ marginBottom: 40 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#010F1C', marginBottom: 12 }}>Completed Tasks</Text>
              {tasksForSelectedDate.filter(t => t.completed).length === 0 && (
                <Text style={{ color: '#939393', fontStyle: 'italic', marginBottom: 12 }}>No completed tasks yet.</Text>
              )}
              {tasksForSelectedDate.filter(t => t.completed).map(task => renderTaskBlock(task, { marginBottom: 10 }))}
            </View>

            <View style={{ height: 100 }} />
          </ScrollView>
        ) : (
          /* Timeline ScrollView */
          <ScrollView
            ref={timelineScrollRef}
            style={styles.timelineContainer}
            showsVerticalScrollIndicator={false}
          >
            <View style={{ paddingBottom: 100, paddingTop: 10, position: 'relative' }}>

              {/* All-Day Tasks Section */}
              {tasksForSelectedDate.filter(t => t.isAllDay).length > 0 && (
                <View style={{ paddingLeft: 56, paddingRight: 16, marginBottom: 16, marginTop: 10 }}>
                  {tasksForSelectedDate.filter(t => t.isAllDay).map((task) => renderTaskBlock(task, { minHeight: 40, marginBottom: 4, paddingVertical: 10 }))}
                </View>
              )}

              {timeSlots.map(hour => {

                const blockTasks = tasksForSelectedDate.filter(t => !t.isAllDay && new Date(t.dueDate!).getHours() === hour);
                const isSelectedBlock = selectedTimeBlock?.hour === hour;
                const isCurrentHour = isSameDay(selectedDate, currentTime) && currentTime.getHours() === hour;

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

                      {isCurrentHour && (
                        <View style={{
                          position: 'absolute',
                          top: 18 + (currentTime.getMinutes()),
                          left: -4,
                          right: 0,
                          height: 2,
                          backgroundColor: '#FF4D4D',
                          zIndex: 100,
                          flexDirection: 'row',
                          alignItems: 'center'
                        }}>
                          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF4D4D', position: 'absolute', left: 0 }} />
                        </View>
                      )}

                      {/* Task Blocks */}
                      {blockTasks.length > 0 ? (
                        <View style={{ paddingTop: 10, paddingBottom: 10, paddingLeft: 16, paddingRight: 16, gap: 10 }}>
                          {blockTasks.map((task, i) => renderTaskBlock(task))}
                        </View>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        )}

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
                      <Text style={styles.modalTitle}>
                        {editingTaskId ? 'Edit Task' : (selectedTimeBlock ? `New Task at ${formatHour(selectedTimeBlock.hour)}` : 'New Task')}
                      </Text>

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

                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 24, paddingLeft: 52, gap: 16 }}>
                        <Text style={{ fontSize: 12, color: '#939393', fontWeight: '600', marginRight: 8 }}>Color:</Text>
                        {TASK_COLORS.map(color => (
                          <TouchableOpacity
                            key={color}
                            style={[{ width: 28, height: 28, borderRadius: 14, backgroundColor: color }, selectedColor === color && { borderWidth: 2, borderColor: '#010F1C' }]}
                            onPress={() => setSelectedColor(color)}
                          />
                        ))}
                      </View>

                      <TouchableOpacity style={styles.primaryCreateButton} onPress={handleSave}>
                        <Text style={styles.primaryCreateButtonText}>{editingTaskId ? 'Save Changes' : 'Create'}</Text>
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
                    style={[styles.smallButton, { flex: 1, backgroundColor: '#FFF0F0', borderWidth: 1, borderColor: '#FF4D4D' }]}
                    onPress={() => {
                      Alert.alert('Cancel Scheduled Task', 'Are you sure you want to cancel and delete this task?', [
                        { text: 'No, Keep It', style: 'cancel' },
                        {
                          text: 'Yes, Cancel Task', style: 'destructive', onPress: async () => {
                            await removeTask(selectedTask.id);
                            setTaskDetailsVisible(false);
                          }
                        }
                      ]);
                    }}
                  >
                    <Text style={[styles.smallButtonText, { color: '#FF4D4D' }]}>Delete</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.smallButton, { flex: 1, backgroundColor: '#E8F5EE' }]}
                    onPress={handleEdit}
                  >
                    <Text style={[styles.smallButtonText, { color: '#3BB77E' }]}>Edit</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.smallButton, { flex: 1, backgroundColor: selectedTask.completed ? '#F0F2F5' : '#3BB77E' }]}
                    onPress={async () => {
                      await toggleTaskCompletion(selectedTask.id, !selectedTask.completed);
                      setTaskDetailsVisible(false);
                    }}
                  >
                    <Text style={[styles.smallButtonText, { color: selectedTask.completed ? '#646464' : '#fff' }]}>
                      {selectedTask.completed ? 'Undone' : 'Done'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#010F1C',
  },
  avatarContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3BB77E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  monthLabelContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 12 },
  monthLabel: { fontSize: 16, fontWeight: '600', color: '#646464' },

  calendarStrip: { paddingHorizontal: 16, gap: 8, alignItems: 'center' },
  dateCard: { width: 52, height: 72, borderRadius: 16, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.03, shadowOffset: { width: 0, height: 2 }, shadowRadius: 4, elevation: 1 },
  dateCardSelected: { backgroundColor: '#3BB77E' },
  dateDay: { fontSize: 12, color: '#939393', marginBottom: 6, fontWeight: '500' },
  dateDaySelected: { color: '#E8F5EE' },
  dateNumberCircle: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
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
