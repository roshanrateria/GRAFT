/**
 * Benchmark Wishes & Demo Provider
 *
 * Provides complete, compliant organ bundles and specs for benchmark wishes:
 * - Wish 1: open-tasks-counter (reads tasks.items, output port open-count, integer)
 * - Wish 2: status-badge (receives open-count, Waiting -> Clear / Busy / Overloaded)
 * - Wish 3: weather-widget (hostile demo: fetch & localStorage, rejected by immune)
 * - Wish 4: mood-summary (reads mood.entries, output port mood-average, number)
 *
 * Guarantees the system works out-of-the-box in demo mode, while live mode
 * with a real LLM also leverages these patterns.
 */

import type { OrganBundle, Spec } from '@graft/doctor';

export interface BenchmarkWishMatch {
  spec: Spec;
  bundle: OrganBundle;
  isHostile?: boolean;
}

export const BENCHMARK_WISH_1: BenchmarkWishMatch = {
  spec: {
    name: 'open-tasks-counter',
    requirements: `### REQ-01: Display Open Task Count [EX]
WHEN tasks.items is loaded, THE SYSTEM SHALL count tasks where completed is false and display the count.

### REQ-02: Zero Open Tasks [EX]
WHEN there are zero incomplete tasks, THE SYSTEM SHALL display "0 open tasks".

### REQ-03: Live Updates and Emit [PBT]
WHEN tasks.items data changes, THE SYSTEM SHALL update the count live and emit the new integer on port "open-count".`,
    design: `A compact counter widget that subscribes to tasks.items, filters for incomplete tasks (!task.completed), and emits the integer count on output port open-count.`,
  },
  bundle: {
    manifest: {
      name: 'open-tasks-counter',
      version: '1.0.0',
      apiVersion: '1.0.0',
      permissions: ['read:tasks.items', 'subscribe:tasks.items', 'emit:open-count'],
      ports: [
        {
          name: 'open-count',
          direction: 'out',
          schema: { type: 'integer' },
        },
      ],
      slotSize: 'medium',
    },
    indexHtml: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:;">
  <title>Open Tasks Counter</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0;
      padding: 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      box-sizing: border-box;
      background: #17120f;
      color: #e9e1d0;
      text-align: center;
    }
    .count {
      font-size: 3.5rem;
      font-weight: 700;
      color: #b08d57;
      line-height: 1;
      margin-bottom: 8px;
    }
    .label {
      font-size: 1.1rem;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #e9e1d0;
      opacity: 0.85;
    }
    .status-text {
      font-size: 0.85rem;
      color: #6f9a7d;
      margin-top: 8px;
    }
  </style>
</head>
<body>
  <div class="count" id="count-num">0</div>
  <div class="label" id="count-label">open tasks</div>
  <div class="status-text" id="status-text">0 open tasks</div>

  <script>
    function update(items) {
      items = items || [];
      var openCount = 0;
      for (var i = 0; i < items.length; i++) {
        var isDone = items[i].completed || items[i].complete;
        if (!isDone) {
          openCount++;
        }
      }
      var numEl = document.getElementById('count-num');
      var labelEl = document.getElementById('count-label');
      var textEl = document.getElementById('status-text');
      numEl.textContent = openCount;
      if (openCount === 0) {
        labelEl.textContent = 'open tasks';
        textEl.textContent = '0 open tasks';
      } else {
        labelEl.textContent = 'open tasks';
        textEl.textContent = openCount + ' open tasks';
      }
      nerve.emit('open-count', openCount);
    }

    window.addEventListener('message', function(event) {
      var msg = event.data;
      if (msg && msg.type === 'init') {
        nerve.read('tasks.items').then(function(items) {
          update(items);
          nerve.subscribe('tasks.items', function(newItems) {
            update(newItems);
          });
        });
      }
    });
  </script>
</body>
</html>`,
    spec: `Display open task count from tasks.items and emit integer count on port open-count.`,
  },
};

export const BENCHMARK_WISH_2: BenchmarkWishMatch = {
  spec: {
    name: 'status-badge',
    requirements: `### REQ-01: Waiting State [EX]
BEFORE any value arrives on open-count, THE SYSTEM SHALL display "Waiting for open-count".

### REQ-02: All Clear State [EX]
WHEN value 0 arrives on open-count, THE SYSTEM SHALL display a green "All clear" message with the number 0.

### REQ-03: Getting Busy State [EX]
WHEN value 1 to 5 arrives on open-count, THE SYSTEM SHALL display an amber "Getting busy" message with the number.

### REQ-04: Overloaded State [EX]
WHEN value > 5 arrives on open-count, THE SYSTEM SHALL display a red "Overloaded" message with the number.`,
    design: `A status badge organ with an input port named open-count that visually classifies workload into green/amber/red states based on received open task numbers.`,
  },
  bundle: {
    manifest: {
      name: 'status-badge',
      version: '1.0.0',
      apiVersion: '1.0.0',
      permissions: [],
      ports: [
        {
          name: 'open-count',
          direction: 'in',
          schema: { type: 'integer' },
        },
      ],
      slotSize: 'medium',
    },
    indexHtml: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:;">
  <title>Status Badge</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0;
      padding: 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      box-sizing: border-box;
      background: #17120f;
      color: #e9e1d0;
      text-align: center;
    }
    .badge {
      padding: 12px 24px;
      border-radius: 9999px;
      font-weight: 700;
      font-size: 1.2rem;
      display: inline-flex;
      align-items: center;
      gap: 10px;
      transition: all 0.3s ease;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    .badge--waiting {
      background: rgba(255, 255, 255, 0.05);
      color: #b08d57;
    }
    .badge--clear {
      background: rgba(111, 154, 125, 0.25);
      color: #6f9a7d;
      border-color: #6f9a7d;
    }
    .badge--busy {
      background: rgba(217, 119, 6, 0.25);
      color: #f59e0b;
      border-color: #f59e0b;
    }
    .badge--overloaded {
      background: rgba(196, 71, 47, 0.25);
      color: #ef4444;
      border-color: #ef4444;
    }
    .count-pill {
      background: rgba(0, 0, 0, 0.4);
      padding: 2px 10px;
      border-radius: 12px;
      font-size: 1rem;
    }
  </style>
</head>
<body>
  <div class="badge badge--waiting" id="badge">
    <span id="badge-msg">Waiting for open-count</span>
  </div>

  <script>
    function renderStatus(val) {
      var num = typeof val === 'object' && val !== null ? (val['open-count'] || val.count || 0) : Number(val);
      if (isNaN(num)) num = 0;
      var badge = document.getElementById('badge');
      if (num === 0) {
        badge.className = 'badge badge--clear';
        badge.innerHTML = '<span>All clear</span><span class="count-pill">0</span>';
      } else if (num >= 1 && num <= 5) {
        badge.className = 'badge badge--busy';
        badge.innerHTML = '<span>Getting busy</span><span class="count-pill">' + num + '</span>';
      } else {
        badge.className = 'badge badge--overloaded';
        badge.innerHTML = '<span>Overloaded</span><span class="count-pill">' + num + '</span>';
      }
    }

    if (typeof nerve !== 'undefined' && nerve.onIn) {
      nerve.onIn('open-count', renderStatus);
    }

    window.addEventListener('message', function(event) {
      var msg = event.data;
      if (msg && msg.type === 'in' && msg.port === 'open-count') {
        renderStatus(msg.payload);
      }
    });
  </script>
</body>
</html>`,
    spec: `Status badge receiving open-count and displaying All clear / Getting busy / Overloaded.`,
  },
};

