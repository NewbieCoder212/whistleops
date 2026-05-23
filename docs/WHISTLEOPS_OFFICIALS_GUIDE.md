# WhistleOps Officials Guide

WhistleOps is the **New Brunswick officiating management platform** for hockey. It helps assignors and staff schedule games, assign qualified officials, track availability, handle incident reports, and run seasonal pay reports. Officials use a separate mobile-friendly portal to accept assignments, set availability, and view earnings.

This guide describes what you can do in WhistleOps today. For a side-by-side comparison with GrayJay Officials, see [GRAYJAY_WHISTLEOPS_COMPARISON.md](./GRAYJAY_WHISTLEOPS_COMPARISON.md).

---

## Who uses which portal

Everyone signs in at the same login page. After sign-in, WhistleOps sends you to the right place based on your role.

| If your role is… | You use… | Main tasks |
|------------------|----------|------------|
| **Official** or **Supervisor** | Official Portal | My Schedule, availability, profile and earnings |
| **Assignor**, **Admin**, or **Finance** | Admin Command Center | Roster, schedule, assignments, finance, configuration |

**Note:** Assignor, Admin, and Finance share the same admin menu. Finance does not have a separate trimmed-down screen set yet. Supervisors sign in like officials but can still be assigned to the Supervisor slot on games.

The app is available in **English** and **French** — use the language toggle on the login page or in the sidebar/header. Labels, buttons, filters, and status names translate; zone names stay as stored in the database.

---

## What staff can do (overview)

Users with access to the **Admin Command Center** can:

- View a **Dashboard** with season stats, today’s games, and quick links (zone staff see a welcome message with their home zone)
- Invite and manage officials on the roster
- Set certification levels and league qualification rules (minimum level per league)
- Configure pay rates (provincial default and **per-zone** rates), rinks, position labels, roster columns, availability windows, and incident notification emails
- Import games, officials, and **rinks** from CSV or add records manually
- Assign officials on the **Assignment Board** (day view with availability) and review the **Schedule** week view
- **Publish** a staffed day so officials receive assignments by email
- Email assigned crew members about a game
- Review all officials’ availability in a weekly overview
- Run the seasonal pay report and approve payouts (province-wide for admins; **home zone only** for regional assignors and finance staff)
- Submit incident reports for games

---

## Managing the officials roster

The first step in a season is building your roster: add officials, set their certification level, and define which leagues they are allowed to work based on qualification rules.

### Add or invite an official

1. Sign in to WhistleOps and open the **Admin Command Center**.
2. Go to **Officials** in the sidebar.
3. Click **Add Official**.
4. Enter the official’s name, email, phone, and other details.
5. Choose a **role**:
   - **Official** — referee or linesman who receives game assignments
   - **Supervisor** — uses the official portal; can be assigned to the Supervisor slot on games
   - **Assignor**, **Admin**, or **Finance** — staff access to the admin area
6. For officials and supervisors, set **certification level** (Level 1 through Level 6).
7. Optionally turn on **Send invite** so the official receives an email to create their password and sign in.
8. Save.

If the official already has an account, adding their profile links them to your roster when they sign in with the same email.

### Bulk import officials

If you have many officials on a spreadsheet:

1. On the **Officials** page, find the **Import** section.
2. Upload your CSV file.
3. Review the preview.
4. Confirm the import.

Imported officials can optionally receive invite emails depending on how your import is set up. Resolve certification levels and zones by name where your spreadsheet includes them.

### Qualifications (how assignment eligibility works)

WhistleOps does **not** use separate “referee for U13” vs “linesman for U15” rules like some province-wide systems. Instead:

1. Each official has a **certification level** on their profile.
2. Under **Configuration**, you set **league qualifications** — the minimum certification level required for each league name (matched to the game’s league tier or league type).
3. When you assign someone on the **Assignment Board**, the system warns you if they are below the minimum for that game. You should not assign under-qualified officials.

Association timekeepers are not part of WhistleOps; only on-ice officiating positions and Supervisor are scheduled here.

---

## Importing games and venues

