# Game Layer

Reads Pokemon Red/Blue game state from RAM through mGBA-http. No memory writes.

## Modules

| File | Purpose |
|------|---------|
| `memoryMap.ts` | WRAM address constants for Red/Blue (wCurMap, wIsInBattle, wPartyCount, etc.) |
| `GameWorld.ts` | Reads world state and delegates mode classification to `mode-classification.ts` |
| `mode-classification.ts` | Shared game mode classifier (overworld/battle/dialog/naming/title) |
| `PokemonStateReader.ts` | Reads full game state: party, bag, battle, player, flags |
| `MapMemory.ts` | Persistent per-map tile grid built from screen tilemap reads |
| `MapMemoryStore.ts` | JSON persistence for MapMemory across sessions |
| `MapGraph.ts` | Inter-map connectivity graph (warps + connections) for LLM context |
| `TilesetData.ts` | Tile classification: walkable, wall, grass, water, door, ledge, etc. |
| `TextCodec.ts` | Decodes Gen 1 character encoding from tilemap bytes to UTF-8 |
| `PokemonCatalog.ts` | Species names, move names, map names from ID |
| `SpriteReader.ts` | Reads sprite positions (player + NPCs) from OAM/RAM |
| `WarpReader.ts` | Reads warp entries and map connections (N/S/E/W) from RAM |
| `FullGameDetector.ts` | Progress checkpoint tracking (starter, badges, Hall of Fame) |

## MapMemory

The core exploration data structure. Each `update()` call reads the 20x18 screen tilemap, classifies 2x2 tile blocks, and stores them in a per-map record keyed by `"y,x"`.

`walkabilityGrid()` returns a boolean grid for pathfinding:
- Known walkable/grass tiles → `true`
- Known wall tiles → `false`, except door/warp features → `true` (stairs and doors are passable)
- Known water tiles → `false` (unless `canSurf` capability is set)
- Unknown (unexplored) tiles → `true` (allows pathfinding through unseen areas; walls are learned on collision)
- NPC-occupied tiles → `false`

`update()` skips 2x2 screen blocks where any tile is offscreen (`0x10`). This prevents partial offscreen blocks from overwriting previously known walkable tiles with incorrect wall classifications during camera scrolling.

## Mode Classification

`classifyGameMode()` in `mode-classification.ts` checks RAM flags in order:
1. All-zero state → `title`
2. `wIsInBattle != 0` → `battle`
3. Naming screen markers in tilemap → `naming`
4. `rWY < 144` (window visible) → `dialog`
5. Otherwise → `overworld`

## Key RAM Addresses

| Symbol | Address | Purpose |
|--------|---------|---------|
| `wCurMap` | 0xD35E | Current map ID |
| `wYCoord` / `wXCoord` | 0xD361 / 0xD362 | Player position |
| `wIsInBattle` | 0xD057 | 0=none, 1=wild, 2=trainer |
| `rWY` | 0xFF4A | Window Y register (< 144 = dialog visible) |
| `wTileMap` | 0xC3A0 | 20x18 screen tilemap (360 bytes) |
| `wPartyCount` | 0xD163 | Number of Pokemon in party |
| `wObtainedBadges` | 0xD356 | Badge bitfield |
