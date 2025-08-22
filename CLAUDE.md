# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- `npm run dev` - Start Vite development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Architecture Overview

This is a React-based space ship simulation game built with TypeScript, Redux Toolkit, and Vite. The game is designed for two players (Gobi and Ben) who play on separate computers in the same room, managing different ship systems collaboratively.

### Core Technology Stack
- **React 18** with TypeScript for UI components
- **Redux Toolkit** for centralized state management
- **Vite** as build tool and dev server
- **Tailwind CSS** for styling
- **Lucide React** for icons

### State Management Architecture

The application uses Redux stores organized by domain:

1. **Ship Store** (`src/store/shipStore.ts`): Core ship systems state
   - Distance to destination, hull damage, oxygen levels
   - Navigation alignment, fuel levels, battery power
   - Game clock (GameMinutes and GameSeconds)
   - Active alerts list

2. **Game Store** (`src/store/gameStore.ts`): Application flow state
   - Current player selection
   - Current page/route

3. **Station Stores** (`src/store/stations/`): Individual station states
   - `engineeringStore.ts`: Wire panel connections and configurations
   - `weaponsStore.ts`: Active threats (asteroids), weapon cooldowns
   - `navigationStore.ts`: Navigation-specific state

### Key Systems

1. **DungeonMaster** (`src/systems/DungeonMaster.ts`)
   - Manages the game loop (1 real second = 1 GameSecond)
   - Triggers timed alerts and events
   - Applies alert effects every 10 GameMinutes
   - Handles asteroid spawning and impact checking

2. **AlertSystem** (`src/systems/AlertSystem.ts`)
   - Creates and manages ship alerts with severity levels (Warning/Danger/Critical)
   - Applies system effects over time
   - Checks for alert resolution conditions

### Component Structure

- **Pages**: `HomePage.tsx` (player selection), `PlayPage.tsx` (main game)
- **Main Components**:
  - `StatusMonitor.tsx`: Displays ship status and alerts
  - `ShipManual.tsx`: Interactive notebook with game instructions
  - `Stations.tsx`: Tab container for different ship stations
- **Station Components** (`src/stations/`):
  - `Engineering.tsx`: Wire panel puzzle system
  - `Weapons.tsx`: Asteroid defense system with canvas rendering
  - `Navigation.tsx`: Navigation controls

### Game Design

The game follows specifications in `Design.md` which outlines:
- Two-player cooperative gameplay mechanics
- Ship system interactions and dependencies
- Alert system and challenge progression
- Visual design requirements (dark space theme with metallic UI)

### Type System

All TypeScript types are centralized in `src/types/index.ts`:
- `ShipState`, `Alert`, `SystemEffect` for ship systems
- `Player`, `StationType` for game configuration
- `Gauge` type for systems with current/max values