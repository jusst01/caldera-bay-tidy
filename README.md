[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/jusst01/caldera-bay-tidy/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/jusst01/caldera-bay-tidy/reward.svg)](https://make.fun/bounty/gta6-01/reward.svg?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

# Caldera Bay

Caldera Bay is an immersive, open-world crime action game set in a vibrant coastal metropolis built directly inside and around a massive dormant volcano. Experience high-octane vehicular driving, intense tactical shootouts, dynamic pedestrian AI, and a fully realized criminal underworld.

## Story
Set in the sun-drenched, perilous island territory of Caldera Bay, you step into the shoes of an ambitious newcomer striving to conquer the city's syndicates. From the coastal boardwalks to the jagged caldera slopes, every district offers new opportunities for illicit ventures, high-speed getaways, and dangerous faction turf wars. Build your fortune, evade police lockdowns, and claim ultimate dominance over the bay.

## Features
- **Open-World Exploration:** Seamlessly traverse a richly detailed coastal city featuring flat terrain, winding roads, and a looming central volcano.
- **Dynamic Traffic & Pedestrians:** Encounter a living, breathing population with simulated pedestrian movement and vehicular traffic navigating the urban grid.
- **Police Pursuit & Heat System:** Provoke law enforcement to trigger intense multi-tiered chases, roadblocks, and tactical responses.
- **Mission & Faction System:** Undertake diverse contract missions across the city to earn cash, reputation, and unlock new assets.
- **Economy & Safehouses:** Manage your finances, purchase weapons, and save your progress across safehouse locations.
- **In-Game Radio & Audio:** Tune into immersive radio stations while cruising through the city streets.

## Controls
- **Movement / Driving:** WASD or Arrow Keys
- **Interaction / Enter Vehicle:** E key
- **Camera Control:** Mouse look / Orbit
- **Actions / Combat:** Mouse click / Contextual hotkeys

## Architecture & Modular Design
Caldera Bay is built with a clean, modular JavaScript architecture utilizing Three.js for 3D rendering:
- `main.js`: Core game loop, rendering pipeline, and state initialization.
- `city.js`: Procedural and spatial layout of terrain, buildings, and roadways around the caldera.
- `vehicles.js` & `traffic.js`: Vehicle physics, handling models, and traffic simulation.
- `pedestrians.js`: Character animation, pathfinding, and crowd simulation.
- `police.js`: Law enforcement AI, alert levels, and pursuit logic.
- `combat.js`: Weapon mechanics, damage handling, and target acquisition.
- `missions.js` & `economy.js`: Quest progression, reward structures, and monetary systems.
- `radio.js`, `hud.js`, `screens.js`, & `save.js`: Audio playback, user interface overlays, menu screens, and local persistence.

## How to Run
1. Serve the `game/` directory using any static file server (e.g., `npx serve game` or Python's HTTP server).
2. Open `index.html` in a modern WebGL-compatible browser.

## License & Support
Caldera Bay is released under the MIT License. For support, please open an issue in the project repository.
