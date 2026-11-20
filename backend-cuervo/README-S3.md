# Evidencias fotográficas en S3

El almacenamiento de evidencias se elige con `EVIDENCE_DISK`. En desarrollo se
usa `local` y los archivos quedan bajo `storage/app/private/evidencias/`.
La base de datos conserva el disco y la ruta de cada archivo. La ruta
`GET /api/evidencias/{id}` exige autenticación y comprueba el acceso del usuario.
Para S3, Laravel devuelve una redirección a una URL firmada válida durante
5 minutos. Para `local`, Laravel entrega el archivo directamente. El bucket
no necesita acceso público ni `storage:link`.

## Preparación del entorno en AWS

1. Ejecutar `composer install` con el `composer.lock` del repositorio. El
   adaptador `league/flysystem-aws-s3-v3` ya es dependencia del proyecto.
2. Usar el bucket privado `cuervo-evidencias-2026` en `us-east-1`, con el acceso
   público bloqueado.
3. Dar al rol IAM asociado a la EC2 `CUERVO-APP` permisos `s3:PutObject`,
   `s3:PutObjectAcl`, `s3:GetObject` y `s3:DeleteObject` sobre
   `arn:aws:s3:::cuervo-evidencias-2026/evidencias/*`.
   Conceder `s3:ListBucket` sobre el bucket, limitado al prefijo `evidencias/`,
   para las comprobaciones de existencia. Si el bucket usa una clave KMS
   propia, añadir los permisos KMS correspondientes.
   El adaptador envía la ACL `bucket-owner-full-control`, compatible con
   buckets que tienen las ACL deshabilitadas. No concede acceso público.
4. Configurar las variables del entorno del servidor:

   ```dotenv
   EVIDENCE_DISK=s3
   AWS_DEFAULT_REGION=us-east-1
   AWS_BUCKET=cuervo-evidencias-2026
   AWS_USE_PATH_STYLE_ENDPOINT=false
   ```

   La EC2 `CUERVO-APP` obtiene credenciales temporales del rol IAM. Dejar
   `AWS_ACCESS_KEY_ID` y `AWS_SECRET_ACCESS_KEY` vacías; no colocar claves
   permanentes en el servidor ni en GitHub. `FILESYSTEM_DISK` puede seguir en
   `local`: solo las evidencias usan `EVIDENCE_DISK`. La EC2 `CUERVO-DB` no
   necesita acceso al bucket.
5. Refrescar la configuración de Laravel (`php artisan config:clear` o
   `php artisan config:cache`, según el despliegue).
6. Comprobar si `evidencias_mantenimiento` ya existe en la base restaurada.
   Si no existe y las migraciones antiguas aparecen pendientes, ejecutar solo:

   ```sh
   php artisan migrate --path=database/migrations/2026_11_19_000000_create_evidencias_mantenimiento_table.php --force
   ```

   Revisar el estado de migraciones antes de ejecutar una migración general.

Los archivos ya subidos al disco local **no se copian automáticamente** al
cambiar `EVIDENCE_DISK`. Sus filas conservan `disco=local`; para que sigan
visibles después de mover el backend a AWS hay que trasladar esos archivos
y actualizar sus registros como parte de una migración de datos.
