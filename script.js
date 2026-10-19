const announcementList = document.querySelector("#announcement-list");
const staffList = document.querySelector("#staff-list");
const loginButton = document.querySelector("#admin-login-button");
const loginDialog = document.querySelector("#login-dialog");
const adminDialog = document.querySelector("#admin-dialog");
const loginForm = document.querySelector("#login-form");
const loginMessage = document.querySelector("#login-message");
const announcementForm = document.querySelector("#announcement-form");
const announcementMessage = document.querySelector("#announcement-message");
const adminAnnouncementList = document.querySelector("#admin-announcement-list");
const adminStaffList = document.querySelector("#admin-staff-list");
const serviceDetail = document.querySelector("#service-detail");
let isAuthenticated = false;
let announcements = [];
let staff = [];

const pageRoutes = {
  "/": { title: "Spitalul Medical Eclipse Tower", section: "acasa" },
  "/despre-noi": { title: "Despre noi", section: "despre-noi" },
  "/anunturi": { title: "Anunțuri", section: "anunturi" },
  "/conducere": { title: "Conducere", section: "conducere" },
  "/sub-departamente": { title: "Sub departamente", section: "subdepartamente" },
  "/cereri-de-audienta": {
    title: "Cereri de audiență",
    section: "service-detail",
    description: "Solicită o întâlnire cu echipa de conducere a Spitalului Medical Eclipse Tower.",
    details: ["Descrie pe scurt motivul întâlnirii.", "Include numele și datele tale de contact.", "Echipa de Relații Publice îți va răspunde pentru stabilirea detaliilor."],
    subject: "Cerere de audiență",
  },
  "/informatii": {
    title: "Informații",
    section: "service-detail",
    description: "Echipa noastră îți stă la dispoziție pentru întrebări și informații generale.",
    details: ["Trimite-ne întrebarea ta într-un mesaj.", "Menționează informația de care ai nevoie.", "Pentru situații urgente, contactează direct serviciile de urgență."],
    subject: "Solicitare de informații",
  },
  "/criterii-admitere": {
    title: "Criterii admitere",
    section: "service-detail",
    description: "Solicită informații despre criteriile și pașii procesului de admitere.",
    details: ["Cere lista actualizată a criteriilor.", "Pregătește documentele solicitate de echipă.", "Contactează Relațiile Publice pentru clarificări."],
    subject: "Criterii de admitere",
  },
  "/reintegrare": {
    title: "Reintegrare",
    section: "service-detail",
    description: "Află cum poți solicita sprijin pentru procesul de reintegrare în echipă.",
    details: ["Trimite o cerere cu numele tău complet.", "Descrie pe scurt situația și solicitarea.", "Echipa de conducere îți va comunica pașii următori."],
    subject: "Cerere de reintegrare",
  },
  "/transfer": {
    title: "Transfer",
    section: "service-detail",
    description: "Ia legătura cu echipa noastră pentru informații despre solicitarea unui transfer.",
    details: ["Precizează tipul transferului solicitat.", "Include datele necesare pentru a putea lua legătura cu tine.", "Relațiile Publice îți vor oferi informații despre pașii următori."],
    subject: "Cerere de transfer",
  },
};

function renderServiceDetail(route) {
  serviceDetail.replaceChildren();
  const kicker = document.createElement("p");
  kicker.className = "section-kicker";
  const kickerNumber = document.createElement("span");
  kickerNumber.textContent = "Informații utile";
  kicker.append(kickerNumber, document.createTextNode(" Servicii pentru comunitate"));
  const heading = document.createElement("h1");
  heading.className = "service-detail-title";
  heading.textContent = route.title;
  const description = document.createElement("p");
  description.className = "service-detail-description";
  description.textContent = route.description;
  const list = document.createElement("ol");
  list.className = "service-detail-list";
  route.details.forEach((detail, index) => {
    const item = document.createElement("li");
    const number = document.createElement("span");
    number.className = "service-detail-number";
    number.textContent = String(index + 1).padStart(2, "0");
    const text = document.createElement("span");
    text.textContent = detail;
    item.append(number, text);
    list.append(item);
  });
  const actions = document.createElement("div");
  actions.className = "service-detail-actions";
  const contact = document.createElement("a");
  contact.className = "button button-primary";
  contact.href = `mailto:relatiipublice@medicipentruoameni.ro?subject=${encodeURIComponent(route.subject)}`;
  contact.append(document.createTextNode("Scrie echipei de Relații Publice "));
  const arrow = document.createElement("span");
  arrow.setAttribute("aria-hidden", "true");
  arrow.textContent = "↗";
  contact.append(arrow);
  const services = document.createElement("a");
  services.className = "inline-link";
  services.href = "/sub-departamente";
  services.textContent = "Vezi toate sub departamentele";
  actions.append(contact, services);
  serviceDetail.append(kicker, heading, description, list, actions);
}

