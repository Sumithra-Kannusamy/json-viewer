document.addEventListener('DOMContentLoaded', () => {
    const jsonInput = document.getElementById('json-input');
    const outputContainer = document.getElementById('json-output-container');
    const errorMessage = document.getElementById('error-message');
    const copyJsonBtn = document.getElementById('copy-json-btn');
    const downloadCsvBtn = document.getElementById('download-csv-btn');
    const themeToggleBtn = document.getElementById('theme-toggle-btn');

    let parsedJson = null;

    // --- Event Listeners ---
    jsonInput.addEventListener('input', handleJsonInput);
    copyJsonBtn.addEventListener('click', copyJsonToClipboard);
    downloadCsvBtn.addEventListener('click', downloadTableAsCsv);
    themeToggleBtn.addEventListener('click', toggleTheme);
    outputContainer.addEventListener('click', handleTableCollapse);

    // --- Core Functionality ---
    function handleJsonInput() {
        const jsonString = jsonInput.value.trim();
        if (!jsonString) {
            clearOutput();
            return;
        }

        try {
            parsedJson = JSON.parse(jsonString);
            displayJsonAsTable(parsedJson);
            hideError();
        } catch (error) {
            parsedJson = null;
            showError(`Invalid JSON: ${error.message}`);
            clearOutput();
        }
    }

    function displayJsonAsTable(json) {
        const table = document.createElement('table');
        table.className = 'json-table';
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Key / Index</th>
                    <th>Value</th>
                    <th>Type</th>
                </tr>
            </thead>
            <tbody>
                ${buildTableRows(json, '', 0)}
            </tbody>
        `;
        outputContainer.innerHTML = '';
        outputContainer.appendChild(table);
    }

    function buildTableRows(data, parentKey, level) {
        let html = '';
        const isArray = Array.isArray(data);

        for (const key in data) {
            if (Object.prototype.hasOwnProperty.call(data, key)) {
                const value = data[key];
                const displayKey = isArray ? `[${key}]` : key;
                const fullKey = parentKey ? `${parentKey}-${key}` : key;
                const isObject = typeof value === 'object' && value !== null;

                if (isObject) {
                    const childRows = buildTableRows(value, fullKey, level + 1);
                    const type = Array.isArray(value) ? `Array[${value.length}]` : `Object`;
                    html += `
                        <tr class="collapsible" data-target="${fullKey}">
                            <td class="key-cell" style="padding-left: ${1 + level * 1.5}rem;">${displayKey}</td>
                            <td></td>
                            <td class="type-cell">${type}</td>
                        </tr>
                        ${childRows}
                    `;
                } else {
                    html += `
                        <tr class="data-row" data-parent="${parentKey}">
                            <td class="key-cell" style="padding-left: ${1 + level * 1.5}rem;">${displayKey}</td>
                            <td>${formatValue(value)}</td>
                            <td class="type-cell">${typeof value}</td>
                        </tr>
                    `;
                }
            }
        }
        return html;
    }

    function handleTableCollapse(event) {
        const headerRow = event.target.closest('.collapsible');
        if (!headerRow) return;

        headerRow.classList.toggle('expanded');
        const targetKey = headerRow.dataset.target;
        
        // Find all direct children rows and toggle them
        const allRows = outputContainer.querySelectorAll('tbody tr');
        allRows.forEach(row => {
            const parent = row.dataset.parent;
            if (parent === targetKey) {
                row.classList.toggle('show');
                // If this child is also a collapsed parent, we don't show its children
                if (row.classList.contains('collapsible') && !row.classList.contains('expanded')) {
                    hideNestedChildren(row.dataset.target);
                }
            }
        });
    }

    function hideNestedChildren(parentKey) {
        const allRows = outputContainer.querySelectorAll('tbody tr');
        allRows.forEach(row => {
            const parent = row.dataset.parent;
            if (parent && parent.startsWith(parentKey)) {
                row.classList.remove('show');
            }
        });
    }

    // --- Bonus Features ---
    function copyJsonToClipboard() {
        if (jsonInput.value) {
            navigator.clipboard.writeText(jsonInput.value)
                .then(() => alert('JSON copied to clipboard!'))
                .catch(err => alert('Failed to copy JSON.'));
        } else {
            alert('Nothing to copy.');
        }
    }

    function downloadTableAsCsv() {
        if (!parsedJson) {
            alert('No valid JSON to convert to CSV.');
            return;
        }

        const flattenedData = flattenJson(parsedJson);
        if (flattenedData.length === 0) {
            alert('Cannot convert this JSON structure to CSV.');
            return;
        }

        const headers = Object.keys(flattenedData[0]);
        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += headers.join(",") + "\r\n";

        flattenedData.forEach(row => {
            const values = headers.map(header => {
                const escaped = ('' + (row[header] || '')).replace(/"/g, '""');
                return `"${escaped}"`;
            });
            csvContent += values.join(",") + "\r\n";
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "table_data.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    function flattenJson(json) {
        const result = [];
        const data = Array.isArray(json) ? json : [json];

        const allKeys = new Set();
        const processedData = data.map(item => {
            const flat = {};
            function recurse(current, prop) {
                if (Object(current) !== current) {
                    flat[prop] = current;
                } else if (Array.isArray(current)) {
                    if (current.every(i => typeof i !== 'object')) {
                        flat[prop] = current.join('; ');
                    } else {
                        // For simplicity, skipping arrays of objects in CSV.
                        // A more complex implementation could handle this.
                    }
                } else {
                    for (const key in current) {
                        const newProp = prop ? `${prop}.${key}` : key;
                        recurse(current[key], newProp);
                    }
                }
            }
            recurse(item, '');
            Object.keys(flat).forEach(key => allKeys.add(key));
            return flat;
        });
        
        // Normalize all objects to have the same keys
        const headers = Array.from(allKeys);
        return processedData.map(item => {
            const normalizedItem = {};
            headers.forEach(header => {
                normalizedItem[header] = item[header] !== undefined ? item[header] : '';
            });
            return normalizedItem;
        });
    }

    function toggleTheme() {
        document.documentElement.classList.toggle('light-mode');
        const isLight = document.documentElement.classList.contains('light-mode');
        localStorage.setItem('theme', isLight ? 'light' : 'dark');
    }

    // --- Helpers ---
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
    }

    function hideError() {
        errorMessage.style.display = 'none';
    }

    function clearOutput() {
        outputContainer.innerHTML = '<p class="placeholder-text">Valid JSON will be displayed here.</p>';
    }

    function formatValue(value) {
        if (typeof value === 'string') {
            return `"${value}"`;
        }
        return value;
    }

    // --- Initial Setup ---
    function initialize() {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'light') {
            document.documentElement.classList.add('light-mode');
        }
        
        // Add some sample JSON
        const sampleJson = {
            "id": "001",
            "type": "donut",
            "name": "Cake",
            "ppu": 0.55,
            "is_delicious": true,
            "batters": {
                "batter": [
                    { "id": "1001", "type": "Regular" },
                    { "id": "1002", "type": "Chocolate" },
                    { "id": "1003", "type": "Blueberry" }
                ]
            },
            "topping": [
                { "id": "5001", "type": "None" },
                { "id": "5002", "type": "Glazed" }
            ]
        };
        jsonInput.value = JSON.stringify(sampleJson, null, 2);
        handleJsonInput();
    }

    initialize();
});
