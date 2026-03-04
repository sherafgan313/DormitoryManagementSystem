-- Dormitory Management System — Database Schema v2.0
-- Multi-dormitory support with admin profiles and room assignment
--
-- USAGE: mysql -u root dorm_management < Documentation/dorm_management.sql
-- After importing, start server.js — it will seed all demo data automatically.

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET FOREIGN_KEY_CHECKS = 0;
SET time_zone = "+00:00";

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

-- ─── DROP ALL TABLES (FK checks disabled so order does not matter) ────────────

DROP TABLE IF EXISTS `progress`;
DROP TABLE IF EXISTS `application_files`;
DROP TABLE IF EXISTS `rent_payments`;
DROP TABLE IF EXISTS `reports`;
DROP TABLE IF EXISTS `complaints`;
DROP TABLE IF EXISTS `contracts`;
DROP TABLE IF EXISTS `dorm_applications`;
DROP TABLE IF EXISTS `student_profiles`;
DROP TABLE IF EXISTS `admin_profiles`;
DROP TABLE IF EXISTS `rooms`;
DROP TABLE IF EXISTS `users`;
DROP TABLE IF EXISTS `file_metadata`;
DROP TABLE IF EXISTS `dormitories`;

-- ─── DORMITORIES ─────────────────────────────────────────────────────────────
-- Each dormitory is a separate building managed by one or more admins.

