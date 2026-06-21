import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotificationsAsync() {
  let token;
  
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#3BB77E',
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    return null;
  }
  
  // We only need local notifications for the reminders, 
  // so we do NOT need to request a remote Expo Push Token (which requires Firebase).
  return true;
}

export async function scheduleTaskReminder(taskTitle: string, dueDate: string, isAllDay: boolean) {
  const triggerDate = new Date(dueDate);
  
  if (isAllDay) {
    // For all-day tasks, remind at 9:00 AM on that day
    triggerDate.setHours(9, 0, 0, 0);
  } else {
    // Remind 10 minutes before the task starts
    triggerDate.setMinutes(triggerDate.getMinutes() - 10);
  }
  
  if (triggerDate <= new Date()) {
    return null; // Do not schedule in the past
  }

  try {
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: "Upcoming Task ⏰",
        body: `"${taskTitle}" is starting soon!`,
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
      },
    });
    return identifier;
  } catch (e) {
    console.error("Failed to schedule notification", e);
    return null;
  }
}
