import assert from "node:assert/strict";
import { once } from "node:events";
import { randomBytes } from "node:crypto";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";

let db;
let server;
let sheetServer;
let baseUrl;
let adminCookie;
let temporaryDirectory;
let createApp;
let initializeDatabase;
let testAdminPassword;
let sheetCsv;

before(async () => {
  temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), "eclipse-site-"));
  process.env.UPLOAD_DIRECTORY = path.join(temporaryDirectory, "uploads");
  process.env.ADMIN_USERNAME = "MediciFplayT";
  testAdminPassword = randomBytes(24).toString("base64url");
  process.env.ADMIN_PASSWORD = testAdminPassword;
  process.env.STAFF_SHEET_SYNC_INTERVAL_MS = "0";
  sheetCsv = [
    '"","ID ","NR. INSIGNA ","NUME ","RANK "',
    '"","9335","001","Darrin Rodriguez","DIRECTOR GENERAL"',
    '"","10681","002","Antonio Shades","DIRECTOR ADJUNCT"',
    '"","10682","003","Marius Mark","DIRECTOR ADJUNCT"',
    '"","10683","004","Erwin Moretti","MEDIC INSPECTOR"',
    '"","10684","005","Mihail Parvu","MEDIC INSPECTOR"',
    '"","10685","006","Inspector Test 3","MEDIC INSPECTOR"',
    '"","10686","007","Vlad Samson","MEDIC CHIRURG"',
    '"","10687","008","Xender NDC","MEDIC CHIRURG"',
    '"","10688","009","AlMajdi Tariq","MEDIC CHIRURG"',
    '"","10690","011","Persoană din alt grad","MEDIC PRIMAR"',
  ].join("\r\n");
  sheetServer = createServer((_request, response) => {
    response.setHeader("Content-Type", "text/csv; charset=utf-8");
    response.end(sheetCsv);
  }).listen(0, "127.0.0.1");
  await once(sheetServer, "listening");
  process.env.STAFF_SHEET_URL = `http://127.0.0.1:${sheetServer.address().port}/staff.csv`;
  ({ createApp, initializeDatabase } = await import("../server.js"));
  db = initializeDatabase(path.join(temporaryDirectory, "site.db"));
  server = createApp(db).listen(0, "127.0.0.1");
  await once(server, "listening");
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  if (sheetServer) await new Promise((resolve, reject) => sheetServer.close((error) => error ? reject(error) : resolve()));
  if (db) db.close();
  if (temporaryDirectory) await rm(temporaryDirectory, { recursive: true, force: true });
  delete process.env.UPLOAD_DIRECTORY;
  delete process.env.ADMIN_USERNAME;
  delete process.env.ADMIN_PASSWORD;
  delete process.env.STAFF_SHEET_URL;
  delete process.env.STAFF_SHEET_SYNC_INTERVAL_MS;
});

async function json(url, options) {
  const response = await fetch(`${baseUrl}${url}`, options);
  return { response, body: await response.json() };
}

function adminHeaders(extra = {}) {
  return { Cookie: adminCookie, Origin: baseUrl, ...extra };
}

