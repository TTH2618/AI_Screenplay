-- Bảng lưu đơn thanh toán PayOS
CREATE TABLE IF NOT EXISTS `payment_orders` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `order_code` BIGINT UNIQUE NOT NULL,
  `package_id` VARCHAR(20) NOT NULL,
  `amount` INT NOT NULL,
  `description` VARCHAR(255),
  `status` ENUM('pending','paid','cancelled','expired') DEFAULT 'pending',
  `checkout_url` TEXT,
  `payment_link_id` VARCHAR(100),
  `paid_at` DATETIME,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_order_code` (`order_code`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
