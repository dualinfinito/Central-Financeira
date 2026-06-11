import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import fs from "fs";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route to fetch favicon
  app.get("/api/favicon", async (req, res) => {
    const domain = req.query.domain as string;
    if (!domain) return res.status(400).send("Domain is required");
    
    // We can just return the URL or proxy it if needed, but the client can hit the Google API directly.
    // However, sometimes it's better to have a server-side helper.
    res.json({ url: `https://www.google.com/s2/favicons?domain=${domain}&sz=128` });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
