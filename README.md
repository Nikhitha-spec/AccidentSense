# 🛡️ AccidentSense: Intelligent Safety Navigation

**AccidentSense** is a cutting-edge navigation layer for OpenStreetMap (OSM) designed with a "Safety First" philosophy. It doesn't just show you the way; it analyzes every meter of your journey for potential risks.

---

## 🌟 Features

- **📍 Dynamic Map Interaction**: Click-to-pin functionality allows users to select Source and Destination points directly on the map.
- **🧠 Predictive Safety Analysis**: Automatically calculates a **Route Risk Factor (%)**, identifying exactly how much of your trip passes through high-risk accident zones.
- **🚩 Accident Zone Visualization**: Clearly marked "Danger Polygons" and highlighted red route segments provide immediate visual awareness of hazardous areas.
- **☁️ Real-Time Weather Sync**: Fetches live temperature, wind speed, and weather condition data for your destination.
- **🚗 Traffic Density Mapping**: Analyzes route duration heuristics to visualize "Traffic Bottlenecks" in moderate (Orange) and heavy (Red) clusters.
- **📱 Live Navigation Mode**: Uses real device geolocation to provide:
    - Real-time GPS tracking.
    - Proximity alerts when entering accident zones.
    - Speeding violations based on predefined thresholds.

---

## � Tech Stack

- **Core**: [React.js](https://reactjs.org/) + [Vite](https://vitejs.dev/) (Lightning fast development & bundling)
- **Map Engine**: [Leaflet](https://leafletjs.com/) with [React-Leaflet](https://react-leaflet.js.org/)
- **Geometry Logic**: Ray-casting algorithms for precise Point-in-Polygon (PiP) detection.
- **Routing Engine**: [OSRM (Open Source Routing Machine)](http://project-osrm.org/) API.
- **Geocoding**: [Nominatim](https://nominatim.org/) for reverse geocoding map clicks to addresses.
- **Weather Data**: [Open-Meteo](https://open-meteo.com/) (Free, reliable meteorological data).
- **Icons**: [Lucide-React](https://lucide.dev/).
- **Design**: Premium Glassmorphism UI with a custom dark-mode map tileset.

---

## � How to Retrieve and Run the Project

Follow these simple steps to get **AccidentSense** running on your local machine:

### 1. Retrieve the Files
Clone the repository from GitHub:
```bash
git clone https://github.com/YOUR_USERNAME/accidentsense.git
```
Navigate into the project folder:
```bash
cd accidentsense
```

### 2. Install Dependencies
Ensure you have [Node.js](https://nodejs.org/) installed, then run:
```bash
npm install
```

### 3. Environment Configuration
Create a `.env` file in the root directory:
```bash
touch .env
```
*(Optional)* Add a Google Maps API Key if you intend to use Google-specific plugins (though the current build is optimized for OSM):
```env
VITE_GOOGLE_MAPS_API_KEY=your_api_key_here
```

### 4. Run the Application
Start the Vite development server:
```bash
npm run dev
```
Open your browser and visit: `http://localhost:5173`

---

## � Docker Deployment

You can also run **AccidentSense** using Docker for a consistent production-ready environment.

### 1. Build and Run with Docker Compose
Ensuring you have Docker installed, run:
```bash
docker-compose up -d --build
```
This will build the image and start a container.

### 2. Access the Application
The app will be available at: `http://localhost:8080`

### 3. Build Manually (Optional)
If you prefer to use the Docker CLI directly:
```bash
# Build the image
docker build -t accidentsense .

# Run the container
docker run -d -p 8080:80 --name accidentsense-container accidentsense
```

---

## �📖 Usage Guide

1. **Set Locations**: Click the **"Pick Source"** or **"Pick Dest"** button, then click any point on the map to set your markers.
2. **Generate Route**: Click the **"Route"** button. The app will calculate the path and perform a safety/weather audit.
3. **Check Safety**: Observe the **Risk Exposure** card to see if your route is "LOW," "MODERATE," or "CRITICAL."
4. **Start Driving**: Click **"Start Live Navigation"** to enable real-time tracking if you are on a mobile device or simulating movement.

