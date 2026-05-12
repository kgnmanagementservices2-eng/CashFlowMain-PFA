
// import React, { useState, useEffect, useRef } from "react";
// import { useAuth } from "../../context/AuthContext.jsx";
// import { useGlobalState } from "../../context/GlobalStateContext.jsx";
// import { BellIcon, MenuIcon } from "../icons/Icons.jsx";
// import api from "../../services/api.js";

// // Simple Back Arrow Icon
// const ArrowLeftIcon = ({ className }) => (
//   <svg
//     xmlns="http://www.w3.org/2000/svg"
//     viewBox="0 0 24 24"
//     fill="none"
//     stroke="currentColor"
//     strokeWidth="2"
//     strokeLinecap="round"
//     strokeLinejoin="round"
//     className={className}
//   >
//     <path d="M19 12H5" />
//     <path d="M12 19l-7-7 7-7" />
//   </svg>
// );

// export default function Header({
//   onNavigate,
//   onBack,
//   canGoBack,
//   pageTitle,
//   pageSubtitle,
//   onToggleSidebar,
// }) {
//   const { user, logout } = useAuth();
//   const { selectedMarket } = useGlobalState();

//   const [showNotifications, setShowNotifications] = useState(false);
//   const [notifications, setNotifications] = useState([]);
//   const [loading, setLoading] = useState(false);

//   const dropdownRef = useRef(null);

//   const displayName =
//     user?.fullName || user?.email?.split("@")[0] || "User";

//   // 🔔 FETCH NOTIFICATIONS
//   const fetchNotifications = async () => {
//     try {
//       setLoading(true);
//       const data = await api.getNotifications({
//         market: selectedMarket,
//       });
//       setNotifications(data || []);
//     } catch (err) {
//       console.error("Failed to fetch notifications", err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   // 🔁 AUTO REFRESH (every 60s)
//   useEffect(() => {
//     fetchNotifications();
//     const interval = setInterval(fetchNotifications, 60000);
//     return () => clearInterval(interval);
//   }, [selectedMarket]);

//   // ❌ CLOSE ON OUTSIDE CLICK
//   useEffect(() => {
//     const handleClickOutside = (e) => {
//       if (
//         dropdownRef.current &&
//         !dropdownRef.current.contains(e.target)
//       ) {
//         setShowNotifications(false);
//       }
//     };

//     document.addEventListener("mousedown", handleClickOutside);
//     return () =>
//       document.removeEventListener("mousedown", handleClickOutside);
//   }, []);

//   // ✅ DISMISS NOTIFICATION
//   const handleDismiss = async (id) => {
//     try {
//       await api.dismissNotification(id);
//       setNotifications((prev) => prev.filter((n) => n.id !== id));
//     } catch (err) {
//       console.error("Dismiss failed", err);
//     }
//   };

//   const handleLogout = () => {
//     logout();
//     onNavigate("login");
//   };

//   return (
//     <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30 shadow-sm">
//       <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 h-16 flex items-center justify-between gap-3">
        
//         {/* LEFT */}
//         <div className="flex items-center min-w-0 gap-3">
//           <button
//             onClick={onToggleSidebar}
//             className="lg:hidden p-2 -ml-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl"
//           >
//             <MenuIcon className="w-6 h-6" />
//           </button>

//           {canGoBack && (
//             <button
//               onClick={onBack}
//               className="hidden sm:flex p-2 text-slate-500 hover:bg-slate-100 rounded-full"
//             >
//               <ArrowLeftIcon className="w-5 h-5" />
//             </button>
//           )}

//           <div className="flex flex-col min-w-0">
//             <h1 className="text-base sm:text-lg lg:text-xl font-bold text-slate-900 truncate">
//               {pageTitle}
//             </h1>
//             {pageSubtitle && (
//               <p className="text-xs text-slate-500 truncate">
//                 {pageSubtitle}
//               </p>
//             )}
//           </div>
//         </div>

//         {/* RIGHT */}
//         <div className="flex items-center gap-3 relative">

//           {/* 🔔 NOTIFICATIONS */}
//           <div ref={dropdownRef} className="relative">
//             <button
//               onClick={() => {
//                 setShowNotifications((prev) => !prev);
//                 if (!showNotifications) fetchNotifications();
//               }}
//               className="relative p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full"
//             >
//               <BellIcon className="w-6 h-6" />

