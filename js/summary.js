/* ========================================
   Summary Stats — Plain HTML Stat Cards + Circular Chart
   Total readings, critical, suspect counts
   ======================================== */

const SummaryStats = (() => {
    let ds = null;
    let chart = null;

    const demoData = {
        totalReadings: 15,
        criticalCount: 2,
        suspectCount: 3,
        goodCount: 10,
        avgScore: 24.3,
        maxDeviation: 19
    };

    const cardConfigs = [
        {
            key: 'totalReadings',
            label: 'Total Readings',
            icon: '📊',
            colorClass: 'blue',
            format: (v) => v.toLocaleString()
        },
        {
            key: 'suspectCount',
            label: 'Suspect (Yellow)',
            icon: '⚠️',
            colorClass: 'yellow',
            format: (v) => v.toLocaleString()
        },
        {
            key: 'criticalCount',
            label: 'Critical (Red)',
            icon: '🔴',
            colorClass: 'red',
            format: (v) => v.toLocaleString()
        },
        {
            key: 'avgScore',
            label: 'Avg Vibration Score',
            icon: '📈',
            colorClass: 'purple',
            format: (v) => v.toFixed(1)
        },
        {
            key: 'maxDeviation',
            label: 'Max Gauge Deviation',
            icon: '📐',
            colorClass: 'red',
            format: (v) => `±${v} mm`
        }
    ];

    function animateCounter(el, targetValue, duration = 800) {
        const start = parseInt(el.textContent) || 0;
        const startTime = performance.now();

        function update(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic

            if (typeof targetValue === 'number' && !isNaN(targetValue)) {
                const current = start + (targetValue - start) * eased;
                el.textContent = Number.isInteger(targetValue) ? Math.round(current).toLocaleString() : current.toFixed(1);
            }

            if (progress < 1) {
                requestAnimationFrame(update);
            }
        }

        if (typeof targetValue === 'string') {
            el.textContent = targetValue;
        } else {
            requestAnimationFrame(update);
        }
    }

    function renderCards(data) {
        const grid = document.getElementById('stats-grid');
        if (!grid) return;

        // If cards don't exist yet, create them
        if (grid.children.length === 0) {
            grid.innerHTML = `
                <div class="chart-card">
                    <canvas id="summary-chart"></canvas>
                </div>
            ` + cardConfigs.map(cfg => `
                <div class="stat-card" id="stat-${cfg.key}">
                    <div class="stat-card-icon ${cfg.colorClass}">${cfg.icon}</div>
                    <div class="stat-card-label">${cfg.label}</div>
                    <div class="stat-card-value" id="stat-value-${cfg.key}">0</div>
                    <div class="stat-card-change neutral" id="stat-change-${cfg.key}"></div>
                </div>
            `).join('');
        }

        // Update circular chart
        renderChart(data);

        // Update values with animation
        cardConfigs.forEach(cfg => {
            const el = document.getElementById(`stat-value-${cfg.key}`);
            if (!el || data[cfg.key] === undefined) return;

            const formatted = cfg.format(data[cfg.key]);
            if (typeof formatted === 'string' && isNaN(data[cfg.key])) {
                el.textContent = formatted;
            } else {
                animateCounter(el, data[cfg.key]);
                // For special format like ±19 mm
                if (cfg.key === 'maxDeviation') {
                    setTimeout(() => { el.textContent = formatted; }, 850);
                }
            }
        });

        // Update change indicators
        const total = data.totalReadings || 1;
        const critPct = ((data.criticalCount / total) * 100).toFixed(1);
        const suspPct = ((data.suspectCount / total) * 100).toFixed(1);

        setChange('criticalCount', `${critPct}% of total`, critPct > 10 ? 'negative' : 'neutral');
        setChange('suspectCount', `${suspPct}% of total`, suspPct > 20 ? 'negative' : 'neutral');
        setChange('totalReadings', 'All measurements', 'neutral');
        setChange('avgScore', data.avgScore < 35 ? 'Within normal range' : 'Above warning level', data.avgScore < 35 ? 'positive' : 'negative');
        setChange('maxDeviation', data.maxDeviation <= 5 ? 'Within tolerance' : 'Exceeds tolerance', data.maxDeviation <= 5 ? 'positive' : 'negative');
    }

    function renderChart(data) {
        const canvas = document.getElementById('summary-chart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');

        if (chart) {
            chart.data.datasets[0].data = [data.suspectCount, data.criticalCount];
            chart.update();
            return;
        }

        chart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Suspicious', 'Critical'],
                datasets: [{
                    data: [data.suspectCount, data.criticalCount],
                    backgroundColor: [
                        '#eab308',
                        '#ef4444'
                    ],
                    borderColor: '#1a1d29',
                    borderWidth: 3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: 'rgba(255, 255, 255, 0.8)',
                            padding: 15,
                            font: {
                                size: 13,
                                family: 'Inter, sans-serif'
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        titleFont: {
                            size: 14,
                            family: 'Inter, sans-serif'
                        },
                        bodyFont: {
                            size: 13,
                            family: 'Inter, sans-serif'
                        },
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    function setChange(key, text, cls) {
        const el = document.getElementById(`stat-change-${key}`);
        if (el) {
            el.textContent = text;
            el.className = `stat-card-change ${cls}`;
        }
    }

    function updateStatus(status) {
        const el = document.getElementById('status-summary');
        if (!el) return;
        const text = el.querySelector('.status-text');
        el.className = 'panel-status' + (status === 'live' ? ' live' : status === 'error' ? ' error' : '');
        text.textContent = status === 'live' ? 'Live' : status === 'error' ? 'Error' : 'Demo Data';
    }

    function init() {
        ds = new DataSource('summary');
        ds.onData = (data) => {
            if (data) renderCards(data);
        };
        ds.onStatusChange = updateStatus;

        if (ds.isConfigured()) {
            ds.start();
        } else {
            renderCards(demoData);
            updateStatus('demo');
        }
    }

    function restart() {
        if (ds) {
            ds.restart();
            if (!ds.isConfigured()) {
                renderCards(demoData);
                updateStatus('demo');
            }
        }
    }

    return { init, restart };
})();
