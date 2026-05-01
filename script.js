let parsedData = {};
let timeArray = [];
let chartTraces = [];
let rawKeys = [];

const colors = [
    '#00bfff', '#ff3366', '#00ff00', '#ffeb3b', '#ff8c00', 
    '#da70d6', '#00fa9a', '#ff1493', '#1e90ff', '#ff4500'
];

document.getElementById('csv-file').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    document.getElementById('upload-btn-text').innerText = file.name;
    const reader = new FileReader();
    
    reader.readAsText(file, 'windows-1250');
    reader.onload = function(e) {
        parseVcdsCSV(e.target.result);
    };
});

function parseVcdsCSV(text) {
    const lines = text.split('\n');
    let rows = lines.map(line => line.split(',').map(cell => cell.trim()));

    let headerRowIdx = rows.findIndex(row => row.includes('ZAPISU') || row.includes('STAMP'));
    if (headerRowIdx === -1) headerRowIdx = 0;

    const headerRow = rows[headerRowIdx];
    const unitRow = (rows.length > headerRowIdx + 1) ? rows[headerRowIdx + 1] : [];
    const dataStartIndex = headerRowIdx + 2;

    parsedData = {};
    timeArray = [];
    rawKeys = [];
    const validColumns = [];
    let timeIndex = -1;

    for (let i = 0; i < headerRow.length; i++) {
        let h = headerRow[i];
        if (!h) continue;

        if ((h === 'ZAPISU' || h === 'STAMP' || h === 'CZAS') && timeIndex === -1) {
            timeIndex = i;
            continue;
        }
        if (['ZAPISU', 'STAMP', 'Znacznik', 'MARKER'].includes(h)) continue;

        let unit = unitRow[i] ? unitRow[i].replace(/"/g, '') : '';
        let colName = h.replace(/"/g, '') + (unit ? ` (${unit})` : '');
        
        parsedData[colName] = [];
        validColumns.push({ index: i, name: colName });
        rawKeys.push(colName);
    }

    if (timeIndex === -1) timeIndex = 0;

    for (let i = dataStartIndex; i < rows.length; i++) {
        let row = rows[i];
        if (row.length <= timeIndex || !row[timeIndex]) continue;

        let t = parseFloat(row[timeIndex]);
        if (isNaN(t)) continue;

        timeArray.push(t);
        validColumns.forEach(col => {
            let val = parseFloat(row[col.index]);
            parsedData[col.name].push(isNaN(val) ? null : val);
        });
    }

    buildParameterList(validColumns);
    document.getElementById('placeholder').style.display = 'none';
    document.getElementById('stats-panel').style.display = 'flex';
    runLogAnalysis();
}

function matchKey(keys, conditions) {
    return keys.find(k => {
        let kLower = k.toLowerCase();
        return conditions.every(cond => kLower.includes(cond));
    });
}

function runLogAnalysis() {
    let speedKey = matchKey(rawKeys, ['speed', 'km/h']) || matchKey(rawKeys, ['prędkość', 'km/h']);
    let injKey = matchKey(rawKeys, ['injection', 'actual']) || matchKey(rawKeys, ['dawka']) || matchKey(rawKeys, ['injection quantity']);
    let boostKey = matchKey(rawKeys, ['actual', 'press']) || matchKey(rawKeys, ['rzeczywiste', 'ciśnienie']) || matchKey(rawKeys, ['doładowania', 'rzeczywiste']);
    
    if (speedKey) {
        let maxSpeed = Math.max(...parsedData[speedKey].filter(n => n !== null));
        document.getElementById('stat-vmax').innerHTML = `<span class="highlight">${maxSpeed}</span> km/h`;
    } else {
        document.getElementById('stat-vmax').innerText = "None (km/h)";
    }

    if (injKey && boostKey) {
        let maxInj = -1;
        let maxInjIdx = -1;
        for(let i = 0; i < parsedData[injKey].length; i++) {
            if(parsedData[injKey][i] !== null && parsedData[injKey][i] > maxInj) {
                maxInj = parsedData[injKey][i];
                maxInjIdx = i;
            }
        }
        if(maxInjIdx !== -1) {
            let boostAtMaxInj = parsedData[boostKey][maxInjIdx];
            document.getElementById('stat-fuel').innerHTML = `<span class="highlight">${maxInj}</span> mg <span style="font-size: 0.8rem; color: #aaa; font-weight: normal;">at</span> <span class="highlight">${boostAtMaxInj}</span> mbar`;
        }
    } else {
        document.getElementById('stat-fuel').innerText = "Missing fuel/turbo columns";
    }
}

document.getElementById('calc-accel-btn').addEventListener('click', function() {
    let speedKey = matchKey(rawKeys, ['speed', 'km/h']) || matchKey(rawKeys, ['prędkość', 'km/h']);
    let pedalKey = matchKey(rawKeys, ['pedal']) || matchKey(rawKeys, ['pedał']) || matchKey(rawKeys, ['throttle pos']);
    const resElement = document.getElementById('accel-result');

    if(!speedKey) {
        resElement.innerText = "None (km/h)";
        resElement.style.color = 'var(--danger-color)';
        return;
    }

    let startV = parseFloat(document.getElementById('accel-start').value);
    let endV = parseFloat(document.getElementById('accel-end').value);
    
    if(isNaN(startV) || isNaN(endV) || startV >= endV) {
        resElement.innerText = "Error!";
        resElement.style.color = 'var(--danger-color)';
        return;
    }

    let speeds = parsedData[speedKey];
    let times = timeArray;
    let pedals = pedalKey ? parsedData[pedalKey] : null;
    let runs = [];

    for(let i = 1; i < speeds.length; i++) {
        if(speeds[i] === null || speeds[i-1] === null) continue;

        if(speeds[i-1] <= startV && speeds[i] >= startV && speeds[i] > speeds[i-1]) {
            let t_start = times[i];
            
            if (startV === 0) {
                t_start = times[i-1];
            } else if (speeds[i] > startV && speeds[i-1] < startV) {
                let ratio = (startV - speeds[i-1]) / (speeds[i] - speeds[i-1]);
                t_start = times[i-1] + ratio * (times[i] - times[i-1]);
            }

            let maxPedal = 0;
            let currentRunMaxSpeed = speeds[i];
            let isValid = false;

            for(let j = i; j < speeds.length; j++) {
                if (pedals && pedals[j] !== null && pedals[j] > maxPedal) maxPedal = pedals[j];
                if (speeds[j] > currentRunMaxSpeed) currentRunMaxSpeed = speeds[j];
                
                if (currentRunMaxSpeed - speeds[j] > 10) break;

                if (speeds[j] >= endV) {
                    let t_end = times[j];
                    if (speeds[j] > endV && speeds[j-1] < endV) {
                        let ratio = (endV - speeds[j-1]) / (speeds[j] - speeds[j-1]);
                        t_end = times[j-1] + ratio * (times[j] - times[j-1]);
                    }
                    
                    if (!pedals || maxPedal >= 75) {
                        runs.push(parseFloat((t_end - t_start).toFixed(2)));
                        isValid = true;
                    }
                    break;
                }
            }
            if (isValid) i += 5;
        }
    }

    if(runs.length > 0) {
        let bestRun = Math.min(...runs);
        resElement.innerText = `${bestRun} s`;
        resElement.style.color = 'var(--success-color)';
    } else {
        resElement.innerText = "No attempt found";
        resElement.style.color = 'var(--danger-color)';
    }
});

function buildParameterList(columns) {
    const listContainer = document.getElementById('parameter-list');
    listContainer.innerHTML = '';
    chartTraces = [];
    const baseOffsetMs = new Date(0).getTimezoneOffset() * 60000;

    let timeArrayDates = timeArray.map(t => new Date((t * 1000) + baseOffsetMs));

    columns.forEach((col, idx) => {
        const paramName = col.name;
        const color = colors[idx % colors.length];

        chartTraces.push({
            x: timeArrayDates,
            y: parsedData[paramName],
            name: paramName,
            type: 'scatter',
            mode: 'lines',
            line: { color: color, width: 2 },
            visible: false
        });

        const itemDiv = document.createElement('div');
        itemDiv.className = 'param-item';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `chk-${idx}`;
        checkbox.dataset.traceIndex = idx;
        
        const label = document.createElement('label');
        label.htmlFor = `chk-${idx}`;
        label.innerText = paramName;
        label.title = paramName;

        checkbox.addEventListener('change', function() {
            const tIdx = parseInt(this.dataset.traceIndex);
            if (this.checked) itemDiv.classList.add('active');
            else itemDiv.classList.remove('active');
            
            Plotly.restyle('chart-container', {visible: this.checked ? true : false}, [tIdx]);
        });

        itemDiv.appendChild(checkbox);
        itemDiv.appendChild(label);
        listContainer.appendChild(itemDiv);
    });

    initPlotly();
}

function initPlotly() {
    let maxT = Math.max(...timeArray);
    if (!isFinite(maxT)) maxT = 60;
    let hoverFmt = '%S.%L s';
    if (maxT >= 3600) {
        hoverFmt = '%H h %M min %S.%L s';
    } else if (maxT >= 60) {
        hoverFmt = '%M min %S.%L s';
    }

    const layout = {
        paper_bgcolor: 'transparent',
        plot_bgcolor: 'rgba(255, 255, 255, 0.05)',
        font: { color: '#e0e0e0' },
        xaxis: { 
            title: 'Logging Time', 
            type: 'date',
            tickformatstops: [
                { dtickrange: [null, 1000], value: '%S.%L s' },
                { dtickrange: [1000, 60000], value: '%S s' },
                { dtickrange: [60000, 3600000], value: '%M min %S s' },
                { dtickrange: [3600000, null], value: '%H h %M min' }
            ],
            hoverformat: hoverFmt,
            gridcolor: '#444', 
            zerolinecolor: '#666',
            spikemode: 'across', spikesnap: 'cursor', showspikes: true, spikethickness: 1, spikedash: 'dot', spikecolor: '#888' 
        },
        yaxis: { title: 'Value', gridcolor: '#444', zerolinecolor: '#666' },
        hovermode: 'x unified',
        hoverlabel: { bgcolor: '#1e1e1e', bordercolor: '#555', font: { color: '#ffffff', size: 13, family: "'Inter', 'Segoe UI', sans-serif" } },
        margin: { t: 40, r: 40, b: 60, l: 60 },
        showlegend: true,
        legend: { orientation: 'h', yanchor: 'bottom', y: 1.02, xanchor: 'right', x: 1 }
    };

    const config = { responsive: true, displaylogo: false, modeBarButtonsToRemove: ['lasso2d', 'select2d'] };
    
    Plotly.newPlot('chart-container', chartTraces, layout, config).then(() => {
        window.dispatchEvent(new Event('resize'));
    });
}