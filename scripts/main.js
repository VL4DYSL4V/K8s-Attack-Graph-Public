// ============================================================================
// ENVIRONMENT CONFIG
// ============================================================================
const ENV_CONFIGS = {
    kubernetes: {
        key: "kubernetes",
        label: "Kubernetes",
        file: "assets/attack-graphs/kubernetes-attacks.json",
        attacksKbFile: "assets/attacks/kubernetes-attacks-kb.json",
        misconfigurationsKbFile: "assets/misconfigurations/kubernetes-misconfigurations-kb.json",
    },
    docker: {
        key: "docker",
        label: "Docker",
        file: "assets/attack-graphs/docker-attacks.json",
        attacksKbFile: "",
        misconfigurationsKbFile: "",
    },
};

const appState = new AppState()

const loadKnowledgeBaseForEnv = async (cfg) => {
    const [attacksRes, misRes] = await Promise.all([
        fetch(cfg.attacksKbFile),
        fetch(cfg.misconfigurationsKbFile),
    ]);

    const attacksJson = attacksRes.ok ? await attacksRes.json() : { attacks: [] };
    const misJson = misRes.ok ? await misRes.json() : { misconfigurations: [] };

    const attacks = attacksJson.attacks || [];
    const misconfigurations = misJson.misconfigurations || []

    return new KnowledgeBaseStore(attacks, misconfigurations);
};

const loadNewGraph = async ({ envKey }) => {
    const config = ENV_CONFIGS[envKey] || {};

    appState.setConfig(config)

    const graphData = await fetchGraph({
        envConfigs: ENV_CONFIGS,
        setStatus,
    })(envKey);

    try {
        const kb = await loadKnowledgeBaseForEnv(config);
        appState.setKnowledgeBase(kb);
    } catch (e) {
        console.warn("KB load failed:", e);
        appState.setKnowledgeBase(new KnowledgeBaseStore([], []));
    }

    destroyCytoscape({ cy: appState.getCy() });
    const cy = initCytoscape({
        setStatus,
        envKey,
        loadLayout,
        appState
    })(graphData);

    appState.setCy(cy)

    populateControls({
        cy,
        envConfig: ENV_CONFIGS,
        currentEnvKey: envKey,
    });
    setStatus(`${config?.label || ''} graph loaded.`, "info");

    initThemeControls();
    initLayoutControls({cy, setStatus})(() => envKey);
    attachLeftSidebarHandlers({
        appState,
        loadNewGraph,
        setStatus,
    });

    attachZoomButtons({ cy });
}

// ============================================================================
// INIT
// ============================================================================
document.addEventListener("DOMContentLoaded", async () => {
    await loadNewGraph({
        envKey: ENV_CONFIGS.kubernetes.key
    });
});
