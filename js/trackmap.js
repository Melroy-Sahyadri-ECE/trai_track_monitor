/* ========================================
   Track Map Panel — Leaflet.js
   GPS pins color-coded by verdict
   ======================================== */

const TrackMap = (() => {
    let map = null;
    let markersLayer = null;
    let ds = null;

    // Demo data: simulated GPS points along a railway track
    const demoData = [
        { lat: 19.0760, lng: 72.8777, chainage: 0.0, verdict: 'green', score: 12, gauge: 1676 },
        { lat: 19.0780, lng: 72.8800, chainage: 0.3, verdict: 'green', score: 15, gauge: 1675 },
        { lat: 19.0810, lng: 72.8830, chainage: 0.7, verdict: 'green', score: 10, gauge: 1677 },
        { lat: 19.0845, lng: 72.8855, chainage: 1.1, verdict: 'yellow', score: 42, gauge: 1680 },
        { lat: 19.0870, lng: 72.8890, chainage: 1.5, verdict: 'green', score: 18, gauge: 1676 },
        { lat: 19.0900, lng: 72.8920, chainage: 1.9, verdict: 'green', score: 14, gauge: 1674 },
        { lat: 19.0930, lng: 72.8950, chainage: 2.3, verdict: 'red', score: 78, gauge: 1690 },
        { lat: 19.0960, lng: 72.8975, chainage: 2.7, verdict: 'yellow', score: 45, gauge: 1682 },
        { lat: 19.0990, lng: 72.9000, chainage: 3.1, verdict: 'green', score: 20, gauge: 1675 },
        { lat: 19.1020, lng: 72.9030, chainage: 3.5, verdict: 'green', score: 8, gauge: 1676 },
        { lat: 19.1050, lng: 72.9060, chainage: 3.9, verdict: 'yellow', score: 38, gauge: 1678 },
        { lat: 19.1080, lng: 72.9090, chainage: 4.3, verdict: 'green', score: 11, gauge: 1676 },
        { lat: 19.1110, lng: 72.9120, chainage: 4.7, verdict: 'red', score: 85, gauge: 1695 },
        { lat: 19.1140, lng: 72.9145, chainage: 5.1, verdict: 'green', score: 16, gauge: 1677 },
        { lat: 19.1170, lng: 72.9170, chainage: 5.5, verdict: 'green', score: 9, gauge: 1675 },
    ];

    const verdictColors = {
        green: '#22c55e',
        yellow: '#eab308',
        red: '#ef4444'
    };

    function createCircleIcon(color) {
        return L.divIcon({
            className: 'custom-marker',
            html: `<div style="
                width: 14px; height: 14px;
                background: ${color};
                border: 2px solid rgba(255,255,255,0.9);
                border-radius: 50%;
                box-shadow: 0 0 8px ${color}88, 0 2px 6px rgba(0,0,0,0.4);
            "></div>`,
            iconSize: [14, 14],
            iconAnchor: [7, 7],
            popupAnchor: [0, -10]
        });
    }

    function renderMarkers(data) {
        if (!map) return;
        if (markersLayer) markersLayer.clearLayers();

        const bounds = [];
        data.forEach(point => {
            const color = verdictColors[point.verdict] || verdictColors.green;
            const marker = L.marker([point.lat, point.lng], {
                icon: createCircleIcon(color)
            });

            marker.bindPopup(`
                <div class="popup-content">
                    <strong>Chainage:</strong> ${point.chainage} km<br>
                    <strong>Verdict:</strong> <span style="color:${color};font-weight:600">${point.verdict.toUpperCase()}</span><br>
                    <strong>Vibration Score:</strong> ${point.score}<br>
                    <strong>Gauge:</strong> ${point.gauge} mm
                </div>
            `, { className: 'custom-popup' });

            markersLayer.addLayer(marker);
            bounds.push([point.lat, point.lng]);
        });

        // Draw track line
        if (bounds.length > 1) {
            L.polyline(bounds, {
                color: 'rgba(99, 102, 241, 0.4)',
                weight: 3,
                dashArray: '8 6'
            }).addTo(markersLayer);
        }

        if (bounds.length > 0) {
            map.fitBounds(bounds, { padding: [40, 40] });
        }
    }

    function updateStatus(status) {
        const el = document.getElementById('status-trackmap');
        if (!el) return;
        const dot = el.querySelector('.status-dot');
        const text = el.querySelector('.status-text');
        el.className = 'panel-status' + (status === 'live' ? ' live' : status === 'error' ? ' error' : '');
        text.textContent = status === 'live' ? 'Live' : status === 'error' ? 'Error' : 'Demo Data';
    }

    function init() {
        if (map) return; // already initialized

        map = L.map('map-container', {
            zoomControl: true,
            attributionControl: true
        }).setView([19.0900, 72.8900], 13);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 19
        }).addTo(map);

        markersLayer = L.layerGroup().addTo(map);

        // Data source
        ds = new DataSource('trackmap');
        ds.onData = (data) => {
            if (Array.isArray(data)) renderMarkers(data);
        };
        ds.onStatusChange = updateStatus;

        if (ds.isConfigured()) {
            ds.start();
        } else {
            renderMarkers(demoData);
            updateStatus('demo');
        }
    }

    function refresh() {
        if (map) {
            setTimeout(() => map.invalidateSize(), 300);
        }
    }

    function restart() {
        if (ds) {
            ds.restart();
            if (!ds.isConfigured()) {
                renderMarkers(demoData);
                updateStatus('demo');
            }
        }
    }

    return { init, refresh, restart };
})();
