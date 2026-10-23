const inboxList = document.querySelector("#notifications-inbox-list");
const inboxStatus = document.querySelector("#notifications-status");
const inboxCount = document.querySelector("#inbox-count");

function escapeNotificationHtml(value) {
  const node = document.createElement("span");
  node.textContent = value || "";
  return node.innerHTML;
}

function formatDate(value) {
  return new Intl.DateTimeFormat("es-EC", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

async function loadInbox() {
  const member = await protectMemberPage();
  if (!member) return;
  let items;
  try {
    ({ notifications: items } = await window.joinCrewApi.get(
      "/users/me/notifications",
    ));
  } catch {
    inboxStatus.textContent = "No pudimos cargar tus notificaciones.";
    return;
  }
  items = items || [];
  inboxStatus.hidden = Boolean(items.length);
  inboxCount.textContent = items.length
    ? `${items.length} mensaje${items.length === 1 ? "" : "s"}`
    : "";
  inboxList.innerHTML =
    items
      .map(
        (item) =>
          `<article class="inbox-item ${item.readAt ? "read" : "unread"}"><span class="inbox-icon">🔔</span><div><strong>Mensaje de JoinCrew</strong><p>${escapeNotificationHtml(item.content)}</p><small>${formatDate(item.createdAt)}</small></div></article>`,
      )
      .join("") ||
    '<div class="empty-inbox"><span>✨</span><p>Tu bandeja está al día.</p></div>';
  await window.joinCrewApi.patch("/users/me/notifications/read", {});
}

loadInbox();
