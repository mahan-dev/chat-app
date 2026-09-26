# project — What and Why

## One-liner

A 1-on-1 realtime messenger (think: minimal Telegram): create an account, fill
in a profile, find anyone by username, and chat instantly. Built to learn
full-stack development and context-driven workflows with Claude Code.

## Goals

1. Every layer stays understandable end-to-end:
   raw SQL instead of an ORM, hand-rolled JWT auth instead of an auth provider,
   explicit Socket.IO events instead of a realtime framework.
2. A complete account lifecycle — sign up, edit profile, log out, delete
   account — done properly (hashing, anonymization, auth invalidation).
3. Working realtime messaging: messages appear instantly for both sides and
   survive a server restart.

## User stories

- As a visitor, I can sign up with a username and password, and log in.
- As a user, I can edit my profile: first name, last name, bio. My avatar is
  generated from my initials — no upload.
- As a user, I can search for any user by username and open a conversation
  instantly (no friend request).
- As a user, I see my conversations in a sidebar, most recently active first.
- As a user, messages I send appear for the other person in real time, and
  history is there when I come back.
- As a user, I can log out, and log back in without losing anything.
- As a user, I can permanently delete my account. My messages remain for
  others, attributed to "Deleted User"; everything else about me is erased.

## Non-goals (explicitly out of scope)

- Group chats, channels, threads, reactions, file/image upload
- Message editing or deletion, read receipts, unread counts
- Friend requests / contact approval — anyone can message anyone
- Email, password reset, OAuth/social login
- Scaling concerns (Redis, brokers, clustering); deployment/hosting
- Blocking users (would be required before any real deployment)

If a feature is not in `features.md`, it is a non-goal until added there.

## Done means

- All user stories pass with two browsers side by side (two accounts).
- Messages persist across a server restart.
- A deleted account cannot log in, its JWT stops working, its profile is
  gone, and its old messages display as "Deleted User".
- Client build and server type-check pass with zero errors.
