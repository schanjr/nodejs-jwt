CREATE TABLE if not exists blacklist
(
    id         SERIAL PRIMARY KEY,
    token      VARCHAR(500) NOT NULL UNIQUE,
    created_at TIMESTAMP    NOT NULL DEFAULT NOW(),
    user_id    INTEGER      NOT NULL,
    CONSTRAINT fk_blacklist_user
        FOREIGN KEY (user_id)
            REFERENCES users (id)
);