//               {notifications.length > 0 && (
//                 <span className="absolute top-1 right-1 min-w-[16px] h-[16px] px-1 bg-red-500 text-white text-[10px] flex items-center justify-center rounded-full">
//                   {notifications.length}
//                 </span>
//               )}
//             </button>

//             {/* 🔽 DROPDOWN */}
//             {showNotifications && (
//               <div className="absolute right-0 mt-3 w-96 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden">
                
//                 {/* HEADER */}
//                 <div className="px-4 py-3 border-b flex justify-between">
//                   <h3 className="text-sm font-semibold text-slate-800">
//                     Notifications
//                   </h3>
//                   <span className="text-xs text-slate-500">
//                     {notifications.length} unread
//                   </span>
//                 </div>

//                 {/* LIST */}
//                 <div className="max-h-96 overflow-y-auto">
//                   {loading ? (
//                     <p className="p-4 text-sm text-slate-500">
//                       Loading...
//                     </p>
//                   ) : notifications.length === 0 ? (
//                     <p className="p-4 text-sm text-slate-500">
//                       No new notifications
//                     </p>
//                   ) : (
//                     notifications.map((n) => (
//                       <div
//                         key={n.id}
//                         className="p-4 border-b hover:bg-slate-50 transition"
//                       >
//                         <p className="text-sm font-medium text-slate-800">
//                           {n.title || "Notification"}
//                         </p>

//                         <p className="text-xs text-slate-500 mt-1">
//                           {n.message}
//                         </p>

//                         <div className="flex justify-between items-center mt-2">
//                           <span className="text-[10px] text-slate-400">
//                             {new Date(n.created_at).toLocaleString()}
//                           </span>

//                           <button
//                             onClick={() => handleDismiss(n.id)}
//                             className="text-xs text-indigo-600 hover:underline"
//                           >
//                             Mark as read
//                           </button>
//                         </div>
//                       </div>
//                     ))
//                   )}
//                 </div>

//                 {/* FOOTER */}
//                 <div className="p-2 text-center border-t">
//                   <button
//                     onClick={() => onNavigate("notifications")}
//                     className="text-xs text-indigo-600 hover:underline"
//                   >
//                     View all
//                   </button>
//                 </div>
//               </div>
//             )}
//           </div>

//           {/* 👤 USER */}
//           <div className="flex items-center gap-3 bg-white px-3 py-2 rounded-2xl border shadow-sm">
//             <div className="w-9 h-9 flex items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 text-white font-semibold">
//               {displayName.charAt(0).toUpperCase()}
//             </div>

//             <div className="hidden sm:block">
//               <p className="text-sm font-semibold text-slate-800">
//                 {displayName}
//               </p>
//               <p className="text-xs text-slate-500">Signed in</p>
//             </div>
//           </div>

//           {/* 🚪 LOGOUT */}
//           <button
//             onClick={handleLogout}
//             className="bg-slate-900 hover:bg-slate-950 text-white px-4 py-2 rounded-2xl text-sm font-semibold"
//           >
//             Logout
//           </button>
//         </div>
//       </div>
//     </header>
//   );
// }
import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import { useGlobalState } from "../../context/GlobalStateContext.jsx";
import { BellIcon, MenuIcon } from "../icons/Icons.jsx";
import api from "../../services/api.js";

// Back Arrow Icon
const ArrowLeftIcon = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M19 12H5" />
    <path d="M12 19l-7-7 7-7" />
  </svg>
);

