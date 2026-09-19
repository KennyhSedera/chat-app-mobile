import io from "socket.io-client";
import AuthService, { SERVER_URL } from "./AuthService";

class ChatService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.eventListeners = {};
    this.currentChatId = null;
    this.currentRoom = null;
    this.currentUser = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
  }

  // Initialiser la connexion socket
  async initialize() {
    if (this.socket && this.isConnected) {
      return Promise.resolve();
    }

    const token = AuthService.getSessionToken(); // ← nouveau

    return new Promise((resolve, reject) => {
      try {
        this.socket = io(SERVER_URL, {
          transports: ["websocket"],
          timeout: 10000,
          forceNew: true,
          reconnection: true,
          reconnectionDelay: this.reconnectDelay,
          reconnectionAttempts: this.maxReconnectAttempts,
          auth: { token }, // ← nouveau
        });

        this.socket.on("connect", () => {
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.emit("connect");

          if (this.currentUser) {
            if (this.currentChatId) {
              this.socket.emit("joinPrivateChat", {
                chatId: this.currentChatId,
                user: this.currentUser,
              });
            }
            if (this.currentRoom) {
              this.socket.emit("joinRoom", {
                room: this.currentRoom,
                user: this.currentUser,
              });
            }
          }

          resolve();
        });

        this.socket.on("newPrivateMessage", (message) => {
          this.emit("newPrivateMessage", message);
        });
        this.socket.on("newMessage", (message) => {
          this.emit("newMessage", message);
        });
        this.socket.on("messageEdited", (data) => {
          this.emit("messageEdited", data);
        });
        this.socket.on("reactionAdded", (data) => {
          this.emit("reactionAdded", data);
        });
        this.socket.on("reactionRemoved", (data) => {
          this.emit("reactionRemoved", data);
        });
        this.socket.on("previousPrivateMessages", (messages) => {
          this.emit("previousPrivateMessages", messages);
        });
        this.socket.on("previousMessages", (messages) => {
          this.emit("previousMessages", messages);
        });
        this.socket.on("userPrivateTyping", (data) => {
          this.emit("userPrivateTyping", data);
        });
        this.socket.on("userTyping", (data) => {
          this.emit("userTyping", data);
        });
        this.socket.on("userStatusChange", (data) => {
          this.emit("userStatusChange", data);
        });
        this.socket.on("newChat", (chat) => {
          this.emit("newChat", chat);
        });
        this.socket.on("chatCreated", (data) => {
          this.emit("chatCreated", data);
        });
        this.socket.on("userJoined", (data) => {
          this.emit("userJoined", data);
        });
        this.socket.on("userLeft", (data) => {
          this.emit("userLeft", data);
        });
        this.socket.on("userLeftPrivateChat", (data) => {
          this.emit("userLeftPrivateChat", data);
        });
        this.socket.on("newNotification", (notification) => {
          this.emit("newNotification", notification);
        });
        this.socket.on("messagesRead", (data) => {
          this.emit("messagesRead", data);
        });
        this.socket.on("messageDeleted", (data) => {
          this.emit("messageDeleted", data);
        });
        this.socket.on("previousRoomMessages", (data) => {
          this.emit("previousRoomMessages", data.messages);
        });
        this.socket.on("newRoomMessage", (message) => {
          this.emit("newRoomMessage", message);
        });
        this.socket.on("userRoomTyping", (data) => {
          this.emit("userRoomTyping", data);
        });
        this.socket.on("roomCreated", (data) => {
          this.emit("roomCreated", data);
        });
        this.socket.on("roomInviteReceived", (data) => {
          this.emit("roomInviteReceived", data);
        });
        this.socket.on("roomInviteAccepted", (data) => {
          this.emit("roomInviteAccepted", data);
        });
        this.socket.on("roomInviteDeclined", (data) => {
          this.emit("roomInviteDeclined", data);
        });
        this.socket.on("roomUpdated", (data) => {
          this.emit("roomUpdated", data);
        });
        this.socket.on("memberJoined", (data) => {
          this.emit("memberJoined", data);
        });
        this.socket.on("memberRemoved", (data) => {
          this.emit("memberRemoved", data);
        });
        this.socket.on("memberRoleChanged", (data) => {
          this.emit("memberRoleChanged", data);
        });
        this.socket.on("youWerePromoted", (data) => {
          this.emit("youWerePromoted", data);
        });
        this.socket.on("roomDeleted", (data) => {
          this.emit("roomDeleted", data);
        });
        this.socket.on("roomRead", (data) => {
          this.emit("roomRead", data);
        });

        setTimeout(() => {
          if (!this.isConnected) {
            reject(new Error("Timeout de connexion"));
          }
        }, 10000);
      } catch (error) {
        console.error("❌ Erreur d'initialisation:", error);
        reject(error);
      }
    });
  }

  joinRoom(room, user) {
    if (!this.socket || !this.isConnected) {
      throw new Error("Socket non connecté");
    }

    this.currentRoom = room;
    this.currentUser = user;
    this.socket.emit("joinRoom", { room, user });
  }

  joinPrivateChat(chatId, user) {
    if (!this.socket || !this.isConnected) {
      throw new Error("Socket non connecté");
    }

    if (this.currentChatId && this.currentChatId !== chatId) {
      this.leavePrivateChat(this.currentChatId);
    }

    this.currentChatId = chatId;
    this.currentUser = user;
    this.socket.emit("joinPrivateChat", { chatId, user });
  }

  markRoomRead(roomId, userId, lastReadMessageId) {
    if (!this.socket || !this.isConnected) return;
    this.socket.emit("markRoomRead", { roomId, userId, lastReadMessageId });
  }

  async getRoomReadReceipts(roomId) {
    const response = await fetch(
      `${SERVER_URL}/api/rooms/${roomId}/read-receipts`,
    );
    return response.json();
  }

  subscribeToRoom(roomId, user) {
    if (!this.socket || !this.isConnected) return;
    this.socket.emit("subscribeToRoom", { roomId, user });
  }

  subscribeToPrivateChat(chatId) {
    if (!this.socket || !this.isConnected) return;
    this.socket.emit("subscribeToPrivateChat", { chatId });
  }

  leavePrivateChat(chatId) {
    if (!this.socket || !this.isConnected) {
      return;
    }

    if (chatId) {
      this.socket.emit("leavePrivateChat", { chatId });
    }

    if (this.currentChatId === chatId) {
      this.currentChatId = null;
    }
  }

  async sendPrivateMessage(content, chatId, user, options = {}) {
    if (!this.socket || !this.isConnected) {
      throw new Error("Socket non connecté");
    }

    if (!content || !chatId || !user) {
      throw new Error("Paramètres manquants pour envoyer le message");
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Timeout lors de l'envoi du message"));
      }, 5000);

      const onMessageSent = (message) => {
        if (message.chatId === chatId && message.user._id === user._id) {
          clearTimeout(timeout);
          this.socket.off("newPrivateMessage", onMessageSent);
          resolve(message);
        }
      };

      this.socket.on("newPrivateMessage", onMessageSent);

      this.socket.emit("sendPrivateMessage", {
        content: content.trim(),
        chatId,
        user,
        replyToMessageId: options.replyToMessageId ?? null,
      });
    });
  }

  async deletePrivateMessage(chatId, messageId) {
    try {
      await fetch(`${SERVER_URL}/api/messages/${chatId}/${messageId}`, {
        method: "DELETE",
      });
    } catch (error) {
      console.error("❌ Erreur suppression message:", error);
    }
  }

  async deleteMessage(messageId, userId) {
    if (!this.socket || !this.isConnected) {
      throw new Error("Socket non connecté");
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Timeout lors de la suppression du message"));
      }, 5000);

      const onDeleted = (data) => {
        if (data._id === messageId) {
          clearTimeout(timeout);
          this.socket.off("messageDeleted", onDeleted);
          resolve(data);
        }
      };

      this.socket.on("messageDeleted", onDeleted);
      this.socket.emit("deleteMessage", { messageId, userId });
    });
  }

  async editMessage(messageId, userId, content) {
    if (!this.socket || !this.isConnected) {
      throw new Error("Socket non connecté");
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Timeout lors de la modification du message"));
      }, 5000);

      const onEdited = (data) => {
        if (data._id === messageId) {
          clearTimeout(timeout);
          this.socket.off("messageEdited", onEdited);
          resolve(data);
        }
      };

      this.socket.on("messageEdited", onEdited);
      this.socket.emit("editMessage", {
        messageId,
        userId,
        content: content.trim(),
      });
    });
  }

  joinRoomChannel(roomId, user) {
    if (!this.socket || !this.isConnected) {
      throw new Error("Socket non connecté");
    }
    this.socket.emit("joinRoomChannel", { roomId, user });
  }

  leaveRoomChannel(roomId) {
    if (!this.socket || !this.isConnected) return;
    this.socket.emit("leaveRoomChannel", { roomId });
  }

  async sendRoomMessage(content, roomId, user, options = {}) {
    if (!this.socket || !this.isConnected) {
      throw new Error("Socket non connecté");
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Timeout lors de l'envoi du message"));
      }, 5000);

      const onSent = (message) => {
        if (message.room === roomId && message.user._id === user._id) {
          clearTimeout(timeout);
          this.socket.off("newRoomMessage", onSent);
          resolve(message);
        }
      };

      this.socket.on("newRoomMessage", onSent);
      this.socket.emit("sendRoomMessage", {
        content: content.trim(),
        roomId,
        user,
        replyToMessageId: options.replyToMessageId ?? null,
      });
    });
  }

  sendRoomTyping(isTyping, roomId) {
    if (!this.socket || !this.isConnected) return;
    this.socket.emit("roomTyping", { roomId, isTyping });
  }

  createRoomChannel({
    name,
    description,
    avatar,
    isPrivate,
    memberIds = [],
    user,
  }) {
    if (!this.socket || !this.isConnected) {
      throw new Error("Socket non connecté");
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Timeout lors de la création du salon"));
      }, 10000);

      const onCreated = (data) => {
        clearTimeout(timeout);
        this.socket.off("roomCreated", onCreated);
        this.socket.off("error", onError);
        resolve(data.room);
      };

      const onError = (err) => {
        clearTimeout(timeout);
        this.socket.off("roomCreated", onCreated);
        this.socket.off("error", onError);
        reject(new Error(err?.message || "Échec de la création du salon"));
      };

      this.socket.on("roomCreated", onCreated);
      this.socket.on("error", onError);

      this.socket.emit("createRoomChannel", {
        name,
        description,
        avatar,
        isPrivate,
        memberIds,
        user,
      });
    });
  }

  acceptRoomInvite(roomId, userId) {
    if (!this.socket || !this.isConnected) {
      throw new Error("Socket non connecté");
    }

    return new Promise((resolve, reject) => {
      const onAccepted = (data) => {
        this.socket.off("roomInviteAccepted", onAccepted);
        resolve(data.room);
      };
      this.socket.on("roomInviteAccepted", onAccepted);
      this.socket.emit("acceptRoomInvite", { roomId, userId });
    });
  }

  declineRoomInvite(roomId, userId) {
    if (!this.socket || !this.isConnected) {
      throw new Error("Socket non connecté");
    }

    return new Promise((resolve, reject) => {
      const onDeclined = () => {
        this.socket.off("roomInviteDeclined", onDeclined);
        resolve();
      };
      this.socket.on("roomInviteDeclined", onDeclined);
      this.socket.emit("declineRoomInvite", { roomId, userId });
    });
  }

  inviteToRoom(roomId, userIds, invitedBy) {
    if (!this.socket || !this.isConnected) {
      throw new Error("Socket non connecté");
    }
    this.socket.emit("inviteToRoom", { roomId, userIds, invitedBy });
  }

  promoteToAdmin(roomId, targetUserId, updatedBy) {
    if (!this.socket || !this.isConnected) {
      throw new Error("Socket non connecté");
    }
    this.socket.emit("promoteToAdmin", { roomId, targetUserId, updatedBy });
  }

  demoteToMember(roomId, targetUserId, updatedBy) {
    if (!this.socket || !this.isConnected) {
      throw new Error("Socket non connecté");
    }
    this.socket.emit("demoteToMember", { roomId, targetUserId, updatedBy });
  }

  updateRoom(roomId, updates, updatedBy) {
    if (!this.socket || !this.isConnected) {
      throw new Error("Socket non connecté");
    }
    this.socket.emit("updateRoom", { roomId, updates, updatedBy });
  }

  async getRoomMembers(roomId) {
    const response = await fetch(`${SERVER_URL}/api/rooms/${roomId}/members`);
    return response.json();
  }

  async getUserRooms(userId) {
    try {
      const response = await fetch(`${SERVER_URL}/api/rooms/user/${userId}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          data.message || "Erreur lors de la récupération des rooms",
        );
      }
      return data;
    } catch (error) {
      console.error("❌ Erreur récupération rooms:", error);
      throw error;
    }
  }

  async getPendingInvites(userId) {
    try {
      const response = await fetch(`${SERVER_URL}/api/rooms/invites/${userId}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          data.message || "Erreur lors de la récupération des invitations",
        );
      }
      return data;
    } catch (error) {
      console.error("❌ Erreur récupération invitations:", error);
      throw error;
    }
  }

  toggleReaction(messageId, userId, emoji) {
    if (!this.socket || !this.isConnected) {
      throw new Error("Socket non connecté");
    }
    this.socket.emit("toggleReaction", { messageId, userId, emoji });
  }

  async markAsRead(chatId, userId) {
    try {
      await fetch(`${SERVER_URL}/api/messages/read`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ chatId, userId }),
      });
    } catch (error) {
      console.error("❌ Erreur marquage en lu:", error);
    }
  }

  async sendMessage(content, room, user) {
    if (!this.socket || !this.isConnected) {
      throw new Error("Socket non connecté");
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Timeout lors de l'envoi du message"));
      }, 5000);

      const onMessageSent = (message) => {
        if (message.room === room && message.user._id === user._id) {
          clearTimeout(timeout);
          this.socket.off("newMessage", onMessageSent);
          resolve(message);
        }
      };

      this.socket.on("newMessage", onMessageSent);

      this.socket.emit("sendMessage", {
        content: content.trim(),
        room,
        user,
      });
    });
  }

  async createChat(user1, user2) {
    if (!this.socket || !this.isConnected) {
      throw new Error("Socket non connecté");
    }

    if (!user1 || !user2) {
      throw new Error("Les deux utilisateurs sont requis");
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Timeout lors de la création du chat"));
      }, 10000);

      const onChatCreated = (data) => {
        clearTimeout(timeout);
        this.socket.off("chatCreated", onChatCreated);
        this.socket.off("error", onError);

        if (data.success) {
          resolve(data.chat);
        } else {
          reject(new Error("Échec de la création du chat"));
        }
      };

      const onError = (error) => {
        clearTimeout(timeout);
        this.socket.off("chatCreated", onChatCreated);
        this.socket.off("error", onError);
        reject(error);
      };

      this.socket.on("chatCreated", onChatCreated);
      this.socket.on("error", onError);

      this.socket.emit("createChat", { user1, user2 });
    });
  }

  async getMessages(room = null, chatId = null, page = 1, limit = 50) {
    try {
      let url = `${SERVER_URL}/api/messages?page=${page}&limit=${limit}`;

      if (chatId) {
        url += `&chatId=${chatId}`;
      } else if (room) {
        url += `&room=${room}`;
      }

      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Erreur lors de la récupération des messages",
        );
      }

      return data;
    } catch (error) {
      console.error("❌ Erreur récupération messages:", error);
      throw error;
    }
  }

  async getUserChats(userId) {
    try {
      const response = await fetch(`${SERVER_URL}/api/chat/${userId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Erreur lors de la récupération des chats",
        );
      }

      return data;
    } catch (error) {
      console.error("❌ Erreur récupération chats:", error);
      throw error;
    }
  }

  async getUsers() {
    try {
      const response = await fetch(`${SERVER_URL}/api/users`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Erreur lors de la récupération des utilisateurs",
        );
      }

      return data;
    } catch (error) {
      console.error("❌ Erreur récupération utilisateurs:", error);
      throw error;
    }
  }

  sendTyping(isTyping, chatId = null, room = null) {
    if (!this.socket || !this.isConnected) return;

    if (chatId) {
      this.socket.emit("privateTyping", { chatId, isTyping });
    } else if (room) {
      this.socket.emit("typing", { isTyping });
    }
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

  disconnect() {
    if (this.socket) {
      if (this.currentChatId) {
        this.leavePrivateChat(this.currentChatId);
      }

      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }

    this.isConnected = false;
    this.currentChatId = null;
    this.currentRoom = null;
    this.currentUser = null;
    this.eventListeners = {};
    this.reconnectAttempts = 0;
  }

  isSocketConnected() {
    return this.socket && this.socket.connected && this.isConnected;
  }

  async reconnect() {
    if (this.socket) {
      this.disconnect();
    }

    try {
      await this.initialize();

      if (this.currentUser) {
        if (this.currentChatId) {
          this.joinPrivateChat(this.currentChatId, this.currentUser);
        } else if (this.currentRoom) {
          this.joinRoom(this.currentRoom, this.currentUser);
        }
      }
    } catch (error) {
      console.error("❌ Échec de la reconnexion:", error);
      throw error;
    }
  }

  getState() {
    return {
      isConnected: this.isConnected,
      currentChatId: this.currentChatId,
      currentRoom: this.currentRoom,
      currentUser: this.currentUser,
      reconnectAttempts: this.reconnectAttempts,
    };
  }

  getEventListeners() {
    return Object.keys(this.eventListeners).map((event) => ({
      event,
      listenerCount: this.eventListeners[event].length,
    }));
  }

  ping() {
    if (this.socket && this.isConnected) {
      const startTime = Date.now();

      this.socket.emit("ping", startTime);

      this.socket.once("pong", (timestamp) => {
        const latency = Date.now() - timestamp;
        this.emit("ping", { latency, timestamp });
      });
    }
  }
}

export default new ChatService();
