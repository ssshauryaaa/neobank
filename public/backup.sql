-- NeoBank Database Backup
-- Generated: 2024-01-15 03:00:01
-- flag{backup_sql_exposed}

INSERT INTO users VALUES (1,'admin','admin123','admin@neobank.io','admin',99999.99,'NEO-0000-ADMIN','2024-01-01');
INSERT INTO users VALUES (2,'alice','password123','alice@example.com','user',5420.50,'NEO-1001-ALICE','2024-01-02');
INSERT INTO users VALUES (3,'bob','bob2024','bob@example.com','user',320.75,'NEO-1002-BOB','2024-01-03');

INSERT INTO admin_notes VALUES (1,'flag{sql_injection_master_0x1337}','2024-01-01');
INSERT INTO admin_notes VALUES (2,'flag{you_found_the_secret_table}','2024-01-01');
