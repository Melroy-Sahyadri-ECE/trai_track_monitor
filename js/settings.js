/* ========================================
   Settings Panel — Data Source Configuration
   Map each panel to API/WebSocket endpoint
   ======================================== */

const Settings = (() => {

    const panels = [
        { id: 'trackmap', name: 'Track Map', description: 'GPS pins color-coded by verdict' },
        { id: 'health', name: 'Health Profile', description: 'Vibration score vs chainage line chart' },
        { id: 'gauge', name: 'Gauge Profile', description: 'Gauge deviation from 1676mm nominal' },
        { id: 'fft', name: 'Live FFT', description: 'Real-time frequency spectrum' },
        { id: 'events', name: 'Events Table', description: 'Timestamp, chainage, verdict, scores' },
        { id: 'summary', name: 'Summary Stats', description: 'Total readings, critical & suspect counts' }
    ];

    function getConfig(panelId) {
        const stored = localStorage.getItem(`ds_config_${panelId}`);
        if (stored) {
            try { return JSON.parse(stored); } catch (e) { /* ignore */ }
        }
        return { apiUrl: '', pollInterval: 5, wsUrl: '', dataPath: '' };
    }

    function saveConfig(panelId, config) {
        localStorage.setItem(`ds_config_${panelId}`, JSON.stringify(config));
    }

    function isConfigured(panelId) {
        const cfg = getConfig(panelId);
        return !!(cfg.apiUrl || cfg.wsUrl);
    }

    function showToast(message, type = 'success') {
        // Remove existing toast
        const existing = document.querySelector('.toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);

        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    function renderSettings() {
        const container = document.getElementById('settings-container');
        if (!container) return;

        container.innerHTML = `
            <div style="margin-bottom: 8px;">
                <p style="color: var(--text-secondary); font-size: 0.9rem; line-height: 1.6;">
                    Configure each panel's data source below. Panels without a configured endpoint will show <strong style="color: var(--color-blue);">demo data</strong>.
                    Settings are saved in your browser and persist across sessions.
                </p>
            </div>
        ` + panels.map(panel => {
            const cfg = getConfig(panel.id);
            const configured = isConfigured(panel.id);
            return `
                <div class="settings-card" id="settings-card-${panel.id}">
                    <div class="settings-card-header" onclick="Settings.toggleCard('${panel.id}')">
                        <div class="settings-card-title">
                            <span class="dot ${configured ? 'configured' : ''}"></span>
                            <span>${panel.name}</span>
                            <span style="color: var(--text-muted); font-weight: 400; font-size: 0.82rem; margin-left: 4px;">— ${panel.description}</span>
                        </div>
                        <svg class="settings-card-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                    </div>
                    <div class="settings-card-body">
                        <div class="settings-field">
                            <label for="cfg-${panel.id}-api">API Endpoint URL</label>
                            <input type="url" id="cfg-${panel.id}-api" placeholder="http://localhost:5000/api/readings" value="${cfg.apiUrl}">
                        </div>
                        <div class="settings-field">
                            <label for="cfg-${panel.id}-poll">Poll Interval (seconds)</label>
                            <input type="number" id="cfg-${panel.id}-poll" min="1" max="3600" placeholder="5" value="${cfg.pollInterval || 5}">
                        </div>
                        <div class="settings-field">
                            <label for="cfg-${panel.id}-ws">WebSocket URL (optional)</label>
                            <input type="url" id="cfg-${panel.id}-ws" placeholder="ws://localhost:5000/socket" value="${cfg.wsUrl}">
                        </div>
                        <div class="settings-field">
                            <label for="cfg-${panel.id}-path">Data Path (JSON key path)</label>
                            <input type="text" id="cfg-${panel.id}-path" placeholder="data.readings" value="${cfg.dataPath}">
                        </div>
                        <div class="settings-actions">
                            <button class="btn btn-primary" onclick="Settings.save('${panel.id}')">
                                Save & Apply
                            </button>
                            <button class="btn btn-danger" onclick="Settings.clear('${panel.id}')">
                                Clear
                            </button>
                            <button class="btn btn-secondary" onclick="Settings.test('${panel.id}')">
                                Test Connection
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    function toggleCard(panelId) {
        const card = document.getElementById(`settings-card-${panelId}`);
        if (card) card.classList.toggle('open');
    }

    function save(panelId) {
        const config = {
            apiUrl: document.getElementById(`cfg-${panelId}-api`).value.trim(),
            pollInterval: parseInt(document.getElementById(`cfg-${panelId}-poll`).value) || 5,
            wsUrl: document.getElementById(`cfg-${panelId}-ws`).value.trim(),
            dataPath: document.getElementById(`cfg-${panelId}-path`).value.trim()
        };

        saveConfig(panelId, config);

        // Update dot indicator
        const dot = document.querySelector(`#settings-card-${panelId} .dot`);
        if (dot) {
            dot.className = 'dot' + (config.apiUrl || config.wsUrl ? ' configured' : '');
        }

        // Restart the panel's data source
        restartPanel(panelId);

        showToast(`✓ ${panels.find(p => p.id === panelId)?.name} settings saved!`);
    }

    function clear(panelId) {
        localStorage.removeItem(`ds_config_${panelId}`);

        // Reset form inputs
        document.getElementById(`cfg-${panelId}-api`).value = '';
        document.getElementById(`cfg-${panelId}-poll`).value = '5';
        document.getElementById(`cfg-${panelId}-ws`).value = '';
        document.getElementById(`cfg-${panelId}-path`).value = '';

        // Update dot indicator
        const dot = document.querySelector(`#settings-card-${panelId} .dot`);
        if (dot) dot.className = 'dot';

        // Restart to demo mode
        restartPanel(panelId);

        showToast(`${panels.find(p => p.id === panelId)?.name} reset to demo data`, 'success');
    }

    async function test(panelId) {
        const apiUrl = document.getElementById(`cfg-${panelId}-api`).value.trim();
        if (!apiUrl) {
            showToast('Please enter an API URL first', 'error');
            return;
        }

        try {
            showToast('Testing connection...', 'success');
            const response = await fetch(apiUrl, { method: 'GET', signal: AbortSignal.timeout(5000) });
            if (response.ok) {
                const data = await response.json();
                const dataPath = document.getElementById(`cfg-${panelId}-path`).value.trim();
                if (dataPath) {
                    // Try extracting with path
                    const ds = new DataSource(panelId);
                    const extracted = ds.extractDataPath(data, dataPath);
                    showToast(`✓ Connected! Data path resolved ${extracted ? 'successfully' : '(null result — check path)'}`, extracted ? 'success' : 'error');
                } else {
                    showToast(`✓ Connected! Received ${JSON.stringify(data).length} bytes`, 'success');
                }
            } else {
                showToast(`✕ HTTP ${response.status}: ${response.statusText}`, 'error');
            }
        } catch (err) {
            showToast(`✕ Connection failed: ${err.message}`, 'error');
        }
    }

    function restartPanel(panelId) {
        const map = {
            trackmap: () => TrackMap.restart(),
            health: () => HealthProfile.restart(),
            gauge: () => GaugeProfile.restart(),
            fft: () => LiveFFT.restart(),
            events: () => EventsTable.restart(),
            summary: () => SummaryStats.restart()
        };
        if (map[panelId]) map[panelId]();
    }

    return { renderSettings, toggleCard, save, clear, test };
})();
