import { createContext, useContext, useEffect, useState, } from "react";
import * as SecureStore from "expo-secure-store";
const AuthContext = createContext(undefined);
const PIN_KEY = "lifesync_pin";
export const AuthProvider = ({ children }) => {
    const [hasPin, setHasPin] = useState(false);
    const [isLocked, setIsLocked] = useState(true);
    const [isLoading, setIsLoading] = useState(true);
    useEffect(() => {
        const loadAuth = async () => {
            try {
                const savedPin = await SecureStore.getItemAsync(PIN_KEY);
                setHasPin(savedPin !== null);
            }
            catch (error) {
                console.log("Authentication loading error:", error);
            }
            finally {
                setIsLoading(false);
            }
        };
        loadAuth();
    }, []);
    const setupPin = async (pin) => {
        if (!/^\d{4}$/.test(pin)) {
            throw new Error("PIN must contain exactly 4 digits.");
        }
        await SecureStore.setItemAsync(PIN_KEY, pin);
        setHasPin(true);
        setIsLocked(false);
    };
    const verifyPin = async (pin) => {
        const savedPin = await SecureStore.getItemAsync(PIN_KEY);
        if (savedPin === pin) {
            setIsLocked(false);
            return true;
        }
        return false;
    };
    const changePin = async (newPin) => {
        if (!/^\d{4}$/.test(newPin)) {
            throw new Error("PIN must contain exactly 4 digits.");
        }
        if (!hasPin) {
            throw new Error("No PIN has been configured.");
        }
        await SecureStore.setItemAsync(PIN_KEY, newPin);
    };
    const lockApp = () => {
        setIsLocked(true);
    };
    return (<AuthContext.Provider value={{
            hasPin,
            isLocked,
            isLoading,
            setupPin,
            verifyPin,
            changePin,
            lockApp,
        }}>
      {children}
    </AuthContext.Provider>);
};
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used inside AuthProvider");
    }
    return context;
};
