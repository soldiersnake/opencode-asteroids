---
description: Crea un git worktree en .worktrees/<nombre> a partir del argumento recibido.
---

Recibirás el siguiente argumento: $ARGUMENTS

Tarea única y exclusiva:

1. Normaliza el argumento a un nombre de worktree válido: minúsculas, sin
   espacios ni caracteres especiales — reemplaza espacios/underscores por
   guiones (`mi feature` → `mi-feature`, `Mi Feature X` → `mi-feature-x`).
2. Ejecuta exactamente este comando:

   git worktree add .worktrees/<nombre-normalizado>

Restricciones estrictas:
- No hagas NADA más: no cambies de directorio, no hagas checkout, no crees
  ramas extra, no edites archivos, no instales nada.
- Si el argumento viene vacío, pregunta el nombre antes de ejecutar.
- Si el worktree ya existe, reporta el error sin intentar "arreglarlo".
