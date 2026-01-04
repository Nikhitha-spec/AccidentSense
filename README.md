# 🛡️ AccidentSense: Intelligent Safety Navigation

**Live Demo:** [https://accident-sense.vercel.app/](https://accident-sense.vercel.app/)

**AccidentSense** is a cutting-edge navigation layer for OpenStreetMap (OSM) designed with a "Safety First" philosophy. It doesn't just show you the way; it analyzes every meter of your journey for potential risks using real-time spatial and meteorological data.

---

## 🌟 Features

- **📍 Dynamic Map Interaction**: Click-to-pin functionality allows users to select Source and Destination points directly on the map.
- **🧠 Predictive Safety Analysis**: Automatically calculates a **Route Risk Factor (%)**, identifying exactly how much of your trip passes through high-risk accident zones.
- **🚩 Accident Zone Visualization**: Clearly marked "Danger Polygons" and highlighted red route segments provide immediate visual awareness of hazardous areas.
- **☁️ Real-Time Weather Sync**: Fetches live temperature, wind speed, and weather condition data for your destination via the Open-Meteo API.
- **🚗 Traffic Density Mapping**: Analyzes route duration heuristics to visualize "Traffic Bottlenecks" with orange and red cluster overlays.
- **📱 Live Navigation Mode**: Uses real device geolocation to provide:
    - Real-time GPS tracking with a dynamic car emoji marker.
    - Proximity alerts when entering accident-prone zones.
    - Speeding violations based on predefined safety thresholds.

---

## 💻 Tech Stack

- **Core**: [React.js](https://reactjs.org/) + [Vite](https://vitejs.dev/)
- **Map Engine**: [Leaflet](https://leafletjs.com/) with [React-Leaflet](https://react-leaflet.js.org/)
- **Routing Engine**: [OSRM (Open Source Routing Machine)](http://project-osrm.org/) API
- **Geocoding**: [Nominatim](https://nominatim.org/) for reverse geocoding map clicks
- **Weather Data**: [Open-Meteo](https://open-meteo.com/)
- **Deployment**: [Vercel](https://vercel.com) (Global CDN)
- **Containerization**: [Docker](https://www.docker.com/)

---

## 🚀 Getting Started

### 1. Local Development
Clone the repository:
```bash
git clone https://github.com/YOUR_USERNAME/accidentsense.git
cd accidentsense
```
Install and Run:
```bash
npm install
npm run dev
```

### 2. Docker Deployment
Run using Docker Compose:
```bash
docker-compose up -d --build
```
Access at: `http://localhost:8080`

---

## 📖 Usage Guide

1. **Set Locations**: Click the **"Pick Source"** or **"Pick Dest"** button, then click any point on the map to set your markers.
2. **Generate Route**: Click the **"Route"** button. The app will calculate the path and perform a safety/weather audit.
3. **Analyze**: Observe the **Risk Exposure**, **Weather**, and **Traffic** cards in the glassmorphism sidebar.
4. **Start Driving**: Click **"Start Live Navigation"** to enable real-time tracking and proximity alerts.

---

*Built with ❤️ for safer roads. Live on Vercel at [accident-sense.vercel.app](https://accident-sense.vercel.app/)*
