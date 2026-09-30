# MG Connect — Marsa Grand internal system

A browser-based simulation of a hotel's internal platform, built for a leadership
simulation delivered to potential General Managers. Participants sign in as the GM
of the Marsa Grand and work through one day of decisions, each of which ends in a
live roleplay call with a co-trainer.

The simulation teaches John Maxwell's levels of leadership by making participants
*practise the sub-steps*, not discuss the model. The system never names the model.

- **Round 1 — Permission.** Connection, attitude, integrity.
- **Round 2 — Production.** Relationships (the vital few), vision, motivation.
- **Round 3 — People development.** Model, then monitor.

Everything is fictional. The Marsa Grand, its people and its figures are invented,
and the figures are engineered so the arithmetic resolves cleanly in a workshop.

---

## Running it

`index.html` is a single self-contained file. All CSS, JavaScript and images are
inlined, so there is no build step and no dependencies.

```bash
open index.html            # macOS
xdg-open index.html        # Linux
start index.html           # Windows
```

To host it, drop the file on any static host — GitHub Pages, Netlify, S3. The only
external requests are the Inter webfont from Google Fonts and the Zoom links, both
of which degrade gracefully offline (the font falls back to Arial; the call buttons
simply don't open).

Tested in current Chrome, Safari, Edge and Firefox. Responsive down to phone width.

---

## The flow

The system gates itself. Tabs unlock in sequence, so a participant cannot read
ahead, and each round's discovery is hidden until they have committed to the step
before it.

```
Sign in (name)
   └─ Today                 ops figures · to-do list · market
        └─ Approvals        sign the Festival Operating Plan
             ⚡ modal        procurement has stopped an order · 90 vs 128
             └─ Rooms       the cost · "How did this happen?" · self-approval trail
                  📞 call    N. Sabry            ← Round 1 roleplay
                  └─ closure "what did you agree with her, in your own words"
                       └─ F&B Deployment   redistribute five people across four stations
                            📞 call         T. Nabil        ← Round 2 roleplay
                            └─ sign
                                 ⚡ modal    06:40 · N. Sabry admitted to hospital
                                 └─ Check-in
                                      📞 call 1  M. Serry — model it   ← Round 3a
                                      📞 call 2  M. Serry — monitor it ← Round 3b
                                           └─ "Thank you" completion modal
```

---

## Editing the things you are most likely to change

All of it lives in `index.html`. Search for the anchor shown.

### Zoom links

Three **Join call** buttons currently point at one meeting. Search for
`us02web.zoom.us` — there are two occurrences (one in the shared `meetModal`
helper, one in the Round 2 finding modal). Replace with per-round links if each
co-trainer needs their own room.

### People and the org chart

```js
var OPS=[ ... ]      // divisions shown in the account dropdown → My team
```

Names are written as initial + surname throughout (`N. Sabry`, `T. Nabil`,
`M. Serry`). Keep that convention if you change them — the co-trainer scripts let
the actor choose a first name behind the initial, so a woman plays Nour Sabry and a
man plays Nader Sabry without anything in the system needing to change.

### Round 2 deployment data

```js
var ST=[ ... ]       // four stations: revenue share and duration
var PPL=[ ... ]      // five colleagues: appraisal (a) and festivals worked (f)
PPL.forEach(function(p){ p.x = p.a + p.f; p.A = p.x >= 7; });
```

`p.x` is the strength weight and is simply appraisal plus festivals worked. Tier A
is anyone at 7 or above, marked with a gold dot. The verdict thresholds sit in
`calc()`:

```js
if(gx>=55){ ... }        // red   — badly concentrated
else if(gx>=38){ ... }   // amber — still heavy
else { ... }             // green — balanced
```

The submitted plan opens at roughly **70% of team strength on 13% of revenue**. The
model answer — everybody back to their own outlet — brings it to about 21%. The
model answer is deliberately *not* in the build; it lives in the co-trainer script
so participants cannot find it.

### Round 3 rooms

```js
var ROOMS=[ {no:'1104', t:'Sea view king', rate:255, ok:true}, ... ]
```

`rate` filters the dropdown (255 for jury and talent, 395 for everyone else) and
`ok:false` makes a room fail check-in because housekeeping has not released it.
Room 1207 is the planted failure.

### Copy in the modals

Every popup is built by the `modal({...})` helper and the `meetModal(...)` wrapper.
Both take plain HTML strings, so text changes need no other edits.

---

## Facilitator notes

- **Screen sharing matters in rounds 2 and 3.** Both call modals carry an amber
  instruction to share the screen, because the participant has to work the plan or
  the check-in form in front of the co-trainer.
- **Nothing persists.** There is no storage, no database, no analytics (the only
  backend is the stateless Claude proxy described below). Reloading
  resets the whole simulation, which is what you want between participants.
- **The caps are in the scripts, not the code.** The system will happily let a
  participant sign a bad plan; the consequence is played by the co-trainer.

The three co-trainer scripts (character, what unlocks them, scoring, endings) are
maintained separately from this repository.

---

## Repository layout

```
.
├── index.html     the whole simulation
└── README.md
```

Assets are base64-inlined in `index.html`: the Marsa Grand signage on the sign-in
screen, the crest in the header, and four station photographs on the deployment
page. That keeps the file portable and offline-capable at the cost of a larger
diff whenever an image changes. If image churn becomes a problem, extract them to
`assets/` and switch the `src` attributes to relative paths — nothing else depends
on them being inline.

---

## React version

`MGConnect.jsx` is the same simulation as a single React component, for dropping
into an existing app rather than serving `index.html` as a page.

```
.
├── MGConnect.jsx
└── assets/
    ├── signage.jpg          sign-in screen
    ├── crest.png            header mark
    ├── station-gala.jpg     ballroom
    ├── station-breakfast.jpg
    ├── station-terrace.jpg
    └── station-levantine.jpg
```

```jsx
import MGConnect from "./MGConnect";

export default function App() {
  return <MGConnect />;
}
```

Requirements: React 18 with any bundler that resolves image imports (Vite, Next,
CRA, Parcel). No other dependencies, no Tailwind, no CSS pipeline — the stylesheet
is a template literal at the bottom of the file, rendered into a `<style>` tag. Move
it to a `.css` file and import it if you prefer.

State is all local `useState`, so nothing persists and a remount resets the
simulation between participants.

The same edit points apply as above: `ZOOM` at the top of the file, then
`STATIONS`, `PEOPLE`, `ROOMS`, `DIVISIONS`. The strength formula lives in the
`strength()` helper and the verdict thresholds are in `verdictTone`.

---

## Hosted app and Claude proxy

The repository is set up as a deployable app: a Vite build of `src/MGConnect.jsx`
plus a small Express server that serves the build and proxies Claude calls. The
Anthropic API key stays on the server and never reaches the browser.

```
.
├── index.html            Vite entry
├── src/
│   ├── main.jsx          mounts <MGConnect />
│   ├── MGConnect.jsx     the simulation
│   ├── claude.js         askClaude() — browser helper for /api/claude
│   └── assets/           images imported by MGConnect.jsx
├── server/index.js       Express: POST /api/claude, GET /api/health, static dist/
├── Dockerfile            multi-stage build → one Node container
├── render.yaml           Render blueprint (optional)
└── .env.example
```

### Local development

```bash
cp .env.example .env      # add ANTHROPIC_API_KEY
npm install
npm run dev               # Vite on :5173, API on :8787, /api proxied
```

Production-style run: `npm run build && npm start`, then open http://localhost:8787.

### Calling Claude from the simulation

```js
import { askClaude } from "./claude";

const reply = await askClaude({
  system: "You are N. Sabry, Rooms Division Director at the Marsa Grand…",
  messages: [{ role: "user", content: "How did this happen?" }],
});
```

The browser can only send `system`, `messages` and a `max_tokens` value up to a
server-side ceiling. The model, effort level and ceiling are set by environment
variables (see `.env.example`). This stops the endpoint being used as a general
Claude relay on your key. The proxy also:

- limits each IP to 20 requests a minute (`RATE_LIMIT_PER_MIN`), in memory,
  which is fine for a single instance;
- optionally requires an `x-access-code` header when `ACCESS_CODE` is set;
- turns on server-side refusal fallbacks (`fallbacks: "default"`), so a
  declined request is retried on Anthropic's recommended fallback model.

### Deploying

The app is a single container listening on `PORT` (default 8787), with a
health check at `/api/health`.

- **Render:** New → Blueprint → select this repo. It reads `render.yaml`; set
  `ANTHROPIC_API_KEY` in the dashboard.
- **Fly.io / Railway / Cloud Run / any Docker host:** build the `Dockerfile` and set
  `ANTHROPIC_API_KEY` as a secret.

```bash
docker build -t mg-connect .
docker run -p 8787:8787 -e ANTHROPIC_API_KEY=sk-ant-... mg-connect
```

A static host on its own (GitHub Pages, Netlify static) can serve the simulation
but not the proxy. Only use one if you don't need Claude.

### Assets still to replace

`src/assets/signage.svg` is a placeholder for the sign-in image (`signage.jpg`
was not supplied). The station photos and crest in `src/assets/` are the
320×150 previews that were available; replace them with full-resolution files
under the same names.
