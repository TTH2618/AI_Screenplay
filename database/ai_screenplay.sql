-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Jun 08, 2026 at 08:18 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `ai_screenplay`
--

-- --------------------------------------------------------

--
-- Table structure for table `ai_generation_logs`
--

CREATE TABLE `ai_generation_logs` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `project_id` int(11) DEFAULT NULL,
  `tool_id` varchar(50) NOT NULL,
  `provider` varchar(50) NOT NULL DEFAULT 'openrouter',
  `model_name` varchar(120) DEFAULT NULL,
  `tokens_in` int(10) UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Input tokens',
  `tokens_out` int(10) UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Output tokens',
  `cost_vnd` decimal(12,4) NOT NULL DEFAULT 0.0000 COMMENT 'Cost in VND',
  `call_type` enum('generate','validate','character') NOT NULL DEFAULT 'generate' COMMENT 'Which AI call produced this',
  `status` enum('success','error','timeout') NOT NULL,
  `latency_ms` int(10) UNSIGNED NOT NULL,
  `error_type` varchar(120) DEFAULT NULL,
  `error_message` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `api_credentials`
--

CREATE TABLE `api_credentials` (
  `id` int(10) UNSIGNED NOT NULL,
  `provider` varchar(50) NOT NULL,
  `api_key` text NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `updated_by` int(11) DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `beatsheets`
--

CREATE TABLE `beatsheets` (
  `id` int(11) NOT NULL,
  `project_id` int(11) NOT NULL,
  `type` enum('screenplay','story') NOT NULL DEFAULT 'screenplay',
  `input_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`input_data`)),
  `output_data` longtext DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `characters`
--

CREATE TABLE `characters` (
  `id` int(11) NOT NULL,
  `project_id` int(11) NOT NULL,
  `type` enum('screenplay','story') NOT NULL DEFAULT 'screenplay',
  `input_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`input_data`)),
  `output_data` longtext DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `custom_plans`
--

CREATE TABLE `custom_plans` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `months` int(11) NOT NULL DEFAULT 1,
  `price` int(11) NOT NULL,
  `note` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `developments`
--

CREATE TABLE `developments` (
  `id` int(11) NOT NULL,
  `project_id` int(11) NOT NULL,
  `type` enum('screenplay','story') NOT NULL DEFAULT 'screenplay',
  `input_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`input_data`)),
  `output_data` longtext DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `loglines`
--

CREATE TABLE `loglines` (
  `id` int(11) NOT NULL,
  `project_id` int(11) NOT NULL,
  `input_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`input_data`)),
  `output_data` longtext DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `payment_orders`
--

CREATE TABLE `payment_orders` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `order_code` bigint(20) NOT NULL,
  `package_id` varchar(20) NOT NULL,
  `amount` int(11) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `status` enum('pending','paid','cancelled','expired') DEFAULT 'pending',
  `checkout_url` text DEFAULT NULL,
  `payment_link_id` varchar(100) DEFAULT NULL,
  `paid_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `payment_settings`
--

CREATE TABLE `payment_settings` (
  `id` int(11) NOT NULL,
  `setting_key` varchar(100) NOT NULL,
  `setting_value` text DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `projects`
--

CREATE TABLE `projects` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `title` varchar(200) NOT NULL,
  `description` text DEFAULT NULL,
  `status` enum('draft','in_progress','completed') DEFAULT 'draft',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `scenelists`
--

CREATE TABLE `scenelists` (
  `id` int(11) NOT NULL,
  `project_id` int(11) NOT NULL,
  `type` enum('screenplay','story') NOT NULL DEFAULT 'screenplay',
  `input_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`input_data`)),
  `output_data` longtext DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `scripts`
--

