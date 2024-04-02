-- phpMyAdmin SQL Dump
-- version 5.0.4
-- https://www.phpmyadmin.net/
--
-- Host: localhost
-- Generation Time: Feb 10, 2021 at 04:06 AM
-- Server version: 10.4.17-MariaDB
-- PHP Version: 7.4.11

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `sna`
--

-- --------------------------------------------------------

--
-- Structure for view `clients_information`
--

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `clients_information`  AS SELECT `u`.`id` AS `id`, `u`.`firstName` AS `firstName`, `u`.`lastName` AS `lastName`, `u`.`email` AS `email`, `u`.`password` AS `password`, `u`.`categoryId` AS `categoryId`, `u`.`cityId` AS `cityId`, `u`.`countryId` AS `countryId`, `u`.`phone` AS `phone`, `u`.`dateOfBirth` AS `dateOfBirth`, `u`.`role` AS `role`, `u`.`description` AS `description`, `u`.`linkedin` AS `linkedin`, `u`.`whatsapp` AS `whatsapp`, `u`.`youtube` AS `youtube`, `u`.`facebook` AS `facebook`, `u`.`instagram` AS `instagram`, `u`.`website` AS `website`, `u`.`profilePicture` AS `profilePicture`, `u`.`coverPicture` AS `coverPicture`, `u`.`verifiedAt` AS `verifiedAt`, `c`.`id` AS `categoryTableId`, `c`.`category_name` AS `categoryName`, `c`.`parent_id` AS `categoryParentId`, `country`.`id` AS `countryTableId`, `country`.`name` AS `countryName`, `city`.`id` AS `cityTableId`, `city`.`name` AS `cityName`, `pcat`.`category_name` AS `categoryParentName` FROM ((((`users` `u` join `category` `c` on(`u`.`categoryId` = `c`.`id`)) join `country` on(`u`.`countryId` = `country`.`id`)) join `city` on(`u`.`cityId` = `city`.`id`)) join `category` `pcat` on(`pcat`.`id` = `c`.`parent_id`)) ;

--
-- VIEW `clients_information`
-- Data: None
--

COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
