/* ========================================
   Track Map Panel — Placeholder for Google Maps
   GPS pins color-coded by verdict
   ======================================== */

const TrackMap = (() => {
    let map = null;
    let ds = null;

    function updateStatus(status) {
        const el = document.getElementById('status-trackmap');
        if (!el) return;
        const dot = el.querySelector('.status-dot');
        const text = el.querySelector('.status-text');
        el.className = 'panel-status' + (status === 'live' ? ' live' : status === 'error' ? ' error' : '');
        text.textContent = status === 'live' ? 'Live' : status === 'error' ? 'Error' : 'Ready';
    }

    function init() {
        if (map) return; // already initialized

        const container = document.getElementById('map-container');
        if (container) {
            container.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: rgba(255,255,255,0.5); font-size: 14px;">Map will be integrated here (Google Maps)</div>';
        }

        // Data source placeholder
        ds = new DataSource('trackmap');
        ds.onStatusChange = updateStatus;
        
        updateStatus('demo');
    }

    function refresh() {
        // Placeholder for map refresh
    }

    function restart() {
        if (ds) {
            ds.restart();
        }
    }

    return { init, refresh, restart };
})();
