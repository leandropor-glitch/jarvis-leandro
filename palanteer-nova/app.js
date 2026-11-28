import { startEyes } from "./eye.js";
import { loadFeed } from "./feed.js";
const $ = (s) => document.querySelector(s);
const key = "palanteer-nova.demo.v1";
const names = ["Órion", "Atlas", "Nova", "Lia"];
const sample = {
  name: "Órion",
  rooms: ["Sala", "Suíte", "Cozinha"],
  items: [
    {
      id: "luz-sala",
      name: "Luz da sala",
      room: "Sala",
      type: "Dispositivos",
      fav: true,
      on: false,
    },
    {
      id: "cinema",
      name: "Cinema",
      room: "Sala",
      type: "Cenas",
      fav: true,
      actions: { "luz-sala": false, tv: true },
    },
    {
      id: "tv",
      name: "TV",
      room: "Sala",
      type: "Controles",
      fav: true,
      on: false,
    },
    {
      id: "abajur",
      name: "Abajur",
      room: "Suíte",
      type: "Dispositivos",
      fav: true,
      on: true,
    },
    {
      id: "boa-noite",
      name: "Boa noite",
      room: "Suíte",
      type: "Cenas",
      actions: { abajur: false, "luz-sala": false, tv: false, bancada: false },
    },
    {
      id: "persiana",
      name: "Persiana",
      room: "Suíte",
      type: "Controles",
      on: false,
    },
    {
      id: "bancada",
      name: "Luz da bancada",
      room: "Cozinha",
      type: "Dispositivos",
      on: false,
    },
  ],
};
function load() {
  try {
    const x = JSON.parse(localStorage.getItem(key));
    if (
      x &&
      names.includes(x.name) &&
      Array.isArray(x.items) &&
      Array.isArray(x.rooms)
    )
      return x;
  } catch {}
  return JSON.parse(JSON.stringify(sample));
}
let state = load(),
  room = "Todos",
  filter = "Tudo",
  recording = null,
  noticeTimer;
