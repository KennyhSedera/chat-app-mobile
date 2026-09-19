import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import AuthService from "../services/AuthService";

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const initializeAuth = useCallback(async () => {
    try {
      setIsLoading(true);
      const currentUser = await AuthService.initialize();

      if (currentUser) {
        setUser(currentUser);
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error("Erreur d'initialisation de l'authentification:", error);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (email, password) => {
    try {
      setIsLoading(true);
      const result = await AuthService.login(email, password);

      if (result.success) {
        setUser(result.user);

        console.log(result.user?.last_seen);

        setIsAuthenticated(true);
        return result;
      } else {
        setUser(null);
        setIsAuthenticated(false);
        return result;
      }
    } catch (error) {
      console.error("Erreur de connexion:", error);
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (userData) => {
    try {
      setIsLoading(true);
      const result = await AuthService.register(userData);

      if (result.success) {
        return result;
      } else {
        setUser(null);
        setIsAuthenticated(false);
        return result;
      }
    } catch (error) {
      console.error("Erreur d'inscription:", error);
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loginAsGuest = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await AuthService.loginAsGuest();

      if (result.success) {
        setUser(result.user);
        setIsAuthenticated(true);
        return result;
      } else {
        setUser(null);
        setIsAuthenticated(false);
        return result;
      }
    } catch (error) {
      console.error("Erreur de connexion invité:", error);
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    if (!user?._id) {
      console.warn("Aucun utilisateur connecté");
      return { success: false, error: "Aucun utilisateur connecté" };
    }

    console.log(user?.last_seen);

    try {
      setIsLoading(true);
      const result = await AuthService.logout(user._id);

      if (result.success) {
        setUser(null);
        setIsAuthenticated(false);
        return result;
      } else {
        if (result.forced) {
          setUser(null);
          setIsAuthenticated(false);
        }
        return result;
      }
    } catch (error) {
      console.error("Erreur de déconnexion:", error);
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const updateProfile = useCallback(async (updates) => {
    try {
      const result = await AuthService.updateProfile(updates);

      if (result.success) {
        setUser(result.user);
        return result;
      }

      return result;
    } catch (error) {
      console.error("Erreur de mise à jour du profil:", error);
      return { success: false, error: error.message };
    }
  }, []);

  const deleteAccount = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await AuthService.deleteAccount();

      if (result.success) {
        setUser(null);
        setIsAuthenticated(false);
        return result;
      }

      return result;
    } catch (error) {
      console.error("Erreur de suppression du compte:", error);
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const changePassword = useCallback(async (currentPassword, newPassword) => {
    try {
      const result = await AuthService.changePassword(
        currentPassword,
        newPassword,
      );
      return result;
    } catch (error) {
      console.error("Erreur de changement de mot de passe:", error);
      return { success: false, error: error.message };
    }
  }, []);

  const getUserStats = useCallback(async () => {
    try {
      const stats = await AuthService.getUserStats();
      return stats;
    } catch (error) {
      console.error("Erreur récupération des statistiques:", error);
      return null;
    }
  }, []);

  const clearAllData = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await AuthService.clearAllData();

      if (result.success) {
        setUser(null);
        setIsAuthenticated(false);
        return result;
      }

      return result;
    } catch (error) {
      console.error("Erreur de nettoyage des données:", error);
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleAuthEvent = useCallback((event) => {
    switch (event.type) {
      case "LOGIN":
      case "REGISTER":
      case "GUEST_LOGIN":
        setUser(event.user);
        setIsAuthenticated(true);
        break;

      case "LOGOUT":
      case "ACCOUNT_DELETED":
      case "DATA_CLEARED":
        setUser(null);
        setIsAuthenticated(false);
        break;

      case "PROFILE_UPDATE":
        setUser(event.user);
        break;

      default:
        console.log("Événement d'authentification non géré:", event.type);
    }
  }, []);

  const updateAvatar = async (userId, avatar) => {
    try {
      const res = await AuthService.updateAvatar(userId, avatar);
      const result = await res.json();

      if (result.success) {
        setUser(result.user);
        return result;
      }
    } catch (error) {
      console.error("Erreur de mise à jour de l'avatar:", error);
      return { success: false, error: error.message };
    }
  };

  useEffect(() => {
    initializeAuth();

    const removeListener = AuthService.addAuthListener(handleAuthEvent);

    return () => {
      removeListener();
    };
  }, [initializeAuth, handleAuthEvent]);

  useEffect(() => {
    const checkAuthStatus = () => {
      const currentUser = AuthService.getCurrentUser();
      const isLoggedIn = AuthService.isLoggedIn();

      if (currentUser !== user || isLoggedIn !== isAuthenticated) {
        setUser(currentUser);
        setIsAuthenticated(isLoggedIn);
      }
    };

    const interval = setInterval(checkAuthStatus, 30000);

    return () => clearInterval(interval);
  }, [user, isAuthenticated]);

  const contextValue = {
    user,
    isLoading,
    isAuthenticated,

    login,
    register,
    loginAsGuest,
    logout,

    updateAvatar,
    updateProfile,
    deleteAccount,
    changePassword,

    getUserStats,
    clearAllData,
    initializeAuth,
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};

export default AuthProvider;