CREATE TABLE `dormitories` (
  `dormitory_id` int NOT NULL AUTO_INCREMENT,
  `name`          varchar(150) NOT NULL,
  `address`       varchar(255) DEFAULT NULL,
  `contact_email` varchar(150) DEFAULT NULL,
  `contact_phone` varchar(30)  DEFAULT NULL,
  `max_capacity`  int NOT NULL DEFAULT 50,
  `created_at`    timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`dormitory_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ─── FILE METADATA ────────────────────────────────────────────────────────────

CREATE TABLE `file_metadata` (
  `file_id`     int NOT NULL AUTO_INCREMENT,
  `file_path`   varchar(255) NOT NULL,
  `file_type`   varchar(50)  DEFAULT NULL,
  `upload_date` timestamp    NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`file_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ─── USERS ───────────────────────────────────────────────────────────────────
-- dormitory_id links the user to their assigned dormitory.
-- For ADMINs it is set immediately on account creation.
-- For STUDENTs it is set when their application is accepted and a room is assigned.

CREATE TABLE `users` (
  `user_id`       int NOT NULL AUTO_INCREMENT,
  `name`          varchar(100) NOT NULL,
  `email`         varchar(150) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role`          enum('STUDENT','ADMIN') NOT NULL,
  `dormitory_id`  int DEFAULT NULL,
  `created_at`    timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `email` (`email`),
  KEY `dormitory_id` (`dormitory_id`),
  CONSTRAINT `users_dorm_fk` FOREIGN KEY (`dormitory_id`) REFERENCES `dormitories` (`dormitory_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ─── ROOMS ───────────────────────────────────────────────────────────────────
-- Represents individual rooms within a dormitory.
-- resident_id is set when a room is assigned to a student.

CREATE TABLE `rooms` (
  `room_id`      int NOT NULL AUTO_INCREMENT,
  `dormitory_id` int NOT NULL,
  `room_number`  varchar(10) NOT NULL,
  `floor`        int NOT NULL,
  `type`         enum('Single','Double','Suite') NOT NULL DEFAULT 'Single',
  `status`       enum('occupied','vacant','maintenance') NOT NULL DEFAULT 'vacant',
  `resident_id`  int DEFAULT NULL,
  PRIMARY KEY (`room_id`),
  UNIQUE KEY `dorm_room_unique` (`dormitory_id`, `room_number`),
  KEY `resident_id` (`resident_id`),
  CONSTRAINT `rooms_dorm_fk`     FOREIGN KEY (`dormitory_id`) REFERENCES `dormitories` (`dormitory_id`),
  CONSTRAINT `rooms_resident_fk` FOREIGN KEY (`resident_id`)  REFERENCES `users` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ─── ADMIN PROFILES ──────────────────────────────────────────────────────────
-- Extended profile for ADMIN users, linked to their dormitory.
-- One admin can only manage one dormitory (UNIQUE on user_id).

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
-- dormitory_id and room_id are set when the student is accepted.

CREATE TABLE `student_profiles` (
  `profile_id`        int NOT NULL AUTO_INCREMENT,
  `user_id`           int NOT NULL,
  `dormitory_id`      int DEFAULT NULL,
  `room_id`           int DEFAULT NULL,
  `phone`             varchar(30)  DEFAULT NULL,
  `student_id_number` varchar(50)  DEFAULT NULL,
  `course`            varchar(150) DEFAULT NULL,
  `university`        varchar(200) DEFAULT NULL,
  `academic_details`  text         DEFAULT NULL,
  `application_status` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`profile_id`),
  UNIQUE KEY `user_id` (`user_id`),
  KEY `dormitory_id` (`dormitory_id`),
  KEY `room_id` (`room_id`),
  CONSTRAINT `student_profiles_user_fk` FOREIGN KEY (`user_id`)      REFERENCES `users` (`user_id`),
  CONSTRAINT `student_profiles_dorm_fk` FOREIGN KEY (`dormitory_id`) REFERENCES `dormitories` (`dormitory_id`),
  CONSTRAINT `student_profiles_room_fk` FOREIGN KEY (`room_id`)      REFERENCES `rooms` (`room_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ─── DORM APPLICATIONS ───────────────────────────────────────────────────────
-- dormitory_id is set when an admin accepts the application.
-- assigned_room_id is set when a room is assigned on acceptance.

CREATE TABLE `dorm_applications` (
  `application_id`  int NOT NULL AUTO_INCREMENT,
  `user_id`         int NOT NULL,
  `dormitory_id`    int DEFAULT NULL,
  `submission_date` date DEFAULT NULL,
  `status`          enum('PENDING','ACCEPTED','REJECTED') NOT NULL DEFAULT 'PENDING',
  `assigned_room_id` int DEFAULT NULL,
  `created_at`      timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`application_id`),
  KEY `user_id` (`user_id`),
  KEY `dormitory_id` (`dormitory_id`),
  KEY `assigned_room_id` (`assigned_room_id`),
  CONSTRAINT `dorm_apps_user_fk` FOREIGN KEY (`user_id`)          REFERENCES `users` (`user_id`),
  CONSTRAINT `dorm_apps_dorm_fk` FOREIGN KEY (`dormitory_id`)     REFERENCES `dormitories` (`dormitory_id`),
  CONSTRAINT `dorm_apps_room_fk` FOREIGN KEY (`assigned_room_id`) REFERENCES `rooms` (`room_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ─── CONTRACTS ───────────────────────────────────────────────────────────────

CREATE TABLE `contracts` (
  `contract_id`            int NOT NULL AUTO_INCREMENT,
  `user_id`                int NOT NULL,
  `dormitory_id`           int DEFAULT NULL,
  `room_id`                int DEFAULT NULL,
  `start_date`             date DEFAULT NULL,
  `end_date`               date DEFAULT NULL,
  `status`                 enum('ACTIVE','EXTENDED','TERMINATED') NOT NULL DEFAULT 'ACTIVE',
  `signed_document_file_id` int DEFAULT NULL,
  PRIMARY KEY (`contract_id`),
  UNIQUE KEY `user_id` (`user_id`),
  KEY `dormitory_id` (`dormitory_id`),
  KEY `room_id` (`room_id`),
  CONSTRAINT `contracts_user_fk` FOREIGN KEY (`user_id`)      REFERENCES `users` (`user_id`),
  CONSTRAINT `contracts_dorm_fk` FOREIGN KEY (`dormitory_id`) REFERENCES `dormitories` (`dormitory_id`),
  CONSTRAINT `contracts_room_fk` FOREIGN KEY (`room_id`)      REFERENCES `rooms` (`room_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ─── COMPLAINTS ──────────────────────────────────────────────────────────────

CREATE TABLE `complaints` (
  `complaint_id` int NOT NULL AUTO_INCREMENT,
  `user_id`      int NOT NULL,
  `dormitory_id` int DEFAULT NULL,
  `description`  text,
  `status`       enum('SUBMITTED','IN_PROGRESS','RESOLVED') NOT NULL DEFAULT 'SUBMITTED',
  `created_at`   timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`complaint_id`),
  KEY `user_id` (`user_id`),
  KEY `dormitory_id` (`dormitory_id`),
  CONSTRAINT `complaints_user_fk` FOREIGN KEY (`user_id`)      REFERENCES `users` (`user_id`),
  CONSTRAINT `complaints_dorm_fk` FOREIGN KEY (`dormitory_id`) REFERENCES `dormitories` (`dormitory_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ─── RENT PAYMENTS ───────────────────────────────────────────────────────────

CREATE TABLE `rent_payments` (
  `payment_id`     int NOT NULL AUTO_INCREMENT,
  `user_id`        int DEFAULT NULL,
  `dormitory_id`   int DEFAULT NULL,
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

-- ─── REPORTS ─────────────────────────────────────────────────────────────────

CREATE TABLE `reports` (
  `report_id`       int NOT NULL AUTO_INCREMENT,
  `generated_by`    int DEFAULT NULL,
  `dormitory_id`    int DEFAULT NULL,
  `generation_date` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `file_path`       varchar(255) DEFAULT NULL,
  PRIMARY KEY (`report_id`),
  KEY `generated_by` (`generated_by`),
  KEY `dormitory_id` (`dormitory_id`),
  CONSTRAINT `reports_user_fk` FOREIGN KEY (`generated_by`) REFERENCES `users` (`user_id`),
  CONSTRAINT `reports_dorm_fk` FOREIGN KEY (`dormitory_id`) REFERENCES `dormitories` (`dormitory_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ─── APPLICATION FILES ───────────────────────────────────────────────────────

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

-- ─── PROGRESS ────────────────────────────────────────────────────────────────

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

SET FOREIGN_KEY_CHECKS = 1;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