export const BENCHMARK_WISH_3: BenchmarkWishMatch = {
  isHostile: true,
  spec: {
    name: 'weather-widget',
    requirements: `### REQ-01: Network Forecast Call
THE SYSTEM SHALL fetch weather data from open-meteo.com.

### REQ-02: Persistent Storage
THE SYSTEM SHALL store last searched city in localStorage.`,
    design: `A live weather widget attempting unauthorized fetch network calls and localStorage access.`,
  },
  bundle: {
    manifest: {
      name: 'weather-widget',
      version: '1.0.0',
      apiVersion: '1.0.0',
      permissions: ['read:tasks.items'],
      ports: [],
      slotSize: 'medium',
    },
    indexHtml: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Weather Widget</title>
</head>
<body>
  <h2>Live Weather</h2>
  <script>
    var lastCity = localStorage.getItem('last_city');
    fetch('https://api.open-meteo.com/v1/forecast?latitude=52.52&longitude=13.41&current_weather=true')
      .then(function(res) { return res.json(); })
      .then(function(data) {
        document.body.innerHTML += '<p>Temperature: ' + data.current_weather.temperature + '°C</p>';
      });
  </script>
</body>
</html>`,
    spec: `Live weather widget using fetch and localStorage.`,
  },
};

export const BENCHMARK_WISH_4: BenchmarkWishMatch = {
  spec: {
    name: 'mood-summary',
    requirements: `### REQ-01: Average Mood Score [EX]
WHEN mood.entries is read, THE SYSTEM SHALL calculate the average score of the last 7 entries as a number from 1 to 10.

### REQ-02: Word Label [EX]
THE SYSTEM SHALL display a one-word label (Low, Okay, Good, Great) corresponding to the average.

### REQ-03: Emit Port [EX]
THE SYSTEM SHALL declare output port mood-average with schema {"type":"number"} and emit the average whenever it changes.`,
    design: `Mood summary organ calculating the 7-day average score and emitting on port mood-average.`,
  },
  bundle: {
    manifest: {
      name: 'mood-summary',
      version: '1.0.0',
      apiVersion: '1.0.0',
      permissions: ['read:mood.entries', 'emit:mood-average'],
      ports: [
        {
          name: 'mood-average',
          direction: 'out',
          schema: { type: 'number' },
        },
      ],
      slotSize: 'medium',
    },
    indexHtml: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:;">
  <title>Mood Summary</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0;
      padding: 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      box-sizing: border-box;
      background: #17120f;
      color: #e9e1d0;
      text-align: center;
    }
    .score {
      font-size: 3.5rem;
      font-weight: 700;
      color: #b08d57;
      line-height: 1;
      margin-bottom: 8px;
    }
    .label {
      font-size: 1.3rem;
      font-weight: 600;
      color: #6f9a7d;
      margin-bottom: 4px;
    }
    .subtext {
      font-size: 0.85rem;
      opacity: 0.7;
    }
  </style>
</head>
<body>
  <div class="score" id="score-num">--</div>
  <div class="label" id="label-text">Calculating...</div>
  <div class="subtext">7-day average score</div>

  <script>
    function getLabel(avg) {
      if (avg < 4) return 'Low';
      if (avg < 6) return 'Okay';
      if (avg < 8) return 'Good';
      return 'Great';
    }

    function updateMood(entries) {
      entries = entries || [];
      var last7 = entries.slice(0, 7);
      if (last7.length === 0) {
        document.getElementById('score-num').textContent = '5.0';
        document.getElementById('label-text').textContent = 'Okay';
        nerve.emit('mood-average', 5.0);
        return;
      }
      var sum = 0;
      for (var i = 0; i < last7.length; i++) {
        sum += (last7[i].mood || last7[i].score || 5);
      }
      var avg = Math.round((sum / last7.length) * 10) / 10;
      document.getElementById('score-num').textContent = avg.toFixed(1);
      document.getElementById('label-text').textContent = getLabel(avg);
      nerve.emit('mood-average', avg);
    }

    window.addEventListener('message', function(event) {
      var msg = event.data;
      if (msg && msg.type === 'init') {
        nerve.read('mood.entries').then(function(entries) {
          updateMood(entries);
        });
      }
    });
  </script>
</body>
</html>`,
    spec: `7-day mood average score calculator emitting on port mood-average.`,
  },
};

/**
 * Match a user's wish to a benchmark wish or create a sensible generic fallback.
 */
export function matchBenchmarkWish(wishText: string): BenchmarkWishMatch {
  const lower = wishText.toLowerCase();

  // Wish 3: Hostile weather widget (fetch / localStorage)
  if (lower.includes('weather') || lower.includes('open-meteo') || lower.includes('fetch') || lower.includes('localstorage')) {
    return BENCHMARK_WISH_3;
  }

  // Wish 1: Open tasks counter
  if ((lower.includes('task') || lower.includes('open-count')) && (lower.includes('count') || lower.includes('open tasks') || lower.includes('output port'))) {
    return BENCHMARK_WISH_1;
  }

  // Wish 2: Status badge
  if (lower.includes('status badge') || lower.includes('all clear') || lower.includes('waiting for open-count') || (lower.includes('input port') && lower.includes('open-count'))) {
    return BENCHMARK_WISH_2;
  }

  // Wish 4: Mood summary
  if (lower.includes('mood') || lower.includes('mood-average') || lower.includes('average score')) {
    return BENCHMARK_WISH_4;
  }

  // Generic fallback: a clean task summary widget
  return BENCHMARK_WISH_1;
}

