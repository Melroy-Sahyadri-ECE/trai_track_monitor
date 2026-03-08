/* ========================================
   Events Table — Dynamic HTML Table
   Timestamp, chainage, verdict, scores, gauge
   ======================================== */

const EventsTable = (() => {
    let ds = null;

    const demoData = [
        { timestamp: '2026-03-07 21:45:12', chainage: 5.5, verdict: 'green', score: 9, gauge: 1675 },
        { timestamp: '2026-03-07 21:44:58', chainage: 5.1, verdict: 'green', score: 16, gauge: 1677 },
        { timestamp: '2026-03-07 21:44:30', chainage: 4.7, verdict: 'red', score: 85, gauge: 1695 },
        { timestamp: '2026-03-07 21:44:15', chainage: 4.3, verdict: 'green', score: 11, gauge: 1676 },
        { timestamp: '2026-03-07 21:43:50', chainage: 3.9, verdict: 'yellow', score: 38, gauge: 1678 },
        { timestamp: '2026-03-07 21:43:32', chainage: 3.5, verdict: 'green', score: 8, gauge: 1676 },
        { timestamp: '2026-03-07 21:43:10', chainage: 3.1, verdict: 'green', score: 20, gauge: 1675 },
        { timestamp: '2026-03-07 21:42:55', chainage: 2.7, verdict: 'yellow', score: 45, gauge: 1682 },
        { timestamp: '2026-03-07 21:42:30', chainage: 2.3, verdict: 'red', score: 78, gauge: 1690 },
        { timestamp: '2026-03-07 21:42:10', chainage: 1.9, verdict: 'green', score: 14, gauge: 1674 },
        { timestamp: '2026-03-07 21:41:50', chainage: 1.5, verdict: 'green', score: 18, gauge: 1676 },
        { timestamp: '2026-03-07 21:41:30', chainage: 1.1, verdict: 'yellow', score: 42, gauge: 1680 },
        { timestamp: '2026-03-07 21:41:05', chainage: 0.7, verdict: 'green', score: 10, gauge: 1677 },
        { timestamp: '2026-03-07 21:40:45', chainage: 0.3, verdict: 'green', score: 15, gauge: 1675 },
        { timestamp: '2026-03-07 21:40:20', chainage: 0.0, verdict: 'green', score: 12, gauge: 1676 },
    ];

    function verdictBadgeHTML(verdict) {
        const icon = verdict === 'green' ? '✓' : verdict === 'yellow' ? '⚠' : '✕';
        return `<span class="verdict-badge ${verdict}">${icon} ${verdict.charAt(0).toUpperCase() + verdict.slice(1)}</span>`;
    }

    function renderTable(data) {
        const tbody = document.getElementById('events-tbody');
        if (!tbody) return;

        tbody.innerHTML = '';
        data.forEach((row, i) => {
            const tr = document.createElement('tr');
            if (i === 0) tr.classList.add('new-row');

            const deviation = row.gauge - 1676;
            const deviationStr = (deviation >= 0 ? '+' : '') + deviation + ' mm';
            const deviationColor = Math.abs(deviation) >= 10 ? '#ef4444' : Math.abs(deviation) >= 5 ? '#eab308' : '#22c55e';

            tr.innerHTML = `
                <td style="font-variant-numeric: tabular-nums; white-space: nowrap;">${row.timestamp}</td>
                <td>${row.chainage} km</td>
                <td>${verdictBadgeHTML(row.verdict)}</td>
                <td>
                    <span style="color: ${row.score >= 70 ? '#ef4444' : row.score >= 35 ? '#eab308' : '#22c55e'}; font-weight: 600;">
                        ${row.score}
                    </span>
                </td>
                <td>
                    ${row.gauge} mm
                    <span style="color: ${deviationColor}; font-size: 0.78rem; margin-left: 6px;">(${deviationStr})</span>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    function updateStatus(status) {
        const el = document.getElementById('status-events');
        if (!el) return;
        const text = el.querySelector('.status-text');
        el.className = 'panel-status' + (status === 'live' ? ' live' : status === 'error' ? ' error' : '');
        text.textContent = status === 'live' ? 'Live' : status === 'error' ? 'Error' : 'Demo Data';
    }

    function init() {
        ds = new DataSource('events');
        ds.onData = (data) => {
            if (Array.isArray(data)) renderTable(data);
        };
        ds.onStatusChange = updateStatus;

        if (ds.isConfigured()) {
            ds.start();
        } else {
            renderTable(demoData);
            updateStatus('demo');
        }
    }

    function restart() {
        if (ds) {
            ds.restart();
            if (!ds.isConfigured()) {
                renderTable(demoData);
                updateStatus('demo');
            }
        }
    }

    return { init, restart };
})();
