# Tethra

Tethra is a couples app built with Expo / React Native. The project is currently at **Phase 1: Auth Foundation + Profile Bootstrap**.

## Current Stage

Phase 1 is implemented and focused on getting the mobile app ready for the rest of the product loop.

- Expo Router app shell is in place
- Supabase auth is wired for email, phone OTP, and Apple sign-in on iOS
- session restore and route guards are working
- new users are routed through required profile completion
- signed-in users land on a placeholder home for future couple-linking flows
- Supabase SQL migrations exist for `profiles`, `couples`, and row-level security

## Implemented in Phase 1

- auth chooser screen
- email sign in / sign up
- phone OTP sign in
- Apple sign in on iOS
- profile completion onboarding
- signed-in home shell
- settings and sign-out flow
- Supabase foundation schema and policies

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
3. In Auth providers:
   - enable Email
   - enable Phone
   - enable Apple
4. For native iOS builds, keep `ios.usesAppleSignIn` enabled in [app.json](/c:/Users/vkper/Downloads/Tethra/app.json:1).

## Running the app

```bash
npm start
```

Useful scripts:

- `npm run android`
- `npm run ios`
- `npm run typecheck`

## Verified

- `npm run typecheck`
- `npx expo export --platform android`
- `npx expo export --platform ios`

## Next Stage

Phase 2 is the first real relationship loop layer. That work should build on this foundation with:

- couple linking
- daily check-ins
- notes
- streaks
- receipts
- XP / tiers
- monetization
