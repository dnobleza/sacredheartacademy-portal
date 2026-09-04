-- Migration 005: revoked refresh tokens
--
-- Server-side denylist so a refresh token can be invalidated before its
-- natural expiry (logout, rotation). Rows are only meaningful until
-- expires_at passes; cleanup is done opportunistically, not via cron.

CREATE TABLE revoked_tokens (
  id INT PRIMARY KEY AUTO_INCREMENT,
  jti CHAR(36) NOT NULL,
  user_id INT NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_revoked_tokens_jti (jti),
  KEY idx_revoked_tokens_jti (jti),
  KEY idx_revoked_tokens_expires_at (expires_at),
  CONSTRAINT fk_revoked_tokens_user
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);
