import { SERVER_URL } from "./AuthService";
import chatService from "./ChatService";

class NotificationService {
  constructor() {
    this.eventListeners = {};
    this.isListening = false;
  }

  initialize() {
    if (this.isListening) return;

    this.unsubscribeNewNotification = chatService.on(
      "newNotification",
      (notification) => {
        this.emit("newNotification", notification);
      },
    );

    this.isListening = true;
  }

  stopListening() {
    if (this.unsubscribeNewNotification) {
      this.unsubscribeNewNotification();
      this.unsubscribeNewNotification = null;
    }
    this.isListening = false;
  }

  on(event, callback) {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(callback);

    return () => {
      this.eventListeners[event] = this.eventListeners[event].filter(
        (cb) => cb !== callback,
      );
    };
  }

  off(event, callback) {
    if (this.eventListeners[event]) {
      this.eventListeners[event] = this.eventListeners[event].filter(
        (cb) => cb !== callback,
      );
    }
  }

  emit(event, data) {
    if (this.eventListeners[event]) {
      this.eventListeners[event].forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`❌ Erreur dans le callback ${event}:`, error);
        }
      });
    }
  }

  async getNotifications(userId, page = 1, limit = 30, unreadOnly = false) {
    try {
      let url = `${SERVER_URL}/api/notifications?userId=${userId}&page=${page}&limit=${limit}`;
      if (unreadOnly) url += `&unreadOnly=true`;

      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Erreur lors de la récupération des notifications",
        );
      }

      return data;
    } catch (error) {
      console.error("❌ Erreur récupération notifications:", error);
      throw error;
    }
  }

  async getUnreadCount(userId) {
    try {
      const response = await fetch(
        `${SERVER_URL}/api/notifications/unread-count?userId=${userId}`,
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Erreur récupération du compteur");
      }

      return data.count;
    } catch (error) {
      console.error("❌ Erreur count notifications:", error);
      return 0;
    }
  }

  async markAsRead(notificationId, userId) {
    try {
      const response = await fetch(
        `${SERVER_URL}/api/notifications/${notificationId}/read`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        },
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Erreur marquage lu");
      }

      return data;
    } catch (error) {
      console.error("❌ Erreur marquage notification lue:", error);
      throw error;
    }
  }

  async markAllAsRead(userId) {
    try {
      const response = await fetch(
        `${SERVER_URL}/api/notifications/mark-all-read`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        },
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Erreur marquage global");
      }

      return data.updated;
    } catch (error) {
      console.error("❌ Erreur marquage global:", error);
      throw error;
    }
  }

  async deleteNotification(notificationId, userId) {
    try {
      const response = await fetch(
        `${SERVER_URL}/api/notifications/${notificationId}/${userId}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        },
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Erreur suppression notification");
      }

      return true;
    } catch (error) {
      console.error("❌ Erreur suppression notification:", error);
      throw error;
    }
  }
}

export default new NotificationService();
