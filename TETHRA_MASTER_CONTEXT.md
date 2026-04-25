# Tethra Master Context

Tethra is a private couple ritual app for iOS and Android, built with Expo and Supabase.

The product must optimize for:

- daily habit through a short shared ritual
- viral identity through tiers and share cards
- monetization through weekly receipt depth
- simplicity, privacy, and App Store-safe positioning

Tethra is not a journaling app, generic mood tracker, therapy product, full chat app, or social network.

Tethra is a shared daily ritual, relationship insight engine, viral screenshotable experience, and private couple-only app.

## Core Loop

Everything should support:

`check-in -> predict -> reveal -> react -> progress -> receipt`

Daily:

1. Each user completes a short check-in.
2. Each user predicts their partner.
3. Daily reveal unlocks once both complete.
4. Users can react or leave a short day-scoped note.
5. Streak, XP, and tier progress update.

Weekly:

1. A Relationship Receipt is generated.
2. Free users see the basic receipt and blurred/locked teasers.
3. Pro users unlock deeper answers and history.

## Product Pillars

- Relationship Receipt: main acquisition and monetization surface.
- Daily Couple Loop: habit and data engine.
- Relationship Tiers: viral identity layer for sharing.

## Monetization Boundary

Free users get:

- full daily loop
- basic receipt
- current tier and progress
- partial insight
- curiosity and anticipation

Pro users unlock:

- full weekly receipt
- biggest green flag
- biggest red flag
- who cares more
- who misunderstood who
- biggest trigger
- effort imbalance
- trend history
- detailed ranking explanation
- richer share formats

Do not lock core usage. Lock answers and depth.

## Receipt Direction

Receipts should feel funny, emotionally interesting, slightly exposing, fair, and data-backed.

Free receipt sections:

- Weekly Vibe
- Overall Score
- Current Relationship Tier
- Basic Summary
- One soft public insight
- Blurred premium teasers

Pro receipt sections:

- Biggest Green Flag
- Biggest Red Flag
- Who Cares More
- Who Misread Who
- Biggest Trigger
- Effort Imbalance
- Partner Awareness Breakdown
- What To Do Next
- Receipt History and Trends

Receipts must answer what happened and why. They should not feel like generic analytics reports.

## Tier Direction

Tier is the viral identity layer.

Tiers:

- Who Even Are You
- Situationship Survivors
- Text Me Back
- Actually a Couple
- Locked In
- Ride or Dies
- Soft Married
- Endgame

Tier architecture:

`hidden score -> visible tier -> optional ranking/percentile`

Hidden score should use a rolling 14-21 day window:

- consistency: 40%
- partner awareness: 30%
- mutual effort: 20%
- interaction depth: 10%

XP is short-term momentum. XP does not determine tier.

## Store Constraints

Before launch:

- in-app account deletion is required
- Google web deletion path is required
- subscriptions must use Apple/Google billing through RevenueCat
- restore purchases is required
- no public feed
- no anonymous/random interaction
- no therapy, diagnosis, scientific-proof, or objective-truth claims
- request permissions contextually only

## Current Implementation Truth

Phase 1, Phase 2, Phase 3A, Phase 3B, and a functional Phase 4 foundation exist in code.

Future work should preserve:

- Expo Router + Supabase
- private linked-couple model
- relationship state machine
- daily loop order
- tier driven by hidden score, not XP
- deterministic/template-based receipts
- RevenueCat later for subscriptions

Phase 5 is the major design, history, sharing, and beta polish phase.
