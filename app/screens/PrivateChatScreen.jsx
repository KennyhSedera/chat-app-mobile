import { StyleSheet, Text, View, FlatList, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useRoute } from '@react-navigation/native';
import ChatService from '../services/ChatService';
import { Ionicons } from '@expo/vector-icons';

const PrivateChatScreen = ({ navigation }) => {
    const route = useRoute();
    const { chatId, user } = route.params;

    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const flatListRef = useRef(null);

    const handleNewMessage = useCallback((message) => {
        if (message.chatId === chatId) {
            setMessages((prev) => {
                const messageExists = prev.some(msg => msg._id === message._id);
                if (messageExists) return prev;

                const newMessages = [...prev, message];
                return newMessages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
            });
        }
    }, [chatId]);

    useEffect(() => {
        let unsubscribe;
        let isComponentMounted = true;

        const initChat = async () => {
            try {
                setError(null);
                await ChatService.initialize();
                ChatService.joinRoom(chatId);

                unsubscribe = ChatService.on("newPrivateMessage", handleNewMessage);

                if (isComponentMounted) {
                    await fetchMessages();
                }
            } catch (error) {
                console.error("Erreur d'initialisation du ChatService:", error);
                if (isComponentMounted) {
                    setError("Impossible de se connecter au chat");
                    setLoading(false);
                }
            }
        };

        initChat();

        return () => {
            isComponentMounted = false;
            if (unsubscribe) {
                unsubscribe();
            }
            ChatService.leaveRoom?.(chatId);
        };
    }, [chatId, handleNewMessage]);

    const fetchMessages = async () => {
        try {
            setLoading(true);
            const data = await ChatService.getMessages(null, chatId);

            const sortedMessages = data.messages.sort((a, b) =>
                new Date(a.createdAt) - new Date(b.createdAt)
            );

            setMessages(sortedMessages);
            setError(null);
        } catch (error) {
            console.error("Erreur récupération messages:", error);
            setError("Impossible de charger les messages");
        } finally {
            setLoading(false);
        }
    };

    const handleSend = async () => {
        const messageText = input.trim();
        if (!messageText) return;

        try {
            setInput('');

            await ChatService.sendMessage(messageText, chatId, null);

            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
                fetchMessages();
            }, 100);

        } catch (error) {
            console.error("Erreur envoi message:", error);
            Alert.alert("Erreur", "Impossible d'envoyer le message");
            setInput(messageText);
        }
    };

    const formatTime = (timestamp) => {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        return date.toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const renderMessage = ({ item, index }) => {
        const isMyMessage = item.user._id === user._id;

        return (
            <View style={[
                styles.messageWrapper,
                !isMyMessage ? styles.myMessageWrapper : styles.otherMessageWrapper
            ]}>
                <View style={[
                    styles.messageBubble,
                    !isMyMessage ? styles.myMessage : styles.otherMessage
                ]}>
                    <Text style={[
                        styles.messageText,
                        !isMyMessage ? styles.myMessageText : styles.otherMessageText
                    ]}>
                        {item.content}
                    </Text>
                </View>

                <Text style={[
                    styles.timestamp,
                    !isMyMessage ? styles.myTimestamp : styles.otherTimestamp
                ]}>
                    {formatTime(item.createdAt)}
                </Text>
            </View>
        );
    };

    if (error) {
        return (
            <View style={styles.centerContainer}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={fetchMessages}>
                    <Text style={styles.retryButtonText}>Réessayer</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="chevron-back" size={20} color="#000" />
                </TouchableOpacity>
                <Text style={styles.title}>{user.name}</Text>
            </View>

            {loading ? (
                <View style={styles.centerContainer}>
                    <Text style={styles.loadingText}>Chargement des messages...</Text>
                </View>
            ) : (
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={(item) => item._id.toString()}
                    renderItem={renderMessage}
                    contentContainerStyle={styles.messagesList}
                    onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                    showsVerticalScrollIndicator={false}
                />
            )}

            <View style={styles.inputContainer}>
                <TextInput
                    style={styles.textInput}
                    placeholder="Écrire un message..."
                    placeholderTextColor="#999"
                    value={input}
                    onChangeText={setInput}
                    multiline
                    maxLength={500}
                    returnKeyType="send"
                    onSubmitEditing={handleSend}
                    blurOnSubmit={false}
                />
                <TouchableOpacity
                    style={[
                        styles.sendButton,
                        input.trim() ? styles.sendButtonActive : styles.sendButtonInactive
                    ]}
                    onPress={handleSend}
                    disabled={!input.trim()}
                >
                    <Text style={[
                        styles.sendButtonText,
                        input.trim() ? styles.sendButtonTextActive : styles.sendButtonTextInactive
                    ]}>
                        Envoyer
                    </Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
};

export default PrivateChatScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        backgroundColor: '#fff',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        flexDirection: 'row',
        alignItems: 'center',
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        textAlign: 'center',
        flex: 1,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    loadingText: {
        fontSize: 16,
        color: '#666',
    },
    errorText: {
        fontSize: 16,
        color: '#e74c3c',
        textAlign: 'center',
        marginBottom: 20,
    },
    retryButton: {
        backgroundColor: '#3498db',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
    },
    retryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '500',
    },
    messagesList: {
        padding: 16,
        paddingBottom: 8,
    },
    messageWrapper: {
        marginVertical: 4,
        maxWidth: '80%',
    },
    myMessageWrapper: {
        alignSelf: 'flex-end',
        alignItems: 'flex-end',
    },
    otherMessageWrapper: {
        alignSelf: 'flex-start',
        alignItems: 'flex-start',
    },
    senderName: {
        fontSize: 12,
        color: '#666',
        marginBottom: 4,
        marginLeft: 12,
    },
    messageBubble: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 18,
        maxWidth: '100%',
    },
    myMessage: {
        backgroundColor: '#007AFF',
    },
    otherMessage: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    messageText: {
        fontSize: 16,
        lineHeight: 20,
    },
    myMessageText: {
        color: '#fff',
    },
    otherMessageText: {
        color: '#333',
    },
    timestamp: {
        fontSize: 11,
        marginTop: 4,
        marginHorizontal: 12,
    },
    myTimestamp: {
        color: '#666',
        textAlign: 'right',
    },
    otherTimestamp: {
        color: '#666',
        textAlign: 'left',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
    },
    textInput: {
        flex: 1,
        minHeight: 40,
        maxHeight: 100,
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: '#f8f8f8',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        fontSize: 16,
        marginRight: 12,
        textAlignVertical: 'center',
    },
    sendButton: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
        minWidth: 80,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sendButtonActive: {
        backgroundColor: '#007AFF',
    },
    sendButtonInactive: {
        backgroundColor: '#e0e0e0',
    },
    sendButtonText: {
        fontSize: 16,
        fontWeight: '500',
    },
    sendButtonTextActive: {
        color: '#fff',
    },
    sendButtonTextInactive: {
        color: '#999',
    },
});