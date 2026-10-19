import "dotenv/config";

import bcrypt from "bcryptjs";
import express from "express";
import { rateLimit } from "express-rate-limit";
import helmet from "helmet";
import multer from "multer";
import { randomBytes, randomUUID, createHash } from "node:crypto";
import { mkdirSync } from "node:fs";
import { unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const publicDirectory = root;
const uploadDirectory = path.join(root, "uploads");
const dataDirectory = path.join(root, "data");
const databasePath = process.env.DATABASE_PATH || path.join(dataDirectory, "site.db");
const sessionDuration = 7 * 24 * 60 * 60 * 1000;
const uploadLimit = 5 * 1024 * 1024;
const publicPagePaths = [
  "/",
  "/despre-noi",
  "/anunturi",
  "/conducere",
  "/sub-departamente",
  "/cereri-de-audienta",
  "/informatii",
  "/criterii-admitere",
  "/reintegrare",
  "/transfer",
];
const uploadParser = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: uploadLimit, files: 1 },
});

const initialAnnouncements = [
  {
    title: "Program extins pentru consultațiile de specialitate",
    category: "Noutăți",
    body: "Începând din această lună, pacienții pot beneficia de consultații în intervale orare suplimentare, pentru un acces mai ușor la îngrijire.",
    image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=80",
    publishedAt: "2026-10-12T10:00:00.000Z",
  },
  {
    title: "O zi dedicată prevenției și sănătății",
    category: "Comunitate",
    body: "Te invităm să iei parte la o inițiativă dedicată prevenției, cu discuții utile și recomandări oferite de echipa noastră medicală.",
    image: "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=800&q=80",
    publishedAt: "2026-10-08T10:00:00.000Z",
  },
  {
    title: "Împreună, pentru o comunitate mai sănătoasă",
    category: "Echipa noastră",
    body: "Facem cunoștință cu medicii și specialiștii care pun empatia și profesionalismul în centrul fiecărei zile de lucru.",
    image: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=800&q=80",
    publishedAt: "2026-10-02T10:00:00.000Z",
  },
];

const initialStaff = [
  ["director-general", "Director General", "Coordonarea echipei", "org-director"],
  ["director-adjunct-1", "Director Adjunct", "Management medical", "org-deputy"],
  ["director-adjunct-2", "Director Adjunct", "Management operațional", "org-deputy"],
  ["medic-inspector-1", "Medic Inspector", "Monitorizare și coordonare", "org-inspector"],
  ["medic-inspector-2", "Medic Inspector", "Monitorizare și coordonare", "org-inspector"],
  ["medic-inspector-3", "Medic Inspector", "Monitorizare și coordonare", "org-inspector"],
  ["medic-chirurg-1", "Medic Chirurg", "Îngrijire de specialitate", "org-surgeon"],
  ["medic-chirurg-2", "Medic Chirurg", "Îngrijire de specialitate", "org-surgeon"],
  ["medic-chirurg-3", "Medic Chirurg", "Îngrijire de specialitate", "org-surgeon"],
];

const imageTypes = [
  { mime: "image/jpeg", extension: ".jpg", signature: (buffer) => buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff },
  { mime: "image/png", extension: ".png", signature: (buffer) => buffer.length > 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) },
  { mime: "image/webp", extension: ".webp", signature: (buffer) => buffer.length > 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP" },
];

