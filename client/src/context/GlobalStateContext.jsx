
import React, {
  useState,
  useEffect,
  useContext,
  createContext,
  useCallback,
} from "react";
import { useAuth } from "./AuthContext.jsx";
import api from "../services/api.js";

const GlobalStateContext = createContext(null);

const MARKET_KEY = "selected_market";
const STORE_KEY = "selected_store";

const normalize = (s) => (s ?? "").toString().trim().toLowerCase();

export function GlobalStateProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const role = user?.role;
  
  // 1. UPDATED ROLES: Match the new PostgreSQL ENUMs
  const isAdmin = role === "admin";
  const hasGlobalAccess = ["admin", "expense_commission_manager", "payroll_manager"].includes(role);
  
  // 2. UPDATED LOCK: Only "market_manager" is locked to a single market
  const isLockedManager = role === "market_manager";
  const userMarket = isLockedManager && user?.market ? normalize(user.market) : null;

  const [markets, setMarkets] = useState([]);
  const [stores, setStores] = useState([]);
  const [selectedMarket, setSelectedMarket] = useState(() =>
    normalize(userMarket || localStorage.getItem(MARKET_KEY) || "")
  );
  const [selectedStore, setSelectedStore] = useState(() =>
    normalize(localStorage.getItem(STORE_KEY) || "")
  );
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);
  const [pendingPayrollCount, setPendingPayrollCount] = useState(0);
  const [pendingCommissionCount, setPendingCommissionCount] = useState(0);

  const fetchMarkets = useCallback(async () => {
    // If they are a locked market manager, they only get their assigned market
    if (userMarket) {
      setMarkets([userMarket]);
      setSelectedMarket(userMarket);
      return;
    }

    try {
      const marketList = await api.getMarkets();
      const marketNames = (marketList || []).sort();
      setMarkets(marketNames);

      const savedMarket = normalize(localStorage.getItem(MARKET_KEY));
      if (
        savedMarket &&
        marketNames.map((m) => normalize(m)).includes(savedMarket)
      ) {
        setSelectedMarket(savedMarket);
      }
    } catch (err) {
      console.error("Failed to fetch markets", err);
      setMarkets([]);
    }
  }, [userMarket]);

  const fetchStores = useCallback(async (market) => {
    try {
      // 3. UPDATED: api.getStores() now maps to /api/meta/stores under the hood
      const storeList = await api.getStores(market || "");
      const storeNames = (storeList || [])
        .map((s) => s.code || s)
        .filter(Boolean)
        .sort();
      setStores(storeNames);

      const savedStore = normalize(localStorage.getItem(STORE_KEY));
      if (
        !savedStore ||
        !storeNames.map((s) => normalize(s)).includes(savedStore)
      ) {
        setSelectedStore("");
        localStorage.removeItem(STORE_KEY);
      } else {
        setSelectedStore(savedStore);
      }
    } catch (err) {
      console.error("Failed to fetch stores", err);
      setStores([]);
    }
  }, []);

const refreshPendingBadge = useCallback(async () => {
  if (!isAuthenticated) return;

  try {
    const res = await api.getPendingCounts({
      market: selectedMarket || undefined,
    });

    const data = res.data || {};

    setPendingApprovalsCount(data.expenses || 0);
    setPendingPayrollCount(data.payroll || 0);
    setPendingCommissionCount(data.commission || 0);

  } catch (err) {
    console.error("Failed to refresh pending badge", err);
    setPendingApprovalsCount(0);
    setPendingPayrollCount(0);
    setPendingCommissionCount(0);
  }
}, [isAuthenticated, selectedMarket]);
  // Load markets when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchMarkets();
    }
  }, [isAuthenticated, fetchMarkets]);

  // Load stores when market changes
  useEffect(() => {
    if (isAuthenticated && selectedMarket) {
      fetchStores(selectedMarket);
    }
  }, [isAuthenticated, selectedMarket, fetchStores]);

  // Refresh badges when market/auth changes
  useEffect(() => {
    if (isAuthenticated) {
      refreshPendingBadge();
    }
  }, [isAuthenticated, selectedMarket, refreshPendingBadge]);

  const handleSetSelectedMarket = (market) => {
    // Prevent a locked manager from switching markets via UI manipulation
    if (isLockedManager && userMarket) return; 
    const newMarket = normalize(market);
    setSelectedMarket(newMarket);
    localStorage.setItem(MARKET_KEY, newMarket);
  };

  const handleSetSelectedStore = (store) => {
    const newStore = normalize(store);
    setSelectedStore(newStore);
    localStorage.setItem(STORE_KEY, newStore);
  };

  const value = {
    markets,
    stores,
    selectedMarket,
    selectedStore,
    setSelectedMarket: handleSetSelectedMarket,
    setSelectedStore: handleSetSelectedStore,
    pendingApprovalsCount,
    pendingPayrollCount,
    pendingCommissionCount,
    refreshPendingBadge,
    isAdmin,
    hasGlobalAccess, // NEW: Exported so other components know if user can see everything
    isLockedManager,
  };

  return (
    <GlobalStateContext.Provider value={value}>
      {children}
    </GlobalStateContext.Provider>
  );
}

export const useGlobalState = () => {
  const context = useContext(GlobalStateContext);
  if (!context) {
    throw new Error("useGlobalState must be used within GlobalStateProvider");
  }
  return context;
};