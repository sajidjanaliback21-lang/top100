import React, { useState, useEffect } from "react";
import { 
  Tv, 
  Settings, 
  RefreshCw, 
  Database, 
  Terminal, 
  Copy, 
  Check, 
  Key, 
  Eye, 
  EyeOff, 
  Play, 
  Film, 
  FileDown, 
  Lock, 
  AlertTriangle,
  Info,
  Calendar,
  CloudLightning,
  Smartphone,
  ExternalLink
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { AppConfig, ProxyLog, MovieStream } from "./types";

const DEFAULT_CONFIG: AppConfig = {
  masterUrl: "http://sjstorestar4k.store",
  masterUsername: "mXoK4b6xEf",
  masterPassword: "iimmaculate5visit",
  customUsername: "Sajid123",
  customPassword: "SajidPassword",
  limitMoviesCount: 100
};

export default function App() {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<"dashboard" | "settings" | "movies" | "logs">("dashboard");

  // State Management
  const [config, setConfig] = useState<AppConfig>({
    masterUrl: "",
    masterUsername: "",
    masterPassword: "",
    customUsername: "",
    customPassword: "",
    limitMoviesCount: 100
  });

  const [savedConfig, setSavedConfig] = useState<AppConfig | null>(null);
  const [moviesData, setMoviesData] = useState<MovieStream[]>([]);
  const [logs, setLogs] = useState<ProxyLog[]>([]);
  const [stats, setStats] = useState({
    totalRequests: 0,
    activeCache: false,
    cachedMoviesCount: 0,
    cachedCategoriesCount: 0,
    cacheTimeRemaining: 0
  });

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Base API URLs
  const getBaseUrl = () => {
    // Dynamically retrieve URL
    return window.location.origin;
  };

  const appUrl = getBaseUrl();

  // Load everything on mount
  useEffect(() => {
    fetchConfig();
    fetchStats();
    fetchLogs();
    fetchMovies();

    // Auto-refresh stats and logs every 10 seconds
    const interval = setInterval(() => {
      fetchStats();
      fetchLogs();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await fetch("/api/config");
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
        setSavedConfig(data);
      }
    } catch (err) {
      console.error("Error fetching config:", err);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch("/api/logs");
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (err) {
      console.error("Error fetching logs:", err);
    }
  };

  const fetchMovies = async () => {
    try {
      const res = await fetch("/api/movies");
      if (res.ok) {
        const data = await res.json();
        setMoviesData(data.movies || []);
      }
    } catch (err) {
      console.error("Error fetching movies:", err);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveStatus(null);

    try {
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config)
      });

      if (res.ok) {
        const result = await res.json();
        setSaveStatus({ type: "success", message: result.message || "Settings saved successfully!" });
        setSavedConfig(config);
        
        // Refresh local views
        fetchStats();
        fetchMovies();
      } else {
        const errData = await res.json();
        setSaveStatus({ type: "error", message: errData.error || "Failed to update configuration." });
      }
    } catch (err) {
      setSaveStatus({ type: "error", message: "Network connection failure to the backend." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRefreshCache = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/cache/refresh", { method: "POST" });
      if (res.ok) {
        await fetchMovies();
        await fetchStats();
      }
    } catch (err) {
      console.error("Error refreshing cache:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleClearLogs = async () => {
    try {
      const res = await fetch("/api/logs/clear", { method: "POST" });
      if (res.ok) {
        setLogs([]);
        fetchStats();
      }
    } catch (err) {
      console.error("Error clearing logs:", err);
    }
  };

  const copyToClipboard = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Connection configurations to copy
  const xtreamHost = appUrl;
  const xtreamUser = config.customUsername || "Sajid123";
  const xtreamPass = config.customPassword || "SajidPassword";
  const m3uUrl = `${appUrl}/get.php?username=${xtreamUser}&password=${xtreamPass}`;

  // Filter movies
  const filteredMovies = moviesData.filter(movie => 
    movie.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#070a13] text-gray-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-[#0b0f19]/80 backdrop-blur-md sticky top-0 z-50 px-4 py-3">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600/10 border border-indigo-500/20 rounded-xl text-indigo-400">
              <Tv className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                Sajid IPTV Proxy Filter <span className="text-xs font-mono px-2 py-0.5 bg-green-500/10 border border-green-500/20 text-green-400 rounded-full">ACTIVE</span>
              </h1>
              <p className="text-xs text-gray-400">Streaming Filter Pro — Only serves the last 100 added movies</p>
            </div>
          </div>

          {/* Quick Stats Banner */}
          <div className="flex flex-wrap items-center gap-3 md:gap-6 bg-slate-900/50 border border-gray-800/80 px-4 py-2 rounded-xl text-xs">
            <div className="flex items-center gap-2">
              <Film className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-gray-400">Filtered Pool:</span>
              <span className="font-semibold text-white">{stats.cachedMoviesCount || 0} / {config.limitMoviesCount || 100} Movies</span>
            </div>
            <div className="w-px h-3.5 bg-gray-800 hidden sm:block" />
            <div className="flex items-center gap-2">
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-gray-400">Sync Status:</span>
              <span className="text-emerald-400 font-semibold">{stats.activeCache ? "Synced" : "Initializing"}</span>
            </div>
            <div className="w-px h-3.5 bg-gray-800 hidden sm:block" />
            <div className="flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 text-orange-400" />
              <span className="text-gray-400">Auto Refresh:</span>
              <span className="text-orange-400 font-semibold">Every 1 Hour</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Hand Sidebar Navigation */}
        <div className="lg:col-span-1 space-y-4">
          <nav className="bg-[#0b0f19] border border-gray-800 rounded-2xl p-2.5 space-y-1">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === "dashboard"
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/10"
                  : "text-gray-400 hover:text-white hover:bg-slate-900"
              }`}
            >
              <Tv className="w-4 h-4" />
              Dashboard & Setup
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === "settings"
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/10"
                  : "text-gray-400 hover:text-white hover:bg-slate-900"
              }`}
            >
              <Settings className="w-4 h-4" />
              Proxy Credentials
            </button>
            <button
              onClick={() => setActiveTab("movies")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === "movies"
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/10"
                  : "text-gray-400 hover:text-white hover:bg-slate-900"
              }`}
            >
              <Film className="w-4 h-4" />
              Filtered Movies List
              {moviesData.length > 0 && (
                <span className="ml-auto bg-indigo-500/20 text-indigo-300 text-[10px] px-2 py-0.5 rounded-full font-bold">
                  {moviesData.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("logs")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === "logs"
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/10"
                  : "text-gray-400 hover:text-white hover:bg-slate-900"
              }`}
            >
              <Terminal className="w-4 h-4" />
              Live Proxy Logs
              {logs.length > 0 && (
                <span className="ml-auto bg-green-500/20 text-green-300 text-[10px] px-2 py-0.5 rounded-full font-bold animate-pulse">
                  {logs.length}
                </span>
              )}
            </button>
          </nav>

          {/* Quick Instructions Mini Card */}
          <div className="bg-[#0b0f19] border border-gray-800 rounded-2xl p-4 space-y-3 text-xs text-gray-400">
            <h3 className="font-semibold text-gray-200 flex items-center gap-2">
              <Info className="w-3.5 h-3.5 text-indigo-400" />
              Hugging Face Space Hosting
            </h3>
            <p>
              This app is fully compatible to deploy on <strong className="text-gray-200">Hugging Face Spaces</strong> or any online server.
            </p>
            <p>
              Once linked, copy the custom proxy login details directly into your IPTV smart player apps!
            </p>
          </div>
        </div>

        {/* Right Hand Dynamic Workspace Area */}
        <div className="lg:col-span-3">
          <AnimatePresence mode="wait">
            
            {/* TAB 1: DASHBOARD & CONNECTION SETUP */}
            {activeTab === "dashboard" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="space-y-6"
              >
                {/* Intro banner */}
                <div className="bg-gradient-to-r from-slate-900 to-[#0e1629] border border-gray-800 rounded-2xl p-6 relative overflow-hidden">
                  <div className="absolute right-0 bottom-0 opacity-10 translate-y-12 translate-x-4">
                    <Tv className="w-64 h-64 text-indigo-400" />
                  </div>
                  <div className="relative z-10 max-w-xl space-y-3">
                    <span className="px-2.5 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-300 font-mono text-[10px] font-bold uppercase tracking-wider">
                      SETUP GUIDE & HOW-TO
                    </span>
                    <h2 className="text-2xl font-bold text-white tracking-tight">Your IPTV Proxy is Ready to Link!</h2>
                    <p className="text-sm text-gray-300 leading-relaxed">
                      Below are the setup parameters generated specifically for you. Use these credentials to configure any IPTV application (e.g. Tivimate, Smarters IPTV, VLC) to load only the <strong>last 100 added movies</strong> from your master account.
                    </p>
                  </div>
                </div>

                {/* Xtream Codes Credentials Output */}
                <div className="bg-[#0b0f19] border border-gray-800 rounded-2xl p-6 space-y-5">
                  <div className="flex justify-between items-center border-b border-gray-800 pb-3">
                    <h3 className="font-semibold text-white flex items-center gap-2">
                      <Key className="w-4 h-4 text-indigo-400" />
                      Option A: Xtream Codes API Login (Recommended)
                    </h3>
                    <span className="text-xs text-gray-400">Best for Smart TVs & Players</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs text-gray-400 font-medium">IPTV App Server URL</label>
                      <div className="flex items-center gap-2 bg-slate-950/80 border border-gray-800 rounded-xl px-3 py-2.5 text-sm font-mono text-indigo-300">
                        <span className="truncate flex-1">{xtreamHost}</span>
                        <button 
                          onClick={() => copyToClipboard(xtreamHost, "host")}
                          className="p-1 hover:bg-gray-800 rounded text-gray-400 hover:text-white transition"
                          title="Copy Server URL"
                        >
                          {copiedField === "host" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-gray-400 font-medium">Custom Proxy Username</label>
                      <div className="flex items-center gap-2 bg-slate-950/80 border border-gray-800 rounded-xl px-3 py-2.5 text-sm font-mono text-indigo-300">
                        <span className="truncate flex-1">{xtreamUser}</span>
                        <button 
                          onClick={() => copyToClipboard(xtreamUser, "user")}
                          className="p-1 hover:bg-gray-800 rounded text-gray-400 hover:text-white transition"
                          title="Copy Username"
                        >
                          {copiedField === "user" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-gray-400 font-medium">Custom Proxy Password</label>
                      <div className="flex items-center gap-2 bg-slate-950/80 border border-gray-800 rounded-xl px-3 py-2.5 text-sm font-mono text-indigo-300">
                        <span className="truncate flex-1">{xtreamPass}</span>
                        <button 
                          onClick={() => copyToClipboard(xtreamPass, "pass")}
                          className="p-1 hover:bg-gray-800 rounded text-gray-400 hover:text-white transition"
                          title="Copy Password"
                        >
                          {copiedField === "pass" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="bg-slate-950/40 border border-dashed border-gray-800 p-4 rounded-xl flex items-center gap-3">
                      <div className="p-2 bg-indigo-600/10 rounded-lg text-indigo-400">
                        <Smartphone className="w-5 h-5" />
                      </div>
                      <div className="text-xs text-gray-400">
                        <p className="font-semibold text-gray-200 mb-0.5">Where to use?</p>
                        <p>Enter these exactly inside applications like IPTV Smarters, Tivimate, or XCIPTV.</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* M3U Playlist Download Output */}
                <div className="bg-[#0b0f19] border border-gray-800 rounded-2xl p-6 space-y-4">
                  <div className="flex justify-between items-center border-b border-gray-800 pb-3">
                    <h3 className="font-semibold text-white flex items-center gap-2">
                      <FileDown className="w-4 h-4 text-indigo-400" />
                      Option B: M3U Playlist File Link
                    </h3>
                    <span className="text-xs text-gray-400">Best for VLC or general media players</span>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm text-gray-300">
                      If your IPTV app only supports M3U playlists, use this link to directly download or stream the generated playlist:
                    </p>
                    <div className="flex items-center gap-2 bg-slate-950/80 border border-gray-800 rounded-xl px-3 py-3 text-sm font-mono text-indigo-300">
                      <span className="truncate flex-1">{m3uUrl}</span>
                      <button 
                        onClick={() => copyToClipboard(m3uUrl, "m3u")}
                        className="p-1.5 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition flex items-center gap-1 text-xs font-sans font-medium"
                      >
                        {copiedField === "m3u" ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy URL</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="pt-2 flex flex-wrap gap-3">
                    <a 
                      href={m3uUrl}
                      target="_blank" 
                      rel="noreferrer" 
                      className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-all inline-flex items-center gap-1.5"
                    >
                      <FileDown className="w-3.5 h-3.5" />
                      Download M3U Playlist
                    </a>
                  </div>
                </div>

                {/* Integration tutorials */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-[#0b0f19] border border-gray-800 rounded-2xl p-5 space-y-3">
                    <h4 className="font-bold text-white flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-indigo-500" />
                      How to use with Tivimate
                    </h4>
                    <ol className="text-xs text-gray-400 space-y-2 list-decimal list-inside leading-relaxed">
                      <li>Open Tivimate and click <strong className="text-gray-200">Add Playlist</strong>.</li>
                      <li>Select <strong className="text-gray-200">Xtream Codes login</strong>.</li>
                      <li>Enter the <strong className="text-indigo-400">IPTV App Server URL</strong> from above.</li>
                      <li>Enter your custom <strong className="text-indigo-400">Username</strong> and <strong className="text-indigo-400">Password</strong>.</li>
                      <li>Save and allow Tivimate to sync. It will cleanly load ONLY the last 100 added movies!</li>
                    </ol>
                  </div>

                  <div className="bg-[#0b0f19] border border-gray-800 rounded-2xl p-5 space-y-3">
                    <h4 className="font-bold text-white flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      How to use with IPTV Smarters
                    </h4>
                    <ol className="text-xs text-gray-400 space-y-2 list-decimal list-inside leading-relaxed">
                      <li>Launch IPTV Smarters and choose <strong className="text-gray-200">Login with Xtream Codes API</strong>.</li>
                      <li>For the first field, enter any name (e.g. "My Filtered Movies").</li>
                      <li>Enter the custom username, password, and URL generated above.</li>
                      <li>Click <strong className="text-gray-200">ADD USER</strong> and enter the Movies section. All done!</li>
                    </ol>
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB 2: PROXY CREDENTIALS & MOVIE POOL CONFIG */}
            {activeTab === "settings" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="bg-[#0b0f19] border border-gray-800 rounded-2xl p-6 space-y-6"
              >
                <div className="border-b border-gray-800 pb-3">
                  <h2 className="text-lg font-bold text-white">Proxy & Back-End IPTV Settings</h2>
                  <p className="text-xs text-gray-400">Update your master IPTV provider credentials and customize your unique proxy credentials</p>
                </div>

                <form onSubmit={handleSaveConfig} className="space-y-6">
                  
                  {/* Master Provider Box */}
                  <div className="bg-slate-950/50 border border-gray-800/80 p-5 rounded-2xl space-y-4">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <Database className="w-4 h-4 text-indigo-400" />
                      1. Master IPTV Source (Your Main Credentials)
                    </h3>
                    <p className="text-xs text-gray-400">
                      These are the backend credentials where our app will fetch the original IPTV list to process, sort, and select the latest 100 added movies.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5 col-span-1 md:col-span-2">
                        <label className="text-xs text-gray-300 font-medium">Master IPTV Provider URL</label>
                        <input
                          type="url"
                          required
                          value={config.masterUrl}
                          onChange={(e) => setConfig({ ...config, masterUrl: e.target.value })}
                          placeholder="http://example.com"
                          className="w-full bg-[#070a13] border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-all font-mono"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs text-gray-300 font-medium">Master IPTV Username</label>
                        <input
                          type="text"
                          required
                          value={config.masterUsername}
                          onChange={(e) => setConfig({ ...config, masterUsername: e.target.value })}
                          placeholder="mXoK4b6xEf"
                          className="w-full bg-[#070a13] border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-all font-mono"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs text-gray-300 font-medium">Master IPTV Password</label>
                        <div className="relative">
                          <input
                            type={showPassword ? "text" : "password"}
                            required
                            value={config.masterPassword}
                            onChange={(e) => setConfig({ ...config, masterPassword: e.target.value })}
                            placeholder="Password or token"
                            className="w-full bg-[#070a13] border border-gray-800 rounded-xl pl-4 pr-10 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-all font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-2.5 text-gray-400 hover:text-white transition"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Custom Proxy Box */}
                  <div className="bg-slate-950/50 border border-gray-800/80 p-5 rounded-2xl space-y-4">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <Lock className="w-4 h-4 text-emerald-400" />
                      2. Your Custom Access Credentials (For logging in)
                    </h3>
                    <p className="text-xs text-gray-400">
                      Customize the exact username and password you want to enter into your IPTV players.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs text-gray-300 font-medium">Custom Username</label>
                        <input
                          type="text"
                          required
                          value={config.customUsername}
                          onChange={(e) => setConfig({ ...config, customUsername: e.target.value })}
                          placeholder="Sajid123"
                          className="w-full bg-[#070a13] border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-all font-mono"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs text-gray-300 font-medium">Custom Password</label>
                        <input
                          type="text"
                          required
                          value={config.customPassword}
                          onChange={(e) => setConfig({ ...config, customPassword: e.target.value })}
                          placeholder="SajidPassword"
                          className="w-full bg-[#070a13] border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-all font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* General settings Limit */}
                  <div className="bg-slate-950/50 border border-gray-800/80 p-5 rounded-2xl space-y-4">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <Film className="w-4 h-4 text-purple-400" />
                      3. Filtering Options
                    </h3>
                    
                    <div className="space-y-1.5">
                      <label className="text-xs text-gray-300 font-medium">Limit Movies Count (Default: 100)</label>
                      <input
                        type="number"
                        min="10"
                        max="1000"
                        required
                        value={config.limitMoviesCount}
                        onChange={(e) => setConfig({ ...config, limitMoviesCount: parseInt(e.target.value) || 100 })}
                        className="w-full max-w-xs bg-[#070a13] border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-all font-mono"
                      />
                      <p className="text-[11px] text-gray-400 mt-1">
                        Determines the maximum number of recent VOD titles loaded and served. Your player app will display exactly this number of titles.
                      </p>
                    </div>
                  </div>

                  {/* Feedback Status */}
                  {saveStatus && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-4 rounded-xl text-xs border ${
                        saveStatus.type === "success"
                          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                          : "bg-rose-500/10 border-rose-500/20 text-rose-400"
                      }`}
                    >
                      {saveStatus.message}
                    </motion.div>
                  )}

                  {/* Actions */}
                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setConfig(savedConfig || DEFAULT_CONFIG)}
                      className="bg-slate-900 hover:bg-slate-800 text-gray-300 text-xs font-semibold px-5 py-2.5 rounded-xl transition"
                    >
                      Reset Changes
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold px-6 py-2.5 rounded-xl transition flex items-center gap-2"
                    >
                      {isSaving ? "Saving..." : "Save Settings"}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* TAB 3: FILTERED MOVIES PREVIEW */}
            {activeTab === "movies" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="bg-[#0b0f19] border border-gray-800 rounded-2xl p-6 space-y-6"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-800 pb-4">
                  <div>
                    <h2 className="text-lg font-bold text-white">Latest Added Movies Preview</h2>
                    <p className="text-xs text-gray-400">Showing the exact lists currently filtered and optimized for your IPTV client</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleRefreshCache}
                      disabled={isRefreshing}
                      className="bg-slate-900 hover:bg-slate-800 border border-gray-800 rounded-xl px-3.5 py-2 text-xs font-semibold text-gray-300 hover:text-white transition flex items-center gap-2 disabled:opacity-50"
                      title="Force Refresh Pool Cache"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
                      {isRefreshing ? "Fetching Fresh..." : "Force Sync Pool"}
                    </button>
                  </div>
                </div>

                {/* Search Bar */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search movie title from filtered pool..."
                    className="w-full bg-slate-950/80 border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-all"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery("")}
                      className="bg-slate-900 hover:bg-slate-800 text-xs px-3 py-2.5 rounded-xl text-gray-400 transition"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Movies Table Grid */}
                {filteredMovies.length === 0 ? (
                  <div className="text-center py-12 bg-slate-950/20 rounded-2xl border border-dashed border-gray-800/80 space-y-3">
                    <Tv className="w-10 h-10 mx-auto text-gray-600" />
                    <p className="text-sm text-gray-400">No movies found in the current pool filter.</p>
                    <p className="text-xs text-gray-500">Ensure your master provider details are correct in the settings tab.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {filteredMovies.map((movie) => (
                      <div 
                        key={movie.stream_id} 
                        className="bg-slate-950/50 border border-gray-800/80 rounded-xl p-3 flex gap-3 hover:border-gray-700/80 transition-all group"
                      >
                        {/* Poster Placeholder */}
                        <div className="w-14 h-20 bg-slate-900 rounded-lg flex-shrink-0 overflow-hidden relative border border-gray-800/60 flex items-center justify-center">
                          {movie.stream_icon ? (
                            <img 
                              src={movie.stream_icon} 
                              alt="" 
                              className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = "none";
                              }}
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <Film className="w-5 h-5 text-gray-600" />
                          )}
                          <span className="absolute bottom-1 right-1 bg-black/80 text-[8px] font-mono font-bold px-1 py-0.5 text-indigo-400 rounded">
                            #{movie.num}
                          </span>
                        </div>

                        {/* Title and metadata */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                          <div>
                            <h4 className="font-semibold text-xs text-white truncate group-hover:text-indigo-300 transition" title={movie.name}>
                              {movie.name}
                            </h4>
                            <span className="text-[10px] text-gray-500 font-mono">
                              ID: {movie.stream_id} • Extension: .{movie.container_extension || "mp4"}
                            </span>
                          </div>

                          <div className="flex items-center justify-between gap-2 text-[10px]">
                            {movie.added ? (
                              <span className="text-gray-400 flex items-center gap-1 font-mono">
                                <Calendar className="w-3 h-3 text-indigo-500" />
                                {new Date(parseInt(movie.added) * 1000).toLocaleDateString(undefined, {
                                  month: "short",
                                  day: "numeric",
                                  year: "2-digit"
                                })}
                              </span>
                            ) : (
                              <span className="text-gray-500">Recently added</span>
                            )}

                            {movie.rating && (
                              <span className="bg-amber-500/10 text-amber-400 font-bold px-1.5 py-0.5 rounded text-[8px] font-mono">
                                ★ {movie.rating}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* TAB 4: LIVE PROXY LOGS */}
            {activeTab === "logs" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="bg-[#0b0f19] border border-gray-800 rounded-2xl p-6 space-y-6"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-800 pb-4">
                  <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <Terminal className="w-5 h-5 text-indigo-400" />
                      Live Connection Monitor
                    </h2>
                    <p className="text-xs text-gray-400">Real-time incoming request traffic from your connected IPTV applications</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleClearLogs}
                      className="bg-red-950/20 hover:bg-red-950/40 border border-red-500/20 rounded-xl px-3.5 py-2 text-xs font-semibold text-red-400 transition"
                    >
                      Clear Logs
                    </button>
                  </div>
                </div>

                {logs.length === 0 ? (
                  <div className="text-center py-16 bg-slate-950/20 rounded-2xl border border-dashed border-gray-800/80 space-y-3">
                    <CloudLightning className="w-10 h-10 mx-auto text-indigo-400 animate-pulse" />
                    <p className="text-sm text-gray-400">Waiting for connections...</p>
                    <p className="text-xs text-gray-500">Launch your IPTV Player on TV or mobile and login using the proxy credentials!</p>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                    {logs.map((log) => (
                      <div 
                        key={log.id} 
                        className="bg-slate-950/70 border border-gray-800/80 rounded-xl p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 font-mono text-xs hover:border-gray-700/60 transition"
                      >
                        <div className="flex flex-wrap items-center gap-2.5 min-w-0">
                          {/* Log Status Badge */}
                          <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                            log.status >= 200 && log.status < 300 
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                              : log.status >= 300 && log.status < 400
                              ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                              : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          }`}>
                            {log.status} {log.method}
                          </span>

                          <span className="text-gray-400 bg-slate-900 px-1.5 py-0.5 rounded text-[10px]">
                            {log.ip}
                          </span>

                          <span className="text-gray-200 font-semibold truncate max-w-xs md:max-w-md" title={log.url}>
                            {log.url}
                          </span>
                        </div>

                        <div className="flex items-center justify-between md:justify-end gap-3 text-[10px]">
                          {log.action && (
                            <span className="bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/20 font-bold uppercase tracking-wider">
                              {log.action}
                            </span>
                          )}

                          <span className="text-gray-500 whitespace-nowrap">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
            
          </AnimatePresence>
        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 bg-[#0b0f19] py-6 px-4 mt-12 text-center text-xs text-gray-400">
        <div className="max-w-7xl mx-auto space-y-2">
          <p>
            Designed with absolute privacy. Media streaming requests are instantly redirected (302) directly to your master provider server.
          </p>
          <p className="text-gray-600">
            Sajid IPTV Proxy Filter © 2026. All streaming bandwidth is processed client-to-host.
          </p>
        </div>
      </footer>
    </div>
  );
}
