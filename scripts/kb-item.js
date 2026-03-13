/* global initThemeControls */

function getQueryParam(name) {
    const url = new URL(window.location.href);
    return url.searchParams.get(name);
}

function safeText(x) {
    return (x === null || x === undefined) ? "" : String(x);
}

function isObject(x) {
    return x && typeof x === "object" && !Array.isArray(x);
}

function ensureMarkdownIt() {
    if (!window.markdownit) {
        throw new Error("markdown-it not loaded. Ensure the markdown-it script is included before kb-item.js");
    }
    if (!window.DOMPurify) {
        throw new Error("DOMPurify not loaded. Ensure the DOMPurify script is included before kb-item.js");
    }
    return window.markdownit({
        html: false,     // safer: do not allow raw HTML from KB
        linkify: true,   // auto URLs -> links
        breaks: true,
        typographer: true
    });
}

const mdIt = (() => {
    try { return ensureMarkdownIt(); } catch { return null; }
})();

function renderMarkdown(md) {
    const raw = safeText(md).trim();
    if (!raw) return "";

    if (!mdIt) return raw; // fallback: show plain text if libs missing

    const html = mdIt.render(raw);
    const clean = window.DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
    return clean;
}

function renderMarkdownInto(el, md) {
    el.innerHTML = renderMarkdown(md);

    // Force all links to open in a new tab safely
    el.querySelectorAll("a").forEach(a => {
        a.setAttribute("target", "_blank");
        a.setAttribute("rel", "noopener noreferrer");
    });
}

function normalizeKbPayload(json) {
    const attacks = Array.isArray(json?.attacks) ? json.attacks : [];
    const misconfigs = Array.isArray(json?.misconfigurations) ? json.misconfigurations : [];
    return { attacks, misconfigs };
}

function findItemById({ attacks, misconfigs }, id) {
    const a = attacks.find(x => x?.id === id);
    if (a) return { kind: "Attack", item: a };

    const m = misconfigs.find(x => x?.id === id);
    if (m) return { kind: "Misconfiguration", item: m };

    return { kind: "Unknown", item: null };
}

function renderMarkdownCard(title, md) {
    const card = document.createElement("div");
    card.className = "kb-card";

    const header = document.createElement("div");
    header.className = "kb-card-header";

    const h = document.createElement("div");
    h.className = "kb-card-title";
    h.textContent = title;

    header.appendChild(h);

    const body = document.createElement("div");
    body.className = "kb-md";
    renderMarkdownInto(body, md);

    card.appendChild(header);
    card.appendChild(body);
    return card;
}

function renderKeyValueCard(title, entries) {
    const card = document.createElement("div");
    card.className = "kb-card";

    const header = document.createElement("div");
    header.className = "kb-card-header";

    const h = document.createElement("div");
    h.className = "kb-card-title";
    h.textContent = title;

    header.appendChild(h);
    card.appendChild(header);

    const body = document.createElement("div");
    body.className = "kb-md";

    const ul = document.createElement("ul");
    ul.style.listStyle = "none";
    ul.style.display = "flex";
    ul.style.flexDirection = "column";
    ul.style.gap = "8px";
    ul.style.paddingLeft = "0";

    entries.forEach(({ label, value }) => {
        const li = document.createElement("li");
        li.style.display = "flex";
        li.style.flexDirection = "column";
        li.style.gap = "2px";

        const l = document.createElement("span");
        l.style.color = "var(--text-muted)";
        l.style.fontSize = "12px";
        l.textContent = label;

        const v = document.createElement("span");
        v.style.fontSize = "12px";
        v.textContent = value;

        li.appendChild(l);
        li.appendChild(v);
        ul.appendChild(li);
    });

    body.appendChild(ul);
    card.appendChild(body);
    return card;
}

/* ---------- Conditions tree (leaf = markdown) ---------- */

function renderConditionLeafMarkdown(text) {
    const leaf = document.createElement("div");
    leaf.className = "cond-leaf kb-md";
    renderMarkdownInto(leaf, text);
    return leaf;
}

