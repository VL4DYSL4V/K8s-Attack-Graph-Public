GO_BACK_LABEL = "go back"

const openAttacksAndMisconfigsPage = ({ appState, setStatus }) => () => {
    const cfg = appState?.getConfig?.() || {};

    const attacksHref = cfg.attacksKbFile || "";
    const misconfigurationsHref = cfg.misconfigurationsKbFile || "";

    if (!attacksHref && !misconfigurationsHref) {
        setStatus?.("No KB paths configured for this environment.", "warning");
        return;
    }

    const url =
        `attacks-and-misconfigurations.html` +
        `?attacksHref=${encodeURIComponent(attacksHref)}` +
        `&misconfigurationsHref=${encodeURIComponent(misconfigurationsHref)}`;

    window.open(url, "_blank", "noopener,noreferrer");
};


const toggleHideGoBackEdges = ({ appState }) => (hide) => {
    const cy = appState.getCy();
    if (!cy) return;

    cy.batch(() => {
        cy.edges().forEach(edge => {
            const labels = edge.data("edgeLabels") || [];
            const isGoBack = labels.includes("Go back");

            if (!isGoBack) return;

            if (hide) {
                edge.addClass("hide-go-back");
            } else {
                edge.removeClass("hide-go-back");
            }
        });
    });
};


const populateNodeSelect = ({ cy }) => (selectEl, placeholderText) => {
    if (!selectEl || !cy) {
        return;
    }

    const nodes = cy
        .nodes()
        .map(n => ({
            id: n.id(),
            label: n.data("label") || n.id(),
        }))
        .sort((a, b) => a.label.localeCompare(b.label));

    const current = selectEl.value;
    selectEl.innerHTML = "";

    const ph = document.createElement("option");
    ph.value = "";
    ph.textContent = placeholderText;
    selectEl.appendChild(ph);

    nodes.forEach(node => {
        const opt = document.createElement("option");
        opt.value = node.id;
        opt.textContent = node.label || node.id;
        selectEl.appendChild(opt);
    });

    if (current && nodes.some(n => n.id === current)) {
        selectEl.value = current;
    }
}

const populateNodeSearchSelect = ({ cy }) => {
    const select = document.getElementById("nodeSearchSelect");
    if (!select || !cy) {
        return;
    }

    select.innerHTML = '<option value="">Select a node…</option>';

    cy.nodes().forEach(n => {
        const opt = document.createElement("option");
        opt.value = n.id();                 // authoritative
        opt.textContent = n.data("label");  // human-readable
        select.appendChild(opt);
    });
}

const populateEnvSelect = ({ envConfig, currentEnvKey }) => {
    const envSelect = document.getElementById("envSelect");
    if (!envSelect || !envConfig) {
        return;
    }

    envSelect.innerHTML = "";
    Object.values(envConfig).forEach(env => {
        const opt = document.createElement("option");
        opt.value = env.key;
        opt.textContent = env.label;
        envSelect.appendChild(opt);
    });

    envSelect.value = currentEnvKey;
}

const populateControls = ({ cy, envConfig, currentEnvKey }) => {
    if (!cy) {
        return;
    }
    populateNodeSelect({ cy })(
        document.getElementById("focusNodeSelect"),
        "Select a node…"
    );
    populateNodeSearchSelect({ cy });
    populateEnvSelect({ envConfig, currentEnvKey });
}

const clearAllClasses = ({ cy }) => {
    if (!cy) {
        return;
    }
    cy.elements().removeClass(
        "fully-transparent highlight-node highlight-edg"
    );
}

const resetNeighbourSearchUI = () => {
    const focusSelect = document.getElementById("focusNodeSelect");
    if (focusSelect) {
        focusSelect.value = "";
    }

    const gatherChk = document.getElementById("chkGatherNeighbours");
    if (gatherChk) {
        gatherChk.checked = false;
    }
}

const resetAllFilters = ({ appState }) => ({ restorePositions = true } = {}) => {
    const cy = appState.getCy();
    const neighbourhoodOriginalPositions = appState.getNeighbourhoodOriginalPositions()

    if (!cy) {
        return;
    }

    cy.batch(() => {
        clearAllClasses({ cy });

        // Restore neighbour-gather positions if needed
        if (restorePositions && neighbourhoodOriginalPositions) {
            cy.nodes().forEach(n => {
                const pos = neighbourhoodOriginalPositions[n.id()];
                if (pos) n.position(pos);
            });
            appState.setNeighbourhoodOriginalPositions(null);
        }
    });

    cy.fit(cy.elements(), 80);
}

const clearFiltersAndFit = ({ appState }) => {
    const cy = appState.getCy();

    if (!cy) {
        return;
    }

    const neighbourhoodOriginalPositions = appState.getNeighbourhoodOriginalPositions()

    cy.batch(() => {
        resetAllFilters({ appState })({ restorePositions: false });

        if (neighbourhoodOriginalPositions) {
            cy.nodes().forEach(n => {
                const pos = neighbourhoodOriginalPositions[n.id()];
                if (pos) n.position(pos);
            });
            appState.setNeighbourhoodOriginalPositions(null);
        }
    });

    cy.fit(cy.elements(), 80);
}

