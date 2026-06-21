# Royal Chess 3D (Next.js & MySQL)

A premium, highly interactive 3D Chess game built with Next.js, React Three Fiber (Three.js), Zustand, and MySQL. Play against a local friend, challenge an AI on various difficulty levels, or host online rooms with invite codes.

---

## Key Features

### 1. Game Modes
*   **Player vs AI**: Play against an advanced chess engine running in a separate background Web Worker thread for lag-free performance. Offers multiple difficulty levels from *Beginner* to *Master*.
*   **Local PvP**: Play with a friend on the same screen. The board can automatically flip angles on turns, or stay static (aligned to White's view) when Third-Person Follow-Cam is disabled.
*   **Online Multiplayer**: Host or join matches using unique 6-character room codes. Game states, active clocks, and move histories are synchronized securely via MySQL.

### 2. 3D Graphics & Animations
*   **Rich Specular Reflections**: Advanced materials with custom clearcoats, roughness, and metalness, displaying deep reflections under wide-angled spot and point lights.
*   **Context-Aware Follow Cam**: A third-person camera that slides smoothly behind the selected piece. Clicking a selected piece twice deselects it and zooms the camera out to a centered default.
*   **Capture Animations**: Captured pieces perform a hardware-accelerated retreat slide, scale down, and fade out transparently before unmounting.

### 3. Custom Settings & Rules
*   **Stalemate Rule Toggle**: Enable standard FIDE stalemate rules (Draw) or toggle it OFF to award a **Victory** to the player who cornered the opponent's king.
*   **Background Themes**: Customize your play environment directly in the settings modal:
    *   *Classic Light*: Default glassmorphic gray-blue backdrop.
    *   *Off-White*: A premium gradient off-white style.
    *   *Cloudy Sky*: A gorgeous fluffy cloud background.
*   **Sound Control**: Adjustable sound effect volumes.
*   **Camera Lock**: Switch on/off automatic board rotation.

---

## Technologies Used

*   **Framework**: [Next.js](https://nextjs.org/) (App Router, Server Actions, & Route Handlers)
*   **3D Rendering**: [Three.js](https://threejs.org/) via [@react-three/fiber](https://github.com/pmndrs/react-three-fiber) & [@react-three/drei](https://github.com/pmndrs/drei)
*   **State Management**: [Zustand](https://github.com/pmndrs/zustand)
*   **Database**: MySQL ([mysql2/promise](https://github.com/sidorares/node-mysql2) client pooling)
*   **Styles**: Tailwind CSS v4 & custom glassmorphism styles

---

## Getting Started

### 1. Prerequisites
Ensure you have the following installed on your machine:
*   [Node.js](https://nodejs.org/) (v18.x or newer)
*   [MySQL Server](https://www.mysql.com/) running locally or remotely

### 2. Environment Setup
Create a `.env.local` file in the root of the project and define your database credentials:

```env
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_mysql_password
MYSQL_DATABASE=chess_3d
```

*(Note: The application will automatically create the `chess_3d` database and initialize the `games` table schemas on the first database request at startup).*

### 3. Installation
Install the project dependencies:
```bash
npm install
```

### 4. Development Server
Run the development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Production Build
To build and check types for production:
```bash
npm run build
npm run start
```
