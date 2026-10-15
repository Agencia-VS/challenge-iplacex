-- Permite subir archivos de hasta 25 MiB a las entregas.
-- Ejecutar una vez en Supabase SQL Editor para actualizar el bucket existente.
UPDATE storage.buckets
SET file_size_limit = 26214400
WHERE id = 'archivos';
