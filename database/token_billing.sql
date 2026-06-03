-- Token billing migration
-- Run once against the ai_screenplay database

ALTER TABLE `ai_generation_logs`
  ADD COLUMN `tokens_in`  INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Input tokens' AFTER `model_name`,
  ADD COLUMN `tokens_out` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Output tokens' AFTER `tokens_in`,
  ADD COLUMN `cost_vnd`   DECIMAL(12,4) NOT NULL DEFAULT 0.0000 COMMENT 'Cost in VND' AFTER `tokens_out`,
  ADD COLUMN `call_type`  ENUM('generate','validate','character') NOT NULL DEFAULT 'generate' COMMENT 'Which AI call produced this' AFTER `cost_vnd`;

ALTER TABLE `users`
  ADD COLUMN `ai_balance_vnd` DECIMAL(15,2) NOT NULL DEFAULT 0.00 COMMENT 'Prepaid AI credit balance (VND)' AFTER `pro_expires_at`;

-- Default token pricing (VND per 1 000 tokens)
INSERT INTO `payment_settings` (`setting_key`, `setting_value`)
VALUES
  ('token_price_input_per_1k_vnd',  '5'),
  ('token_price_output_per_1k_vnd', '15')
ON DUPLICATE KEY UPDATE `setting_value` = VALUES(`setting_value`);
