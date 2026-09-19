import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { StatusBar } from "expo-status-bar";
import React from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ChatProvider, useChat } from "./contexts/ChatContext";
import {
  NotificationProvider,
  useNotifications,
} from "./contexts/NotificationContext";
import { useAppColors } from "./hooks/colors";
import { navigationRef } from "./navigation/navigationRef";
import ChatsScreen from "./screens/ChatsScreen";
import HomeScreen from "./screens/HomeScreen";
import LoginScreen from "./screens/LoginScreen";
import NotificationsScreen from "./screens/NotificationsScreen";
import PrivateChatScreen from "./screens/PrivateChatScreen";
import ProfileScreen from "./screens/ProfileScreen";
import RoomChatScreen from "./screens/RoomChatScreen";

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Composant de chargement
function LoadingScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];

  return (
    <View
      style={[styles.loadingContainer, { backgroundColor: theme.background }]}
    >
      <View
        style={[styles.loadingContent, { backgroundColor: theme.tint + "20" }]}
      >
        <Ionicons name="chatbubbles" size={60} color={theme.tint} />
        <ActivityIndicator
          size="large"
          color={theme.tint}
          style={styles.loadingSpinner}
        />
        <Text style={[styles.loadingText, { color: theme.text }]}>
          Chargement...
        </Text>
      </View>
    </View>
  );
}

// Navigation principale avec tabs
function MainTabs() {
  const { colors: theme } = useAppColors();
  const { unreadChatsCount } = useChat();
  const { unreadCount } = useNotifications();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color }) => {
          let iconName = "";

          if (route.name === "Home") {
            iconName = focused ? "home" : "home-outline";
          } else if (route.name === "Chat") {
            iconName = focused ? "chatbubbles" : "chatbubbles-outline";
          } else if (route.name === "Profile") {
            iconName = focused ? "person-circle" : "person-circle-outline";
          } else if (route.name === "Notifications") {
            iconName = focused ? "notifications" : "notifications-outline";
          }

          return (
            <Ionicons name={iconName} size={focused ? 30 : 25} color={color} />
          );
        },
        tabBarShowLabel: true,
        tabBarActiveTintColor: theme.tint,
        tabBarInactiveTintColor: theme.tabIconDefault,
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          left: 15,
          right: 15,
          bottom: 4,
          height: 58,
          backgroundColor: theme.card,
          shadowColor: theme.textSecondary,
          borderRadius: 30,
          marginHorizontal: 10,
          borderTopWidth: 0,
          borderWidth: 0,
          shadowOffset: {
            width: 0,
            height: 2,
          },
          shadowOpacity: 0.12,
          shadowRadius: 2,
          elevation: 0.5,
          paddingTop: 5,
          paddingBottom: Platform.OS === "ios" ? 5 : 3,
          overflow: "visible",
        },
        tabBarItemStyle: {
          borderRadius: 30,
          paddingVertical: 2,
        },
        tabBarLabelStyle: {
          fontSize: 9,
          fontWeight: "500",
          marginTop: 1,
        },
        tabBarBadgeStyle: {
          fontSize: 9,
          minWidth: 16,
          height: 16,
          lineHeight: 16,
          borderRadius: 8,
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: "Accueil",
          tabBarBadge: "25+",
        }}
      />

      <Tab.Screen
        name="Chat"
        component={ChatsScreen}
        options={{
          tabBarLabel: "Discussions",
          tabBarBadge: unreadChatsCount > 0 ? unreadChatsCount : undefined,
        }}
      />

      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          tabBarLabel: "Notifications",
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
        }}
      />

      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: "Profil",
        }}
      />
    </Tab.Navigator>
  );
}

// Stack Navigator avec authentification
function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{
          animationTypeForReplace: "push",
        }}
      />
    </Stack.Navigator>
  );
}

function AppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="MainTabs"
        component={MainTabs}
        options={{
          animationTypeForReplace: "push",
        }}
      />
      <Stack.Screen
        name="PrivateChat"
        component={PrivateChatScreen}
        options={{
          animationTypeForReplace: "pop",
        }}
      />
      <Stack.Screen
        name="RoomChat"
        component={RoomChatScreen}
        options={{
          animationTypeForReplace: "push",
        }}
      />
    </Stack.Navigator>
  );
}

// Composant principal de navigation avec gestion d'authentification
function AppNavigator() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const colorScheme = useColorScheme();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated || !user) {
    return <AuthStack />;
  }

  return <AppStack />;
}

function AppContent() {
  const colorScheme = useColorScheme();

  return (
    <SafeAreaProvider>
      <NavigationContainer ref={navigationRef}>
        <SafeAreaView
          style={[
            styles.container,
            { backgroundColor: Colors[colorScheme ?? "light"].background },
          ]}
        >
          <AppNavigator />
          <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
        </SafeAreaView>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

// App principal avec AuthProvider
export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <NotificationProvider>
          <StatusBar style="dark" translucent />
          <ChatProvider>
            <AppContent />
          </ChatProvider>
        </NotificationProvider>
      </AuthProvider>
    </GestureHandlerRootView>
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
    padding: 20,
  },
  loadingContent: {
    alignItems: "center",
    padding: 40,
    borderRadius: 20,
  },
  loadingSpinner: {
    marginVertical: 20,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: "500",
    textAlign: "center",
  },
});