function applyPageRoute() {
  const pathname = window.location.pathname.replace(/\/+$/, "") || "/";
  const route = pageRoutes[pathname] ?? pageRoutes["/"];
  document.querySelectorAll("main > section").forEach((section) => {
    section.hidden = section.id !== route.section;
  });
  document.body.dataset.page = pathname;
  document.title = pathname === "/"
    ? "Spitalul Medical Eclipse Tower | Împreună pentru sănătate"
    : `${route.title} | Spitalul Medical Eclipse Tower`;
  document.querySelectorAll(".main-navigation a").forEach((link) => {
    if (link.getAttribute("href") === pathname) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
  if (route.section === "service-detail") renderServiceDetail(route);
}

applyPageRoute();

async function api(url, options = {}) {
  const response = await fetch(url, { credentials: "same-origin", ...options });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Cererea nu a putut fi finalizată.");
  return data;
}

function setMessage(element, text, isError = false) {
  element.textContent = text;
  element.classList.toggle("is-error", isError);
  element.classList.toggle("is-success", Boolean(text) && !isError);
}

function formatDate(value) {
  return new Intl.DateTimeFormat("ro-RO", { day: "numeric", month: "long", year: "numeric" }).format(new Date(value));
}

function makeAnnouncementCard(announcement) {
  const article = document.createElement("article");
  article.className = "announcement-card";

  const imageLink = document.createElement("a");
  imageLink.className = "announcement-image";
  imageLink.href = "/anunturi";
  imageLink.setAttribute("aria-label", `Citește anunțul: ${announcement.title}`);
  const image = document.createElement("img");
  image.src = announcement.image;
  image.alt = announcement.title;
  image.loading = "lazy";
  imageLink.append(image);
  const category = document.createElement("span");
  category.className = "image-label";
  category.textContent = announcement.category;
  imageLink.append(category);

  const content = document.createElement("div");
  content.className = "announcement-body";
  const date = document.createElement("p");
  date.className = "announcement-date";
  date.textContent = formatDate(announcement.publishedAt);
  const title = document.createElement("h3");
  title.textContent = announcement.title;
  const message = document.createElement("p");
  message.textContent = announcement.body;
  const footer = document.createElement("div");
  footer.className = "announcement-footer";
  const author = document.createElement("span");
  author.textContent = "Relații Publice";
  const more = document.createElement("a");
  more.href = "/informatii";
  more.setAttribute("aria-label", `Află mai multe despre: ${announcement.title}`);
  more.append(document.createTextNode("Citește mai mult "));
  const arrow = document.createElement("span");
  arrow.setAttribute("aria-hidden", "true");
  arrow.textContent = "↗";
  more.append(arrow);
  footer.append(author, more);
  content.append(date, title, message, footer);

  if (isAuthenticated) {
    const actions = document.createElement("div");
    actions.className = "announcement-admin-actions";
    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "button button-secondary";
    editButton.textContent = "Modifică anunțul";
    editButton.addEventListener("click", () => editAnnouncement(announcement.id));
    actions.append(editButton);
    content.append(actions);
  }

  article.append(imageLink, content);
  return article;
}

function renderAnnouncements() {
  announcementList.replaceChildren();
  if (announcements.length === 0) {
    const empty = document.createElement("p");
    empty.className = "loading-state";
    empty.textContent = "Nu sunt anunțuri publicate momentan.";
    announcementList.append(empty);
    return;
  }
  for (const announcement of announcements) {
    announcementList.append(makeAnnouncementCard(announcement));
  }
  if (isAuthenticated) renderAdminAnnouncements();
}

function makeStaffCard(member) {
  const card = document.createElement("article");
  card.className = `org-card ${member.style}`;
  const portrait = document.createElement("div");
  portrait.className = "org-portrait";
  portrait.setAttribute("aria-hidden", "true");
  if (member.image) {
    const image = document.createElement("img");
    image.src = member.image;
    image.loading = "lazy";
    portrait.append(image);
  } else {
    const initials = {
      "org-director": "DG",
      "org-deputy": "DA",
      "org-inspector": "MI",
      "org-surgeon": "MC",
    };
    portrait.textContent = initials[member.style] ?? "+";
  }
  const details = document.createElement("div");
  details.className = "org-details";
  const name = document.createElement("strong");
  name.className = "org-name";
  name.textContent = member.name;
  const role = document.createElement("span");
  role.className = "org-role";
  role.textContent = member.role;
  const responsibility = document.createElement("span");
  responsibility.className = "org-responsibility";
  responsibility.textContent = member.responsibility;
  details.append(role, name, responsibility);
  card.append(portrait, details);
  return card;
}

function renderStaff() {
  const tree = document.createElement("div");
  tree.className = "org-tree";

  const decorations = document.createElement("div");
  decorations.className = "org-decorations";
  decorations.setAttribute("aria-hidden", "true");
  for (let index = 0; index < 8; index += 1) {
    const orbit = document.createElement("span");
    orbit.className = `org-decoration org-decoration-${index + 1}`;
    decorations.append(orbit);
  }

  const orderedStaff = (style) => staff
    .filter((member) => member.style === style)
    .sort((first, second) => first.id.localeCompare(second.id, undefined, { numeric: true }));

  const makeNode = (member) => {
    const node = document.createElement("div");
    node.className = "org-tree-node";
    node.append(makeStaffCard(member));
    return node;
  };

  const director = staff.find((member) => member.style === "org-director");
  if (director) {
    const root = document.createElement("div");
    root.className = "org-tree-root";
    root.append(makeStaffCard(director));
    tree.append(root);
  }

  const addLink = () => {
    const link = document.createElement("div");
    link.className = "org-tree-link";
    link.setAttribute("aria-hidden", "true");
    tree.append(link);
  };

  const addLevel = (members, levelClass, label) => {
    if (members.length === 0) return false;
    const row = document.createElement("div");
    row.className = `org-tree-row ${levelClass}`;
    row.setAttribute("role", "group");
    row.setAttribute("aria-label", label);
    for (const member of members) row.append(makeNode(member));
    tree.append(row);
    return true;
  };

  if (director) addLink();
  const hasDeputies = addLevel(orderedStaff("org-deputy"), "org-row-deputies", "Directorii adjuncți");
  if (hasDeputies) addLink();
  const hasInspectors = addLevel(orderedStaff("org-inspector"), "org-row-inspectors", "Medicii inspectori");
  if (hasInspectors) addLink();
  addLevel(orderedStaff("org-surgeon"), "org-row-surgeons", "Medicii chirurgi");

  staffList.replaceChildren(decorations, tree);
  if (isAuthenticated) renderAdminStaff();
}

function renderAdminAnnouncements() {
  adminAnnouncementList.replaceChildren();
  announcements.forEach((announcement) => {
    const row = document.createElement("article");
    row.className = "admin-list-row";
    const image = document.createElement("img");
    image.src = announcement.image;
    image.alt = "";
    const details = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = announcement.title;
    const date = document.createElement("span");
    date.textContent = `${announcement.category} · ${formatDate(announcement.publishedAt)}`;
    details.append(title, date);
    const edit = document.createElement("button");
    edit.type = "button";
    edit.className = "button button-secondary";
    edit.textContent = "Modifică";
    edit.addEventListener("click", () => editAnnouncement(announcement.id));
    row.append(image, details, edit);
    adminAnnouncementList.append(row);
  });
}

function renderAdminStaff() {
  adminStaffList.replaceChildren();
  staff.forEach((member) => {
    const form = document.createElement("form");
    form.className = "staff-editor";
    form.dataset.staffId = member.id;
    const portrait = document.createElement("div");
    portrait.className = "staff-editor-portrait";
    if (member.image) {
      const image = document.createElement("img");
      image.src = member.image;
      image.alt = "";
      portrait.append(image);
    } else {
      portrait.textContent = "+";
      portrait.setAttribute("aria-hidden", "true");
    }
    const fields = document.createElement("div");
    fields.className = "staff-editor-fields";
    const role = document.createElement("span");
    role.className = "dialog-kicker";
    role.textContent = member.role;
    const label = document.createElement("label");
    label.textContent = "Numele medicului";
    const name = document.createElement("input");
    name.name = "name";
    name.type = "text";
    name.maxLength = 80;
    name.minLength = 2;
    name.required = true;
    name.value = member.name === "Nume în curs de completare" ? "" : member.name;
    name.placeholder = "Scrie numele complet";
    label.append(name);
    const photoLabel = document.createElement("label");
    photoLabel.className = "photo-input-label";
    photoLabel.textContent = member.image ? "Schimbă fotografia" : "Adaugă fotografie";
    const photo = document.createElement("input");
    photo.name = "image";
    photo.type = "file";
    photo.accept = "image/jpeg,image/png,image/webp";
    photoLabel.append(photo);
    const message = document.createElement("span");
    message.className = "form-message";
    message.setAttribute("aria-live", "polite");
    const save = document.createElement("button");
    save.type = "submit";
    save.className = "button button-secondary";
    save.textContent = "Salvează profilul";
    fields.append(role, label, photoLabel, message, save);
    form.append(portrait, fields);
    form.addEventListener("submit", saveStaffMember);
    adminStaffList.append(form);
  });
}

function editAnnouncement(id) {
  const announcement = announcements.find((item) => item.id === id);
  if (!announcement) return;
  const form = announcementForm.elements;
  form.id.value = announcement.id;
  form.title.value = announcement.title;
  form.category.value = announcement.category;
  form.body.value = announcement.body;
  form.image.value = "";
  form.image.required = false;
  document.querySelector("#announcement-submit").innerHTML = "Salvează modificările";
  document.querySelector("#announcement-cancel").hidden = false;
  setMessage(announcementMessage, "Imaginea actuală rămâne neschimbată dacă nu alegi una nouă.");
  announcementForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

function resetAnnouncementForm() {
  announcementForm.reset();
  announcementForm.elements.id.value = "";
  announcementForm.elements.image.required = true;
  document.querySelector("#announcement-submit").textContent = "Publică anunțul ↗";
  document.querySelector("#announcement-cancel").hidden = true;
  setMessage(announcementMessage, "");
}

async function loadPublicContent() {
  const [announcementData, staffData] = await Promise.all([
    api("/api/announcements"),
    api("/api/staff"),
  ]);
  announcements = announcementData;
  staff = staffData;
  renderAnnouncements();
  renderStaff();
}

async function refreshSession() {
  try {
    const session = await api("/api/admin/session");
    isAuthenticated = session.authenticated;
    if (isAuthenticated) {
      loginButton.textContent = "Administrare";
      renderAnnouncements();
      renderStaff();
    } else {
      loginButton.textContent = "Conectare ↗";
    }
  } catch {
    isAuthenticated = false;
    loginButton.textContent = "Conectare ↗";
  }
}

loginButton.addEventListener("click", () => {
  if (isAuthenticated) {
    renderAdminAnnouncements();
    renderAdminStaff();
    adminDialog.showModal();
    return;
  }
  setMessage(loginMessage, "");
  loginDialog.showModal();
});

document.querySelectorAll("[data-close-dialog]").forEach((button) => {
  button.addEventListener("click", () => button.closest("dialog").close());
});

for (const dialog of [loginDialog, adminDialog]) {
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const submitButton = loginForm.querySelector("button[type=submit]");
  submitButton.disabled = true;
  setMessage(loginMessage, "Se verifică datele de conectare...");
  try {
    await api("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: loginForm.elements.username.value,
        password: loginForm.elements.password.value,
      }),
    });
    isAuthenticated = true;
    loginForm.reset();
    loginButton.textContent = "Administrare";
    loginDialog.close();
    await loadPublicContent();
    renderAdminAnnouncements();
    renderAdminStaff();
    adminDialog.showModal();
  } catch (error) {
    setMessage(loginMessage, error.message, true);
  } finally {
    submitButton.disabled = false;
  }
});

