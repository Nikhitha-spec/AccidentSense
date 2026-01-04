# AccidentSense MVP

AccidentSense is a route-accurate safety layer for Google Maps. It uses the Google Maps Directions API to provide navigation while overlaying accident-prone zones and providing real-time safety alerts.

## Features
- **Precise Routing**: Uses Google Maps native routing behavior.
- **Accident Awareness**: Visualizes high-risk zones (polygons) and highlights route segments that pass through them (red lines).
- **Safety Alerts**: Pop-ups monitoring speed violation and zone entry.
- **Simulation Mode**: "Simulate Drive" button to test the alert system along the generated route.

## Setup & Run

1. Navigate to the project directory:
   ```bash
   cd accidentsense
   ```

2. Install dependencies (if not already done):
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open the link provided (usually `http://localhost:5173`).

## Usage
1. Click "Allow" for location access (optional, defaults to SF).
2. Enter a Source (e.g., "San Francisco City Hall") and Destination.
3. Click **Route**.
4. Observe the route. If it crosses an accident zone (Red areas), the segment will turn Red.
5. Click **▶ Simulate Drive** to watch the user marker move and trigger alerts when entering zones or speeding.

## Tech Stack
- React + Vite
- @react-google-maps/api
- Vanilla CSS with Glassmorphism design
