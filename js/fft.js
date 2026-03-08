/* ========================================
   Live FFT — Chart.js Bar Chart
   Real-time frequency spectrum
   ======================================== */

const LiveFFT = (() => {
    let chart = null;
    let ds = null;

    // Generate demo FFT data (simulated frequency bins)
    function generateDemoFFT() {
        const frequencies = [];
        const amplitudes = [];
        for (let f = 0; f <= 500; f += 10) {
            frequencies.push(f);
            // Simulated peaks at certain frequencies
            let amp = Math.random() * 5;
            if (f >= 40 && f <= 60) amp += 25 + Math.random() * 15;   // dominant ~50Hz
            if (f >= 90 && f <= 110) amp += 15 + Math.random() * 10;  // harmonic ~100Hz
            if (f >= 140 && f <= 160) amp += 8 + Math.random() * 6;   // 3rd harmonic
            if (f >= 240 && f <= 260) amp += 5 + Math.random() * 4;   // broadband
            amplitudes.push(Math.round(amp * 10) / 10);
        }
        return { frequencies, amplitudes };
    }

    function getBarColors(amplitudes) {
        return amplitudes.map(a => {
            if (a >= 30) return 'rgba(239, 68, 68, 0.85)';
            if (a >= 20) return 'rgba(234, 179, 8, 0.85)';
            if (a >= 10) return 'rgba(99, 102, 241, 0.85)';
            return 'rgba(99, 102, 241, 0.45)';
        });
    }

    function createChart(frequencies, amplitudes) {
        const canvas = document.getElementById('fft-chart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        if (chart) {
            // Update existing chart data
            chart.data.labels = frequencies;
            chart.data.datasets[0].data = amplitudes;
            chart.data.datasets[0].backgroundColor = getBarColors(amplitudes);
            chart.update('none');
            return;
        }

        chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: frequencies,
                datasets: [{
                    label: 'Amplitude',
                    data: amplitudes,
                    backgroundColor: getBarColors(amplitudes),
                    borderColor: 'transparent',
                    borderWidth: 0,
                    borderRadius: 2,
                    barPercentage: 0.9,
                    categoryPercentage: 0.95
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 200 },
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: {
                        labels: {
                            color: '#94a3b8',
                            font: { family: 'Inter', size: 12, weight: 500 },
                            usePointStyle: true,
                            pointStyle: 'rect'
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
                            title: (items) => `Frequency: ${items[0].label} Hz`,
                            label: (item) => `Amplitude: ${item.parsed.y}`
                        }
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Frequency (Hz)',
                            color: '#94a3b8',
                            font: { family: 'Inter', size: 12, weight: 500 }
                        },
                        grid: { display: false },
                        ticks: {
                            color: '#64748b',
                            font: { family: 'Inter', size: 10 },
                            maxTicksLimit: 20
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Amplitude',
                            color: '#94a3b8',
                            font: { family: 'Inter', size: 12, weight: 500 }
                        },
                        grid: { color: 'rgba(99, 102, 241, 0.06)' },
                        ticks: { color: '#64748b', font: { family: 'Inter', size: 11 } }
                    }
                }
            }
        });
    }

    let demoTimer = null;

    function startDemoAnimation() {
        stopDemoAnimation();
        const demo = generateDemoFFT();
        createChart(demo.frequencies, demo.amplitudes);
        demoTimer = setInterval(() => {
            const demo = generateDemoFFT();
            createChart(demo.frequencies, demo.amplitudes);
        }, 1000);
    }

    function stopDemoAnimation() {
        if (demoTimer) {
            clearInterval(demoTimer);
            demoTimer = null;
        }
    }

    function updateStatus(status) {
        const el = document.getElementById('status-fft');
        if (!el) return;
        const text = el.querySelector('.status-text');
        el.className = 'panel-status' + (status === 'live' ? ' live' : status === 'error' ? ' error' : '');
        text.textContent = status === 'live' ? 'Live' : status === 'error' ? 'Error' : 'Demo Data';
    }

    function init() {
        ds = new DataSource('fft');
        ds.onData = (data) => {
            if (data && data.frequencies && data.amplitudes) {
                stopDemoAnimation();
                createChart(data.frequencies, data.amplitudes);
            }
        };
        ds.onStatusChange = updateStatus;

        if (ds.isConfigured()) {
            ds.start();
        } else {
            startDemoAnimation();
            updateStatus('demo');
        }
    }

    function restart() {
        if (ds) {
            ds.restart();
            if (!ds.isConfigured()) {
                startDemoAnimation();
                updateStatus('demo');
            } else {
                stopDemoAnimation();
            }
        }
    }

    return { init, restart, stopDemoAnimation, startDemoAnimation };
})();