Games and rinks can be added in bulk or one at a time.

### Bulk import from CSV

1. Go to **Import Games** in the admin sidebar.
2. Upload your CSV file.
3. Review the preview (teams, date, venue, league, etc.).
4. Confirm the import.

Venues that are marked as **not assignable** in Configuration are skipped during bulk import so practice sheets or non-game rows do not clutter the schedule.

### Add a single game

1. Go to **Schedule**.
2. Use **Add Game**.
3. Enter date and time, venue, home and away teams, league tier, league type (Minor, Senior, or Adult Rec), game number, optional Gamesheet ID, and notes.
4. Save.

### Manage rinks (venues)

Under **Configuration**, open the **Rinks / Venues** panel to add or edit arenas, addresses, zones, and whether a venue is assignable for scheduling.

### Bulk import rinks from CSV

If you have a spreadsheet of arenas (for example exported from GrayJay):

1. Go to **Configuration** → **Rinks / Venues**.
2. Find **Import Rinks (CSV)**.
3. Upload your CSV file. Expected columns include **Venue Name**, **Zone** (1–9), **Address**, **City**, **Province/State**, and **Postal/ZIP Code**.
4. Review the preview and fix any rows flagged with errors.
5. Optionally turn on **Update existing** to refresh venues that already match by name.
6. Confirm the import.

Imported rinks are linked to the correct NB zone when the zone column is present. Assignable rinks appear on the Schedule and Assignment Board; non-assignable rinks are skipped during game import.

---

## Assigning officials

The **Schedule** page is where assignors fill crew slots for upcoming games.

### Open the schedule

1. Go to **Schedule** for the **week view** (date range, game cards, add/edit, message crew, incidents).
2. Go to **Assignment Board** to **assign officials for one day** (availability table, hour focus, officials matrix). Pick a **zone** and date.
3. Use **Assign today** on Schedule to jump to the board for today.

Each game card or board slot shows: Referee 1, Referee 2, Lines 1, Lines 2, and Supervisor.

### Assign or change an official

Use the **Assignment Board** (not Schedule slots):

1. Open **Assignment Board** for the game day (or click **Assign on board** / any slot on a Schedule game card).
2. Select the zone, then click a slot in the games table or hour-focus panel.
3. Choose an official from the availability-aware list. Officials who do not meet the league qualification show a warning.
4. Save the assignment.

On **Schedule**, slots are **read-only** — they show who is assigned and status (Pending, Confirmed, Declined) but always link to the board for changes.

New assignments are often created as **Pending** so the official must accept them. You can also set status to **Confirmed**, **Rejected**, or **Cancelled** when updating an assignment.

### Assignment statuses

| Status | Meaning |
|--------|---------|
| **Draft** | Assigned on the **Assignment Board** but not published — officials do not see it yet |
| **Pending** | Published; official must accept or decline on **My Schedule** |
| **Confirmed** | Official accepted (or staff confirmed the slot) |
| **Rejected** | Official declined |
| **Cancelled** | Assignment was cancelled |

### Publish a day (Assignment Board)

1. Staff the day on **Assignment Board** (assignments start as **Draft**).
2. When the board is ready, click **Publish day** for that date and zone.
3. Draft assignments become **Pending**, appear on each official’s **My Schedule**, and each affected official receives one email listing their new games (when email is configured).

Use **Message Assigned Crew** on **Schedule** for a custom note to officials who are already pending or confirmed.

### Message the assigned crew

1. On a game card, open **Message Assigned Crew**.
2. Choose or edit the subject and message.
3. Send.

Email goes to officials with **Pending** or **Confirmed** assignments who have an email on file.

### Incident report from the schedule

1. On a game card, open **Incident Report**.
2. Write the report in the text box.
3. Submit.

Configured recipients receive email based on the game’s league type (see **Incident reports** below). WhistleOps does not link penalties from a scored game into the report — write the details in the report text.

### What WhistleOps does not do on this page

