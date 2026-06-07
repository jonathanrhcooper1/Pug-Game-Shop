# Pricing Engine Tests

Required coverage:

- Suggested price is market price plus 10 percent with currency rounding.
- Missing minimum price blocks intake.
- Automated pricing never drops below minimum sale price.
- Price lock prevents automatic change.
- Floor hits are logged.
- Mismatched currency blocks automatic pricing unless explicit conversion exists.
- Below-minimum sale requires manager override.

The WordPress plugin currently includes dependency-free pricing tests in
`apps/wordpress-plugin/tests/Unit/PricingCalculatorTest.php`; this package test
suite will become the shared pricing-engine contract as Phase 2 expands.
