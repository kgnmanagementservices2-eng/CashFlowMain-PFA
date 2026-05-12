
import React, { useState, useEffect } from "react";
import api from "../services/api.js";

export default function NotificationPopup({ market }) {
  const [notifications, setNotifications] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!market) return;

    const fetchNotes = async () => {
      try {
        const data = await api.getNotifications(market?.toLowerCase());;
        setNotifications(data || []);
      } catch (e) {
        console.error("Failed to load notifications");
      }
    };

    fetchNotes();
    const interval = setInterval(fetchNotes, 30000);
    return () => clearInterval(interval);
  }, [market]);

  const handleDismiss = async () => {
    if (!notifications.length) return;

    const currentNote = notifications[currentIndex];
    const updated = notifications.filter((_, i) => i !== currentIndex);
    setNotifications(updated);

    if (currentIndex >= updated.length) {
      setCurrentIndex(Math.max(0, updated.length - 1));
    }

    try {
      await api.dismissNotification(currentNote.id);
    } catch (e) {
      console.error("Failed to dismiss on server");
    }
  };

  if (!notifications.length) return null;

  const current = notifications[currentIndex];
  const progress = ((currentIndex + 1) / notifications.length) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">

      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">

        {/* HEADER */}
        <div className="flex items-center justify-between px-5 py-4 bg-slate-50 border-b">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 flex items-center justify-center rounded-full bg-blue-100 text-blue-600 text-lg">
              🔔
            </div>
            <h3 className="text-lg font-semibold text-slate-800">
              Notification
            </h3>
          </div>

          <span className="text-xs font-medium bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full">
            {notifications.length} pending
          </span>
        </div>

        {/* PROGRESS BAR */}
        <div className="h-[3px] bg-slate-200">
          <div
            className="h-full bg-blue-600 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* CONTENT */}
        <div className="px-6 py-5 space-y-3">

          {/* Meta Info */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            {current.store && (
              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
                {current.store}
              </span>
            )}
            <span>•</span>
            <span>{new Date(current.created_at).toLocaleString()}</span>
          </div>

          {/* Message Box */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-slate-800 text-base leading-relaxed font-medium">
              {current.message}
            </p>
          </div>
        </div>

        {/* FOOTER */}
        <div className="flex items-center justify-between px-5 py-4 bg-slate-50 border-t">

          <span className="text-xs text-slate-500">
            {currentIndex + 1} / {notifications.length}
          </span>

          <div className="flex gap-2">
            <button
              onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
              disabled={currentIndex === 0}
              className="px-3 py-1.5 text-sm rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-40 transition"
            >
              Prev
            </button>

            <button
              onClick={() => setCurrentIndex(i => Math.min(notifications.length - 1, i + 1))}
              disabled={currentIndex === notifications.length - 1}
              className="px-3 py-1.5 text-sm rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-40 transition"
            >
              Next
            </button>

            <button
              onClick={handleDismiss}
              className="px-4 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-semibold shadow hover:bg-blue-700 transition"
            >
              Dismiss
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
