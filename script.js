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
const departmentList = document.querySelector("#department-list");
const adminDepartmentList = document.querySelector("#admin-department-list");
const newDepartmentForm = document.querySelector("#new-department-form");
const newDepartmentMessage = document.querySelector("#new-department-message");
const staffSyncStatus = document.querySelector("#staff-sync-status");
const heroImage = document.querySelector("#hero-image");
const heroImageForm = document.querySelector("#hero-image-form");
const heroImagePreview = document.querySelector("#hero-image-preview");
const heroImageMessage = document.querySelector("#hero-image-message");
const serviceDetail = document.querySelector("#service-detail");
let isAuthenticated = false;
let announcements = [];
let staff = [];
let departments = [];
let heroPreviewUrl = "";

const pageRoutes = {
  "/": { title: "Spitalul Medical Eclipse Tower", section: "acasa" },
  "/despre-noi": { title: "Despre noi", section: "despre-noi" },
  "/anunturi": { title: "Anunțuri", section: "anunturi" },
  "/conducere": { title: "Conducere", section: "conducere" },
  "/sub-departamente": { title: "Sub departamente", section: "subdepartamente" },
  "/cereri-de-audienta": {
    title: "Cereri de audiență",
    section: "service-detail",
    details: ["Descrie motivul cererii de audiență.", "Include numele și datele tale de contact.", "Conducerea îți va răspunde pentru stabilirea detaliilor."],
    formUrl: "https://docs.google.com/forms/d/e/1FAIpQLScq3rOOmd0S1iUsnTKAgREkLymWRexNCPSytURbYfHmT_IPHQ/viewform",
  },
  "/informatii": {
    title: "Informații",
    section: "service-detail",
    description: "Echipa noastră îți stă la dispoziție pentru întrebări și informații generale.",
    details: ["Trimite-ne întrebarea ta într-un mesaj.", "Menționează informația de care ai nevoie.", "Pentru situații urgente, contactează direct serviciile de urgență."],
  },
  "/criterii-admitere": {
    title: "Criterii admitere",
    section: "service-detail",
    description: "Informații importante despre cerințele și regulile departamentului.",
    infoCards: [
      { title: "Ore necesare", text: "Minimum 50 de ore pentru a aplica în departament.", icon: "calendar" },
      { title: "Personal nou", text: "CK îți permite să aplici chiar și cu 0 ore.", icon: "person" },
      { title: "Estetică", text: "Tatuajele de pe față trebuie eliminate la intrare.", icon: "shield" },
      { title: "Complexitate", text: "Structura este complexă și necesită timp de învățare.", icon: "network" },
      { title: "Regulament", text: "Regulamentul pentru susținerea testelor se găsește pe forum.", icon: "document" },
      { title: "Blacklist", text: "Prea multe intrări și ieșiri pot duce la restricții temporare.", icon: "ban" },
      { title: "Joburi externe", text: "Odată cu intrarea în departament, nu poți avea alt job, part-time sau full-time.", icon: "briefcase" },
      { title: "Eligibilitate", text: "Este necesar să nu ai sancțiuni grave și să ai o atitudine matură, IC și OOC.", icon: "check" },
      { title: "Prezență", text: "Activitatea regulată este obligatorie pentru a rămâne în departament.", icon: "badge" },
    ],
  },
  "/reintegrare": {
    title: "Reintegrare",
    section: "service-detail",
    description: "Condițiile și termenele de reintegrare în departament.",
    infoCards: [
      { title: "Foste grade 200 și 300", text: "Reintră ca grad 400. Reintegrarea este posibilă în termen de până la 4 luni de la demisie.", icon: "person" },
      { title: "Fost grad 100", text: "Reintră ca grad 300. Reintegrarea este posibilă în termen de până la 4 luni de la demisie.", icon: "person" },
      { title: "Foste grade de conducere", text: "Vor fi reintegrate ca grad 200 și pot beneficia de reintegrare în maximum 2 luni.", icon: "badge" },
      { title: "Reintegrare după 2 luni", text: "Reintegrarea se poate face o singură dată și după 2 luni, însă cu beneficiile gradului 300.", icon: "calendar" },
      { title: "Certificate obligatorii", text: "Cei care revin prin reintegrare trebuie să obțină certificatele RADIO / BLS / ALS în primele două zile.", icon: "document" },
    ],
  },
  "/transfer": {
    title: "Transfer",
    section: "service-detail",
    description: "Gradele acordate în urma transferului, în funcție de gradul deținut.",
    infoCards: [
      { title: "Agent Pază+ [AGP+]", text: "Va primi în urma transferului gradul de BRANCARDIER.", icon: "shield" },
      { title: "Cadet [CD]", text: "Va primi în urma transferului gradul de BRANCARDIER.", icon: "person" },
      { title: "Agent [AG]", text: "Va primi în urma transferului gradul de MEDIC STAGIAR.", icon: "briefcase" },
      { title: "Agent Principal+ [AP+]", text: "Va primi în urma transferului gradul de MEDIC REZIDENT.", icon: "badge" },
      { title: "Gradele CONDUCERII [PJ + PENITENCIAR]", text: "Vor primi în urma transferului gradul de MEDIC REZIDENT, cu AVANSARE MAI RAPIDĂ.", icon: "check" },
    ],
  },
};

