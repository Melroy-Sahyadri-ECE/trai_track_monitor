/* ========================================
   DataSource — Fetch layer for panels
   Handles REST polling + WebSocket
   ======================================== */

class DataSource {
    constructor(panelId) {
        this.panelId = panelId;
        this.config = this.loadConfig();
        this.pollTimer = null;
        this.ws = null;
        this.onData = null;  // callback
        this.onError = null; // callback
        this.onStatusChange = null; // callback
    }

    loadConfig() {
        const stored = localStorage.getItem(`ds_config_${this.panelId}`);
        if (stored) {
            try { return JSON.parse(stored); } catch (e) { /* ignore */ }
        }
        return {
            apiUrl: '',
            pollInterval: 5,
            wsUrl: '',
            dataPath: ''
        };
    }

    saveConfig(config) {
        this.config = config;
        localStorage.setItem(`ds_config_${this.panelId}`, JSON.stringify(config));
    }

    isConfigured() {
        return !!(this.config.apiUrl || this.config.wsUrl);
    }

    // Extract nested value from object using dot-separated path
    extractDataPath(data, path) {
        if (!path) return data;
        const keys = path.split('.');
        let result = data;
        for (const key of keys) {
            if (result == null) return null;
            // Support array index like "items[0]"
            const match = key.match(/^(\w+)\[(\d+)\]$/);
            if (match) {
                result = result[match[1]];
                if (Array.isArray(result)) result = result[parseInt(match[2])];
            } else {
                result = result[key];
            }
        }
        return result;
    }

    async fetchOnce() {
        if (!this.config.apiUrl) return null;
        try {
            const response = await fetch(this.config.apiUrl);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            const extracted = this.extractDataPath(data, this.config.dataPath);
            if (this.onStatusChange) this.onStatusChange('live');
            if (this.onData) this.onData(extracted);
            return extracted;
        } catch (err) {
            if (this.onStatusChange) this.onStatusChange('error');
            if (this.onError) this.onError(err);
            return null;
        }
    }

    startPolling() {
        this.stopPolling();
        if (!this.config.apiUrl) return;
        const interval = Math.max(1, this.config.pollInterval || 5) * 1000;
        this.fetchOnce(); // immediate first fetch
        this.pollTimer = setInterval(() => this.fetchOnce(), interval);
    }

    stopPolling() {
        if (this.pollTimer) {
            clearInterval(this.pollTimer);
            this.pollTimer = null;
        }
    }

    connectWebSocket() {
        this.disconnectWebSocket();
        if (!this.config.wsUrl) return;
        try {
            this.ws = new WebSocket(this.config.wsUrl);
            this.ws.onopen = () => {
                if (this.onStatusChange) this.onStatusChange('live');
            };
            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    const extracted = this.extractDataPath(data, this.config.dataPath);
                    if (this.onData) this.onData(extracted);
                } catch (e) {
                    // Raw text data
                    if (this.onData) this.onData(event.data);
                }
            };
            this.ws.onerror = () => {
                if (this.onStatusChange) this.onStatusChange('error');
            };
            this.ws.onclose = () => {
                if (this.onStatusChange) this.onStatusChange('demo');
            };
        } catch (err) {
            if (this.onStatusChange) this.onStatusChange('error');
            if (this.onError) this.onError(err);
        }
    }

    disconnectWebSocket() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    start() {
        if (this.config.wsUrl) {
            this.connectWebSocket();
        }
        if (this.config.apiUrl) {
            this.startPolling();
        }
    }

    stop() {
        this.stopPolling();
        this.disconnectWebSocket();
    }

    restart() {
        this.config = this.loadConfig();
        this.stop();
        this.start();
    }
}
