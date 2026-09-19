import ChatService from "@/app/services/ChatService";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { KeyboardAwareView, useKeyboard } from "@/hooks/useKeyboard";
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SERVER_URL } from "../services/AuthService";

export default function ChatScreen() {
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const { isKeyboardVisible } = useKeyboard();
  const flatListRef = useRef(null);
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const typingTimeoutRef = useRef(null);
  const currentPage = useRef(1);

  useEffect(() => {
    initializeChat();

    return () => {
      ChatService.disconnect();
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const initializeChat = async () => {
    try {
      setIsLoading(true);

      const isServerHealthy = await ChatService.checkServerHealth();
      if (!isServerHealthy) {
        throw new Error("Serveur indisponible");
      }

      await ChatService.initialize(SERVER_URL);
      setIsConnected(ChatService.getConnectionStatus());

      setupSocketListeners();

      ChatService.joinRoom("general");

      await loadMessages();

      await loadOnlineUsers();
    } catch (error) {
      console.error("Erreur d'initialisation:", error);
      setIsLoading(false);
      Alert.alert(
        "Erreur de connexion",
        "Impossible de se connecter au serveur. Vérifiez votre connexion internet.",
        [
          { text: "Réessayer", onPress: initializeChat },
          { text: "Annuler", style: "cancel" },
        ],
      );
    }
  };

  const setupSocketListeners = () => {
    // Message reçu
    ChatService.on("message", (newMessage) => {
      setMessages((prevMessages) => [newMessage, ...prevMessages]);
      scrollToBottom();
    });

    // Utilisateur en train de taper
    ChatService.on("userTyping", (data) => {
      setTypingUsers((prevTyping) => {
        if (data.isTyping) {
          return [
            ...prevTyping.filter((user) => user._id !== data.user._id),
            data.user,
          ];
        } else {
          return prevTyping.filter((user) => user._id !== data.user._id);
        }
      });
    });

    // Utilisateur rejoint/quitte
    ChatService.on("userJoined", (user) => {
      setOnlineUsers((prevUsers) => [...prevUsers, user]);
    });

    ChatService.on("userLeft", (userId) => {
      setOnlineUsers((prevUsers) =>
        prevUsers.filter((user) => user._id !== userId),
      );
    });

    // Événements de connexion
    ChatService.on("connect", () => {
      setIsConnected(true);
    });

    ChatService.on("disconnect", () => {
      setIsConnected(false);
    });

    ChatService.on("connect_error", (error) => {
      console.error("Erreur de connexion socket:", error);
      setIsConnected(false);
    });
  };

  const loadMessages = async (page = 1, append = false) => {
    try {
      if (!append) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }

      const response = await ChatService.getMessages("general", page, 20);

      if (response && response.messages) {
        if (append) {
          setMessages((prevMessages) => [
            ...prevMessages,
            ...response.messages,
          ]);
        } else {
          setMessages(response.messages);
        }

        setHasMoreMessages(response.hasMore || false);
        currentPage.current = page;
      }
    } catch (error) {
      console.error("Erreur lors du chargement des messages:", error);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
      setIsRefreshing(false);
    }
  };

  const loadOnlineUsers = async () => {
    try {
      const users = await ChatService.getOnlineUsers();
      setOnlineUsers(users || []);
    } catch (error) {
      console.error("Erreur lors du chargement des utilisateurs:", error);
    }
  };

  const handleSendMessage = useCallback(() => {
    if (!message.trim() || !isConnected) return;

    try {
      ChatService.sendMessage(message);
      setMessage("");

      // Arrêter l'indicateur de frappe
      ChatService.setTyping(false);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    } catch (error) {
      console.error("Erreur lors de l'envoi:", error);
      Alert.alert("Erreur", "Impossible d'envoyer le message");
    }
  }, [message, isConnected]);

  const handleMessageChange = useCallback(
    (text) => {
      setMessage(text);

      if (!isConnected) return;

      // Indiquer que l'utilisateur tape
      ChatService.setTyping(true);

      // Arrêter l'indicateur après 3 secondes d'inactivité
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        ChatService.setTyping(false);
      }, 3000);
    },
    [isConnected],
  );

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    currentPage.current = 1;
    loadMessages(1, false);
  }, []);

  const handleLoadMore = useCallback(() => {
    if (hasMoreMessages && !isLoadingMore) {
      const nextPage = currentPage.current + 1;
      loadMessages(nextPage, true);
    }
  }, [hasMoreMessages, isLoadingMore]);

  const scrollToBottom = () => {
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToIndex({ index: 0, animated: true });
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderMessage = ({ item }) => {
    const isOwnMessage = item.user._id === ChatService.getCurrentUser()?._id;

    return (
      <View
        style={[
          styles.messageContainer,
          isOwnMessage ? styles.ownMessage : styles.otherMessage,
        ]}
      >
        {!isOwnMessage && (
          <Text style={[styles.userName, { color: theme.text }]}>
            {item.user.name}
          </Text>
        )}
        <View
          style={[
            styles.messageBubble,
            {
              backgroundColor: isOwnMessage ? theme.tint : theme.tabIconDefault,
            },
          ]}
        >
          <Text
            style={[
              styles.messageText,
              { color: isOwnMessage ? "#fff" : theme.text },
            ]}
          >
            {item.text}
          </Text>
        </View>
        <Text style={[styles.messageTime, { color: theme.tabIconDefault }]}>
          {formatTime(item.createdAt)}
        </Text>
      </View>
    );
  };

  const renderTypingIndicator = () => {
    if (typingUsers.length === 0) return null;

    return (
      <View style={styles.typingContainer}>
        <Text style={[styles.typingText, { color: theme.tabIconDefault }]}>
          {typingUsers.map((user) => user.name).join(", ")}
          {typingUsers.length === 1
            ? " est en train d'écrire..."
            : " sont en train d'écrire..."}
        </Text>
      </View>
    );
  };

  const renderHeader = () => (
    <View style={[styles.header, { backgroundColor: theme.background }]}>
      <View style={styles.headerContent}>
        <View style={styles.connectionStatus}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: isConnected ? "#34C759" : "#FF3B30" },
            ]}
          />
          <Text style={[styles.statusText, { color: theme.text }]}>
            {isConnected ? "Connecté" : "Déconnecté"}
          </Text>
        </View>
        <Text style={[styles.onlineCount, { color: theme.tabIconDefault }]}>
          {onlineUsers.length} en ligne
        </Text>
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.background }]}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.tint} />
          <Text style={[styles.loadingText, { color: theme.text }]}>
            Connexion au chat...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      {renderHeader()}

      <KeyboardAwareView style={styles.chatContainer}>
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item, index) => item._id || index.toString()}
          renderItem={renderMessage}
          inverted
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={theme.tint}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.1}
          ListFooterComponent={
            isLoadingMore ? (
              <ActivityIndicator
                size="small"
                color={theme.tint}
                style={styles.loadMoreIndicator}
              />
            ) : null
          }
        />

        {renderTypingIndicator()}

        <View
          style={[styles.inputContainer, { backgroundColor: theme.background }]}
        >
          <TextInput
            style={[
              styles.textInput,
              {
                backgroundColor: theme.tabIconDefault + "20",
                color: theme.text,
                borderColor: theme.tabIconDefault + "40",
              },
            ]}
            value={message}
            onChangeText={handleMessageChange}
            placeholder="Tapez votre message..."
            placeholderTextColor={theme.tabIconDefault}
            multiline
            maxLength={500}
            editable={isConnected}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              {
                backgroundColor:
                  isConnected && message.trim()
                    ? theme.tint
                    : theme.tabIconDefault,
              },
            ]}
            onPress={handleSendMessage}
            disabled={!isConnected || !message.trim()}
          >
            <Ionicons name="send" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAwareView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E7",
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  connectionStatus: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: "600",
  },
  onlineCount: {
    fontSize: 14,
  },
  chatContainer: {
    flex: 1,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  messageContainer: {
    marginBottom: 16,
  },
  ownMessage: {
    alignItems: "flex-end",
  },
  otherMessage: {
    alignItems: "flex-start",
  },
  userName: {
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 4,
    marginLeft: 12,
  },
  messageBubble: {
    maxWidth: "80%",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
    marginHorizontal: 12,
  },
  typingContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  typingText: {
    fontSize: 14,
    fontStyle: "italic",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E5E7",
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 12,
    fontSize: 16,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  loadMoreIndicator: {
    paddingVertical: 20,
  },
});