function renderConditionNode(cond) {
    // Leaf strings rendered as markdown
    if (typeof cond === "string") {
        return renderConditionLeafMarkdown(cond);
    }

    // If leaf is something else -> stringify
    if (!isObject(cond)) {
        return renderConditionLeafMarkdown(safeText(cond));
    }

    const wrapper = document.createElement("div");
    wrapper.className = "cond-node";

    const head = document.createElement("div");
    head.className = "cond-head";

    const badge = document.createElement("span");
    badge.className = "cond-badge";

    const children = document.createElement("div");
    children.className = "cond-children";

    if (Array.isArray(cond._and)) {
        badge.textContent = "AND";
        cond._and.forEach(c => children.appendChild(renderConditionNode(c)));
    } else if (Array.isArray(cond._or)) {
        badge.textContent = "OR";
        cond._or.forEach(c => children.appendChild(renderConditionNode(c)));
    } else if (cond._not !== undefined) {
        badge.textContent = "NOT";
        children.appendChild(renderConditionNode(cond._not));
    } else {
        badge.textContent = "OBJECT";
        for (const [k, v] of Object.entries(cond)) {
            children.appendChild(
                renderConditionLeafMarkdown(`${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`)
            );
        }
    }

    head.appendChild(badge);
    wrapper.appendChild(head);
    wrapper.appendChild(children);
    return wrapper;
}

function renderConditionsCard(title, cond) {
    const card = document.createElement("div");
    card.className = "kb-card";

    const header = document.createElement("div");
    header.className = "kb-card-header";

    const h = document.createElement("div");
    h.className = "kb-card-title";
    h.textContent = title;

    const sub = document.createElement("div");
    sub.className = "kb-card-sub";
    sub.textContent = "Structured conditions";

    header.appendChild(h);
    header.appendChild(sub);

    const root = document.createElement("div");
    root.className = "cond-root";
    root.appendChild(renderConditionNode(cond));

    card.appendChild(header);
    card.appendChild(root);
    return card;
}

/* ---------- Environment / MITRE / CWE / Exploits ---------- */

function renderEnvironmentCard(envArr) {
    const card = document.createElement("div");
    card.className = "kb-card";

    const header = document.createElement("div");
    header.className = "kb-card-header";

    const h = document.createElement("div");
    h.className = "kb-card-title";
    h.textContent = "Environment";

    header.appendChild(h);
    card.appendChild(header);

    const body = document.createElement("div");
    body.style.display = "flex";
    body.style.flexWrap = "wrap";
    body.style.gap = "8px";

    (envArr || []).forEach(e => {
        const chip = document.createElement("span");
        chip.className = "kb-chip";
        chip.textContent = safeText(e);
        body.appendChild(chip);
    });

    card.appendChild(body);
    return card;
}

function renderCweCard(cweArr) {
    const card = document.createElement("div");
    card.className = "kb-card";

    const header = document.createElement("div");
    header.className = "kb-card-header";

    const h = document.createElement("div");
    h.className = "kb-card-title";
    h.textContent = "CWE";

    header.appendChild(h);
    card.appendChild(header);

    const body = document.createElement("div");
    body.className = "kb-md";

    if (!Array.isArray(cweArr) || !cweArr.length) {
        body.textContent = "—";
        card.appendChild(body);
        return card;
    }

    const ul = document.createElement("ul");
    ul.style.margin = "0";
    ul.style.paddingLeft = "18px";
    ul.style.display = "flex";
    ul.style.flexDirection = "column";
    ul.style.gap = "8px";

    cweArr.forEach(c => {
        const li = document.createElement("li");
        const id = safeText(c?.id);
        const name = safeText(c?.name);
        const link = safeText(c?.link);

        const a = document.createElement("a");
        a.href = link || "#";
        a.textContent = `${id}${name ? ` — ${name}` : ""}`;
        a.target = "_blank";
        a.rel = "noopener noreferrer";

        li.appendChild(a);
        ul.appendChild(li);
    });

    body.appendChild(ul);
    card.appendChild(body);
    return card;
}