const showNeighbourhood = ({ appState }) => (focusNodeId) => {
    const cy = appState.getCy();
    const neighbourhoodOriginalPositions = appState.getNeighbourhoodOriginalPositions();

    if (!cy || !focusNodeId) {
        return;
    }

    const focus = cy.getElementById(focusNodeId);
    if (!focus.nonempty()) {
        return;
    }

    // Cancel node search selection
    const nodeSearch = document.getElementById("nodeSearchSelect");
    if (nodeSearch) nodeSearch.value = "";

    resetAllFilters({ appState })({ restorePositions: false });

    const gather = document.getElementById("chkGatherNeighbours")?.checked;

    cy.batch(() => {
        clearAllClasses({ cy });

        const neighbours =
            focus.neighborhood().nodes().add(focus);

        const neighbourEdges =
            focus.connectedEdges();

        const neighbourParents =
            neighbours.parents();

        const neighbourhoodElements =
            neighbours
                .union(neighbourEdges)
                .union(neighbourParents);

        cy.elements()
            .difference(neighbourhoodElements)
            .addClass("fully-transparent");

        // Parents must NEVER be transparent
        neighbourParents.removeClass("fully-transparent");

        focus.addClass("highlight-node");
        neighbourEdges.addClass("highlight-edge");

        if (gather) {
            if (!neighbourhoodOriginalPositions) {
                const newNeighbourhoodOriginalPositions = {};
                neighbours.forEach(n => {
                    newNeighbourhoodOriginalPositions[n.id()] = { ...n.position() };
                });

                appState.setNeighbourhoodOriginalPositions(
                    newNeighbourhoodOriginalPositions
                );
            }

            const center = focus.position();
            const count = neighbours.length - 1;

            if (count > 0) {
                const radius = Math.max(220, count * 55);
                const step = (2 * Math.PI) / count;
                let angle = -Math.PI / 2;

                neighbours.not(focus).forEach(n => {
                    const x = center.x + radius * Math.cos(angle);
                    const y = center.y + radius * Math.sin(angle);
                    n.position({ x, y });
                    angle += step;
                });
            }
        }
    });

    const fitTargets = focus
        .neighborhood()
        .nodes()
        .add(focus)
        .add(focus.connectedEdges());

    cy.fit(fitTargets, gather ? 40 : 80);
};

const handleNodeSearch = ({appState}) => {
    const select = document.getElementById("nodeSearchSelect");
    const id = select.value;

    const cy = appState.getCy();
    if (!id || !cy) {
        return;
    }

    const node = cy.getElementById(id);
    if (!node || node.empty()) {
        return;
    }

    resetAllFilters({appState})();
    resetNeighbourSearchUI();

    node.addClass("highlight-node");
    node.removeClass("dimmed");
    node.connectedEdges().removeClass("dimmed");
    node.connectedNodes().removeClass("dimmed");

    cy.animate(
        {
            center: {eles: node},
            zoom: Math.min(1.25, cy.maxZoom())
        },
        {
            duration: 450,
            easing: "ease-in-out"
        }
    );
}

const attachLeftSidebarHandlers = ({ appState, loadNewGraph, setStatus }) => {
    const envSelect = document.getElementById("envSelect");
    const btnNeighbourhood = document.getElementById("btn-neighbourhood");
    const btnNeighbourhoodClear = document.getElementById("btn-neighbourhood-clear");
    const btnSearchClear = document.getElementById("btn-node-search-clear");
    const chkHideGoBack = document.getElementById("chkHideGoBackLabels");

    const kbLink = document.getElementById("kbLink");
    if (kbLink) {
        kbLink.addEventListener("click", (e) => {
            e.preventDefault();
            openAttacksAndMisconfigsPage({ appState, setStatus })();
        });
    }

    if (chkHideGoBack) {
        chkHideGoBack.addEventListener("change", (e) => {
            toggleHideGoBackEdges({ appState })(e.target.checked);
        });
    }


    if (envSelect) {
        envSelect.onchange = (e) => {
            resetAllFilters({ appState })();
            loadNewGraph({
                envKey: e.target.value,
            })
        };
    }

    if (btnNeighbourhood) {
        btnNeighbourhood.onclick = () => {
            const val = document.getElementById("focusNodeSelect").value;
            if (!val) {
                setStatus("Pick a node for neighbourhood view first.", "warning");
                return;
            }
            showNeighbourhood({ appState })(val);
        };
    }

    if (btnNeighbourhoodClear) {
        btnNeighbourhoodClear.addEventListener("click", () => clearFiltersAndFit({
            appState
        }));
    }

    if (btnSearchClear) {
        btnSearchClear.addEventListener("click", () => clearFiltersAndFit({
            appState
        }));
    }

    document.getElementById("btn-node-search")
        ?.addEventListener("click", () => handleNodeSearch({ appState }));
}