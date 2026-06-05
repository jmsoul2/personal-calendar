# Desplegar el Calendario Vida a Netlify

Objetivo: tener un **link estable** para abrir en el iPhone (Juan y Susana),
con los eventos **sincronizados** entre dispositivos.

Resumen del flujo elegido: **GitHub + Netlify (auto-deploy)**. Subes el código a
GitHub una vez; Netlify lo reconstruye solo en cada cambio futuro.

---

## 1. Subir el proyecto a GitHub

Ya está iniciado git localmente con un primer commit. Falta crear el repo remoto.

1. Entra a https://github.com/new y crea un repo **privado** (recomendado, son
   datos personales). Nómbralo p. ej. `personal-calendar`. **No** marques
   "Add a README" (el repo local ya tiene archivos).
2. GitHub te mostrará los comandos. En la carpeta del proyecto, corre:

   ```bash
   git remote add origin https://github.com/TU_USUARIO/personal-calendar.git
   git branch -M main
   git push -u origin main
   ```

   (Te pedirá login de GitHub la primera vez.)

---

## 2. Conectar Netlify al repo

1. Entra a https://app.netlify.com (crea cuenta gratis, puedes usar "Sign up with GitHub").
2. **Add new site › Import an existing project › Deploy with GitHub**.
3. Autoriza y elige el repo `personal-calendar`.
4. Netlify leerá `netlify.toml` solo. Confirma:
   - **Publish directory**: `src`
   - **Functions directory**: `netlify/functions`
   - **Build command**: vacío (no hay build).
5. **Deploy site**. En ~1 minuto tendrás una URL tipo `https://NOMBRE.netlify.app`.
   (Puedes renombrarla en *Site configuration › Change site name*.)

---

## 3. Configurar la clave compartida (CAL_KEY)  ← ¡IMPORTANTE!

Sin esto, la app no puede leer ni guardar (responde 401).

1. En Netlify: **Site configuration › Environment variables › Add a variable**.
2. Key: `CAL_KEY`  ·  Value: *una contraseña que inventes* (la misma que le darás
   a Susana). Ej.: `casa-2026-abc`. No la pongas trivial.
3. Guarda y haz **Deploys › Trigger deploy › Deploy site** para que tome la variable.

> La `CAL_KEY` vive solo en Netlify, **nunca** en el código ni en GitHub.

---

## 4. Probar

1. Abre la URL de Netlify en el navegador.
2. Aparece un `prompt` pidiendo la **clave compartida** → escribe la misma de `CAL_KEY`.
3. Abajo-izquierda hay una pastilla de estado:
   - 🟢 *Sincronizado* — todo bien.
   - 🟡 *Guardando…* — subiendo cambios.
   - 🔴 *Sin conexión* / *Clave incorrecta* — tócala para reintentar o reingresar la clave.
4. Crea un evento. Ábrelo en **otro navegador/dispositivo** con la misma clave →
   debe aparecer (refresca o vuelve a la pestaña para forzar la sincronización).

---

## 5. iPhone (Juan y Susana)

1. Abre la URL en **Safari**.
2. Escribe la clave compartida cuando la pida (queda guardada en ese teléfono).
3. **Compartir › Añadir a pantalla de inicio** → queda como app a pantalla completa.

Susana hace lo mismo en su iPhone con la **misma clave**. Verá lo que anotes y,
si quieres, también puede anotar (ambos editan).

---

## Actualizaciones futuras

Cualquier cambio: `git add -A && git commit -m "..." && git push` → Netlify
republica solo. No hay que tocar nada más.

## (Opcional) Probar local antes de desplegar

Requiere Netlify CLI:

```bash
npm install -g netlify-cli
netlify dev          # levanta el sitio + la función con un Blobs local
```

Para que la función no dé 401 en local, define la clave en esa terminal:
`set CAL_KEY=loquesea` (PowerShell: `$env:CAL_KEY="loquesea"`) antes de `netlify dev`,
o usa un archivo `.env` con `CAL_KEY=loquesea` (ya está en `.gitignore`).
