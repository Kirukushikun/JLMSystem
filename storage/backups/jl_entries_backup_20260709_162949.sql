-- MySQL dump 10.13  Distrib 8.0.30, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: jlms_database
-- ------------------------------------------------------
-- Server version	8.0.30

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
-- Table structure for table `jl_entries`
--

DROP TABLE IF EXISTS `jl_entries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `jl_entries` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned DEFAULT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `date` date NOT NULL,
  `company` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `manager` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `dept` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `status` enum('Pending','Reviewed','Rejected','Approved','VP Rejected','On Hold','On Process') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Pending',
  `serial` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `submitted_at` date NOT NULL,
  `reviewed_at` date DEFAULT NULL,
  `approved_at` date DEFAULT NULL,
  `reject_reason` text COLLATE utf8mb4_unicode_ci,
  `held_at` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `hold_reason` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `attachment` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `attachment_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `jl_entries_serial_unique` (`serial`)
) ENGINE=InnoDB AUTO_INCREMENT=29 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `jl_entries`
--

LOCK TABLES `jl_entries` WRITE;
/*!40000 ALTER TABLE `jl_entries` DISABLE KEYS */;
INSERT INTO `jl_entries` VALUES (1,NULL,'LETTER OF JUSTIFICATION FOR THE PURCHASE','2026-04-29','BFC','Marinel Lambayong','Swine',16000.00,'Approved','JL-260609093036BFC','2026-06-09',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-07-09 00:00:26','2026-07-09 00:00:26'),(2,NULL,'Request for Additional Budget Allocation for Grofin Bu','2026-05-26','BFC','Marinel Lambayong','Swine',0.00,'Approved','JL-260609091705BFC','2026-06-09',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-07-09 00:00:26','2026-07-09 00:00:26'),(3,NULL,'JL for Team Building','2026-05-24','BFC','Marinel Lambayong','Swine',20000.00,'On Hold',NULL,'2026-06-09',NULL,NULL,'No budget',NULL,NULL,NULL,NULL,'2026-07-09 00:00:26','2026-07-09 00:00:26'),(4,NULL,'Request for Additional Budget for Iraq Dorm Construct','2026-06-03','BFC','Marinel Lambayong','Swine',0.00,'Approved','JL-260609091358BFC','2026-06-09',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-07-09 00:00:26','2026-07-09 00:00:26'),(5,NULL,'Justification for the Purchase of Fixed Wheels, Swivel','2026-05-24','BFC','Marinel Lambayong','Swine',10400.00,'Approved','JL-260609092237BFC','2026-06-09',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-07-09 00:00:26','2026-07-09 00:00:26'),(6,NULL,'HEAVY DUTY PAPER SHREDDING MACHINE','2026-06-04','BDL','Josue Blanco','Poultry',0.00,'Rejected',NULL,'2026-06-09',NULL,NULL,'rejected',NULL,NULL,NULL,NULL,'2026-07-09 00:00:26','2026-07-09 00:00:26'),(7,NULL,'Purchase of Fogging Machine','2026-06-01','BFC','Chrisflor Joy Manalili','Human Resources',10000.00,'Pending',NULL,'2026-06-09',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-07-09 00:00:26','2026-07-09 00:00:26'),(8,NULL,'Yellow Curtain Item','2026-05-26','PFC','Arvin Jaylord Jose','Poultry',2440.00,'Approved','JL-260609105522PFC','2026-06-09',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-07-09 00:00:26','2026-07-09 00:00:26'),(9,NULL,'JL for Blacknet','2026-05-26','PFC','Arvin Jaylord Jose','Poultry',51015.00,'Approved','JL-260609110307PFC','2026-06-09',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-07-09 00:00:26','2026-07-09 00:00:26'),(10,NULL,'HILLUX TINT','2026-05-14','BFC','Irene Ho','Purchasing',3000.00,'Approved','JL-260609112248BFC','2026-06-09',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-07-09 00:00:26','2026-07-09 00:00:26'),(11,NULL,'JL for Portable welding machine','2026-06-04','Feedmill','Lady Arla M. Lino','Feedmill',5000.00,'Approved','JL-260609131543Feedmill','2026-06-09',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-07-09 00:00:26','2026-07-09 00:00:26'),(12,NULL,'Jl for Bag Closer','2026-06-09','Feedmill','Lady Arla M. Lino','Feedmill',8000.00,'Approved','JL-260609132934Feedmill','2026-06-09',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-07-09 00:00:26','2026-07-09 00:00:26'),(13,NULL,'BDL Vaccine Request','2026-06-09','BDL','Donatrine Piodos','Poultry',13300.00,'Approved','JL-260609135650BDL','2026-06-09',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-07-09 00:00:26','2026-07-09 00:00:26'),(14,NULL,'Dossatron for Egg grading','2026-05-26','PFC','Arvin Jaylord Jose','Poultry',33500.00,'Approved','JL-260609141254PFC','2026-06-09',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-07-09 00:00:26','2026-07-09 00:00:26'),(15,NULL,'Aero Motor','2026-05-27','PFC','Arvin Jaylord Jose','Poultry',13932.00,'Approved','JL-260609141554PFC','2026-06-09',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-07-09 00:00:26','2026-07-09 00:00:26'),(16,NULL,'Request for Inclusion in CAPEX - Additional Seconda','2026-06-06','PFC','Arvin Jaylord Jose','Poultry',35725.00,'Approved','JL-260609141851PFC','2026-06-09',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-07-09 00:00:26','2026-07-09 00:00:26'),(17,NULL,'JL for Using 100% Cooked Corn in Booster Diet','2026-06-01','BFC','Marinel Lambayong','Swine',0.00,'Pending',NULL,'2026-06-09',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-07-09 00:00:26','2026-07-09 00:00:26'),(18,NULL,'Justification Letter for Knapsack Sprayer','2026-06-11','RH','Angelica Sagun','Swine',0.00,'Pending',NULL,'2026-06-11',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-07-09 00:00:26','2026-07-09 00:00:26'),(19,NULL,'Tooth clipper, kidney basin, scissors','2026-06-04','RH','Supervisor','Swine',0.00,'Pending',NULL,'2026-06-11',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-07-09 00:00:26','2026-07-09 00:00:26'),(20,NULL,'JL for Kargador uniform','2026-06-18','Feedmill','Lady Arla M. Lino','Feedmill',0.00,'Pending',NULL,'2026-06-18',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-07-09 00:00:26','2026-07-09 00:00:26'),(21,NULL,'Justification for the Inclusion of Sandpaper (100 Grit a','2026-06-20','PFC','Josue Blanco','Poultry',0.00,'Pending',NULL,'2026-06-20',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-07-09 00:00:26','2026-07-09 00:00:26'),(22,NULL,'Justifixation Letter for the Request for Collasibpe Hos','2026-06-21','RH','Angelica Sagun','Swine',0.00,'Approved','JL-260621141550RH','2026-06-21',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-07-09 00:00:26','2026-07-09 00:00:26'),(23,NULL,'Justification Letter for Power Spray Set as a replace','2026-06-21','RH','Angelica Sagun','Swine',0.00,'Approved','JL-260621141736RH','2026-06-21',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-07-09 00:00:26','2026-07-09 00:00:26'),(24,NULL,'Requesting of G.I Wire #10, #16','2026-05-12','PFC','Arvin Jaylord Jose','Poultry',0.00,'Approved','JL-260622140939PFC','2026-06-22',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-07-09 00:00:26','2026-07-09 00:00:26'),(25,NULL,'JL FOR PADLOCK HINGE','2026-06-03','RH','SUPERVISOR','Swine',0.00,'Pending',NULL,'2026-06-24',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-07-09 00:00:26','2026-07-09 00:00:26'),(26,NULL,'jl for philflex thhn wire 3.5mm 450 meters','2026-06-23','RH','SUPERVISOR','Swine',0.00,'Approved','JL-260624083050RH','2026-06-24',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-07-09 00:00:26','2026-07-09 00:00:26'),(27,61,'adad','2026-07-09','BFC','adasd','General Services',123213.00,'Approved','BFC-JL-001-2026','2026-07-09','2026-07-09','2026-07-09',NULL,NULL,NULL,NULL,NULL,'2026-07-09 00:04:16','2026-07-09 00:05:39'),(28,61,'addasdad','2026-07-09','BDL','adsasd','Poultry',123123.00,'Pending',NULL,'2026-07-09',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-07-09 00:06:59','2026-07-09 00:06:59');
/*!40000 ALTER TABLE `jl_entries` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `jl_audit_logs`
--

DROP TABLE IF EXISTS `jl_audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `jl_audit_logs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `jl_entry_id` bigint unsigned NOT NULL,
  `event` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `actor` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `jl_audit_logs_jl_entry_id_foreign` (`jl_entry_id`),
  CONSTRAINT `jl_audit_logs_jl_entry_id_foreign` FOREIGN KEY (`jl_entry_id`) REFERENCES `jl_entries` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `jl_audit_logs`
--

LOCK TABLES `jl_audit_logs` WRITE;
/*!40000 ALTER TABLE `jl_audit_logs` DISABLE KEYS */;
INSERT INTO `jl_audit_logs` VALUES (1,27,'submitted',NULL,NULL,'2026-07-09 00:04:16','2026-07-09 00:04:16'),(2,27,'reviewed','Admin IT',NULL,'2026-07-09 00:05:29','2026-07-09 00:05:29'),(3,27,'approved','Admin IT',NULL,'2026-07-09 00:05:39','2026-07-09 00:05:39'),(4,28,'submitted',NULL,NULL,'2026-07-09 00:06:59','2026-07-09 00:06:59');
/*!40000 ALTER TABLE `jl_audit_logs` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-07-09 16:29:49
