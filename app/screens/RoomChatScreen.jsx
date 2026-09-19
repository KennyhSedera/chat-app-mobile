import avatar from "@/assets/images/pdp.jpg";
import {
  Ionicons,
  MaterialCommunityIcons,
  MaterialIcons,
} from "@expo/vector-icons";
import { useRoute } from "@react-navigation/native";
import * as Clipboard from "expo-clipboard";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  ToastAndroid,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ImageViewer from "../components/ImageViewer";
import MessageActionSheet from "../components/MessageActionSheet";
import { useAuth } from "../contexts/AuthContext";
import { useChat } from "../contexts/ChatContext";
import { useAppColors } from "../hooks/colors";
import ChatService from "../services/ChatService";
import uploadService from "../services/UploadService";
import { initialName } from "../utils/text.utils";

const getReplyText = (message, currentUserId) => {
  if (!message.replyTo) return null;

  const isReplyMine = message.user?._id === currentUserId;
  const isOriginalMine = message.replyTo.user?._id === currentUserId;

  if (
    !isReplyMine &&
    !isOriginalMine &&
    message.user?._id === message.replyTo.user?._id
  ) {
    return `${message.user?.name} a répondu à son message`;
  }
  if (!isReplyMine && isOriginalMine) {
    return `${message.user?.name} a répondu à votre message`;
  }
  if (isReplyMine && isOriginalMine) {
    return `Vous avez répondu à votre message`;
  }
  if (isReplyMine) {
    return `Vous avez répondu au message de ${message.replyTo.user?.name}`;
  }
  return `${message.user?.name} a répondu au message de ${message.replyTo.user?.name}`;
};