function renderServiceDetail(route) {
  serviceDetail.replaceChildren();
  serviceDetail.className = route.formUrl
    ? "service-detail section-wrap service-detail-audience"
    : "service-detail section-wrap";
  const kicker = document.createElement("p");
  kicker.className = "section-kicker";
  if (route.infoCards) {
    const emblem = document.createElement("span");
    emblem.className = "service-info-kicker-icon";
    emblem.setAttribute("aria-hidden", "true");
    emblem.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z"/><path d="m9 12 2 2 4-4"/></svg>';
    kicker.append(emblem, document.createTextNode("Informații utile"));
  } else {
    const kickerNumber = document.createElement("span");
    kickerNumber.textContent = "Informații utile";
    kicker.append(kickerNumber, document.createTextNode(" Servicii pentru comunitate"));
  }
  const heading = document.createElement("h1");
  heading.className = "service-detail-title";
  if (route.infoCards) {
    const titleWords = route.title.split(" ");
    heading.append(
      document.createTextNode(`${titleWords.slice(0, -1).join(" ")} `),
      Object.assign(document.createElement("span"), { textContent: titleWords.at(-1) }),
    );
  } else {
    heading.textContent = route.title;
  }
  const intro = document.createElement("div");
  intro.className = "service-detail-intro";
  intro.append(kicker, heading);
  if (route.description) {
    const description = document.createElement("p");
    description.className = "service-detail-description";
    description.textContent = route.description;
    intro.append(description);
  }

  if (route.infoCards) {
    const cards = document.createElement("div");
    cards.className = "service-info-grid";
    route.infoCards.forEach((info, index) => {
      const card = document.createElement("article");
      card.className = `service-info-card service-info-card-${(index % 9) + 1}`;
      const icon = document.createElement("span");
      icon.className = "service-info-icon";
      icon.setAttribute("aria-hidden", "true");
      const iconSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      iconSvg.setAttribute("viewBox", "0 0 24 24");
      iconSvg.setAttribute("fill", "none");
      iconSvg.setAttribute("stroke", "currentColor");
      iconSvg.setAttribute("stroke-width", "1.8");
      iconSvg.setAttribute("stroke-linecap", "round");
      iconSvg.setAttribute("stroke-linejoin", "round");
      const iconPaths = {
        calendar: ["M7 3v3M17 3v3M4 9h16", "M5 5h14a1 1 0 0 1 1 1v13H4V6a1 1 0 0 1 1-1Z", "M8 13h2M14 13h2M8 16h2"],
        person: ["M20 21a8 8 0 0 0-16 0", "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"],
        shield: ["M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z", "m9 12 2 2 4-4"],
        network: ["M12 8V4M6 20v-4m12 4v-4M12 12H6m12 0h-6", "M9 4h6v4H9zM3 16h6v4H3zM15 16h6v4h-6z"],
        document: ["M7 3h10l3 3v15H4V3h3Z", "M14 3v4h5M8 12h8M8 16h8"],
        ban: ["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z", "m5 5 14 14"],
        briefcase: ["M3 8h18v13H3zM8 8V5h8v3M3 13h18M10 13v2h4v-2"],
        check: ["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z", "m7 12 3 3 7-7"],
        badge: ["M12 3 15 5l4 .5.5 4 2 2.5-2 2.5-.5 4-4 .5-3 2-3-2-4-.5-.5-4L2.5 12l2-2.5.5-4L9 5l3-2Z", "m9 12 2 2 4-4"],
      }[info.icon] ?? ["M12 5v14M5 12h14"];
      iconPaths.forEach((pathData) => {
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", pathData);
        iconSvg.append(path);
      });
      icon.append(iconSvg);
      const number = document.createElement("span");
      number.className = "service-info-number";
      number.textContent = String(index + 1).padStart(2, "0");
      const heading = document.createElement("h2");
      heading.textContent = info.title;
      const text = document.createElement("p");
      text.textContent = info.text;
      const arrow = document.createElement("span");
      arrow.className = "service-info-arrow";
      arrow.setAttribute("aria-hidden", "true");
      arrow.textContent = "→";
      card.append(icon, number, heading, text, arrow);
      cards.append(card);
    });
    const ornament = document.createElement("div");
    ornament.className = "service-info-ornament";
    ornament.setAttribute("aria-hidden", "true");
    ornament.append(document.createElement("span"), Object.assign(document.createElement("span"), { textContent: "★" }), document.createElement("span"));
    serviceDetail.classList.add("service-detail-info-page");
    serviceDetail.append(intro, cards, ornament);
    return;
  }

  const list = document.createElement("ol");
  list.className = route.formUrl ? "service-detail-list service-detail-steps" : "service-detail-list";
  route.details.forEach((detail, index) => {
    const item = document.createElement("li");
    const number = document.createElement("span");
    number.className = route.formUrl ? "service-detail-number service-step-number" : "service-detail-number";
    number.textContent = String(index + 1).padStart(2, "0");
    const text = document.createElement("span");
    text.textContent = detail;
    item.append(number, text);
    list.append(item);
  });
  if (route.formUrl) {
    const actions = document.createElement("div");
    actions.className = "service-detail-actions service-request-card";
    const icon = document.createElement("span");
    icon.className = "service-request-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = "＋";
    const contact = document.createElement("a");
    contact.className = "button button-primary";
    contact.href = route.formUrl;
    contact.target = "_blank";
    contact.rel = "noopener noreferrer";
    contact.append(icon, document.createTextNode("Cerere Audiență "));
    const arrow = document.createElement("span");
    arrow.setAttribute("aria-hidden", "true");
    arrow.textContent = "↗";
    contact.append(arrow);
    const requestCopy = document.createElement("div");
    requestCopy.className = "service-request-copy";
    const requestKicker = document.createElement("span");
    requestKicker.className = "dialog-kicker";
    requestKicker.textContent = "Solicitare online";
    const requestHeading = document.createElement("h2");
    requestHeading.textContent = "Ai nevoie de o audiență?";
    const requestDescription = document.createElement("p");
    requestDescription.textContent = "Completează formularul și echipa noastră te va contacta pentru stabilirea întâlnirii.";
    requestCopy.append(requestKicker, requestHeading, requestDescription);
    actions.append(requestCopy, contact);
    serviceDetail.append(intro, list, actions);
  } else {
    serviceDetail.append(intro, list);
  }
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
  let response;
  try {
    response = await fetch(url, { credentials: "same-origin", ...options });
  } catch (error) {
    if (!(error instanceof TypeError)) throw error;
    throw new Error("Serverul nu răspunde. Pornește site-ul cu `npm start` și deschide http://localhost:3000.");
  }
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
  const seniority = document.createElement("span");
  seniority.className = "org-seniority";
  seniority.textContent = `Vechime: ${member.joinedAt || "—"}`;
  details.append(role, name, seniority);
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

  const orderedStaff = (style) => staff.filter((member) => member.style === style);

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
    row.style.gridTemplateColumns = `repeat(${members.length}, minmax(0, 1fr))`;
    row.style.setProperty("--org-branch-inset", `${50 / members.length}%`);
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

function makeDepartmentMemberCard(member, department) {
  const card = document.createElement("article");
  card.className = `department-member${member.name.toLocaleUpperCase("ro-RO") === "VACANT" ? " is-vacant" : ""}`;
  card.style.setProperty("--department-color", department.color);
  const portrait = document.createElement("div");
  portrait.className = "department-member-portrait";
  if (member.image) {
    const image = document.createElement("img");
    image.src = member.image;
    image.alt = "";
    image.loading = "lazy";
    portrait.append(image);
  } else {
    portrait.textContent = member.name.toLocaleUpperCase("ro-RO") === "VACANT"
      ? "—"
      : member.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toLocaleUpperCase("ro-RO");
    portrait.setAttribute("aria-hidden", "true");
  }

  const details = document.createElement("div");
  details.className = "department-member-details";
  const name = document.createElement("h4");
  name.textContent = member.name;
  const title = document.createElement("p");
  title.textContent = member.title;
  const contact = document.createElement("p");
  contact.className = "department-member-contact";
  contact.textContent = member.contact ? `Contact: ${member.contact}` : "Contact: —";
  details.append(name, title, contact);
  card.append(portrait, details);
  return card;
}

function renderDepartments() {
  departmentList.replaceChildren();
  if (!departments.length) {
    const empty = document.createElement("p");
    empty.className = "loading-state";
    empty.textContent = "Nu sunt încă departamente adăugate.";
    departmentList.append(empty);
    return;
  }

  departments.forEach((department, index) => {
    const group = document.createElement("section");
    group.className = "department-group";
    group.style.setProperty("--department-color", department.color);
    const heading = document.createElement("div");
    heading.className = "department-heading";
    const number = document.createElement("span");
    number.className = "department-number";
    number.textContent = String(index + 1).padStart(2, "0");
    const titleCopy = document.createElement("div");
    titleCopy.className = "department-title-copy";
    const title = document.createElement("h3");
    title.textContent = department.title;
    titleCopy.append(title);
    if (department.subtitle) {
      const subtitle = document.createElement("p");
      subtitle.textContent = department.subtitle;
      titleCopy.append(subtitle);
    }
    heading.append(number, titleCopy);
    group.append(heading);

    for (let index = 0; index < department.members.length; index += 2) {
      const pair = department.members.slice(index, index + 2);
      const row = document.createElement("div");
      row.className = `department-member-row${pair.length === 1 ? " is-solo" : ""}`;
      row.append(makeDepartmentMemberCard(pair[0], department));
      if (pair.length === 2) {
        const emblem = document.createElement("div");
        emblem.className = "department-emblem";
        if (department.emblem) {
          const image = document.createElement("img");
          image.src = department.emblem;
          image.alt = `Sigla ${department.title}`;
          image.loading = "lazy";
          emblem.append(image);
        } else {
          emblem.textContent = "✚";
          emblem.setAttribute("aria-hidden", "true");
        }
        row.append(emblem, makeDepartmentMemberCard(pair[1], department));
      }
      group.append(row);
    }

    if (isAuthenticated) {
      const edit = document.createElement("button");
      edit.type = "button";
      edit.className = "button button-secondary department-edit-link";
      edit.textContent = "Editează acest departament";
      edit.addEventListener("click", () => {
        adminDialog.showModal();
        document.querySelector("#departments-tab").click();
        adminDepartmentList.querySelector(`[data-department-id="${CSS.escape(department.id)}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
      group.append(edit);
    }
    departmentList.append(group);
  });
  if (isAuthenticated) renderAdminDepartments();
}

function makeAdminField(labelText, name, value, { type = "text", maxLength, required = false } = {}) {
  const label = document.createElement("label");
  label.textContent = labelText;
  const input = document.createElement("input");
  input.name = name;
  input.type = type;
  if (maxLength) input.maxLength = maxLength;
  if (required) input.required = true;
  input.value = value;
  label.append(input);
  return label;
}

function renderAdminDepartments() {
  adminDepartmentList.replaceChildren();
  departments.forEach((department) => {
    const editor = document.createElement("section");
    editor.className = "admin-department-editor";
    editor.dataset.departmentId = department.id;
    const heading = document.createElement("h4");
    heading.textContent = department.title;
    editor.append(heading);

    const departmentForm = document.createElement("form");
    departmentForm.className = "department-settings-form";
    departmentForm.dataset.departmentId = department.id;
    departmentForm.append(
      makeAdminField("Denumire", "title", department.title, { maxLength: 100, required: true }),
      makeAdminField("Descriere", "subtitle", department.subtitle, { maxLength: 120 }),
      makeAdminField("Culoare", "color", department.color, { type: "color", required: true }),
    );
    const emblemLabel = document.createElement("label");
    emblemLabel.className = "photo-input-label";
    emblemLabel.textContent = department.emblem ? "Schimbă sigla (opțional)" : "Adaugă siglă (opțional)";
    const emblemInput = document.createElement("input");
    emblemInput.name = "emblem";
    emblemInput.type = "file";
    emblemInput.accept = "image/jpeg,image/png,image/webp";
    emblemLabel.append(emblemInput);
    const settingsMessage = document.createElement("span");
    settingsMessage.className = "form-message";
    settingsMessage.setAttribute("aria-live", "polite");
    const settingsActions = document.createElement("div");
    settingsActions.className = "editor-actions";
    const saveDepartment = document.createElement("button");
    saveDepartment.type = "submit";
    saveDepartment.className = "button button-secondary";
    saveDepartment.textContent = "Salvează departamentul";
    const deleteDepartment = document.createElement("button");
    deleteDepartment.type = "button";
    deleteDepartment.className = "button button-logout";
    deleteDepartment.textContent = "Șterge departamentul";
    deleteDepartment.addEventListener("click", () => deleteDepartmentById(department.id));
    settingsActions.append(saveDepartment, deleteDepartment);
    departmentForm.append(emblemLabel, settingsMessage, settingsActions);
    editor.append(departmentForm);

    const membersHeading = document.createElement("h5");
    membersHeading.textContent = "Chenare persoane";
    editor.append(membersHeading);
    department.members.forEach((member) => {
      const memberForm = document.createElement("form");
      memberForm.className = "department-member-editor";
      memberForm.dataset.memberId = member.id;
      memberForm.dataset.departmentId = department.id;
      memberForm.append(
        makeAdminField("Nume", "name", member.name, { maxLength: 80, required: true }),
        makeAdminField("Funcție", "title", member.title, { maxLength: 120, required: true }),
        makeAdminField("Contact / telefon", "contact", member.contact, { maxLength: 200 }),
      );
      const photoLabel = document.createElement("label");
      photoLabel.className = "photo-input-label";
      photoLabel.textContent = member.image ? "Schimbă fotografia (opțional)" : "Adaugă fotografie (opțional)";
      const photoInput = document.createElement("input");
      photoInput.name = "image";
      photoInput.type = "file";
      photoInput.accept = "image/jpeg,image/png,image/webp";
      photoLabel.append(photoInput);
      const message = document.createElement("span");
      message.className = "form-message";
      message.setAttribute("aria-live", "polite");
      const actions = document.createElement("div");
      actions.className = "editor-actions";
      const save = document.createElement("button");
      save.type = "submit";
      save.className = "button button-secondary";
      save.textContent = "Salvează chenarul";
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "button button-logout";
      remove.textContent = "Șterge";
      remove.addEventListener("click", () => deleteDepartmentMember(member.id));
      actions.append(save, remove);
      memberForm.append(photoLabel, message, actions);
      editor.append(memberForm);
    });

    const addMemberForm = document.createElement("form");
    addMemberForm.className = "department-member-editor department-member-create";
    addMemberForm.dataset.departmentId = department.id;
    const addHeading = document.createElement("h5");
    addHeading.textContent = "Adaugă un chenar";
    addMemberForm.append(
      addHeading,
      makeAdminField("Nume", "name", "", { maxLength: 80, required: true }),
      makeAdminField("Funcție", "title", "", { maxLength: 120, required: true }),
      makeAdminField("Contact / telefon", "contact", "", { maxLength: 200 }),
    );
    const addPhotoLabel = document.createElement("label");
    addPhotoLabel.className = "photo-input-label";
    addPhotoLabel.textContent = "Fotografie (opțional)";
    const addPhoto = document.createElement("input");
    addPhoto.name = "image";
    addPhoto.type = "file";
    addPhoto.accept = "image/jpeg,image/png,image/webp";
    addPhotoLabel.append(addPhoto);
    const addMessage = document.createElement("span");
    addMessage.className = "form-message";
    addMessage.setAttribute("aria-live", "polite");
    const addButton = document.createElement("button");
    addButton.type = "submit";
    addButton.className = "button button-secondary";
    addButton.textContent = "Adaugă chenar";
    addMemberForm.append(addPhotoLabel, addMessage, addButton);
    editor.append(addMemberForm);
    adminDepartmentList.append(editor);
  });
}

async function deleteDepartmentById(id) {
  const department = departments.find((item) => item.id === id);
  if (!department || !window.confirm(`Ștergi departamentul „${department.title}” și toate chenarele lui?`)) return;
  try {
    await api(`/api/admin/departments/${encodeURIComponent(id)}`, { method: "DELETE" });
    await loadDepartments();
  } catch (error) {
    window.alert(error.message);
  }
}

async function deleteDepartmentMember(id) {
  if (!window.confirm("Ștergi acest chenar?")) return;
  try {
    await api(`/api/admin/department-members/${encodeURIComponent(id)}`, { method: "DELETE" });
    await loadDepartments();
  } catch (error) {
    window.alert(error.message);
  }
}

async function loadDepartments() {
  departments = await api("/api/departments");
  renderDepartments();
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
    const name = document.createElement("strong");
    name.textContent = member.name;
    const photoLabel = document.createElement("label");
    photoLabel.className = "photo-input-label";
    photoLabel.textContent = member.image ? "Schimbă fotografia" : "Adaugă fotografie";
    const photo = document.createElement("input");
    photo.name = "image";
    photo.type = "file";
    photo.accept = "image/jpeg,image/png,image/webp";
    photo.required = true;
    photoLabel.append(photo);
    const message = document.createElement("span");
    message.className = "form-message";
    message.setAttribute("aria-live", "polite");
    const save = document.createElement("button");
    save.type = "submit";
    save.className = "button button-secondary";
    save.textContent = "Salvează profilul";
    fields.append(role, name, photoLabel, message, save);
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
  const [announcementData, staffData, siteSettings, departmentData] = await Promise.all([
    api("/api/announcements"),
    api("/api/staff"),
    api("/api/site-settings"),
    api("/api/departments"),
  ]);
  announcements = announcementData;
  staff = staffData.members;
  staffSyncStatus.hidden = !staffData.syncError;
  staffSyncStatus.textContent = staffData.syncError
    ? "Sincronizarea cu documentul personalului nu este disponibilă momentan. Se afișează ultima listă salvată."
    : "";
  heroImage.src = siteSettings.heroImage;
  heroImagePreview.src = siteSettings.heroImage;
  departments = departmentData;
  renderAnnouncements();
  renderStaff();
  renderDepartments();
}

async function refreshStaffFromSheet() {
  try {
    const staffData = await api("/api/staff");
    staff = staffData.members;
    staffSyncStatus.hidden = !staffData.syncError;
    staffSyncStatus.textContent = staffData.syncError
      ? "Sincronizarea cu documentul personalului nu este disponibilă momentan. Se afișează ultima listă salvată."
      : "";
    renderStaff();
  } catch (error) {
    staffSyncStatus.textContent = `Lista personalului nu a putut fi actualizată: ${error.message}`;
    staffSyncStatus.hidden = false;
  }
}

window.setInterval(refreshStaffFromSheet, 60_000);

async function refreshSession() {
  try {
    const session = await api("/api/admin/session");
    isAuthenticated = session.authenticated;
    if (isAuthenticated) {
      loginButton.textContent = "Administrare";
      renderAnnouncements();
      renderStaff();
      renderDepartments();
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
    renderAdminDepartments();
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
    renderAdminDepartments();
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
      if (tab.dataset.panel === "departments-panel") renderAdminDepartments();
    });
});

newDepartmentForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submit = newDepartmentForm.querySelector("button[type=submit]");
    submit.disabled = true;
    setMessage(newDepartmentMessage, "Se adaugă departamentul...");
    try {
      await api("/api/admin/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(new FormData(newDepartmentForm))),
      });
      newDepartmentForm.reset();
      newDepartmentForm.elements.color.value = "#087afa";
      setMessage(newDepartmentMessage, "Departamentul a fost adăugat.");
      await loadDepartments();
    } catch (error) {
      setMessage(newDepartmentMessage, error.message, true);
    } finally {
      submit.disabled = false;
    }
});

adminDepartmentList.addEventListener("submit", async (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    event.preventDefault();
    const submit = form.querySelector("button[type=submit]");
    const message = form.querySelector(".form-message");
    submit.disabled = true;
    setMessage(message, "Se salvează modificările...");
    try {
      if (form.classList.contains("department-settings-form")) {
        await api(`/api/admin/departments/${encodeURIComponent(form.dataset.departmentId)}`, {
          method: "PUT",
          body: new FormData(form),
        });
      } else if (form.classList.contains("department-member-create")) {
        await api(`/api/admin/departments/${encodeURIComponent(form.dataset.departmentId)}/members`, {
          method: "POST",
          body: new FormData(form),
        });
      } else if (form.classList.contains("department-member-editor")) {
        await api(`/api/admin/department-members/${encodeURIComponent(form.dataset.memberId)}`, {
          method: "PUT",
          body: new FormData(form),
        });
      } else {
        return;
      }
      await loadDepartments();
    } catch (error) {
      setMessage(message, error.message, true);
    } finally {
      submit.disabled = false;
    }
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

heroImageForm.elements.image.addEventListener("change", () => {
  const file = heroImageForm.elements.image.files[0];
  if (heroPreviewUrl) URL.revokeObjectURL(heroPreviewUrl);
  heroPreviewUrl = file ? URL.createObjectURL(file) : "";
  heroImagePreview.src = heroPreviewUrl || heroImage.src;
});

heroImageForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const submitButton = document.querySelector("#hero-image-submit");
  submitButton.disabled = true;
  setMessage(heroImageMessage, "Se salvează imaginea...");
  try {
    const result = await api("/api/admin/site-settings/hero-image", {
      method: "PUT",
      body: new FormData(heroImageForm),
    });
    heroImage.src = result.heroImage;
    heroImagePreview.src = result.heroImage;
    heroImageForm.reset();
    if (heroPreviewUrl) URL.revokeObjectURL(heroPreviewUrl);
    heroPreviewUrl = "";
    setMessage(heroImageMessage, "Imaginea principală a fost actualizată.");
  } catch (error) {
    setMessage(heroImageMessage, error.message, true);
  } finally {
    submitButton.disabled = false;
  }
});

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
  const departmentError = document.createElement("p");
  departmentError.className = "loading-state is-error";
  departmentError.textContent = `Sub-departamentele nu s-au putut încărca: ${error.message}`;
  departmentList.replaceChildren(departmentError);
});
refreshSession();
