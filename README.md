# Geospatial Proximity Audio Ecosystem
## 🎧 Module: Proximate and Live Audio (Aman's Task)

This module handles **Geospatial Distance Calculation, Proximity Attenuation, and Live Spatial Audio Playback** for the Proximity Audio Ecosystem.

---

### 🌟 Key Responsibilities & Capabilities
1. **Geospatial Proximity Calculation (`proximityEngine.js`)**:
   - Computes real-world distances using both **Euclidean** and **Haversine (Lat/Lon)** formulas.
   - Evaluates proximity zones:
     - **Inner Core Radius ($d_{ref}$)**: 100% volume / maximum gain.
     - **Rolloff Attenuation Zone**: Smooth volume decay as the listener moves further away.
     - **Outer Cutoff Radius ($d_{max}$)**: Complete audio cutoff (0% gain) to optimize bandwidth.
   - Computes dynamic **Stereo Panning** (-1.0 Left to +1.0 Right) based on listener bearing to the sound source.
   - Supports 3 decay curves: **Inverse Distance**, **Linear Falloff**, and **Exponential Decay**.

2. **Web Audio API Spatial Sound Engine (`audioEngine.js`)**:
   - Manages audio routing: `Source -> ProximityGain -> StereoPanner -> MasterGain -> Analyser -> Output`.
   - **Dual Audio Sources**:
     - **Spatial Synth Beacon**: Harmonic multi-frequency carrier tone for zero-dependency testing.
     - **Live Microphone Stream**: Real-time microphone capture via `navigator.mediaDevices.getUserMedia` for proximity voice chat.
   - Real-time **FFT Frequency Spectrum Analyser** for live visualizer feedback.

3. **Interactive 2D Geospatial Radar Viewport (`app.js` & `index.html`)**:
   - Interactive radar canvas showing user listener pin (Aman) and multiple audio transmitters.
   - Drag-and-drop or click-to-move listener in real-time.
   - Live Telemetry HUD: Real-time Distance (m), Effective Gain (%), Pan angle, and Status Badge.

---

### 📁 Architecture & File Structure
```text
├── index.html           # Radar Canvas HUD & Audio Controls UI
├── style.css            # Futuristic Dark Radar Theme & HUD styling
├── proximityEngine.js   # Mathematical Distance & Attenuation algorithms
├── audioEngine.js       # Web Audio API, Spatial Panner & Live Mic streamer
└── app.js               # Canvas rendering loop, drag interactions & HUD bindings
```

---

### 🚀 How to Run & Test
1. Simply double-click `index.html` or open in VS Code with **Live Server**.
2. Click **"Start Live Audio"** button.
3. Wear headphones for 3D positional audio.
4. Move the blue **Aman (Listener)** avatar around the radar:
   - **Mouse / Touch**: Click anywhere on the radar or drag the blue avatar.
   - **Keyboard Navigation**: Use `W` / `A` / `S` / `D` or `Arrow Keys` (hold `Shift` for boost speed).
   - **Shortcuts**: Press `Space` to Play/Pause, `M` to Mute/Unmute.
   - **Presentation Presets**: Click any preset button (`Core 100%`, `Mid Decay`, `Cutoff Zone`, `Left/Right Pan`) to smoothly glide to key demo locations during presentations.
   - Notice how sound gets louder as you get closer to the beacon.
   - Notice how sound pans to your left or right ear depending on your position.
   - Test the **"Live Microphone"** mode for real-time proximity voice simulation!

---

### 🤝 Team Integration Guide (For other 3 members):
- **For Member working on GPS / Mobile Mapping (Leaflet / Mapbox)**:
  - Feed GPS coordinates into `proximity.getHaversineDistance(userLat, userLon, beaconLat, beaconLon)`.
- **For Member working on WebSockets / Backend Stream**:
  - Replace `audio.startSynth()` with the incoming WebRTC / WebSocket audio track connected to `audio.proximityGainNode`.
- **For Member working on User Management & Rooms**:
  - Dynamically instantiate audio nodes from room participant lists into `audioNodes` array.
