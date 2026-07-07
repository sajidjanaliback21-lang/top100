import express, { Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { AppConfig, ProxyLog, MovieStream, MovieCategory } from "./src/types";

// Dynamic imports are avoided, we use global fetch which is native in Node 22+

const app = express();
const PORT = 3000;
const CONFIG_FILE = path.join(process.cwd(), "config.json");

// Default Configuration
const DEFAULT_CONFIG: AppConfig = {
  masterUrl: "http://sjstorestar4k.store",
  masterUsername: "mXoK4b6xEf",
  masterPassword: "iimmaculate5visit",
  customUsername: "Sajid123",
  customPassword: "SajidPassword",
  limitMoviesCount: 100
};

// Load Configuration
let config: AppConfig = { ...DEFAULT_CONFIG };
if (fs.existsSync(CONFIG_FILE)) {
  try {
    const fileData = fs.readFileSync(CONFIG_FILE, "utf-8");
    config = { ...DEFAULT_CONFIG, ...JSON.parse(fileData) };
    console.log("Configuration loaded from config.json");
  } catch (error) {
    console.error("Failed to parse config.json, using defaults:", error);
  }
} else {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(DEFAULT_CONFIG, null, 2));
    console.log("Created default config.json");
  } catch (err) {
    console.error("Failed to write default config.json:", err);
  }
}

// In-Memory Database & Cache
let proxyLogs: ProxyLog[] = [];
let cachedMovies: MovieStream[] | null = null;
let cachedCategories: MovieCategory[] | null = null;
let cacheTimestamp: number | null = null;
let isFetching = false;
let fetchError: string | null = null;

// Helpers to record proxy logs
function addLog(req: Request, status: number, action?: string) {
  const logEntry: ProxyLog = {
    id: Math.random().toString(36).substring(2, 11),
    timestamp: new Date().toISOString(),
    ip: (req.headers["x-forwarded-for"] as string) || req.ip || "127.0.0.1",
    method: req.method,
    url: req.originalUrl,
    action: action || (req.query.action as string) || undefined,
    userAgent: req.headers["user-agent"] || "Unknown",
    status
  };
  proxyLogs.unshift(logEntry);
  if (proxyLogs.length > 100) {
    proxyLogs.pop();
  }
}

// Helper to get base app URL dynamically
function getAppUrl(req: Request): string {
  // If APP_URL is injected in env, use it. Otherwise fall back to request header host.
  if (process.env.APP_URL) {
    return process.env.APP_URL.replace(/\/$/, "");
  }
  const protocol = req.headers["x-forwarded-proto"] || req.protocol || "http";
  const host = req.get("host") || `localhost:${PORT}`;
  return `${protocol}://${host}`;
}