function save() {
  try {
    localStorage.setItem(key, JSON.stringify(state));
  } catch {
    notify("O navegador não pôde salvar esta alteração.");
  }
}
function notify(text) {
  clearTimeout(noticeTimer);
  $("#notice").textContent = text;
  noticeTimer = setTimeout(() => ($("#notice").textContent = ""), 2500);
}
const clean = (s) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[.!?,]+$/, "");
function operate(item, requested) {
  if (item.type === "Cenas") {
    for (const dev of state.items)
      if (Object.hasOwn(item.actions || {}, dev.id))
        dev.on = item.actions[dev.id];
    save();
    refresh();
    return "Cena " + item.name + " aplicada na demonstração.";
  }
  item.on = typeof requested === "boolean" ? requested : !item.on;
  save();
  refresh();
  return (
    item.name + " · " + (item.on ? "Ligado" : "Desligado") + " na demonstração."
  );
}
function tile(item) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "tile";
  b.textContent = item.name;
  const type = document.createElement("em");
  type.textContent =
    item.type === "Cenas" ? "Executar cena" : item.on ? "Ligado" : "Desligado";
  if (item.type !== "Cenas") b.setAttribute("aria-pressed", String(!!item.on));
  b.append(type);
  b.onclick = () => notify(operate(item));
  return b;
}
function fillTiles(id, items, empty) {
  const panel = $(id);
  panel.replaceChildren(...items.map(tile));
  if (!items.length) {
    const p = document.createElement("p");
    p.className = "empty";
    p.textContent = empty;
    panel.append(p);
  }
}
function listButtons(id, options, active, select) {
  $(id).replaceChildren(
    ...options.map((x) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = x;
      b.setAttribute("aria-pressed", String(x === active));
      b.onclick = () => {
        select(x);
        refresh();
      };
      return b;
    }),
  );
}
function refresh() {
  $("#name").value = state.name;
  $("#talk-label").textContent = "Falar com " + state.name;
  $("#chat-title").textContent = state.name;
  listButtons("#rooms", ["Todos", ...state.rooms], room, (x) => (room = x));
  listButtons(
    "#filters",
    ["Tudo", "Cenas", "Dispositivos", "Controles"],
    filter,
    (x) => (filter = x),
  );
  fillTiles(
    "#favorites",
    state.items.filter((x) => x.fav),
    "Marque os favoritos em Editar casa.",
  );
  fillTiles(
    "#things",
    state.items.filter(
      (x) =>
        (room === "Todos" || room === x.room) &&
        (filter === "Tudo" || filter === x.type),
    ),
    "Nenhum item nesta seleção.",
  );
}
function route() {
  const dest = location.hash.slice(1);
  const current = ["palanteer", "dashboard", "ambientes"].includes(dest)
    ? dest
    : "inicio";
  $("#landing").hidden = current !== "inicio";
  $("#app").hidden = current === "inicio";
  document
    .querySelectorAll(".tab-pane")
    .forEach((p) => (p.hidden = p.id !== current));
  document.querySelectorAll(".nav a").forEach((a) => {
    if (a.dataset.tab === current) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
  document.querySelectorAll("dialog[open]").forEach((el) => el.close());
  scrollTo(0, 0);
  refresh();
  if (current === "dashboard") loadFeed().catch(() => {});
}
function options(el, list) {
  el.replaceChildren(...list.map(([v, t]) => new Option(t, v)));
}
function editItem() {
  const item = state.items.find((x) => x.id === $("#item").value);
  const form = $("#item-form");
  for (const el of form.elements) el.disabled = !item;
  if (item) {
    $("#destination").value = item.room;
    $("#favorite").checked = !!item.fav;
  }
}
function editor(selected) {
  $("#nickname").value = state.nickname || "";
  options(
    $("#item"),
    state.items.map((x) => [x.id, x.name]),
  );
  if (selected && state.items.some((x) => x.id === selected))
    $("#item").value = selected;
  options(
    $("#destination"),
    state.rooms.map((x) => [x, x]),
  );
  editItem();
}
$("#edit").onclick = () => {
  editor();
  $("#editor").showModal();
};
$("#dashboard-edit").onclick = (e) => {
  e.preventDefault();
  location.hash = "ambientes";
  setTimeout(() => {
    editor();
    if (!$("#editor").open) $("#editor").showModal();
  }, 0);
};
$("#nickname-form").onsubmit = (e) => {
  e.preventDefault();
  state.nickname = $("#nickname").value.trim();
  save();
  notify("Nome salvo neste navegador.");
};
$("#item").onchange = editItem;
$("#room-form").onsubmit = (e) => {
  e.preventDefault();
  const name = $("#new-room").value.trim();
  if (!name || ["todos", ...state.rooms.map(clean)].includes(clean(name)))
    return notify("Escolha outro nome para o ambiente.");
  state.rooms.push(name);
  save();
  $("#new-room").value = "";
  editor($("#item").value);
  refresh();
  notify("Ambiente criado.");
};
$("#item-form").onsubmit = (e) => {
  e.preventDefault();
  const item = state.items.find((x) => x.id === $("#item").value);
  if (!item) return;
  item.room = $("#destination").value;
  item.fav = $("#favorite").checked;
  save();
  refresh();
  $("#editor").close();
  notify("Alterações salvas.");
};
$("#remove").onclick = () => {
  const item = state.items.find((x) => x.id === $("#item").value);
  if (
    !item ||
    !confirm("Remover " + item.name + " desta casa de demonstração?")
  )
    return;
  state.items = state.items.filter((x) => x.id !== item.id);
  save();
  editor();
  refresh();
  notify("Item removido.");
};
$("#name").onchange = (e) => {
  state.name = e.target.value;
  save();
  refresh();
};
$("#talk").onclick = () => {
  $("#reply").textContent =
    (state.nickname ? state.nickname + ", experimente" : "Experimente") +
    " “ligar a luz da sala”.";
  $("#chat").showModal();
  $("#command").focus();
};
for (const b of document.querySelectorAll("[data-close]"))
  b.onclick = () => b.closest("dialog").close();
function runCmd(value) {
  const raw = value.trim(),
    q = clean(raw);
  const create = q.match(/^criar (?:o |um )?ambiente (.+)$/);
  if (create) {
    const name = raw
      .split(/ambiente\s+/i)
      .slice(1)
      .join(" ")
      .trim();
    if (
      !name ||
      name.length > 36 ||
      ["todos", ...state.rooms.map(clean)].includes(clean(name))
    )
      return "Escolha outro nome para o ambiente.";
    state.rooms.push(name);
    save();
    refresh();
    return "Ambiente " + name + " criado na demonstração.";
  }
  if (
    /^(mostrar|listar|abrir|selecionar)( apenas| so)? (os |as )?(cenas|dispositivos|controles|ambientes)$/.test(
      q,
    )
  ) {
    const kind = q.split(" ").at(-1);
    filter =
      kind === "ambientes" ? "Tudo" : kind[0].toUpperCase() + kind.slice(1);
    room = "Todos";
    location.hash = "ambientes";
    return "Seleção atualizada.";
  }
  const match = q.match(
    /^(ligar|ligue|desligar|desligue|ativar|ative|executar|execute|abrir|abra|fechar|feche) (?:a |o )?(?:cena )?(.+)$/,
  );
  if (!match)
    return "Experimente “ligar a luz da sala”, “executar cinema”, “listar dispositivos” ou “criar ambiente Escritório”.";
  const item = state.items.find((x) => clean(x.name) === match[2]);
  if (!item) return "Este item não está na casa de demonstração.";
  return operate(item, !/^(deslig|fech)/.test(match[1]));
}
$("#command-form").onsubmit = (e) => {
  e.preventDefault();
  const field = $("#command");
  if (!field.value.trim()) return;
  $("#reply").textContent = runCmd(field.value);
  field.value = "";
};
$("#listen").onclick = async () => {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (recording) {
    recording.stop();
    return;
  }
  if (
    !SR ||
    !("processLocally" in SR.prototype) ||
    typeof SR.available !== "function"
  ) {
    $("#reply").textContent =
      "A transcrição local não está disponível neste navegador. Digite o comando abaixo.";
    return;
  }
  try {
    if (
      (await SR.available({ langs: ["pt-BR"], processLocally: true })) !==
      "available"
    ) {
      $("#reply").textContent =
        "O reconhecimento local em português não está disponível neste aparelho. Digite seu comando.";
      return;
    }
    if (!$("#chat").open) return;
    const rec = new SR();
    rec.lang = "pt-BR";
    rec.processLocally = true;
    recording = rec;
    rec.onresult = (e) => {
      const value = e.results[0][0].transcript;
      $("#command").value = value;
      $("#reply").textContent = "Confira o comando e toque em Enviar.";
    };
    rec.onerror = () => {
      $("#reply").textContent =
        "Não foi possível ouvir. Tente novamente ou digite o comando.";
    };
    rec.onend = () => {
      recording = null;
      $("#listen").textContent = "Usar microfone";
    };
    rec.start();
    $("#listen").textContent = "Parar microfone";
  } catch {
    recording = null;
    $("#reply").textContent =
      "O microfone não está disponível. Digite o comando abaixo.";
  }
};
$("#chat").addEventListener("close", () => {
  if (recording) recording.abort();
});
addEventListener("storage", (e) => {
  if (e.key === key) {
    state = load();
    if (!state.rooms.includes(room)) room = "Todos";
    refresh();
    if ($("#editor").open) editor();
  }
});
addEventListener("hashchange", route);
route();
startEyes();
