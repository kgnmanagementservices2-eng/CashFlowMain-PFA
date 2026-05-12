import React, { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import api from "../services/api.js";
import logo from "../assets/cashflow-logo.webp";

export default function LoginPage({ onNavigate }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // ✅ USE login METHOD (not setToken/setUser)
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await api.login(email.trim(), password);

      // ✅ SINGLE SOURCE OF TRUTH
      login(data);

      onNavigate("dashboard");
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0052D4] p-4 sm:p-8">
      
      {/* Main Split Card Container */}
      <div className="flex w-full max-w-5xl bg-white rounded-[2rem] shadow-2xl overflow-hidden min-h-[600px] relative z-10">
        
        {/* --- LEFT PANEL: Blue Bubbles & Welcome Text (Hidden on mobile) --- */}
        <div className="hidden md:flex md:w-1/2 relative bg-gradient-to-br from-[#0B63F6] to-[#003EA3] p-12 flex-col justify-center overflow-hidden">
          
          {/* Decorative CSS Bubbles */}
          <div className="absolute -top-32 -left-32 w-96 h-96 bg-gradient-to-br from-[#1E88E5] to-[#1565C0] rounded-full opacity-90 shadow-2xl"></div>
          <div className="absolute -bottom-24 -right-16 w-80 h-80 bg-gradient-to-tr from-[#023E8A] to-[#0077B6] rounded-full opacity-90 shadow-2xl"></div>
          <div className="absolute bottom-12 left-12 w-48 h-48 bg-[#00B4D8] rounded-full opacity-80 shadow-xl"></div>
          
          {/* Left Panel Content */}
          <div className="relative z-10 text-white mt-12">
            <h1 className="text-5xl font-extrabold mb-2 tracking-wide uppercase drop-shadow-md">
              Welcome
            </h1>
            <h2 className="text-xl font-bold mb-6 tracking-widest text-blue-100 uppercase drop-shadow-sm">
              To Cashflow Pro
            </h2>
            <p className="text-sm text-blue-50 leading-relaxed max-w-sm drop-shadow-sm">
              Sign in to access your financial dashboard. Manage your cashflow, track expenses, and forecast your business growth with precision.
            </p>
          </div>
        </div>

        {/* --- RIGHT PANEL: Form --- */}
        <div className="w-full md:w-1/2 p-8 sm:p-12 flex flex-col justify-center bg-white relative">
          <div className="max-w-md w-full mx-auto">
            
            {/* Logo Placement */}
            <div className="flex justify-start sm:justify-center mb-8">
              <img src={logo} alt="CashFlow Pro Logo" className="h-28 w-full object-contain" />
            </div>

            <h2 className="text-3xl font-bold text-slate-900 mb-1">Sign in</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Username / Email Input */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  {/* User Icon */}
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" fillRule="evenodd"></path></svg>
                </div>
                <input 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  placeholder="Email Address" 
                  autoComplete="email"
                  required 
                  className="w-full pl-12 pr-4 py-3.5 bg-[#F8F9FA] border border-transparent rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0B63F6] focus:bg-white transition-all" 
                />
              </div>

              {/* Password Input */}
{/* Password Input */}
<div className="relative">
  {/* Left Icon */}
  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
      <path
        d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2V7a3 3 0 00-6 0v2h6z"
        fillRule="evenodd"
        clipRule="evenodd"
      />
    </svg>
  </div>

  {/* Input */}
  <input
    type={showPassword ? "text" : "password"}
    value={password}
    onChange={(e) => setPassword(e.target.value)}
    placeholder="Password"
    autoComplete="current-password"
    required
    className="w-full pl-12 pr-16 py-3.5 bg-[#F8F9FA] border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0B63F6] focus:bg-white transition-all"
  />

  {/* Toggle Button */}
  <button
    type="button"
    onClick={() => setShowPassword((prev) => !prev)}
    aria-label={showPassword ? "Hide password" : "Show password"}
    className="absolute inset-y-0 right-3 flex items-center justify-center text-slate-500 hover:text-[#0B63F6] transition-colors"
  >
    {showPassword ? (
      // Eye Slash Icon
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074L3.707 2.293z"
          clipRule="evenodd"
        />
        <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
      </svg>
    ) : (
      // Eye Icon
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
        <path
          fillRule="evenodd"
          d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
          clipRule="evenodd"
        />
      </svg>
    )}
  </button>
</div>



              {/* Submit Button */}
              <button 
                type="submit" 
                className="w-full bg-[#1A365D] hover:bg-[#122543] text-white font-bold py-3.5 rounded-xl transition-all shadow-md active:scale-[0.98]"
              >
                Sign in
              </button>

              {/* Error Message */}
              {error && (
                <div className="p-3 mt-2 bg-rose-50 text-rose-600 text-xs font-semibold border border-rose-100 rounded-xl text-center">
                  {error}
                </div>
              )}

            </form>

            
          </div>
        </div>
      </div>
    </div>
  );
}
// import React, { useState } from "react";
// import { useAuth } from "../context/AuthContext.jsx";
// import api from "../services/api.js";

// // Make sure to save the new logo in your assets folder with this name!
// import logo from "../assets/cashflow-logo.webp";

