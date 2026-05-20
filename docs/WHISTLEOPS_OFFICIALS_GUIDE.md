# WhistleOps Officials Guide

WhistleOps is the **New Brunswick officiating management platform** for hockey. It helps assignors and staff schedule games, assign qualified officials, track availability, handle incident reports, and run seasonal pay reports. Officials use a separate mobile-friendly portal to accept assignments, set availability, and view earnings.

This guide describes what you can do in WhistleOps today. For a side-by-side comparison with GrayJay Officials, see [GRAYJAY_WHISTLEOPS_COMPARISON.md](./GRAYJAY_WHISTLEOPS_COMPARISON.md).

---

## Who uses which portal

Everyone signs in at the same login page. After sign-in, WhistleOps sends you to the right place based on your role.

| If your role is… | You use… | Main tasks |
|------------------|----------|------------|
| **Official** | Official Portal | My Schedule, availability, profile and earnings |
| **Assignor**, **Admin**, **Supervisor**, or **Finance** | Admin Command Center | Roster, schedule, assignments, finance, configuration |

**Note:** Assignor, Admin, Supervisor, and Finance currently share the same admin menu. Finance does not have a separate trimmed-down screen set yet.

The app is available in **English** and **French** — use the language toggle on the login page or in the sidebar/header.

---

## What staff can do (overview)

Users with access to the **Admin Command Center** can:

- Invite and manage officials on the roster
- Set certification levels and league qualification rules (minimum level per league)
- Configure pay rates, rinks, position labels, roster columns, availability windows, and incident notification emails
- Import games from CSV or add games manually
- Assign officials to games on the schedule (Referee 1, Referee 2, Lines 1, Lines 2, Supervisor)
- Email assigned crew members about a game
- Review all officials’ availability in a weekly overview
- Run the seasonal pay report and approve payouts
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
   - **Supervisor** — can be assigned to the Supervisor slot on games
   - **Assignor**, **Admin**, **Supervisor** (staff), or **Finance** — staff access to the admin area
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
3. When you assign someone on the **Schedule**, the system warns you if they are below the minimum for that game. You should not assign under-qualified officials.

Association timekeepers are not part of WhistleOps; only on-ice officiating positions and Supervisor are scheduled here.

---

## Importing games

Games can be added in bulk or one at a time.

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

Under **Configuration**, open the rinks/venues panel to add or edit arenas, addresses, zones, and whether a venue is assignable for scheduling.

---

## Assigning officials

The **Schedule** page is where assignors fill crew slots for upcoming games.

### Open the schedule

1. Go to **Schedule** in the admin sidebar.
2. Use filters for **zone** and **league type** to narrow the list.
3. Toggle **upcoming** vs **all** games as needed.

Games are grouped by date. Each game card shows the slots: Referee 1, Referee 2, Lines 1, Lines 2, and Supervisor.

### Assign or change an official

1. Click an empty or filled slot on a game.
2. Choose an official from the list. Officials who do not meet the league qualification show a warning.
3. Save the assignment.

New assignments are often created as **Pending** so the official must accept them. You can also set status to **Confirmed**, **Rejected**, or **Cancelled** when updating an assignment.

### Assignment statuses

| Status | Meaning |
|--------|---------|
| **Pending** | Official has been assigned but has not accepted yet |
| **Confirmed** | Official accepted (or staff confirmed the slot) |
| **Rejected** | Official declined |
| **Cancelled** | Assignment was cancelled |

Unlike GrayJay, WhistleOps does not use a separate “draft” step or yellow/orange/green colors. Assignments are visible to officials once they are pending or confirmed.

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
- No “finalize draft” button — use **Message Assigned Crew** when you want to notify officials
- No timekeeper columns

---

## For officials: My Schedule, availability, and profile

### My Schedule

After sign-in, officials land on **My Schedule** (bottom nav: Schedule).

- **Action Required** — pending assignments you must **Accept** or **Decline**.
- **Upcoming** — confirmed games ahead.
- **Past** — completed games for reference.

Accepting moves the assignment to **Confirmed** and includes it in pay calculations. Declining sets **Rejected** so the assignor can pick someone else.

There is no web calendar subscription (webcal) in WhistleOps today. Use the app to view your schedule.

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

There is no public officials directory in WhistleOps; contact other officials through your association’s usual channels.

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

### Configure pay rates

1. Go to **Configuration**.
2. Open **Pay rates**.
3. Set default fees for each position (Referee 1, Referee 2, Lines 1, Lines 2, Supervisor).
4. Add overrides for specific **league types** and **tiers** if needed.
5. Set **mileage** (cents per kilometre) for travel reimbursement.

Rates apply to **confirmed** assignments when the pay report is generated.

### Pay report and approvals

1. Go to **Finance** (Pay Report) in the admin sidebar.
2. Review each official’s season totals: games, fees, mileage, and total due.
3. Click **Approve** for an official when their season amount is finalized.

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

## Roles reference

| Role | Portal | Typical use |
|------|--------|-------------|
| **Official** | Official | Accept assignments, set availability, view earnings |
| **Assignor** | Admin | Day-to-day scheduling and assignments |
| **Admin** | Admin | Full configuration and roster control |
| **Supervisor** | Admin (profile may also be on-ice) | Same admin access; may be assigned as Supervisor on games |
| **Finance** | Admin | Pay report and pay rate configuration (same nav as assignor today) |

---

## Gamesheet integration

If your league uses **Gamesheet**, games in WhistleOps can receive score and status updates automatically when Gamesheet sends updates to WhistleOps. Staff may enter a **Gamesheet ID** when creating or importing a game to help matching.

Officials still accept assignments and view games in WhistleOps; scoring integration does not replace the assignment workflow.

---

## Quick links (admin)

| Task | Where to go |
|------|-------------|
| Dashboard stats | Admin → Dashboard |
| Assign officials | Admin → Schedule |
| Roster | Admin → Officials |
| Import games | Admin → Import Games |
| Everyone’s availability | Admin → Availability |
| Pay report | Admin → Finance |
| All settings | Admin → Configuration |

## Quick links (officials)

| Task | Where to go |
|------|-------------|
| Pending / upcoming games | Official → Schedule |
| Set hours available | Official → Availability |
| Earnings and profile | Official → Profile |

---

*Updated: May 20, 2026*
