const attachZoomButtons = ({ cy }) => {
    const Z = 1.2;
    const btnIn = document.getElementById("btn-zoom-in");
    const btnOut = document.getElementById("btn-zoom-out");
    const btnFit = document.getElementById("btn-zoom-fit");
    const btnCenter = document.getElementById("btn-zoom-center");
    const btnReset = document.getElementById("btn-zoom-reset");

    if (btnIn) {
        btnIn.onclick = () => {
            if (!cy) return;
            const cur = cy.zoom();
            cy.zoom({
                level: cur * Z,
                renderedPosition: {x: cy.width() / 2, y: cy.height() / 2},
            });
        };
    }

    if (btnOut) {
        btnOut.onclick = () => {
            if (!cy) return;
            const cur = cy.zoom();
            cy.zoom({
                level: cur / Z,
                renderedPosition: {x: cy.width() / 2, y: cy.height() / 2},
            });
        };
    }

    if (btnFit) {
        btnFit.onclick = () => {
            if (!cy) return;
            cy.fit(cy.elements(), 80);
        };
    }

    if (btnCenter) {
        btnCenter.onclick = () => {
            if (!cy) return;
            cy.center();
        };
    }

    if (btnReset) {
        btnReset.onclick = () => {
            if (!cy) return;
            cy.zoom(1);
            cy.center();
        };
    }
}

const destroyCytoscape = ({ cy }) => {
    if (cy) {
        cy.destroy();
        cy = null;
    }
}