// export default function LoginPage({ onNavigate }) {
//   const [email, setEmail] = useState(""); 
//   const [password, setPassword] = useState("");
//   const [showPassword, setShowPassword] = useState(false);
//   const [error, setError] = useState("");

//   const { setToken, setUser } = useAuth();

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setError("");
//     try {
//       const data = await api.login(email.trim(), password);

//       // Save to local storage
//       localStorage.setItem("token", data.token);
//       localStorage.setItem("user", JSON.stringify(data.user));

//       // Update Auth Context
//       setToken(data.token);
//       setUser(data.user);
//       onNavigate("dashboard");
//     } catch (err) {
//       setError(err.message);
//     }
//   };

//   return (
//     <div className="min-h-screen flex items-center justify-center bg-[#0052D4] p-4 sm:p-8">
      
//       {/* Main Split Card Container */}
//       <div className="flex w-full max-w-5xl bg-white rounded-[2rem] shadow-2xl overflow-hidden min-h-[600px] relative z-10">
        
//         {/* --- LEFT PANEL: Blue Bubbles & Welcome Text (Hidden on mobile) --- */}
//         <div className="hidden md:flex md:w-1/2 relative bg-gradient-to-br from-[#0B63F6] to-[#003EA3] p-12 flex-col justify-center overflow-hidden">
          
//           {/* Decorative CSS Bubbles */}
//           <div className="absolute -top-32 -left-32 w-96 h-96 bg-gradient-to-br from-[#1E88E5] to-[#1565C0] rounded-full opacity-90 shadow-2xl"></div>
//           <div className="absolute -bottom-24 -right-16 w-80 h-80 bg-gradient-to-tr from-[#023E8A] to-[#0077B6] rounded-full opacity-90 shadow-2xl"></div>
//           <div className="absolute bottom-12 left-12 w-48 h-48 bg-[#00B4D8] rounded-full opacity-80 shadow-xl"></div>
          
//           {/* Left Panel Content */}
//           <div className="relative z-10 text-white mt-12">
//             <h1 className="text-5xl font-extrabold mb-2 tracking-wide uppercase drop-shadow-md">
//               Welcome
//             </h1>
//             <h2 className="text-xl font-bold mb-6 tracking-widest text-blue-100 uppercase drop-shadow-sm">
//               To Cashflow Pro
//             </h2>
//             <p className="text-sm text-blue-50 leading-relaxed max-w-sm drop-shadow-sm">
//               Sign in to access your financial dashboard. Manage your cashflow, track expenses, and forecast your business growth with precision.
//             </p>
//           </div>
//         </div>

//         {/* --- RIGHT PANEL: Form --- */}
//         <div className="w-full md:w-1/2 p-8 sm:p-12 flex flex-col justify-center bg-white relative">
//           <div className="max-w-md w-full mx-auto">
            
//             {/* Logo Placement */}
//             <div className="flex justify-start sm:justify-center mb-8">
//               <img src={logo} alt="CashFlow Pro Logo" className="h-28 w-full object-contain" />
//             </div>

//             <h2 className="text-3xl font-bold text-slate-900 mb-1">Sign in</h2>

//             <form onSubmit={handleSubmit} className="space-y-4">
              
//               {/* Username / Email Input */}
//               <div className="relative">
//                 <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
//                   {/* User Icon */}
//                   <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" fillRule="evenodd"></path></svg>
//                 </div>
//                 <input 
//                   type="email" 
//                   value={email} 
//                   onChange={(e) => setEmail(e.target.value)} 
//                   placeholder="Email Address" 
//                   autoComplete="email"
//                   required 
//                   className="w-full pl-12 pr-4 py-3.5 bg-[#F8F9FA] border border-transparent rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0B63F6] focus:bg-white transition-all" 
//                 />
//               </div>

//               {/* Password Input */}
//               <div className="relative">
//                 <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
//                   {/* Lock Icon */}
//                   <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" fillRule="evenodd"></path></svg>
//                 </div>
//                 <input 
//                   type={showPassword ? "text" : "password"} 
//                   value={password} 
//                   onChange={(e) => setPassword(e.target.value)} 
//                   placeholder="Password" 
//                   autoComplete="current-password"
//                   required 
//                   className="w-full pl-12 pr-20 py-3.5 bg-[#F8F9FA] border border-transparent rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0B63F6] focus:bg-white transition-all" 
//                 />
//                 <button 
//                   type="button" 
//                   onClick={() => setShowPassword(!showPassword)} 
//                   className="absolute inset-y-0 right-4 flex items-center text-[11px] font-bold text-[#0B63F6] hover:text-blue-800 tracking-wider uppercase"
//                 >
//                   {showPassword ? "Hide" : "Show"}
//                 </button>
//               </div>



//               {/* Submit Button */}
//               <button 
//                 type="submit" 
//                 className="w-full bg-[#1A365D] hover:bg-[#122543] text-white font-bold py-3.5 rounded-xl transition-all shadow-md active:scale-[0.98]"
//               >
//                 Sign in
//               </button>

//               {/* Error Message */}
//               {error && (
//                 <div className="p-3 mt-2 bg-rose-50 text-rose-600 text-xs font-semibold border border-rose-100 rounded-xl text-center">
//                   {error}
//                 </div>
//               )}

//             </form>

            
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }