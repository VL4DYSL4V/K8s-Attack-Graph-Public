const LAYOUT_PREFIX = "attackGraphLayout-";

function canonicalLayoutPath(envKey) {
    return `/assets/layouts/layout-${envKey}.json`;
}

const runLayout = ({ cy }) => () => {
    if (!cy) return;
    cy.layout({
        name: "dagre",
        rankDir: "TB",
        // ranker: "network-simplex",
        // ranker: "tight-tree",
        ranker: "longest-path",
        nodeSep: 70,
        rankSep: 110,
        padding: 60,
        fit: true,
        animate: false
    }).run();
}

const exportLayout = ({ cy }) => (envKey) => {
    if (!cy) return;

    const positions = {};
    cy.nodes().forEach(n => {
        positions[n.id()] = n.position();
    });

    const payload = {
        meta: {
            app: "container-attacks-graph",
            version: 1,
            env: envKey,
            generatedAt: new Date().toISOString()
        },
        positions
    };

    const blob = new Blob(
        [JSON.stringify(payload, null, 2)],
        { type: "application/json" }
    );

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `layout-${envKey}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

const tryLoadRemoteLayout = ({ cy }) => async (envKey) => {
    if (!cy) return false;

    const url = canonicalLayoutPath(envKey);

    try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) return false;

        const json = await res.json();

        if (
            !json.positions ||
            !json.meta ||
            json.meta.env !== envKey
        ) {
            console.warn("Layout env mismatch or invalid format");
            return false;
        }

        const positions = json.positions;

        const currentIds = cy.nodes().map(n => n.id());
        const savedIds = Object.keys(positions);

        // strict compatibility check
        for (const id of currentIds) {
            if (!savedIds.includes(id)) return false;
        }
        for (const id of savedIds) {
            if (!currentIds.includes(id)) return false;
        }

        cy.nodes().positions(n => positions[n.id()]);
        cy.fit(cy.elements(), 80);

        return true;
    } catch (e) {
        console.warn(`Failed loading ${envKey} layout:`, e);
        return false;
    }
}

const resetLayoutToCanonical = ({ cy, setStatus }) => async (envKey) => {
    if (!cy) return;

    // Remove local overrides to avoid confusion
    try {
        localStorage.removeItem(layoutKey(envKey));
    } catch {}

    // Try canonical layout first
    const canonical = await tryLoadRemoteLayout({ cy })(envKey);
    if (canonical) {
        return;
    }

    // Fallback to deterministic dagre
    runLayout({ cy })();
    setStatus("Canonical layout missing - dagre applied.", "warning");
}

function layoutKey(env) {
    return `${LAYOUT_PREFIX}${env}`;
}

const saveLayoutForEnv = ({ cy, setStatus }) => (envKey) => {
    if (!cy) return;
    const positions = {};
    cy.nodes().forEach(n => {
        positions[n.id()] = n.position();
    });

    try {
        localStorage.setItem(layoutKey(envKey), JSON.stringify(positions));
        setStatus(`Layout saved for ${envKey}.`, "info");
    } catch (e) {
        console.error("Failed to save layout:", e);
        setStatus("Layout save failed (localStorage).", "warning");
    }
}

function clearLayoutForEnv(envKey) {
    try {
        localStorage.removeItem(layoutKey(envKey));
        console.warn(`Cleared invalid saved layout for ${envKey}`);
    } catch (e) {
        // ignore
    }
}

/**
 * Validate and apply saved layout.
 * Clears it and returns false if incompatible.
 */
const tryLoadLayout = ({ cy, setStatus }) => (envKey) => {
    if (!cy) return false;

    const raw = localStorage.getItem(layoutKey(envKey));
    if (!raw) return false;

    let saved;
    try {
        saved = JSON.parse(raw);
    } catch {
        clearLayoutForEnv(envKey);
        return false;
    }

    const currentIds = cy.nodes().map(n => n.id());
    const savedIds = Object.keys(saved);

    // Missing positions
    for (const id of currentIds) {
        if (!savedIds.includes(id)) {
            clearLayoutForEnv(envKey);
            setStatus("Saved layout invalid – falling back to dagre.", "warning");
            return false;
        }
    }

    // Extra nodes in saved layout
    for (const id of savedIds) {
        if (!currentIds.includes(id)) {
            clearLayoutForEnv(envKey);
            setStatus("Saved layout invalid – falling back to dagre.", "warning");
            return false;
        }
    }

    // All good: apply layout
    cy.nodes().positions(n => saved[n.id()]);
    cy.fit(cy.elements(), 80);
    setStatus(`Loaded saved layout for ${envKey}.`, "info");
    return true;
}

const loadLayout = ({ cy, setStatus, envKey }) => async () => {
    const canonical = await tryLoadRemoteLayout({cy})(envKey);
    if (canonical) {
        return;
    }

    const local = tryLoadLayout({cy, setStatus})(envKey);
    if (local) {
        return;
    }

    runLayout({cy})();
};


const initLayoutControls = ({ cy, setStatus }) => (envKeySupplier) => {
    if (!cy) {
        throw new Error(`cy dependency is empty`);
    }

    document
        .getElementById("btn-save-layout")
        ?.addEventListener("click", () => {
            console.log(cy);
            saveLayoutForEnv({ cy, setStatus })(envKeySupplier());
        });

    document
        .getElementById("btn-relayout")
        ?.addEventListener("click", () => {
            resetLayoutToCanonical({ cy, setStatus })(envKeySupplier());
        });

    document.getElementById("btn-download-layout")
        ?.addEventListener("click", () => exportLayout({ cy })(envKeySupplier()));
}