// Fetch Movies & Categories with Caching (1 Hour Cache)
async function getFilteredMoviesAndCategories(forceRefresh = false): Promise<{
  movies: MovieStream[];
  categories: MovieCategory[];
}> {
  const now = Date.now();
  const ONE_HOUR = 60 * 60 * 1000;

  if (
    !forceRefresh &&
    cachedMovies &&
    cachedCategories &&
    cacheTimestamp &&
    now - cacheTimestamp < ONE_HOUR
  ) {
    return { movies: cachedMovies, categories: cachedCategories };
  }

  // Prevent duplicate concurrent requests
  if (isFetching) {
    while (isFetching) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    if (cachedMovies && cachedCategories) {
      return { movies: cachedMovies, categories: cachedCategories };
    }
  }

  isFetching = true;
  fetchError = null;

  try {
    console.log("Fetching fresh content from master IPTV provider...");
    
    // Clean master URL and ensure player_api.php endpoint
    const masterBase = config.masterUrl.replace(/\/$/, "");
    const apiUrl = `${masterBase}/player_api.php?username=${config.masterUsername}&password=${config.masterPassword}&action=get_vod_streams`;

    const res = await fetch(apiUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
    });

    if (!res.ok) {
      throw new Error(`Master IPTV server returned status ${res.status}`);
    }

    const data = await res.json();
    if (!Array.isArray(data)) {
      throw new Error("Invalid response format from master IPTV (expected array of VOD streams)");
    }

    console.log(`Fetched ${data.length} total VOD streams from master provider`);

    // Sort by "added" timestamp descending, or "stream_id" descending as fallback
    const sortedStreams = [...data].sort((a: any, b: any) => {
      const addedA = parseInt(a.added) || 0;
      const addedB = parseInt(b.added) || 0;
      if (addedA !== addedB) {
        return addedB - addedA; // Newer first
      }
      const idA = parseInt(a.stream_id) || 0;
      const idB = parseInt(b.stream_id) || 0;
      return idB - idA; // Higher ID first
    });

    // Select the last 100 added movies
    const limitCount = config.limitMoviesCount || 100;
    const topMovies = sortedStreams.slice(0, limitCount).map((movie: any, index: number) => ({
      num: index + 1,
      name: movie.name || "Unknown Movie",
      stream_type: "movie",
      stream_id: parseInt(movie.stream_id) || index + 1000,
      stream_icon: movie.stream_icon || "",
      rating: movie.rating || "",
      rating_5star: parseFloat(movie.rating_5star) || 0,
      added: movie.added || Math.floor(Date.now() / 1000).toString(),
      category_id: movie.category_id || "0",
      container_extension: movie.container_extension || "mp4",
      custom_sid: movie.custom_sid || "",
      direct_source: movie.direct_source || ""
    }));

    // Extract unique category IDs from our 100 movies
    const categoryIdsInUse = new Set<string>();
    topMovies.forEach((m) => {
      if (m.category_id) {
        categoryIdsInUse.add(m.category_id.toString());
      }
    });

    // Fetch categories from master IPTV
    const categoriesUrl = `${masterBase}/player_api.php?username=${config.masterUsername}&password=${config.masterPassword}&action=get_vod_categories`;
    let filteredCategories: MovieCategory[] = [];

    try {
      const catRes = await fetch(categoriesUrl);
      if (catRes.ok) {
        const catData = await catRes.json();
        if (Array.isArray(catData)) {
          // Keep only categories that contain at least one of our 100 movies
          filteredCategories = catData
            .filter((cat: any) => categoryIdsInUse.has(cat.category_id?.toString()))
            .map((cat: any) => ({
              category_id: cat.category_id?.toString() || "0",
              category_name: cat.category_name || "Uncategorized",
              parent_id: parseInt(cat.parent_id) || 0
            }));
        }
      }
    } catch (catErr) {
      console.error("Failed to fetch/filter VOD categories, constructing fallback categories:", catErr);
    }

    // Always append/include a special custom category at the top for easy access
    const specialCategory: MovieCategory = {
      category_id: "last_100_movies",
      category_name: "⭐ LAST 100 ADDED MOVIES",
      parent_id: 0
    };

    // Ensure we also duplicate our top movies under this special category so they can be viewed in one place
    filteredCategories.unshift(specialCategory);

    cachedMovies = topMovies;
    cachedCategories = filteredCategories;
    cacheTimestamp = Date.now();
    console.log(`Cache updated. Saved ${topMovies.length} movies and ${filteredCategories.length} categories.`);

    return { movies: cachedMovies, categories: cachedCategories };
  } catch (err: any) {
    const msg = err?.message || String(err);
    console.error("Error updating proxy content cache:", msg);
    fetchError = msg;

    // Fallback to existing cache if possible, otherwise throw
    if (cachedMovies && cachedCategories) {
      console.log("Serving stale cache as fallback");
      return { movies: cachedMovies, categories: cachedCategories };
    }
    throw err;
  } finally {
    isFetching = false;
  }
}

// Express JSON and urlencoded middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Enable CORS for development
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