export default function Header({
  onNavigate,
  onBack,
  canGoBack,
  pageTitle,
  pageSubtitle,
  onToggleSidebar,
}) {
  const { user, logout } = useAuth();
  const { selectedMarket } = useGlobalState();

  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  const dropdownRef = useRef(null);
  const prevCountRef = useRef(0);

  // 🔊 Notification sound
  const notificationSound = useRef(null);

  useEffect(() => {
    notificationSound.current = new Audio("../../assets/notification.mp3");
  }, []);

  const displayName =
    user?.fullName || user?.email?.split("@")[0] || "User";

  // 🔔 Fetch Notifications
  const fetchNotifications = async () => {
    try {
      setLoading(true);

      const data = await api.getNotifications({
        market: selectedMarket,
      });

      const newCount = data?.length || 0;
      const prevCount = prevCountRef.current;

      // 🔊 Play sound only when NEW notifications arrive
      if (newCount > prevCount && prevCount !== 0) {
        notificationSound.current?.play().catch(() => {});
      }

      prevCountRef.current = newCount;
      setNotifications(data || []);
    } catch (err) {
      console.error("Failed to fetch notifications", err);
    } finally {
      setLoading(false);
    }
  };

  // 🔁 Auto refresh every 60s
useEffect(() => {
  fetchNotifications();
}, [selectedMarket]);

  // ❌ Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target)
      ) {
        setShowNotifications(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ✅ Dismiss single notification
  const handleDismiss = async (id) => {
    try {
      await api.dismissNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error("Dismiss failed", err);
    }
  };

  // 🧹 Clear all notifications
  const handleClearAll = async () => {
    try {
      await api.clearAllNotifications(selectedMarket);
      setNotifications([]);
      prevCountRef.current = 0;
    } catch (err) {
      console.error("Clear all failed", err);
    }
  };

  const handleLogout = () => {
    logout();
    onNavigate("login");
  };

  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30 shadow-sm">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 h-16 flex items-center justify-between gap-3">
        
        {/* LEFT */}
        <div className="flex items-center min-w-0 gap-3">
          <button
            onClick={onToggleSidebar}
            className="lg:hidden p-2 -ml-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl"
          >
            <MenuIcon className="w-6 h-6" />
          </button>

          {canGoBack && (
            <button
              onClick={onBack}
              className="hidden sm:flex p-2 text-slate-500 hover:bg-slate-100 rounded-full"
            >
              <ArrowLeftIcon className="w-5 h-5" />
            </button>
          )}

          <div className="flex flex-col min-w-0">
            <h1 className="text-base sm:text-lg lg:text-xl font-bold text-slate-900 truncate">
              {pageTitle}
            </h1>
            {pageSubtitle && (
              <p className="text-xs text-slate-500 truncate">
                {pageSubtitle}
              </p>
            )}
          </div>
        </div>

        {/* RIGHT */}
        <div className="flex items-center gap-3 relative">

          {/* 🔔 Notifications */}
          <div ref={dropdownRef} className="relative">
            <button
              onClick={() => {
                setShowNotifications((prev) => !prev);
                if (!showNotifications) fetchNotifications();
              }}
              className="relative p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full"
            >
              <BellIcon className="w-6 h-6" />

              {notifications.length > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-[16px] px-1 bg-red-500 text-white text-[10px] flex items-center justify-center rounded-full">
                  {notifications.length}
                </span>
              )}
            </button>

            {/* Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-3 w-96 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden">

                {/* Header */}
                <div className="px-4 py-3 border-b flex justify-between items-center">
                  <h3 className="text-sm font-semibold text-slate-800">
                    Notifications
                  </h3>

                  {notifications.length > 0 && (
                    <button
                      onClick={handleClearAll}
                      className="text-xs text-red-600 hover:underline font-medium"
                    >
                      Clear all
                    </button>
                  )}
                </div>

                {/* List */}
                <div className="max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 hover:scrollbar-thumb-slate-400">

                  {loading ? (
                    <p className="p-4 text-sm text-slate-500">
                      Loading...
                    </p>
                  ) : notifications.length === 0 ? (
                    <p className="p-4 text-sm text-slate-500">
                      No new notifications
                    </p>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        className="p-4 border-b hover:bg-slate-50 transition"
                      >
                        <p className="text-sm font-medium text-slate-800">
                          {n.title || "Notification"}
                        </p>

                        <p className="text-xs text-slate-500 mt-1">
                          {n.message}
                        </p>

                        <div className="flex justify-between items-center mt-2">
                          <span className="text-[10px] text-slate-400">
                            {new Date(n.created_at).toLocaleString()}
                          </span>

                          <button
                            onClick={() => handleDismiss(n.id)}
                            className="text-xs text-indigo-600 hover:underline"
                          >
                            Mark as read
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 👤 User */}
          <div className="flex items-center gap-3 bg-white px-3 py-2 rounded-2xl border shadow-sm">
            <div className="w-9 h-9 flex items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 text-white font-semibold">
              {displayName.charAt(0).toUpperCase()}
            </div>

            <div className="hidden sm:block">
              <p className="text-sm font-semibold text-slate-800">
                {displayName}
              </p>
              <p className="text-xs text-slate-500">Signed in</p>
            </div>
          </div>

          {/* 🚪 Logout */}
          <button
            onClick={handleLogout}
            className="bg-slate-900 hover:bg-slate-950 text-white px-4 py-2 rounded-2xl text-sm font-semibold"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}