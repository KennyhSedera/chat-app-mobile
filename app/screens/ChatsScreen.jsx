import avatar from "@/assets/images/pdp.jpg";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import AppModal from "../components/AppModal";
import { useAuth } from "../contexts/AuthContext";
import { useChat } from "../contexts/ChatContext";
import { useAppColors } from "../hooks/colors";
import ChatService from "../services/ChatService";

const ChatsScreen = () => {
  const { user } = useAuth();
  const [showUserModal, setShowUserModal] = useState(false);
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [showInvitesModal, setShowInvitesModal] = useState(false);
  const navigation = useNavigation();
  const isMountedRef = useRef(true);
  const {
    conversations,
    loading,
    pendingInvites,
    fetchChats,
    fetchRooms,
    fetchPendingInvites,
    markChatAsRead,
    markRoomAsRead,
    addNewChat,
    createRoom,
    acceptRoomInvite,
    declineRoomInvite,
  } = useChat();
  const { colors } = useAppColors();
  const [allUsers, setAllUsers] = useState([]);
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  // état formulaire nouveau salon
  const [roomName, setRoomName] = useState("");
  const [roomDescription, setRoomDescription] = useState("");
  const [roomIsPrivate, setRoomIsPrivate] = useState(true);
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  const [creatingRoom, setCreatingRoom] = useState(false);

  const fetchUsers = useCallback(async () => {
    if (!user?._id) return;
    try {
      const data = await ChatService.getUsers();
      if (data.success) {
        const otherUsers = data.users.filter((u) => u._id !== user._id);
        if (isMountedRef.current) {
          setAllUsers(otherUsers);
          setUsers(otherUsers);
        }
      }
    } catch (err) {
      console.error("❌ Erreur de récupération des utilisateurs:", err);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      isMountedRef.current = true;
      if (user?._id) {
        fetchChats();
        fetchRooms();
        fetchPendingInvites();
        fetchUsers();
      }
      return () => {
        isMountedRef.current = false;
      };
    }, [user, fetchChats, fetchRooms, fetchPendingInvites, fetchUsers]),
  );

  useEffect(() => {
    if (searchQuery.length > 0) {
      const query = searchQuery.toLowerCase();
      setUsers(
        allUsers.filter(
          (u) =>
            u.name.toLowerCase().includes(query) ||
            u.email.toLowerCase().includes(query),
        ),
      );
    } else {
      setUsers(allUsers);
    }
  }, [searchQuery, allUsers]);

  const handleNewMessagePress = async () => {
    if (allUsers.length === 0) await fetchUsers();
    setShowUserModal(true);
  };

  const handleNewRoomPress = async () => {
    if (allUsers.length === 0) await fetchUsers();
    setRoomName("");
    setRoomDescription("");
    setRoomIsPrivate(true);
    setSelectedMemberIds([]);
    setShowRoomModal(true);
  };

  const startNewChat = async (selectedUser) => {
    setShowUserModal(false);

    try {
      const existingChat = conversations.find(
        (c) => c.type === "private" && c.otherUser._id === selectedUser._id,
      );

      if (existingChat) {
        navigation.navigate("PrivateChat", {
          chatId: existingChat.chatId,
          userId: existingChat.otherUser._id,
        });
      } else {
        const newChat = await ChatService.createChat(
          user._id,
          selectedUser._id,
        );
        addNewChat(newChat);
        navigation.navigate("PrivateChat", {
          chatId: newChat.chatId,
          userId: selectedUser._id,
        });
        fetchChats();
      }
    } catch (err) {
      console.error("❌ Erreur lors de la création du chat:", err);
    }
  };

  const toggleMemberSelection = (userId) => {
    setSelectedMemberIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  };

  const handleCreateRoom = async () => {
    if (!roomName.trim()) return;
    setCreatingRoom(true);
    try {
      const room = await createRoom({
        name: roomName.trim(),
        description: roomDescription.trim() || undefined,
        isPrivate: roomIsPrivate,
        memberIds: selectedMemberIds,
      });
      setShowRoomModal(false);
      navigation.navigate("RoomChat", { roomId: room.roomId });
    } catch (err) {
      console.error("❌ Erreur création room:", err);
    } finally {
      setCreatingRoom(false);
    }
  };

  const handleConversationPress = async (conv) => {
    if (conv.type === "private") {
      await markChatAsRead(conv.chatId);
      navigation.navigate("PrivateChat", {
        chatId: conv.chatId,
        userId: conv.otherUser._id,
      });
    } else {
      await markRoomAsRead(conv.roomId);
      navigation.navigate("RoomChat", { roomId: conv.roomId });
    }
  };

  const renderConversationItem = ({ item }) => {
    if (item.type === "private") {
      const isMyMessage = item.lastMessage?.senderId === user._id;
      return (
        <TouchableOpacity
          style={[
            styles.chatItem,
            {
              borderBottomColor: colors.border,
              backgroundColor: `${colors.card}a0`,
            },
          ]}
          onPress={() => handleConversationPress(item)}
        >
          <View style={styles.userStatus}>
            <Image
              source={
                item.otherUser.avatar ? { uri: item.otherUser.avatar } : avatar
              }
              style={styles.avatar}
            />
            {item.otherUser.is_online && (
              <View
                style={[
                  styles.onlineIndicator,
                  { backgroundColor: colors.online },
                ]}
              />
            )}
          </View>

          <View style={styles.chatInfo}>
            <Text style={[styles.name, { color: colors.text }]}>
              {item.otherUser.name}
            </Text>
            <View style={styles.lastMessageContainer}>
              {item.unreadCount > 0 && (
                <View
                  style={[
                    styles.unreadBadge,
                    { backgroundColor: colors.danger },
                  ]}
                >
                  <Text style={[styles.unreadCount, { color: colors.text }]}>
                    {item.unreadCount > 99 ? "99+" : item.unreadCount}
                  </Text>
                </View>
              )}
              <Text
                numberOfLines={1}
                style={[
                  styles.lastMessage,
                  item.unreadCount > 0 && styles.unreadLastMessage,
                  { color: colors.text },
                ]}
              >
                {item.lastMessage
                  ? (() => {
                      const prefixText = isMyMessage ? "Vous: " : "";
                      switch (item.lastMessage.contentType) {
                        case "text":
                          return `${prefixText}${item.lastMessage.content}`;
                        case "image":
                          return `${prefixText}📷 Photo`;
                        case "audio":
                          return `${prefixText}🎤 Message vocal`;
                        case "video":
                          return `${prefixText}🎥 Vidéo`;
                        case "document":
                          return `${prefixText}📄 Document`;
                        default:
                          return `${prefixText}Fichier`;
                      }
                    })()
                  : "Pas de messages"}
              </Text>
            </View>
          </View>

          <View style={styles.chevronContainer}>
            {isMyMessage && item.lastMessage ? (
              <Ionicons
                name={item.lastMessage.is_read ? "checkmark-done" : "checkmark"}
                size={16}
                color={
                  item.lastMessage.is_read
                    ? colors.primary
                    : colors.textSecondary
                }
              />
            ) : null}
          </View>
        </TouchableOpacity>
      );
    }

    // Room
    const isMyMessage = item.lastMessage?.senderId === user._id;
    return (
      <TouchableOpacity
        style={[
          styles.chatItem,
          {
            borderBottomColor: colors.border,
            backgroundColor: `${colors.card}a0`,
          },
        ]}
        onPress={() => handleConversationPress(item)}
      >
        <View style={styles.userStatus}>
          {item.avatar ? (
            <Image source={{ uri: item.avatar }} style={styles.avatar} />
          ) : (
            <View
              style={[
                styles.avatar,
                styles.roomAvatarFallback,
                { backgroundColor: "#5B8DEF" },
              ]}
            >
              <Ionicons name="people" size={22} color="#fff" />
            </View>
          )}
          {item.isPrivate && (
            <View
              style={[
                styles.lockBadgeSmall,
                { backgroundColor: colors.border },
              ]}
            >
              <Text style={{ fontSize: 8 }}>🔒</Text>
            </View>
          )}
        </View>

        <View style={styles.chatInfo}>
          <Text style={[styles.name, { color: colors.text }]}>{item.name}</Text>
          <View style={styles.lastMessageContainer}>
            {item.unreadCount > 0 && (
              <View
                style={[styles.unreadBadge, { backgroundColor: colors.danger }]}
              >
                <Text style={[styles.unreadCount, { color: colors.text }]}>
                  {item.unreadCount > 99 ? "99+" : item.unreadCount}
                </Text>
              </View>
            )}
            <Text
              numberOfLines={1}
              style={[
                styles.lastMessage,
                item.unreadCount > 0 && styles.unreadLastMessage,
                { color: colors.text },
              ]}
            >
              {item.lastMessage
                ? (() => {
                    const prefix = isMyMessage
                      ? "Vous: "
                      : item.lastMessage.senderName
                        ? `${item.lastMessage.senderName}: `
                        : "";
                    switch (item.lastMessage.contentType) {
                      case "text":
                        return `${prefix}${item.lastMessage.content}`;
                      case "image":
                        return `${prefix}📷 Photo`;
                      case "audio":
                        return `${prefix}🎤 Message vocal`;
                      case "video":
                        return `${prefix}🎥 Vidéo`;
                      case "document":
                        return `${prefix}📄 Document`;
                      default:
                        return `${prefix}Fichier`;
                    }
                  })()
                : "Pas de messages"}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderUserItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.userItem, { backgroundColor: `${colors.background}30` }]}
      onPress={() => startNewChat(item)}
    >
      <View style={styles.userStatus}>
        <Image
          source={item.avatar ? { uri: item.avatar } : avatar}
          style={styles.userAvatar}
        />
        {item.is_online && (
          <View
            style={[styles.onlineIndicator, { backgroundColor: colors.online }]}
          />
        )}
      </View>
      <View style={styles.userInfo}>
        <Text style={[styles.userName, { color: colors.text }]}>
          {item.name}
        </Text>
        <Text style={[styles.userEmail, { color: colors.textSecondary }]}>
          {item.email}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
    </TouchableOpacity>
  );

  const renderSelectableUserItem = ({ item }) => {
    const selected = selectedMemberIds.includes(item._id);
    return (
      <TouchableOpacity
        style={[
          styles.userItem,
          { backgroundColor: selected ? colors.border + "40" : "transparent" },
        ]}
        onPress={() => toggleMemberSelection(item._id)}
      >
        <Image
          source={item.avatar ? { uri: item.avatar } : avatar}
          style={styles.userAvatar}
        />
        <View style={styles.userInfo}>
          <Text style={[styles.userName, { color: colors.text }]}>
            {item.name}
          </Text>
        </View>
        {selected && (
          <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
        )}
      </TouchableOpacity>
    );
  };

  if (loading && conversations.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.newMessageButtonsContainer]}>
        {pendingInvites.length > 0 && (
          <TouchableOpacity
            style={[
              styles.fabButton,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderWidth: 1,
              },
            ]}
            onPress={() => setShowInvitesModal(true)}
          >
            <Ionicons
              name="mail-unread-outline"
              size={22}
              color={colors.text}
            />
            <View
              style={[styles.invitesBadge, { backgroundColor: colors.danger }]}
            >
              <Text style={styles.invitesBadgeText}>
                {pendingInvites.length}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[
            styles.fabButton,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderWidth: 1,
            },
          ]}
          onPress={handleNewRoomPress}
        >
          <Ionicons name="people-outline" size={22} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.newMessageButton, { backgroundColor: colors.primary }]}
          onPress={handleNewMessagePress}
          activeOpacity={0.8}
        >
          <Text
            style={[styles.newMessageButtonText, { color: colors.textMine }]}
          >
            +
          </Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Ionicons
            name="chevron-back"
            size={20}
            color={colors.text}
            onPress={() => navigation.goBack()}
            style={{ marginRight: 10 }}
          />
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Conversations
          </Text>
        </View>
      </View>

      {conversations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.text }]}>
            💬 Aucune conversation
          </Text>
          <Text style={[styles.emptySubText, { color: colors.text }]}>
            Démarrez une discussion ou créez un salon
          </Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) =>
            item.type === "private" ? item.chatId : item.roomId
          }
          renderItem={renderConversationItem}
          showsVerticalScrollIndicator={false}
          refreshing={loading}
          onRefresh={() => {
            fetchChats();
            fetchRooms();
            fetchPendingInvites();
          }}
        />
      )}

      {/* Modale nouveau message */}
      <AppModal
        visible={showUserModal}
        onClose={() => setShowUserModal(false)}
        colors={colors}
        position="bottom"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Nouveau message
            </Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowUserModal(false)}
            >
              <Text style={[styles.closeButtonText, { color: colors.danger }]}>
                ✕
              </Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={[
              styles.searchInput,
              {
                backgroundColor: `${colors.background}30`,
                borderColor: colors.border,
              },
            ]}
            placeholder="Rechercher une personne ..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <FlatList
            data={users}
            keyExtractor={(item, index) => item._id || index.toString()}
            renderItem={renderUserItem}
            showsVerticalScrollIndicator={false}
            style={styles.usersList}
          />
        </View>
      </AppModal>

      {/* Modale nouveau salon */}
      <AppModal
        visible={showRoomModal}
        onClose={() => setShowRoomModal(false)}
        colors={colors}
        position="bottom"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Nouveau salon
            </Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowRoomModal(false)}
            >
              <Text style={[styles.closeButtonText, { color: colors.danger }]}>
                ✕
              </Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={[
              styles.searchInput,
              {
                backgroundColor: `${colors.background}30`,
                borderColor: colors.border,
                marginBottom: 8,
              },
            ]}
            placeholder="Nom du salon"
            placeholderTextColor={colors.textSecondary}
            value={roomName}
            onChangeText={setRoomName}
          />
          <TextInput
            style={[
              styles.searchInput,
              {
                backgroundColor: `${colors.background}30`,
                borderColor: colors.border,
                marginBottom: 8,
              },
            ]}
            placeholder="Description (optionnel)"
            placeholderTextColor={colors.textSecondary}
            value={roomDescription}
            onChangeText={setRoomDescription}
          />

          <View
            style={[
              styles.privateRow,
              { backgroundColor: colors.border + "30" },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={{ color: colors.text, fontWeight: "600", fontSize: 13 }}
              >
                Salon privé
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 11 }}>
                Seuls les membres invités peuvent le voir
              </Text>
            </View>
            <Switch value={roomIsPrivate} onValueChange={setRoomIsPrivate} />
          </View>

          <Text
            style={{
              color: colors.textSecondary,
              fontSize: 12,
              marginVertical: 8,
            }}
          >
            Inviter des membres ({selectedMemberIds.length} sélectionné
            {selectedMemberIds.length > 1 ? "s" : ""})
          </Text>

          <FlatList
            data={users}
            keyExtractor={(item, index) => item._id || index.toString()}
            renderItem={renderSelectableUserItem}
            showsVerticalScrollIndicator={false}
            style={{ maxHeight: 220 }}
          />

          <TouchableOpacity
            style={[
              styles.createRoomButton,
              {
                backgroundColor: colors.primary,
                opacity: !roomName.trim() || creatingRoom ? 0.4 : 1,
              },
            ]}
            onPress={handleCreateRoom}
            disabled={!roomName.trim() || creatingRoom}
          >
            <Text style={{ color: colors.textMine, fontWeight: "600" }}>
              {creatingRoom ? "Création..." : "Créer le salon"}
            </Text>
          </TouchableOpacity>
        </View>
      </AppModal>

      {/* Modale invitations */}
      <AppModal
        visible={showInvitesModal}
        onClose={() => setShowInvitesModal(false)}
        colors={colors}
        position="bottom"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Invitations
            </Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowInvitesModal(false)}
            >
              <Text style={[styles.closeButtonText, { color: colors.danger }]}>
                ✕
              </Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={pendingInvites}
            keyExtractor={(item) => item.roomId}
            renderItem={({ item }) => (
              <View
                style={[
                  styles.inviteCard,
                  { backgroundColor: colors.border + "30" },
                ]}
              >
                <Text
                  style={{
                    color: colors.text,
                    fontWeight: "600",
                    fontSize: 14,
                  }}
                >
                  {item.name}
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                  Invité par {item.invitedByName}
                </Text>
                <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                  <TouchableOpacity
                    style={[
                      styles.inviteActionButton,
                      { backgroundColor: colors.primary },
                    ]}
                    onPress={() => acceptRoomInvite(item.roomId)}
                  >
                    <Text
                      style={{
                        color: colors.textMine,
                        fontSize: 13,
                        fontWeight: "600",
                      }}
                    >
                      Accepter
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.inviteActionButton,
                      { backgroundColor: colors.border },
                    ]}
                    onPress={() => declineRoomInvite(item.roomId)}
                  >
                    <Text style={{ color: colors.text, fontSize: 13 }}>
                      Refuser
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            ListEmptyComponent={
              <Text
                style={{
                  textAlign: "center",
                  color: colors.textSecondary,
                  padding: 20,
                }}
              >
                Aucune invitation
              </Text>
            }
          />
        </View>
      </AppModal>
    </View>
  );
};

