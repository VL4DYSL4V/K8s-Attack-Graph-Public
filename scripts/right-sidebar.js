(function () {
    const elSidebar = () => document.getElementById("edgeSidebar");
    const elClose = () => document.getElementById("edgeSidebarClose");

    const elAttacks = () => document.getElementById("edgeSidebarAttacks");
    const elMis = () => document.getElementById("edgeSidebarMisconfigs");
    const elAttacksCount = () => document.getElementById("edgeSidebarAttacksCount");
    const elMisCount = () => document.getElementById("edgeSidebarMisconfigsCount");

    const clearList = (ul) => {
        if (!ul) return;
        ul.innerHTML = "";
    };

    const addEmpty = (ul, text) => {
        const li = document.createElement("li");
        li.className = "edge-empty";
        li.textContent = text;
        ul.appendChild(li);
    };

    const addLinkItem = ({ ul, href, text }) => {
        const li = document.createElement("li");
        const a = document.createElement("a");
        a.className = "edge-link";
        a.href = href;
        a.textContent = text;
        a.target = "blank";
        a.rel = "noopener noreferrer"
        li.appendChild(a);
        ul.appendChild(li);
    };

    const show = () => {
        const s = elSidebar();
        if (!s) return;
        s.classList.remove("is-hidden");
    };

    const hide = () => {
        const s = elSidebar();
        if (!s) return;
        s.classList.add("is-hidden");
    };

    const showForEdge = ({ edgeData, appState }) => {
        const attacksUl = elAttacks();
        const misUl = elMis();

        clearList(attacksUl);
        clearList(misUl);

        const attackIds = edgeData?.attackIds || [];
        const misIds = edgeData?.misconfigurationIds || [];

        elAttacksCount().textContent = String(attackIds.length);
        elMisCount().textContent = String(misIds.length);

        if (!attackIds.length) {
            addEmpty(attacksUl, "No attacks attached.");
        } else {
            attackIds.forEach((id) => {
                const name = appState.getKnowledgeBase().getAttackById(id)?.name || id;

                addLinkItem({
                    ul: attacksUl,
                    href: `./kb-item.html?id=${encodeURIComponent(id)}&knowledgebasePath=${encodeURIComponent(appState.getConfig().attacksKbFile)}`,
                    text: name
                });
            });
        }

        if (!misIds.length) {
            addEmpty(misUl, "No misconfigurations attached.");
        } else {
            misIds.forEach((id) => {
                const name = appState.getKnowledgeBase().getMisconfigurationById(id)?.name || id;

                addLinkItem({
                    ul: misUl,
                    href: `./kb-item.html?id=${encodeURIComponent(id)}&knowledgebasePath=${encodeURIComponent(appState.getConfig().misconfigurationsKbFile)}`,
                    text: name
                });
            });
        }

        show();
    };

    document.addEventListener("DOMContentLoaded", () => {
        elClose()?.addEventListener("click", hide);
    });

    window.EdgeSidebar = { showForEdge, show, hide };
})();