test("serves the site, synchronizes Google Sheets staff, and persists authenticated edits", async () => {
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

  const { body: staffData } = await json("/api/staff");
  const staff = staffData.members;
  assert.equal(staff.length, 9);
  assert.equal(staffData.syncError, false);
  assert.deepEqual(
    staff.reduce((counts, member) => counts.set(member.role, (counts.get(member.role) ?? 0) + 1), new Map()),
    new Map([["DIRECTOR GENERAL", 1], ["DIRECTOR ADJUNCT", 2], ["MEDIC INSPECTOR", 3], ["MEDIC CHIRURG", 3]]),
  );
  assert.equal(staff.find((member) => member.role === "DIRECTOR GENERAL").name, "Darrin Rodriguez");

  const { response: initialDepartmentsResponse, body: initialDepartments } = await json("/api/departments");
  assert.equal(initialDepartmentsResponse.status, 200);
  assert.equal(initialDepartments.length, 6);
  assert.equal(initialDepartments[0].members[0].name, "Freya NDC");

  sheetCsv = sheetCsv
    .replace("Darrin Rodriguez", "Darrin Actualizat")
    .replace(
      '"","10688","009","AlMajdi Tariq","MEDIC CHIRURG"',
      '"","10688","009","AlMajdi Tariq","MEDIC CHIRURG"\r\n"","10689","010","Chirurg Nou","MEDIC CHIRURG"',
    );
  const { body: refreshedStaffData } = await json("/api/staff");
  assert.equal(refreshedStaffData.members.length, 10);
  assert.equal(refreshedStaffData.members.find((member) => member.role === "DIRECTOR GENERAL").name, "Darrin Actualizat");
  assert.equal(refreshedStaffData.members.find((member) => member.name === "Chirurg Nou").role, "MEDIC CHIRURG");
  const { response: siteSettingsResponse, body: siteSettings } = await json("/api/site-settings");
  assert.equal(siteSettingsResponse.status, 200);
  assert.equal(siteSettings.heroImage, "/assets/hero.png");

  const { response: signedOutResponse, body: signedOutSession } = await json("/api/admin/session");
  assert.equal(signedOutResponse.status, 200);
  assert.equal(signedOutSession.authenticated, false);
  const unauthorizedDepartment = await fetch(`${baseUrl}/api/admin/departments`, {
    method: "POST",
    headers: { Origin: baseUrl, "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Neautorizat", subtitle: "", color: "#123456" }),
  });
  assert.equal(unauthorizedDepartment.status, 401);

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

  const createdDepartment = await json("/api/admin/departments", {
    method: "POST",
    headers: adminHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ title: "Departament de test", subtitle: "Echipă de test", color: "#123456" }),
  });
  assert.equal(createdDepartment.response.status, 201);
  const departmentId = createdDepartment.body.id;

  const createdDepartmentMemberForm = new FormData();
  createdDepartmentMemberForm.set("name", "Membru de test");
  createdDepartmentMemberForm.set("title", "Coordonator");
  createdDepartmentMemberForm.set("contact", "@test · 123");
  createdDepartmentMemberForm.set("image", new Blob([
    Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/pXcAAAAASUVORK5CYII=", "base64"),
  ], { type: "image/png" }), "membru.png");
  const createdDepartmentMember = await json(`/api/admin/departments/${departmentId}/members`, {
    method: "POST",
    headers: adminHeaders(),
    body: createdDepartmentMemberForm,
  });
  assert.equal(createdDepartmentMember.response.status, 201);
  const departmentMemberId = createdDepartmentMember.body.id;

  const updatedDepartmentMemberForm = new FormData();
  updatedDepartmentMemberForm.set("name", "Membru actualizat");
  updatedDepartmentMemberForm.set("title", "Manager");
  updatedDepartmentMemberForm.set("contact", "@manager · 456");
  const updatedDepartmentMember = await json(`/api/admin/department-members/${departmentMemberId}`, {
    method: "PUT",
    headers: adminHeaders(),
    body: updatedDepartmentMemberForm,
  });
  assert.equal(updatedDepartmentMember.response.status, 200);
  assert.equal(updatedDepartmentMember.body.name, "Membru actualizat");
  assert.equal(updatedDepartmentMember.body.image, createdDepartmentMember.body.image);

  const updatedDepartmentForm = new FormData();
  updatedDepartmentForm.set("title", "Departament actualizat");
  updatedDepartmentForm.set("subtitle", "Descriere actualizată");
  updatedDepartmentForm.set("color", "#654321");
  updatedDepartmentForm.set("emblem", new Blob([
    Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/pXcAAAAASUVORK5CYII=", "base64"),
  ], { type: "image/png" }), "sigla.png");
  const updatedDepartment = await json(`/api/admin/departments/${departmentId}`, {
    method: "PUT",
    headers: adminHeaders(),
    body: updatedDepartmentForm,
  });
  assert.equal(updatedDepartment.response.status, 200);
  assert.equal(updatedDepartment.body.title, "Departament actualizat");
  assert.equal(updatedDepartment.body.members[0].contact, "@manager · 456");
  assert.match(updatedDepartment.body.emblem, /^\/uploads\/[a-f0-9-]+\.png$/);

  const deletedDepartmentMember = await fetch(`${baseUrl}/api/admin/department-members/${departmentMemberId}`, {
    method: "DELETE",
    headers: adminHeaders(),
  });
  assert.equal(deletedDepartmentMember.status, 200);
  const deletedDepartment = await fetch(`${baseUrl}/api/admin/departments/${departmentId}`, {
    method: "DELETE",
    headers: adminHeaders(),
  });
  assert.equal(deletedDepartment.status, 200);

  const unauthorizedUpdate = await fetch(`${baseUrl}/api/admin/staff/director-general`, {
    method: "PUT",
    headers: { Cookie: adminCookie, "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Director fără verificarea origin-ului" }),
  });
  assert.equal(unauthorizedUpdate.status, 403);

  const heroImageForm = new FormData();
  heroImageForm.set("image", new Blob([
    Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/pXcAAAAASUVORK5CYII=", "base64"),
  ], { type: "image/png" }), "imagine-principala.png");
  const updatedHeroImage = await json("/api/admin/site-settings/hero-image", {
    method: "PUT",
    headers: adminHeaders(),
    body: heroImageForm,
  });
  assert.equal(updatedHeroImage.response.status, 200);
  assert.match(updatedHeroImage.body.heroImage, /^\/uploads\/[a-f0-9-]+\.png$/);
  const { body: savedSiteSettings } = await json("/api/site-settings");
  assert.equal(savedSiteSettings.heroImage, updatedHeroImage.body.heroImage);

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
  staffForm.set("image", new Blob([
    Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/pXcAAAAASUVORK5CYII=", "base64"),
  ], { type: "image/png" }), "medic.png");
  const updatedMember = await json("/api/admin/staff/director-general", {
    method: "PUT",
    headers: adminHeaders(),
    body: staffForm,
  });
  assert.equal(updatedMember.response.status, 200);
  assert.equal(updatedMember.body.name, "Darrin Actualizat");
  assert.match(updatedMember.body.image, /^\/uploads\/[a-f0-9-]+\.png$/);

  sheetCsv = sheetCsv.replace("Darrin Actualizat", "Darrin Sincronizat");
  const { body: finalStaffData } = await json("/api/staff");
  const synchronizedMember = finalStaffData.members.find((member) => member.id === "director-general");
  assert.equal(synchronizedMember.name, "Darrin Sincronizat");
  assert.equal(synchronizedMember.image, updatedMember.body.image);

  const logout = await fetch(`${baseUrl}/api/admin/logout`, { method: "POST", headers: adminHeaders() });
  assert.equal(logout.status, 200);
  const expiredSession = await fetch(`${baseUrl}/api/admin/session`, { headers: { Cookie: adminCookie } });
  assert.equal((await expiredSession.json()).authenticated, false);
});