export default ChatsScreen;

const styles = StyleSheet.create({
  container: { flex: 1, paddingBottom: 80, position: "relative" },
  searchInput: {
    padding: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginVertical: 8,
    marginHorizontal: 8,
    borderWidth: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  headerTitle: { fontSize: 24, fontWeight: "bold" },
  lastMessageContainer: { flexDirection: "row", alignItems: "center" },
  newMessageButtonsContainer: {
    position: "absolute",
    right: 20,
    bottom: 80,
    alignItems: "center",
    gap: 10,
    zIndex: 100,
  },
  fabButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: "center",
    alignItems: "center",
  },
  invitesBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  invitesBadgeText: { color: "#fff", fontSize: 9, fontWeight: "700" },
  newMessageButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
  },
  newMessageButtonText: { fontSize: 32, fontWeight: "300", lineHeight: 36 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 10, fontSize: 16 },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyText: { fontSize: 18, textAlign: "center", marginBottom: 8 },
  emptySubText: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 16,
  },
  chatItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginHorizontal: 2,
    marginTop: 1,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
    borderWidth: 1,
    borderColor: "gray",
  },
  roomAvatarFallback: { alignItems: "center", justifyContent: "center" },
  lockBadgeSmall: {
    position: "absolute",
    bottom: 0,
    right: 8,
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  chatInfo: { flex: 1, marginRight: 10 },
  name: {
    fontSize: 18,
    fontWeight: "600",
    textTransform: "capitalize",
    flex: 1,
    marginBottom: 4,
  },
  unreadBadge: {
    borderRadius: 12,
    width: 16,
    height: 16,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
    marginRight: 6,
  },
  unreadCount: { fontSize: 10, fontWeight: "600" },
  lastMessage: { fontSize: 14, marginBottom: 2 },
  unreadLastMessage: { fontWeight: "500" },
  chevronContainer: { paddingLeft: 8 },
  modalContainer: { flex: 1, paddingHorizontal: 4 },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  modalTitle: { fontSize: 22, fontWeight: "500" },
  closeButton: { padding: 8, borderRadius: 20 },
  closeButtonText: { fontSize: 18, fontWeight: "bold" },
  usersList: { flex: 1 },
  userItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginHorizontal: 2,
    marginTop: 1,
  },
  userAvatar: { width: 45, height: 45, borderRadius: 22.5, marginRight: 12 },
  userInfo: { flex: 1 },
  userName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
    textTransform: "capitalize",
  },
  userEmail: { fontSize: 13 },
  onlineIndicator: {
    width: 14,
    height: 14,
    borderRadius: 7,
    position: "absolute",
    bottom: 2,
    right: 8,
  },
  userStatus: { position: "relative" },
  privateRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
    marginHorizontal: 8,
  },
  createRoomButton: {
    marginHorizontal: 8,
    marginTop: 12,
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  inviteCard: {
    padding: 12,
    borderRadius: 10,
    marginHorizontal: 8,
    marginBottom: 8,
  },
  inviteActionButton: {
    flex: 1,
    padding: 8,
    borderRadius: 8,
    alignItems: "center",
  },
});
