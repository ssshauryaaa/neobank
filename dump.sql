-- MySQL dump 10.13  Distrib 8.0.45, for Win64 (x86_64)
--
-- Host: localhost    Database: neobank
-- ------------------------------------------------------
-- Server version	8.0.45

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `admin_notes`
--

DROP TABLE IF EXISTS `admin_notes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `admin_notes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `note` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `admin_notes`
--

LOCK TABLES `admin_notes` WRITE;
/*!40000 ALTER TABLE `admin_notes` DISABLE KEYS */;
INSERT INTO `admin_notes` VALUES (1,'System initialized. Internal access only.','2026-04-07 04:52:20'),(2,'flag{sql_injection_master_0x1337}','2026-04-07 04:52:20'),(3,'TODO: Fix the login endpoint - currently vulnerable to SQLi. Dev said it will be patched next sprint.','2026-04-07 04:52:20'),(4,'Backup credentials: root / toor. Do not share.','2026-04-07 04:52:20'),(5,'flag{you_found_the_secret_table}','2026-04-07 04:52:20'),(6,'Meeting notes: Security audit scheduled for Q3. Known issues: JWT secret is weak, session handling needs work.','2026-04-07 04:52:20');
/*!40000 ALTER TABLE `admin_notes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `server_logs`
--

DROP TABLE IF EXISTS `server_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `server_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `action` varchar(255) DEFAULT NULL,
  `user_id` int DEFAULT NULL,
  `ip` varchar(50) DEFAULT NULL,
  `details` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `server_logs`
--

LOCK TABLES `server_logs` WRITE;
/*!40000 ALTER TABLE `server_logs` DISABLE KEYS */;
INSERT INTO `server_logs` VALUES (1,'LOGIN_SUCCESS',1,'192.168.1.1','Admin logged in from internal network','2026-04-07 04:52:20'),(2,'LOGIN_FAILED',NULL,'45.33.32.156','Multiple failed attempts - possible brute force','2026-04-07 04:52:20'),(3,'TRANSFER',2,'192.168.1.45','Transfer of $200 to external account','2026-04-07 04:52:20'),(4,'ADMIN_ACCESS',1,'192.168.1.1','Admin accessed user management panel','2026-04-07 04:52:20'),(5,'FLAG_HINT',NULL,'127.0.0.1','flag{check_the_logs_carefully}','2026-04-07 04:52:20');
/*!40000 ALTER TABLE `server_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `transactions`
--

DROP TABLE IF EXISTS `transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `transactions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `type` enum('credit','debit') DEFAULT 'debit',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `transactions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `transactions`
--

LOCK TABLES `transactions` WRITE;
/*!40000 ALTER TABLE `transactions` DISABLE KEYS */;
INSERT INTO `transactions` VALUES (1,2,5000.00,'Initial deposit','credit','2026-04-07 04:52:20'),(2,2,200.00,'Netflix subscription','debit','2026-04-07 04:52:20'),(3,2,1500.00,'Salary credit','credit','2026-04-07 04:52:20'),(4,2,879.50,'Amazon purchase','debit','2026-04-07 04:52:20'),(5,3,1000.00,'Initial deposit','credit','2026-04-07 04:52:20'),(6,3,679.25,'Grocery store','debit','2026-04-07 04:52:20'),(7,4,15000.00,'Wire transfer in','credit','2026-04-07 04:52:20'),(8,4,2200.00,'Rent payment','debit','2026-04-07 04:52:20'),(9,1,50000.00,'Admin fund allocation','credit','2026-04-07 04:52:20');
/*!40000 ALTER TABLE `transactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `password` varchar(255) NOT NULL,
  `email` varchar(100) DEFAULT NULL,
  `role` enum('user','admin') DEFAULT 'user',
  `balance` decimal(10,2) DEFAULT '1000.00',
  `account_number` varchar(20) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'admin','admin123','admin@neobank.io','admin',99999.99,'NEO-0000-ADMIN','2026-04-07 04:52:20'),(2,'alice','password123','alice@example.com','user',5420.50,'NEO-1001-ALICE','2026-04-07 04:52:20'),(3,'bob','bob2024','bob@example.com','user',320.75,'NEO-1002-BOB','2026-04-07 04:52:20'),(4,'charlie','charlie!pass','charlie@example.com','user',12800.00,'NEO-1003-CHAR','2026-04-07 04:52:20'),(5,'shaurya','shaurya','shaurya@gmail.com','user',1000.00,'NEO-2970-SHAU','2026-04-07 06:28:04');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-04-15 10:19:22