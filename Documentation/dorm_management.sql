-- phpMyAdmin SQL Dump
-- version 5.2.0
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1:3306
-- Generation Time: Mar 15, 2026 at 01:22 PM
-- Server version: 8.0.31
-- PHP Version: 8.0.26

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `dorm_management`
--

-- --------------------------------------------------------

--
-- Table structure for table `admin_profiles`
--

DROP TABLE IF EXISTS `admin_profiles`;
CREATE TABLE IF NOT EXISTS `admin_profiles` (
  `admin_profile_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `dormitory_id` int NOT NULL,
  `position` varchar(100) DEFAULT 'Dormitory Administrator',
  `phone` varchar(30) DEFAULT NULL,
  PRIMARY KEY (`admin_profile_id`),
  UNIQUE KEY `user_id` (`user_id`),
  KEY `dormitory_id` (`dormitory_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `admin_profiles`
--

INSERT INTO `admin_profiles` (`admin_profile_id`, `user_id`, `dormitory_id`, `position`, `phone`) VALUES
(1, 1, 1, 'Dormitory Administrator', '+49 912 000 1001');

-- --------------------------------------------------------

--
-- Table structure for table `application_files`
--

DROP TABLE IF EXISTS `application_files`;
CREATE TABLE IF NOT EXISTS `application_files` (
  `id` int NOT NULL AUTO_INCREMENT,
  `application_id` int DEFAULT NULL,
  `file_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `application_id` (`application_id`),
  KEY `file_id` (`file_id`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `application_files`
--

INSERT INTO `application_files` (`id`, `application_id`, `file_id`) VALUES
(1, 6, 2),
(2, 6, 3),
(3, 6, 4),
(4, 7, 7),
(5, 7, 8),
(6, 7, 9),
(7, 8, 12),
(8, 8, 13),
(9, 8, 14);

-- --------------------------------------------------------

--
-- Table structure for table `complaints`
--

DROP TABLE IF EXISTS `complaints`;
CREATE TABLE IF NOT EXISTS `complaints` (
  `complaint_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `description` text,
  `status` enum('SUBMITTED','IN_PROGRESS','RESOLVED') NOT NULL DEFAULT 'SUBMITTED',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`complaint_id`),
  KEY `user_id` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `complaints`
--

INSERT INTO `complaints` (`complaint_id`, `user_id`, `description`, `status`, `created_at`) VALUES
(1, 2, 'AC unit in room 101 is not cooling and makes loud noise at night.', 'IN_PROGRESS', '2026-03-10 01:36:30'),
(2, 3, 'Water leak detected in the bathroom ceiling of room 102.', 'IN_PROGRESS', '2026-03-10 01:36:30'),
(3, 4, 'Main door lock was broken. Reported last week and now fixed.', 'RESOLVED', '2026-03-10 01:36:30'),
(4, 5, '[Wifi not working] My wifi is not working since this morning.', 'SUBMITTED', '2026-03-10 11:38:53'),
(5, 5, '[Window not shown] The window is transparent', 'IN_PROGRESS', '2026-03-10 11:46:02'),
(6, 7, '[I am not getting a response] I have submitted an application but no response till now/', 'SUBMITTED', '2026-03-15 08:38:19'),
(7, 5, '[why] O god why me?', 'IN_PROGRESS', '2026-03-15 09:21:08'),
(8, 1, '[Hi] Test', 'SUBMITTED', '2026-03-15 09:50:04');

-- --------------------------------------------------------

--
-- Table structure for table `contracts`
--

DROP TABLE IF EXISTS `contracts`;
CREATE TABLE IF NOT EXISTS `contracts` (
  `contract_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `room_id` int DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `status` enum('ACTIVE','EXTENDED','TERMINATED') NOT NULL DEFAULT 'ACTIVE',
  `signed_document_file_id` int DEFAULT NULL,
  `monthly_rent` decimal(10,2) DEFAULT NULL,
  `due_day` tinyint DEFAULT '15',
  `generated_doc_file_id` int DEFAULT NULL,
  `termination_reason` text,
  PRIMARY KEY (`contract_id`),
  UNIQUE KEY `user_id` (`user_id`),
  KEY `room_id` (`room_id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `contracts`
--

INSERT INTO `contracts` (`contract_id`, `user_id`, `room_id`, `start_date`, `end_date`, `status`, `signed_document_file_id`, `monthly_rent`, `due_day`, `generated_doc_file_id`, `termination_reason`) VALUES
(1, 2, 1, '2026-01-15', '2026-12-15', 'ACTIVE', NULL, '350.00', 15, NULL, NULL),
(2, 3, 2, '2026-01-15', '2026-04-10', 'TERMINATED', NULL, '334.00', 15, NULL, 'Bad influence'),
(3, 4, 3, '2026-01-15', '2026-12-15', 'ACTIVE', NULL, '334.00', 15, NULL, NULL),
(4, 5, 5, '2026-03-25', '2026-04-15', 'TERMINATED', 6, '300.00', 15, 15, 'mistake');

-- --------------------------------------------------------

--
-- Table structure for table `dormitories`
--

DROP TABLE IF EXISTS `dormitories`;
CREATE TABLE IF NOT EXISTS `dormitories` (
  `dormitory_id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(150) NOT NULL,
  `address` varchar(255) DEFAULT NULL,
  `contact_email` varchar(150) DEFAULT NULL,
  `contact_phone` varchar(30) DEFAULT NULL,
  `max_capacity` int NOT NULL DEFAULT '50',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `notifications_enabled` tinyint(1) NOT NULL DEFAULT '1',
  `payment_reminders_enabled` tinyint(1) NOT NULL DEFAULT '1',
  `maintenance_alerts_enabled` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`dormitory_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `dorm_applications` (`application_id`, `user_id`, `submission_date`, `status`, `assigned_room_id`, `created_at`, `application_type`, `remarks`) VALUES
(1, 2, '2025-12-01', 'ACCEPTED', 1, '2026-03-10 01:36:30', 'NEW', NULL),
(2, 3, '2025-12-01', 'ACCEPTED', 2, '2026-03-10 01:36:30', 'NEW', NULL),
(3, 4, '2025-12-01', 'ACCEPTED', 3, '2026-03-10 01:36:30', 'NEW', NULL),
(4, 5, '2026-01-20', 'ACCEPTED', 5, '2026-03-10 01:36:30', 'NEW', NULL),
(5, 6, '2026-01-20', 'PENDING', NULL, '2026-03-10 01:36:30', 'NEW', NULL),
(6, 5, '2026-03-31', 'ACCEPTED', 5, '2026-03-10 02:34:05', 'NEW', NULL),
(7, 2, '2026-03-09', 'REJECTED', NULL, '2026-03-10 03:12:25', 'NEW', NULL),
(8, 7, '2026-04-01', 'PENDING', NULL, '2026-03-15 08:35:52', 'NEW', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `file_metadata`
--

DROP TABLE IF EXISTS `file_metadata`;
CREATE TABLE IF NOT EXISTS `file_metadata` (
  `file_id` int NOT NULL AUTO_INCREMENT,
  `file_path` varchar(255) NOT NULL,
  `file_type` varchar(50) DEFAULT NULL,
  `upload_date` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`file_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `file_metadata` (`file_id`, `file_path`, `file_type`, `upload_date`) VALUES
(1, '1773106934072-575700.pdf', 'application/pdf', '2026-03-10 01:42:14'),
(2, '1773110045270-796930.pdf', 'application/pdf', '2026-03-10 02:34:05'),
(3, '1773110045272-774363.pdf', 'application/pdf', '2026-03-10 02:34:05'),
(4, '1773110045272-902906.pdf', 'application/pdf', '2026-03-10 02:34:05'),
(5, 'contract_4_1773110100002.pdf', 'application/pdf', '2026-03-10 02:35:00'),
(6, '1773110411250-952677.pdf', 'application/pdf', '2026-03-10 02:40:11'),
(7, '1773112345140-180254.pdf', 'application/pdf', '2026-03-10 03:12:25'),
(8, '1773112345143-270893.pdf', 'application/pdf', '2026-03-10 03:12:25'),
(9, '1773112345143-720825.pdf', 'application/pdf', '2026-03-10 03:12:25'),
(10, '1773112364493-268900.pdf', 'application/pdf', '2026-03-10 03:12:44'),
(11, '1773112379273-896866.pdf', 'application/pdf', '2026-03-10 03:12:59'),
(12, '1773563752483-496512.pdf', 'application/pdf', '2026-03-15 08:35:52'),
(13, '1773563752484-716020.pdf', 'application/pdf', '2026-03-15 08:35:52'),
(14, '1773563752485-233181.pdf', 'application/pdf', '2026-03-15 08:35:52'),
(15, 'contract_4_1773566668523.pdf', 'application/pdf', '2026-03-15 09:24:28');

-- --------------------------------------------------------

CREATE TABLE `users` (
  `user_id`       int NOT NULL AUTO_INCREMENT,
  `name`          varchar(100) NOT NULL,
  `email`         varchar(150) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role`          enum('STUDENT','ADMIN') NOT NULL,
  `created_at`    timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `email` (`email`),
  KEY `dormitory_id` (`dormitory_id`),
  CONSTRAINT `users_dorm_fk` FOREIGN KEY (`dormitory_id`) REFERENCES `dormitories` (`dormitory_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

DROP TABLE IF EXISTS `notifications`;
CREATE TABLE IF NOT EXISTS `notifications` (
  `notification_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `type` enum('application','contract','payment','complaint') NOT NULL,
  `message` text NOT NULL,
  `tab` varchar(30) NOT NULL,
  `is_read` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `reference_id` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`notification_id`),
  UNIQUE KEY `uniq_user_ref` (`user_id`,`reference_id`)
) ENGINE=MyISAM AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `notifications`
--

INSERT INTO `notifications` (`notification_id`, `user_id`, `type`, `message`, `tab`, `is_read`, `created_at`, `reference_id`) VALUES
(1, 5, 'complaint', 'Your complaint #5 is now being investigated.', 'complaints', 1, '2026-03-15 09:23:19', NULL),
(2, 5, 'application', 'Your application has been accepted! Room 105 has been assigned to you.', 'apply', 1, '2026-03-15 09:24:28', NULL),
(3, 1, 'complaint', 'A new complaint has been submitted by a student.', 'requests', 1, '2026-03-15 09:50:04', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `progress`
--

DROP TABLE IF EXISTS `progress`;
CREATE TABLE IF NOT EXISTS `progress` (
  `progress_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `task_name` varchar(100) DEFAULT NULL,
  `percentage` int DEFAULT '0',
  `status` varchar(50) DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`progress_id`),
  KEY `user_id` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `progress`
--

INSERT INTO `progress` (`progress_id`, `user_id`, `task_name`, `percentage`, `status`, `updated_at`) VALUES
(1, 3, 'report_generation', 0, 'cancelled', '2026-03-10 01:49:01'),
(2, 2, 'report_generation', 100, 'completed', '2026-03-10 01:58:01'),
(3, 5, 'report_generation', 100, 'completed', '2026-03-10 02:43:48'),
(4, 5, 'report_generation', 100, 'completed', '2026-03-10 11:46:11');

-- --------------------------------------------------------

--
-- Table structure for table `rent_payments`
--

DROP TABLE IF EXISTS `rent_payments`;
CREATE TABLE IF NOT EXISTS `rent_payments` (
  `payment_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `month` varchar(20) DEFAULT NULL,
  `amount` decimal(10,2) DEFAULT NULL,
  `receipt_file_id` int DEFAULT NULL,
  `verification_status` enum('PENDING_VERIFICATION','VERIFIED','REJECTED') NOT NULL DEFAULT 'PENDING_VERIFICATION',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`payment_id`),
  KEY `user_id` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `rent_payments`
--

INSERT INTO `rent_payments` (`payment_id`, `user_id`, `month`, `amount`, `receipt_file_id`, `verification_status`, `created_at`) VALUES
(3, 3, 'Jan', '4500.00', NULL, 'REJECTED', '2026-03-10 01:36:30'),
(4, 4, 'Jan', '5500.00', NULL, 'VERIFIED', '2026-03-10 01:36:30'),
(5, 4, 'Feb', '5500.00', NULL, 'REJECTED', '2026-03-10 01:36:30'),
(6, 2, 'Mar', '350.00', 1, 'VERIFIED', '2026-03-10 01:42:14'),
(7, 2, 'Jan', '350.00', 10, 'VERIFIED', '2026-03-10 03:12:44'),
(8, 2, 'Feb', '350.00', 11, 'VERIFIED', '2026-03-10 03:12:59');

-- --------------------------------------------------------

--
-- Table structure for table `reports`
--

DROP TABLE IF EXISTS `reports`;
CREATE TABLE IF NOT EXISTS `reports` (
  `report_id` int NOT NULL AUTO_INCREMENT,
  `generated_by` int DEFAULT NULL,
  `generation_date` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `file_path` varchar(255) DEFAULT NULL,
  `status` enum('PENDING','COMPLETED','CANCELLED','FAILED') NOT NULL DEFAULT 'PENDING',
  `progress_id` int DEFAULT NULL,
  `report_source` enum('ADMIN','STUDENT') NOT NULL DEFAULT 'STUDENT',
  PRIMARY KEY (`report_id`),
  KEY `generated_by` (`generated_by`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `reports`
--

INSERT INTO `reports` (`report_id`, `generated_by`, `generation_date`, `file_path`, `status`, `progress_id`, `report_source`) VALUES
(1, 3, '2026-03-10 01:47:35', 'report_3_1.pdf', 'COMPLETED', 1, 'STUDENT'),
(2, 2, '2026-03-10 01:58:01', 'report_2_2.pdf', 'COMPLETED', 2, 'STUDENT'),
(3, 5, '2026-03-10 02:43:48', 'report_5_3.pdf', 'COMPLETED', 3, 'STUDENT'),
(4, 5, '2026-03-10 11:46:11', 'report_5_4.pdf', 'COMPLETED', 4, 'STUDENT'),
(5, 1, '2026-03-15 10:42:49', 'admin_report_1_1773571368698.pdf', 'COMPLETED', NULL, 'ADMIN');

-- --------------------------------------------------------

--
-- Table structure for table `rooms`
--

DROP TABLE IF EXISTS `rooms`;
CREATE TABLE IF NOT EXISTS `rooms` (
  `room_id` int NOT NULL AUTO_INCREMENT,
  `room_number` varchar(10) NOT NULL,
  `floor` int NOT NULL,
  `type` enum('Single','Double','Suite') NOT NULL DEFAULT 'Single',
  `status` enum('occupied','vacant','maintenance') NOT NULL DEFAULT 'vacant',
  `resident_id` int DEFAULT NULL,
  PRIMARY KEY (`room_id`),
  UNIQUE KEY `room_number_unique` (`room_number`),
  KEY `resident_id` (`resident_id`),
  CONSTRAINT `rooms_dorm_fk`     FOREIGN KEY (`dormitory_id`) REFERENCES `dormitories` (`dormitory_id`),
  CONSTRAINT `rooms_resident_fk` FOREIGN KEY (`resident_id`)  REFERENCES `users` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `rooms`
--

CREATE TABLE `admin_profiles` (
  `admin_profile_id` int NOT NULL AUTO_INCREMENT,
  `user_id`          int NOT NULL,
  `dormitory_id`     int NOT NULL,
  `position`         varchar(100) DEFAULT 'Dormitory Administrator',
  `phone`            varchar(30)  DEFAULT NULL,
  PRIMARY KEY (`admin_profile_id`),
  UNIQUE KEY `user_id` (`user_id`),
  KEY `dormitory_id` (`dormitory_id`),
  CONSTRAINT `admin_profiles_user_fk` FOREIGN KEY (`user_id`)      REFERENCES `users` (`user_id`),
  CONSTRAINT `admin_profiles_dorm_fk` FOREIGN KEY (`dormitory_id`) REFERENCES `dormitories` (`dormitory_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ─── STUDENT PROFILES ────────────────────────────────────────────────────────
-- Extended profile for STUDENT users.
-- room_id is set when the student is accepted.

CREATE TABLE `student_profiles` (
  `profile_id`        int NOT NULL AUTO_INCREMENT,
  `user_id`           int NOT NULL,
  `room_id`           int DEFAULT NULL,
  `phone`             varchar(30)  DEFAULT NULL,
  `student_id_number` varchar(50)  DEFAULT NULL,
  `course`            varchar(150) DEFAULT NULL,
  `university`        varchar(200) DEFAULT NULL,
  `academic_details`  text         DEFAULT NULL,
  `application_status` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`profile_id`),
  UNIQUE KEY `user_id` (`user_id`),
  KEY `room_id` (`room_id`),
  CONSTRAINT `student_profiles_user_fk` FOREIGN KEY (`user_id`)      REFERENCES `users` (`user_id`),
  CONSTRAINT `student_profiles_dorm_fk` FOREIGN KEY (`dormitory_id`) REFERENCES `dormitories` (`dormitory_id`),
  CONSTRAINT `student_profiles_room_fk` FOREIGN KEY (`room_id`)      REFERENCES `rooms` (`room_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `student_profiles`
--

CREATE TABLE `dorm_applications` (
  `application_id`  int NOT NULL AUTO_INCREMENT,
  `user_id`         int NOT NULL,
  `submission_date` date DEFAULT NULL,
  `status`          enum('PENDING','ACCEPTED','REJECTED') NOT NULL DEFAULT 'PENDING',
  `assigned_room_id` int DEFAULT NULL,
  `created_at`      timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`application_id`),
  KEY `user_id` (`user_id`),
  KEY `assigned_room_id` (`assigned_room_id`),
  CONSTRAINT `dorm_apps_user_fk` FOREIGN KEY (`user_id`)          REFERENCES `users` (`user_id`),
  CONSTRAINT `dorm_apps_room_fk` FOREIGN KEY (`assigned_room_id`) REFERENCES `rooms` (`room_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ─── CONTRACTS ───────────────────────────────────────────────────────────────

CREATE TABLE `contracts` (
  `contract_id`            int NOT NULL AUTO_INCREMENT,
  `user_id`                int NOT NULL,
  `room_id`                int DEFAULT NULL,
  `start_date`             date DEFAULT NULL,
  `end_date`               date DEFAULT NULL,
  `status`                 enum('ACTIVE','EXTENDED','TERMINATED') NOT NULL DEFAULT 'ACTIVE',
  `signed_document_file_id` int DEFAULT NULL,
  PRIMARY KEY (`contract_id`),
  UNIQUE KEY `user_id` (`user_id`),
  KEY `room_id` (`room_id`),
  CONSTRAINT `contracts_user_fk` FOREIGN KEY (`user_id`)      REFERENCES `users` (`user_id`),
  CONSTRAINT `contracts_dorm_fk` FOREIGN KEY (`dormitory_id`) REFERENCES `dormitories` (`dormitory_id`),
  CONSTRAINT `contracts_room_fk` FOREIGN KEY (`room_id`)      REFERENCES `rooms` (`room_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `termination_requests`
--

DROP TABLE IF EXISTS `termination_requests`;
CREATE TABLE IF NOT EXISTS `termination_requests` (
  `request_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `contract_id` int NOT NULL,
  `reason` text NOT NULL,
  `requested_end_date` date NOT NULL,
  `status` enum('PENDING','ACCEPTED','REJECTED') NOT NULL DEFAULT 'PENDING',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`request_id`),
  KEY `user_id` (`user_id`),
  KEY `dormitory_id` (`dormitory_id`),
  CONSTRAINT `complaints_user_fk` FOREIGN KEY (`user_id`)      REFERENCES `users` (`user_id`),
  CONSTRAINT `complaints_dorm_fk` FOREIGN KEY (`dormitory_id`) REFERENCES `dormitories` (`dormitory_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `termination_requests`
--

CREATE TABLE `rent_payments` (
  `payment_id`     int NOT NULL AUTO_INCREMENT,
  `user_id`        int DEFAULT NULL,
  `month`          varchar(20)    DEFAULT NULL,
  `amount`         decimal(10,2)  DEFAULT NULL,
  `receipt_file_id` int DEFAULT NULL,
  `created_at`     timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`payment_id`),
  KEY `user_id` (`user_id`),
  KEY `dormitory_id` (`dormitory_id`),
  CONSTRAINT `payments_user_fk` FOREIGN KEY (`user_id`)      REFERENCES `users` (`user_id`),
  CONSTRAINT `payments_dorm_fk` FOREIGN KEY (`dormitory_id`) REFERENCES `dormitories` (`dormitory_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

CREATE TABLE `reports` (
  `report_id`       int NOT NULL AUTO_INCREMENT,
  `generated_by`    int DEFAULT NULL,
  `generation_date` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `file_path`       varchar(255) DEFAULT NULL,
  PRIMARY KEY (`report_id`),
  KEY `generated_by` (`generated_by`),
  KEY `dormitory_id` (`dormitory_id`),
  CONSTRAINT `reports_user_fk` FOREIGN KEY (`generated_by`) REFERENCES `users` (`user_id`),
  CONSTRAINT `reports_dorm_fk` FOREIGN KEY (`dormitory_id`) REFERENCES `dormitories` (`dormitory_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

DROP TABLE IF EXISTS `users`;
CREATE TABLE IF NOT EXISTS `users` (
  `user_id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `email` varchar(150) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('STUDENT','ADMIN') NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `application_files` (
  `id`             int NOT NULL AUTO_INCREMENT,
  `application_id` int DEFAULT NULL,
  `file_id`        int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `application_id` (`application_id`),
  KEY `file_id` (`file_id`),
  CONSTRAINT `app_files_app_fk`  FOREIGN KEY (`application_id`) REFERENCES `dorm_applications` (`application_id`),
  CONSTRAINT `app_files_file_fk` FOREIGN KEY (`file_id`)         REFERENCES `file_metadata` (`file_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT INTO `users` (`user_id`, `name`, `email`, `password_hash`, `role`, `created_at`) VALUES
(1, 'Admin User', 'admin@dms.com', '$2b$10$h2x2iufvpX1I7TDY5PIHZOkhh1TLHH5xcXkHHVacp1gunCazKA6ra', 'ADMIN', '2026-03-10 01:36:30'),
(2, 'Maria Santos', 'student@dms.com', '$2b$10$AScMAam2AJ1W5xGVJeTzKuRbuE0S/nQpsKdQOtRfdah..56qnkwQ2', 'STUDENT', '2026-03-10 01:36:30'),
(3, 'Juan dela Cruz', 'juan@dms.com', '$2b$10$AScMAam2AJ1W5xGVJeTzKuRbuE0S/nQpsKdQOtRfdah..56qnkwQ2', 'STUDENT', '2026-03-10 01:36:30'),
(4, 'Ana Liza', 'ana@dms.com', '$2b$10$AScMAam2AJ1W5xGVJeTzKuRbuE0S/nQpsKdQOtRfdah..56qnkwQ2', 'STUDENT', '2026-03-10 01:36:30'),
(5, 'Pedro Reyes', 'pedro@dms.com', '$2b$10$AScMAam2AJ1W5xGVJeTzKuRbuE0S/nQpsKdQOtRfdah..56qnkwQ2', 'STUDENT', '2026-03-10 01:36:30'),
(6, 'Rosa Aquino', 'rosa@dms.com', '$2b$10$AScMAam2AJ1W5xGVJeTzKuRbuE0S/nQpsKdQOtRfdah..56qnkwQ2', 'STUDENT', '2026-03-10 01:36:30'),
(7, 'Sher Afgan', 'sher@gmail.com', '$2b$10$rUdqFDeWLQd7BBkxvTlrQeIx2w.ruxpcE4bPfjymzN7BRTBZAv1VO', 'STUDENT', '2026-03-15 08:00:35');

CREATE TABLE `progress` (
  `progress_id` int NOT NULL AUTO_INCREMENT,
  `user_id`     int DEFAULT NULL,
  `task_name`   varchar(100) DEFAULT NULL,
  `percentage`  int DEFAULT 0,
  `status`      varchar(50)  DEFAULT NULL,
  `updated_at`  timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`progress_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `progress_user_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Constraints for table `admin_profiles`
--
ALTER TABLE `admin_profiles`
  ADD CONSTRAINT `admin_profiles_dorm_fk` FOREIGN KEY (`dormitory_id`) REFERENCES `dormitories` (`dormitory_id`),
  ADD CONSTRAINT `admin_profiles_user_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `application_files`
--
ALTER TABLE `application_files`
  ADD CONSTRAINT `app_files_app_fk` FOREIGN KEY (`application_id`) REFERENCES `dorm_applications` (`application_id`),
  ADD CONSTRAINT `app_files_file_fk` FOREIGN KEY (`file_id`) REFERENCES `file_metadata` (`file_id`);

--
-- Constraints for table `complaints`
--
ALTER TABLE `complaints`
  ADD CONSTRAINT `complaints_user_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `contracts`
--
ALTER TABLE `contracts`
  ADD CONSTRAINT `contracts_room_fk` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`room_id`),
  ADD CONSTRAINT `contracts_user_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `dorm_applications`
--
ALTER TABLE `dorm_applications`
  ADD CONSTRAINT `dorm_apps_room_fk` FOREIGN KEY (`assigned_room_id`) REFERENCES `rooms` (`room_id`),
  ADD CONSTRAINT `dorm_apps_user_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `progress`
--
ALTER TABLE `progress`
  ADD CONSTRAINT `progress_user_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `rent_payments`
--
ALTER TABLE `rent_payments`
  ADD CONSTRAINT `payments_user_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `reports`
--
ALTER TABLE `reports`
  ADD CONSTRAINT `reports_user_fk` FOREIGN KEY (`generated_by`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `rooms`
--
ALTER TABLE `rooms`
  ADD CONSTRAINT `rooms_resident_fk` FOREIGN KEY (`resident_id`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `student_profiles`
--
ALTER TABLE `student_profiles`
  ADD CONSTRAINT `student_profiles_room_fk` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`room_id`),
  ADD CONSTRAINT `student_profiles_user_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
