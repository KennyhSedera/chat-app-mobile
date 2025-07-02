import AsyncStorage from "@react-native-async-storage/async-storage";

const BASE_URL = "http://192.168.88.43:3000/api/users";

class AuthService {
  constructor() {
    this.currentUser = null;
    this.isAuthenticated = false;
    this.authListeners = [];
  }

  async initialize() {
    try {
      const userData = await AsyncStorage.getItem("chatUser");

      if (userData) {
        const user = JSON.parse(userData);
        this.currentUser = user;
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

      this.currentUser = data.user;
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

      this.currentUser = data.user;
      this.isAuthenticated = true;
      this.notifyListeners({ type: "REGISTER", user: data.user });

      return { success: true, user: data.user };
    } catch (error) {
      console.error("Erreur d'inscription:", error);
      return { success: false, error: error.message };
    }
  }

  // Méthode logout corrigée - accepte maintenant un userId directement
  async logout(userId) {
    if (!userId) {
      console.warn("UserId manquant pour le logout");
      return { success: false, error: "UserId requis" };
    }

    try {
      const res = await fetch(`${BASE_URL}/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }), // Envoi de userId dans le bon format
      });

      // Vérifier si la réponse est OK
      if (!res.ok) {
        console.error("Erreur HTTP:", res.status);
        // En cas d'erreur serveur, forcer le nettoyage local
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

      // Nettoyage local après succès serveur
      await this.performLocalLogout();

      return { success: true, message: "Déconnexion réussie" };
    } catch (error) {
      console.error("Erreur de déconnexion:", error);

      // En cas d'erreur réseau, forcer le nettoyage local
      if (error.name === "TypeError" || error.message.includes("fetch")) {
        console.warn("Erreur réseau - nettoyage local forcé");
        return await this.forceLogout();
      }

      return { success: false, error: error.message };
    }
  }

  // Méthode pour le nettoyage local
  async performLocalLogout() {
    try {
      await AsyncStorage.removeItem("chatUser");
      const previousUser = this.currentUser;
      this.currentUser = null;
      this.isAuthenticated = false;
      this.notifyListeners({ type: "LOGOUT", previousUser });
      return { success: true };
    } catch (error) {
      console.error("Erreur nettoyage local:", error);
      throw error;
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
      // Optionnel : mettre à jour via backend si nécessaire
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
}

export default new AuthService();