// ==========================================
// 1. XTREAM CODES API PROXY (player_api.php)
// ==========================================
app.get("/player_api.php", async (req: Request, res: Response) => {
  const { username, password, action, vod_id } = req.query;

  // 1. Basic auth check
  if (!username || !password || username !== config.customUsername || password !== config.customPassword) {
    addLog(req, 401, "Auth Failed");
    return res.json({
      user_info: {
        auth: 0,
        status: "Expired",
        message: "Invalid username or password for custom proxy"
      }
    });
  }

  try {
    // 2. Handle Login / Handshake (No Action)
    if (!action) {
      addLog(req, 200, "Login handshake");
      console.log(`Proxy login success for user: ${username}`);

      // Forward login request to master to fetch authentic statistics (expiry, etc.)
      const masterBase = config.masterUrl.replace(/\/$/, "");
      const loginUrl = `${masterBase}/player_api.php?username=${config.masterUsername}&password=${config.masterPassword}`;

      try {
        const masterRes = await fetch(loginUrl);
        if (masterRes.ok) {
          const masterJson: any = await masterRes.json();
          if (masterJson && masterJson.user_info) {
            // Override with custom credentials and our proxy server info
            const appUrlParsed = new URL(getAppUrl(req));
            const port = appUrlParsed.port || (appUrlParsed.protocol === "https:" ? "443" : "80");
            const hostOnly = appUrlParsed.hostname;

            const proxiedResponse = {
              user_info: {
                ...masterJson.user_info,
                username: config.customUsername,
                password: config.customPassword
              },
              server_info: {
                url: hostOnly,
                port: port,
                https_port: port,
                server_protocol: appUrlParsed.protocol.replace(":", ""),
                rtmp_port: "80",
                timezone: masterJson.server_info?.timezone || "UTC",
                time_now: new Date().toISOString().replace("T", " ").substring(0, 19)
              }
            };
            return res.json(proxiedResponse);
          }
        }
      } catch (err) {
        console.error("Master login endpoint fetch failed, sending simulated active response:", err);
      }

      // Simulated Robust Response if Master is unreachable
      const appUrlParsed = new URL(getAppUrl(req));
      const port = appUrlParsed.port || (appUrlParsed.protocol === "https:" ? "443" : "80");
      const hostOnly = appUrlParsed.hostname;

      return res.json({
        user_info: {
          username: config.customUsername,
          password: config.customPassword,
          message: "Welcome to Custom IPTV Movie Filter Proxy!",
          auth: 1,
          status: "Active",
          exp_date: "1812547200", // Year 2027+
          is_trial: "0",
          active_cons: "0",
          created_at: "1625097600",
          max_connections: "1",
          allowed_outputs: ["mp4", "mkv", "ts"]
        },
        server_info: {
          url: hostOnly,
          port: port,
          https_port: port,
          server_protocol: appUrlParsed.protocol.replace(":", ""),
          rtmp_port: "80",
          timezone: "UTC",
          time_now: new Date().toISOString().replace("T", " ").substring(0, 19)
        }
      });
    }

    // 3. Handle VOD Categories
    if (action === "get_vod_categories") {
      addLog(req, 200, "get_vod_categories");
      const { categories } = await getFilteredMoviesAndCategories();
      return res.json(categories);
    }

    // 4. Handle VOD Streams
    if (action === "get_vod_streams") {
      addLog(req, 200, "get_vod_streams");
      const { movies } = await getFilteredMoviesAndCategories();
      const category_id = req.query.category_id as string;

      if (!category_id) {
        return res.json(movies);
      }

      // Special custom category
      if (category_id === "last_100_movies") {
        return res.json(movies);
      }

      // Filter local cached movie selection by category
      const filtered = movies.filter((m) => m.category_id.toString() === category_id.toString());
      return res.json(filtered);
    }

    // 5. Handle Movie Details (VOD Info)
    if (action === "get_vod_info") {
      addLog(req, 200, `get_vod_info (ID: ${vod_id})`);
      if (!vod_id) {
        return res.status(400).json({ error: "vod_id is required" });
      }

      const masterBase = config.masterUrl.replace(/\/$/, "");
      const infoUrl = `${masterBase}/player_api.php?username=${config.masterUsername}&password=${config.masterPassword}&action=get_vod_info&vod_id=${vod_id}`;

      try {
        const infoRes = await fetch(infoUrl);
        if (infoRes.ok) {
          const infoJson = await infoRes.json();
          return res.json(infoJson);
        }
      } catch (err) {
        console.error(`Failed to fetch VOD info for ID ${vod_id} from master provider:`, err);
      }

      // Fallback empty info response
      return res.json({
        info: {
          movie_image: "",
          genre: "Action, Drama",
          plot: "No description available",
          rating: "N/A",
          releasedate: ""
        },
        movie_data: {
          stream_id: parseInt(vod_id as string),
          container_extension: "mp4"
        }
      });
    }

    // 6. Disable Live and Series to keep the IPTV player completely uncluttered
    if (
      action === "get_live_categories" ||
      action === "get_live_streams" ||
      action === "get_series_categories" ||
      action === "get_series"
    ) {
      addLog(req, 200, action);
      return res.json([]);
    }

    // Catch-all for any other unhandled action
    addLog(req, 200, `unhandled action: ${action}`);
    return res.json([]);
  } catch (error: any) {
    console.error("Proxy endpoint experienced an error:", error);
    addLog(req, 500, `Error: ${error?.message || "Internal Error"}`);
    return res.status(500).json({ error: "Internal IPTV Proxy Error" });
  }
});

