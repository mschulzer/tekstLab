// ---------------- Labels (danske med underscore) ----------------
const PLOT_LABELS = [
  ["INDLEDNING", "INDLEDNING"],
  ["FRAVÆR", "FRAVÆR"],
  ["MANGEL", "MANGEL"],
  ["KALD", "KALD"],
  ["DIALOG", "DIALOG"],
  ["BEFALING", "BEFALING"],
  ["TRUSSEL", "TRUSSEL"],
  ["BEDRAG", "BEDRAG"],
  ["GRÆNSE_OVERGANG", "GRÆNSE_OVERGANG"],
  ["VALG", "VALG"],
  ["PRØVE", "PRØVE"],
  ["HANDLING", "HANDLING"],
  ["TEGN_MÆRKE", "TEGN_MÆRKE"],
  ["GENKENDELSE", "GENKENDELSE"],
  ["ÅBENBARING", "ÅBENBARING"],
  ["KAMP", "KAMP"],
  ["UDFALD_P", "UDFALD_P"],
  ["UDFALD_N", "UDFALD_N"],
  ["OPHÆVELSE", "OPHÆVELSE"],
  ["HJEMKOMST", "HJEMKOMST"],
];
const SIGNAL_LABELS = [
  ["OMKVÆD", "OMKVÆD"],
  ["MELLEMKVÆD", "MELLEMKVÆD"],
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

const SAMPLE_TEXT = `1.  Under lind og lærkespind,
der danser de alfer små,
en jomfru går ved kildevand,
hun tør ej derned gå.
- Vogt dig vel, du menneskesjæl,
for elverpigens bånd er fæl.

2.  Hun bøjede sig for blomst og krat,
og søgte efter fred,
men vinden bar en sagte sang,
fra dybet under ed.

3.  Da steg en kvinde af vandoverflad’,
hendes øjne var grønne som siv,
hun rakte sin hånd med sølversmykk’,
og sagde: “Kom, bliv min viv.”

4.  “Jeg har en moder i jordens sal,
og fader på kongens gård,
jeg kan ej følge dig under vand,
jeg hører de dødes kor.”

5.  “Elsk mig én nat, min jordiske ven,
så får du ære og magt,
men kysser du mig ved morgengry,
da er din sjæl forpakt.”

6.  Han greb hendes hånd i fryd og sorg,
og mørket faldt som slør,
de dansed’ på vandets sølvgrå top,
mens stjernerne stod og glør.

7.  Han vågned’ på engen, dugvåd og kold,
og mente det var en drøm,
men sølvet glimtede på hans arm,
og hjertet slog som strøm.

8.  Han gik til kirke og bad en bøn,
men præsten så ham bleg:
“Der hviler mørke på dine spor,
du bør ej vandre væk.”

9.  Men længslen brændte i sind og krop,
han hørte hendes sang,
fra søens rand i månelys,
hvor tågen stod så trang.

10. Han kastede korset, gik mod vand,
og råbte hendes navn,
da lød et sus fra lindens top,
og alt blev stilt og stramt.

11. Hun steg igen af søens favn,
men tåren randt af glas,
“Du brød dit løfte, jordens søn,
nu følger du mig straks.”

12. Han greb det kors, han før havde kast’,
men sølv blev til sort jern,
og jorden åbned’ sig under ham,
mens fuglene tav i fern.

13. De siger, når månen står lav og blå,
kan høres hans suk i siv,
og vandet rører sig uden vind,
som minde om deres kiv.

14. En hyrdedreng så lys i vand,
og glemte sin kvægs vej,
han følger dem nu i natlig dans,
som mange før og ej.

15. Så syng nu visen ved kildevæld,
og husk dens mørke råd:
hvad elverpiger giver dig,
det koster liv og dåd.`;

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

function resetText(newText) {
  textEl.value = newText;
  annotations = [];
  selCache = { start: null, end: null, text: "" };
  render();
}
function handleTextChanged() {
  // new input invalidates existing annotations, so start fresh
  annotations = [];
  selCache = { start: null, end: null, text: "" };
  render();
}
textEl.addEventListener("input", handleTextChanged);
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

document.getElementById("btnPasteClipboard").onclick = async () => {
  try {
    const clipText = await navigator.clipboard.readText();
    if (!clipText) {
      alert("Udklipsholderen er tom eller indeholder ikke tekst.");
      return;
    }
    resetText(clipText);
  } catch (err) {
    alert("Kunne ikke læse udklipsholderen: " + err.message);
  }
};

document.getElementById("btnLoadSample").onclick = () => resetText(SAMPLE_TEXT);

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
/*
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
*/
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
  const ord = [...annotations]
    .filter((a) => a.kind === "PLOT" || (includeSignals && a.kind === "SIGNAL"))
    .sort((a, b) => a.start - b.start);
  const labels = ord.map((a) => `[${a.label}]`);
  templateOut.textContent = labels.length ? labels.join(", ") : "— ingen —";
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
  const lines = ["graph LR"];
  lines.push(`   style START fill:#000,stroke:#000,stroke-width:2px`);
  lines.push("   START(( )) --> ");
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
  const orderedStates = Array.from(presentStates);
  orderedStates.forEach((s, idx) => {
    const finale = idx === orderedStates.length - 1 ? "(((" : "((";
    const closing = idx === orderedStates.length - 1 ? ")))" : "))";
    lines.push(`  ${s}${finale}${s}${closing}`);
  });
  // kanter
  let edgeCounter = 1;
  Object.entries(probs).forEach(([from, toMap]) => {
    Object.keys(toMap).forEach((to) => {
      const lab = `|${edgeCounter++}|`;
      lines.push(`  ${from} --> ${lab} ${to}`);
    });
  });
  // prikkede selv-løkker for signaler
  Object.entries(signalCounts).forEach(([s, c]) => {
    if (c > 0) lines.push(`  ${s} -. om-mlkvæd ×${c} .-> ${s}`);
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
