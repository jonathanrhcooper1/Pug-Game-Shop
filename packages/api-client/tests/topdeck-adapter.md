# TopDeck Adapter Tests

Required coverage:

- `getMyTournaments()`.
- `getTournamentInfo(tid)`.
- `getAttendees(tid)`.
- `registerPlayers(tid, emails, overrideCap)`.
- `syncEventFromTopDeck(tid)`.
- `importOwnedEvents()`.
- `createEvent(eventData)` returns `not_supported` unless a documented create
  endpoint or private account API is configured.
- Manual TID/event URL linking.
- 409 capacity conflict handling.
- Pending invitation response handling.
- Already registered response handling.
- Failed/banned response handling.
- API key masking in logs.

Fixture inputs:

- `fixtures/mocks/topdeck/owned-tournaments.json`
- `fixtures/mocks/topdeck/register-player-responses.json`