const initCytoscape = ({
                           setStatus,
                           envKey,
                           loadLayout,
                           appState,
                       }) => (graphData) => {
    const container = document.getElementById("cy");
    if (!container) {
        return;
    }

    const nodes = (graphData.nodes || []).map(n => ({
        data: {
            id: n.id,
            label: n.label || n.id,
            parent: n.parent || null,
            type: n.type || "step",
            stateCategory: n.stateCategory || null
        }
    }));

    const edges = (graphData.edges || []).map((e, idx) => {
        const edgeLabels = Array.isArray(e.edgeLabels) ? e.edgeLabels : [];
        const label = edgeLabels.length ? edgeLabels.map(x => `• ${x}`).join("\n") : "";
        return {
            data: {
                id: e.id || `e-${idx}-${e.source}-${e.target}`,
                source: e.source,
                target: e.target,
                edgeLabels,
                label,
                bidirectional: Boolean(e.bidirectional),
                misconfigurationIds: e.misconfigurationIds || [],
                attackIds: e.attackIds || [],
            },
        };
    });

    const cy = cytoscape({
        container,
        elements: {nodes, edges},
        layout: {name: "preset"},

        style: [
            {
                selector: "node",
                style: {
                    shape: "round-rectangle",
                    width: "label",
                    height: "label",
                    padding: "8px",
                    "background-color": "#e5e7eb",
                    "border-width": 1.5,
                    "border-color": "#1a1a1a",
                    label: "data(label)",
                    color: "#1a1a1a",
                    "font-size": 12,
                    "font-weight": 600,
                    "text-wrap": "wrap",
                    "text-max-width": 160,
                    "text-valign": "center",
                    "text-halign": "center",
                },
            },
            {
                selector: "edge",
                style: {
                    "curve-style": "bezier",
                    "line-color": "rgba(148, 163, 184, 0.7)",
                    width: 1.2,
                    "target-arrow-shape": "triangle",
                    "target-arrow-color": "rgba(148, 163, 184, 0.9)",
                    'source-arrow-shape': 'none',
                    'source-arrow-color': 'rgba(148, 163, 184, 0.9)',
                    opacity: 0.9,

                    // labels
                    label: "data(label)",
                    "font-size": 12,
                    color: "#1a1a1a",
                    "text-rotation": "none",
                    "text-wrap": "wrap",
                    "text-max-width": 220,
                    "text-background-color": "#e5e7eb",
                    "text-background-opacity": 0.95,
                    "text-background-shape": "round-rectangle",
                    "text-background-padding": 6,

                    // offset labels so bidirectional edges don't overlap
                    "text-margin-x": edge =>
                        edge.data("source") < edge.data("target") ? 32 : -32,
                    "text-margin-y": edge =>
                        edge.data("source") < edge.data("target") ? -24 : 24,

                    "text-halign": "left",
                    "text-valign": "center",
                },
            },
            {
                selector: 'edge.bidirectional',
                style: {
                    'source-arrow-shape': 'triangle',
                    'source-arrow-color': 'rgba(148, 163, 184, 0.9)'
                }
            },
            {
                selector: 'edge.top-label',
                style: {
                    'z-index': 9999,
                    'text-background-color': '#ffffff',
                    'font-weight': 'bold'
                }
            },
            {
                selector: 'node[type = "step"]',
                style: {
                    'background-color': '#e5e7eb',
                    'border-color': '#1a1a1a',
                    'color': '#1a1a1a'
                }
            },
            {
                selector: 'node[type = "realm"]',
                style: {
                    'shape': 'round-rectangle',
                    'background-opacity': 0.04,
                    'border-width': 2,
                    'border-style': 'dashed',
                    'border-color': '#64748b',
                    'label': 'data(label)',
                    'font-size': 16,
                    'font-weight': 'bold',
                    'text-valign': 'top',
                    'text-halign': 'center',
                    'padding': '30px',
                    'z-index': -1
                }
            },
            {
                selector: 'node[type = "state"]',
                style: {
                    'background-color': '#7f1d1d',
                    'border-color': '#fecaca',
                    'border-width': 2,
                    'color': '#fff',
                    'font-weight': 700,
                    'shape': 'round-rectangle',
                    'padding': '10px',
                    'text-max-width': 140
                }
            },
            {
                selector: '#REALM_CONTAINER',
                style: {'background-color': '#38bdf8'}
            },
            {
                selector: '#REALM_AWS',
                style: {'background-color': '#fca503'}
            },
            {
                selector: '#REALM_ON_PREM',
                style: {'background-color': '#a855f7'}
            },
            {
                selector: '#REALM_MEMORY',
                style: {'background-color': '#ef4444'}
            },
            {
                selector: ".dimmed",
                style: {
                    opacity: 0.15,
                },
            },
            {
                selector: 'edge.hide-go-back',
                style: {
                    opacity: 0,
                    'text-opacity': 0,
                    'text-background-opacity': 0,
                    'target-arrow-color': 'rgba(0,0,0,0)',
                    'source-arrow-color': 'rgba(0,0,0,0)'
                }
            },
            {
                selector: ".highlight-node",
                style: {
                    "border-width": 2.5,
                    "border-color": "#38bdf8",
                },
            },
            {
                selector: ".highlight-edge",
                style: {
                    "line-color": "#38bdf8",
                    "target-arrow-color": "#38bdf8",
                    "source-arrow-color": "#38bdf8",
                    width: 2.2,
                },
            },
            {
                selector: ".fully-transparent",
                style: {
                    opacity: 0.02,
                    "text-opacity": 0.0
                }
            }
        ],

        zoomingEnabled: true,
        userZoomingEnabled: true,
        wheelSensitivity: 0.2,
        minZoom: 0.1,
        maxZoom: 3,
    });

    // Mark bidirectional edges with a CSS class
    cy.batch(() => {
        cy.edges().forEach(edge => {
            if (edge.data('bidirectional') === true) {
                edge.addClass('bidirectional');
            }
        });
    });

    // Try saved layout; fallback to dagre
    loadLayout({
        cy,
        setStatus,
        envKey
    })();

    // Click node -> autofill selects
    cy.on("tap", "node", evt => {
        const id = evt.target.id();
        const focus = document.getElementById("focusNodeSelect");

        if (focus) {
            focus.value = id;
        }
    });

    cy.on('tap', 'edge', evt => {
        const edge = evt.target;

        // remove "top-label" from all edges
        cy.edges().removeClass('top-label');

        // add to the clicked one
        edge.addClass('top-label');

        // update status bar (optional)
        const label = edge.data('label') || edge.id();
        setStatus(`Label highlighted: "${label.split('\n')[0]}"`, 'info');

        // NEW: show right sidebar
        window.EdgeSidebar?.showForEdge?.({
            edgeData: edge.data(),
            appState,
        });
    });

    return cy;
}