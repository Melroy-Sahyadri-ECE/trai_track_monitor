/* ========================================
   App — Main Router & Initialization
   Handles sidebar nav, panel switching
   ======================================== */

(function () {
    'use strict';

    // Panel modules registry
    const panelModules = {
        trackmap: TrackMap,
        health: HealthProfile,
        gauge: GaugeProfile,
        fft: LiveFFT,
        events: EventsTable,
        summary: SummaryStats
    };

    let initializedPanels = new Set();
    let currentPanel = 'trackmap';

    // ========== Navigation ==========

    function switchPanel(panelId) {
        // Deactivate all panels
        document.querySelectorAll('.panel').forEach(p => {
            p.classList.remove('active');
        });

        // Deactivate all nav links
        document.querySelectorAll('.nav-link').forEach(l => {
            l.classList.remove('active');
        });

        // Activate target
        const panel = document.getElementById(`panel-${panelId}`);
        const navLink = document.querySelector(`[data-panel="${panelId}"]`);

        if (panel) panel.classList.add('active');
        if (navLink) navLink.classList.add('active');

        // Initialize panel if first time
        if (!initializedPanels.has(panelId)) {
            if (panelId === 'settings') {
                Settings.renderSettings();
            } else if (panelModules[panelId]) {
                panelModules[panelId].init();
            }
            initializedPanels.add(panelId);
        }

        // Special handling for map resize
        if (panelId === 'trackmap') {
            TrackMap.refresh();
        }

        currentPanel = panelId;

        // Close mobile sidebar
        document.getElementById('sidebar').classList.remove('open');
    }

    // ========== Event Listeners ==========

    // Nav link clicks
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const panelId = link.dataset.panel;
            if (panelId) switchPanel(panelId);
        });
    });

    // Mobile menu toggle
    const menuToggle = document.getElementById('menu-toggle');
    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('open');
        });
    }

    // Close sidebar on outside click (mobile)
    document.addEventListener('click', (e) => {
        const sidebar = document.getElementById('sidebar');
        const toggle = document.getElementById('menu-toggle');
        if (sidebar.classList.contains('open') &&
            !sidebar.contains(e.target) &&
            !toggle.contains(e.target)) {
            sidebar.classList.remove('open');
        }
    });

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.getElementById('sidebar').classList.remove('open');
        }
    });

    // ========== Initialize ==========

    // Start with Track Map panel
    switchPanel('trackmap');

})();
