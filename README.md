# Tethra

Tethra is a couples app built with Expo / React Native. The project is currently at **Phase 2: Couple Linking + Relationship State Machine**.

## Current Stage

Phase 2 is implemented and focused on the first real shared relationship flow.

- Expo Router app shell is in place
- Supabase auth is wired for email, phone OTP, and Apple sign-in on iOS
- session restore and route guards are working
- new users are routed through required profile completion
- signed-in users now land in a relationship state machine instead of a placeholder shell
- couples can create, join, cancel, regenerate, and restore invite/link state from the signed-in home
- invite codes are 6-character uppercase alphanumeric codes with a 24-hour lifetime
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
- settings and sign-out flow
- Supabase foundation schema and policies
- dev reset helper for Phase 2 simulator testing

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
4. In Auth providers:
   - enable Email
   - enable Phone
   - enable Apple
5. For native iOS builds, keep `ios.usesAppleSignIn` enabled in [app.json](/c:/Users/vkper/Downloads/Tethra/app.json:1).

## Running the app

```bash
npm start
```

Useful scripts:

- `npm run android`
- `npm run ios`
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

## Verified

- `npm run typecheck`
- `npx expo export --platform android`
- `npx expo export --platform ios`

## Next Stage

Phase 3A builds the first recurring relationship loop on top of the linked-couple foundation:

- daily check-ins
- streaks
- couple-local day boundaries
- duplicate-check-in prevention
- paired-day streak behavior
