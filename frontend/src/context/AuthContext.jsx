import { createContext, useContext, useEffect, useState } from "react";
import { authApi } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => {
        const savedUser = localStorage.getItem("user");
        return savedUser ? JSON.parse(savedUser) : null;
    });

    const [loading, setLoading] = useState(false);

    async function login(email, password) {
        setLoading(true);

        try {
            const response = await authApi.login({
                email,
                password,
            });

            const data = response.data;

            localStorage.setItem("access_token", data.access_token);
            localStorage.setItem("refresh_token", data.refresh_token);
            localStorage.setItem("user", JSON.stringify(data.user));

            setUser(data.user);

            return data.user;
        } finally {
            setLoading(false);
        }
    }

    async function register(name, email, password) {
        setLoading(true);

        try {
            const response = await authApi.register({
                name,
                email,
                password,
            });

            const data = response.data;

            localStorage.setItem("access_token", data.access_token);
            localStorage.setItem("refresh_token", data.refresh_token);
            localStorage.setItem("user", JSON.stringify(data.user));

            setUser(data.user);

            return data.user;
        } finally {
            setLoading(false);
        }
    }

    async function logout() {
        const refreshToken = localStorage.getItem("refresh_token");

        try {
            if (refreshToken) {
                await authApi.logout(refreshToken);
            }
        } catch (error) {
            console.error("Logout error:", error);
        }

        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("user");

        setUser(null);
    }

    useEffect(() => {
        async function verifyUser() {
            const token = localStorage.getItem("access_token");

            if (!token) {
                return;
            }

            try {
                const response = await authApi.me();
                setUser(response.data);
                localStorage.setItem("user", JSON.stringify(response.data));
            } catch {
                localStorage.removeItem("access_token");
                localStorage.removeItem("refresh_token");
                localStorage.removeItem("user");
                setUser(null);
            }
        }

        verifyUser();
    }, []);

    return (
        <AuthContext.Provider
            value={{
                user,
                loading,
                login,
                register,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
