import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polygon, Polyline, Circle, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { AlertTriangle, Navigation, Search, MapPin, Gauge, CloudRain, Sun, Wind, Thermometer, Car, ChevronDown, ChevronUp, Menu, Loader2, X, Info, Volume2, VolumeX } from 'lucide-react';
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
    const [isSearchingSource, setIsSearchingSource] = useState(false);
    const [isSearchingDest, setIsSearchingDest] = useState(false);
    const [showRiskHeatmap, setShowRiskHeatmap] = useState(true);
    const [routeWarning, setRouteWarning] = useState(null);
    const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);

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

    const speak = (text) => {
        if (isVoiceEnabled && window.speechSynthesis) {
            // Cancel any current speech
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 1.0;
            utterance.pitch = 1.0;
            window.speechSynthesis.speak(utterance);
        }
    };

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

    // Nominatim Geocoding with local bias and debouncing logic integrated into useEffects
    const searchPlaces = async (query, setSuggestions, setLoading) => {
        if (!query || query.length < 3) {
            setSuggestions([]);
            return;
        }

        setLoading(true);
        try {
            // Add local bias by creating a viewbox around the user's current location (~50km)
            const bias = userLocation ? `&viewbox=${userLocation.lng - 0.5},${userLocation.lat - 0.5},${userLocation.lng + 0.5},${userLocation.lat + 0.5}` : '';
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1${bias}`
            );
            const data = await response.json();

            // Format data to be more readable
            const formattedData = data.map(item => ({
                ...item,
                main_name: item.address.road || item.address.suburb || item.address.city || item.display_name.split(',')[0],
                sub_name: item.display_name.split(',').slice(1).join(',').trim()
            }));

            setSuggestions(formattedData);
        } catch (error) {
            console.error("Geocoding error:", error);
        } finally {
            setLoading(false);
        }
    };

    // Debounced Search Effects
    useEffect(() => {
        const timer = setTimeout(() => {
            if (sourceQuery && !sourceCoords) {
                searchPlaces(sourceQuery, setSourceSuggestions, setIsSearchingSource);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [sourceQuery]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (destQuery && !destCoords) {
                searchPlaces(destQuery, setDestSuggestions, setIsSearchingDest);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [destQuery]);

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

        if (detectedZones.size > 0) {
            const warningMsg = `This route passes through ${detectedZones.size} high-risk accident zones.`;
            setRouteWarning({
                title: 'SAFETY WARNING',
                message: warningMsg,
                zones: Array.from(detectedZones)
            });
            speak(warningMsg);
        } else {
            setRouteWarning(null);
        }
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
        setRouteWarning(null);
    };

    // Calculate distance between two points in meters
    const getDistanceMeters = (p1, p2) => {
        const R = 6371e3; // metres
        const φ1 = p1.lat * Math.PI / 180;
        const φ2 = p2.lat * Math.PI / 180;
        const Δφ = (p2.lat - p1.lat) * Math.PI / 180;
        const Δλ = (p2.lng - p1.lng) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
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

                // Advanced logic: Check if any zone is approaching (within 500m)
                let approachingZone = null;
                if (!zone) {
                    approachingZone = ACCIDENT_ZONES.find(z => {
                        const dist = getDistanceMeters(newPos, z.center);
                        return dist < 500;
                    });
                }

                if (zone) {
                    const msg = `ENTERING ${zone.name}`;
                    setActiveAlert({
                        type: 'danger',
                        message: msg,
                        sub: zone.description
                    });
                    speak(msg + ". " + zone.description);
                } else if (approachingZone) {
                    const msg = `APPROACHING DANGER. ${approachingZone.name} is ahead.`;
                    setActiveAlert({
                        type: 'warning',
                        message: 'APPROACHING DANGER',
                        sub: `${approachingZone.name} is 500m ahead.`
                    });
                    speak(msg);
                } else if (speedKmh > SPEED_THRESHOLD) {
                    const msg = `SPEED VIOLATION. Slow down!`;
                    setActiveAlert({
                        type: 'warning',
                        message: 'SPEED VIOLATION',
                        sub: `Slow down! Limit is ${SPEED_THRESHOLD} km/h`
                    });
                    speak(msg);
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
            {routeWarning && (
                <div className="top-alert-banner">
                    <AlertTriangle size={24} />
                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{routeWarning.title}</div>
                        <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>{routeWarning.message}</div>
                    </div>
                    <button
                        onClick={() => setRouteWarning(null)}
                        style={{ background: 'none', border: 'none', color: 'white', padding: '5px', cursor: 'pointer' }}
                    >
                        <X size={20} />
                    </button>
                </div>
            )}

            <div className={`controls-panel glass-panel ${!isControlsExpanded ? 'collapsed' : ''}`}>
                <div className="logo-area" onClick={() => window.innerWidth <= 768 && setIsControlsExpanded(!isControlsExpanded)} style={{ cursor: window.innerWidth <= 768 ? 'pointer' : 'default' }}>
                    <AlertTriangle color="#FF3B30" size={24} />
                    <span className="brand-name">AccidentSense</span>
                    <button className="mobile-toggle">
                        {isControlsExpanded ? <ChevronUp size={24} /> : <Menu size={24} />}
                    </button>
                </div>

                <div style={{ marginBottom: '15px', padding: '10px', background: 'rgba(66, 133, 244, 0.1)', borderRadius: '8px', border: '1px solid rgba(66, 133, 244, 0.2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#4285F4' }}>Map Configuration</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '0.65rem', opacity: 0.8 }}>Heatmap</span>
                            <div
                                onClick={() => setShowRiskHeatmap(!showRiskHeatmap)}
                                style={{
                                    width: '34px',
                                    height: '18px',
                                    background: showRiskHeatmap ? '#4285F4' : '#333',
                                    borderRadius: '10px',
                                    position: 'relative',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s'
                                }}
                            >
                                <div style={{
                                    position: 'absolute',
                                    left: showRiskHeatmap ? '18px' : '2px',
                                    top: '2px',
                                    width: '14px',
                                    height: '14px',
                                    background: 'white',
                                    borderRadius: '50%',
                                    transition: 'all 0.3s'
                                }} />
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#4CAF50' }}>Audio Guidance</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '0.65rem', opacity: 0.8 }}>Voice Alerts</span>
                            <div
                                onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}
                                style={{
                                    width: '34px',
                                    height: '18px',
                                    background: isVoiceEnabled ? '#4CAF50' : '#333',
                                    borderRadius: '10px',
                                    position: 'relative',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s'
                                }}
                            >
                                <div style={{
                                    position: 'absolute',
                                    left: isVoiceEnabled ? '18px' : '2px',
                                    top: '2px',
                                    width: '14px',
                                    height: '14px',
                                    background: 'white',
                                    borderRadius: '50%',
                                    transition: 'all 0.3s'
                                }} />
                            </div>
                        </div>
                    </div>

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
                    <div style={{ position: 'relative' }}>
                        <input
                            className="input-glass"
                            type="text"
                            placeholder="Source Location"
                            value={sourceQuery}
                            onChange={(e) => {
                                setSourceQuery(e.target.value);
                                setSourceCoords(null); // Reset coords so we can search again
                            }}
                        />
                        {isSearchingSource && (
                            <Loader2 className="animate-spin" size={16} style={{ position: 'absolute', right: '12px', top: '14px', opacity: 0.6 }} />
                        )}
                    </div>
                    {sourceSuggestions.length > 0 && (
                        <ul className="suggestions-list glass-panel">
                            {sourceSuggestions.map((place, i) => (
                                <li key={i} onClick={() => handleSelectPlace(place, 'source')}>
                                    <div style={{ fontWeight: '600' }}>{place.main_name}</div>
                                    <div style={{ fontSize: '0.75rem', opacity: 0.7, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{place.sub_name}</div>
                                </li>
                            ))}
                        </ul>
                    )}

                    <div style={{ position: 'relative' }}>
                        <input
                            className="input-glass"
                            type="text"
                            placeholder="Destination"
                            value={destQuery}
                            onChange={(e) => {
                                setDestQuery(e.target.value);
                                setDestCoords(null); // Reset coords so we can search again
                            }}
                        />
                        {isSearchingDest && (
                            <Loader2 className="animate-spin" size={16} style={{ position: 'absolute', right: '12px', top: '14px', opacity: 0.6 }} />
                        )}
                    </div>
                    {destSuggestions.length > 0 && (
                        <ul className="suggestions-list glass-panel">
                            {destSuggestions.map((place, i) => (
                                <li key={i} onClick={() => handleSelectPlace(place, 'dest')}>
                                    <div style={{ fontWeight: '600' }}>{place.main_name}</div>
                                    <div style={{ fontSize: '0.75rem', opacity: 0.7, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{place.sub_name}</div>
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
                    <React.Fragment key={zone.id}>
                        {showRiskHeatmap && (
                            <Circle
                                center={[zone.center.lat, zone.center.lng]}
                                radius={Math.sqrt(zone.frequency) * 40} // Scaled radius based on frequency
                                pathOptions={{
                                    fillColor: zone.color,
                                    fillOpacity: 0.1 + (zone.frequency / 300), // More frequent = more opaque
                                    color: 'transparent',
                                    className: 'risk-heat-circle'
                                }}
                            />
                        )}
                        <Polygon
                            positions={zone.path}
                            pathOptions={{
                                color: zone.color,
                                fillColor: zone.color,
                                fillOpacity: 0.35,
                                weight: 2
                            }}
                        >
                            <Popup>
                                <div style={{ minWidth: '150px' }}>
                                    <h4 style={{ margin: '0 0 5px 0', color: zone.color }}>{zone.name}</h4>
                                    <p style={{ margin: '0 0 10px 0', fontSize: '0.8rem' }}>{zone.description}</p>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 'bold', borderTop: '1px solid #eee', paddingTop: '5px' }}>
                                        <span>Annual Incidents:</span>
                                        <span style={{ color: zone.color }}>{zone.frequency}</span>
                                    </div>
                                </div>
                            </Popup>
                        </Polygon>
                    </React.Fragment>
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
