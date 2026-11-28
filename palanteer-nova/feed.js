const providers = {
  quotes:
    "https://api.binance.com/api/v3/ticker/price?symbols=%5B%22USDTBRL%22,%22EURUSDT%22,%22BTCUSDT%22%5D",
  weather:
    "https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=-22.91&lon=-43.17",
  news: "https://servicodados.ibge.gov.br/api/v3/noticias/?qtd=3",
};
const el = (id) => document.getElementById(id);
const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const usd = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "USD",
});
const date = (v) =>
  new Date(v).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  });
function quoteList(q, t) {
  const list = el("quotes");
  list.replaceChildren();
  for (const [name, value] of [
    ["USD (USDT)", brl.format(q.USDTBRL)],
    ["EUR", brl.format(q.EURUSDT * q.USDTBRL)],
    ["BTC / USD", usd.format(q.BTCUSDT)],
    ["BTC / BRL", brl.format(q.BTCUSDT * q.USDTBRL)],
  ]) {
    const row = document.createElement("div"),
      dt = document.createElement("dt"),
      dd = document.createElement("dd");
    dt.textContent = name;
    dd.textContent = value;
    row.append(dt, dd);
    list.append(row);
  }
  el("market-time").textContent = "Consulta em " + date(t);
}
function weatherView(row) {
  el("weather").textContent = Math.round(row.temperature) + "°C";
  el("weather-time").textContent = "Previsão para " + date(row.time);
}
function newsList(items) {
  const links = [];
  for (const item of items) {
    let url;
    try {
      url = new URL(item.url);
    } catch {
      continue;
    }
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.hostname !== "agenciadenoticias.ibge.gov.br"
    )
      continue;
    url.protocol = "https:";
    const a = document.createElement("a"),
      label = document.createElement("small");
    a.className = "newslink";
    a.href = url.href;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.textContent = item.title;
    label.textContent = item.date;
    a.append(label);
    links.push(a);
  }
  if (links.length) el("news").replaceChildren(...links);
}
const cacheKey = "palanteer-nova.public-feeds-v1";
let loadedAt = 0;
async function request(url) {
  const ac = new AbortController(),
    timer = setTimeout(() => ac.abort(), 6500);
  try {
    const r = await fetch(url, { signal: ac.signal, credentials: "omit" });
    if (!r.ok) throw Error("HTTP " + r.status);
    return await r.json();
  } finally {
    clearTimeout(timer);
  }
}
export async function loadFeed() {
  if (Date.now() - loadedAt < 900000) return;
  loadedAt = Date.now();
  let local = {};
  try {
    local = JSON.parse(localStorage.getItem(cacheKey) || "{}");
  } catch {}
  try {
    const sample = await request("./snapshot.json");
    quoteList(
      local.quotes?.data || sample.quotes,
      local.quotes?.time || sample.marketTime,
    );
    weatherView(local.weather?.data || sample.weather);
    newsList(local.news?.data || sample.news);
  } catch {
    el("market-time").textContent = "Cotação indisponível";
    el("weather-time").textContent = "Previsão indisponível";
  }
  await Promise.allSettled(
    Object.entries(providers).map(async ([key, url]) => {
      const valid = key === "weather" ? 3600000 : 900000;
      if (local[key]?.updated > Date.now() - valid) return;
      const data = await request(url);
      let entry = { updated: Date.now() };
      if (key === "quotes") {
        const q = Object.fromEntries(
          data.map((x) => [x.symbol, Number(x.price)]),
        );
        if (
          !["BTCUSDT", "EURUSDT", "USDTBRL"].every(
            (k) => Number.isFinite(q[k]) && q[k] > 0,
          )
        )
          return;
        entry = { ...entry, data: q, time: new Date().toISOString() };
        quoteList(q, entry.time);
      } else if (key === "weather") {
        const item = data.properties.timeseries[0];
        entry.data = {
          time: item.time,
          temperature: item.data.instant.details.air_temperature,
        };
        weatherView(entry.data);
      } else {
        entry.data = data.items.map((x) => ({
          title: x.titulo,
          date: x.data_publicacao,
          url: x.link,
        }));
        newsList(entry.data);
      }
      local[key] = entry;
      try {
        localStorage.setItem(cacheKey, JSON.stringify(local));
      } catch {}
    }),
  );
}
