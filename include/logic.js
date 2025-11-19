// ---------------- Labels (danske med underscore) ----------------
const PLOT_LABELS = [
  ["INDLEDNING", "INDLEDNING"],
  ["KALD_ELLER_LOKKE", "KALD_ELLER_LOKKE"],
  ["TRUSSEL", "TRUSSEL"],
  ["GRÆNSE_OVERGANG", "GRÆNSE_OVERGANG"],
  ["VALG", "VALG"],
  ["PRØVE_ELLER_HANDLING", "PRØVE_ELLER_HANDLING"],
  ["TEGN_ELLER_MÆRKE", "TEGN_ELLER_MÆRKE"],
  ["GENKENDELSE_ÅBENBARING", "GENKENDELSE_ÅBENBARING"],
  ["UDFALD_POSITIVT", "UDFALD_POSITIVT"],
  ["UDFALD_NEGATIVT", "UDFALD_NEGATIVT"],
  ["HJEMKOMST", "HJEMKOMST"],
];
const SIGNAL_LABELS = [
  ["OMKVÆD", "OMKVÆD"],
  ["FAST_OMKVÆD", "FAST_OMKVÆD"],
];
const COLORS = { PLOT: "#e0f2fe", SIGNAL: "#fde68a" };

// ---------------- Tilstand ----------------
let annotations = []; // {id, start, end, kind:"PLOT"|"SIGNAL", label}
const textEl = document.getElementById("textInput");
const kindSel = document.getElementById("kindSel");
const labelSel = document.getElementById("labelSel");
const previewEl = document.getElementById("preview");
const annListEl = document.getElementById("annList");
const templateOut = document.getElementById("templateOut");
const markovOut = document.getElementById("markovOut");
const mermaidBox = document.getElementById("mermaidBox");

// --- Selection cache so users can select first, then choose labels ---
let selCache = { start: null, end: null, text: "" };

function cacheSelection() {
  if (!textEl) return;
  const s = textEl.selectionStart ?? 0;
  const e = textEl.selectionEnd ?? 0;
  if (e > s) {
    selCache.start = s;
    selCache.end = e;
    selCache.text = textEl.value.slice(s, e);
  }
}

// update cache whenever the user selects in the textarea
textEl.addEventListener("select", cacheSelection);
textEl.addEventListener("mouseup", cacheSelection);
textEl.addEventListener("keyup", (ev) => {
  // arrow keys / shift selection changes
  if (
    ev.shiftKey ||
    ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(ev.key)
  ) {
    cacheSelection();
  }
});
textEl.addEventListener("blur", cacheSelection);

function uuid() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : "u" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ---------------- Init ----------------
function populateLabelSel() {
  labelSel.innerHTML = "";
  const arr = kindSel.value === "PLOT" ? PLOT_LABELS : SIGNAL_LABELS;
  arr.forEach(([k, n]) => {
    const o = document.createElement("option");
    o.value = k;
    o.textContent = n;
    labelSel.appendChild(o);
  });
}
kindSel.addEventListener("change", populateLabelSel);
populateLabelSel();