const RoomChatScreen = ({ navigation }) => {
  const route = useRoute();
  const { roomId } = route.params;
  const { user } = useAuth();
  const { rooms, markRoomAsRead, setActiveRoomId, updateRoomWithNewMessage } =
    useChat();

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState({
    isTyping: false,
    username: "",
  });
  const flatListRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const { colors } = useAppColors();
  const [focused, setFocused] = useState(false);
  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [selectedReaction, setSelectedReaction] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [imageViewerImage, setImageViewerImage] = useState(null);
  const [readReceipts, setReadReceipts] = useState([]);
  const inputRef = useRef(null);

  const infoRoom = rooms.find((r) => r.roomId === roomId);

  const isNearBottomRef = useRef(true);
  const hasInitialScrolledRef = useRef(false);

  useEffect(() => {
    ChatService.getRoomReadReceipts(roomId).then((data) => {
      if (data.success) setReadReceipts(data.receipts);
    });
  }, [roomId]);

  const handleScroll = useCallback((e) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const threshold = 100;

    isNearBottomRef.current =
      contentSize.height - contentOffset.y - layoutMeasurement.height <=
      threshold;
  }, []);

  const handleContentSizeChange = useCallback(() => {
    if (!hasInitialScrolledRef.current && messages.length > 0) {
      setTimeout(() => {
        hasInitialScrolledRef.current = true;
      }, 1000);

      requestAnimationFrame(() => {
        flatListRef.current?.scrollToEnd({
          animated: false,
        });
      });
    }
  }, [messages.length]);

  const handleNewMessage = useCallback(
    (message) => {
      if (message.room !== roomId) return;

      const shouldScroll = isNearBottomRef.current;

      setMessages((prev) => {
        if (prev.some((msg) => msg._id === message._id)) return prev;

        return [...prev, message].sort(
          (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
        );
      });

      updateRoomWithNewMessage(message, user._id);
      if (message.user._id !== user._id) {
        ChatService.markRoomRead(roomId, user._id, message._id);
      }

      if (shouldScroll) {
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    },
    [roomId],
  );

  const handleTyping = useCallback(
    (data) => {
      if (data.roomId !== roomId || data.user._id === user._id) return;
      setOtherUserTyping({ isTyping: data.isTyping, username: data.user.name });
    },
    [roomId, user._id],
  );

  const handleMessageEdited = useCallback((data) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m._id === data._id) {
          return {
            ...m,
            content: data.content,
            isEdited: data.isEdited,
            updatedAt: data.updatedAt,
          };
        }
        if (m.replyTo?._id === data._id) {
          return { ...m, replyTo: { ...m.replyTo, content: data.content } };
        }
        return m;
      }),
    );
  }, []);

  const handleReactionAdded = useCallback((data) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m._id !== data.messageId) return m;
        const withoutUser = (m.reactions ?? []).filter(
          (r) => r.userId !== data.userId,
        );
        return {
          ...m,
          reactions: [
            ...withoutUser,
            { emoji: data.emoji, userId: data.userId },
          ],
        };
      }),
    );
  }, []);

  const handleReactionRemoved = useCallback((data) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m._id !== data.messageId) return m;
        return {
          ...m,
          reactions: (m.reactions ?? []).filter(
            (r) => r.userId !== data.userId,
          ),
        };
      }),
    );
  }, []);

  const handleMessageDeleted = useCallback(
    (data) => {
      if (data.roomId !== roomId) return;
      setMessages((prev) => prev.filter((m) => m._id !== data._id));
    },
    [roomId],
  );

  const handleRoomRead = useCallback(
    (data) => {
      if (data.roomId !== roomId) return;
      setReadReceipts((prev) =>
        prev.map((r) =>
          r.userId === data.userId
            ? { ...r, lastReadMessageId: data.lastReadMessageId }
            : r,
        ),
      );
    },
    [roomId],
  );

  useEffect(() => {
    let unsubscribeMessage;
    let unsubscribeTyping;
    let unsubscribeEdited;
    let unsubscribeReactionAdded;
    let unsubscribeReactionRemoved;
    let unsubscribeMessageDeleted;
    let unsubscribeRoomRead;
    let isComponentMounted = true;

    setActiveRoomId(roomId);

    const initChat = async () => {
      try {
        setError(null);
        setLoading(true);

        await ChatService.initialize();
        ChatService.joinRoomChannel(roomId, user);

        unsubscribeMessage = ChatService.on("newRoomMessage", handleNewMessage);
        unsubscribeTyping = ChatService.on("userRoomTyping", handleTyping);
        unsubscribeEdited = ChatService.on(
          "messageEdited",
          handleMessageEdited,
        );
        unsubscribeReactionAdded = ChatService.on(
          "reactionAdded",
          handleReactionAdded,
        );
        unsubscribeReactionRemoved = ChatService.on(
          "reactionRemoved",
          handleReactionRemoved,
        );
        unsubscribeMessageDeleted = ChatService.on(
          "messageDeleted",
          handleMessageDeleted,
        );
        unsubscribeRoomRead = ChatService.on("roomRead", handleRoomRead);

        const unsubPrevious = ChatService.on("previousRoomMessages", (msgs) => {
          if (!isComponentMounted) return;
          const sorted = [...msgs].sort(
            (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
          );
          setMessages(sorted);
          setLoading(false);
          markRoomAsRead(roomId);
        });

        unsubscribeMessage = (() => {
          const u1 = unsubscribeMessage;
          return () => {
            u1?.();
            unsubPrevious();
          };
        })();
      } catch (error) {
        console.error("❌ Erreur d'initialisation du salon:", error);
        if (isComponentMounted) {
          setError("Impossible de se connecter au salon");
          setLoading(false);
        }
      }
    };

    initChat();

    return () => {
      isComponentMounted = false;
      setActiveRoomId(null);
      unsubscribeMessage?.();
      unsubscribeTyping?.();
      unsubscribeEdited?.();
      unsubscribeReactionAdded?.();
      unsubscribeReactionRemoved?.();
      unsubscribeMessageDeleted?.();
      unsubscribeRoomRead?.();
      ChatService.leaveRoomChannel(roomId);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [
    roomId,
    user,
    handleNewMessage,
    handleTyping,
    handleMessageEdited,
    handleReactionAdded,
    handleReactionRemoved,
    handleMessageDeleted,
    handleRoomRead,
    setActiveRoomId,
    markRoomAsRead,
  ]);

  const handleSend = async () => {
    const messageText = input.trim();
    if (!messageText) return;

    if (editingMessageId) {
      const messageId = editingMessageId;
      try {
        setInput("");
        setEditingMessageId(null);
        await ChatService.editMessage(messageId, user._id, messageText);
      } catch (error) {
        console.error("❌ Erreur modification message:", error);
        Alert.alert("Erreur", "Impossible de modifier le message");
      }
      return;
    }

    const replyToMessageId = replyingTo?._id ?? null;

    try {
      setInput("");
      setReplyingTo(null);
      setIsTyping(false);
      ChatService.sendRoomTyping(false, roomId);
      await ChatService.sendRoomMessage(messageText, roomId, user, {
        replyToMessageId,
      });
      inputRef.current?.blur();
      setFocused(false);
    } catch (error) {
      console.error("❌ Erreur envoi message:", error);
      Alert.alert("Erreur", "Impossible d'envoyer le message");
      setInput(messageText);
    }
  };

  const cancelComposerAction = () => {
    setReplyingTo(null);
    setEditingMessageId(null);
    setInput("");
  };

  const handleInputFocus = () => {
    setIsTyping(true);
    setFocused(true);
    ChatService.sendRoomTyping(true, roomId);
  };

  const handleInputBlur = () => {
    setIsTyping(false);
    setFocused(false);
    ChatService.sendRoomTyping(false, roomId);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  };

  const handleInputChange = (text) => {
    setInput(text);
    if (!isTyping) {
      setIsTyping(true);
      ChatService.sendRoomTyping(true, roomId);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    return new Date(timestamp).toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDateSeparator = (timestamp) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const isSameDay = (a, b) =>
      a.getDate() === b.getDate() &&
      a.getMonth() === b.getMonth() &&
      a.getFullYear() === b.getFullYear();

    if (isSameDay(date, today)) return "Aujourd'hui";
    if (isSameDay(date, yesterday)) return "Hier";
    return date.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
  };

  const buildListData = () => {
    const items = [];
    let lastDateKey = null;

    messages.forEach((msg, index) => {
      const dateKey = new Date(msg.createdAt).toDateString();
      if (dateKey !== lastDateKey) {
        items.push({
          type: "date",
          id: `date-${dateKey}`,
          label: formatDateSeparator(msg.createdAt),
        });
        lastDateKey = dateKey;
      }

      const prevMsg = messages[index - 1];
      const nextMsg = messages[index + 1];
      const isFirstOfGroup =
        !prevMsg ||
        prevMsg.user._id !== msg.user._id ||
        dateKey !== new Date(prevMsg.createdAt).toDateString();
      const isLastOfGroup = !nextMsg || nextMsg.user._id !== msg.user._id;
      const senderId = msg.user._id;

      items.push({
        type: "message",
        ...msg,
        senderId,
        isFirstOfGroup,
        isLastOfGroup,
      });
    });

    return items;
  };

  async function handleSendImage() {
    const image = await uploadService.pickImage();
    if (!image) return;

    try {
      const uploaded = await uploadService.uploadFile(image, "image");

      ChatService.socket.emit("sendRoomMessage", {
        roomId,
        user,
        content: uploaded.fileName,
        contentType: "image",
        fileUrl: uploaded.fileUrl,
        fileName: uploaded.fileName,
        fileSize: uploaded.fileSize,
        fileMimeType: uploaded.fileMimeType,
      });
    } catch (error) {
      console.error("Erreur envoi image:", error);
    }
  }

  const handleDelete = async (item) => {
    try {
      await ChatService.deleteMessage(item._id, user._id);
    } catch (error) {
      console.error("❌ Erreur suppression message:", error);
      Alert.alert(
        "Erreur",
        error.message || "Impossible de supprimer le message",
      );
    }
  };

  const openImageViewer = (fileUrl) => {
    if (fileUrl) {
      setImageViewerImage(fileUrl);
      setImageViewerVisible(true);
    }
  };

  const closeImageViewer = () => {
    setImageViewerImage(null);
    setImageViewerVisible(false);
  };

  const openActionSheet = (message) => {
    const myReaction = message.reactions?.find((r) => r.userId === user._id);
    setSelectedMessage(message);
    setSelectedReaction(myReaction ? myReaction.emoji : null);
    setActionSheetVisible(true);
  };

  const handleAction = async (actionKey) => {
    if (!selectedMessage) return;

    switch (actionKey) {
      case "copy":
        Clipboard.setStringAsync(selectedMessage.content);
        ToastAndroid.show("Message copié", ToastAndroid.SHORT);
        break;
      case "reply":
        setReplyingTo(selectedMessage);
        setEditingMessageId(null);
        inputRef.current?.focus();
        break;
      case "forward":
        break;
      case "edit":
        setEditingMessageId(selectedMessage._id);
        setReplyingTo(null);
        setInput(selectedMessage.content);
        inputRef.current?.focus();
        break;
      case "delete":
        handleDelete(selectedMessage);
        break;
      default:
        break;
    }
  };

  const handleReact = (emoji) => {
    if (!selectedMessage || !user) return;
    ChatService.toggleReaction(selectedMessage._id, user._id, emoji);
  };

  const renderItem = ({ item, index }) => {
    if (item.type === "date") {
      return (
        <View style={styles.dateSeparatorContainer}>
          <View
            style={[
              styles.dateSeparatorPill,
              { backgroundColor: colors.border, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.dateSeparatorText, { color: colors.text }]}>
              {item.label}
            </Text>
          </View>
        </View>
      );
    }

    const isMyMessage = item.user._id === user._id;
    const currentUserId = user._id;

    const allMyMessages = buildListData().filter(
      (m) => m.type === "message" && m.senderId === currentUserId,
    );

    const lastMyMessage = allMyMessages.at(-1);

    const otherReadReceipts = readReceipts.filter(
      (r) => r.userId !== currentUserId,
    );

    const allAsRead =
      !!lastMyMessage &&
      otherReadReceipts.length === infoRoom.memberCount - 1 &&
      otherReadReceipts.every(
        (r) => Number(r.lastReadMessageId) >= Number(lastMyMessage._id),
      );

    console.log(lastMyMessage);

    const anyoneAsReaded =
      !!lastMyMessage &&
      otherReadReceipts.some(
        (r) => Number(r.lastReadMessageId) >= Number(lastMyMessage._id),
      );

    const getLastMyMessageReadBy = (readReceipt) => {
      const readId = Number(readReceipt.lastReadMessageId);

      const myMessagesBeforeRead = allMyMessages.filter(
        (m) => Number(m._id) <= readId,
      );

      return myMessagesBeforeRead[myMessagesBeforeRead.length - 1];
    };

    const seenBy = readReceipts
      .filter((r) => r.userId !== user?._id)
      .filter((r) => {
        const lastMyMessageRead = getLastMyMessageReadBy(r);

        return (
          lastMyMessageRead &&
          Number(lastMyMessageRead._id) === Number(item._id)
        );
      });

    const lastMyMessageIndex = buildListData().reduce(
      (lastIndex, item, index) =>
        item.type !== "separator" && item.senderId === currentUserId
          ? index
          : lastIndex,
      -1,
    );

    return (
      <View
        style={{
          flexDirection: "row",
          width: "100%",
          alignItems: "flex-end",
          justifyContent: isMyMessage ? "flex-end" : "flex-start",
        }}
      >
        {item.isLastOfGroup && !isMyMessage && (
          <Pressable
            // onPress={() => openProfile(item.user._id)}
            style={[
              styles.miniAvatar,
              { marginRight: 2, backgroundColor: colors.border },
            ]}
          >
            {item.user.avatar ? (
              <Image
                source={{ uri: item.user.avatar }}
                style={[styles.miniAvatar, { borderColor: colors.border }]}
                resizeMode="cover"
              />
            ) : (
              <Text style={[{ color: colors.textSecondary }]}>
                {initialName(item.user.name)}
              </Text>
            )}
          </Pressable>
        )}
        <View
          style={[
            styles.messageWrapper,
            isMyMessage ? styles.myMessageWrapper : styles.otherMessageWrapper,
            {
              marginTop: item.isFirstOfGroup ? 10 : 2,
              marginLeft: item.isLastOfGroup ? 0 : 32,
            },
          ]}
        >
          <View style={{ alignItems: isMyMessage ? "flex-end" : "flex-start" }}>
            {!isMyMessage && item.isFirstOfGroup && !item.replyTo && (
              <Text
                style={[styles.senderName, { color: colors.textSecondary }]}
              >
                {item.user.name}
              </Text>
            )}
            {item.replyTo && (
              <Text
                style={[styles.replyLabel, { color: colors.textSecondary }]}
              >
                <Ionicons name="arrow-undo" size={12} color={colors.text} />{" "}
                {getReplyText(item, user._id)}
              </Text>
            )}

            {item.replyTo && (
              <View
                style={{
                  flexDirection: "row",
                  alignSelf: isMyMessage ? "flex-end" : "flex-start",
                  maxWidth: "100%",
                  marginBottom: 4,
                }}
              >
                <View
                  style={[
                    styles.replyPreview,
                    {
                      backgroundColor: colors.border + "60",
                      borderColor: colors.primary,
                      borderLeftWidth: 4,
                    },
                  ]}
                >
                  {item.replyTo.contentType === "image" &&
                    item.replyTo.fileUrl && (
                      <Image
                        source={{ uri: item.replyTo.fileUrl }}
                        style={styles.replyThumbnail}
                        resizeMode="cover"
                      />
                    )}
                  {item.replyTo.contentType === "video" && (
                    <View style={styles.replyThumbnail}>
                      <Image
                        source={{
                          uri:
                            item.replyTo.thumbnailUrl || item.replyTo.fileUrl,
                        }}
                        style={styles.replyThumbnail}
                        resizeMode="cover"
                      />
                      <View style={styles.replyVideoOverlay}>
                        <Ionicons name="play" size={12} color="#fff" />
                      </View>
                    </View>
                  )}
                  <Text
                    style={[
                      styles.replyPreviewText,
                      {
                        color: isMyMessage ? colors.textMine : colors.textOther,
                        flexShrink: 1,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {item.replyTo.contentType === "text"
                      ? item.replyTo.content || "Message vide ou supprimé ..."
                      : {
                          image: "📷 Photo",
                          audio: "🎤 Message vocal",
                          video: "🎥 Vidéo",
                          document: `📄 ${item.replyTo.fileName || "Document"}`,
                        }[item.replyTo.contentType] || item.replyTo.content}
                  </Text>
                </View>
              </View>
            )}

            <Pressable
              onLongPress={() => openActionSheet(item)}
              style={[
                styles.messageBubble,
                isMyMessage ? styles.myMessage : styles.otherMessage,
                isMyMessage && item.isLastOfGroup && styles.myMessageTail,
                !isMyMessage && item.isLastOfGroup && styles.otherMessageTail,
                {
                  backgroundColor:
                    item.contentType === "image"
                      ? "transparent"
                      : isMyMessage
                        ? colors.primary
                        : colors.border,
                  paddingVertical: item.contentType === "image" ? 0 : 9,
                  paddingHorizontal: item.contentType === "image" ? 0 : 14,
                },
                ["image", "video"].includes(item.contentType) &&
                  styles.mediaBubble,
              ]}
            >
              {renderMessageContent(item, isMyMessage)}
            </Pressable>
          </View>

          {(item.reactions?.length ?? 0) > 0 && (
            <View style={styles.reactionsRow}>
              {Object.entries(
                item.reactions.reduce((acc, r) => {
                  acc[r.emoji] = (acc[r.emoji] ?? 0) + 1;
                  return acc;
                }, {}),
              ).map(([emoji, count]) => {
                const mine = item.reactions.some(
                  (r) => r.emoji === emoji && r.userId === user._id,
                );
                return (
                  <TouchableOpacity
                    key={emoji}
                    style={[
                      styles.reactionPill,
                      {
                        backgroundColor: mine
                          ? colors.primary + "30"
                          : colors.border,
                      },
                    ]}
                    onPress={() =>
                      ChatService.toggleReaction(item._id, user._id, emoji)
                    }
                  >
                    <Text style={styles.reactionEmoji}>{emoji}</Text>
                    {count > 1 && (
                      <Text
                        style={[styles.reactionCount, { color: colors.text }]}
                      >
                        {count}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {item.isLastOfGroup && (
            <View style={styles.timestampRow}>
              <Text style={styles.timestamp}>{formatTime(item.createdAt)}</Text>
              {isMyMessage && lastMyMessageIndex === index && (
                <MaterialIcons
                  name={anyoneAsReaded ? "done-all" : "check"}
                  size={14}
                  color={allAsRead ? colors.sendActive : colors.timestamp}
                  style={{ marginLeft: 4 }}
                />
              )}
            </View>
          )}
          {isMyMessage && seenBy.length > 0 && (
            <View style={{ flexDirection: "row", marginTop: 2 }}>
              {seenBy.slice(0, 3).map((r) => (
                <Image
                  key={r.userId}
                  source={r.avatar ? { uri: r.avatar } : avatar}
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: 7,
                    marginLeft: -4,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                />
              ))}
            </View>
          )}
        </View>
      </View>
    );

    function renderMessageContent(item, isMyMessage) {
      const textColor = isMyMessage ? colors.textMine : colors.textOther;

      switch (item.contentType) {
        case "image":
          return (
            <Pressable
              onPress={() => openImageViewer(item.fileUrl)}
              onLongPress={() => openActionSheet(item)}
            >
              <Image
                source={{ uri: item.fileUrl }}
                style={[
                  styles.messageImage,
                  isMyMessage ? styles.myMessage : styles.otherMessage,
                  isMyMessage && item.isLastOfGroup && styles.myMessageTail,
                  !isMyMessage && item.isLastOfGroup && styles.otherMessageTail,
                  { borderWidth: 1, borderColor: colors.border },
                ]}
                resizeMode="cover"
              />
            </Pressable>
          );
        case "video":
          return (
            <Pressable onPress={() => openVideoViewer(item.fileUrl)}>
              <View style={styles.videoThumbnailWrap}>
                <Image
                  source={{ uri: item.thumbnailUrl || item.fileUrl }}
                  style={styles.messageImage}
                  resizeMode="cover"
                />
                <View style={styles.playOverlay}>
                  <Ionicons name="play-circle" size={40} color="#fff" />
                </View>
              </View>
              {!!item.content && (
                <Text
                  style={[
                    styles.messageText,
                    { color: textColor, marginTop: 6 },
                  ]}
                >
                  {item.content}
                </Text>
              )}
            </Pressable>
          );
        case "document":
          return (
            <Pressable
              style={styles.documentRow}
              onPress={() => openDocument(item.fileUrl)}
            >
              <View
                style={[
                  styles.documentIconWrap,
                  {
                    backgroundColor: isMyMessage
                      ? "#ffffff30"
                      : colors.background,
                  },
                ]}
              >
                <Ionicons name="document-text" size={22} color={textColor} />
              </View>
              <View style={styles.documentInfo}>
                <Text
                  style={[styles.documentName, { color: textColor }]}
                  numberOfLines={1}
                >
                  {item.fileName || "Document"}
                </Text>
              </View>
              <Ionicons name="download-outline" size={18} color={textColor} />
            </Pressable>
          );
        case "text":
        default:
          return (
            <Text style={[styles.messageText, { color: textColor }]}>
              {item.content}
            </Text>
          );
      }
    }
  };

  if (!infoRoom) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <View style={styles.centerContainer}>
          <Text style={{ color: colors.text }}>Salon introuvable</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <View style={styles.centerContainer}>
          <Text style={[styles.errorText, { color: colors.danger }]}>
            {error}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : focused ? 25 : 0}
      >
        <View
          style={[
            styles.header,
            { backgroundColor: colors.card, borderBottomColor: colors.border },
          ]}
        >
          <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
              hitSlop={10}
            >
              <Ionicons name="chevron-back" size={26} color={colors.text} />
            </TouchableOpacity>

            <View style={{ position: "relative" }}>
              <Image
                source={infoRoom.avatar ? { uri: infoRoom.avatar } : avatar}
                style={[
                  styles.avatar,
                  {
                    backgroundColor: colors.borderSecondary,
                    borderWidth: 2,
                    borderColor: colors.border,
                  },
                ]}
              />
              {infoRoom.isPrivate && (
                <View
                  style={[styles.lockBadge, { backgroundColor: colors.border }]}
                >
                  <Text style={{ fontSize: 8 }}>🔒</Text>
                </View>
              )}
            </View>

            <View style={styles.headerCenter}>
              <Text
                style={[styles.title, { color: colors.text }]}
                numberOfLines={1}
              >
                {infoRoom.name}
              </Text>
              <Text
                style={[
                  styles.subtitle,
                  {
                    color: otherUserTyping.isTyping
                      ? colors.primary
                      : colors.textSecondary,
                  },
                ]}
              >
                {otherUserTyping.isTyping
                  ? `${otherUserTyping.username} écrit...`
                  : `${infoRoom.memberCount} membre${infoRoom.memberCount > 1 ? "s" : ""}`}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => navigation.navigate("RoomMembers", { roomId })}
            style={styles.membersButton}
          >
            <Ionicons name="people-outline" size={22} color={colors.text} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.centerContainer}>
            <Text style={[styles.loadingText, { color: colors.text }]}>
              Chargement des messages...
            </Text>
          </View>
        ) : messages.length === 0 ? (
          <View style={styles.centerContainer}>
            <Text style={[styles.emptyText, { color: colors.text }]}>
              Aucun message pour le moment
            </Text>
            <Text
              style={[styles.emptySubText, { color: colors.textSecondary }]}
            >
              Dites bonjour à vos amis et commencez la conversation👋
            </Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            onScroll={handleScroll}
            data={buildListData()}
            keyExtractor={(item) =>
              item.type === "date" ? item.id : item._id.toString()
            }
            renderItem={renderItem}
            contentContainerStyle={styles.messagesList}
            onContentSizeChange={handleContentSizeChange}
            showsVerticalScrollIndicator={false}
          />
        )}

        {(replyingTo || editingMessageId) && (
          <View
            style={[
              styles.composerPreview,
              { backgroundColor: colors.card, borderTopColor: colors.border },
            ]}
          >
            <View style={styles.composerPreviewBar} />
            <View style={styles.composerPreviewContent}>
              <Text
                style={[styles.composerPreviewTitle, { color: colors.primary }]}
              >
                {editingMessageId
                  ? "Modifier le message"
                  : `Réponse à ${replyingTo?.user.name}`}
              </Text>
              <Text
                style={[
                  styles.composerPreviewText,
                  { color: colors.textSecondary },
                ]}
                numberOfLines={1}
              >
                {editingMessageId
                  ? messages.find((m) => m._id === editingMessageId)?.content
                  : replyingTo?.content}
              </Text>
            </View>
            <TouchableOpacity onPress={cancelComposerAction} hitSlop={10}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        )}

        <View
          style={[
            styles.inputContainer,
            { backgroundColor: colors.card, borderTopColor: colors.border },
          ]}
        >
          <TouchableOpacity
            onPress={handleSendImage}
            style={styles.attachButton}
          >
            <MaterialCommunityIcons
              name="file-image-outline"
              size={32}
              color={colors.placeholder}
            />
          </TouchableOpacity>
          <TextInput
            ref={inputRef}
            style={[
              styles.textInput,
              { backgroundColor: "transparent", borderColor: colors.border },
            ]}
            placeholder="Écrire un message..."
            placeholderTextColor={colors.placeholder}
            value={input}
            onChangeText={handleInputChange}
            multiline
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={handleSend}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              {
                backgroundColor: input.trim() ? colors.primary : colors.border,
              },
            ]}
            onPress={handleSend}
            disabled={!input.trim()}
          >
            <Ionicons
              name="send"
              size={18}
              color={input.trim() ? "#fff" : colors.placeholder}
            />
          </TouchableOpacity>
        </View>

        <MessageActionSheet
          visible={actionSheetVisible}
          onClose={() => setActionSheetVisible(false)}
          onReact={handleReact}
          reaction={selectedReaction}
          onAction={handleAction}
          message={selectedMessage}
          colors={colors}
          userId={user._id}
        />
        <ImageViewer
          visible={imageViewerVisible}
          image={imageViewerImage}
          onClose={closeImageViewer}
        />
      </KeyboardAvoidingView>
    </View>
  );
};

export default RoomChatScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  attachButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: { fontSize: 20, textAlign: "center", marginBottom: 8 },
  emptySubText: { fontSize: 16, textAlign: "center", lineHeight: 20 },
  miniAvatar: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    borderWidth: 1,
  },
  senderName: { fontSize: 11, marginLeft: 10, marginBottom: 2 },
  replyLabel: { fontSize: 11, marginLeft: 1, marginBottom: 2 },
  membersButton: { width: 40, alignItems: "center", justifyContent: "center" },
  lockBadge: {
    position: "absolute",
    bottom: -2,
    right: 4,
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  replyPreview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 10,
    flexShrink: 1,
  },
  replyThumbnail: {
    width: 32,
    height: 32,
    borderRadius: 6,
    overflow: "hidden",
  },
  replyVideoOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 6,
  },
  composerPreview: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  composerPreviewBar: {
    width: 3,
    height: 32,
    borderRadius: 2,
    backgroundColor: "#3ECF8E",
    marginRight: 10,
  },
  composerPreviewContent: { flex: 1 },
  composerPreviewTitle: { fontSize: 12, fontWeight: "600" },
  composerPreviewText: { fontSize: 13, marginTop: 1 },
  header: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: { width: 36, alignItems: "flex-start", justifyContent: "center" },
  headerCenter: {
    alignItems: "flex-start",
    justifyContent: "center",
    marginLeft: 4,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 8,
    borderWidth: 1,
  },
  title: { fontSize: 17, fontWeight: "600" },
  subtitle: { fontSize: 12, marginTop: 1 },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: { fontSize: 15 },
  errorText: { fontSize: 15, textAlign: "center" },
  messagesList: { paddingHorizontal: 12, paddingVertical: 12 },
  dateSeparatorContainer: { alignItems: "center", marginVertical: 12 },
  dateSeparatorPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  dateSeparatorText: { fontSize: 12, fontWeight: "500" },
  messageWrapper: {
    maxWidth: "78%",
  },
  myMessageWrapper: { alignSelf: "flex-end", alignItems: "flex-end" },
  otherMessageWrapper: { alignSelf: "flex-start", alignItems: "flex-start" },
  messageBubble: {
    overflow: "hidden",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 18,
  },
  myMessage: { borderBottomRightRadius: 18 },
  otherMessage: { borderBottomLeftRadius: 18 },
  myMessageTail: { borderBottomRightRadius: 4 },
  otherMessageTail: { borderBottomLeftRadius: 4 },
  messageText: { fontSize: 15.5, lineHeight: 21 },
  timestampRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 3,
    marginHorizontal: 6,
  },
  timestamp: { fontSize: 11 },
  reactionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 4,
  },
  reactionPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 3,
  },
  reactionEmoji: { fontSize: 13 },
  reactionCount: { fontSize: 11, fontWeight: "500" },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  textInput: {
    flex: 1,
    minHeight: 42,
    maxHeight: 110,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 21,
    borderWidth: 1,
    fontSize: 15.5,
    marginRight: 10,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  messageImage: { marginTop: 1, width: 150, height: 200, borderRadius: 18 },
  videoThumbnailWrap: { position: "relative" },
  playOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  documentRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  documentIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  documentInfo: { flex: 1 },
  documentName: { fontSize: 14, fontWeight: "500" },
});