function renderMitreCard(mitreArr) {
    const card = document.createElement("div");
    card.className = "kb-card";

    const header = document.createElement("div");
    header.className = "kb-card-header";

    const h = document.createElement("div");
    h.className = "kb-card-title";
    h.textContent = "MITRE ATT&CK";

    header.appendChild(h);
    card.appendChild(header);

    const body = document.createElement("div");
    body.className = "kb-md";

    if (!Array.isArray(mitreArr) || !mitreArr.length) {
        body.textContent = "—";
        card.appendChild(body);
        return card;
    }

    const ul = document.createElement("ul");
    ul.style.margin = "0";
    ul.style.paddingLeft = "18px";
    ul.style.display = "flex";
    ul.style.flexDirection = "column";
    ul.style.gap = "10px";

    mitreArr.forEach(t => {
        const li = document.createElement("li");
        li.style.display = "flex";
        li.style.flexDirection = "column";
        li.style.gap = "4px";

        const top = document.createElement("div");
        top.style.display = "flex";
        top.style.flexWrap = "wrap";
        top.style.gap = "8px";
        top.style.alignItems = "baseline";

        const strong = document.createElement("span");
        strong.className = "mono";
        strong.textContent = safeText(t?.id || "—");

        const name = document.createElement("span");
        name.textContent = safeText(t?.name || "");

        top.appendChild(strong);
        top.appendChild(name);

        const tactics = Array.isArray(t?.tactics) ? t.tactics : [];
        if (tactics.length) {
            const tactRow = document.createElement("div");
            tactRow.style.display = "flex";
            tactRow.style.flexWrap = "wrap";
            tactRow.style.gap = "8px";

            tactics.forEach(tt => {
                const chip = document.createElement("span");
                chip.className = "kb-chip";
                chip.textContent = safeText(tt);
                tactRow.appendChild(chip);
            });

            li.appendChild(top);
            li.appendChild(tactRow);
        } else {
            li.appendChild(top);
        }

        ul.appendChild(li);
    });

    body.appendChild(ul);
    card.appendChild(body);
    return card;
}

function renderExploitLinksCard(exploitIds) {
    const card = document.createElement("div");
    card.className = "kb-card";

    const header = document.createElement("div");
    header.className = "kb-card-header";

    const h = document.createElement("div");
    h.className = "kb-card-title";
    h.textContent = "Exploits";

    header.appendChild(h);
    card.appendChild(header);

    const body = document.createElement("div");
    body.className = "kb-md";

    if (!Array.isArray(exploitIds) || exploitIds.length === 0) {
        body.textContent = "—";
        card.appendChild(body);
        return card;
    }

    const ul = document.createElement("ul");
    ul.style.margin = "0";
    ul.style.paddingLeft = "18px";
    ul.style.display = "flex";
    ul.style.flexDirection = "column";
    ul.style.gap = "8px";

    exploitIds.forEach(id => {
        const li = document.createElement("li");

        const a = document.createElement("a");
        a.href = `/exploit?id=${encodeURIComponent(String(id))}`;
        a.textContent = `Exploit: ${safeText(id)}`;
        a.target = "_blank";
        a.rel = "noopener noreferrer";

        li.appendChild(a);
        ul.appendChild(li);
    });

    body.appendChild(ul);
    card.appendChild(body);
    return card;
}

/* ---------- Main render ---------- */

function setHeaderChips(kind, item) {
    const chips = document.getElementById("kbChips");
    if (!chips) return;

    chips.innerHTML = "";

    const typeChip = document.createElement("span");
    typeChip.className = "kb-chip";
    typeChip.textContent = kind;
    chips.appendChild(typeChip);

    // Environment as chips in header too (nice quick scan)
    const env = Array.isArray(item?.environment) ? item.environment : [];
    env.slice(0, 6).forEach(e => {
        const c = document.createElement("span");
        c.className = "kb-chip";
        c.textContent = safeText(e);
        chips.appendChild(c);
    });
}