textEl.value = `1.  Hr. Iver han svøber sig Hoved i Skind,
          — Fuglene synge i Skove. —
     han ganger i Loft for liden Kirstin ind
     Hun var saa skær en Jomfrove.

2.  »Her sidder du, kjær Søster, saa favr og fin!
     og nu skalt du fremme Viljen min.«

3.  »Det véd Gud og Vor-Herre,
     to Søskend maa ej sammen være.

4.  Det véd Gud og Vor-Frove,
     at Broder maa ej Søster love.«

5.  »Og kan jeg nu ikke min Vilje faa,
     saa led en Løgn skal jeg lægge dig paa.«

6.  »Du lyv alt det, du vilt lyve,
     saa baade din Øjen udflyve!

7.  Lyv, mens du kan! og lyv, mens du vil!
     du lukker dog ikke Himmerige til.«

8.  Hr. Iver han ganger for Moder sin:
     »Hvordan har I optugtet hin liden Kirstin?«

9.  »Saa har jeg optugtet Søster din,
     som jeg vil svare for Herre Gud min.

10.  Jeg holdt hende til Tugt og Ære,
     hun lever, som en Jomfru skal være.«

11. »Nej, hun driver Hor, og hun driver Mord,
     hun føder smaa Børn, sætter levendes i Jord.«

12.  »Ti stille, Hr. Iver! hvi lyver du saa?
     hun er ej den første, du har løjet paa.«

13.  Hr. Iver han ganger for Fader sin:
     »Hvordan har I lært kjær Søster min?«

14.  »Til Ære og Dyd haver jeg hende holdt,
     hun lever jo som en Jomfru stolt.«

15.  »Nej, hun driver Hor, og hun driver Mord,
     hun føder smaa Børn, sætter levendes i Jord.«

16.  Den Greve han slog sin Haand imod Bord:
     »Ret aldrig da kan jeg tro slig Ord.«

17.  »Hvor skulde Græsset paa Jorden kunne gro,
     om Fader kan ikke Sønnen tro!«

18.  »Hør du, Hr. Iver, Sønnen min!
     hvad Dom siger du over Søster din:

19.  Vilt du have hende i Galgen hængt:
     eller vilt du have hende paa Baalet brændt:

20.  »Hun skal ikke i Galgen hænge,
     men hun skal paa Baalet brænde.«

21.  Den Greve heder paa Svende tre:
     »I ganger i Skov og hugger Ved!

22.  Hugger I Birk, og hugger I Bøg!
     bygger saa op det Baal saa højt.

23.  Hugger I Asp, og hugger I Eg!
     deraf saa vorder Luen hed.«

24.  De ledte liden Kirstin for oven By,
     hun løfte sin Øjen højt i Sky.

25.  De ledte liden Kirstin over en Eng:
     »Og hisset ser jeg min Brudeseng!

26.  Den Seng er rød og ikke hvid,
     det er faa, som gifte sin Datter slig.

27.  De Bolster ere røde, de Lagen ere blaa,
     Gud trøste den, dèr skal hvile opaa!«

28.  Hr. Iver hans Hjærte var haardt som Staal,
     han satte selv sin Søster paa Baal.

29.  Det mælte liden Kirstin, der Baalet brand:
     »I giver mig at drikke i Jesu Navn!«

30.  De rakte et Sølvkar op paa et Spjud:
     Hr. Iver han slog al Drikken ud.

31.  Luen den legte saa højt i Sky,
     og Røgen drev over Land og By.

32.  Det Baal var brændt og laa i Glød:
     dèr laa liden Kirstin hvid og rød.

33.  Og der det Baal var helt udbrændt,
     da var end ej hendes Klæder skjændt.

34.  Der kom flyvend' to Duer hvid',
     de førte liden Kirstin til Himmerig.

35.  Der fløj to Duer fra Himlen ned,
     der de fløj op, da vare de tre.

36.  Der de fløj op, da vare de tre,
     liden Kirstin hun var fejrest af de.

37.  Og der kom flyvend' to Ravne sort',
     de førte Hr. Iver til Helvedes Port.

38.  Der fløj to Ravne fra Helvede op,
     de vare tre, der de fløj bort.

39.  Og der de fløj til Helvede ned,
     Hr. Iver han var ledest af de.

40.  Det maatte man høre saa langt af Land,
     hvor liden Kirstin i Himmerig sang.

41.  Det maatte man høre saa langt af Led,
     hvor hendes Broder i Helvede skreg.

42.  Liden Kirstin hun kom i Himmerig ind,
     saa bad hun om Naade for Broder sin.

43.  Hun bad for Fader og Moder,
     allermest for Iver, sin Broder.

44.  »Din Fader og Moder kan Naade faa,
        — Fuglen synger i Skove. —
     men Iver, din Broder, maa i Helvede gaa.«
     Hun var saa skær en Jomfrove.`;

render();

// ---------------- Hjælpere ----------------
function overlaps(a, b) {
  return Math.max(a.start, b.start) < Math.min(a.end, b.end);
}
function addAnn(newAnn) {
  for (const a of annotations) {
    if (overlaps(a, newAnn)) return false;
  }
  annotations.push(newAnn);
  annotations.sort((x, y) => x.start - y.start);
  return true;
}
function splitByRanges(text, ranges) {
  const out = [];
  let idx = 0;
  const ord = [...ranges].sort((a, b) => a.start - b.start);
  for (const r of ord) {
    if (idx < r.start)
      out.push({ type: "text", text: text.slice(idx, r.start) });
    out.push({
      type: "span",
      text: text.slice(r.start, r.end),
      k: r.kind,
      l: r.label,
      id: r.id,
    });
    idx = r.end;
  }
  if (idx < text.length) out.push({ type: "text", text: text.slice(idx) });
  return out;
}