- No customizable columns on a grid (fixed game card layout)
- No calendar pop-up beside each assign dropdown
- **Publish day** on the Assignment Board replaces a separate “finalize draft” step; **Message Assigned Crew** is still available for custom messages
- No timekeeper columns

---

## For officials: My Schedule, availability, and profile

### My Schedule

After sign-in, officials land on **My Schedule** (bottom nav: Schedule).

- **Action Required** — pending assignments you must **Accept** or **Decline**.
- **Upcoming** — confirmed games ahead.
- **Past** — completed games for reference.

Accepting moves the assignment to **Confirmed** and includes it in pay calculations. Declining sets **Rejected** so the assignor can pick someone else.

### Subscribe in your calendar (webcal / ICS)

On **My Schedule**, tap **Add to calendar** to sync confirmed games with Apple Calendar, Google Calendar, or Outlook.

- **Copy subscription link** — paste into your calendar app to keep your schedule updated automatically.
- **Copy HTTPS link** — use in Google Calendar under “From URL”.
- **Download .ics file** — one-time import if you prefer a file.
- **Regenerate link** — invalidates the old link if you need a fresh subscription URL.

Only **confirmed** assignments appear in the feed. Pending games stay in the app until you accept them.

### My Availability

Go to **Availability** in the bottom nav.

1. Move week by week with the arrows.
2. Click hours on the grid to mark when you are available (hour-by-hour, morning/afternoon/evening blocks are derived from your selection).
3. Save each day.

Availability can only be edited during the **submission window** set by staff under Configuration (open and close dates). Outside that window, the calendar is read-only.

You can filter by zone and league type and see how many games fall in that context — helpful when deciding when to mark yourself available.

**Tip:** Select larger blocks of hours in one pass rather than tapping individual hours one at a time.

### Profile and earnings

Open **Profile** to update contact information, see your certification badge, and view **season earnings**: game fees, mileage, and totals. Approved payouts are reflected when finance has used **Approve** on the pay report.

### Officials contact directory

Signed-in users can open **Directory** to find other officials’ contact information:

- **Official portal:** **Directory** in the bottom navigation (`/dashboard/directory`)
- **Admin Command Center:** **Directory** in the sidebar (`/admin/directory`)

The directory lists officials and supervisors who are marked **List in officials contact directory** on their profile (staff set this when adding or editing someone on **Officials**). Columns:

| Column | Profile field |
|--------|----------------|
| Last Name / First Name | Split from **Full Name** |
| Cell Number | **Cell Number** (`cell_phone`) |
| Home Phone Number | **Home Phone Number** (`home_phone`) |
| Email Address | **Email** |
| Zone | **Home zone** on profile |

Use search to find someone by name, email, or phone. Filter by zone if needed. Staff can hide someone from the directory by turning off the listing toggle on their profile.

---

## Staff: availability overview

Assignors can see everyone at once:

1. Go to **Availability** in the admin sidebar (not the same as the official’s My Availability).
2. Pick the week.
3. Search for an official by name.
4. Review the matrix of hours (and morning/afternoon/evening summary) per official.

Use this when filling the schedule to avoid assigning someone who marked themselves unavailable.

---

## Pay rates and finance

WhistleOps supports **provincial default** pay rates and **per-zone** rate tables. Game fees on the pay report use the rates for the **zone where the game is played** (the venue’s zone). If a zone has no custom rates yet, the provincial default applies.

### Who can see and edit what

| Role | Pay rates (Configuration) | Pay report (Finance) |
|------|---------------------------|----------------------|
| **Admin** | Provincial default **or** any zone | All zones (filter by zone) or one zone |
| **Assignor** | Home zone only | Home zone only |
| **Finance** | Home zone only | Home zone only |

Assignors and finance staff must have a **home zone** on their profile to access pay rates and the pay report. Admins manage province-wide settings and can switch zones.

### Configure pay rates

1. Go to **Configuration**.
2. Open **Pay rates**.
3. **Admins:** choose **Provincial default** or a specific **zone**, then edit that rate table.
4. **Assignors / Finance:** edit rates for your home zone only.
5. Set default fees for each position (Referee 1, Referee 2, Lines 1, Lines 2, Supervisor).
6. Add overrides for specific **league types** and **tiers** if needed.
7. Set **mileage** (cents per kilometre) for travel reimbursement.

