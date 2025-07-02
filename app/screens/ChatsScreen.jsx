import React, { useEffect, useState, useContext } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, ActivityIndicator, StyleSheet, Modal } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import avatar from '@/assets/images/download.png';


const SERVER_URL = 'http://192.168.88.43:3000';

const ChatsScreen = () => {
    const { user } = useAuth();
    const [chats, setChats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState([]);
    const [showUserModal, setShowUserModal] = useState(false);
    const navigation = useNavigation();

    useFocusEffect(
        React.useCallback(() => {
            if (user?._id) {
                fetchChats();
                fetchUsers();
            }
        }, [user])
    );

    const fetchChats = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${SERVER_URL}/api/chat/${user._id}`);
            const data = await res.json();
            if (data.success) {
                setChats(data.chats);
            }

        } catch (err) {
            console.error("Erreur de récupération des chats:", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        try {
            const res = await fetch(`${SERVER_URL}/api/users`);
            const data = await res.json();
            if (data.success) {
                const otherUsers = data.users.filter(u => u._id !== user._id);
                setUsers(otherUsers);
            }
        } catch (err) {
            console.error("Erreur de récupération des utilisateurs:", err);
        }
    };

    const handleNewMessage = () => {
        fetchUsers();
        if (users.length === 0) {
            return;
        }
        setShowUserModal(true);
    };

    const startNewChat = async (selectedUser) => {
        setShowUserModal(false);

        try {
            const existingChat = chats.find(chat =>
                chat.otherUser._id === selectedUser._id
            );

            if (existingChat) {
                navigation.navigate('PrivateChat', {
                    chatId: existingChat.chatId,
                    user: existingChat.otherUser
                });
            } else {
                const res = await fetch(`${SERVER_URL}/api/chat/create`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        user1: user._id,
                        user2: selectedUser._id
                    })
                });

                const data = await res.json();
                if (data.success) {
                    navigation.navigate('PrivateChat', {
                        chatId: data.chatId,
                        user: selectedUser
                    });

                    fetchChats();
                }

            }
        } catch (err) {
            console.error("Erreur lors de la création du chat:", err);
        }
    };

    const renderChatItem = ({ item }) => (
        <TouchableOpacity
            style={styles.chatItem}
            onPress={() => navigation.navigate('PrivateChat', { chatId: item.chatId, user: item.otherUser })}
        >
            <View style={styles.userStatus}>
                <Image
                    source={item.otherUser.avatar ? {
                        uri: item.otherUser.avatar
                    } : avatar}
                    style={styles.avatar}
                />
                {item.otherUser.is_online && <View style={styles.onlineIndicator} />}
            </View>

            <View style={styles.chatInfo}>
                <Text style={styles.name}>{item.otherUser.name}</Text>
                {item.unreadCount > 0 && (
                    <Text style={styles.unread}>🟢 {item.unreadCount} nouveau(x)</Text>
                )}
                <Text style={styles.date}>
                    {item.lastMessage ?
                        `${item.lastMessage.senderId === user._id ? 'Vous: ' : ''}` + item.lastMessage.content :
                        'Pas de messages'
                    }
                </Text>
            </View>
        </TouchableOpacity>
    );

    const renderUserItem = ({ item }) => (
        <TouchableOpacity
            style={styles.userItem}
            onPress={() => startNewChat(item)}
        >
            <View style={styles.userStatus}>
                <Image
                    source={item.avatar ? {
                        uri: item.avatar
                    } : avatar}
                    style={styles.userAvatar}
                />
                {item.is_online && <View style={styles.onlineIndicator} />}
            </View>
            <View style={styles.userInfo}>
                <Text style={styles.userName}>{item.name}</Text>
                <Text style={styles.userEmail}>{item.email}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
    );

    if (loading && chats.length === 0) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2196f3" />
                <Text style={styles.loadingText}>Chargement...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Conversations</Text>
                <TouchableOpacity
                    style={styles.newMessageButton}
                    onPress={handleNewMessage}
                >
                    <Text style={styles.newMessageButtonText}>✉️ Nouveau</Text>
                </TouchableOpacity>
            </View>

            {chats.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>💬 Aucune conversation</Text>
                    <Text style={styles.emptySubText}>
                        Appuyez sur "Nouveau" pour démarrer une conversation
                    </Text>
                    {users.length === 0 && (
                        <Text style={styles.noUsersText}>
                            Aucun utilisateur disponible pour le moment
                        </Text>
                    )}
                </View>
            ) : (
                <FlatList
                    data={chats}
                    keyExtractor={(item) => item.chatId}
                    renderItem={renderChatItem}
                    showsVerticalScrollIndicator={false}
                    refreshing={loading}
                    onRefresh={fetchChats}
                />
            )}

            {/* Modal pour sélectionner un utilisateur */}
            <Modal
                visible={showUserModal}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setShowUserModal(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Choisir un contact</Text>
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={() => setShowUserModal(false)}
                        >
                            <Text style={styles.closeButtonText}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    {users.length === 0 ? (
                        <View style={styles.emptyUsersContainer}>
                            <Text style={styles.emptyUsersText}>
                                Aucun utilisateur disponible
                            </Text>
                        </View>
                    ) : (
                        <FlatList
                            data={users}
                            keyExtractor={(item) => item._id}
                            renderItem={renderUserItem}
                            showsVerticalScrollIndicator={false}
                            style={styles.usersList}
                        />
                    )}
                </View>
            </Modal>
        </View>
    );
};

export default ChatsScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        backgroundColor: '#fff',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
    },
    newMessageButton: {
        backgroundColor: '#2196f3',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    newMessageButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 14,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    loadingText: {
        marginTop: 10,
        color: '#666',
        fontSize: 16,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    emptyText: {
        fontSize: 18,
        color: '#666',
        textAlign: 'center',
        marginBottom: 8,
    },
    emptySubText: {
        fontSize: 14,
        color: '#999',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 16,
    },
    noUsersText: {
        fontSize: 14,
        color: '#ff6b6b',
        textAlign: 'center',
        fontStyle: 'italic',
    },
    chatItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderColor: '#f0f0f0',
        backgroundColor: '#fff',
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 12,
        backgroundColor: '#f0f0f0',
        borderWidth: 1,
        borderColor: 'gray',
    },
    chatInfo: {
        flex: 1,
    },
    name: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
    },
    unread: {
        color: '#2196f3',
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 2,
    },
    date: {
        color: '#999',
        fontSize: 12,
    },
    // Styles pour la modal
    modalContainer: {
        flex: 1,
        backgroundColor: '#fff',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        paddingTop: 60, // Pour l'encoche iPhone
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
    closeButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: '#f5f5f5',
    },
    closeButtonText: {
        fontSize: 18,
        color: '#666',
        fontWeight: 'bold',
    },
    usersList: {
        flex: 1,
    },
    userItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderColor: '#f0f0f0',
        backgroundColor: '#fff',
    },
    userAvatar: {
        width: 45,
        height: 45,
        borderRadius: 22.5,
        marginRight: 12,
        backgroundColor: '#f0f0f0',
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 2,
    },
    userEmail: {
        fontSize: 14,
        color: '#666',
    },
    chevron: {
        fontSize: 20,
        color: '#ccc',
        fontWeight: 'bold',
    },
    emptyUsersContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    emptyUsersText: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
    },
    onlineIndicator: {
        width: 14,
        height: 14,
        borderRadius: 50,
        backgroundColor: '#4CAF50',
        marginLeft: 8,
        position: 'absolute',
        bottom: 2,
        right: 12,
        borderWidth: 2,
        borderColor: '#fff',
    },
    userStatus: {
        position: 'relative',
    },
});