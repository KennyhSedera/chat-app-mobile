import avatar from "@/assets/images/pdp.jpg";
import {
  Ionicons,
  MaterialCommunityIcons,
  MaterialIcons,
} from "@expo/vector-icons";
import { useFocusEffect, useRoute } from "@react-navigation/native";
import * as Clipboard from "expo-clipboard";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
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
import { SERVER_URL } from "../services/AuthService";
import ChatService from "../services/ChatService";
import uploadService from "../services/UploadService";
import { formatRelativeTime } from "../utils/dateUtils";

const PrivateChatScreen = ({ navigation }) => {
  const route = useRoute();
  const { chatId, userId } = route.params;
  const { user } = useAuth();
  const { setActiveChatId } = useChat();

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const flatListRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const { colors } = useAppColors();
  const [focused, setFocused] = useState(false);
  const [otherUser, setOtherUser] = useState({});
  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [selectedReaction, setSelectedReaction] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [imageViewerImage, setImageViewerImage] = useState(null);
  const inputRef = useRef(null);

  const [doubleTapMessageId, setDoubleTapMessageId] = useState(null);
  const heartScale = useRef(new Animated.Value(0)).current;

  const handleDoubleTap = (messageId) => {
    if (!user) return;

    ChatService.toggleReaction(messageId, user._id, "❤️");

    setDoubleTapMessageId(messageId);
    heartScale.setValue(0);
    Animated.sequence([
      Animated.spring(heartScale, {
        toValue: 1,
        useNativeDriver: true,
        friction: 3,
      }),
      Animated.timing(heartScale, {
        toValue: 0,
        duration: 300,
        delay: 300,
        useNativeDriver: true,
      }),
    ]).start(() => setDoubleTapMessageId(null));
  };

  const handleNewMessage = useCallback(
    (message) => {
      if (message.chatId === chatId) {
        setMessages((prev) => {
          const messageExists = prev.some((msg) => msg._id === message._id);
          if (messageExists) return prev;

          return [...prev, message].sort(
            (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
          );
        });

        if (message.user._id === user._id || isNearBottomRef.current) {
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }

        if (message.user._id !== user._id) {
          ChatService.markAsRead(chatId, user._id);
        }
      }
    },
    [chatId, user._id],
  );

  const handleTyping = useCallback(
    (data) => {
      if (data.chatId !== chatId || data.user._id === user._id) {
        return;
      }

      setOtherUserTyping(data.isTyping);
    },
    [chatId, user._id],
  );

  useFocusEffect(
    useCallback(() => {
      async function fetchOtherUser() {
        const res = await fetch(`${SERVER_URL}/api/users/${userId}`);

        const data = await res.json();
        if (data.success) {
          setOtherUser(data.user);
        }
      }
      fetchOtherUser();
    }, [userId]),
  );

  useEffect(() => {
    let unsubscribeMessage;
    let unsubscribeTyping;
    let unsubscribeEdited;
    let unsubscribeReactionAdded;
    let unsubscribeReactionRemoved;
    let unsubscribeMessagesRead;
    let unsubscribeMessageDeleted;
    let isComponentMounted = true;

    setActiveChatId(chatId);

    const initChat = async () => {
      try {
        setError(null);
        setLoading(true);

        await ChatService.initialize();
        ChatService.joinPrivateChat(chatId, user);

        unsubscribeMessage = ChatService.on(
          "newPrivateMessage",
          handleNewMessage,
        );
        unsubscribeTyping = ChatService.on("userPrivateTyping", handleTyping);
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
        unsubscribeMessagesRead = ChatService.on(
          "messagesRead",
          handleMessagesRead,
        );
        unsubscribeMessageDeleted = ChatService.on(
          "messageDeleted",
          handleMessageDeleted,
        );

        if (isComponentMounted) {
          await fetchMessages();
        }
      } catch (error) {
        console.error("❌ Erreur d'initialisation du chat:", error);
        if (isComponentMounted) {
          setError("Impossible de se connecter au chat");
          setLoading(false);
        }
      }
    };

    initChat();

    return () => {
      isComponentMounted = false;
      setActiveChatId(null);
      unsubscribeMessage?.();
      unsubscribeTyping?.();
      unsubscribeEdited?.();
      unsubscribeMessageDeleted?.();
      unsubscribeMessagesRead?.();
      unsubscribeReactionAdded?.();
      unsubscribeReactionRemoved?.();
      ChatService.leavePrivateChat(chatId);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [
    chatId,
    user,
    handleNewMessage,
    handleTyping,
    handleMessageEdited,
    handleReactionAdded,
    handleReactionRemoved,
    handleMessagesRead,
    handleMessageDeleted,
    setActiveChatId,
  ]);

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

  const handleMessagesRead = useCallback(
    (data) => {
      if (data.chatId !== chatId || data.readByUserId === user._id) return;
      setMessages((prev) =>
        prev.map((m) => (m.user._id === user._id ? { ...m, isRead: true } : m)),
      );
    },
    [chatId, user._id],
  );

  const handleMessageDeleted = useCallback(
    (data) => {
      if (data.chatId !== chatId) return;
      setMessages((prev) => prev.filter((m) => m._id !== data._id));
    },
    [chatId],
  );

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const data = await ChatService.getMessages(null, chatId);

      if (data.messages) {
        const sorted = data.messages.sort(
          (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
        );
        setMessages(sorted);
        setError(null);

        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: false });
        }, 100);
      }
    } catch (error) {
      console.error("❌ Erreur récupération messages:", error);
      setError("Impossible de charger les messages");
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    const messageText = input.trim();
    if (!messageText) return;

    // Cas édition
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
      ChatService.sendTyping(false, chatId);
      await ChatService.sendPrivateMessage(messageText, chatId, user, {
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
    ChatService.sendTyping(true, chatId);
  };

  const handleInputBlur = () => {
    setIsTyping(false);
    setFocused(false);
    ChatService.sendTyping(false, chatId);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  };

  const handleInputChange = (text) => {
    setInput(text);

    if (!isTyping) {
      setIsTyping(true);
      ChatService.sendTyping(true, chatId);
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
    return date.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
    });
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

      ChatService.socket.emit("sendPrivateMessage", {
        chatId,
        user: user,
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

  const lastTapRef = useRef({});

  const handleMessageTap = (messageId) => {
    const now = Date.now();
    const lastTap = lastTapRef.current[messageId] || 0;
    const DOUBLE_TAP_DELAY = 300;

    if (now - lastTap < DOUBLE_TAP_DELAY) {
      handleDoubleTap(messageId);
      lastTapRef.current[messageId] = 0;
    } else {
      lastTapRef.current[messageId] = now;
    }
  };

  const renderItem = ({ item, index }) => {
    if (item.type === "date") {
      return (
        <View style={[styles.dateSeparatorContainer]}>
          <View
            style={[
              styles.dateSeparatorPill,
              {
                backgroundColor: colors.border,
                borderColor: colors.border,
              },
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

    const lastMyMessageIndex = buildListData().reduce(
      (lastIndex, item, index) =>
        item.type !== "date" && item.senderId === currentUserId
          ? index
          : lastIndex,
      -1,
    );

    return (
      <Pressable
        style={[
          styles.messageWrapper,
          isMyMessage ? styles.myMessageWrapper : styles.otherMessageWrapper,
          {
            marginTop: item.isFirstOfGroup ? 10 : 2,
          },
        ]}
        onLongPress={() => openActionSheet(item)}
        onPress={() => handleMessageTap(item._id)}
      >
        {/* visualisation du message repli  */}
        <View style={{ alignItems: isMyMessage ? "flex-end" : "flex-start" }}>
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
                        uri: item.replyTo.thumbnailUrl || item.replyTo.fileUrl,
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
          <View
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
          </View>
          {}
        </View>

        {/* reaction */}
        {doubleTapMessageId === item._id ? (
          <Animated.View
            style={[
              styles.doubleTapHeart,
              { transform: [{ scale: heartScale }], opacity: heartScale },
            ]}
            pointerEvents="none"
          >
            <Text style={{ fontSize: 40 }}>❤️</Text>
          </Animated.View>
        ) : (
          (item.reactions?.length ?? 0) > 0 && (
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
                    onPress={() => {
                      ChatService.toggleReaction(item._id, user._id, emoji);
                    }}
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
          )
        )}
        {/* heure d'envoi du message  */}
        {item.isLastOfGroup && (
          <View style={styles.timestampRow}>
            <Text style={styles.timestamp}>{formatTime(item.createdAt)}</Text>
            {isMyMessage && lastMyMessageIndex === index && (
              <MaterialIcons
                name={item.isRead ? "done-all" : "check"}
                size={14}
                color={item.isRead ? colors.sendActive : colors.timestamp}
                style={{ marginLeft: 4 }}
              />
            )}
          </View>
        )}
      </Pressable>
    );

    // ---- Fonction interne pour choisir le rendu selon le type ----
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
                  {
                    borderWidth: 1,
                    borderColor: colors.border,
                  },
                ]}
                resizeMode="cover"
              />
            </Pressable>
          );

        // case "audio":
        //   return (
        //     <AudioMessageBubble
        //       fileUrl={item.fileUrl}
        //       duration={item.fileDuration}
        //       isMyMessage={isMyMessage}
        //       colors={colors}
        //     />
        //   );

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
                {!!item.fileSize && (
                  <Text
                    style={[styles.documentSize, { color: textColor + "99" }]}
                  >
                    {formatFileSize(item.fileSize)}
                  </Text>
                )}
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

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <View style={styles.centerContainer}>
          <Text style={[styles.errorText, { color: colors.danger }]}>
            {error}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={fetchMessages}
          >
            <Text style={[styles.retryButtonText, { color: colors.text }]}>
              Réessayer
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const openActionSheet = (message) => {
    const myReaction = message.reactions.find((r) => r.userId === user._id);

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
        // navigation.navigate("ForwardMessage", { message: selectedMessage });
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
            {
              backgroundColor: colors.card,
              borderBottomColor: colors.border,
            },
          ]}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              flex: 1,
            }}
          >
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
              hitSlop={10}
            >
              <Ionicons name="chevron-back" size={26} color={colors.text} />
            </TouchableOpacity>

            <View style={{ position: "relative" }}>
              <Image
                source={
                  otherUser.avatar
                    ? {
                        uri: otherUser.avatar,
                      }
                    : avatar
                }
                style={[
                  styles.avatar,
                  {
                    backgroundColor: colors.borderSecondary,
                    borderWidth: 2,
                    borderColor: colors.border,
                  },
                ]}
              />
              {otherUser.is_online && (
                <View
                  style={[styles.statusDot, { backgroundColor: colors.online }]}
                />
              )}
            </View>

            <View style={styles.headerCenter}>
              <Text
                style={[styles.title, { color: colors.text }]}
                numberOfLines={1}
              >
                {otherUser.name}
              </Text>

              <Text
                style={[
                  styles.subtitle,
                  otherUserTyping && styles.typingSubtitle,
                  {
                    color: otherUserTyping
                      ? colors.primary
                      : colors.textSecondary,
                  },
                ]}
              >
                {otherUserTyping
                  ? "en train d'écrire..."
                  : otherUser.is_online
                    ? "En ligne"
                    : `En ligne ${formatRelativeTime(otherUser.last_seen)}`}
              </Text>
            </View>
          </View>

          <View style={styles.statusDotContainer}></View>
        </View>

        {loading ? (
          <View style={styles.centerContainer}>
            <Text style={[styles.loadingText, { color: colors.text }]}>
              Chargement des messages...
            </Text>
          </View>
        ) : (
          <>
            <FlatList
              ref={flatListRef}
              data={buildListData()}
              keyExtractor={(item) =>
                item.type === "date" ? item.id : item._id.toString()
              }
              renderItem={renderItem}
              contentContainerStyle={styles.messagesList}
              onContentSizeChange={() => {
                setTimeout(
                  () => flatListRef.current?.scrollToEnd({ animated: true }),
                  100,
                );
              }}
              showsVerticalScrollIndicator={false}
              onRefresh={fetchMessages}
              refreshing={loading}
            />
          </>
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
                  : `Réponse à ${otherUser.name}`}
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
            {
              backgroundColor: colors.card,
              borderTopColor: colors.border,
            },
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
              {
                backgroundColor: "transparent",
                borderColor: colors.border,
              },
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
              input.trim()
                ? styles.sendButtonActive
                : styles.sendButtonInactive,
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

export default PrivateChatScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  flex: {
    flex: 1,
  },
  attachButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
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
  composerPreviewContent: {
    flex: 1,
  },
  composerPreviewTitle: {
    fontSize: 12,
    fontWeight: "600",
  },
  composerPreviewText: {
    fontSize: 13,
    marginTop: 1,
  },
  header: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  backButton: {
    width: 36,
    alignItems: "flex-start",
    justifyContent: "center",
  },

  headerCenter: {
    alignItems: "flex-start",
    justifyContent: "center",
  },

  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 8,
    borderWidth: 1,
  },

  title: {
    fontSize: 17,
    fontWeight: "600",
    textTransform: "capitalize",
  },

  subtitle: {
    fontSize: 12,
    marginTop: 1,
  },

  statusDotContainer: {
    width: 36,
    alignItems: "flex-end",
  },

  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    position: "absolute",
    right: 8,
    bottom: 0,
  },

  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },

  loadingText: {
    fontSize: 15,
  },

  errorText: {
    fontSize: 15,
    textAlign: "center",
    marginBottom: 20,
  },

  retryButton: {
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: 22,
  },

  retryButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },

  messagesList: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },

  dateSeparatorContainer: {
    alignItems: "center",
    marginVertical: 12,
  },

  dateSeparatorPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },

  dateSeparatorText: {
    fontSize: 12,
    fontWeight: "500",
  },

  messageWrapper: {
    maxWidth: "78%",
  },

  myMessageWrapper: {
    alignSelf: "flex-end",
    alignItems: "flex-end",
  },

  otherMessageWrapper: {
    alignSelf: "flex-start",
    alignItems: "flex-start",
  },

  messageBubble: {
    overflow: "hidden",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 18,
  },

  myMessage: {
    borderBottomRightRadius: 18,
  },

  otherMessage: {
    borderBottomLeftRadius: 18,
  },

  myMessageTail: {
    borderBottomRightRadius: 4,
  },

  otherMessageTail: {
    borderBottomLeftRadius: 4,
  },

  messageText: {
    fontSize: 15.5,
    lineHeight: 21,
  },

  timestampRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 3,
    marginHorizontal: 6,
  },

  timestamp: {
    fontSize: 11,
  },

  typingContainer: {
    paddingHorizontal: 12,
    paddingBottom: 4,
  },

  typingBubble: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  replyPreviewText: {
    fontSize: 12.5,
  },
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
  reactionEmoji: {
    fontSize: 13,
  },
  reactionCount: {
    fontSize: 11,
    fontWeight: "500",
  },
  typingText: {
    fontSize: 13,
    fontStyle: "italic",
  },

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
  messageImage: {
    marginTop: 1,
    width: 150,
    height: 200,
    borderRadius: 18,
  },
});