document.querySelectorAll(".admin-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".admin-tab").forEach((item) => {
      const active = item === tab;
      item.classList.toggle("is-active", active);
      item.setAttribute("aria-selected", String(active));
    });
    document.querySelectorAll(".admin-section").forEach((panel) => {
      panel.hidden = panel.id !== tab.dataset.panel;
    });
  });
});

announcementForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const submitButton = document.querySelector("#announcement-submit");
  submitButton.disabled = true;
  setMessage(announcementMessage, "Se salvează anunțul...");
  try {
    const formData = new FormData(announcementForm);
    const id = formData.get("id");
    formData.delete("id");
    const result = await api(id ? `/api/admin/announcements/${encodeURIComponent(id)}` : "/api/admin/announcements", {
      method: id ? "PUT" : "POST",
      body: formData,
    });
    if (id) {
      announcements = announcements.map((item) => item.id === id ? result : item);
    } else {
      announcements = [result, ...announcements].slice(0, 3);
    }
    renderAnnouncements();
    renderAdminAnnouncements();
    resetAnnouncementForm();
    setMessage(announcementMessage, id ? "Anunțul a fost actualizat." : "Anunțul a fost publicat.");
  } catch (error) {
    setMessage(announcementMessage, error.message, true);
  } finally {
    submitButton.disabled = false;
  }
});

