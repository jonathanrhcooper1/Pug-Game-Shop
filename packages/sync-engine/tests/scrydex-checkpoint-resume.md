# ScryDex Checkpoint And Resume Tests

Required coverage:

- Page/cursor checkpoint is written after each successful page.
- Interrupted sync resumes from the last successful cursor.
- Duplicate cards, variants, prices, and images are not created on resume.
- Rate-limit metadata is respected.
- Raw provider payloads are masked before logging.
- Webhook signature and replay protection are validated when webhook support is
  implemented.

Fixture inputs:

- `fixtures/mocks/scrydex/cards-page-1.json`
- `fixtures/mocks/scrydex/checkpoint-resume.json`
