# Device checklist

The end bell is the one thing the app must get right: in a group sit, if it doesn't ring, everyone sits on past the end. Tests run the app in real browser engines, but no emulator enforces iOS's rules - no sound without a tap, a page paused while the screen is locked, audio taken away by a call. So before a release that touches the session, the timer or audio (and before calling it 1.0), run this list on real devices and note the results below.

**Where:** the PR's Vercel preview, with `?debug` (the card at the end of the page logs how each bell played, or why it didn't). `?speed=60` makes a 10-minute sit take 10 seconds - but leave it off for the reload check (6), which it disables.

**Devices:** the ones your groups will use - at least an iPhone (in Safari, and added to the Home Screen), an Android phone in Chrome, and a laptop.

## The checks

Each check starts from Ready, with a short custom length (1-3 minutes, or 10 with `?speed=60`).

### 1. The bell itself

- **1a. A plain sit:** Start, wait for the end. Start bell, then the end bell on time.
- **1b. With an ambient sound** (rain) and gentle ending: the rain fades over the last minute, then the end bell rings into silence.
- **1c. Interval woodblock** every minute in a 3-minute sit: knocks at 1 and 2 minutes, none at the end.
- **1d. Test bell** (under the volume sliders): rings the end bell once at the bell volume. With AirPods connected, it rings in the AirPods - which is what it's there to catch.
- **1e. iPhone ring/silent switch on silent:** the bells still ring.

### 2. The screen stays on

- **2a. A 10-minute sit** (real time), Auto-Lock at 30 seconds: the screen stays on to the end.
- **2b. Low Power Mode on:** does the screen stay on? If the browser refuses, the warning "The screen may lock by itself…" shows during the sit.
- **2c. Before a sit**, on the phone: "Don't lock the phone while you sit…" shows under the controls.

### 3. A locked phone (a known limit - record what happens)

- **3a. Lock the phone mid-sit**, unlock after the end. iOS pauses the page, so nothing rings while locked. At unlock: does the end bell ring late, or not at all? What does the screen show?
- **3b. The same with rain playing:** does the rain keep playing while locked?

### 4. Interruptions

- **4a. A call mid-sit**, declined (from another phone): "The sound was interrupted…" shows with **Restore the bell**; tap it - the rain comes back, and the end bell rings.
- **4b. The same without tapping:** does the end bell ring? (It's expected not to - the notice says so.)
- **4c. The same with Focus / Do Not Disturb on:** does the call interrupt the sound at all?
- **4d. Siri, or an alarm from the Clock app**, mid-sit: the notice, then the tap restores the sound.
- **4e. Guided (Metta), a call mid-voice:** the session pauses where the voice stopped (loud PAUSED); Carry on resumes voice and timer, and the end bell rings when the recording ends.

### 5. Resets

- **5a. A quick tap on Reset** mid-sit: the sit goes on; "Hold Reset to end the sit" shows for a moment.
- **5b. Hold Reset** for a second: the sit ends. No text selection, magnifier or callout appears.

### 6. A reload (no `?speed`)

- **6a. Pull down to reload** mid-sit: the sit runs on to the same end; "The page reloaded during the sit…" shows; tap Restore the bell - the end bell rings.
- **6b. Reload after the end has passed** (lock the phone before the end, reload after): "Your last sit ended at HH:MM…" shows; nothing rings late.
- **6c. On the Home Screen app:** does a reload keep the sit?

### 7. Offline and long

- **7a. Airplane mode** after one visit: the app opens, and the bells ring.
- **7b. One real sit of 45-60 minutes**, screen on: the end bell rings on time.

## Results

Copy the round below for each run of the checks (newest first), filling in the devices' OS and browser versions. Write ✓, ✗ (what happened, or a link to an issue) or - (not applicable).

### Round: YYYY-MM-DD, commit `abc1234`

| Check | iPhone, Safari (iOS …) | iPhone, Home Screen app | Android, Chrome (…) | Laptop (…) |
| ----- | ---------------------- | ----------------------- | ------------------- | ---------- |
| 1a | | | | |
| 1b | | | | |
| 1c | | | | |
| 1d | | | | |
| 1e | | | | |
| 2a | | | | |
| 2b | | | | |
| 2c | | | | |
| 3a | | | | |
| 3b | | | | |
| 4a | | | | |
| 4b | | | | |
| 4c | | | | |
| 4d | | | | |
| 4e | | | | |
| 5a | | | | |
| 5b | | | | |
| 6a | | | | |
| 6b | | | | |
| 6c | | | | |
| 7a | | | | |
| 7b | | | | |
