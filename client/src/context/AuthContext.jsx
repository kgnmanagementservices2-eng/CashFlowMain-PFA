// // export const useAuth = () => useContext(AuthContext);
// import React, { useState, useEffect, useContext, createContext } from "react";
// import api from "../services/api.js";

// const AuthContext = createContext(null);

// export function AuthProvider({ children }) {
//   const [user, setUser] = useState(null);
//   const [token, setToken] = useState(null);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     // Logic from your /scripts/auth.js (ensureSession)
//     const loadSession = async () => {
//       try {
//         const storedToken = localStorage.getItem("token");
//         if (!storedToken) {
//           setLoading(false);
//           return;
//         }

//         // We don't need api.setToken() because api.js reads
//         // from localStorage automatically.

//         let user = null;
//         const storedUser = localStorage.getItem("user");
//         try {
//           user = JSON.parse(storedUser);
//         } catch {}

//         if (!user) {
//           // This fetch will now work because api.js's authHeaders
//           // will read the token from localStorage.
//           user = await api.me();
//           localStorage.setItem("user", JSON.stringify(user));
//         }

//         setToken(storedToken);
//         setUser(user);
//       } catch (err) {
//         console.error("Session validation failed:", err.message);
//         localStorage.removeItem("token");
//         localStorage.removeItem("user");
//       }
//       setLoading(false);
//     };

//     loadSession();
//   }, []);

//   const logout = () => {
//     localStorage.removeItem("token");
//     localStorage.removeItem("user");
//     setToken(null);
//     setUser(null);
//     // No need for api.setToken(null)
//   };

//   const value = {
//     user,
//     token,
//     logout,
//     isAuthenticated: !!token,
//     loading,
//     setToken,
//     setUser,
//   };

//   return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
// }

// export const useAuth = () => useContext(AuthContext);
import React, { useState, useEffect, useContext, createContext } from "react";
import api from "../services/api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // ✅ Initialize token from localStorage (IMPORTANT)
  const [token, setToken] = useState(() => localStorage.getItem("token") || null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 🔁 Load session on app start
  useEffect(() => {
    const loadSession = async () => {
      try {
        const storedToken = localStorage.getItem("token");

        if (!storedToken) {
          setLoading(false);
          return;
        }

        let storedUser = null;

        try {
          storedUser = JSON.parse(localStorage.getItem("user"));
        } catch {}

        // ✅ Use cached user if available
        if (storedUser) {
          setUser(storedUser);
        } else {
          // ✅ Fetch fresh user from backend
          const freshUser = await api.me();
          setUser(freshUser);
          localStorage.setItem("user", JSON.stringify(freshUser));
        }

        setToken(storedToken);
      } catch (err) {
        console.error("Session validation failed:", err.message);

        // ❌ Clean broken session
        localStorage.removeItem("token");
        localStorage.removeItem("user");

        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    loadSession();
  }, []);

  // ✅ LOGIN (Single source of truth)
  const login = (data) => {
    if (!data?.token || !data?.user) {
      console.error("Invalid login response");
      return;
    }

    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));

    setToken(data.token);
    setUser(data.user);
  };

  // ✅ LOGOUT
  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    setToken(null);
    setUser(null);

    // Optional: hard redirect (recommended for clean state)
    window.location.href = "/";
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!token,
    login,        // 🔥 use this everywhere
    logout,
    setUser,      // optional (for updates)
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);