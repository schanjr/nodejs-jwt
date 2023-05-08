CREATE TABLE mfa_secrets
(
    id      SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users (id),
    secret  TEXT    NOT NULL
);
