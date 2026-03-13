const fetchGraph = ({ envConfigs, setStatus }) => async (envKey) => {
    const cfg = envConfigs[envKey];
    if (!cfg) {
        setStatus(`Unknown environment: ${envKey}`, "warning");
        return;
    }

    setStatus(`Loading ${cfg.label} graph…`);

    try {
        const res = await fetch(cfg.file);
        if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
        }

        return await res.json();
    } catch (err) {
        console.error(err);
        setStatus(`Load failed – see console.`, "warning");
    }
}