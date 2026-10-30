/**
 * App.js
 * Main Controller for Geospatial Proximity Audio Ecosystem
 * Module: Proximate & Live Audio (Aman's Task)
 */

document.addEventListener("DOMContentLoaded", () => {
  if (window.lucide) {
    lucide.createIcons();
  }

  const proximity = new ProximityEngine({ model: "inverse", rolloffFactor: 1.0 });
  const audio = new AudioEngine();

  // Radar Canvas Setup
  const canvas = document.getElementById("radarCanvas");
  const ctx = canvas.getContext("2d");

  // Visualizer Canvas Setup
  const visCanvas = document.getElementById("visualizerCanvas");
  const visCtx = visCanvas.getContext("2d");
  const fftData = new Uint8Array(64);

  // Audio Nodes (Beacons / Transmitters in Geospatial 2D Space in meters)
  const audioNodes = [
    {
      id: 0,
      name: "Main Stage Beacon",
      x: 400,
      y: 200,
      refDistance: 40,   // Inner 100% gain radius (pixels/meters)
      maxDistance: 240,  // Outer cutoff radius
      frequency: 220,    // A3 Note
      color: "#06b6d4",
      pulsePhase: 0
    },
    {
      id: 1,
      name: "Voice Channel Alpha",
      x: 180,
      y: 360,
      refDistance: 35,
      maxDistance: 190,
      frequency: 330,    // E4 Note
      color: "#10b981",
      pulsePhase: Math.PI / 3
    },
    {
      id: 2,
      name: "Ambient Zone",
      x: 620,
      y: 380,
      refDistance: 45,
      maxDistance: 220,
      frequency: 440,    // A4 Note
      color: "#a855f7",
      pulsePhase: Math.PI * 0.7
    }
  ];

  // Listener State (Aman Dubey)
  const listener = {
    x: 400,
    y: 380,
    radius: 14,
    isDragging: false,
    label: "Aman (Listener)"
  };

  let targetNodeIndex = 0;
  let showGrid = true;
  let isMuted = false;
  let lastDistance = 0;
  let lastGain = 0;

  // -------------------------------------------------------------------------
  // 1. UI Elements
  // -------------------------------------------------------------------------
  const btnToggleAudio = document.getElementById("btnToggleAudio");
  const playBtnText = document.getElementById("playBtnText");
  const playIcon = document.getElementById("playIcon");
  const btnMute = document.getElementById("btnMute");
  const btnSourceSynth = document.getElementById("btnSourceSynth");
  const btnSourceMic = document.getElementById("btnSourceMic");
  const masterVolSlider = document.getElementById("masterVolSlider");
  const masterVolValue = document.getElementById("masterVolValue");
  const attenuationModelSelect = document.getElementById("attenuationModelSelect");
  const rolloffSlider = document.getElementById("rolloffSlider");
  const rolloffValue = document.getElementById("rolloffValue");
  const targetNodeSelect = document.getElementById("targetNodeSelect");
  const resetPositionBtn = document.getElementById("resetPositionBtn");
  const toggleGridBtn = document.getElementById("toggleGridBtn");

  // Telemetry HUD Elements
  const teleDistance = document.getElementById("teleDistance");
  const teleGain = document.getElementById("teleGain");
  const telePan = document.getElementById("telePan");
  const teleState = document.getElementById("teleState");
  const engineStatusText = document.getElementById("engineStatusText");

  // -------------------------------------------------------------------------
  // 2. Audio Playback Control
  // -------------------------------------------------------------------------
  btnToggleAudio.addEventListener("click", async () => {
    if (!audio.isPlaying) {
      if (audio.activeSourceType === "mic") {
        const res = await audio.startMicrophoneStream();
        if (!res.success) {
          alert("Microphone Access Error: " + res.error);
          return;
        }
      } else {
        const targetNode = audioNodes[targetNodeIndex];
        await audio.startSynth(targetNode.frequency);
      }
      playBtnText.textContent = "Stop Live Audio";
      btnToggleAudio.classList.add("active");
      engineStatusText.textContent = "Audio Stream Active";
      if (window.lucide) {
        btnToggleAudio.querySelector("i").setAttribute("data-lucide", "square");
        lucide.createIcons();
      }
    } else {
      audio.stopAll();
      playBtnText.textContent = "Start Live Audio";
      btnToggleAudio.classList.remove("active");
      engineStatusText.textContent = "Audio Engine Ready";
      if (window.lucide) {
        btnToggleAudio.querySelector("i").setAttribute("data-lucide", "play");
        lucide.createIcons();
      }
    }
  });

  // Source Type Buttons (Synth vs Mic)
  btnSourceSynth.addEventListener("click", () => {
    btnSourceSynth.classList.add("active");
    btnSourceMic.classList.remove("active");
    audio.activeSourceType = "synth";
    if (audio.isPlaying) {
      const targetNode = audioNodes[targetNodeIndex];
      audio.startSynth(targetNode.frequency);
    }
  });

  btnSourceMic.addEventListener("click", async () => {
    btnSourceMic.classList.add("active");
    btnSourceSynth.classList.remove("active");
    audio.activeSourceType = "mic";
    if (audio.isPlaying) {
      await audio.startMicrophoneStream();
    }
  });

  // Mute Button
  btnMute.addEventListener("click", () => {
    isMuted = !isMuted;
    audio.setMasterVolume(isMuted ? 0 : masterVolSlider.value / 100);
    btnMute.style.color = isMuted ? "#ef4444" : "#94a3b8";
  });

  // Master Volume Slider
  masterVolSlider.addEventListener("input", (e) => {
    const val = parseInt(e.target.value, 10);
    masterVolValue.textContent = val + "%";
    if (!isMuted) audio.setMasterVolume(val / 100);
  });

  // Attenuation Model Select
  attenuationModelSelect.addEventListener("change", (e) => {
    proximity.model = e.target.value;
  });

  // Rolloff Slider
  rolloffSlider.addEventListener("input", (e) => {
    const val = parseFloat(e.target.value);
    rolloffValue.textContent = val.toFixed(1) + "x";
    proximity.rolloffFactor = val;
  });

  // Target Audio Node Selection
  targetNodeSelect.addEventListener("change", (e) => {
    targetNodeIndex = parseInt(e.target.value, 10);
    if (audio.isPlaying && audio.activeSourceType === "synth") {
      audio.startSynth(audioNodes[targetNodeIndex].frequency);
    }
  });

  // Reset Listener Position
  resetPositionBtn.addEventListener("click", () => {
    listener.x = canvas.width / 2;
    listener.y = canvas.height * 0.75;
  });

  // Toggle Grid
  toggleGridBtn.addEventListener("click", () => {
    showGrid = !showGrid;
  });

  // -------------------------------------------------------------------------
  // 3. Canvas Mouse & Touch Drag Interaction
  // -------------------------------------------------------------------------
  function getCanvasCoords(evt) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (evt.clientX - rect.left) * scaleX,
      y: (evt.clientY - rect.top) * scaleY
    };
  }

  canvas.addEventListener("mousedown", (e) => {
    const pos = getCanvasCoords(e);
    const dist = Math.hypot(pos.x - listener.x, pos.y - listener.y);
    if (dist <= listener.radius + 15) {
      listener.isDragging = true;
    } else {
      // Click-to-move listener
      listener.x = Math.max(20, Math.min(canvas.width - 20, pos.x));
      listener.y = Math.max(20, Math.min(canvas.height - 20, pos.y));
    }
  });

  window.addEventListener("mousemove", (e) => {
    if (!listener.isDragging) return;
    const pos = getCanvasCoords(e);
    listener.x = Math.max(20, Math.min(canvas.width - 20, pos.x));
    listener.y = Math.max(20, Math.min(canvas.height - 20, pos.y));
  });

  window.addEventListener("mouseup", () => {
    listener.isDragging = false;
  });

  // Touch Support
  canvas.addEventListener("touchstart", (e) => {
    if (e.touches.length === 1) {
      const pos = getCanvasCoords(e.touches[0]);
      listener.x = Math.max(20, Math.min(canvas.width - 20, pos.x));
      listener.y = Math.max(20, Math.min(canvas.height - 20, pos.y));
      listener.isDragging = true;
    }
  });

  canvas.addEventListener("touchmove", (e) => {
    if (listener.isDragging && e.touches.length === 1) {
      const pos = getCanvasCoords(e.touches[0]);
      listener.x = Math.max(20, Math.min(canvas.width - 20, pos.x));
      listener.y = Math.max(20, Math.min(canvas.height - 20, pos.y));
    }
  });

  canvas.addEventListener("touchend", () => {
    listener.isDragging = false;
  });

  // Keyboard navigation & accessibility controls (WASD / Arrows / Mute / Space)
  window.addEventListener("keydown", (e) => {
    if (["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement?.tagName)) return;

    const step = e.shiftKey ? 24 : 10;
    let handled = false;

    switch (e.key) {
      case "ArrowUp":
      case "w":
      case "W":
        listener.y = Math.max(20, listener.y - step);
        handled = true;
        break;
      case "ArrowDown":
      case "s":
      case "S":
        listener.y = Math.min(canvas.height - 20, listener.y + step);
        handled = true;
        break;
      case "ArrowLeft":
      case "a":
      case "A":
        listener.x = Math.max(20, listener.x - step);
        handled = true;
        break;
      case "ArrowRight":
      case "d":
      case "D":
        listener.x = Math.min(canvas.width - 20, listener.x + step);
        handled = true;
        break;
      case "m":
      case "M":
        btnMute.click();
        handled = true;
        break;
      case " ":
        btnToggleAudio.click();
        handled = true;
        break;
    }

    if (handled) {
      e.preventDefault();
    }
  });


  // -------------------------------------------------------------------------
  // 4. Main Animation & Proximity Loop
  // -------------------------------------------------------------------------
  function renderLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Draw Background Grid
    if (showGrid) {
      drawCoordinateGrid();
    }

    // 2. Process Proximity with Target Node
    const targetNode = audioNodes[targetNodeIndex];
    const distanceMeters = proximity.getEuclideanDistance(listener, targetNode);
    const gain = proximity.calculateProximityGain(distanceMeters, targetNode.refDistance, targetNode.maxDistance);
    const pan = proximity.getPanningFactor(listener, targetNode);

    lastDistance = distanceMeters;
    lastGain = gain;

    // Send updated spatial audio values to Web Audio API
    audio.updateSpatialParameters(gain, pan);

    // Update HUD Numbers
    updateTelemetryHUD(distanceMeters, gain, pan, targetNode);

    // 3. Draw Audio Nodes & Proximity Zones
    audioNodes.forEach((node, idx) => {
      drawAudioNode(node, idx === targetNodeIndex);
    });

    // 4. Draw Connection Bearing Line to Target Source
    drawBearingLine(listener, targetNode, gain);

    // 5. Draw Listener (Aman)
    drawListener();

    // 6. Draw Visualizer Spectrum
    drawLiveVisualizer();

    requestAnimationFrame(renderLoop);
  }

  // Draw Geospatial Coordinate Grid
  function drawCoordinateGrid() {
    ctx.strokeStyle = "rgba(31, 41, 61, 0.4)";
    ctx.lineWidth = 1;

    for (let x = 0; x < canvas.width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
  }

  // Draw Audio Node (Beacon)
  function drawAudioNode(node, isTarget) {
    node.pulsePhase += 0.03;

    // Outer Cutoff Radius Circle (Dashed)
    ctx.beginPath();
    ctx.arc(node.x, node.y, node.maxDistance, 0, Math.PI * 2);
    ctx.strokeStyle = isTarget ? "rgba(6, 182, 212, 0.25)" : "rgba(255, 255, 255, 0.08)";
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.setLineDash([]);

    // Inner 100% Gain Core Radius Circle
    ctx.beginPath();
    ctx.arc(node.x, node.y, node.refDistance, 0, Math.PI * 2);
    ctx.fillStyle = isTarget ? "rgba(6, 182, 212, 0.08)" : "rgba(255, 255, 255, 0.02)";
    ctx.fill();
    ctx.strokeStyle = isTarget ? node.color : "rgba(255, 255, 255, 0.2)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Pulsing Wave Ring
    if (audio.isPlaying && isTarget) {
      const pulseRadius = node.refDistance + ((Math.sin(node.pulsePhase) + 1) / 2) * (node.maxDistance - node.refDistance);
      ctx.beginPath();
      ctx.arc(node.x, node.y, pulseRadius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(6, 182, 212, ${Math.max(0, 0.4 - (pulseRadius / node.maxDistance) * 0.4)})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Node Beacon Core
    ctx.beginPath();
    ctx.arc(node.x, node.y, 10, 0, Math.PI * 2);
    ctx.fillStyle = node.color;
    ctx.shadowColor = node.color;
    ctx.shadowBlur = isTarget ? 15 : 6;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Node Label
    ctx.fillStyle = "#f1f5f9";
    ctx.font = "600 12px 'Plus Jakarta Sans'";
    ctx.textAlign = "center";
    ctx.fillText(node.name, node.x, node.y - 18);
    ctx.font = "10px 'JetBrains Mono'";
    ctx.fillStyle = "#94a3b8";
    ctx.fillText(`${node.frequency} Hz`, node.x, node.y + 24);
  }

  // Draw Bearing Line from Listener to Source
  function drawBearingLine(listener, source, gain) {
    ctx.beginPath();
    ctx.moveTo(listener.x, listener.y);
    ctx.lineTo(source.x, source.y);
    ctx.strokeStyle = `rgba(6, 182, 212, ${Math.max(0.15, gain * 0.8)})`;
    ctx.lineWidth = 1 + gain * 2.5;
    ctx.setLineDash([3, 3]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Draw Listener Avatar (Aman)
  function drawListener() {
    // Outer glow ring
    ctx.beginPath();
    ctx.arc(listener.x, listener.y, listener.radius + 6, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(56, 189, 248, 0.4)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Inner listener body
    ctx.beginPath();
    ctx.arc(listener.x, listener.y, listener.radius, 0, Math.PI * 2);
    ctx.fillStyle = "#2563eb";
    ctx.shadowColor = "#38bdf8";
    ctx.shadowBlur = 12;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Center icon dot
    ctx.beginPath();
    ctx.arc(listener.x, listener.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();

    // Listener Label
    ctx.fillStyle = "#38bdf8";
    ctx.font = "700 11px 'Plus Jakarta Sans'";
    ctx.textAlign = "center";
    ctx.fillText(listener.label, listener.x, listener.y + 28);
  }

  // Update HUD Numbers
  function updateTelemetryHUD(dist, gain, pan, targetNode) {
    teleDistance.textContent = `${dist.toFixed(1)} m`;
    teleGain.textContent = `${Math.round(gain * 100)}%`;

    let panText = "Center";
    if (pan < -0.15) panText = `${Math.round(Math.abs(pan) * 100)}% L`;
    else if (pan > 0.15) panText = `${Math.round(pan * 100)}% R`;
    telePan.textContent = panText;

    if (dist <= targetNode.refDistance) {
      teleState.textContent = "CORE RANGE (100%)";
      teleState.className = "tele-badge badge-success";
    } else if (dist < targetNode.maxDistance) {
      teleState.textContent = "ATTENUATING";
      teleState.className = "tele-badge badge-warning";
    } else {
      teleState.textContent = "OUT OF RANGE (0%)";
      teleState.className = "tele-badge badge-muted";
    }
  }

  // Draw Live Audio Frequency Spectrum (Visualizer)
  function drawLiveVisualizer() {
    visCtx.clearRect(0, 0, visCanvas.width, visCanvas.height);

    if (audio.isPlaying) {
      audio.getVisualizerData(fftData);
    } else {
      fftData.fill(0);
    }

    const barWidth = (visCanvas.width / fftData.length) * 1.5;
    let x = 0;

    for (let i = 0; i < fftData.length; i++) {
      const val = fftData[i];
      const barHeight = (val / 255) * visCanvas.height;

      const grad = visCtx.createLinearGradient(0, visCanvas.height, 0, 0);
      grad.addColorStop(0, "#06b6d4");
      grad.addColorStop(1, "#a855f7");

      visCtx.fillStyle = grad;
      visCtx.fillRect(x, visCanvas.height - barHeight, barWidth - 1, barHeight);

      x += barWidth;
    }
  }

  // Kickoff Render Loop
  requestAnimationFrame(renderLoop);
});
