import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import avatar from '@/assets/images/download.png';

export default function ProfileScreen() {
    const { user, logout } = useAuth();

    const handleLogout = async () => {
        try {
            await AsyncStorage.removeItem('chatUser');
            await AsyncStorage.removeItem('userCredentials');
            logout();
        } catch (error) {
            console.error('Erreur de déconnexion:', error);
        }
    };

    console.log(user);

    const getAvatarSource = () => {
        if (user?.avatar) {
            if (user.avatar.startsWith('http') || user.avatar.startsWith('data:')) {
                return { uri: user.avatar };
            }
            return { uri: user.avatar };
        }
        return avatar;
    };

    const profileOptions = [
        { icon: 'person-outline', title: 'Modifier le profil', subtitle: 'Nom, photo, statut' },
        { icon: 'key-outline', title: 'Compte', subtitle: 'Sécurité, changement de numéro' },
        { icon: 'chatbubbles-outline', title: 'Chats', subtitle: 'Thème, fonds d\'écran, historique' },
        { icon: 'notifications-outline', title: 'Notifications', subtitle: 'Messages, groupes & sons d\'appel' },
        { icon: 'shield-outline', title: 'Confidentialité', subtitle: 'Blocage, statut en ligne' },
        { icon: 'help-outline', title: 'Aide', subtitle: 'Centre d\'aide, nous contacter' },
    ];

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView>
                <LinearGradient colors={['#007AFF', '#00D4FF']} style={styles.header}>
                    <View style={styles.profileInfo}>
                        <Image
                            source={getAvatarSource()}
                            style={styles.avatar}
                            defaultSource={avatar}
                            onError={() => {
                                console.log('Erreur de chargement de l\'avatar');
                            }}
                        />
                        <View style={styles.userInfo}>
                            <Text style={styles.userName}>{user?.name || 'Utilisateur'}</Text>
                            <Text style={styles.userStatus}>
                                {user?.is_online ? 'En ligne' : 'Hors ligne'}
                            </Text>
                        </View>
                        <TouchableOpacity style={styles.editButton}>
                            <Ionicons name="create-outline" size={24} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </LinearGradient>

                <View style={styles.userDetails}>
                    <Text style={styles.userDetailsTitle}>Informations du compte</Text>
                    <View style={styles.userDetailItem}>
                        <Text style={styles.userDetailLabel}>Email:</Text>
                        <Text style={styles.userDetailValue}>{user?.email || 'Non renseigné'}</Text>
                    </View>
                    <View style={styles.userDetailItem}>
                        <Text style={styles.userDetailLabel}>Membre depuis:</Text>
                        <Text style={styles.userDetailValue}>
                            {user?.created_at ?
                                new Date(user.created_at).toLocaleDateString('fr-FR') :
                                'Non disponible'
                            }
                        </Text>
                    </View>
                </View>

                <View style={styles.optionsContainer}>
                    {profileOptions.map((option, index) => (
                        <TouchableOpacity key={index} style={styles.optionItem}>
                            <View style={styles.optionLeft}>
                                <View style={styles.iconContainer}>
                                    <Ionicons name={option.icon} size={24} color="#007AFF" />
                                </View>
                                <View style={styles.optionText}>
                                    <Text style={styles.optionTitle}>{option.title}</Text>
                                    <Text style={styles.optionSubtitle}>{option.subtitle}</Text>
                                </View>
                            </View>
                            <Ionicons name="chevron-forward-outline" size={20} color="#ccc" />
                        </TouchableOpacity>
                    ))}
                </View>

                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <Ionicons name="log-out-outline" size={24} color="#ff4444" />
                    <Text style={styles.logoutText}>Se déconnecter</Text>
                </TouchableOpacity>

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        padding: 20,
        paddingTop: 10,
    },
    profileInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 3,
        borderColor: '#fff',
        backgroundColor: '#f0f0f0',
        filter: 'drop-shadow(0px 4px 4px rgba(0, 0, 0, 0.25))',
    },
    userInfo: {
        flex: 1,
        marginLeft: 15,
    },
    userName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 5,
    },
    userStatus: {
        fontSize: 16,
        color: '#e0f0ff',
    },
    editButton: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        padding: 10,
        borderRadius: 25,
    },
    optionsContainer: {
        backgroundColor: '#fff',
        marginTop: 20,
        marginHorizontal: 15,
        borderRadius: 15,
        overflow: 'hidden',
    },
    optionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    optionLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#f0f8ff',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    optionText: {
        flex: 1,
    },
    optionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 2,
    },
    optionSubtitle: {
        fontSize: 14,
        color: '#666',
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        marginHorizontal: 15,
        marginTop: 20,
        padding: 15,
        borderRadius: 15,
    },
    logoutText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#ff4444',
        marginLeft: 10,
    },
    userDetails: {
        backgroundColor: '#fff',
        marginHorizontal: 15,
        marginTop: 20,
        marginBottom: 30,
        borderRadius: 15,
        padding: 20,
    },
    userDetailsTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 15,
    },
    userDetailItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    userDetailLabel: {
        fontSize: 16,
        color: '#666',
        fontWeight: '500',
    },
    userDetailValue: {
        fontSize: 16,
        color: '#333',
        fontWeight: '400',
    },
});