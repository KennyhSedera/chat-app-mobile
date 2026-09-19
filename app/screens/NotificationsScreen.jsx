import avatar from "@/assets/images/pdp.jpg";
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useState } from "react";
import {
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useChat } from "../contexts/ChatContext";
import { useNotifications } from "../contexts/NotificationContext";
import { useAppColors } from "../hooks/colors";
import { formatRelativeTime } from "../utils/dateUtils";

// Icône + couleur selon le type de notification
function getNotificationIcon(type, colors) {
  switch (type) {
    case "new_message":
      return { name: "chatbubble", color: colors.text };
    case "message_sent":
      return { name: "checkmark-circle", color: colors.success };
    case "friend_request":
      return { name: "person-add", color: colors.tint };
    case "budget_alert":
      return { name: "wallet", color: colors.danger };
    case "system":
      return { name: "information-circle", color: colors.tint };
    default:
      return { name: "notifications", color: colors.tint };
  }
}

function NotificationItem({
  notification,
  colors,
  onPress,
  onDelete,
  markChatAsRead,
}) {
  const icon = getNotificationIcon(notification.type, colors);
  return (
    <TouchableOpacity
      style={[
        styles.item,
        {
          backgroundColor: notification.isRead
            ? colors.background
            : colors.card,
          borderColor: colors.border,
        },
        !notification.isRead && {
          borderLeftWidth: 3,
          borderLeftColor: colors.tint,
        },
      ]}
      onPress={() => {
        onPress(notification);
        if (notification.type === "new_message") {
          markChatAsRead(notification.data.chatId);
        }
      }}
      activeOpacity={0.7}
    >
      <View style={[styles.iconWrap, { backgroundColor: icon.color }]}>
        <Image source={avatar} style={styles.avatar} />
        <Ionicons
          name={icon.name}
          size={20}
          color={icon.color}
          style={styles.icon}
        />
      </View>

      <View style={styles.itemContent}>
        <View style={styles.itemHeader}>
          <Text
            style={[
              styles.itemTitle,
              { color: colors.text },
              !notification.isRead && styles.itemTitleUnread,
            ]}
            numberOfLines={1}
          >
            {notification.title || "Notification"}
          </Text>
          {!notification.isRead && (
            <View style={[styles.dot, { backgroundColor: colors.danger }]} />
          )}
        </View>

        {!!notification.body && (
          <Text
            style={[styles.itemBody, { color: colors.textSecondary }]}
            numberOfLines={2}
          >
            {notification.body}
          </Text>
        )}

        <Text style={[styles.itemTime, { color: colors.textSecondary }]}>
          {formatRelativeTime(notification.createdAt)}
        </Text>
      </View>

      <TouchableOpacity
        style={styles.deleteBtn}
        onPress={() => onDelete(notification._id)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="close" size={18} color={colors.textSecondary} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

function EmptyState({ colors }) {
  return (
    <View style={styles.emptyContainer}>
      <View
        style={[styles.emptyIconWrap, { backgroundColor: colors.tint + "15" }]}
      >
        <Ionicons
          name="notifications-off-outline"
          size={48}
          color={colors.tint}
        />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>
        Aucune notification
      </Text>
      <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
        Vous serez notifié ici des nouveaux messages et événements importants.
      </Text>
    </View>
  );
}

const NotificationsScreen = () => {
  const { colors } = useAppColors();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    removeNotification,
    handleNotificationPress,
  } = useNotifications();

  const [refreshing, setRefreshing] = useState(false);
  const { markChatAsRead } = useChat();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    setRefreshing(false);
  }, []);

  return (
    <View style={[styles.container]}>
      <View
        style={[
          styles.header,
          { borderBottomColor: colors.border, backgroundColor: colors.card },
        ]}
      >
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Notifications
        </Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllAsRead}>
            <Text style={[styles.markAllText, { color: colors.tint }]}>
              Tout marquer comme lu
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item, index) => `${String(item._id)}_${index}`}
        contentContainerStyle={
          notifications.length === 0
            ? styles.emptyListContent
            : styles.listContent
        }
        renderItem={({ item }) => (
          <NotificationItem
            notification={item}
            colors={colors}
            onPress={handleNotificationPress}
            onDelete={removeNotification}
            markChatAsRead={markChatAsRead}
          />
        )}
        ListEmptyComponent={<EmptyState colors={colors} />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.tint}
            colors={[colors.tint]}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

export default NotificationsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
  },
  markAllText: {
    fontSize: 13,
    fontWeight: "600",
  },
  listContent: {
    padding: 12,
    paddingBottom: 100,
  },
  emptyListContent: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  item: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 12,
    borderRadius: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    position: "relative",
  },
  itemContent: {
    flex: 1,
  },
  itemHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: "500",
    flexShrink: 1,
  },
  itemTitleUnread: {
    fontWeight: "700",
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginLeft: 6,
  },
  itemBody: {
    fontSize: 13,
    marginTop: 2,
    lineHeight: 18,
  },
  itemTime: {
    fontSize: 11,
    marginTop: 6,
  },
  deleteBtn: {
    padding: 4,
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  emptyIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 20,
  },
  icon: {
    position: "absolute",
    bottom: -4,
    right: -4,
  },
});