function runInTransaction(db, operation) {
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = operation();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export function initializeDatabase(filename) {
  mkdirSync(path.dirname(filename), { recursive: true });
  const db = new DatabaseSync(filename);
  db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
  db.exec(`
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      expires_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS announcements (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      body TEXT NOT NULL,
      image TEXT NOT NULL,
      published_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS staff (
      id TEXT PRIMARY KEY,
      role TEXT NOT NULL,
      responsibility TEXT NOT NULL,
      style TEXT NOT NULL,
      name TEXT NOT NULL,
      image TEXT NOT NULL DEFAULT '',
      position INTEGER NOT NULL UNIQUE
    );
  `);

  const countAnnouncements = db.prepare("SELECT COUNT(*) AS count FROM announcements").get().count;
  if (countAnnouncements === 0) {
    const insertAnnouncement = db.prepare(`
      INSERT INTO announcements (id, title, category, body, image, published_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    runInTransaction(db, () => {
      for (const announcement of initialAnnouncements) {
        insertAnnouncement.run(randomUUID(), announcement.title, announcement.category, announcement.body, announcement.image, announcement.publishedAt);
      }
    });
  }

  const countStaff = db.prepare("SELECT COUNT(*) AS count FROM staff").get().count;
  if (countStaff === 0) {
    const insertStaff = db.prepare(`
      INSERT INTO staff (id, role, responsibility, style, name, position)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    runInTransaction(db, () => {
      initialStaff.forEach(([id, role, responsibility, style], position) => {
        insertStaff.run(id, role, responsibility, style, "Nume în curs de completare", position);
      });
    });
  }

  if (db.prepare("SELECT COUNT(*) AS count FROM admins").get().count === 0) {
    const username = process.env.ADMIN_USERNAME?.trim();
    const password = process.env.ADMIN_PASSWORD;
    if (!username || !password || password.length < 12) {
      db.close();
      throw new Error("Configurează ADMIN_USERNAME și o parolă ADMIN_PASSWORD de cel puțin 12 caractere înainte de prima pornire.");
    }
    const passwordHash = bcrypt.hashSync(password, 12);
    db.prepare("INSERT INTO admins (id, username, password_hash) VALUES (1, ?, ?)").run(username, passwordHash);
  }

  return db;
}

function cookieOptions(isProduction) {
  return `Path=/; HttpOnly; SameSite=Strict; Max-Age=${Math.floor(sessionDuration / 1000)}${isProduction ? "; Secure" : ""}`;
}

function readCookie(request, name) {
  const cookies = request.headers.cookie?.split(";") ?? [];
  for (const cookie of cookies) {
    const separator = cookie.indexOf("=");
    if (separator < 0 || cookie.slice(0, separator).trim() !== name) continue;
    return cookie.slice(separator + 1).trim();
  }
  return "";
}

function imageTypeFor(file) {
  if (!file || file.size > uploadLimit) return null;
  return imageTypes.find((type) => type.mime === file.mimetype && type.signature(file.buffer)) ?? null;
}

async function saveImage(file) {
  const type = imageTypeFor(file);
  if (!type) {
    const error = new Error("Încarcă o imagine JPG, PNG sau WebP validă, de maximum 5 MB.");
    error.status = 400;
    throw error;
  }
  const filename = `${randomUUID()}${type.extension}`;
  await writeFile(path.join(uploadDirectory, filename), file.buffer, { flag: "wx" });
  return `/uploads/${filename}`;
}

async function removeUploadedImage(image) {
  if (!/^\/uploads\/[a-f0-9-]{36}\.(?:jpg|png|webp)$/.test(image)) return;
  try {
    await unlink(path.join(uploadDirectory, path.basename(image)));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

async function cleanupUploadedImage(image) {
  try {
    await removeUploadedImage(image);
  } catch (error) {
    console.error("Imaginea veche nu a putut fi eliminată:", error.message);
  }
}

function publicAnnouncement(row) {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    body: row.body,
    image: row.image,
    publishedAt: row.published_at,
  };
}

function publicStaff(row) {
  return {
    id: row.id,
    role: row.role,
    responsibility: row.responsibility,
    style: row.style,
    name: row.name,
    image: row.image,
  };
}

export function createApp(db) {
  mkdirSync(uploadDirectory, { recursive: true });
  const app = express();
  const production = process.env.NODE_ENV === "production";
  const sessionCookieName = "eclipse_session";
  const dummyHash = bcrypt.hashSync(randomBytes(32).toString("hex"), 12);
  const insertSession = db.prepare("INSERT INTO sessions (token_hash, expires_at) VALUES (?, ?)");
  const selectSession = db.prepare("SELECT expires_at FROM sessions WHERE token_hash = ?");

  if (process.env.TRUST_PROXY === "1") app.set("trust proxy", 1);

  app.disable("x-powered-by");
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        imgSrc: ["'self'", "data:", "https://images.unsplash.com"],
        objectSrc: ["'none'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        upgradeInsecureRequests: production ? [] : null,
      },
    },
    crossOriginEmbedderPolicy: false,
  }));
  app.use(express.json({ limit: "20kb" }));

  app.use(async (request, response, next) => {
    const token = readCookie(request, sessionCookieName);
    if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return next();

    const tokenHash = createHash("sha256").update(token).digest("hex");
    const session = selectSession.get(tokenHash);
    if (!session) return next();
    if (session.expires_at <= Date.now()) {
      db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(tokenHash);
      return next();
    }
    request.adminAuthenticated = true;
    request.sessionTokenHash = tokenHash;
    next();
  });

  app.use("/uploads", express.static(uploadDirectory, {
    dotfiles: "deny",
    fallthrough: false,
    index: false,
    maxAge: production ? "1d" : 0,
    setHeaders(response) {
      response.setHeader("X-Content-Type-Options", "nosniff");
    },
  }));

  app.get("/api/announcements", (_request, response) => {
    const rows = db.prepare("SELECT * FROM announcements ORDER BY published_at DESC, rowid DESC LIMIT 3").all();
    response.json(rows.map(publicAnnouncement));
  });

  app.get("/api/staff", (_request, response) => {
    const rows = db.prepare("SELECT * FROM staff ORDER BY position").all();
    response.json(rows.map(publicStaff));
  });

  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    message: { error: "Prea multe încercări. Încearcă din nou peste 15 minute." },
  });

  app.post("/api/admin/login", loginLimiter, (request, response, next) => {
    const { username, password } = request.body ?? {};
    if (typeof username !== "string" || typeof password !== "string" || username.length > 100 || password.length > 200) {
      return response.status(400).json({ error: "Completează numele de utilizator și parola." });
    }

    try {
      const admin = db.prepare("SELECT id, username, password_hash FROM admins WHERE username = ?").get(username.trim());
      const passwordMatches = bcrypt.compareSync(password, admin?.password_hash ?? dummyHash);
      if (!admin || !passwordMatches) return response.status(401).json({ error: "Datele de conectare nu sunt corecte." });

      const token = randomBytes(32).toString("base64url");
      const tokenHash = createHash("sha256").update(token).digest("hex");
      const now = Date.now();
      runInTransaction(db, () => {
        db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(now);
        insertSession.run(tokenHash, now + sessionDuration);
      });
      response.setHeader("Set-Cookie", `${sessionCookieName}=${token}; ${cookieOptions(production)}`);
      response.json({ username: admin.username });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/admin/session", (request, response) => {
    response.json({ authenticated: Boolean(request.adminAuthenticated) });
  });

  app.use("/api/admin", (request, response, next) => {
    if (request.method !== "GET" && request.method !== "HEAD") {
      const origin = request.get("origin");
      if (!origin || origin !== `${request.protocol}://${request.get("host")}`) {
        return response.status(403).json({ error: "Cererea nu a putut fi verificată." });
      }
    }
    if (!request.adminAuthenticated) return response.status(401).json({ error: "Conectează-te pentru a continua." });
    next();
  });

  app.post("/api/admin/logout", (request, response) => {
    if (request.sessionTokenHash) {
      db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(request.sessionTokenHash);
    }
    response.setHeader("Set-Cookie", `${sessionCookieName}=; ${cookieOptions(production).replace(/Max-Age=\d+/, "Max-Age=0")}`);
    response.json({ loggedOut: true });
  });

  app.get("/api/admin/announcements", (_request, response) => {
    const rows = db.prepare("SELECT * FROM announcements ORDER BY published_at DESC, rowid DESC LIMIT 3").all();
    response.json(rows.map(publicAnnouncement));
  });

  app.post("/api/admin/announcements", uploadParser.single("image"), async (request, response, next) => {
    let savedImage = "";
    try {
      const { title, category, body } = request.body ?? {};
      if (!validAnnouncement(title, category, body)) return response.status(400).json({ error: "Completează corect titlul, categoria și mesajul." });
      if (!request.file) return response.status(400).json({ error: "Adaugă o imagine pentru anunț." });
      savedImage = await saveImage(request.file);
      const id = randomUUID();
      const publishedAt = new Date().toISOString();
      const removedImages = runInTransaction(db, () => {
        db.prepare(`
          INSERT INTO announcements (id, title, category, body, image, published_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(id, title.trim(), category.trim(), body.trim(), savedImage, publishedAt);
        const oldest = db.prepare(`
          SELECT id, image FROM announcements ORDER BY published_at DESC, rowid DESC LIMIT -1 OFFSET 3
        `).all();
        db.prepare(`
          DELETE FROM announcements WHERE id IN (
            SELECT id FROM announcements ORDER BY published_at DESC, rowid DESC LIMIT -1 OFFSET 3
          )
        `).run();
        return oldest.map((row) => row.image);
      });
      await Promise.all(removedImages.map(cleanupUploadedImage));
      const announcement = db.prepare("SELECT * FROM announcements WHERE id = ?").get(id);
      response.status(201).json(publicAnnouncement(announcement));
    } catch (error) {
      if (savedImage) await removeUploadedImage(savedImage);
      next(error);
    }
  });

  app.put("/api/admin/announcements/:id", uploadParser.single("image"), async (request, response, next) => {
    let savedImage = "";
    try {
      const { title, category, body } = request.body ?? {};
      if (!validAnnouncement(title, category, body)) return response.status(400).json({ error: "Completează corect titlul, categoria și mesajul." });
      const existing = db.prepare("SELECT * FROM announcements WHERE id = ?").get(request.params.id);
      if (!existing) return response.status(404).json({ error: "Anunțul nu a fost găsit." });
      if (request.file) savedImage = await saveImage(request.file);
      const image = savedImage || existing.image;
      db.prepare(`
        UPDATE announcements SET title = ?, category = ?, body = ?, image = ? WHERE id = ?
      `).run(title.trim(), category.trim(), body.trim(), image, existing.id);
      if (savedImage) await cleanupUploadedImage(existing.image);
      const announcement = db.prepare("SELECT * FROM announcements WHERE id = ?").get(existing.id);
      response.json(publicAnnouncement(announcement));
    } catch (error) {
      if (savedImage) await removeUploadedImage(savedImage);
      next(error);
    }
  });

  app.put("/api/admin/staff/:id", uploadParser.single("image"), async (request, response, next) => {
    let savedImage = "";
    try {
      const name = request.body?.name;
      if (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 80) {
        return response.status(400).json({ error: "Numele trebuie să aibă între 2 și 80 de caractere." });
      }
      const existing = db.prepare("SELECT * FROM staff WHERE id = ?").get(request.params.id);
      if (!existing) return response.status(404).json({ error: "Membrul echipei nu a fost găsit." });
      if (request.file) savedImage = await saveImage(request.file);
      const image = savedImage || existing.image;
      db.prepare("UPDATE staff SET name = ?, image = ? WHERE id = ?").run(name.trim(), image, existing.id);
      if (savedImage) await cleanupUploadedImage(existing.image);
      const member = db.prepare("SELECT * FROM staff WHERE id = ?").get(existing.id);
      response.json(publicStaff(member));
    } catch (error) {
      if (savedImage) await removeUploadedImage(savedImage);
      next(error);
    }
  });

  app.get(publicPagePaths, (_request, response) => response.sendFile(path.join(publicDirectory, "index.html")));
  app.get("/index.html", (_request, response) => response.sendFile(path.join(publicDirectory, "index.html")));
  app.get("/styles.css", (_request, response) => response.sendFile(path.join(publicDirectory, "styles.css")));
  app.use("/assets", express.static(path.join(publicDirectory, "assets"), { dotfiles: "deny", fallthrough: false, index: false }));
  app.get("/script.js", (_request, response) => response.sendFile(path.join(publicDirectory, "script.js")));
  app.use("/api", (_request, response) => response.status(404).json({ error: "Ruta API nu a fost găsită." }));
  app.use((_request, response) => response.status(404).send("Pagina nu a fost găsită."));
  app.use((error, _request, response, _next) => {
    if (response.headersSent) return;
    if (error instanceof multer.MulterError) {
      const message = error.code === "LIMIT_FILE_SIZE"
        ? "Imaginea nu poate depăși 5 MB."
        : "Nu s-a putut procesa imaginea încărcată.";
      return response.status(400).json({ error: message });
    }
    if (error.status) return response.status(error.status).json({ error: error.message });
    console.error("Eroare server:", error.message);
    response.status(500).json({ error: "A apărut o eroare internă. Încearcă din nou." });
  });

  return app;
}

function validAnnouncement(title, category, body) {
  return typeof title === "string" && title.trim().length > 0 && title.trim().length <= 120
    && typeof category === "string" && category.trim().length > 0 && category.trim().length <= 40
    && typeof body === "string" && body.trim().length > 0 && body.trim().length <= 1500;
}

export function startServer() {
  mkdirSync(dataDirectory, { recursive: true });
  mkdirSync(uploadDirectory, { recursive: true });
  const db = initializeDatabase(databasePath);
  const app = createApp(db);
  const port = Number(process.env.PORT || 3000);
  const server = app.listen(port, () => {
    console.log(`Site-ul Spitalului Medical Eclipse Tower rulează la http://localhost:${port}`);
  });
  server.on("close", () => db.close());
  return server;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    startServer();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
