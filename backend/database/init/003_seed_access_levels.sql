
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

-- Access levels. Ids and role_ids match migration 009 so a database built from
-- this init folder is identical to a migrated one. role_id: 1 admin,
-- 2 teacher, 3 student, 4 parent (see 002_seed_roles.sql).

LOCK TABLES `access_levels` WRITE;
/*!40000 ALTER TABLE `access_levels` DISABLE KEYS */;
INSERT INTO `access_levels` VALUES (1,3,'Lvl-0',0,'Student','Student account','2026-09-04 00:00:00');
INSERT INTO `access_levels` VALUES (2,4,'Lvl-0',0,'Parent','Parent account','2026-09-04 00:00:00');
INSERT INTO `access_levels` VALUES (3,2,'Lvl-1',1,'Teacher','Teacher account','2026-09-04 00:00:00');
INSERT INTO `access_levels` VALUES (4,1,'Lvl-2',2,'Laboratory Staff','Laboratory staff account','2026-09-04 00:00:00');
INSERT INTO `access_levels` VALUES (5,1,'Lvl-3',3,'Librarian','Librarian account','2026-09-04 00:00:00');
INSERT INTO `access_levels` VALUES (6,1,'Lvl-3',3,'Registrar','Registrar account','2026-09-04 00:00:00');
INSERT INTO `access_levels` VALUES (7,1,'Lvl-4',4,'Super Admin','Full administrative access','2026-09-04 00:00:00');
/*!40000 ALTER TABLE `access_levels` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;
