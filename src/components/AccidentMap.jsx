import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polygon, Polyline, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { AlertTriangle, Navigation, Search, MapPin, Gauge, CloudRain, Sun, Wind, Thermometer, Car, ChevronDown, ChevronUp, Menu } from 'lucide-react';
import { ACCIDENT_ZONES, checkZoneIntersection } from '../utils/accidentZones';
import L from 'leaflet';

// Fix Leaflet Default Icon issue in React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Red Icon for Destination
const redIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// Green Icon for Source
const greenIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// Blue Icon for Current Location (Static)
const blueIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// Car Emoji Icon for Simulation/Navigation
const carIcon = new L.DivIcon({
    html: '<div style="font-size: 30px; line-height: 30px; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;">🚗</div>',
    className: 'emoji-marker',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15]
});

const center = {
    lat: 17.3850,
    lng: 78.4867
};

// Component to handle map movements
function MapUpdater({ center }) {
    const map = useMap();
    useEffect(() => {
        map.setView([center.lat, center.lng]);
    }, [center, map]);
    return null;
}

// Component to handle map clicks
function LocationSelector({ onMapClick, selectionMode }) {
    useMapEvents({
        click: (e) => {
            onMapClick(e.latlng);
        },
    });
    return null;
}

const AccidentMap = () => {
    const [map, setMap] = useState(null);
    const [directions, setDirections] = useState(null);
    const [distance, setDistance] = useState('');
    const [duration, setDuration] = useState('');
    const [userLocation, setUserLocation] = useState(center);
    const [activeAlert, setActiveAlert] = useState(null);
    const [isSimulating, setIsSimulating] = useState(false);
    const [currentSpeed, setCurrentSpeed] = useState(0);
    const [dangerSegments, setDangerSegments] = useState([]);
    const [routeRisks, setRouteRisks] = useState([]);
    const [weather, setWeather] = useState(null);
    const [trafficSegments, setTrafficSegments] = useState([]);
    const [trafficLevel, setTrafficLevel] = useState(null);
    const [accidentRate, setAccidentRate] = useState(null);
    const [selectionMode, setSelectionMode] = useState('source'); // 'source' or 'dest'

    // Autocomplete State
    const [sourceQuery, setSourceQuery] = useState('');
    const [destQuery, setDestQuery] = useState('');
    const [sourceSuggestions, setSourceSuggestions] = useState([]);
    const [destSuggestions, setDestSuggestions] = useState([]);
    const [sourceCoords, setSourceCoords] = useState(null);
    const [destCoords, setDestCoords] = useState(null);
    const [isControlsExpanded, setIsControlsExpanded] = useState(window.innerWidth > 768);

    const watchId = useRef(null);
    const SPEED_THRESHOLD = 80;

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth > 768) {
                setIsControlsExpanded(true);
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((position) => {
                const pos = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                setUserLocation(pos);
            });
        }
    }, []);

    const fetchWeather = async (lat, lng) => {
        try {
            const response = await fetch(
                `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true`
            );
            const data = await response.json();
            setWeather(data.current_weather);
        } catch (error) {
            console.error("Weather fetch error:", error);
        }
    };

    // Nominatim Geocoding
    const searchPlaces = async (query, setSuggestions) => {
        if (query.length < 3) return;
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}`);
            const data = await response.json();
            setSuggestions(data);
        } catch (error) {
            console.error("Geocoding error:", error);
        }
    };

    const reverseGeocode = async (lat, lng) => {
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
            const data = await response.json();
            return data.display_name;
        } catch (error) {
            return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        }
    };

    const handleMapClick = async (latlng) => {
        const coords = { lat: latlng.lat, lng: latlng.lng };
        const address = await reverseGeocode(latlng.lat, latlng.lng);

        if (selectionMode === 'source') {
            setSourceCoords(coords);
            setSourceQuery(address);
            setSelectionMode('dest');
            setUserLocation(coords);
        } else {
            setDestCoords(coords);
            setDestQuery(address);
            setSelectionMode('source');
        }
    };

    const handleSelectPlace = (place, type) => {
        const coords = { lat: parseFloat(place.lat), lng: parseFloat(place.lon) };
        if (type === 'source') {
            setSourceQuery(place.display_name);
            setSourceCoords(coords);
            setSourceSuggestions([]);
            setUserLocation(coords);
        } else {
            setDestQuery(place.display_name);
            setDestCoords(coords);
            setDestSuggestions([]);
        }
    };

    // OSRM Routing
    const calculateRoute = async () => {
        if (!sourceCoords || !destCoords) return;

        try {
            if (destCoords) {
                fetchWeather(destCoords.lat, destCoords.lng);
            }
            const response = await fetch(
                `https://router.project-osrm.org/route/v1/driving/${sourceCoords.lng},${sourceCoords.lat};${destCoords.lng},${destCoords.lat}?overview=full&geometries=geojson`
            );
            const data = await response.json();

            if (data.routes && data.routes.length > 0) {
                const route = data.routes[0];
                const coordinates = route.geometry.coordinates.map(coord => ({ lat: coord[1], lng: coord[0] }));

                setDirections(coordinates);
                setDistance(`${(route.distance / 1000).toFixed(1)} km`);
                setDuration(`${Math.floor(route.duration / 60)} mins`);

                analyzeRouteSafety(coordinates);
                analyzeTraffic(coordinates, route.duration, route.distance);
            }
        } catch (error) {
            console.error("Routing error:", error);
        }
    };

    const analyzeRouteSafety = (path) => {
        const newDangerSegments = [];
        const detectedZones = new Set();
        let currentSegment = [];
        let dangerPoints = 0;

        for (let i = 0; i < path.length; i++) {
            const point = path[i];
            const zone = checkZoneIntersection(point);

            if (zone) {
                currentSegment.push(point);
                detectedZones.add(zone);
                dangerPoints++;
            } else {
                if (currentSegment.length > 1) {
                    newDangerSegments.push({ path: currentSegment, color: "#FF0000" });
                }
                currentSegment = [];
            }
        }
        if (currentSegment.length > 1) {
            newDangerSegments.push({ path: currentSegment, color: "#FF0000" });
        }

        const rate = (dangerPoints / path.length) * 100;
        setAccidentRate({
            percentage: rate.toFixed(1),
            severity: rate > 30 ? 'CRITICAL' : rate > 10 ? 'MODERATE' : 'LOW'
        });

        setDangerSegments(newDangerSegments);
        setRouteRisks(Array.from(detectedZones));
    };

    const analyzeTraffic = (path, duration, distance) => {
        // Calculate average speed in km/h
        const avgSpeedKmh = (distance / 1000) / (duration / 3600);

        let globalLevel = "Light";
        let chanceOfTraffic = 0.1; // 10% default

        if (avgSpeedKmh < 25) {
            globalLevel = "Heavy";
            chanceOfTraffic = 0.5;
        } else if (avgSpeedKmh < 45) {
            globalLevel = "Moderate";
            chanceOfTraffic = 0.3;
        }

        setTrafficLevel(globalLevel);

        const newTrafficSegments = [];
        let currentSegment = [];
        let segmentType = null;

        for (let i = 0; i < path.length; i++) {
            const point = path[i];

            // Randomly simulate traffic clusters better than purely random points
            if (!segmentType && Math.random() < chanceOfTraffic) {
                segmentType = Math.random() > 0.6 ? 'heavy' : 'moderate';
            }

            if (segmentType) {
                currentSegment.push(point);
                // End segment with some probability or after some length
                if (Math.random() > 0.8 || currentSegment.length > 10) {
                    newTrafficSegments.push({
                        path: [...currentSegment],
                        color: segmentType === 'heavy' ? '#FF3B30' : '#FF9500',
                        weight: 8
                    });
                    currentSegment = [];
                    segmentType = null;
                }
            }
        }

        setTrafficSegments(newTrafficSegments);
    };

    const clearRoute = () => {
        setDirections(null);
        setDistance('');
        setDuration('');
        setDangerSegments([]);
        setRouteRisks([]);
        setSourceQuery('');
        setDestQuery('');
        setSourceCoords(null);
        setDestCoords(null);
        setWeather(null);
        setTrafficSegments([]);
        setTrafficLevel(null);
        setAccidentRate(null);
        stopSimulation();
    };

    const startSimulation = () => {
        if (!navigator.geolocation) {
            alert("Geolocation is not supported by your browser");
            return;
        }

        setIsSimulating(true);

        watchId.current = navigator.geolocation.watchPosition(
            (position) => {
                const { latitude, longitude, speed } = position.coords;
                const newPos = { lat: latitude, lng: longitude };

                setUserLocation(newPos);

                const speedKmh = speed ? Math.round(speed * 3.6) : 0;
                setCurrentSpeed(speedKmh);

                const zone = checkZoneIntersection(newPos);

                if (zone) {
                    setActiveAlert({
                        type: 'danger',
                        message: `ENTERING ${zone.name}`,
                        sub: zone.description
                    });
                } else if (speedKmh > SPEED_THRESHOLD) {
                    setActiveAlert({
                        type: 'warning',
                        message: 'SPEED VIOLATION',
                        sub: `Slow down! Limit is ${SPEED_THRESHOLD} km/h`
                    });
                } else {
                    setActiveAlert(null);
                }
            },
            (error) => {
                console.error("Navigation error:", error);
                alert("Error tracking location: " + error.message);
                setIsSimulating(false);
            },
            {
                enableHighAccuracy: true,
                maximumAge: 0,
                timeout: 5000
            }
        );
    };

    const stopSimulation = () => {
        if (watchId.current) {
            navigator.geolocation.clearWatch(watchId.current);
            watchId.current = null;
        }
        setIsSimulating(false);
        setActiveAlert(null);
        setCurrentSpeed(0);
    };

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <div className={`controls-panel glass-panel ${!isControlsExpanded ? 'collapsed' : ''}`}>
                <div className="logo-area" onClick={() => window.innerWidth <= 768 && setIsControlsExpanded(!isControlsExpanded)} style={{ cursor: window.innerWidth <= 768 ? 'pointer' : 'default' }}>
                    <AlertTriangle color="#FF3B30" size={24} />
                    <span className="brand-name">AccidentSense</span>
                    <button className="mobile-toggle">
                        {isControlsExpanded ? <ChevronUp size={24} /> : <Menu size={24} />}
                    </button>
                </div>

                <div style={{ marginBottom: '15px', padding: '10px', background: 'rgba(66, 133, 244, 0.1)', borderRadius: '8px', border: '1px solid rgba(66, 133, 244, 0.2)' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '5px', color: '#4285F4' }}>Map Selection Mode</div>
                    <div style={{ display: 'flex', gap: '5px' }}>
                        <button
                            onClick={() => setSelectionMode('source')}
                            className={`action-btn ${selectionMode === 'source' ? 'primary' : ''}`}
                            style={{ flex: 1, fontSize: '0.7rem', padding: '5px' }}
                        >
                            Pick Source
                        </button>
                        <button
                            onClick={() => setSelectionMode('dest')}
                            className={`action-btn ${selectionMode === 'dest' ? 'primary' : ''}`}
                            style={{ flex: 1, fontSize: '0.7rem', padding: '5px' }}
                        >
                            Pick Dest
                        </button>
                    </div>
                </div>

                <div className="inputs-container" style={{ position: 'relative' }}>
                    <input
                        className="input-glass"
                        type="text"
                        placeholder="Source Location"
                        value={sourceQuery}
                        onChange={(e) => {
                            setSourceQuery(e.target.value);
                            searchPlaces(e.target.value, setSourceSuggestions);
                        }}
                    />
                    {sourceSuggestions.length > 0 && (
                        <ul className="suggestions-list glass-panel">
                            {sourceSuggestions.map((place, i) => (
                                <li key={i} onClick={() => handleSelectPlace(place, 'source')}>
                                    {place.display_name}
                                </li>
                            ))}
                        </ul>
                    )}

                    <input
                        className="input-glass"
                        type="text"
                        placeholder="Destination"
                        value={destQuery}
                        onChange={(e) => {
                            setDestQuery(e.target.value);
                            searchPlaces(e.target.value, setDestSuggestions);
                        }}
                    />
                    {destSuggestions.length > 0 && (
                        <ul className="suggestions-list glass-panel">
                            {destSuggestions.map((place, i) => (
                                <li key={i} onClick={() => handleSelectPlace(place, 'dest')}>
                                    {place.display_name}
                                </li>
                            ))}
                        </ul>
                    )}

                    <div className="button-group">
                        <button onClick={calculateRoute} className="action-btn primary">
                            <Search size={18} /> Route
                        </button>
                        <button onClick={clearRoute} className="action-btn">
                            Clear
                        </button>
                    </div>
                </div>

                {distance && (
                    <div className="route-stats">
                        <div><Navigation size={16} /> {distance}</div>
                        <div><MapPin size={16} /> {duration}</div>
                    </div>
                )}

                {weather && (
                    <div className="weather-card glass-panel" style={{
                        marginTop: '10px',
                        padding: '10px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '8px',
                        fontSize: '0.85rem'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {weather.temperature > 20 ? <Sun color="#FFD700" size={18} /> :
                                    weather.weathercode > 50 ? <CloudRain color="#4285F4" size={18} /> :
                                        <Thermometer color="#FFF" size={18} />}
                                <span style={{ fontWeight: '600' }}>{weather.temperature}°C</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', opacity: 0.8 }}>
                                <Wind size={16} />
                                <span>{weather.windspeed} km/h</span>
                            </div>
                        </div>
                    </div>
                )}

                {trafficLevel && (
                    <div className="traffic-indicator glass-panel" style={{
                        marginTop: '10px',
                        padding: '10px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '8px',
                        fontSize: '0.85rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                    }}>
                        <Car size={18} color={trafficLevel === 'Heavy' ? '#FF3B30' : trafficLevel === 'Moderate' ? '#FF9500' : '#4CAF50'} />
                        <div>
                            <span style={{ fontWeight: '600' }}>Traffic: </span>
                            <span style={{ color: trafficLevel === 'Heavy' ? '#FF3B30' : trafficLevel === 'Moderate' ? '#FF9500' : '#4CAF50' }}>
                                {trafficLevel}
                            </span>
                        </div>
                    </div>
                )}

                {accidentRate && (
                    <div className="accident-rate-card glass-panel" style={{
                        marginTop: '10px',
                        padding: '12px',
                        background: accidentRate.severity === 'CRITICAL' ? 'rgba(255, 59, 48, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                        borderLeft: `4px solid ${accidentRate.severity === 'CRITICAL' ? '#FF3B30' : accidentRate.severity === 'MODERATE' ? '#FF9500' : '#4CAF50'}`,
                        borderRadius: '10px'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ fontSize: '0.85rem', opacity: 0.8 }}>Safety Risk Analysis</span>
                            <span style={{ fontWeight: '700', fontSize: '0.9rem', color: accidentRate.severity === 'CRITICAL' ? '#FF3B30' : accidentRate.severity === 'MODERATE' ? '#FF9500' : '#4CAF50' }}>{accidentRate.percentage}% {accidentRate.severity}</span>
                        </div>

                        {routeRisks.length > 0 && (
                            <div style={{ marginTop: '8px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '8px' }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '5px', opacity: 0.9 }}>Detected Accident Types:</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                    {[...new Set(routeRisks.map(zone => zone.description.split('.')[0]))].map((type, idx) => (
                                        <div key={idx} style={{ fontSize: '0.7rem', background: 'rgba(255,255,255,0.1)', padding: '3px 8px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                                            ⚠️ {type}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {routeRisks.length > 0 && (
                    <div className="risks-list" style={{ marginTop: '10px', maxHeight: '150px', overflowY: 'auto' }}>
                        <div style={{ color: '#FF3B30', fontWeight: 'bold', fontSize: '0.9em', marginBottom: '5px' }}>
                            ⚠️ {routeRisks.length} Risk Zones Detected
                        </div>
                        {routeRisks.map(zone => (
                            <div key={zone.id} style={{
                                background: 'rgba(255, 59, 48, 0.15)',
                                borderLeft: '3px solid #ff3b30',
                                padding: '8px',
                                marginBottom: '5px',
                                borderRadius: '4px',
                                fontSize: '0.85rem'
                            }}>
                                <div style={{ fontWeight: '600' }}>{zone.name}</div>
                                <div style={{ opacity: 0.8, fontSize: '0.75rem' }}>{zone.description}</div>
                            </div>
                        ))}
                    </div>
                )}

                {directions && !isSimulating && (
                    <button
                        onClick={startSimulation}
                        className="simulate-btn"
                        style={{
                            marginTop: '15px',
                            padding: '12px',
                            fontSize: '1.1rem',
                            letterSpacing: '1px',
                            textTransform: 'uppercase',
                            boxShadow: '0 4px 15px rgba(48, 207, 208, 0.4)'
                        }}
                    >
                        ▶ Start Live Navigation
                    </button>
                )}

                {isSimulating && (
                    <button
                        onClick={stopSimulation}
                        className="action-btn"
                        style={{
                            marginTop: '15px',
                            background: '#FF3B30',
                            color: 'white'
                        }}
                    >
                        ⏹ Stop Live Navigation
                    </button>
                )}
            </div>

            {activeAlert && (
                <div className={`safety-alert ${activeAlert.type}`}>
                    <div className="alert-icon">
                        {activeAlert.type === 'danger' ? <AlertTriangle size={32} /> : <Gauge size={32} />}
                    </div>
                    <div className="alert-content">
                        <h3>{activeAlert.message}</h3>
                        <p>{activeAlert.sub}</p>
                    </div>
                </div>
            )}

            {isSimulating && (
                <div className="speed-overlay glass-panel">
                    <span className="speed-value">{currentSpeed}</span>
                    <span className="speed-unit">km/h</span>
                </div>
            )}

            <MapContainer
                center={[center.lat, center.lng]}
                zoom={13}
                style={{ width: '100%', height: '100%' }}
                whenCreated={setMap}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    className="map-tiles"
                />

                <MapUpdater center={userLocation} />
                <LocationSelector onMapClick={handleMapClick} selectionMode={selectionMode} />

                {directions && (
                    <Polyline
                        positions={directions}
                        pathOptions={{ color: '#4285F4', weight: 6, opacity: 0.7 }}
                    />
                )}

                {dangerSegments.map((segment, index) => (
                    <Polyline
                        key={`danger-${index}`}
                        positions={segment.path}
                        pathOptions={{ color: segment.color, weight: 7, opacity: 1, zIndex: 100 }}
                    />
                ))}

                {/* Render Traffic Segments */}
                {trafficSegments.map((segment, index) => (
                    <Polyline
                        key={`traffic-${index}`}
                        positions={segment.path}
                        pathOptions={{ color: segment.color, weight: segment.weight, opacity: 0.8, zIndex: 50 }}
                    />
                ))}

                {ACCIDENT_ZONES.map(zone => (
                    <Polygon
                        key={zone.id}
                        positions={zone.path}
                        pathOptions={{
                            color: zone.color,
                            fillColor: zone.color,
                            fillOpacity: 0.35,
                            weight: 2
                        }}
                    />
                ))}

                {sourceCoords && (
                    <Marker position={[sourceCoords.lat, sourceCoords.lng]} icon={greenIcon}>
                        <Popup>Source Location</Popup>
                    </Marker>
                )}

                {destCoords && (
                    <Marker position={[destCoords.lat, destCoords.lng]} icon={redIcon}>
                        <Popup>Destination</Popup>
                    </Marker>
                )}

                <Marker
                    position={[userLocation.lat, userLocation.lng]}
                    icon={isSimulating ? carIcon : blueIcon}
                    zIndexOffset={1000}
                >
                    <Popup>Your Location</Popup>
                </Marker>
            </MapContainer>
        </div>
    );
};

export default AccidentMap;
