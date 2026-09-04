-- Migration 017: add images
--
-- A single shared images table, rather than one upload table per owner
-- (announcement_images, admin_photos, ...). All uploaded files go through the
-- same validation, storage, and serving path (see src/middleware/upload.js
-- and src/controllers/shared/images-controller.js), so there is one row shape
-- to reason about and one place to enforce it. Ownership is expressed the
-- other direction: each owning table gets a nullable image_id/photo_id FK
-- pointing INTO images, not the reverse, since an image belongs to at most
-- one thing at a time and most rows (announcements without a picture, staff
-- without a photo yet) have none.
--
-- Every one of these FKs is ON DELETE SET NULL. Deleting an image is a
-- routine action (re-upload a photo, remove a stale announcement banner) and
-- must never cascade into deleting the announcement or profile it was
-- attached to, nor should it ever be blocked by the reference — the owning
-- record's existence does not depend on having a picture.

CREATE TABLE images (
  id int NOT NULL AUTO_INCREMENT,
  filename varchar(255) NOT NULL,
  original_name varchar(255) NOT NULL,
  mime_type varchar(100) NOT NULL,
  size_bytes int NOT NULL,
  uploaded_by int NOT NULL,
  created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY filename (filename),
  CONSTRAINT images_ibfk_1 FOREIGN KEY (uploaded_by) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

ALTER TABLE announcements
  ADD COLUMN image_id int DEFAULT NULL AFTER target_role,
  ADD KEY image_id (image_id),
  ADD CONSTRAINT announcements_ibfk_2 FOREIGN KEY (image_id) REFERENCES images (id) ON DELETE SET NULL;

ALTER TABLE admins
  ADD COLUMN photo_id int DEFAULT NULL AFTER contact_number,
  ADD KEY photo_id (photo_id),
  ADD CONSTRAINT fk_admins_photo FOREIGN KEY (photo_id) REFERENCES images (id) ON DELETE SET NULL;

ALTER TABLE teachers
  ADD COLUMN photo_id int DEFAULT NULL AFTER contact_number,
  ADD KEY photo_id (photo_id),
  ADD CONSTRAINT fk_teachers_photo FOREIGN KEY (photo_id) REFERENCES images (id) ON DELETE SET NULL;

ALTER TABLE students
  ADD COLUMN photo_id int DEFAULT NULL AFTER contact_number,
  ADD KEY photo_id (photo_id),
  ADD CONSTRAINT fk_students_photo FOREIGN KEY (photo_id) REFERENCES images (id) ON DELETE SET NULL;

ALTER TABLE parents
  ADD COLUMN photo_id int DEFAULT NULL AFTER contact_number,
  ADD KEY photo_id (photo_id),
  ADD CONSTRAINT fk_parents_photo FOREIGN KEY (photo_id) REFERENCES images (id) ON DELETE SET NULL;