function renderItem(kind, item) {
    const wrap = document.getElementById("kbItemWrap");
    wrap.innerHTML = "";

    const title = item?.name || item?.title || `${kind} ${item?.id || ""}`.trim();
    document.getElementById("kbTitle").textContent = title || "(untitled)";

    // Sidebar meta
    const sideType = document.getElementById("kbSideType");
    const sideId = document.getElementById("kbSideId");
    if (sideType) sideType.textContent = kind;
    if (sideId) sideId.textContent = safeText(item?.id || "—");

    setHeaderChips(kind, item);

    // Metadata card
    wrap.appendChild(renderKeyValueCard("Metadata", [
        { label: "ID", value: safeText(item?.id || "—") },
    ]));

    // Markdown sections (explicit per your request)
    if (item?.description) wrap.appendChild(renderMarkdownCard("Description", item.description));
    if (item?.impact) wrap.appendChild(renderMarkdownCard("Impact", item.impact));
    if (item?.recommendations) wrap.appendChild(renderMarkdownCard("Recommendations", item.recommendations));

    // Prerequisites / conditions: render tree, with markdown leaves
    if (item?.prerequisites !== undefined && item?.prerequisites !== null) {
        let normalized = item.prerequisites;
        if (Array.isArray(item.prerequisites)) normalized = { _and: item.prerequisites };
        wrap.appendChild(renderConditionsCard("Prerequisites", normalized));
    }

    // MITRE / CWE
    wrap.appendChild(renderMitreCard(item?.mitre));
    wrap.appendChild(renderCweCard(item?.cwe));

    // Exploits links
    wrap.appendChild(renderExploitLinksCard(item?.exploit_ids));
}

async function load() {
    initThemeControls();

    const id = getQueryParam("id");
    const kbPath = getQueryParam("knowledgebasePath");

    const hint = document.getElementById("kbSourceHint");
    if (hint) {
        hint.textContent = kbPath ? `Source: ${decodeURIComponent(kbPath)}` : "Missing knowledgebasePath";
    }

    if (!id || !kbPath) {
        document.getElementById("kbTitle").textContent = "Missing URL parameters";
        const wrap = document.getElementById("kbItemWrap");
        wrap.innerHTML = "";
        wrap.appendChild(renderMarkdownCard(
            "How to open",
            [
                "This page requires:",
                "- `id` (UUID)",
                "- `knowledgebasePath` (URL-encoded path to a KB JSON file)",
                "",
                "Examples:",
                "- `?id=7c1e9a4b-3d5f-4f8a-b2c6-0e9d5a1c8f42&knowledgebasePath=assets%2Fmisconfigurations%2Fkubernetes-misconfigurations-kb.json`",
                "- `?id=3d7f9a2c-4b61-4e8a-9f25-0c6b1e8d5a94&knowledgebasePath=assets%2Fattacks%2Fkubernetes-attacks-kb.json`",
            ].join("\n")
        ));
        return;
    }

    const resolvedPath = decodeURIComponent(kbPath);

    let json;
    try {
        const res = await fetch(resolvedPath, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        json = await res.json();
    } catch (e) {
        document.getElementById("kbTitle").textContent = "Failed loading knowledge base JSON";
        const wrap = document.getElementById("kbItemWrap");
        wrap.innerHTML = "";
        wrap.appendChild(renderMarkdownCard(
            "Error",
            `Could not load:\n\n\`${resolvedPath}\`\n\n**Reason:** ${safeText(e?.message || e)}`
        ));
        return;
    }

    const kb = normalizeKbPayload(json);
    const found = findItemById(kb, id);

    if (!found.item) {
        document.getElementById("kbTitle").textContent = "Item not found";
        const wrap = document.getElementById("kbItemWrap");
        wrap.innerHTML = "";
        wrap.appendChild(renderMarkdownCard(
            "Not found",
            [
                `No item with id: \`${id}\``,
                "",
                `In file: \`${resolvedPath}\``,
                "",
                `Counts: attacks=${kb.attacks.length}, misconfigurations=${kb.misconfigs.length}`,
            ].join("\n")
        ));
        return;
    }

    renderItem(found.kind, found.item);
}

document.addEventListener("DOMContentLoaded", load);
