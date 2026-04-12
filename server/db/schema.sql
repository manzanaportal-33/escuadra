-- DEPRECADO: este esquema es para MySQL (sistema viejo).
-- El proyecto usa Supabase; ver supabase/migrations/20250306000001_initial.sql

-- Schema SCG33 - compatible con sistema viejo + extensiones
-- Requiere haber importado antes scg.sql (users, user_groups, cuerpo, file, carpetas_roles, media).

-- Tabla otros_orientes (si no existe)
CREATE TABLE IF NOT EXISTS otros_orientes (
  id int(11) UNSIGNED NOT NULL AUTO_INCREMENT,
  pais varchar(100) NOT NULL,
  web varchar(255) DEFAULT NULL,
  direccion varchar(255) DEFAULT NULL,
  mail_institucional varchar(255) DEFAULT NULL,
  telefono varchar(50) DEFAULT NULL,
  soberano varchar(255) DEFAULT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Si la tabla cuerpo no tiene estas columnas, ejecutar a mano (una vez):
-- ALTER TABLE cuerpo ADD COLUMN folder varchar(255) DEFAULT NULL;
-- ALTER TABLE cuerpo ADD COLUMN presidente varchar(255) DEFAULT NULL;
-- ALTER TABLE cuerpo ADD COLUMN secretario varchar(255) DEFAULT NULL;
-- ALTER TABLE cuerpo ADD COLUMN tesorero varchar(255) DEFAULT NULL;

-- Tabla trámites (solicitudes en línea)
CREATE TABLE IF NOT EXISTS tramites (
  id int(11) UNSIGNED NOT NULL AUTO_INCREMENT,
  tipo enum('ingreso','reingreso','ascenso','dimision','pase') NOT NULL,
  user_id int(11) UNSIGNED DEFAULT NULL,
  nombre varchar(120) NOT NULL,
  apellido varchar(120) NOT NULL,
  mail varchar(255) DEFAULT NULL,
  cuerpo varchar(255) NOT NULL,
  cuerpo_pasa varchar(255) DEFAULT NULL,
  plomo enum('SI','NO') DEFAULT 'NO',
  fecha_propuesta varchar(50) DEFAULT NULL,
  datos_json text,
  estado varchar(50) DEFAULT 'pendiente',
  created_at datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Adjuntos de trámites
CREATE TABLE IF NOT EXISTS tramites_adjuntos (
  id int(11) UNSIGNED NOT NULL AUTO_INCREMENT,
  tramite_id int(11) UNSIGNED NOT NULL,
  nombre_original varchar(255) NOT NULL,
  ruta varchar(512) NOT NULL,
  created_at datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY tramite_id (tramite_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

