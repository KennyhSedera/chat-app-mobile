import io from "socket.io-client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import uuid from "react-native-uuid";

class ChatService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.currentUser = null;
    this.currentRoom = "general";
    this.serverUrl = "http://192.168.88.43:3000";
  }

  async initialize(serverUrl = null) {
    if (serverUrl) {
      this.serverUrl = serverUrl;
    }

    await this.initializeUser();

    this.socket = io(this.serverUrl, {
      transports: ["websocket"],
      timeout: 5000,
    });

    return new Promise((resolve, reject) => {
      this.socket.on("connect", () => {
        this.isConnected = true;
        resolve();
      });

      this.socket.on("connect_error", (error) => {
        console.error("Erreur de connexion:", error);
        this.isConnected = false;
        reject(error);
      });

      this.socket.on("disconnect", () => {
        this.isConnected = false;
      });

      setTimeout(() => {
        if (!this.isConnected) {
          reject(new Error("Timeout de connexion"));
        }
      }, 10000);
    });
  }

  async initializeUser() {
    try {
      let userData = await AsyncStorage.getItem("chatUser");

      if (userData) {
        this.currentUser = JSON.parse(userData);
      } else {
        const userId = uuid.v4();
        this.currentUser = {
          _id: userId,
          name: `Utilisateur_${userId.slice(0, 6)}`,
          avatar: `https://ui-avatars.com/api/?name=User&background=34C759&color=fff`,
        };

        await AsyncStorage.setItem(
          "chatUser",
          JSON.stringify(this.currentUser)
        );
      }
    } catch (error) {
      console.error("Erreur lors de l'initialisation utilisateur:", error);
      this.currentUser = {
        _id: uuid.v4(),
        name: "Invité",
        avatar: `https://ui-avatars.com/api/?name=Guest&background=999999&color=fff`,
      };
    }
  }

  joinRoom(room = "general") {
    if (!this.socket || !this.isConnected) {
      throw new Error("Socket non connecté");
    }
    this.currentRoom = room;
    this.socket.emit("joinRoom", {
      room: room,
      user: this.currentUser,
    });
  }

  sendMessage(text, chatId, room = null) {
    if (!this.socket || !this.isConnected) {
      throw new Error("Socket non connecté");
    }

    if (!text || !text.trim()) {
      throw new Error("Message vide");
    }

    const messageData = {
      content: text.trim(),
      chatId,
      user: this.currentUser,
      room: room || this.currentRoom,
    };

    this.socket.emit("sendMessage", messageData);
    return messageData;
  }

  setTyping(isTyping) {
    if (this.socket && this.isConnected) {
      this.socket.emit("typing", { isTyping });
    }
  }

  // Important : retourne une fonction pour unsubscribe proprement
  on(event, callback) {
    if (this.socket) {
      this.socket.on(event, callback);
      return () => this.socket.off(event, callback);
    }
    return () => {};
  }

  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  async getMessages(room = null, chatId = null, page = 1, limit = 50) {
    try {
      let url = `${this.serverUrl}/api/messages?page=${page}&limit=${limit}`;
      if (chatId) {
        url += `&chatId=${chatId}`;
      } else if (room) {
        url += `&room=${room}`;
      } else {
        throw new Error("Either room or chatId must be provided");
      }

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Erreur lors de la récupération des messages:", error);
      throw error;
    }
  }

  async getOnlineUsers() {
    try {
      const response = await fetch(`${this.serverUrl}/api/users/online`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Erreur lors de la récupération des utilisateurs:", error);
      throw error;
    }
  }

  async getStats() {
    try {
      const response = await fetch(`${this.serverUrl}/api/stats`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Erreur lors de la récupération des stats:", error);
      throw error;
    }
  }

  async updateProfile(name, avatar = null) {
    try {
      this.currentUser.name = name;
      if (avatar) {
        this.currentUser.avatar = avatar;
      }

      await AsyncStorage.setItem("chatUser", JSON.stringify(this.currentUser));

      if (this.isConnected) {
        this.joinRoom(this.currentRoom);
      }

      return this.currentUser;
    } catch (error) {
      console.error("Erreur lors de la mise à jour du profil:", error);
      throw error;
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  getCurrentUser() {
    return this.currentUser;
  }

  getCurrentRoom() {
    return this.currentRoom;
  }

  getConnectionStatus() {
    return this.isConnected;
  }

  getServerUrl() {
    return this.serverUrl;
  }

  async checkServerHealth() {
    try {
      const response = await fetch(`${this.serverUrl}/health`);
      const data = await response.json();
      return data.status === "OK";
    } catch (error) {
      console.error("Serveur indisponible:", error);
      return false;
    }
  }
}

export default new ChatService();
