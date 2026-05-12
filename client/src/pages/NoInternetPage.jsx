
export default function NoInternetPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col items-center justify-center p-8 overflow-hidden relative">
      
      {/* WiFi Logo with pulse animation */}
      <div className="mb-8">
        <svg
          className="w-24 h-24 text-white animate-pulse"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8.53 16.11a5 5 0 016.94 0M5.11 12.7a9 9 0 0113.78 0M2.04 9.27a13 13 0 0119.92 0M12 20.5v.01"
          />
        </svg>
      </div>

        {/* Title with gradient text */}
        <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent mb-6 animate-gradient-shift">
          No Connection
        </h1>

        {/* Subtitle */}
        <p className="text-xl md:text-2xl font-medium text-slate-300 mb-2 leading-tight">
          You're currently offline
        </p>
        <p className="text-slate-400 text-lg mb-12">
          Please check your internet connection and refresh the page.
        </p>

        {/* Animated status indicator */}
        <div className="flex items-center space-x-3 mb-8">
          <div className="w-4 h-4 bg-red-400 rounded-full animate-ping"></div>
          <span className="text-sm font-mono text-slate-400 tracking-wider uppercase">Disconnected</span>
        </div>


        {/* Bottom decorative element */}
        <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-gradient-to-tr from-purple-500/10 to-transparent rounded-full blur-xl animate-spin-slow"></div>
        <div className="absolute -bottom-4 left-1/4 w-20 h-20 bg-gradient-to-tl from-blue-400/10 to-transparent rounded-full blur-lg"></div>
        <p className="absolute bottom-8 text-sm text-slate-500 font-mono tracking-wider animate-pulse">
        Waiting for connection...
      </p>
      </div>

  );
}
