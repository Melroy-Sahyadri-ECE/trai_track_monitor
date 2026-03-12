/* ========================================
   Gauge Profile — Chart.js Line Chart
   Deviation from 1676mm nominal vs chainage
   ======================================== */

const GaugeProfile = (() => {
    let chart = null;
    let ds = null;

    const demoData = {
        labels: [0, 0.3, 0.7, 1.1, 1.5, 1.9, 2.3, 2.7, 3.1, 3.5, 3.9, 4.3, 4.7, 5.1, 5.5],
        gauges: [1676, 1675, 1677, 1680, 1676, 1674, 1690, 1682, 1675, 1676, 1678, 1676, 1695, 1677, 1675]
    };

    function getDeviations(gauges) {
        return gauges.map(g => g - 1676);
    }

    function getGradient(ctx, chartArea) {
        const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
        gradient.addColorStop(0, 'rgba(139, 92, 246, 0.3)');
        gradient.addColorStop(0.5, 'rgba(139, 92, 246, 0.05)');
        gradient.addColorStop(1, 'rgba(139, 92, 246, 0.3)');
        return gradient;
    }

    function createChart(labels, gauges) {
        const canvas = document.getElementById('gauge-chart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const deviations = getDeviations(gauges);

        if (chart) chart.destroy();

        chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Gauge Deviation (mm)',
                    data: deviations,
                    borderColor: '#8b5cf6',
                    borderWidth: 2.5,
                    pointBackgroundColor: deviations.map(d => Math.abs(d) >= 10 ? '#ef4444' : Math.abs(d) >= 5 ? '#eab308' : '#22c55e'),
                    pointBorderColor: deviations.map(d => Math.abs(d) >= 10 ? '#ef4444' : Math.abs(d) >= 5 ? '#eab308' : '#22c55e'),
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
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: {
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
                        borderColor: 'rgba(139, 92, 246, 0.3)',
                        borderWidth: 1,
                        cornerRadius: 8,
                        padding: 12,
                        titleFont: { family: 'Inter', weight: 600 },
                        bodyFont: { family: 'Inter' },
                        callbacks: {
                            title: (items) => `Chainage: ${items[0].label} km`,
                            label: (item) => {
                                const d = item.parsed.y;
                                const actual = d + 1676;
                                const status = Math.abs(d) >= 10 ? '🔴 Critical' : Math.abs(d) >= 5 ? '🟡 Warning' : '🟢 Normal';
                                return [`Deviation: ${d > 0 ? '+' : ''}${d} mm`, `Actual: ${actual} mm — ${status}`];
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Chainage (km)',
                            color: '#94a3b8',
                            font: { family: 'Inter', size: 12, weight: 500 }
                        },
                        grid: { color: 'rgba(139, 92, 246, 0.06)' },
                        ticks: { color: '#64748b', font: { family: 'Inter', size: 11 } }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Deviation from 1676mm (mm)',
                            color: '#94a3b8',
                            font: { family: 'Inter', size: 12, weight: 500 }
                        },
                        grid: { color: 'rgba(139, 92, 246, 0.06)' },
                        ticks: {
                            color: '#64748b',
                            font: { family: 'Inter', size: 11 },
                            callback: (v) => (v > 0 ? '+' : '') + v
                        }
                    }
                }
            },
            plugins: [{
                id: 'deviationBands',
                beforeDraw(chart) {
                    const { ctx, chartArea, scales: { y } } = chart;
                    ctx.save();

                    // Acceptable ±5mm band
                    const yTop5 = y.getPixelForValue(5);
                    const yBot5 = y.getPixelForValue(-5);
                    ctx.fillStyle = 'rgba(34, 197, 94, 0.04)';
                    ctx.fillRect(chartArea.left, yTop5, chartArea.width, yBot5 - yTop5);

                    // Nominal line at 0
                    const y0 = y.getPixelForValue(0);
                    ctx.strokeStyle = 'rgba(99, 102, 241, 0.3)';
                    ctx.lineWidth = 1.5;
                    ctx.setLineDash([8, 4]);
                    ctx.beginPath();
                    ctx.moveTo(chartArea.left, y0);
                    ctx.lineTo(chartArea.right, y0);
                    ctx.stroke();

                    // Warning ±10mm lines
                    [10, -10].forEach(val => {
                        const yVal = y.getPixelForValue(val);
                        ctx.strokeStyle = 'rgba(239, 68, 68, 0.3)';
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.moveTo(chartArea.left, yVal);
                        ctx.lineTo(chartArea.right, yVal);
                        ctx.stroke();
                    });

                    ctx.restore();
                }
            }]
        });
    }

    function updateStatus(status) {
        const el = document.getElementById('status-gauge');
        if (!el) return;
        const text = el.querySelector('.status-text');
        el.className = 'panel-status' + (status === 'live' ? ' live' : status === 'error' ? ' error' : '');
        text.textContent = status === 'live' ? 'Live' : status === 'error' ? 'Error' : 'Demo Data';
    }

    function init() {
        ds = new DataSource('gauge');
        ds.onData = (data) => {
            if (data && data.labels && data.gauges) {
                createChart(data.labels, data.gauges);
            }
        };
        ds.onStatusChange = updateStatus;

        if (ds.isConfigured()) {
            ds.start();
        } else {
            createChart(demoData.labels, demoData.gauges);
            updateStatus('demo');
        }
    }

    function restart() {
        if (ds) {
            ds.restart();
            if (!ds.isConfigured()) {
                createChart(demoData.labels, demoData.gauges);
                updateStatus('demo');
            }
        }
    }

    return { init, restart };
})();