document.querySelector("#announcement-cancel").addEventListener("click", resetAnnouncementForm);

async function saveStaffMember(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const submitButton = form.querySelector("button[type=submit]");
  const message = form.querySelector(".form-message");
  submitButton.disabled = true;
  setMessage(message, "Se salvează profilul...");
  try {
    const result = await api(`/api/admin/staff/${encodeURIComponent(form.dataset.staffId)}`, {
      method: "PUT",
      body: new FormData(form),
    });
    staff = staff.map((member) => member.id === result.id ? result : member);
    renderStaff();
    renderAdminStaff();
    const savedForm = [...adminStaffList.querySelectorAll(".staff-editor")].find((item) => item.dataset.staffId === result.id);
    setMessage(savedForm.querySelector(".form-message"), "Profilul a fost salvat.");
  } catch (error) {
    setMessage(message, error.message, true);
  } finally {
    submitButton.disabled = false;
  }
}

document.querySelector("#logout-button").addEventListener("click", async () => {
  const logoutButton = document.querySelector("#logout-button");
  logoutButton.disabled = true;
  try {
    await api("/api/admin/logout", { method: "POST" });
    isAuthenticated = false;
    loginButton.textContent = "Conectare ↗";
    resetAnnouncementForm();
    adminDialog.close();
    renderAnnouncements();
  } catch (error) {
    window.alert(error.message);
  } finally {
    logoutButton.disabled = false;
  }
});

const menuToggle = document.querySelector(".menu-toggle");
const navigation = document.querySelector(".main-navigation");

if (menuToggle && navigation) {
  menuToggle.addEventListener("click", () => {
    const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
    menuToggle.setAttribute("aria-expanded", String(!isOpen));
    navigation.classList.toggle("is-open", !isOpen);
  });

  navigation.addEventListener("click", (event) => {
    if (event.target instanceof HTMLAnchorElement) {
      menuToggle.setAttribute("aria-expanded", "false");
      navigation.classList.remove("is-open");
    }
  });
}

loadPublicContent().catch((error) => {
  announcementList.replaceChildren();
  staffList.replaceChildren();
  const announcementError = document.createElement("p");
  announcementError.className = "loading-state is-error";
  announcementError.textContent = `Anunțurile nu s-au putut încărca: ${error.message}`;
  const staffError = document.createElement("p");
  staffError.className = "loading-state is-error";
  staffError.textContent = `Organigrama nu s-a putut încărca: ${error.message}`;
  announcementList.append(announcementError);
  staffList.append(staffError);
});
refreshSession();
