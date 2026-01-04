export const ACCIDENT_ZONES = [
  {
    id: 1,
    name: "Paradise Circle Junction",
    description: "High traffic convergence. Frequent merging accidents.",
    riskLevel: "HIGH",
    color: "#FF3B30",
    path: [
      { lat: 17.4410, lng: 78.4860 },
      { lat: 17.4435, lng: 78.4885 },
      { lat: 17.4405, lng: 78.4910 },
      { lat: 17.4385, lng: 78.4880 }
    ]
  },
  {
    id: 2,
    name: "Panjagutta Main Road",
    description: "Congested flyover entry. Sudden braking hazard.",
    riskLevel: "MEDIUM",
    color: "#FF9500",
    path: [
      { lat: 17.4255, lng: 78.4490 },
      { lat: 17.4270, lng: 78.4520 },
      { lat: 17.4250, lng: 78.4540 },
      { lat: 17.4235, lng: 78.4510 }
    ]
  },
  {
    id: 3,
    name: "LB Nagar Ring Road",
    description: "Heavy vehicle crossing zone. Pedestrian risk high.",
    riskLevel: "HIGH",
    color: "#FF3B30",
    path: [
      { lat: 17.3490, lng: 78.5480 },
      { lat: 17.3520, lng: 78.5510 },
      { lat: 17.3480, lng: 78.5540 },
      { lat: 17.3460, lng: 78.5500 }
    ]
  }
];

// Helper to check if a point is within any zone
// using Ray-casting algorithm for point in polygon
export const checkZoneIntersection = (location, google) => {
  // google arg is deprecated but kept for signature compatibility if needed, 
  // though we ignore it now.

  // Convert {lat, lng} to [lat, lng] for easier math if needed, 
  // but we can work directly with objects.
  const x = location.lat;
  const y = location.lng;

  for (const zone of ACCIDENT_ZONES) {
    const poly = zone.path;
    let inside = false;

    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i].lat, yi = poly[i].lng;
      const xj = poly[j].lat, yj = poly[j].lng;

      const intersect = ((yi > y) !== (yj > y))
        && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);

      if (intersect) inside = !inside;
    }

    if (inside) return zone;
  }
  return null;
};
