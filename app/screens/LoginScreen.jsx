import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    ScrollView,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';

export default function LoginScreen() {
    const { login, register } = useAuth();

    const [formData, setFormData] = useState({
        email: '',
        password: '',
        name: '',
    });

    const [errors, setErrors] = useState({});
    const [isRegisterMode, setIsRegisterMode] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const validateForm = useCallback(() => {
        const newErrors = {};

        if (!formData.email.trim()) {
            newErrors.email = "L'email est requis";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = "Format d'email invalide";
        }

        if (!formData.password) {
            newErrors.password = "Le mot de passe est requis";
        } else if (formData.password.length < 6) {
            newErrors.password = "Le mot de passe doit contenir au moins 6 caractères";
        }

        if (isRegisterMode) {
            if (!formData.name.trim()) {
                newErrors.name = 'Le nom est requis';
            } else if (formData.name.trim().length < 2) {
                newErrors.name = 'Le nom doit contenir au moins 2 caractères';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }, [formData, isRegisterMode]);

    const handleInputChange = useCallback((field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
    }, [errors]);

    const handleSubmit = async () => {
        if (!validateForm()) return;

        setIsLoading(true);
        try {
            let result;
            if (isRegisterMode) {
                result = await register(formData);
            } else {
                result = await login(formData.email, formData.password);
            }

            if (!result.success) {
                throw new Error(result.error || 'Erreur inconnue');
            }

        } catch (error) {
            Alert.alert('Erreur', error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleMode = () => {
        setIsRegisterMode(!isRegisterMode);
        setFormData({ email: '', password: '', name: '' });
        setErrors({});
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                    <View style={styles.header}>
                        <Ionicons name="chatbubbles" size={60} color="#007AFF" />
                        <Text style={styles.title}>
                            {isRegisterMode ? 'Créer un compte' : 'Connexion'}
                        </Text>
                        <Text style={styles.subtitle}>
                            {isRegisterMode ? 'Rejoignez la communauté' : 'Connectez-vous pour continuer'}
                        </Text>
                    </View>

                    <View style={styles.form}>
                        {isRegisterMode && (
                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>Nom complet</Text>
                                <View style={styles.inputBorder}>
                                    <TextInput
                                        style={[styles.textInput, errors.name && styles.errorInput]}
                                        value={formData.name}
                                        onChangeText={value => handleInputChange('name', value)}
                                        placeholder="Votre nom complet"
                                        autoCapitalize="words"
                                    />
                                </View>
                                {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
                            </View>
                        )}

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Email</Text>
                            <View style={styles.inputBorder}>
                                <TextInput
                                    style={[styles.textInput, errors.email && styles.errorInput]}
                                    value={formData.email}
                                    onChangeText={value => handleInputChange('email', value)}
                                    placeholder="votre@email.com"
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                />
                            </View>
                            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Mot de passe</Text>
                            <View style={styles.passwordContainer}>
                                <TextInput
                                    style={[styles.textInput, { flex: 1 }, errors.password && styles.errorInput]}
                                    value={formData.password}
                                    onChangeText={value => handleInputChange('password', value)}
                                    placeholder="Votre mot de passe"
                                    secureTextEntry={!showPassword}
                                />
                                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                                    <Ionicons name={showPassword ? 'eye-outline' : 'eye-off-outline'} size={24} color="#999" />
                                </TouchableOpacity>
                            </View>
                            {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
                        </View>

                        <TouchableOpacity
                            style={[styles.submitButton, isLoading && { opacity: 0.7 }]}
                            onPress={handleSubmit}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.submitButtonText}>
                                    {isRegisterMode ? 'Créer le compte' : 'Se connecter'}
                                </Text>
                            )}
                        </TouchableOpacity>

                        <View style={styles.toggleContainer}>
                            <Text style={styles.toggleText}>
                                {isRegisterMode ? 'Vous avez déjà un compte ?' : 'Vous n\'avez pas de compte ?'}
                            </Text>
                            <TouchableOpacity onPress={toggleMode}>
                                <Text style={styles.toggleLink}>
                                    {isRegisterMode ? 'Se connecter' : 'S\'inscrire'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },
    scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 24 },
    header: { alignItems: 'center', marginBottom: 40 },
    title: { fontSize: 28, fontWeight: 'bold', marginTop: 12 },
    subtitle: { fontSize: 16, color: '#555', marginTop: 4, textAlign: 'center' },
    form: {},
    inputContainer: {
        marginBottom: 16,
        borderRadius: 10,
    },
    label: { fontSize: 16, marginBottom: 6 },
    textInput: {
        borderRadius: 10,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        backgroundColor: 'transparent',
    },
    errorInput: { borderColor: '#FF3B30' },
    errorText: { color: '#FF3B30', marginTop: 4 },
    inputBorder: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 10,
        backgroundColor: '#fff',
    },
    passwordContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 10,
        backgroundColor: '#fff',
    },
    eyeIcon: { paddingHorizontal: 12 },
    submitButton: {
        backgroundColor: '#007AFF',
        height: 50,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 16,
    },
    submitButtonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
    toggleContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
    toggleText: { fontSize: 16, marginRight: 6 },
    toggleLink: { fontSize: 16, fontWeight: '600', color: '#007AFF' },
});
