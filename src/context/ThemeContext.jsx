import { createContext, useContext, useEffect, useMemo, useState, } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColorScheme } from "react-native";
import { Colors } from "../constants/colors";
const ThemeContext = createContext(undefined);
export const ThemeProvider = ({ children }) => {
    const systemTheme = useColorScheme();
    const [themeMode, setThemeModeState] = useState("system");
    useEffect(() => {
        const loadTheme = async () => {
            try {
                const savedTheme = await AsyncStorage.getItem("appTheme");
                if (savedTheme === "light" ||
                    savedTheme === "dark" ||
                    savedTheme === "system") {
                    setThemeModeState(savedTheme);
                }
            }
            catch (error) {
                console.log("Error loading theme:", error);
            }
        };
        loadTheme();
    }, []);
    const setThemeMode = async (mode) => {
        try {
            await AsyncStorage.setItem("appTheme", mode);
            setThemeModeState(mode);
        }
        catch (error) {
            console.log("Error saving theme:", error);
        }
    };
    const isDark = themeMode === "system"
        ? systemTheme === "dark"
        : themeMode === "dark";
    const colors = isDark ? Colors.dark : Colors.light;
    const value = useMemo(() => ({
        themeMode,
        isDark,
        colors,
        setThemeMode,
    }), [themeMode, isDark]);
    return (<ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>);
};
export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error("useTheme must be used inside ThemeProvider");
    }
    return context;
};
