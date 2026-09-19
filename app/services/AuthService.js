import AsyncStorage from "@react-native-async-storage/async-storage";

const BASE_URL =
  "http://192.168.8.104:3001/api/users" || "http://192.168.43.8:3001/api/users";

// export const SERVER_URL = "http://192.168.43.8:3001";
export const SERVER_URL = "http://192.168.8.104:3001";

class AuthService {
  constructor() {
    this.currentUser = null;
    this.sessionToken = null;
    this.isAuthenticated = false;
    this.authListeners = [];
  }

  async initialize() {
    try {
      const userData = await AsyncStorage.getItem("chatUser");
      const token = await AsyncStorage.getItem("sessionToken");

      if (userData && token) {
        const user = JSON.parse(userData);
        this.currentUser = user;
        this.sessionToken = token;
        this.isAuthenticated = true;
        this.notifyListeners({ type: "LOGIN", user });
        return user;
      }

      return null;
    } catch (error) {
      console.error("Erreur lors de l'initialisation de l'auth:", error);
      return null;
    }
  }

  async login(email, password) {
    try {
      const res = await fetch(`${BASE_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        return { success: false, error: data.error || "Échec de la connexion" };
      }

      await AsyncStorage.setItem("chatUser", JSON.stringify(data.user));
      await AsyncStorage.setItem("sessionToken", data.token);

      this.currentUser = data.user;
      this.sessionToken = data.token;
      this.isAuthenticated = true;
      this.notifyListeners({ type: "LOGIN", user: data.user });

      return { success: true, user: data.user };
    } catch (error) {
      console.error("Erreur de connexion:", error);
      return { success: false, error: error.message };
    }
  }

  async register(userData) {
    try {
      const res = await fetch(`${BASE_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        return {
          success: false,
          error: data.error || "Échec de l'inscription",
        };
      }

      await AsyncStorage.setItem("chatUser", JSON.stringify(data.user));
      await AsyncStorage.setItem("sessionToken", data.token); // ← nouveau

      this.currentUser = data.user;
      this.sessionToken = data.token; // ← nouveau
      this.isAuthenticated = true;
      this.notifyListeners({ type: "REGISTER", user: data.user });

      return { success: true, user: data.user };
    } catch (error) {
      console.error("Erreur d'inscription:", error);
      return { success: false, error: error.message };
    }
  }

  async performLocalLogout() {
    try {
      await AsyncStorage.removeItem("chatUser");
      await AsyncStorage.removeItem("sessionToken"); // ← nouveau
      const previousUser = this.currentUser;
      this.currentUser = null;
      this.sessionToken = null; // ← nouveau
      this.isAuthenticated = false;
      this.notifyListeners({ type: "LOGOUT", previousUser });
      return { success: true };
    } catch (error) {
      console.error("Erreur nettoyage local:", error);
      throw error;
    }
  }

  getSessionToken() {
    return this.sessionToken;
  }

  async logout(userId) {
    if (!userId) {
      console.warn("UserId manquant pour le logout");
      return { success: false, error: "UserId requis" };
    }

    try {
      const res = await fetch(`${BASE_URL}/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      if (!res.ok) {
        console.error("Erreur HTTP:", res.status);
        return await this.forceLogout();
      }

      const data = await res.json();

      if (!data.success) {
        console.error("Échec logout serveur:", data.error);
        return {
          success: false,
          error: data.error || "Échec de la déconnexion",
        };
      }

      await this.performLocalLogout();

      return { success: true, message: "Déconnexion réussie" };
    } catch (error) {
      console.error("Erreur de déconnexion:", error);

      if (error.name === "TypeError" || error.message.includes("fetch")) {
        console.warn("Erreur réseau - nettoyage local forcé");
        return await this.forceLogout();
      }

      return { success: false, error: error.message };
    }
  }

  // Méthode pour logout forcé (nettoyage local seulement)
  async forceLogout() {
    try {
      await this.performLocalLogout();
      return {
        success: true,
        message: "Déconnexion locale réussie",
        forced: true,
      };
    } catch (error) {
      console.error("Erreur logout forcé:", error);
      return { success: false, error: error.message };
    }
  }

  // Ajout de la méthode loginAsGuest manquante
  async loginAsGuest() {
    try {
      const guestUser = {
        _id: `guest_${Date.now()}`,
        name: "Invité",
        email: "guest@example.com",
        avatar: null,
        isGuest: true,
      };

      await AsyncStorage.setItem("chatUser", JSON.stringify(guestUser));

      this.currentUser = guestUser;
      this.isAuthenticated = true;
      this.notifyListeners({ type: "GUEST_LOGIN", user: guestUser });

      return { success: true, user: guestUser };
    } catch (error) {
      console.error("Erreur connexion invité:", error);
      return { success: false, error: error.message };
    }
  }

  async updateProfile(updates) {
    try {
      const updatedUser = { ...this.currentUser, ...updates };
      await AsyncStorage.setItem("chatUser", JSON.stringify(updatedUser));
      this.currentUser = updatedUser;
      this.notifyListeners({ type: "PROFILE_UPDATE", user: updatedUser });

      return { success: true, user: updatedUser };
    } catch (error) {
      console.error("Erreur de mise à jour du profil:", error);
      return { success: false, error: error.message };
    }
  }

  getCurrentUser() {
    return this.currentUser;
  }

  isLoggedIn() {
    return this.isAuthenticated;
  }

  addAuthListener(listener) {
    this.authListeners.push(listener);
    return () => {
      this.authListeners = this.authListeners.filter((l) => l !== listener);
    };
  }

  notifyListeners(event) {
    this.authListeners.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        console.error("Erreur dans le listener auth:", error);
      }
    });
  }

  async clearAllData() {
    try {
      await AsyncStorage.removeItem("chatUser");
      this.currentUser = null;
      this.isAuthenticated = false;
      this.notifyListeners({ type: "DATA_CLEARED" });
      return { success: true };
    } catch (error) {
      console.error("Erreur nettoyage données:", error);
      return { success: false, error: error.message };
    }
  }

  async updateAvatar(userId, avatar) {
    try {
      const data = await fetch(`${SERVER_URL}/api/users/avatar/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar }),
      });

      const updatedUser = { ...this.currentUser, avatar: avatar };
      await AsyncStorage.setItem("chatUser", JSON.stringify(updatedUser));

      this.currentUser = updatedUser;
      return data;
    } catch (error) {
      console.error("Error updating avatar:", error);
      throw error;
    }
  }
}

export default new AuthService();