// ==========================================
// 2. M3U PLAYLIST PROXY GENERATOR (get.php)
// ==========================================
app.get("/get.php", async (req: Request, res: Response) => {
  const { username, password } = req.query;

  // Validate custom credentials
  if (!username || !password || username !== config.customUsername || password !== config.customPassword) {
    addLog(req, 401, "M3U Auth Failed");
    return res.status(401).send("#EXTM3U\n#EXTINF:-1,Authentication Failed on Custom IPTV Proxy");
  }

  try {
    addLog(req, 200, "Download M3U Playlist");
    const { movies, categories } = await getFilteredMoviesAndCategories();
    const appUrl = getAppUrl(req);

    // Create a fast map of category_id -> category_name
    const catMap = new Map<string, string>();
    categories.forEach((c) => catMap.set(c.category_id, c.category_name));

    let m3uContent = "#EXTM3U\n";
    
    movies.forEach((movie) => {
      const catName = catMap.get(movie.category_id) || "Latest Movies";
      const ext = movie.container_extension || "mp4";
      const playbackUrl = `${appUrl}/movie/${config.customUsername}/${config.customPassword}/${movie.stream_id}.${ext}`;
      
      m3uContent += `#EXTINF:-1 tvg-id="" tvg-name="${movie.name}" tvg-logo="${movie.stream_icon}" group-title="${catName}",${movie.name}\n`;
      m3uContent += `${playbackUrl}\n`;
    });

    res.setHeader("Content-Type", "application/x-mpegurl");
    res.setHeader("Content-Disposition", 'attachment; filename="latest_100_movies.m3u"');
    return res.send(m3uContent);
  } catch (err: any) {
    console.error("M3U Playlist generation failed:", err);
    addLog(req, 500, "M3U Generation Failed");
    return res.status(500).send("#EXTM3U\n#EXTINF:-1,Error generating custom playlist");
  }
});

// ==========================================
// 3. MOVIE STREAM REDIRECT (GET /movie/:u/:p/:file)
// ==========================================
const movieStreamHandler = (req: Request, res: Response) => {
  const { username, password, filename } = req.params;

  // Validate Credentials
  if (username !== config.customUsername || password !== config.customPassword) {
    addLog(req, 401, `Stream Auth Error: ${filename}`);
    return res.status(401).send("Unauthorized video access credentials");
  }

  // Record Stream Attempt
  addLog(req, 302, `Redirect Stream: ${filename}`);
  console.log(`User ${username} requested stream ${filename}. Redirecting to master.`);

  // 302 Redirect to master provider. This bypasses streaming payload overhead in our app!
  const masterBase = config.masterUrl.replace(/\/$/, "");
  const masterRedirectUrl = `${masterBase}/movie/${config.masterUsername}/${config.masterPassword}/${filename}`;

  return res.redirect(302, masterRedirectUrl);
};

// Bind both clean path parameters and general query parameters for highest IPTV player compatibility
app.get("/movie/:username/:password/:filename", movieStreamHandler);

