# GrayJay Officials vs WhistleOps — Feature Comparison

This document compares **GrayJay Officials** (province-wide, multi-league assignment system used across associations) with **WhistleOps** (New Brunswick hockey officiating management platform). Use it to understand what WhistleOps covers today, what works differently, and what is not yet built.

For step-by-step instructions on using WhistleOps, see [WHISTLEOPS_OFFICIALS_GUIDE.md](./WHISTLEOPS_OFFICIALS_GUIDE.md).

---

## Scope at a glance

| | GrayJay Officials | WhistleOps |
|---|-------------------|------------|
| **Primary audience** | Referee-in-Chief (RIC) per league, association, or tournament | Assignors, admins, finance, and supervisors for NB officiating |
| **Geographic / org model** | Multiple workspaces (leagues, associations, tournaments) across a province | Single provincial platform: one roster, one schedule model, NB zones |
| **Official roles on ice** | Referee, linesman, timekeeper | Referee, linesman, plus **Supervisor** position on assignments (no timekeepers) |
| **Game data** | Integrated with league scheduling; timekeepers can score games | CSV import + manual games; optional **Gamesheet** webhook for scores/status |
| **Language** | Not described in the GrayJay guide | English and French in the app |

---

## Feature comparison matrix

**Match level:** Full = comparable capability · Partial = similar goal, different implementation · Not available = not in WhistleOps today

### Roles and access

| Feature | GrayJay | WhistleOps | Match | Notes |
|---------|---------|------------|-------|-------|
| Admin / scheduling lead | RIC per league/association/tournament | Assignor, Admin, Supervisor, Finance (shared admin UI) | Partial | Same duties in practice; different role names and no per-organization workspace |
| Official self-service portal | Yes | Yes (Official portal) | Full | Schedule, availability, profile |
| Separate finance-only UI | RIC + payment menus | Finance role uses same admin nav as assignor | Partial | No trimmed finance-only screens |
| Timekeepers | Supported with assignment and scoring | Not supported | Not available | WhistleOps positions: Referee 1/2, Lines 1/2, Supervisor |

### Officials roster

| Feature | GrayJay | WhistleOps | Match | Notes |
|---------|---------|------------|-------|-------|
| Invite official by email | Yes (Add User → Invite) | Yes (Add Official → Send invite) | Full | Creates account and profile |
| Grant league/association permissions | Per org when inviting | Role on profile (Official, Supervisor, staff) | Partial | No separate “permissions per league workspace” |
| Per-role qualifications per league | e.g. linesman U15AA, referee U13AA only | Certification level (1–6) + minimum level per league name | Partial | Enforced when assigning; not split by referee vs linesman per tier |
| Import officials from another org | Cross-workspace import with qual matching | CSV bulk import only | Partial | No copy-from-tournament-to-association flow |
| Officials directory (searchable, contact icons) | Yes, with privacy controls | Not available | Not available | Roster is admin-only |
| Bulk email to selected officials | Planned for RICs | Message per game crew only | Partial | Custom email to assigned officials on one game |

### Games and schedule

| Feature | GrayJay | WhistleOps | Match | Notes |
|---------|---------|------------|-------|-------|
| Assign officials UI | Dedicated Assign Officials grid | Schedule board by date with slot pickers | Partial | Different layout; same core task |
| Customize visible columns | Yes, remembered | Not available | Not available | Fixed schedule card layout |
| Calendar icon per official on assign row | Links to official’s calendar/availability | Not on assign row | Not available | Officials set availability separately |
| Hide TBA date/time/venue games | Excluded from assign page | Not documented as excluded | Partial | Verify league import practices |
| Grey slots for roles not required | Based on league minimum officials | All five slots shown | Partial | No visual “not required” grey state |
| Pagination (25/50/100 rows) | Yes | Scroll/filter by zone and league | Partial | |
| Import games | Via league scheduling integration | CSV bulk import + add single game | Partial | WhistleOps also supports Gamesheet sync |
| Edit/delete games in UI | Implied in league tools | API only; no edit/delete in UI | Partial | |
| Gamesheet / external scoring | Penalties feed incident reports | Webhook updates scores/status on games | Partial | Different integration purpose |

### Assignments workflow

| Feature | GrayJay | WhistleOps | Match | Notes |
|---------|---------|------------|-------|-------|
| Filter assignees by availability | Yes | Qualification enforced; availability not auto-filtered on assign | Partial | Admin can use Availability overview |
| Filter assignees by qualifications | Yes | Yes (cert level vs league rule) | Full | Warnings when official below minimum |
| Draft assignments (yellow) | Yes | Not available | Not available | Assignments go live as Pending/Confirmed |
| Finalize draft → notify officials | Yes | Message Assigned Crew (manual email) | Partial | No separate finalize step |
| Official accept/decline | After finalize (orange → green) | Pending → Confirmed / Rejected | Full | Officials use My Schedule |
| Assignment status colors | Yellow / orange / green | Status labels in UI | Partial | Same lifecycle, different presentation |

