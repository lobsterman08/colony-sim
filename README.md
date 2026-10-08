# Colony Forge

A browser-based colony simulation foundation designed for a large and expandable world, autonomous people, modular jobs, resource loop, build menu, touch controls, and responsive UI.

## Features in this first foundation

- Large procedural map using a tile-based world model
- Chunk-aware architecture and viewport culling approach
- Canvas-based rendering for performance
- Colonists with needs and simple autonomous behavior
- Jobs for gathering, resting, eating, and farming
- Build menu with categories and placement flow
- Crop growth and food production
- Desktop and touch input support
- Pause and simulation speed controls
- Save and load via browser localStorage
- Portrait and landscape responsive UI

## Run locally

Because this is a static HTML/JS project, you can launch it in any local web server:

```bash
cd /path/to/colony-sim
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000/
```

## Roadmap

This is intentionally built as a strong expandable first pass. The architecture is set up to support future systems such as:

- richer AI job planning
- pathfinding and reservations
- more building types and production chains
- power network, research, weather, combat, and factions
- more world simulation depth and chunk activity states

## Project structure

- `index.html` — game shell and UI
- `styles.css` — responsive desktop/mobile UI styling
- `src/config.js` — data-driven definitions
- `src/world.js` — world generation and chunk-state style logic
- `src/game.js` — simulation, rendering, and input handling

## Notes on optimization

The design prioritizes a smart simulation model:

- simulation and rendering are separated
- only visible tiles are rendered
- world data is tile-based instead of re-rendering every object each frame
- distant map logic avoids full-map recalculation per frame
- the foundation is built to scale toward chunk activation rules and dormant/simulated/active states

This is a strong base for the next major expansion stages described in your prompt.
