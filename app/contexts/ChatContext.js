import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState } from "react-native";
import { SERVER_URL } from "../services/AuthService";
import ChatService from "../services/ChatService";
import { useAuth } from "./AuthContext";

const ChatContext = createContext(null);

export const ChatProvider = ({ children }) => {
  const { user } = useAuth();
  const [chats, setChats] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [pendingInvites, setPendingInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const listenersRef = useRef([]);
  const isMountedRef = useRef(true);
  const appStateRef = useRef(AppState.currentState);
  const activeChatIdRef = useRef(null);
  const activeRoomIdRef = useRef(null);
  const processedMessageIdsRef = useRef(new Set());

  const setActiveChatId = useCallback((chatId) => {
    activeChatIdRef.current = chatId;
  }, []);

  const setActiveRoomId = useCallback((roomId) => {
    activeRoomIdRef.current = roomId;
  }, []);

  // ── Fetch chats privés ──────────────────────────────────────
  const fetchChats = useCallback(async () => {
    if (!user?._id) {
      setChats([]);
      return;
    }
    try {
      const res = await fetch(`${SERVER_URL}/api/chat/${user._id}`);
      const data = await res.json();

      if (data.success && isMountedRef.current) {
        const sorted = [...data.chats].sort((a, b) => {
          const dateA = a.lastMessageAt
            ? new Date(a.lastMessageAt)
            : new Date(0);
          const dateB = b.lastMessageAt
            ? new Date(b.lastMessageAt)
            : new Date(0);
          return dateB - dateA;
        });
        setChats(sorted);

        sorted.forEach((chat) => {
          ChatService.subscribeToPrivateChat(chat.chatId);
        });
      }
    } catch (err) {
      console.error("❌ Erreur de récupération des chats:", err);
    }
  }, [user]);

  // ── Fetch rooms ──────────────────────────────────────────────
  const fetchRooms = useCallback(async () => {
    if (!user?._id) {
      setRooms([]);
      return;
    }
    try {
      const data = await ChatService.getUserRooms(user._id);
      if (data.success && isMountedRef.current) {
        const sorted = [...data.rooms].sort((a, b) => {
          const dateA = a.lastMessageAt
            ? new Date(a.lastMessageAt)
            : new Date(0);
          const dateB = b.lastMessageAt
            ? new Date(b.lastMessageAt)
            : new Date(0);
          return dateB - dateA;
        });
        setRooms(sorted);

        sorted.forEach((room) => {
          ChatService.subscribeToRoom(room.roomId, user);
        });
      }
    } catch (err) {
      console.error("❌ Erreur de récupération des rooms:", err);
    }
  }, [user]);

  const fetchPendingInvites = useCallback(async () => {
    if (!user?._id) {
      setPendingInvites([]);
      return;
    }
    try {
      const data = await ChatService.getPendingInvites(user._id);
      if (data.success && isMountedRef.current) {
        setPendingInvites(data.invites);
      }
    } catch (err) {
      console.error("❌ Erreur de récupération des invitations:", err);
    }
  }, [user]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchChats(), fetchRooms(), fetchPendingInvites()]);
    if (isMountedRef.current) setLoading(false);
  }, [fetchChats, fetchRooms, fetchPendingInvites]);

  // ── Listeners chats privés ────────────────────────────────────
  const handleNewMessage = useCallback(
    (message) => {
      if (!user?._id || !isMountedRef.current) return;

      setChats((prevChats) => {
        const exists = prevChats.some((c) => c.chatId === message.chatId);
        if (!exists) return prevChats;

        const updated = prevChats.map((chat) => {
          if (chat.chatId !== message.chatId) return chat;

          const isFromMe = message.user._id === user._id;
          const isChatCurrentlyOpen = chat.chatId === activeChatIdRef.current;

          return {
            ...chat,
            lastMessage: {
              _id: message._id,
              content: message.content,
              contentType: message.contentType ?? "text",
              senderId: message.user._id,
              is_read: message.isRead,
            },
            lastMessageAt: message.createdAt,
            unreadCount:
              isFromMe || isChatCurrentlyOpen
                ? chat.unreadCount || 0
                : (chat.unreadCount || 0) + 1,
          };
        });

        return updated.sort(
          (a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt),
        );
      });
    },
    [user],
  );

  const handleMessageDeleted = useCallback((data) => {
    if (!isMountedRef.current) return;

    if (data.chatId) {
      setChats((prev) =>
        prev.map((chat) => {
          if (chat.chatId !== data.chatId) return chat;
          if (chat.lastMessage?._id !== data._id) return chat;
          return {
            ...chat,
            lastMessage: data.newLastMessage
              ? {
                  _id: data.newLastMessage._id,
                  content: data.newLastMessage.content,
                  contentType: data.newLastMessage.contentType,
                  senderId: data.newLastMessage.senderId,
                  is_read: Boolean(data.newLastMessage.is_read),
                }
              : null,
            lastMessageAt: data.newLastMessage?.createdAt ?? null,
          };
        }),
      );
    }

    if (data.roomId) {
      setRooms((prev) =>
        prev.map((room) => {
          if (room.roomId !== data.roomId) return room;
          if (room.lastMessage?._id !== data._id) return room;
          return {
            ...room,
            lastMessage: data.newLastMessage
              ? {
                  _id: data.newLastMessage._id,
                  content: data.newLastMessage.content,
                  contentType: data.newLastMessage.contentType,
                  senderId: data.newLastMessage.senderId,
                  senderName: data.newLastMessage.senderName,
                  is_read: Boolean(data.newLastMessage.is_read),
                }
              : null,
            lastMessageAt: data.newLastMessage?.createdAt ?? null,
          };
        }),
      );
    }
  }, []);

  const handleMessageEditedForSidebar = useCallback((data) => {
    if (!isMountedRef.current) return;

    setChats((prev) =>
      prev.map((chat) =>
        chat.lastMessage?._id === data._id
          ? {
              ...chat,
              lastMessage: { ...chat.lastMessage, content: data.content },
            }
          : chat,
      ),
    );

    setRooms((prev) =>
      prev.map((room) =>
        room.lastMessage?._id === data._id
          ? {
              ...room,
              lastMessage: { ...room.lastMessage, content: data.content },
            }
          : room,
      ),
    );
  }, []);

  const handleNewChat = useCallback(
    (newChat) => {
      if (!user?._id || !isMountedRef.current) return;
      setChats((prev) => {
        if (prev.some((c) => c.chatId === newChat.chatId)) return prev;
        return [newChat, ...prev];
      });
    },
    [user],
  );

  const handleMessagesRead = useCallback(
    (data) => {
      if (!user?._id || !isMountedRef.current) return;

      setChats((prev) =>
        prev.map((chat) => {
          if (chat.chatId !== data.chatId) return chat;
          if (chat.lastMessage?.senderId !== user._id) return chat;
          if (data.readByUserId === user._id) return chat;
          return {
            ...chat,
            lastMessage: { ...chat.lastMessage, is_read: true },
          };
        }),
      );
    },
    [user],
  );

  const handleUserStatusChange = useCallback((data) => {
    if (!isMountedRef.current) return;
    setChats((prev) =>
      prev.map((chat) =>
        chat.otherUser._id === data.userId
          ? {
              ...chat,
              otherUser: { ...chat.otherUser, is_online: data.isOnline },
            }
          : chat,
      ),
    );
  }, []);

  const markChatAsRead = useCallback(
    async (chatId) => {
      if (!user?._id) return;

      setChats((prev) =>
        prev.map((chat) =>
          chat.chatId === chatId ? { ...chat, unreadCount: 0 } : chat,
        ),
      );

      try {
        await fetch(`${SERVER_URL}/api/messages/read`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chatId, userId: user._id }),
        });
      } catch (err) {
        console.error("❌ Erreur markChatAsRead:", err);
      }
    },
    [user],
  );

  const updateChatWithNewMessage = useCallback((message, currentUserId) => {
    setChats((prevChats) => {
      const updated = prevChats.map((chat) => {
        if (chat.chatId !== message.chatId) return chat;
        return { ...chat, lastMessage: message };
      });
      return updated.sort((a, b) => {
        const dateA = a.lastMessage?.createdAt
          ? new Date(a.lastMessage.createdAt)
          : new Date(0);
        const dateB = b.lastMessage?.createdAt
          ? new Date(b.lastMessage.createdAt)
          : new Date(0);
        return dateB - dateA;
      });
    });
  }, []);

  const normalizeLastMessage = (message, fallbackSenderId) => ({
    _id: message?._id ?? message?.id ?? "",
    content: message?.content ?? "",
    contentType: message?.contentType ?? "text",
    senderId: message?.senderId ?? message?.user?._id ?? fallbackSenderId,
    senderName: message?.senderName ?? message?.user?.name ?? "",
    is_read: Boolean(message?.is_read ?? message?.isRead),
    createdAt: message?.createdAt,
  });

  const updateRoomWithNewMessage = useCallback((message, currentUserId) => {
    setRooms((prevRooms) => {
      const updated = prevRooms.map((room) => {
        if (room.roomId !== message.room) {
          return room;
        }

        return {
          ...room,
          lastMessage: normalizeLastMessage(message, currentUserId),
          lastMessageAt: message.createdAt,
        };
      });

      return updated.sort(
        (a, b) =>
          new Date(b.lastMessageAt || 0).getTime() -
          new Date(a.lastMessageAt || 0).getTime(),
      );
    });
  }, []);

  const addNewChat = useCallback((newChat) => {
    setChats((prevChats) => {
      if (prevChats.some((c) => c.chatId === newChat.chatId)) return prevChats;
      return [newChat, ...prevChats];
    });
  }, []);

  // ── Listeners rooms ────────────────────────────────────────────
  const handleNewRoomMessage = useCallback(
    (message) => {
      if (!user?._id || !isMountedRef.current) return;
      if (processedMessageIdsRef.current.has(message._id)) return;
      processedMessageIdsRef.current.add(message._id);

      setRooms((prevRooms) => {
        const exists = prevRooms.some((r) => r.roomId === message.room);
        if (!exists) return prevRooms;

        const updated = prevRooms.map((room) => {
          if (room.roomId !== message.room) return room;

          const isFromMe = message.user._id === user._id;
          const isRoomOpen = room.roomId === activeRoomIdRef.current;

          return {
            ...room,
            lastMessage: {
              _id: message._id,
              content: message.content ?? "",
              contentType: message.contentType ?? "text",
              senderId: message.user?._id ?? user._id,
              senderName: message.user?.name,
              is_read: Boolean(message.isRead),
            },
            lastMessageAt: message.createdAt,
            unreadCount:
              isFromMe || isRoomOpen
                ? room.unreadCount || 0
                : (room.unreadCount || 0) + 1,
          };
        });

        return updated.sort(
          (a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt),
        );
      });
    },
    [user],
  );

  const handleRoomInviteReceived = useCallback((data) => {
    if (!isMountedRef.current) return;
    setPendingInvites((prev) => {
      if (prev.some((i) => i.roomId === data.room.roomId)) return prev;
      return [
        {
          roomId: data.room.roomId,
          name: data.room.name,
          description: data.room.description,
          avatar: data.room.avatar,
          isPrivate: data.room.isPrivate,
          invitedByName: data.invitedBy?.name ?? "Un admin",
          invitedAt: new Date().toISOString(),
        },
        ...prev,
      ];
    });
  }, []);

  const handleRoomUpdated = useCallback((data) => {
    if (!isMountedRef.current) return;
    setRooms((prev) =>
      prev.map((r) =>
        r.roomId === data.room.roomId ? { ...r, ...data.room } : r,
      ),
    );
  }, []);

  const handleMemberJoined = useCallback((data) => {
    if (!isMountedRef.current) return;
    setRooms((prev) =>
      prev.map((r) =>
        r.roomId === data.roomId ? { ...r, memberCount: r.memberCount + 1 } : r,
      ),
    );
  }, []);

  const handleMemberRemoved = useCallback(
    (data) => {
      if (!isMountedRef.current || !user?._id) return;
      if (data.userId === user._id) {
        setRooms((prev) => prev.filter((r) => r.roomId !== data.roomId));
        return;
      }
      setRooms((prev) =>
        prev.map((r) =>
          r.roomId === data.roomId
            ? { ...r, memberCount: Math.max(0, r.memberCount - 1) }
            : r,
        ),
      );
    },
    [user],
  );

  const handleRoomDeleted = useCallback((data) => {
    if (!isMountedRef.current) return;
    setRooms((prev) => prev.filter((r) => r.roomId !== data.roomId));
  }, []);

  const markRoomAsRead = useCallback((roomId) => {
    setRooms((prev) =>
      prev.map((room) =>
        room.roomId === roomId ? { ...room, unreadCount: 0 } : room,
      ),
    );
    return Promise.resolve();
  }, []);

  const addNewRoom = useCallback((newRoom) => {
    setRooms((prev) => {
      if (prev.some((r) => r.roomId === newRoom.roomId)) return prev;
      return [newRoom, ...prev];
    });
  }, []);

  const createRoom = useCallback(
    async ({ name, description, isPrivate, memberIds = [] }) => {
      if (!user) throw new Error("Utilisateur non connecté");
      const room = await ChatService.createRoomChannel({
        name,
        description,
        isPrivate,
        memberIds,
        user,
      });
      addNewRoom(room);
      return room;
    },
    [user, addNewRoom],
  );

  const acceptRoomInvite = useCallback(
    async (roomId) => {
      if (!user) throw new Error("Utilisateur non connecté");
      const room = await ChatService.acceptRoomInvite(roomId, user._id);
      setPendingInvites((prev) => prev.filter((i) => i.roomId !== roomId));
      addNewRoom(room);
    },
    [user, addNewRoom],
  );

  const declineRoomInvite = useCallback(
    async (roomId) => {
      if (!user) throw new Error("Utilisateur non connecté");
      await ChatService.declineRoomInvite(roomId, user._id);
      setPendingInvites((prev) => prev.filter((i) => i.roomId !== roomId));
    },
    [user],
  );

  const markOnline = useCallback(async () => {
    if (!user?._id) return;
    try {
      await ChatService.initialize();
      ChatService.joinRoom("general", user);
    } catch (err) {
      console.error("❌ Erreur présence en ligne:", err);
    }
  }, [user]);

  // ── Setup socket + listeners ─────────────────────────────────
  useEffect(() => {
    isMountedRef.current = true;

    const setup = async () => {
      if (!user?._id) return;
      await ChatService.initialize();
      ChatService.joinRoom("general", user);
      fetchAll();

      listenersRef.current.forEach(
        (unsub) => typeof unsub === "function" && unsub(),
      );
      listenersRef.current = [
        ChatService.on("newPrivateMessage", handleNewMessage),
        ChatService.on("newChat", handleNewChat),
        ChatService.on("userStatusChange", handleUserStatusChange),
        ChatService.on("messagesRead", handleMessagesRead),
        ChatService.on("messageDeleted", handleMessageDeleted),
        ChatService.on("messageEdited", handleMessageEditedForSidebar),
        ChatService.on("newRoomMessage", handleNewRoomMessage),
        ChatService.on("roomInviteReceived", handleRoomInviteReceived),
        ChatService.on("roomUpdated", handleRoomUpdated),
        ChatService.on("memberJoined", handleMemberJoined),
        ChatService.on("memberRemoved", handleMemberRemoved),
        ChatService.on("roomDeleted", handleRoomDeleted),
        ChatService.on("reconnect", () => fetchAll()),
        ChatService.on("roomRead", handleRoomRead),
      ];
    };

    setup();

    return () => {
      isMountedRef.current = false;
      listenersRef.current.forEach(
        (unsub) => typeof unsub === "function" && unsub(),
      );
      listenersRef.current = [];
    };
  }, [
    user,
    fetchAll,
    handleNewMessage,
    handleNewChat,
    handleUserStatusChange,
    handleMessagesRead,
    handleMessageDeleted,
    handleMessageEditedForSidebar,
    handleNewRoomMessage,
    handleRoomInviteReceived,
    handleRoomUpdated,
    handleMemberJoined,
    handleMemberRemoved,
    handleRoomDeleted,
  ]);

  useEffect(() => {
    if (!user?._id) return;

    const subscription = AppState.addEventListener("change", (nextState) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextState === "active"
      ) {
        markOnline();
        fetchAll();
      }
      appStateRef.current = nextState;
    });

    return () => {
      subscription.remove();
    };
  }, [user, markOnline, fetchAll]);

  // ── Fusion conversations ────────────────────────────────────────
  const conversations = useMemo(() => {
    const privateConvs = chats.map((c) => ({ type: "private", ...c }));
    const roomConvs = rooms.map((r) => ({ type: "room", ...r }));
    return [...privateConvs, ...roomConvs].sort((a, b) => {
      const dateA = a.lastMessageAt ? new Date(a.lastMessageAt) : new Date(0);
      const dateB = b.lastMessageAt ? new Date(b.lastMessageAt) : new Date(0);
      return dateB - dateA;
    });
  }, [chats, rooms]);

  const unreadChatsCount = useMemo(
    () => chats.filter((chat) => (chat.unreadCount || 0) > 0).length,
    [chats],
  );

  const handleRoomRead = useCallback(
    (data) => {
      if (!user?._id || !isMountedRef.current) return;
      if (data.userId !== user._id) return;

      setRooms((prev) =>
        prev.map((room) =>
          room.roomId === data.roomId ? { ...room, unreadCount: 0 } : room,
        ),
      );
    },
    [user],
  );

  const unreadRoomsCount = useMemo(
    () => rooms.filter((r) => (r.unreadCount || 0) > 0).length,
    [rooms],
  );

  const value = {
    chats,
    rooms,
    conversations,
    pendingInvites,
    loading,
    unreadChatsCount,
    unreadRoomsCount,
    fetchChats,
    fetchRooms,
    fetchPendingInvites,
    markChatAsRead,
    markRoomAsRead,
    updateChatWithNewMessage,
    updateRoomWithNewMessage,
    addNewChat,
    addNewRoom,
    setActiveChatId,
    setActiveRoomId,
    createRoom,
    acceptRoomInvite,
    declineRoomInvite,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export const useChat = () => {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat doit être utilisé dans un ChatProvider");
  return ctx;
};
