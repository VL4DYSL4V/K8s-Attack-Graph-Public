function getParam(name) {
    const u = new URL(window.location.href);
    return u.searchParams.get(name) || "";
}

function normalizeArrayPayload(json, key) {
    const arr = (json && json[key]) ? json[key] : [];
    return Array.isArray(arr) ? arr : [];
}

function matchesQuery(item, q) {
    if (!q) {
        return true;
    }
    const name = (item?.name || "").toLowerCase();
    const id = (item?.id || "").toLowerCase();
    return name.includes(q) || id.includes(q);
}

function renderList({ el, items, onClick }) {
    el.innerHTML = "";

    if (!items.length) {
        const li = document.createElement("li");
        li.className = "kb-empty";
        li.textContent = "No results.";
        el.appendChild(li);
        return;
    }

    items.forEach((x) => {
        const li = document.createElement("li");

        const a = document.createElement("a");
        a.href = "#";
        a.className = "kb-item";
        a.textContent = x?.name || x?.id || "Unnamed item";
        a.title = x?.id || "";

        a.addEventListener("click", (e) => {
            e.preventDefault();
            onClick?.(x);
        });

        const meta = document.createElement("div");
        meta.className = "kb-item-meta";
        meta.textContent = x?.id || "";

        li.appendChild(a);
        li.appendChild(meta);
        el.appendChild(li);
    });
}

async function loadJson(url) {
    if (!url) {
        return null;
    }
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
        throw new Error(`Failed to fetch ${url} (HTTP ${res.status})`);
    }
    return await res.json();
}

document.addEventListener("DOMContentLoaded", async () => {
    initThemeControls?.();

    const attacksHref = getParam("attacksHref");
    const misconfigurationsHref = getParam("misconfigurationsHref");

    const kbSourceHint = document.getElementById("kbSourceHint");
    if (kbSourceHint) {
        kbSourceHint.textContent = ""; // clear safely

        const makeLine = (label, value) => {
            const line = document.createElement("div");

            const labelNode = document.createTextNode(`${label}: `);
            const code = document.createElement("code");
            code.textContent = value || "—";

            line.appendChild(labelNode);
            line.appendChild(code);
            return line;
        };

        kbSourceHint.appendChild(makeLine("Attacks", attacksHref));
        kbSourceHint.appendChild(makeLine("Misconfigs", misconfigurationsHref));
    }

    const attacksList = document.getElementById("attacksList");
    const misconfigsList = document.getElementById("misconfigsList");
    const attacksCount = document.getElementById("attacksCount");
    const misconfigsCount = document.getElementById("misconfigsCount");
    const kbCounts = document.getElementById("kbCounts");
    const search = document.getElementById("kbSearch");

    try {
        const [attacksJson, misJson] = await Promise.all([
            loadJson(attacksHref),
            loadJson(misconfigurationsHref),
        ]);

        const allAttacks = normalizeArrayPayload(attacksJson, "attacks");
        const allMisconfigs = normalizeArrayPayload(misJson, "misconfigurations");

        const rerender = () => {
            const q = (search?.value || "").trim().toLowerCase();

            const attacks = allAttacks.filter((x) => matchesQuery(x, q));
            const misconfigs = allMisconfigs.filter((x) => matchesQuery(x, q));

            attacksCount.textContent = String(attacks.length);
            misconfigsCount.textContent = String(misconfigs.length);
            kbCounts.textContent = `${attacks.length} / ${allAttacks.length} attacks · ${misconfigs.length} / ${allMisconfigs.length} misconfigs`;

            renderList({
                el: attacksList,
                items: attacks,
                onClick: (x) => {
                    // Not implemented yet — stub navigation point:
                    window.open(`./kb-item.html?id=${encodeURIComponent(x.id)}&knowledgebasePath=${encodeURIComponent(attacksHref)}`, "_blank");
                },
            });

            renderList({
                el: misconfigsList,
                items: misconfigs,
                onClick: (x) => {
                    // Not implemented yet — stub navigation point:
                    window.open(`./kb-item.html?id=${encodeURIComponent(x.id)}&knowledgebasePath=${encodeURIComponent(misconfigurationsHref)}`, "_blank");
                },
            });
        };

        search?.addEventListener("input", rerender);

        rerender();
    } catch (e) {
        console.error(e);
    }
});
