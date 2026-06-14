import React, { useState } from 'react';
import { View, Button, Text, ActivityIndicator } from 'react-native';
import { startTelegramLogin, clearMobileAuthSession } from '../services/mobileAuth';
import { useAuthStore } from '../store/useAuthStore';

export const AuthScreen: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { userId, isNewUser, setPendingWebViewCustomToken } = useAuthStore();

    const handleLogin = async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await startTelegramLogin();
            setPendingWebViewCustomToken(result.customToken);
        } catch (e: any) {
            setError(e.message || 'Login failed');
        } finally {
            setLoading(false);
        }
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
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            {userId ? (
                <View>
                    <Text>Logged in as: {userId}</Text>
                    <Text>Is New User: {isNewUser ? 'Yes' : 'No'}</Text>
                    {loading ? <ActivityIndicator /> : <Button title="Logout" onPress={handleLogout} />}
                </View>
            ) : (
                <View>
                    {loading ? <ActivityIndicator/> : <Button title="Login with Telegram" onPress={handleLogin} />}
                    {error && <Text style={{ color: 'red' }}>{error}</Text>}
                </View>
            )}
        </View>
    );
};
