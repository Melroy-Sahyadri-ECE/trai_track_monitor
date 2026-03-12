/* ========================================
   Health Profile — Chart.js Line Chart
   Vibration score vs chainage (km)
   ======================================== */

const HealthProfile = (() => {
    let chart = null;
    let ds = null;

    const demoData = {
        labels: [0, 0.3, 0.7, 1.1, 1.5, 1.9, 2.3, 2.7, 3.1, 3.5, 3.9, 4.3, 4.7, 5.1, 5.5],
        scores: [12, 15, 10, 42, 18, 14, 78, 45, 20, 8, 38, 11, 85, 16, 9]
    };

    function getGradient(ctx, chartArea) {
        const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
        gradient.addColorStop(0, 'rgba(99, 102, 241, 0.4)');
        gradient.addColorStop(1, 'rgba(99, 102, 241, 0.02)');
        return gradient;
    }

    function createChart(labels, scores) {
        const canvas = document.getElementById('health-chart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        if (chart) chart.destroy();

        chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Vibration Score',
                    data: scores,
                    borderColor: '#6366f1',
                    borderWidth: 2.5,
                    pointBackgroundColor: scores.map(v => v >= 70 ? '#ef4444' : v >= 35 ? '#eab308' : '#22c55e'),
                    pointBorderColor: scores.map(v => v >= 70 ? '#ef4444' : v >= 35 ? '#eab308' : '#22c55e'),
                    pointRadius: 5,
                    pointHoverRadius: 8,
                    tension: 0.35,
                    fill: true,
                    backgroundColor: function(context) {
                        const chart = context.chart;
                        const { ctx, chartArea } = chart;
                        if (!chartArea) return 'transparent';
                        return getGradient(ctx, chartArea);
                    }
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    legend: {
                        display: true,
                        labels: {
                            color: '#94a3b8',
                            font: { family: 'Inter', size: 12, weight: 500 },
                            usePointStyle: true,
                            pointStyle: 'circle'
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(15, 22, 41, 0.95)',
                        titleColor: '#f1f5f9',
                        bodyColor: '#94a3b8',
                        borderColor: 'rgba(99, 102, 241, 0.3)',
                        borderWidth: 1,
                        cornerRadius: 8,
                        padding: 12,
                        titleFont: { family: 'Inter', weight: 600 },
                        bodyFont: { family: 'Inter' },
                        callbacks: {
                            title: (items) => `Chainage: ${items[0].label} km`,
                            label: (item) => {
                                const v = item.parsed.y;
                                const verdict = v >= 70 ? '🔴 Critical' : v >= 35 ? '🟡 Suspect' : '🟢 Good';
                                return `Score: ${v} — ${verdict}`;
                            }
                        }
                    },
                    annotation: undefined
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Chainage (km)',
                            color: '#94a3b8',
                            font: { family: 'Inter', size: 12, weight: 500 }
                        },
                        grid: { color: 'rgba(99, 102, 241, 0.06)' },
                        ticks: { color: '#64748b', font: { family: 'Inter', size: 11 } }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Vibration Score',
                            color: '#94a3b8',
                            font: { family: 'Inter', size: 12, weight: 500 }
                        },
                        min: 0,
                        max: 100,
                        grid: { color: 'rgba(99, 102, 241, 0.06)' },
                        ticks: { color: '#64748b', font: { family: 'Inter', size: 11 } }
                    }
                }
            },
            plugins: [{
                id: 'thresholdLines',
                beforeDraw(chart) {
                    const { ctx, chartArea, scales: { y } } = chart;
                    // Warning threshold at 35
                    const y35 = y.getPixelForValue(35);
                    ctx.save();
                    ctx.strokeStyle = 'rgba(234, 179, 8, 0.4)';
                    ctx.lineWidth = 1;
                    ctx.setLineDash([6, 4]);
                    ctx.beginPath();
                    ctx.moveTo(chartArea.left, y35);
                    ctx.lineTo(chartArea.right, y35);
                    ctx.stroke();

                    // Critical threshold at 70
                    const y70 = y.getPixelForValue(70);
                    ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
                    ctx.beginPath();
                    ctx.moveTo(chartArea.left, y70);
                    ctx.lineTo(chartArea.right, y70);
                    ctx.stroke();
                    ctx.restore();
                }
            }]
        });
    }

    function updateStatus(status) {
        const el = document.getElementById('status-health');
        if (!el) return;
        const text = el.querySelector('.status-text');
        el.className = 'panel-status' + (status === 'live' ? ' live' : status === 'error' ? ' error' : '');
        text.textContent = status === 'live' ? 'Live' : status === 'error' ? 'Error' : 'Demo Data';
    }

    function init() {
        ds = new DataSource('health');
        ds.onData = (data) => {
            if (data && data.labels && data.scores) {
                createChart(data.labels, data.scores);
            }
        };
        ds.onStatusChange = updateStatus;

        if (ds.isConfigured()) {
            ds.start();
        } else {
            createChart(demoData.labels, demoData.scores);
            updateStatus('demo');
        }
    }

    function restart() {
        if (ds) {
            ds.restart();
            if (!ds.isConfigured()) {
                createChart(demoData.labels, demoData.scores);
                updateStatus('demo');
            }
        }
    }

    return { init, restart };
})();
