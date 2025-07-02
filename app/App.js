import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { StatusBar } from "expo-status-bar";
import {
  Platform,
  StyleSheet,
  View,
  ActivityIndicator,
  Text,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import React from "react";

import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import ChatScreen from "./screens/ChatScreen";
import HomeScreen from "./screens/HomeScreen";
import ProfileScreen from "./screens/ProfileScreen";
import LoginScreen from "./screens/LoginScreen";
import ChatsScreen from "./screens/ChatsScreen";
import PrivateChatScreen from "./screens/PrivateChatScreen";

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
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === "Home") {
            iconName = focused ? "home" : "home-outline";
          } else if (route.name === "Chat") {
            iconName = focused ? "chatbubbles" : "chatbubbles-outline";
          } else if (route.name === "Profile") {
            iconName = focused ? "person" : "person-outline";
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.tint,
        tabBarInactiveTintColor: theme.tabIconDefault,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.background,
          borderTopWidth: 1,
          borderTopColor: theme.tabBarBorder,
          paddingBottom: Platform.OS === "ios" ? 20 : 10,
          height: Platform.OS === "ios" ? 90 : 70,
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: "Accueil",
        }}
      />
      <Tab.Screen
        name="Chat"
        component={ChatsScreen}
        options={{
          tabBarLabel: "Chat",
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
      <NavigationContainer>
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
    <AuthProvider>
      <AppContent />
    </AuthProvider>
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
