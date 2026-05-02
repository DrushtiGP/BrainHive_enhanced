-- Migration 003: Create resources table for group file uploads
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_bot BOOLEAN DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS resources (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  group_id      INT NOT NULL,
  user_id       INT NOT NULL,
  filename      VARCHAR(255) NOT NULL,   -- stored filename on disk
  original_name VARCHAR(255) NOT NULL,   -- original filename from user
  mimetype      VARCHAR(100) NOT NULL,
  size          INT NOT NULL,            -- bytes
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (group_id) REFERENCES `groups`(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)  REFERENCES users(id)    ON DELETE CASCADE
);
