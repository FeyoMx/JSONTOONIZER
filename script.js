document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const jsonInput = document.getElementById('json-input');
    const toonOutput = document.getElementById('toon-output');
    const convertBtn = document.getElementById('convert-btn');
    const reverseBtn = document.getElementById('reverse-btn');
    const copyBtn = document.getElementById('copy-btn');
    const downloadBtn = document.getElementById('download-btn');
    const exampleBtn = document.getElementById('example-btn');
    const jsonStats = document.getElementById('json-stats');
    const toonStats = document.getElementById('toon-stats');
    const tokenStats = document.getElementById('token-stats');
    const savingsStats = document.getElementById('savings-stats');
    const dragOverlay = document.getElementById('drag-overlay');

    // Example Data
    const exampleData = {
        "users": [
            { "id": 1, "name": "Sreeni", "role": "admin", "email": "sreeni@example.com" },
            { "id": 2, "name": "Krishna", "role": "admin", "email": "krishna@example.com" },
            { "id": 3, "name": "Aaron", "role": "user", "email": "aaron@example.com" }
        ],
        "metadata": {
            "total": 3,
            "last_updated": "2024-01-15T10:30:00Z"
        }
    };

    // Event Listeners
    convertBtn.addEventListener('click', handleConvert);
    reverseBtn.addEventListener('click', handleReverseConvert);
    copyBtn.addEventListener('click', handleCopy);
    downloadBtn.addEventListener('click', handleDownload);
    exampleBtn.addEventListener('click', loadExample);
    jsonInput.addEventListener('input', updateStats);
    toonOutput.addEventListener('input', updateStats); // If user edits TOON manually

    // Drag & Drop
    document.addEventListener('dragover', (e) => {
        e.preventDefault();
        dragOverlay.classList.remove('hidden');
    });

    document.addEventListener('dragleave', (e) => {
        if (e.relatedTarget === null) {
            dragOverlay.classList.add('hidden');
        }
    });

    document.addEventListener('drop', (e) => {
        e.preventDefault();
        dragOverlay.classList.add('hidden');

        if (e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0];
            if (file.type === 'application/json' || file.name.endsWith('.json')) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    jsonInput.value = event.target.result;
                    updateStats();
                    handleConvert();
                };
                reader.readAsText(file);
            } else {
                alert('Please drop a valid JSON file.');
            }
        }
    });

    // Functions
    function loadExample() {
        jsonInput.value = JSON.stringify(exampleData, null, 2);
        updateStats();
        handleConvert();
    }

    function updateStats() {
        const jsonLen = jsonInput.value.length;
        const toonLen = toonOutput.innerText.length; // Use innerText for div

        jsonStats.textContent = `${jsonLen} chars`;
        toonStats.textContent = `${toonLen} chars`;

        // Estimate tokens (approx 4 chars per token)
        const jsonTokens = Math.ceil(jsonLen / 4);
        const toonTokens = Math.ceil(toonLen / 4);
        const savings = jsonTokens > 0 ? ((jsonTokens - toonTokens) / jsonTokens * 100).toFixed(1) : 0;

        tokenStats.textContent = `~${toonTokens} tokens`;
        savingsStats.textContent = `${savings}% saved`;

        if (savings > 0) {
            savingsStats.className = 'stats success';
        } else {
            savingsStats.className = 'stats';
        }
    }

    function handleConvert() {
        const input = jsonInput.value.trim();
        if (!input) {
            toonOutput.innerText = '';
            return;
        }

        try {
            const json = JSON.parse(input);
            const toon = convertToToon(json);
            // Apply Syntax Highlighting
            toonOutput.innerHTML = highlightToon(toon);
            updateStats();
        } catch (e) {
            toonOutput.innerHTML = `<span style="color: #ef4444;">Error: Invalid JSON\n${e.message}</span>`;
        }
    }

    function handleReverseConvert() {
        const input = toonOutput.innerText.trim(); // Get raw text
        if (!input) return;

        try {
            const json = parseToon(input);
            jsonInput.value = JSON.stringify(json, null, 2);
            updateStats();
        } catch (e) {
            alert(`Error parsing TOON: ${e.message}`);
        }
    }

    function handleCopy() {
        const text = toonOutput.innerText;
        if (!text) return;
        navigator.clipboard.writeText(text).then(() => {
            const originalIcon = copyBtn.innerHTML;
            copyBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
            setTimeout(() => {
                copyBtn.innerHTML = originalIcon;
            }, 2000);
        });
    }

    function handleDownload() {
        const text = toonOutput.innerText;
        if (!text) return;
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'converted.toon';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // --- TOON Conversion Logic (JSON -> TOON) ---
    function convertToToon(obj, indent = 0) {
        let result = '';
        const spacing = '  '.repeat(indent);

        if (typeof obj !== 'object' || obj === null) {
            return String(obj);
        }

        const keys = Object.keys(obj);

        for (const key of keys) {
            const value = obj[key];

            // Case 1: Array of Objects
            if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object' && value[0] !== null) {
                const allSubKeys = new Set();
                value.forEach(item => {
                    if (typeof item === 'object' && item !== null) {
                        Object.keys(item).forEach(k => allSubKeys.add(k));
                    }
                });
                const subKeys = Array.from(allSubKeys);

                result += `${spacing}${key}[${value.length}]{${subKeys.join(',')}}: `;

                const rows = value.map(item => {
                    return subKeys.map(k => {
                        const val = item[k];
                        return formatValue(val);
                    }).join(',');
                });

                result += rows.join(' ') + '\n';
            }
            // Case 2: Single Object
            else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                const subKeys = Object.keys(value);
                const isFlat = subKeys.every(k => typeof value[k] !== 'object' || value[k] === null);

                if (isFlat && subKeys.length > 0) {
                    result += `${spacing}${key}{${subKeys.join(',')}}: `;
                    const vals = subKeys.map(k => formatValue(value[k])).join(',');
                    result += vals + '\n';
                } else {
                    result += `${spacing}${key}:\n`;
                    result += convertToToon(value, indent + 1);
                }
            }
            // Case 3: Primitive or Array of Primitives
            else {
                result += `${spacing}${key}: ${formatValue(value)}\n`;
            }
        }

        return result;
    }

    function formatValue(val) {
        if (val === null) return 'null';
        if (val === undefined) return '';
        if (typeof val === 'string') return val; // Keep simple for now
        if (Array.isArray(val)) return `[${val.map(formatValue).join(',')}]`;
        if (typeof val === 'object') return JSON.stringify(val);
        return String(val);
    }

    // --- TOON Parser Logic (TOON -> JSON) ---
    function parseToon(toonString) {
        const lines = toonString.split('\n').filter(line => line.trim() !== '');
        const root = {};
        const stack = [{ obj: root, indent: -1 }];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const indent = line.search(/\S/); // Count leading spaces
            const trimmed = line.trim();

            // Find parent based on indentation
            while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
                stack.pop();
            }
            const parent = stack[stack.length - 1].obj;

            // Regex for different patterns
            // 1. Array of Objects: key[count]{k1,k2}: v1,v2 v3,v4
            const arrayMatch = trimmed.match(/^(\w+)\[\d+\]\{([^}]+)\}:\s*(.*)$/);
            // 2. Single Object: key{k1,k2}: v1,v2
            const objectMatch = trimmed.match(/^(\w+)\{([^}]+)\}:\s*(.*)$/);
            // 3. Nested Object Start: key:
            const nestedMatch = trimmed.match(/^(\w+):$/);
            // 4. Primitive: key: value
            const primitiveMatch = trimmed.match(/^(\w+):\s*(.*)$/);

            if (arrayMatch) {
                const key = arrayMatch[1];
                const keys = arrayMatch[2].split(',');
                const valuesStr = arrayMatch[3];
                // Split by space but respect brackets if any (simple split for now, assuming no spaces in values)
                // TODO: Better splitting for values with spaces
                const rowStrings = valuesStr.split(' ');

                const arr = rowStrings.map(row => {
                    const vals = row.split(',');
                    const obj = {};
                    keys.forEach((k, idx) => {
                        obj[k] = parseValue(vals[idx]);
                    });
                    return obj;
                });
                parent[key] = arr;
            } else if (objectMatch) {
                const key = objectMatch[1];
                const keys = objectMatch[2].split(',');
                const vals = objectMatch[3].split(',');
                const obj = {};
                keys.forEach((k, idx) => {
                    obj[k] = parseValue(vals[idx]);
                });
                parent[key] = obj;
            } else if (nestedMatch) {
                const key = nestedMatch[1];
                const newObj = {};
                parent[key] = newObj;
                stack.push({ obj: newObj, indent: indent });
            } else if (primitiveMatch) {
                const key = primitiveMatch[1];
                const val = primitiveMatch[2];
                parent[key] = parseValue(val);
            }
        }
        return root;
    }

    function parseValue(val) {
        if (val === 'null') return null;
        if (!isNaN(val) && val.trim() !== '') return Number(val);
        if (val === 'true') return true;
        if (val === 'false') return false;
        if (val.startsWith('[') && val.endsWith(']')) {
            // Simple array parser
            return val.slice(1, -1).split(',').map(parseValue);
        }
        return val;
    }

    // --- Syntax Highlighting ---
    function highlightToon(text) {
        // Escape HTML first
        let html = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

        // Highlight Headers: key[...]{...}: or key{...}:
        html = html.replace(/^(\s*)(\w+)(\[.*?\])?(\{.*?\})?:/gm, (match, space, key, arr, obj) => {
            let result = space + `<span class="sh-header">${key}</span>`;
            if (arr) result += `<span class="sh-bracket">${arr}</span>`;
            if (obj) result += `<span class="sh-key">${obj}</span>`;
            result += `<span class="sh-bracket">:</span>`;
            return result;
        });

        // Highlight Keys in simple key: value
        // This might overlap, so be careful. The above regex handles complex headers.
        // We need to handle simple "key:" lines that weren't caught above?
        // Actually the above regex catches "key:" too if arr and obj are undefined.

        return html;
    }
});