function render() {
  // forhåndsvisning
  previewEl.innerHTML = "";
  const parts = splitByRanges(textEl.value, annotations);
  for (const p of parts) {
    if (p.type === "text") {
      const s = document.createElement("span");
      s.textContent = p.text;
      previewEl.appendChild(s);
    } else {
      const s = document.createElement("span");
      s.textContent = p.text;
      s.className = "hl " + p.k;
      s.style.background = COLORS[p.k];
      s.title = p.l;
      previewEl.appendChild(s);
    }
  }
  // liste
  annListEl.innerHTML = annotations.length
    ? ""
    : '<div class="small">Teksten er endnu ikke opmærket.</div>';
  annotations.forEach((a) => {
    const row = document.createElement("div");
    row.className = "ann-item";
    const tag = document.createElement("span");
    tag.className = "pillchip " + a.kind;
    tag.textContent = a.kind + ": " + a.label;
    const quote = document.createElement("span");
    quote.textContent = "“" + textEl.value.slice(a.start, a.end) + "”";
    const del = document.createElement("button");
    del.className = "secondary";
    del.textContent = "Slet";
    del.onclick = () => {
      annotations = annotations.filter((x) => x.id !== a.id);
      render();
    };
    row.append(tag, quote, del);
    annListEl.appendChild(row);
  });
}

// ---------------- Mærkning ----------------
document.getElementById("btnTag").onclick = () => {
  const kind = kindSel.value;
  const label = labelSel.value;
  if (!label) return alert("Vælg en label.");

  // try current selection first
  let start = textEl.selectionStart || 0;
  let end = textEl.selectionEnd || 0;

  // if current selection is empty, use cached selection
  if (
    start === end &&
    selCache.start != null &&
    selCache.end > selCache.start
  ) {
    start = selCache.start;
    end = selCache.end;
  }

  if (start === end)
    return alert(
      "Markér først noget tekst (markeringen huskes, mens du vælger)."
    );

  const ok = addAnn({ id: uuid(), start, end, kind, label });
  if (!ok) alert("Overlappende mærkninger er ikke tilladt.");
  render();
};
/*
document.getElementById("btnTag").onclick = () => {
  const kind = kindSel.value;
  const label = labelSel.value;
  if (!label) return alert("Vælg en label.");
    const start = textEl.selectionStart || 0;
    const end = textEl.selectionEnd || 0;
  if (start === end) return alert("Markér først noget tekst.");
    const ok = addAnn({ id: uuid(), start, end, kind, label });
  if (!ok) alert("Overlappende mærkninger er ikke tilladt.");
    render();
};
*/

document.getElementById("btnClearSel").onclick = () => {
  textEl.setSelectionRange(0, 0);
};

// ---------------- Import/Eksport ----------------
/*
document.getElementById("btnExport").onclick = () => {
  const payload = { text: textEl.value, annotations };
  download(
    "folkevise_annoteringer.json",
    JSON.stringify(payload, null, 2)
  );
};
*/

