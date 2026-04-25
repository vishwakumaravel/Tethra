# Tethra

Tethra is a couples app built with Expo / React Native. The project is currently at **Phase 4: Weekly Receipt Engine + Confidence Rules**.

For future product and implementation context, start with [TETHRA_MASTER_CONTEXT.md](/c:/Users/vkper/Downloads/Tethra/TETHRA_MASTER_CONTEXT.md:1).

## Current Stage

Phase 4 adds deterministic weekly receipts on top of the tested daily couple ritual and progression layer.

- Expo Router app shell is in place
- Supabase auth is wired for email, phone OTP, and Apple sign-in on iOS
- session restore and route guards are working
- new users are routed through required profile completion
- signed-in users now land in a relationship state machine instead of a placeholder shell
- couples can create, join, cancel, regenerate, and restore invite/link state from the signed-in home
- invite codes are 6-character uppercase alphanumeric codes with a 24-hour lifetime
- linked couples can complete daily check-ins and partner predictions
- daily reveals unlock only after both partners complete the ritual
- streak counters update when a paired day is completed
- partners can react to a daily reveal with one day-scoped reaction and optional short note
- XP is awarded for paired days, streak milestones, and first valid reveal reactions
- visible tiers are driven by a hidden rolling relationship score instead of XP farming
- early tier progression is intentionally capped by lifetime paired days so couples cannot hit top ranks from one great reveal
- linked home is split into Ritual, Rank, and Activity surfaces to avoid one overloaded dashboard
- settings includes a development reset and a two-tap relationship exit flow
- partner actions refresh automatically through Supabase Realtime
- check-in and prediction inputs use emoji-backed sliders
- Rank tab includes a native share-sheet button for Messages, Instagram, and other installed apps
- lightweight analytics events are stored without raw notes or raw emotional answers
- weekly receipts generate lazily after a closed Monday-Sunday couple-local week
- receipt confidence is labeled as low, medium, or high based on paired-day count
- low-data receipts stay soft and avoid fake spicy claims
- the linked home now includes a Receipt tab with native text sharing and honest Pro-later teaser copy
- pure tests cover couple-local days, reveal readiness, duplicate prevention, and streak rules
- Supabase SQL migrations exist for auth foundation, couple linking RPCs, and row-level security

## Implemented So Far

- auth chooser screen
- email sign in / sign up
- phone OTP sign in
- Apple sign in on iOS
- profile completion onboarding
- relationship provider and state machine
- invite lifecycle RPCs with safe error handling
- signed-in home for `unlinked`, `invite_sent`, `linked`, and `link_error`
- one-active-invite-per-inviter enforcement with safe errors for invalid, expired, removed, reused, and self-join flows
- daily loop provider and ritual dashboard
- daily check-in screen
- partner prediction screen
- paired reveal screen
- reveal reaction UI with optional short day-scoped note
- XP and current tier surface on the Rank tab
- Rank sharing through the native device share sheet
- partner activity surface for check-ins, predictions, and reveal reactions
- cozy, short-copy settings surface with dev reset and relationship exit controls
- groundwork copy for future percentile comparison against other Tethra couples
- pure XP, prediction accuracy, relationship score, tier, and analytics sanitizer tests
- Supabase-backed privacy-conscious analytics event sink
- deterministic receipt scoring, confidence, template, and week-window logic
- branded receipt product layer with Weekly Vibe, Overall Score, free insight, locked teasers, Pro answer cards, and dev preview scenarios
- Receipt provider and receipt tab on linked home
- Phase 4 schema and RPC for idempotent weekly receipts
- Phase 3A schema and RPCs for check-ins, predictions, reveals, and streak updates
- Phase 3B schema and RPC for reactions, XP, cached relationship metrics, tiers, and analytics
- settings and sign-out flow
- Supabase foundation schema and policies
- dev reset helper for linked-couple and daily-loop testing

## Prerequisites

- Node.js 24+
- An Expo-compatible mobile environment
- A Supabase project with Email, Phone, and Apple auth providers configured

## Environment

Create a `.env` file in the project root:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Supabase setup

1. Open your Supabase project's SQL editor.
2. Run the migration in [supabase/migrations/20260417_phase1_auth_foundation.sql](/c:/Users/vkper/Downloads/Tethra/supabase/migrations/20260417_phase1_auth_foundation.sql:1).
3. Run the migration in [supabase/migrations/20260418_phase2_relationship_linking.sql](/c:/Users/vkper/Downloads/Tethra/supabase/migrations/20260418_phase2_relationship_linking.sql:1).
4. Run the migration in [supabase/migrations/20260424_phase2_invite_rpc_status_hotfix.sql](/c:/Users/vkper/Downloads/Tethra/supabase/migrations/20260424_phase2_invite_rpc_status_hotfix.sql:1) if your project was created before the Phase 2 hotfix commit.
5. Run the migration in [supabase/migrations/20260424_phase3a_daily_loop.sql](/c:/Users/vkper/Downloads/Tethra/supabase/migrations/20260424_phase3a_daily_loop.sql:1).
6. Run the migration in [supabase/migrations/20260424_phase3b_reactions_xp_tiers_analytics.sql](/c:/Users/vkper/Downloads/Tethra/supabase/migrations/20260424_phase3b_reactions_xp_tiers_analytics.sql:1).
7. Run the migration in [supabase/migrations/20260424_phase3b_progression_hotfix.sql](/c:/Users/vkper/Downloads/Tethra/supabase/migrations/20260424_phase3b_progression_hotfix.sql:1).
8. Run the migration in [supabase/migrations/20260424_phase3b_relationship_exit.sql](/c:/Users/vkper/Downloads/Tethra/supabase/migrations/20260424_phase3b_relationship_exit.sql:1).
9. Run the migration in [supabase/migrations/20260424_phase3b_realtime_publication.sql](/c:/Users/vkper/Downloads/Tethra/supabase/migrations/20260424_phase3b_realtime_publication.sql:1).
10. Run the migration in [supabase/migrations/20260424_phase4_weekly_receipts.sql](/c:/Users/vkper/Downloads/Tethra/supabase/migrations/20260424_phase4_weekly_receipts.sql:1).
11. Run the migration in [supabase/migrations/20260424_phase4_receipt_rpc_ambiguity_hotfix.sql](/c:/Users/vkper/Downloads/Tethra/supabase/migrations/20260424_phase4_receipt_rpc_ambiguity_hotfix.sql:1).
12. Run the migration in [supabase/migrations/20260424_phase4_receipt_rpc_v2_json.sql](/c:/Users/vkper/Downloads/Tethra/supabase/migrations/20260424_phase4_receipt_rpc_v2_json.sql:1).
13. In Auth providers:
   - enable Email
   - enable Phone
   - enable Apple
