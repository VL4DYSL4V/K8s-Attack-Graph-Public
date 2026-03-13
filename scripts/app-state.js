class KnowledgeBaseStore {
    constructor(attacks, misconfigs) {
        const buildMap = (arr) => {
            const m = new Map();
            (arr || []).forEach(x => { if (x && x.id) m.set(x.id, x); });
            return m;
        };

        this._attacks = attacks || [];
        this._misconfigs = misconfigs || [];

        this._attacksById = buildMap(this._attacks);
        this._misconfigsById = buildMap(this._misconfigs);
    }

    getAttacks() { return this._attacks; }
    getMisconfigurations() { return this._misconfigs; }

    getAttackById(id) { return this._attacksById.get(id) || null; }
    getMisconfigurationById(id) { return this._misconfigsById.get(id) || null; }

    // simple scalable search hook (upgrade later to fuse.js if you want)
    searchAttacks(q) {
        const query = (q || "").trim().toLowerCase();
        if (!query) return this._attacks;
        return this._attacks.filter(a =>
            (a.name || "").toLowerCase().includes(query) ||
            (a.id || "").toLowerCase().includes(query)
        );
    }

    searchMisconfigurations(q) {
        const query = (q || "").trim().toLowerCase();
        if (!query) return this._misconfigs;
        return this._misconfigs.filter(m =>
            (m.name || "").toLowerCase().includes(query) ||
            (m.id || "").toLowerCase().includes(query)
        );
    }
}

class AppState {

    _cy = null
    _neighbourhoodOriginalPositions = null
    _knowledgeBase = null;
    _config = {}

    setKnowledgeBase(kb) {
        this._knowledgeBase = kb || null;
    }

    getKnowledgeBase() {
        return this._knowledgeBase;
    }

    getConfig() {
        return this._config
    }

    setConfig(config = {}) {
        this._config = config;
    }

    setCy(cy) {
        this._cy = cy
    }

    getCy() {
        return this._cy;
    }

    setNeighbourhoodOriginalPositions(neighbourhoodOriginalPositions) {
        this._neighbourhoodOriginalPositions = neighbourhoodOriginalPositions;
    }

    getNeighbourhoodOriginalPositions() {
        return this._neighbourhoodOriginalPositions;
    }

}