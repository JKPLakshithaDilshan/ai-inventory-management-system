import { createContext, useContext, useEffect, useRef, useState } from "react"

type Theme = "dark" | "light" | "system"

type ThemeProviderProps = {
    children: React.ReactNode
    defaultTheme?: Theme
    storageKey?: string
}

type ThemeProviderState = {
    theme: Theme
    setTheme: (theme: Theme) => void
}

const ThemeProviderContext = createContext<ThemeProviderState | undefined>(undefined)

export function ThemeProvider({
    children,
    defaultTheme = "system",
    storageKey = "vite-ui-theme",
    ...props
}: ThemeProviderProps) {
    const isInitialMount = useRef(true)
    const [theme, setTheme] = useState<Theme>(() => {
        const storedTheme = localStorage.getItem(storageKey)
        if (storedTheme === "light" || storedTheme === "dark" || storedTheme === "system") {
            return storedTheme
        }
        return defaultTheme
    })

    useEffect(() => {
        const root = window.document.documentElement
        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
        let transitionTimeout: number | undefined

        const applyTheme = (activeTheme: Theme) => {
            const resolvedTheme = activeTheme === "system"
                ? (mediaQuery.matches ? "dark" : "light")
                : activeTheme

            if (!isInitialMount.current) {
                root.classList.add("theme-changing")
                transitionTimeout = window.setTimeout(() => {
                    root.classList.remove("theme-changing")
                }, 220)
            }

            root.classList.remove("light", "dark")
            root.classList.add(resolvedTheme)
            root.setAttribute("data-theme", resolvedTheme)
        }

        applyTheme(theme)
        isInitialMount.current = false

        if (theme !== "system") {
            return () => {
                if (transitionTimeout) {
                    window.clearTimeout(transitionTimeout)
                }
                root.classList.remove("theme-changing")
            }
        }

        const handleChange = () => applyTheme("system")
        mediaQuery.addEventListener("change", handleChange)
        return () => {
            mediaQuery.removeEventListener("change", handleChange)
            if (transitionTimeout) {
                window.clearTimeout(transitionTimeout)
            }
            root.classList.remove("theme-changing")
        }
    }, [theme])

    const value = {
        theme,
        setTheme: (theme: Theme) => {
            localStorage.setItem(storageKey, theme)
            setTheme(theme)
        },
    }

    return (
        <ThemeProviderContext.Provider {...props} value={value}>
            {children}
        </ThemeProviderContext.Provider>
    )
}

export const useTheme = () => {
    const context = useContext(ThemeProviderContext)

    if (context === undefined)
        throw new Error("useTheme must be used within a ThemeProvider")

    return context
}