Rates apply to **confirmed** assignments when the pay report is generated.

### Pay report and approvals

1. Go to **Finance** (Pay Report) in the admin sidebar.
2. **Admins:** use the zone filter to view one zone or all zones.
3. **Assignors / Finance:** the report is limited to your home zone automatically.
4. Review each official’s season totals: games, fees, mileage, and total due.
5. Click **Approve** for an official when their season amount is finalized.

Approve locks those assignments as payout-approved. It is a **lock-in for payroll**, not a record of a bank transfer or cash payment inside the app.

WhistleOps does not currently support:

- Extra adjustments (e.g. gas reimbursement lines)
- Recording partial payments or cash paid at the rink
- A running balance with payment history like a full ledger

Officials see a summary on **Profile**; keep approved totals aligned with what you pay outside the system.

---

## Incident reports

When a game needs a written incident report:

1. From **Schedule**, open the game and choose **Incident Report**.
2. Enter the full report text (players, penalties, period, narrative — include anything required by your association).
3. Submit.

Emails are sent to addresses configured under **Configuration → Incident notifications**, by league type:

- Minor  
- Senior  
- Adult Rec  
- **Default** (fallback)

Separate multiple email addresses with commas.

**Differences from some other systems:** you cannot pick penalties from a scored game sheet inside WhistleOps; there is no list of past reports on the game in the app after submit; the report is sent when you submit rather than a separate “finalize” step.

---

## Admin dashboard

After sign-in, staff with admin access land on **Dashboard**.

- **Welcome message** — shows your first name when available.
- **Home zone badge** — if your profile has a home zone (typical for regional assignors and finance staff), the zone name appears beside the welcome (for example, Zone 5 — Moncton Area).
- **Context subtitle** — zone staff see zone-focused text; provincial admins see province-wide text.
- **Stats** — upcoming games, games needing assignment, confirmed slots, and official count.
- **Today’s games** — quick list with status; link through to Schedule.
- **Quick links** — Schedule, Finance (when your role has payroll access), and Import Games.

Use the dashboard as a morning check-in before opening the Assignment Board or Schedule.

---

## Roles reference

| Role | Portal | Typical use |
|------|--------|-------------|
| **Official** | Official | Accept assignments, set availability, calendar subscribe, view earnings |
| **Assignor** | Admin | Day-to-day scheduling on the Assignment Board; zone-scoped pay access when also Finance |
| **Admin** | Admin | Full configuration, all zones, provincial default pay rates |
| **Supervisor** | Admin (profile may also be on-ice) | Same admin access; may be assigned as Supervisor on games |
| **Finance** | Admin | Pay report and pay rates for **home zone** (same nav as assignor today) |

---

## Gamesheet integration

If your league uses **Gamesheet**, games in WhistleOps can receive score and status updates automatically when Gamesheet sends updates to WhistleOps. Staff may enter a **Gamesheet ID** when creating or importing a game to help matching.

Officials still accept assignments and view games in WhistleOps; scoring integration does not replace the assignment workflow.

---

## Quick links (admin)

| Task | Where to go |
|------|-------------|
| Dashboard stats | Admin → Dashboard |
| Week view / game cards | Admin → Schedule |
| Assign officials (day board) | Admin → Assignment Board |
| Roster | Admin → Officials |
| Import games | Admin → Import Games |
| Import rinks | Admin → Configuration → Rinks / Venues |
| Everyone’s availability | Admin → Availability |
| Pay report | Admin → Finance |
| All settings | Admin → Configuration |

## Quick links (officials)

| Task | Where to go |
|------|-------------|
| Pending / upcoming games | Official → Schedule |
| Add to calendar (ICS) | Official → Schedule → Add to calendar |
| Set hours available | Official → Availability |
| Earnings and profile | Official → Profile |

---

*Updated: May 23, 2026*
