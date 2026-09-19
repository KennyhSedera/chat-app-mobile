import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { navigate } from "../navigation/navigationRef";
import notificationService from "../services/NotificationService";
import { useAuth } from "./AuthContext";

const NotificationContext = createContext();

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuth();

  useEffect(() => {
    notificationService.initialize();

    const unsubscribe = notificationService.on(
      "newNotification",
      (notification) => {
        // Normalise "id" (payload socket) → "_id" (même format que les notifs REST)
        const normalized = { ...notification, _id: notification.id };
        setNotifications((prev) => [normalized, ...prev]);
        setUnreadCount((prev) => prev + 1);
      },
    );

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user?._id) return;

    async function fetchInitial() {
      try {
        const data = await notificationService.getNotifications(user._id);
        setNotifications(data);
        const count = await notificationService.getUnreadCount(user._id);
        setUnreadCount(count);
      } catch (error) {
        console.error("Erreur chargement notifications:", error);
      }
    }

    fetchInitial();
  }, [user]);

  const markAsRead = useCallback(
    async (id) => {
      if (!user?._id) return;

      try {
        await notificationService.markAsRead(id, user._id);
        setNotifications((prev) =>
          prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)),
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (error) {
        console.error("Erreur markAsRead:", error);
      }
    },
    [user],
  );

  const markAllAsRead = useCallback(async () => {
    if (!user?._id) return;

    try {
      await notificationService.markAllAsRead(user._id);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Erreur markAllAsRead:", error);
    }
  }, [user]);

  const removeNotification = useCallback(
    async (id) => {
      if (!user?._id) return;

      const notif = notifications.find((n) => n._id === id);

      try {
        await notificationService.deleteNotification(id, user._id);

        setNotifications((prev) => prev.filter((n) => n._id !== id));

        if (notif && !notif.isRead) {
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }
      } catch (error) {
        console.error("Erreur removeNotification:", error);
      }
    },
    [user, notifications],
  );

  const handleNotificationPress = useCallback(
    (notification) => {
      markAsRead(notification._id);

      switch (notification.type) {
        case "new_message":
        case "message_sent":
          navigate("PrivateChat", {
            chatId: notification.data.chatId,
            userId: notification.data.toUserId || notification.data.fromUserId,
          });
          break;
        case "friend_request":
          navigate("MainTabs", { screen: "Profile" });
          break;
        case "budget_alert":
          navigate("Budget", { budgetId: notification.data.budgetId });
          break;
        default:
          break;
      }
    },
    [markAsRead],
  );

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        removeNotification,
        handleNotificationPress,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);
