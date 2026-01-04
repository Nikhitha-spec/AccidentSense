# AccidentSense

AccidentSense is a route-accurate safety layer for OpenStreetMap (via Leaflet). It provides intelligent navigation by overlaying accident-prone zones, real-time weather conditions, traffic analysis, and safety risk alerts to ensure a secure journey.

## 🚀 Features

- **Precise OSM Routing**: Uses OSRM for accurate driving directions.
- **Dynamic Map Selection**: Click anywhere on the map to set your Source and Destination.
- **Accident Awareness**: Visualizes high-risk zones (polygons) and highlights dangerous route segments.
- **Safety Risk Analysis**: Calculates a "Route Risk Factor" based on your exposure to accident-prone areas.
- **Real-Time Weather**: Integrated weather forecasting for your destination (Temp, Wind, Conditions).
- **Traffic Intelligence**: Visualizes traffic density (Orange/Red segments) and Provides overall traffic status.
- **Live Navigation Mode**: Track your real movemement, monitor speed violations, and get proximity alerts for danger zones.

## 🛠 Tech Stack

- **Frontend**: React + Vite
- **Mapping**: Leaflet + React-Leaflet
- **Icons**: Lucide-React
- **APIs**:
  - Routing: OSRM
  - Geocoding: Nominatim
  - Weather: Open-Meteo
- **Styling**: Glassmorphism CSS Design

## 🚦 Getting Started

1. **Clone the repository**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/accidentsense.git
   cd accidentsense
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up Environment**:
   Create a `.env` file for your API keys (if using Google Maps plugins, though currently optimized for OSM):
   ```
   VITE_GOOGLE_MAPS_API_KEY=your_key_here
   ```

4. **Run the app**:
   ```bash
   npm run dev
   ```

## 📖 Usage

1. **Pick Source/Dest**: Use the buttons in the sidebar or click directly on the map.
2. **Route**: Click the **Route** button to generate the path and analyze safety.
3. **Analyze**: View the Weather, Traffic, and Safety Risk cards that appear in the panel.
4. **Live Navigation**: Click **Start Live Navigation** to begin real-time position tracking and alert monitoring.

---
Developed as a safety-first navigation prototype.
