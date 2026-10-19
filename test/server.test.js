import assert from "node:assert/strict";
import { once } from "node:events";
import { randomBytes } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";

let db;
let server;
let baseUrl;
let adminCookie;
let temporaryDirectory;
let createApp;
let initializeDatabase;
let testAdminPassword;

before(async () => {
  temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), "eclipse-site-"));
  process.env.UPLOAD_DIRECTORY = path.join(temporaryDirectory, "uploads");
  process.env.ADMIN_USERNAME = "MediciFplayT";
  testAdminPassword = randomBytes(24).toString("base64url");
  process.env.ADMIN_PASSWORD = testAdminPassword;
  ({ createApp, initializeDatabase } = await import("../server.js"));
  db = initializeDatabase(path.join(temporaryDirectory, "site.db"));
  server = createApp(db).listen(0, "127.0.0.1");
  await once(server, "listening");
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  if (db) db.close();
  if (temporaryDirectory) await rm(temporaryDirectory, { recursive: true, force: true });
  delete process.env.UPLOAD_DIRECTORY;
  delete process.env.ADMIN_USERNAME;
  delete process.env.ADMIN_PASSWORD;
});

async function json(url, options) {
  const response = await fetch(`${baseUrl}${url}`, options);
  return { response, body: await response.json() };
}

function adminHeaders(extra = {}) {
  return { Cookie: adminCookie, Origin: baseUrl, ...extra };
}

test("serves the site and persists authenticated announcement and staff edits", async () => {
  const home = await fetch(baseUrl);
  assert.equal(home.status, 200);
  assert.match(home.headers.get("content-security-policy"), /default-src 'self'/);
  assert.equal((await fetch(`${baseUrl}/server.js`)).status, 404);

  const pagePaths = [
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
  const vercelConfig = JSON.parse(await readFile(new URL("../vercel.json", import.meta.url), "utf8"));
  assert.deepEqual(
    new Set(vercelConfig.rewrites.map((rewrite) => rewrite.source)),
    new Set(pagePaths),
  );
  assert.ok(vercelConfig.rewrites.every((rewrite) => rewrite.destination === "/index.html"));

  const pages = await Promise.all(pagePaths.map(async (pathname) => ({
    pathname,
    response: await fetch(`${baseUrl}${pathname}`),
  })));
  for (const page of pages) {
    assert.equal(page.response.status, 200, `${page.pathname} should be a separate page route`);
    assert.match(page.response.headers.get("content-type"), /text\/html/);
  }
  assert.equal((await fetch(`${baseUrl}/pagina-inesistenta`)).status, 404);

  const { response: announcementsResponse, body: initialAnnouncements } = await json("/api/announcements");
  assert.equal(announcementsResponse.status, 200);
  assert.equal(initialAnnouncements.length, 3);

  const { body: staff } = await json("/api/staff");
  assert.equal(staff.length, 9);
  assert.deepEqual(
    staff.reduce((counts, member) => counts.set(member.role, (counts.get(member.role) ?? 0) + 1), new Map()),
    new Map([["Director General", 1], ["Director Adjunct", 2], ["Medic Inspector", 3], ["Medic Chirurg", 3]]),
  );

  const { response: signedOutResponse, body: signedOutSession } = await json("/api/admin/session");
  assert.equal(signedOutResponse.status, 200);
  assert.equal(signedOutSession.authenticated, false);

  const failedLogin = await json("/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "MediciFplayT", password: "wrong-test-password" }),
  });
  assert.equal(failedLogin.response.status, 401);

  const login = await fetch(`${baseUrl}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "MediciFplayT", password: testAdminPassword }),
  });
  assert.equal(login.status, 200);
  adminCookie = login.headers.get("set-cookie").split(";")[0];

  const { response: sessionResponse } = await json("/api/admin/session", { headers: { Cookie: adminCookie } });
  assert.equal(sessionResponse.status, 200);
  const signedInSession = await json("/api/admin/session", { headers: { Cookie: adminCookie } });
  assert.equal(signedInSession.body.authenticated, true);

  const unauthorizedUpdate = await fetch(`${baseUrl}/api/admin/staff/director-general`, {
    method: "PUT",
    headers: { Cookie: adminCookie, "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Director fără verificarea origin-ului" }),
  });
  assert.equal(unauthorizedUpdate.status, 403);

  const announcementForm = new FormData();
  announcementForm.set("title", "Anunț de test");
  announcementForm.set("category", "Test");
  announcementForm.set("body", "Mesaj de test salvat cu succes.");
  announcementForm.set("image", new Blob([
    Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/pXcAAAAASUVORK5CYII=", "base64"),
  ], { type: "image/png" }), "anunt.png");
  const created = await json("/api/admin/announcements", {
    method: "POST",
    headers: adminHeaders(),
    body: announcementForm,
  });
  assert.equal(created.response.status, 201);
  assert.equal(created.body.title, "Anunț de test");

  const { body: updatedAnnouncements } = await json("/api/announcements");
  assert.equal(updatedAnnouncements.length, 3);
  assert.equal(updatedAnnouncements[0].id, created.body.id);

  const updateForm = new FormData();
  updateForm.set("title", "Anunț actualizat");
  updateForm.set("category", "Informări");
  updateForm.set("body", "Mesajul a fost modificat.");
  const updated = await json(`/api/admin/announcements/${created.body.id}`, {
    method: "PUT",
    headers: adminHeaders(),
    body: updateForm,
  });
  assert.equal(updated.response.status, 200);
  assert.equal(updated.body.title, "Anunț actualizat");
  assert.equal(updated.body.image, created.body.image);

  const imageResponse = await fetch(`${baseUrl}${created.body.image}`);
  assert.equal(imageResponse.status, 200);
  assert.match(imageResponse.headers.get("content-type"), /image\/png/);

  const staffForm = new FormData();
  staffForm.set("name", "Medic de test");
  staffForm.set("image", new Blob([
    Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/pXcAAAAASUVORK5CYII=", "base64"),
  ], { type: "image/png" }), "medic.png");
  const updatedMember = await json("/api/admin/staff/director-general", {
    method: "PUT",
    headers: adminHeaders(),
    body: staffForm,
  });
  assert.equal(updatedMember.response.status, 200);
  assert.equal(updatedMember.body.name, "Medic de test");
  assert.match(updatedMember.body.image, /^\/uploads\/[a-f0-9-]+\.png$/);

  const logout = await fetch(`${baseUrl}/api/admin/logout`, { method: "POST", headers: adminHeaders() });
  assert.equal(logout.status, 200);
  const expiredSession = await fetch(`${baseUrl}/api/admin/session`, { headers: { Cookie: adminCookie } });
  assert.equal((await expiredSession.json()).authenticated, false);
});