// Special match to support alternative client players that call stream directly under /movie/
app.get("/movie/*", (req: Request, res: Response) => {
  // Try parsing path segments manually
  const segments = req.path.split("/").filter(Boolean); // e.g. ["movie", "user", "pass", "123.mp4"]
  if (segments.length >= 4) {
    const username = segments[1];
    const password = segments[2];
    const filename = segments[3];

    if (username === config.customUsername && password === config.customPassword) {
      addLog(req, 302, `Fallback Stream Redirect: ${filename}`);
      const masterBase = config.masterUrl.replace(/\/$/, "");
      const masterRedirectUrl = `${masterBase}/movie/${config.masterUsername}/${config.masterPassword}/${filename}`;
      return res.redirect(302, masterRedirectUrl);
    }
  }

  addLog(req, 400, "Invalid Stream URL format");
  return res.status(400).send("Invalid stream URL pattern. Expected /movie/username/password/stream_id.ext");
});

// ==========================================
// 4. API ENDPOINTS FOR THE REACT UI
// ==========================================

// Get Configuration
app.get("/api/config", (req: Request, res: Response) => {
  // Omit sensitive master password from browser but send others
  res.json({
    masterUrl: config.masterUrl,
    masterUsername: config.masterUsername,
    customUsername: config.customUsername,
    customPassword: config.customPassword,
    limitMoviesCount: config.limitMoviesCount
  });
});

// Update Configuration
app.post("/api/config", (req: Request, res: Response) => {
  const newConfig = req.body;

  if (!newConfig.masterUrl || !newConfig.masterUsername || !newConfig.customUsername || !newConfig.customPassword) {
    return res.status(400).json({ error: "Missing required config parameters" });
  }

  // Update in-memory configuration
  config = {
    masterUrl: newConfig.masterUrl,
    masterUsername: newConfig.masterUsername,
    masterPassword: newConfig.masterPassword || config.masterPassword, // keep existing if omitted
    customUsername: newConfig.customUsername,
    customPassword: newConfig.customPassword,
    limitMoviesCount: parseInt(newConfig.limitMoviesCount) || 100
  };

  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
    console.log("Configuration updated successfully!");

    // Clear caches to force clean fetch with the new settings
    cachedMovies = null;
    cachedCategories = null;
    cacheTimestamp = null;

    res.json({ success: true, message: "Configuration saved and cache cleared" });
  } catch (err) {
    console.error("Failed to save config to file:", err);
    res.status(500).json({ error: "Failed to persist configuration to server" });
  }
});

// Get Proxy Logs
app.get("/api/logs", (req: Request, res: Response) => {
  res.json(proxyLogs);
});

// Clear Logs
app.post("/api/logs/clear", (req: Request, res: Response) => {
  proxyLogs = [];
  res.json({ success: true });
});

// Get Currently Filtered Movies (for preview)
app.get("/api/movies", async (req: Request, res: Response) => {
  try {
    const { movies } = await getFilteredMoviesAndCategories();
    res.json({
      movies,
      cacheAgeSeconds: cacheTimestamp ? Math.floor((Date.now() - cacheTimestamp) / 1000) : 0,
      isFetching,
      error: fetchError
    });
  } catch (err: any) {
    res.json({
      movies: [],
      cacheAgeSeconds: 0,
      isFetching,
      error: err?.message || String(err)
    });
  }
});

// Manually Refresh Cache
app.post("/api/cache/refresh", async (req: Request, res: Response) => {
  try {
    const { movies } = await getFilteredMoviesAndCategories(true);
    res.json({ success: true, count: movies.length });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Refetch operation failed" });
  }
});

// Fetch Quick Stats
app.get("/api/stats", (req: Request, res: Response) => {
  res.json({
    totalRequests: proxyLogs.length,
    activeCache: cachedMovies ? true : false,
    cachedMoviesCount: cachedMovies ? cachedMovies.length : 0,
    cachedCategoriesCount: cachedCategories ? cachedCategories.length : 0,
    cacheTimeRemaining: cacheTimestamp
      ? Math.max(0, 3600 - Math.floor((Date.now() - cacheTimestamp) / 1000))
      : 0
  });
});

// ==========================================
// 5. VITE / REACT STATIC ASSETS MIDDLEWARE
// ==========================================
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Proxy] Server actively running on http://localhost:${PORT}`);
  });
}

startServer();