### Availability

| Feature | GrayJay | WhistleOps | Match | Notes |
|---------|---------|------------|-------|-------|
| Officials set availability | Click/drag time blocks | Hour-by-hour weekly grid | Full | Different UI, same purpose |
| Combined availability report | Reports → Officials Availability | Admin → Availability (weekly matrix) | Full | |
| Availability submission window | Not described in GrayJay guide | Configurable open/close dates | — | WhistleOps-only control |
| Zone / league filters on availability | Association-based | Zone + league type filters | Partial | |

### Official schedule and calendar

| Feature | GrayJay | WhistleOps | Match | Notes |
|---------|---------|------------|-------|-------|
| My Schedule / pending assignments | Yes, with role and game details | My Schedule: Action Required + upcoming | Full | |
| Webcal / Internet calendar subscribe | Yes | Not available | Not available | |
| Link to game page from pending list | Yes | Schedule-centric view | Partial | |

### Pay and finance

| Feature | GrayJay | WhistleOps | Match | Notes |
|---------|---------|------------|-------|-------|
| Configure pay rates | Per role per league; effective dates | Per position; overrides by league type + tier; mileage | Partial | WhistleOps adds mileage; different rate dimensions |
| Pay reports | Summary + Official report with balance | Pay Report by official for season | Partial | |
| Record adjustments (gas, corrections) | Yes, general or per game | Not available | Not available | |
| Record payments (cash, payouts) | Yes, general or per game | Approve payout (lock-in), no payment lines | Partial | Approve marks assignments approved, not cash ledger |
| Official sees earnings history | Yes (balance, games, adjustments) | Profile → season earnings (fees + mileage) | Partial | No running balance with adjustments |

### Incident reports

| Feature | GrayJay | WhistleOps | Match | Notes |
|---------|---------|------------|-------|-------|
| File incident from game | Yes | Yes (from Schedule) | Full | |
| Multiple reports per game | Yes, with badge count | One submission per action (no history UI) | Partial | |
| Link penalties from scored game | Auto-fill from scoring data | Free-text only | Not available | |
| Finalize / send (locks report) | Yes | Submit once; emails sent | Partial | |
| Configure email recipients | Per league in Settings | Per league type in Configuration | Full | Minor / Senior / Adult Rec + default |
| RIC auto-receives copy | Yes | Configured recipients | Full | |

### Other

| Feature | GrayJay | WhistleOps | Match | Notes |
|---------|---------|------------|-------|-------|
| Official evaluations | Optional GrayJay Evaluations module | Not available | Not available | |
| Timekeeper “All Games” scoring view | Yes | Not applicable (no timekeepers) | Not available | |
| Bilingual UI | — | English / French | — | WhistleOps strength |
| NB zones | — | Zone filter across schedule/availability | — | WhistleOps strength |

---

## WhistleOps strengths (relative to GrayJay guide)

- **Built for New Brunswick** — zones, league types (Minor, Senior, Adult Rec), and Hockey NB-style certification levels.
- **Gamesheet integration** — game scores and status can update automatically when your league uses Gamesheet.
- **Bilingual interface** — English and French toggle on login and in both portals.
- **Bulk CSV import** — officials and games can be loaded in batch for fast season setup.
- **Mileage in pay** — travel compensation per assignment using configurable cents per kilometre, alongside game fees.

---

## Gaps vs GrayJay (roadmap reference)

These GrayJay capabilities are **not** in WhistleOps today. They are listed here for planning only, not as user-facing promises:

- Timekeepers (assignment, qualifications, scoring)
- Per-role qualifications per league tier (separate referee vs linesman rules)
- Cross-organization official import
- Draft → Finalize assignment workflow with color states
- Assign grid column customization and per-official calendar shortcut
- Webcal subscription for personal schedule
- Officials directory with contact privacy
- Payment adjustments and payment line items (ledger-style balance)
- Incident reports linked to penalties; multi-report history UI
- Official evaluations module

---

## Which document to use

| You need… | Read |
|-----------|------|
| How to use WhistleOps day to day | [WHISTLEOPS_OFFICIALS_GUIDE.md](./WHISTLEOPS_OFFICIALS_GUIDE.md) |
| How WhistleOps compares to GrayJay | This file |
| Technical architecture / API | [HANDOFF_BLUEPRINT.md](../HANDOFF_BLUEPRINT.md) |

*Updated: May 20, 2026*