14. For native iOS builds, keep `ios.usesAppleSignIn` enabled in [app.json](/c:/Users/vkper/Downloads/Tethra/app.json:1).

## Running the app

```bash
npm start
```

Useful scripts:

- `npm run android`
- `npm run ios`
- `npm test`
- `npm run typecheck`

## Phase 2 Testing

Recommended simulator flow:

1. Sign in on simulator A with test account 1.
2. Sign in on simulator B with test account 2.
3. From simulator A, create an invite.
4. On simulator B, join using the 6-character code.
5. Verify both devices reopen into the linked state after sign out/sign in.
6. Re-test cancel and regenerate flows from simulator A.

Dev reset helper:

- [supabase/dev/reset_phase2_test_state.sql](/c:/Users/vkper/Downloads/Tethra/supabase/dev/reset_phase2_test_state.sql:1)
  Update the placeholder emails in that script before running it against your dev Supabase project.

## Phase 3A Testing

Recommended two-device flow:

1. Confirm both test accounts are linked.
2. On device A, complete the daily check-in.
3. On device A, predict device B's mood and relationship feeling.
4. Confirm device A shows the waiting state.
5. On device B, complete the daily check-in.
6. On device B, predict device A's mood and relationship feeling.
7. Confirm the reveal unlocks on both devices without manually refreshing.
8. Open the reveal on both devices.
9. Confirm current streak is `1` and duplicate check-ins/predictions are blocked.

## Phase 3B Testing

Recommended two-device flow:

1. Confirm both test accounts are linked and have a reveal unlocked.
2. On device A, open the reveal and send one reaction with no note.
3. Confirm device A cannot send a second reaction for that same reveal.
4. On device B, send a different reaction with a 12-160 character note.
5. Confirm both devices show partner activity and the partner reaction without manually refreshing.
6. Confirm the linked home shows XP, current tier, score, and next-tier progress.
7. Confirm the Rank tab does not jump to high tiers after only one paired day.
8. Tap Share rank and confirm the native share sheet opens.
9. In Supabase, confirm `analytics_events` has metadata events and does not store raw note text or raw answer scores.
10. Open Settings and confirm the dev reset button can reset both accounts back to unlinked in development builds.
11. Re-link both devices, then test Settings -> Exit relationship and confirm both accounts return to unlinked.
12. Re-run the dev reset helper when you want to repeat the full paired flow.

## Phase 4 Testing

Recommended receipt flow:

1. Run the Phase 4 receipts migration in Supabase.
2. Use a linked test couple with daily ritual data from a closed Monday-Sunday window.
3. Open the Receipt tab and tap Check receipt or Refresh receipt.
4. Confirm the receipt is created once and reopening the app reuses the same row.
5. Test a sparse week and confirm it says Tiny receipt / low signal instead of showing fake red flags.
6. Test a fuller week and confirm compatibility, communication, alignment, confidence, summary, and share text appear.
7. Confirm `analytics_events` records `receipt_generated` and `receipt_viewed` metadata only.
8. Confirm unrelated users cannot read another couple's receipts under RLS.

## Product Notes

- UI direction: less text, larger type, cozy visuals, and short emotionally clear cards.
- Realtime is part of the ritual: partner actions should just appear.
- Rank and receipt sharing use image capture of the card, with Phase 5 reserved for final screenshot-ready art direction.
- Rank should feel earned and socially comparable, not random or farmable.
- Future percentile comparison belongs on the Rank surface after enough real usage exists.
- Pro value should center on weekly receipt depth: green flags, red flags, conflict triggers, trend explanations, rank explanation, and history.
- Receipts should answer what happened and why, not just show more numbers.
- Shared product constants live in [tethra.ts](/c:/Users/vkper/Downloads/Tethra/src/product/tethra.ts:1) so future code/design work stays aligned to the core loop and monetization boundary.
- Dev receipt previews cover high sync, one-sided effort, high stress mismatch, low data, strong awareness, and poor awareness.
- If one linked partner buys Pro later, both partners should receive couple-level Pro access while linked.
- The relationship exit flow should unlink both people and clear couple ritual data; subscription cancellation remains handled through Apple/Google subscription management once RevenueCat lands.
- Keep the free core loop intact; monetize deeper interpretation, not basic daily use.

## Verified

- `npm run typecheck`
- `npm test`
- `npx expo export --platform android`
- `npx expo export --platform ios`

## Next Stage

Phase 5 is the major design and beta-polish pass:

- Claude/design integration over the functional app
- receipt/rank/history surfaces
- screenshot-ready share cards
- internal beta feedback capture