CREATE TABLE `scripts` (
  `id` int(11) NOT NULL,
  `project_id` int(11) NOT NULL,
  `type` enum('screenplay','story') NOT NULL DEFAULT 'screenplay',
  `input_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`input_data`)),
  `output_data` longtext DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `stories`
--

CREATE TABLE `stories` (
  `id` int(11) NOT NULL,
  `project_id` int(11) NOT NULL,
  `input_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `output_data` longtext DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `structures`
--

CREATE TABLE `structures` (
  `id` int(11) NOT NULL,
  `project_id` int(11) NOT NULL,
  `type` enum('screenplay','story') NOT NULL DEFAULT 'screenplay',
  `input_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`input_data`)),
  `output_data` longtext DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `synopses`
--

CREATE TABLE `synopses` (
  `id` int(11) NOT NULL,
  `project_id` int(11) NOT NULL,
  `type` enum('screenplay','story') NOT NULL DEFAULT 'screenplay',
  `input_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`input_data`)),
  `output_data` longtext DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `system_prompts`
--

CREATE TABLE `system_prompts` (
  `id` int(10) UNSIGNED NOT NULL,
  `tool_id` varchar(50) NOT NULL,
  `prompt_text` longtext NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `updated_by` int(11) DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `themes`
--

CREATE TABLE `themes` (
  `id` int(11) NOT NULL,
  `project_id` int(11) NOT NULL,
  `type` enum('screenplay','story') NOT NULL DEFAULT 'screenplay',
  `input_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`input_data`)),
  `output_data` longtext DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `uploaded_story_files`
--

CREATE TABLE `uploaded_story_files` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `original_name` varchar(255) NOT NULL,
  `stored_name` varchar(255) NOT NULL,
  `file_type` varchar(20) NOT NULL,
  `size_bytes` bigint(20) UNSIGNED NOT NULL,
  `storage_path` varchar(500) NOT NULL,
  `extracted_chars` int(10) UNSIGNED NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `username` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `full_name` varchar(100) DEFAULT NULL,
  `gender` enum('male','female','other') DEFAULT NULL,
  `date_of_birth` date DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `avatar` varchar(500) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `is_admin` tinyint(1) NOT NULL DEFAULT 0,
  `account_status` enum('active','banned') NOT NULL DEFAULT 'active',
  `plan_type` enum('free','pro') NOT NULL DEFAULT 'free',
  `pro_expires_at` datetime DEFAULT NULL,
  `ai_balance_vnd` decimal(15,2) NOT NULL DEFAULT 0.00 COMMENT 'Prepaid AI credit balance (VND)',
  `last_login_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `username`, `email`, `password`, `full_name`, `gender`, `date_of_birth`, `phone`, `avatar`, `created_at`, `updated_at`, `is_admin`, `account_status`, `plan_type`, `pro_expires_at`, `ai_balance_vnd`, `last_login_at`) VALUES
(1, 'admin', 'admin@gmail.com', '$2b$10$58/Ecn3dndIulS/OOoFfW.Xc25V9bvffIc9ejfrgnsC8TK/GNWPEu', 'Quản trị viên', NULL, NULL, NULL, '/uploads/avatars/avatar_1_1779716300721.jpg', '2026-01-30 10:55:23', '2026-06-08 16:23:18', 1, 'active', 'pro', '2026-07-28 16:00:00', -1642.26, '2026-06-08 23:16:02');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `ai_generation_logs`
--
ALTER TABLE `ai_generation_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_ai_logs_created` (`created_at`),
  ADD KEY `idx_ai_logs_status` (`status`),
  ADD KEY `idx_ai_logs_user` (`user_id`),
  ADD KEY `idx_ai_logs_project` (`project_id`);

--
-- Indexes for table `api_credentials`
--
ALTER TABLE `api_credentials`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_provider` (`provider`);

--
-- Indexes for table `beatsheets`
--
ALTER TABLE `beatsheets`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_beatsheets_project_type` (`project_id`,`type`);

--
-- Indexes for table `characters`
--
ALTER TABLE `characters`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_characters_project_type` (`project_id`,`type`);

--
-- Indexes for table `custom_plans`
--
ALTER TABLE `custom_plans`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `developments`
--
ALTER TABLE `developments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_developments_project_type` (`project_id`,`type`);

--
-- Indexes for table `loglines`
--
ALTER TABLE `loglines`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_loglines_project_id` (`project_id`);

--
-- Indexes for table `payment_orders`
--
ALTER TABLE `payment_orders`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `order_code` (`order_code`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_order_code` (`order_code`),
  ADD KEY `idx_status` (`status`);

--
-- Indexes for table `payment_settings`
--
ALTER TABLE `payment_settings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `setting_key` (`setting_key`);

--
-- Indexes for table `projects`
--
ALTER TABLE `projects`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_projects_user_id` (`user_id`);

--
-- Indexes for table `scenelists`
--
ALTER TABLE `scenelists`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_scenelists_project_type` (`project_id`,`type`);

--
-- Indexes for table `scripts`
--
ALTER TABLE `scripts`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_scripts_project_type` (`project_id`,`type`);

--
-- Indexes for table `stories`
--
ALTER TABLE `stories`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_stories_project_id` (`project_id`);

--
-- Indexes for table `structures`
--
ALTER TABLE `structures`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_structures_project_type` (`project_id`,`type`);

--
-- Indexes for table `synopses`
--
ALTER TABLE `synopses`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_synopses_project_type` (`project_id`,`type`);

--
-- Indexes for table `system_prompts`
--
ALTER TABLE `system_prompts`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_tool_id` (`tool_id`),
  ADD KEY `idx_system_prompts_active` (`is_active`);

--
-- Indexes for table `themes`
--
ALTER TABLE `themes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_themes_project_type` (`project_id`,`type`);

--
-- Indexes for table `uploaded_story_files`
--
ALTER TABLE `uploaded_story_files`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_story_files_created` (`created_at`),
  ADD KEY `idx_story_files_user` (`user_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `ai_generation_logs`
--
ALTER TABLE `ai_generation_logs`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `api_credentials`
--
ALTER TABLE `api_credentials`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `beatsheets`
--
ALTER TABLE `beatsheets`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `characters`
--
ALTER TABLE `characters`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `custom_plans`
--
ALTER TABLE `custom_plans`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `developments`
--
ALTER TABLE `developments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `loglines`
--
ALTER TABLE `loglines`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `payment_orders`
--
ALTER TABLE `payment_orders`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `payment_settings`
--
ALTER TABLE `payment_settings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `projects`
--
ALTER TABLE `projects`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `scenelists`
--
ALTER TABLE `scenelists`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `scripts`
--
ALTER TABLE `scripts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `stories`
--
ALTER TABLE `stories`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `structures`
--
ALTER TABLE `structures`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `synopses`
--
ALTER TABLE `synopses`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `system_prompts`
--
ALTER TABLE `system_prompts`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `themes`
--
ALTER TABLE `themes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `uploaded_story_files`
--
ALTER TABLE `uploaded_story_files`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `beatsheets`
--
ALTER TABLE `beatsheets`
  ADD CONSTRAINT `beatsheets_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `characters`
--
ALTER TABLE `characters`
  ADD CONSTRAINT `characters_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `developments`
--
ALTER TABLE `developments`
  ADD CONSTRAINT `developments_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `loglines`
--
ALTER TABLE `loglines`
  ADD CONSTRAINT `loglines_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `projects`
--
ALTER TABLE `projects`
  ADD CONSTRAINT `projects_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `scenelists`
--
ALTER TABLE `scenelists`
  ADD CONSTRAINT `scenelists_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `scripts`
--
ALTER TABLE `scripts`
  ADD CONSTRAINT `scripts_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `stories`
--
ALTER TABLE `stories`
  ADD CONSTRAINT `stories_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `structures`
--
ALTER TABLE `structures`
  ADD CONSTRAINT `structures_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `synopses`
--
ALTER TABLE `synopses`
  ADD CONSTRAINT `synopses_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `themes`
--
ALTER TABLE `themes`
  ADD CONSTRAINT `themes_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
