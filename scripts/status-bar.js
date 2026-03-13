function setStatus(msg, type) {
    const text = document.getElementById("statusText");
    const pill = document.getElementById("statusPill");
    if (!text || !pill) return;
    text.textContent = msg || "";
    if (type === "warning") {
        pill.classList.add("warning");
    } else {
        pill.classList.remove("warning");
    }
}