document.getElementById("fileImport").onchange = (e) => {
  const f = e.target.files?.[0];
  if (!f) return;
  const fr = new FileReader();
  fr.onload = () => {
    try {
      const d = JSON.parse(fr.result);
      if (d.text) textEl.value = d.text;
      if (Array.isArray(d.annotations)) annotations = d.annotations;
      render();
    } catch (err) {
      alert("Ugyldig JSON");
    }
  };
  fr.readAsText(f);
};
function download(filename, content) {
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ---------------- Skabelonudtræk ----------------
document.getElementById("btnExtract").onclick = () => {
  const includeSignals = document.getElementById("includeSignals").checked;
  const ord = [...annotations].sort((a, b) => a.start - b.start);
  let out = "";
  let idx = 0;
  for (const r of ord) {
    if (idx < r.start) out += textEl.value.slice(idx, r.start);
    if (r.kind === "PLOT") {
      out += `[[${r.label}]]`;
    } else if (includeSignals) {
      out += `<<${r.label}>>`;
    }
    idx = r.end;
  }
  if (idx < textEl.value.length) out += textEl.value.slice(idx);
  out = out
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  templateOut.textContent = out || "— ingen —";
};
document.getElementById("btnCopyTemplate").onclick = () =>
  navigator.clipboard.writeText(templateOut.textContent || "");
document.getElementById("btnDownloadTemplate").onclick = () =>
  download("skabelon.txt", templateOut.textContent || "");

// ---------------- Markov & Mermaid ----------------
document.getElementById("btnBuildGraph").onclick = () => {
  const { counts, probs, states, signalCounts } = computeMarkov();
  //markovOut.textContent = JSON.stringify({ counts, probs }, null, 2);
  const mmd = toMermaid(states, probs, signalCounts);
  renderMermaid(mmd);
  window._lastMermaid = mmd; // til download
};
async function downloadMermaidPng(mmd, filename = "plotdiagram.png") {
  const res = await fetch("https://kroki.io/mermaid/png", {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: mmd,
  });
  if (!res.ok) {
    throw new Error(`Kroki-svar: ${res.status}`);
  }
  const blob = await res.blob();
  const pngUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = pngUrl;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(pngUrl);
}
document.getElementById("btnDownloadMermaid").onclick = async () => {
  if (!window._lastMermaid) {
    alert("Byg diagrammet først.");
    return;
  }
  try {
    await downloadMermaidPng(window._lastMermaid);
  } catch (err) {
    alert("Kunne ikke downloade PNG: " + err.message);
  }
};

/*
      document.getElementById("btnDownloadCSV").onclick = () => {
        const { counts, probs } = computeMarkov();
        let csv = "fra,til,optælling,sandsynlighed\n";
        Object.entries(counts).forEach(([from, toMap]) => {
          Object.entries(toMap).forEach(([to, c]) => {
            const p =
              probs[from] && probs[from][to] != null ? probs[from][to] : 0;
            csv += `${from},${to},${c},${p.toFixed(4)}\n`;
          });
        });
        download("markov.csv", csv);
      };
      */

function computeMarkov() {
  // rækkefølge af plot-labels → overgange
  const plot = annotations
    .filter((a) => a.kind === "PLOT")
    .sort((a, b) => a.start - b.start);
  const states = Array.from(new Set(plot.map((p) => p.label)));
  const counts = {};
  for (let i = 0; i < plot.length - 1; i++) {
    const from = plot[i].label;
    const to = plot[i + 1].label;
    counts[from] = counts[from] || {};
    counts[from][to] = (counts[from][to] || 0) + 1;
  }
  // sandsynligheder
  const probs = {};
  Object.entries(counts).forEach(([from, toMap]) => {
    const total = Object.values(toMap).reduce((a, b) => a + b, 0);
    probs[from] = {};
    Object.entries(toMap).forEach(([to, c]) => {
      probs[from][to] = c / total;
    });
  });
  // signal-optælling pr. seneste plottilstand
  const signalCounts = {};
  let currentState = null;
  const ord = [...annotations].sort((a, b) => a.start - b.start);
  for (const a of ord) {
    if (a.kind === "PLOT") {
      currentState = a.label;
    } else if (a.kind === "SIGNAL" && currentState) {
      signalCounts[currentState] = (signalCounts[currentState] || 0) + 1;
    }
  }
  return { counts, probs, states, signalCounts };
}

function toMermaid(states, probs, signalCounts) {
  const lines = ["flowchart LR"];
  const presentStates = new Set();
  Object.keys(probs).forEach((f) => {
    presentStates.add(f);
    Object.keys(probs[f]).forEach((t) => presentStates.add(t));
  });
  states.forEach((s) => presentStates.add(s));
  if (presentStates.size === 0) {
    lines.push("  TOM[Ingen plottilstande mærket]");
    return lines.join("\n");
  }
  presentStates.forEach((s) => {
    lines.push(`  ${s}[${s}]`);
  });
  // kanter
  Object.entries(probs).forEach(([from, toMap]) => {
    Object.entries(toMap).forEach(([to, p]) => {
      const lab = p > 0 ? `|${(p * 100).toFixed(0)}%|` : "";
      lines.push(`  ${from} --> ${lab} ${to}`);
    });
  });
  // prikkede selv-løkker for signaler
  Object.entries(signalCounts).forEach(([s, c]) => {
    if (c > 0) lines.push(`  ${s} -. omkvæd/burden ×${c} .-> ${s}`);
  });
  return lines.join("\n");
}
async function renderMermaid(code) {
  mermaidBox.innerHTML = '<div class="small">Renderer…</div>';
  try {
    const { svg } = await mermaid.render("graf" + Date.now(), code);
    mermaidBox.innerHTML = svg;
    window._lastMermaidSvg = svg;
  } catch (err) {
    mermaidBox.innerHTML = `<div class=small style="color:#b91c1c">Mermaid-fejl: ${String(
      err
    )}</div><pre class="mono template">${code}</pre>`;
  }
}

// ---------------- Legender ----------------
/*
      (function legends() {
        const legendPlot = document.getElementById("legendPlot");
        PLOT_LABELS.forEach(([k, n]) => {
          const s = document.createElement("span");
          s.className = "tag";
          const sw = document.createElement("span");
          sw.className = "pillchip";
          sw.style.background = COLORS.PLOT;
          sw.textContent = " ";
          s.appendChild(sw);
          s.appendChild(document.createTextNode(" " + n));
          legendPlot.appendChild(s);
        });
        const legendSignal = document.getElementById("legendSignal");
        SIGNAL_LABELS.forEach(([k, n]) => {
          const s = document.createElement("span");
          s.className = "tag";
          const sw = document.createElement("span");
          sw.className = "pillchip";
          sw.style.background = COLORS.SIGNAL;
          sw.textContent = " ";
          s.appendChild(sw);
          s.appendChild(document.createTextNode(" " + n));
          legendSignal.appendChild(s);
        });
        populateLabelSel();
      })();
      */
