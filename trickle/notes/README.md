# STACK KNIGHT - MVP

## Overview
Stack Knight is a hybrid puzzle-platformer where players must climb an infinite tower by catching and stacking falling blocks. It combines the mechanics of Tetris (falling blocks) with Mario (platforming).

## Core Mechanics
- **Player**: Controls a knight who can run and jump.
- **Blocks**: Random blocks fall from the sky.
- **Goal**: Stack blocks to climb higher without being crushed or falling off the bottom.
- **Scoring**: Points for height + bonus for perfect stacking alignment.

## Tech Stack
- **Engine**: Pure Vanilla JavaScript + HTML5 Canvas (`game/engine.js`)
- **UI**: React 18 (for menus and HUD overlays)
- **Audio**: Web Audio API (Synthesized SFX, no external assets needed)
- **Styling**: Tailwind CSS + Custom 8-bit CSS

## File Structure
- `index.html`: Entry point & Asset loading
- `app.js`: Main React App Container
- `components/StackKnightGame.js`: React Game Wrapper & UI
- `game/engine.js`: Main Game Loop & Logic
- `game/entities.js`: Player & Block Classes
- `game/audio.js`: Sound System
- `game/utils.js`: Math helpers

## Controls
- **Arrow Left/Right**: Move
- **Space**: Jump

## Version
1.1.3 - MVP Phase 1 (Mechanics Fix)
- Added crush detection logic: Falling blocks now kill the player on contact
- Fixed Golden Box logic: Perfect stacks now visually snap to alignment
- Improved scoring for combos