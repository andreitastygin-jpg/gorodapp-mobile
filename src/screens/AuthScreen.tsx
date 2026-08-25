import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { startTelegramLogin, clearMobileAuthSession } from '../services/mobileAuth';
import { initiateMtsAuth, MtsAuthSession, validatePhone } from '../services/mtsAuth';
import { bootstrapDevicePushToken } from '../services/pushNotifications';
import { useAuthStore } from '../store/useAuthStore';

export const AuthScreen: React.FC = () => {
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);
    const [isPolling, setIsPolling] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { userId, isNewUser, setPendingWebViewAccessToken } = useAuthStore();

    const sessionRef = useRef<MtsAuthSession | null>(null);
    const startAbortControllerRef = useRef<AbortController | null>(null);

    // Abort active MTS session on unmount
    useEffect(() => {
        return () => {
            if (startAbortControllerRef.current) {
                startAbortControllerRef.current.abort();
            }
            if (sessionRef.current) {
                sessionRef.current.abort();
            }
        };
    }, []);

    const handleTelegramLogin = async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await startTelegramLogin();
            setPendingWebViewAccessToken(result.accessToken);
            bootstrapDevicePushToken().catch(() => {});
        } catch (e: any) {
            setError(e.message || 'Telegram login failed');
        } finally {
            setLoading(false);
        }
    };

    const handleMtsLogin = async () => {
        if (!validatePhone(phone)) {
            setError('Введите корректный номер телефона (10 или 11 цифр)');
            return;
        }

        setLoading(true);
        setError(null);

        // Abort any existing session or start request
        if (startAbortControllerRef.current) {
            startAbortControllerRef.current.abort();
            startAbortControllerRef.current = null;
        }
        if (sessionRef.current) {
            sessionRef.current.abort();
            sessionRef.current = null;
        }

        const startAbortController = new AbortController();
        startAbortControllerRef.current = startAbortController;

        try {
            const sessionId = await initiateMtsAuth(phone, startAbortController.signal);
            
            if (startAbortControllerRef.current === startAbortController) {
                startAbortControllerRef.current = null;
            }

            setIsPolling(true);

            // Instantiate polling session
            const session = new MtsAuthSession(
                sessionId,
                (token) => {
                    setPendingWebViewAccessToken(token);
                    setIsPolling(false);
                    setLoading(false);
                    bootstrapDevicePushToken().catch(() => {});
                },
                (errorMsg) => {
                    setError(errorMsg);
                    setIsPolling(false);
                    setLoading(false);
                }
            );

            sessionRef.current = session;
            session.startPolling();

        } catch (e: any) {
            if (e.name === 'AbortError') {
                return;
            }
            setError(e.message || 'MTS login failed');
            setLoading(false);
        }
    };

    const handleAbortMts = () => {
        if (startAbortControllerRef.current) {
            startAbortControllerRef.current.abort();
            startAbortControllerRef.current = null;
        }
        if (sessionRef.current) {
            sessionRef.current.abort();
            sessionRef.current = null;
        }
        setIsPolling(false);
        setLoading(false);
        setError(null);
    };

    const handleLogout = async () => {
        setLoading(true);
        try {
            await clearMobileAuthSession();
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.card}>
                <Text style={styles.header}>Вход в систему</Text>

                {userId ? (
                    <View style={styles.loggedInContainer}>
                        <Text style={styles.welcomeText}>Вы успешно вошли!</Text>
                        <Text style={styles.infoText}>ID пользователя: {userId}</Text>
                        <Text style={styles.infoText}>Новый пользователь: {isNewUser ? 'Да' : 'Нет'}</Text>
                        <View style={styles.buttonWrapper}>
                            {loading ? (
                                <ActivityIndicator color="#E11D48" />
                            ) : (
                                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                                    <Text style={styles.logoutButtonText}>Выйти</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                ) : isPolling ? (
                    <View style={styles.pollingContainer}>
                        <Text style={styles.pollingTitle}>Подтвердите вход на телефоне</Text>
                        <Text style={styles.pollingSubtitle}>Ожидаем подтверждения (SIM-PUSH / SMS)</Text>
                        <ActivityIndicator size="large" color="#E11D48" style={styles.spinner} />
                        <TouchableOpacity style={styles.cancelButton} onPress={handleAbortMts}>
                            <Text style={styles.cancelButtonText}>Отменить</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.formContainer}>
                        <Text style={styles.inputLabel}>Номер телефона</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="+7 (999) 999-99-99"
                            placeholderTextColor="#9CA3AF"
                            keyboardType="phone-pad"
                            value={phone}
                            onChangeText={setPhone}
                            editable={!loading}
                        />

                        {error && <Text style={styles.errorText}>{error}</Text>}

                        <View style={styles.buttonContainer}>
                            {loading ? (
                                <ActivityIndicator color="#E11D48" />
                            ) : (
                                <>
                                    <TouchableOpacity style={styles.mtsButton} onPress={handleMtsLogin}>
                                        <Text style={styles.mtsButtonText}>Войти с МТС ID</Text>
                                    </TouchableOpacity>

                                    <View style={styles.dividerContainer}>
                                        <View style={styles.dividerLine} />
                                        <Text style={styles.dividerText}>или</Text>
                                        <View style={styles.dividerLine} />
                                    </View>

                                    <TouchableOpacity style={styles.telegramButton} onPress={handleTelegramLogin}>
                                        <Text style={styles.telegramButtonText}>Войти через Telegram</Text>
                                    </TouchableOpacity>
                                </>
                            )}
                        </View>
                    </View>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        padding: 20,
    },
    card: {
        width: '100%',
        maxWidth: 400,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 24,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 3,
    },
    header: {
        fontSize: 22,
        fontWeight: '700',
        color: '#111827',
        textAlign: 'center',
        marginBottom: 24,
    },
    loggedInContainer: {
        alignItems: 'center',
        paddingVertical: 12,
    },
    welcomeText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#10B981',
        marginBottom: 12,
        textAlign: 'center',
    },
    infoText: {
        fontSize: 14,
        color: '#4B5563',
        marginBottom: 6,
        textAlign: 'center',
    },
    buttonWrapper: {
        marginTop: 24,
        width: '100%',
    },
    logoutButton: {
        backgroundColor: '#EF4444',
        borderRadius: 10,
        height: 48,
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoutButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    pollingContainer: {
        alignItems: 'center',
        paddingVertical: 16,
    },
    pollingTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1F2937',
        textAlign: 'center',
        marginBottom: 8,
    },
    pollingSubtitle: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        marginBottom: 24,
    },
    spinner: {
        marginBottom: 32,
    },
    cancelButton: {
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 10,
        height: 44,
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
    },
    cancelButtonText: {
        color: '#4B5563',
        fontSize: 14,
        fontWeight: '600',
    },
    formContainer: {
        width: '100%',
    },
    inputLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 6,
    },
    input: {
        height: 48,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 10,
        paddingHorizontal: 16,
        fontSize: 16,
        color: '#1F2937',
        backgroundColor: '#F9FAFB',
        marginBottom: 16,
    },
    errorText: {
        color: '#EF4444',
        fontSize: 13,
        marginBottom: 16,
        textAlign: 'center',
    },
    buttonContainer: {
        marginTop: 8,
    },
    mtsButton: {
        backgroundColor: '#E11D48',
        borderRadius: 10,
        height: 48,
        justifyContent: 'center',
        alignItems: 'center',
    },
    mtsButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    dividerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 20,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#E5E7EB',
    },
    dividerText: {
        marginHorizontal: 12,
        color: '#9CA3AF',
        fontSize: 14,
    },
    telegramButton: {
        backgroundColor: '#2563EB',
        borderRadius: 10,
        height: 48,
        justifyContent: 'center',
        alignItems: 'center',
    },
    telegramButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
});
