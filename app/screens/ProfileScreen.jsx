import avatar from "@/assets/images/pdp.jpg";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  ToastAndroid,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../contexts/AuthContext";
import { useChat } from "../contexts/ChatContext";
import { useAppColors } from "../hooks/colors";
import UploadService from "../services/UploadService";

export default function ProfileScreen() {
  const { user, logout, updateAvatar } = useAuth();
  const { chats, rooms } = useChat();
  const { colors, isDark } = useAppColors();

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem("chatUser");
      await AsyncStorage.removeItem("userCredentials");
      logout();
    } catch (error) {
      console.error("Erreur de déconnexion:", error);
    }
  };

  const getAvatarSource = () => {
    if (user?.avatar) return { uri: user.avatar };
    return avatar;
  };

  const handlePickImage = async () => {
    const image = await UploadService.pickImage();
    if (!image) return;

    try {
      const uploaded = await UploadService.uploadFile(image, "image");
      const res = await updateAvatar(user._id, uploaded.fileUrl);
      if (res.success) {
        ToastAndroid.show("Avatar mis à jour", ToastAndroid.SHORT);
      }
    } catch (error) {
      console.error("Erreur envoi image:", error);
    }
  };

  const settingsGroups = [
    {
      title: "Compte",
      items: [
        {
          icon: "person-outline",
          color: "#5B8DEF",
          title: "Modifier le profil",
          subtitle: "Nom, photo, statut",
        },
        {
          icon: "key-outline",
          color: "#F5A623",
          title: "Sécurité",
          subtitle: "Mot de passe, connexions",
        },
      ],
    },
    {
      title: "Préférences",
      items: [
        {
          icon: "chatbubbles-outline",
          color: "#3ECF8E",
          title: "Chats",
          subtitle: "Thème, fond d'écran",
        },
        {
          icon: "notifications-outline",
          color: "#E24B6B",
          title: "Notifications",
          subtitle: "Sons, alertes",
        },
        {
          icon: "shield-checkmark-outline",
          color: "#9B6BE0",
          title: "Confidentialité",
          subtitle: "Blocage, statut en ligne",
        },
      ],
    },
    {
      title: "Support",
      items: [
        {
          icon: "help-circle-outline",
          color: "#5B6270",
          title: "Aide",
          subtitle: "Centre d'aide, contact",
        },
      ],
    },
  ];

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Hero avec dégradé */}
        <LinearGradient
          colors={isDark ? ["#123024", "#0A0C10"] : ["#3ECF8E", "#1B8F5F"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.heroTopRow}>
            <Text style={styles.heroLabel}>Mon profil</Text>
            <TouchableOpacity style={styles.heroIconButton}>
              <Ionicons name="settings-outline" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Carte avatar qui chevauche le hero */}
        <View style={styles.avatarCardWrapper}>
          <View style={[styles.avatarRing, { borderColor: colors.background }]}>
            <Image
              source={getAvatarSource()}
              style={styles.avatar}
              defaultSource={avatar}
            />
            <View
              style={[
                styles.onlineDot,
                {
                  backgroundColor: user?.is_online ? "#3ECF8E" : colors.border,
                  borderColor: colors.background,
                },
              ]}
            />
          </View>
          <TouchableOpacity
            onPress={handlePickImage}
            style={[
              styles.editBadge,
              {
                backgroundColor: colors.primary,
                borderColor: colors.background,
              },
            ]}
          >
            <Ionicons name="camera" size={14} color="#04342C" />
          </TouchableOpacity>
        </View>

        <View style={styles.nameSection}>
          <Text style={[styles.userName, { color: colors.text }]}>
            {user?.name || "Utilisateur"}
          </Text>
          <Text style={[styles.userEmail, { color: colors.textSecondary }]}>
            {user?.email}
          </Text>
        </View>

        {/* Stats en pastilles */}
        <View style={styles.statsRow}>
          <View
            style={[
              styles.statCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.statValue, { color: colors.text }]}>
              {chats?.length ?? 0}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Discussions
            </Text>
          </View>
          <View
            style={[
              styles.statCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.statValue, { color: colors.text }]}>
              {rooms?.length ?? 0}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Salons
            </Text>
          </View>
          <View
            style={[
              styles.statCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.statValue, { color: colors.text }]}>
              {user?.created_at
                ? new Date(user.created_at).toLocaleDateString("fr-FR", {
                    month: "short",
                    year: "2-digit",
                  })
                : "—"}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Membre depuis
            </Text>
          </View>
        </View>

        {/* Groupes de paramètres */}
        {settingsGroups.map((group, gIndex) => (
          <View key={gIndex} style={styles.groupSection}>
            <Text style={[styles.groupLabel, { color: colors.textSecondary }]}>
              {group.title}
            </Text>
            <View
              style={[
                styles.groupCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              {group.items.map((option, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.optionItem,
                    index !== group.items.length - 1 && {
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      borderBottomColor: colors.border,
                    },
                  ]}
                  activeOpacity={0.6}
                >
                  <View style={styles.optionLeft}>
                    <View
                      style={[
                        styles.iconContainer,
                        { backgroundColor: option.color + "22" },
                      ]}
                    >
                      <Ionicons
                        name={option.icon}
                        size={18}
                        color={option.color}
                      />
                    </View>
                    <View style={styles.optionText}>
                      <Text
                        style={[styles.optionTitle, { color: colors.text }]}
                      >
                        {option.title}
                      </Text>
                      <Text
                        style={[
                          styles.optionSubtitle,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {option.subtitle}
                      </Text>
                    </View>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={17}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Déconnexion */}
        <TouchableOpacity
          style={[
            styles.logoutButton,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <Ionicons name="log-out-outline" size={19} color="#E24B4A" />
          <Text style={[styles.logoutText, { color: "#E24B4A" }]}>
            Se déconnecter
          </Text>
        </TouchableOpacity>

        <Text style={[styles.versionText, { color: colors.textSecondary }]}>
          Version 1.0.0
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: {
    height: 140,
    paddingHorizontal: 20,
    paddingTop: 8,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heroLabel: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
  },
  heroIconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarCardWrapper: {
    alignSelf: "center",
    marginTop: -56,
    position: "relative",
  },
  avatarRing: {
    width: 108,
    height: 108,
    borderRadius: 54,
    borderWidth: 4,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  onlineDot: {
    position: "absolute",
    bottom: 6,
    left: 6,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
  },
  editBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  nameSection: {
    alignItems: "center",
    marginTop: 12,
    marginBottom: 20,
  },
  userName: {
    fontSize: 21,
    fontWeight: "700",
    textTransform: "capitalize",
    marginBottom: 3,
  },
  userEmail: {
    fontSize: 13,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  statValue: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    textAlign: "center",
  },
  groupSection: {
    marginBottom: 22,
  },
  groupLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginHorizontal: 20,
    marginBottom: 8,
  },
  groupCard: {
    marginHorizontal: 16,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  optionLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
  },
  optionText: { flex: 1 },
  optionTitle: {
    fontSize: 14.5,
    fontWeight: "600",
    marginBottom: 1,
  },
  optionSubtitle: {
    fontSize: 12.5,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: "600",
  },
  versionText: {
    textAlign: "center",
    fontSize: 11,
    marginTop: 16,
  },
});
