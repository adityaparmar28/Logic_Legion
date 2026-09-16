/* ==========================================================================
   SignalScope v2 - Ultra-Fast Forensic JavaScript Engine
   Zero-lag DOM updates, Async REST API, Drag-and-Drop & Live Visualizers
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  initThemeSelector();
  initTabs();
  initSingleImageForensics();
  initBatchScanner();
  initRobustnessLab();
  initSystemStatus();
});

/* --------------------------------------------------------------------------
   0. Theme Selector (Light, System Default, Dark)
   -------------------------------------------------------------------------- */
function initThemeSelector() {
  const themeSelector = document.getElementById("theme-selector");
  if (!themeSelector) return;

  const savedTheme = localStorage.getItem("signalscope_theme") || "system";
  themeSelector.value = savedTheme;
  document.body.setAttribute("data-theme", savedTheme);

  themeSelector.addEventListener("change", (e) => {
    const chosenTheme = e.target.value;
    localStorage.setItem("signalscope_theme", chosenTheme);
    document.body.setAttribute("data-theme", chosenTheme);
  });

  // Listen for OS dark mode changes if system default is selected
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (themeSelector.value === "system") {
      document.body.setAttribute("data-theme", "system");
    }
  });
}

/* --------------------------------------------------------------------------
   1. Tab Navigation (0ms Latency)
   -------------------------------------------------------------------------- */
function initTabs() {
  const tabBtns = document.querySelectorAll(".tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");

  tabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-tab");

      tabBtns.forEach(b => b.classList.remove("active"));
      tabContents.forEach(c => c.classList.remove("active"));

      btn.classList.add("active");
      const targetContent = document.getElementById(targetId);
      if (targetContent) targetContent.classList.add("active");
    });
  });
}

/* --------------------------------------------------------------------------
   2. Single Image Forensics
   -------------------------------------------------------------------------- */
