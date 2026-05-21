-- Per-game cash payout override (division default in settings.pay_rates)
ALTER TABLE games ADD COLUMN IF NOT EXISTS is_cash_game boolean NOT NULL DEFAULT false;