function initSingleImageForensics() {
  const dropzone = document.getElementById("single-dropzone");
  const fileInput = document.getElementById("single-file-input");
  const previewWrapper = document.getElementById("single-preview-wrapper");
  const previewImg = document.getElementById("single-preview-img");
  const resultsContainer = document.getElementById("single-results");

  if (!dropzone || !fileInput) return;

  // Trigger file dialog
  dropzone.addEventListener("click", () => fileInput.click());

  // Drag & drop handlers
  ["dragenter", "dragover"].forEach(event => {
    dropzone.addEventListener(event, e => {
      e.preventDefault();
      dropzone.classList.add("dragover");
    });
  });

  ["dragleave", "drop"].forEach(event => {
    dropzone.addEventListener(event, e => {
      e.preventDefault();
      dropzone.classList.remove("dragover");
    });
  });

  dropzone.addEventListener("drop", e => {
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleSingleFile(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener("change", e => {
    if (e.target.files && e.target.files[0]) {
      handleSingleFile(e.target.files[0]);
    }
  });

  function handleSingleFile(file) {
    if (!file.type.startsWith("image/")) {
      alert("Please upload a valid image file (JPG, PNG, WebP).");
      return;
    }

    // 1. Instant 0ms Preview via FileReader
    const reader = new FileReader();
    reader.onload = ev => {
      previewImg.src = ev.target.result;
      previewWrapper.style.display = "flex";
      previewWrapper.classList.add("scanning");
      resultsContainer.style.display = "none";
    };
    reader.readAsDataURL(file);

    // 2. High-speed API inference call
    const formData = new FormData();
    formData.append("file", file);

    fetch("/api/analyze", {
      method: "POST",
      body: formData
    })
      .then(res => {
        if (!res.ok) throw new Error("Inference failed.");
        return res.json();
      })
      .then(data => {
        previewWrapper.classList.remove("scanning");
        renderSingleResults(data, file.name);
      })
      .catch(err => {
        previewWrapper.classList.remove("scanning");
        alert("Error during forensic analysis: " + err.message);
      });
  }

  function renderSingleResults(data, filename) {
    resultsContainer.style.display = "block";

    // Verdict Banner
    const banner = document.getElementById("verdict-banner");
    const heading = document.getElementById("verdict-heading");
    const sub = document.getElementById("verdict-sub");
    const fill = document.getElementById("confidence-fill");
    const pctLabel = document.getElementById("confidence-pct");

    banner.className = "verdict-banner " + (data.is_fake ? "verdict-fake" : "verdict-real");
    heading.innerHTML = (data.is_fake ? "🤖 Likely AI-Generated" : "📸 Likely Authentic Real");
    sub.innerHTML = `Operating Threshold: ${data.threshold.toFixed(2)} | Forensic Confidence: ${data.confidence_pct}% | Latency: ⚡ ${data.latency_ms} ms`;

    fill.className = "confidence-progress-fill " + (data.is_fake ? "fill-fake" : "fill-real");
    fill.style.width = data.confidence_pct + "%";
    pctLabel.textContent = data.confidence_pct + "%";

    // Evidence Cards
    document.getElementById("ev-model-val").textContent = data.confidence_pct + "%";
    document.getElementById("ev-model-desc").textContent = data.model_signal;

    document.getElementById("ev-srm-val").textContent = data.is_fake ? "Artefacts Detected" : "Clean Noise";
    document.getElementById("ev-srm-desc").textContent = data.srm_signal;

    const warnCount = data.metadata.warnings.length;
    document.getElementById("ev-meta-val").textContent = warnCount > 0 ? "Suspicious ⚠️" : "Verified / Clean";
    document.getElementById("ev-meta-desc").textContent = warnCount > 0 ? `${warnCount} Anomalies detected` : "No tampering signatures";

    document.getElementById("ev-perf-val").textContent = `${data.latency_ms} ms`;
    document.getElementById("ev-perf-desc").textContent = "High-speed tensor inference ⚡";

    // Heatmap Overlay
    const heatmapImg = document.getElementById("heatmap-overlay-img");
    heatmapImg.src = data.heatmap_overlay;

    // AI Explanation Text
    document.getElementById("ai-explanation-text").textContent = data.explanation;

    // Metadata Table
    const metaTable = document.getElementById("metadata-table-body");
    metaTable.innerHTML = `
      <tr><td>File Name</td><td><strong>${filename}</strong></td></tr>
      <tr><td>Dimensions</td><td>${data.metadata.width} × ${data.metadata.height} px</td></tr>
      <tr><td>Format</td><td>${data.metadata.format}</td></tr>
      <tr><td>Anomalies</td><td>${warnCount > 0 ? `<span class="badge badge-danger">${data.metadata.warnings.join(", ")}</span>` : `<span class="badge badge-success">Clean</span>`}</td></tr>
    `;

    // Smooth scroll into view
    resultsContainer.scrollIntoView({ behavior: "smooth" });
  }
}

/* --------------------------------------------------------------------------
   3. Batch Scanner
   -------------------------------------------------------------------------- */
function initBatchScanner() {
  const batchInput = document.getElementById("batch-file-input");
  const batchDropzone = document.getElementById("batch-dropzone");
  const batchProgress = document.getElementById("batch-progress-wrapper");
  const batchResults = document.getElementById("batch-results");
  const batchTableBody = document.getElementById("batch-table-body");
  const exportBtn = document.getElementById("export-csv-btn");

  let currentBatchData = [];

  if (!batchInput || !batchDropzone) return;

  batchDropzone.addEventListener("click", () => batchInput.click());

  batchInput.addEventListener("change", e => {
    if (e.target.files && e.target.files.length > 0) {
      runBatchScan(Array.from(e.target.files));
    }
  });

  function runBatchScan(files) {
    batchProgress.style.display = "block";
    batchResults.style.display = "none";

    const formData = new FormData();
    files.forEach(f => formData.append("files", f));

    fetch("/api/batch", {
      method: "POST",
      body: formData
    })
      .then(res => res.json())
      .then(data => {
        batchProgress.style.display = "none";
        batchResults.style.display = "block";
        currentBatchData = data.results;

        // Render Summary Badges
        document.getElementById("batch-total-scanned").textContent = data.summary.total;
        document.getElementById("batch-ai-detected").textContent = data.summary.ai_detected;
        document.getElementById("batch-real-detected").textContent = data.summary.real_detected;
        document.getElementById("batch-time-taken").textContent = data.summary.total_time_ms + " ms";

        // Render Table Rows
        batchTableBody.innerHTML = data.results
          .map(item => `
            <tr>
              <td><strong>${item.filename}</strong></td>
              <td><span class="badge ${item.is_fake ? "badge-danger" : "badge-success"}">${item.verdict}</span></td>
              <td><strong>${item.confidence_pct}%</strong></td>
              <td>${item.evidence}</td>
              <td>${item.status}</td>
            </tr>
          `)
          .join("");
      })
      .catch(err => {
        batchProgress.style.display = "none";
        alert("Batch scan error: " + err.message);
      });
  }

  // Export to CSV directly in browser
  if (exportBtn) {
    exportBtn.addEventListener("click", () => {
      if (!currentBatchData.length) return;
      const headers = ["Filename", "Verdict", "Confidence (%)", "Evidence", "Status"];
      const rows = currentBatchData.map(r => [
        `"${r.filename}"`,
        `"${r.verdict}"`,
        r.confidence_pct,
        `"${r.evidence}"`,
        `"${r.status}"`
      ]);

      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `signalscope_batch_report_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  }
}

/* --------------------------------------------------------------------------
   4. Robustness Lab
   -------------------------------------------------------------------------- */
function initRobustnessLab() {
  const robInput = document.getElementById("rob-file-input");
  const robDropzone = document.getElementById("rob-dropzone");
  const runBtn = document.getElementById("run-robustness-btn");
  const degTypeSelect = document.getElementById("degradation-type-select");
  const severitySlider = document.getElementById("severity-slider");
  const sliderValLabel = document.getElementById("severity-val-label");
  const robResults = document.getElementById("rob-results");

  let selectedRobFile = null;

  if (!robInput || !robDropzone) return;

  robDropzone.addEventListener("click", () => robInput.click());

  robInput.addEventListener("change", e => {
    if (e.target.files && e.target.files[0]) {
      selectedRobFile = e.target.files[0];
      document.getElementById("rob-file-selected-name").textContent = "Selected: " + selectedRobFile.name;
      runBtn.disabled = false;
    }
  });

  if (severitySlider) {
    severitySlider.addEventListener("input", e => {
      sliderValLabel.textContent = e.target.value;
    });
  }

  if (runBtn) {
    runBtn.addEventListener("click", () => {
      if (!selectedRobFile) return;

      runBtn.disabled = true;
      runBtn.textContent = "Running Stress Test...";

      const formData = new FormData();
      formData.append("file", selectedRobFile);
      formData.append("degradation_type", degTypeSelect.value);
      formData.append("severity", severitySlider.value);

      fetch("/api/robustness", {
        method: "POST",
        body: formData
      })
        .then(res => res.json())
        .then(data => {
          runBtn.disabled = false;
          runBtn.textContent = "🧪 Run Stress Test";
          robResults.style.display = "block";

          // Set degraded image
          document.getElementById("rob-degraded-img").src = data.degraded_image;

          // Comparison Stats
          document.getElementById("rob-orig-verdict").textContent = `${data.original.verdict} (${data.original.confidence_pct}%)`;
          document.getElementById("rob-deg-verdict").textContent = `${data.degraded.verdict} (${data.degraded.confidence_pct}%)`;
          document.getElementById("rob-drift-val").textContent = `± ${data.confidence_drift_pct}%`;
          document.getElementById("rob-stability-note").innerHTML = `<span class="badge ${data.verdict_stable ? "badge-success" : "badge-danger"}">${data.stability_note}</span>`;
        })
        .catch(err => {
          runBtn.disabled = false;
          runBtn.textContent = "🧪 Run Stress Test";
          alert("Error in robustness test: " + err.message);
        });
    });
  }
}

/* --------------------------------------------------------------------------
   5. System Status & Specs
   -------------------------------------------------------------------------- */
function initSystemStatus() {
  fetch("/api/status")
    .then(res => res.json())
    .then(data => {
      const statusBadge = document.getElementById("header-status-badge");
      if (statusBadge) {
        statusBadge.innerHTML = data.status === "online" 
          ? `<span class="status-dot"></span> Core Online ⚡`
          : `<span class="status-dot" style="background:#ef4444;"></span> Offline`;
      }

      // Fill in architecture tab if present
      const archDevice = document.getElementById("arch-device");
      if (archDevice) archDevice.textContent = data.device.toUpperCase();

      const archThreshold = document.getElementById("arch-threshold");
      if (archThreshold) archThreshold.textContent = data.optimal_threshold.toFixed(2);

      const archAcc = document.getElementById("arch-acc");
      if (archAcc) archAcc.textContent = data.metrics.accuracy_pct + "%";

      const archAuc = document.getElementById("arch-auc");
      if (archAuc) archAuc.textContent = data.metrics.roc_auc;

      const archF1 = document.getElementById("arch-f1");
      if (archF1) archF1.textContent = data.metrics.macro_f1;
    })
    .catch(err => console.error("Failed to load status:", err));
}
