# OBS Controller

**Panel de control remoto avanzado para OBS Studio** mediante el protocolo
[obs-websocket v5](https://github.com/obsproject/obs-websocket). Permite controlar
casi todas las funciones de OBS desde otro equipo (Windows y Linux).

> ⚠️ **Proyecto hecho con vibecode** — Esta aplicación fue desarrollada asistida
> por IA de forma intensiva ("vibe coding"): la arquitectura, el código y las
> iteraciones se generaron conversando con un modelo de lenguaje. Se publica **tal
> cual**, como proyecto propio y de código abierto, para quien quiera usarlo,
> aprenderlo o mejorarlo. Puede contener rough edges; las contribuciones y los
> issues son bienvenidos.

---

## ✨ Funciones

| Módulo | Qué puedes hacer |
|--------|------------------|
| **Escenas y Estudio** | Cambiar escena programa/preview, crear/renombrar/eliminar escenas, modo estudio, T-Bar, override de transición por escena |
| **Fuentes (Inputs)** | Crear/eliminar/renombrar fuentes de todo tipo, editar propiedades dinámicas (JSON), mute/volumen/balance/sync/monitor/pistas de audio, controles multimedia, screenshot |
| **Mezclador de Audio** | Todas las fuentes con audio en un solo sitio: volumen (dB), mute, balance, sincronía y monitoreo por fuente |
| **Editor de Escena** | Lienzo visual tipo OBS: **arrastra y redimensiona** elementos, ajusta posición/tamaño/rotación con valores exactos, mostrar/ocultar |
| **Elementos de Escena** | Mostrar/ocultar, bloquear, ordenar, duplicar, eliminar, **transform completo** (posición, escala, rotación, crop, alineación, bounds) |
| **Filtros** | Añadir/eliminar/reordenar filtros de cualquier fuente, activar/desactivar, editar ajustes |
| **Transiciones** | Cambiar transición actual, duración, ajustes, transición de estudio, T-Bar |
| **Streaming** | Iniciar/detener/pausar/reanudar, configurar servidor y stream key, estado (duración, bitrate, frames perdidos) |
| **Grabación** | Iniciar/detener/pausar, split de archivo, crear capítulos, ver ruta guardada |
| **Replay + VCAM** | Replay Buffer (iniciar/guardar/detener), Cámara Virtual de OBS |
| **Salidas** | Listar todas las salidas, iniciar/detener, editar ajustes, abrir ventanas/proyectores de OBS |
| **Hotkeys** | Lista completa, ejecutar por nombre, **grabar y disparar secuencias de teclas** personalizadas |
| **Stats y Eventos** | CPU, memoria, fps, frames perdidos, log de eventos en tiempo real |
| **Consola JSON** | Enviar **cualquier request del protocolo** + vendor requests de plugins |
| **Extra** | Reconexión automática, credenciales cifradas, tema oscuro estilo OBS |

---

## 🔧 Requisitos en el PC con OBS

1. **OBS Studio 28+** (o anterior con el plugin [obs-websocket](https://github.com/obsproject/obs-websocket)).
2. En OBS: **Herramientas → Servidor WebSocket**:
   - Marca **Habilitar servidor WebSocket**.
   - Marca **Permitir conexiones no solo de localhost** (necesario para control remoto).
   - Define una **contraseña** (recomendado, obligatorio si expones el servicio).
3. **Firewall**: permite el puerto **TCP 4455** (o el que configures) para conexiones entrantes.

> Por defecto el servidor escucha en el puerto **4455**.

---

## 🌐 Control remoto por red (recomendaciones)

La app es un **cliente** del WebSocket de OBS: se conecta a `IP:4455` del PC que
ejecuta OBS. Si ambas máquinas están en la **misma red local (LAN)**, basta con usar
la IP local del PC con OBS (ej. `192.168.1.10`).

Si están en **redes distintas** (otra casa, otro sitio, internet), no conviene abrir
el puerto 4455 a internet a pelo. Usa una de estas opciones, de más a menos
recomendada para uso habitual:

### Opción A — Tailscale (recomendada)
Crea una **red privada virtual** tipo WireGuard entre tus dispositivos, como si
estuvieran en la misma LAN, sin tocar el firewall del router.
1. Instala [Tailscale](https://tailscale.com/) en el PC con OBS **y** en el PC cliente.
2. Inicia sesión en ambos con la misma cuenta (o comparte el equipo).
3. Tailscale asigna una IP privada a cada máquina (ej. `100.x.y.z`).
4. En la app, conecta usando la **IP de Tailscale** del PC con OBS y el puerto `4455`.
- Ventajas: cifrado, privado, sin abrir puertos, gratis para uso personal.
- Ideal para: control remoto estable y seguro entre tus propios equipos.

### Opción B — Radmin VPN
Crea una **LAN virtual** gratuita; ambos PCs se unen a la misma red con una contraseña.
1. Instala [Radmin VPN](https://www.radmin-vpn.com/) en ambos PCs.
2. En el PC con OBS: **Crear red** (nombre + contraseña). En el cliente: **Unirse a red**.
3. Usa la **IP que Radmin VPN** asigna al PC con OBS (aparece en su panel).
4. Conecta la app a esa IP en el puerto `4455`.
- Ventajas: gratuito, fácil, sin configurar router.
- Ideal para: grupos de confianza (amigos, equipo de directo) en Windows.

### Opción C — Ngrok (acceso temporal / demos)
Túnele el puerto 4455 a una **URL pública**. Útil para probar o dejar acceso puntual, pero **expone el servicio a internet**: usa una contraseña fuerte en OBS y ciérralo al terminar.
1. Instala [ngrok](https://ngrok.com/).
2. Ejecuta: `ngrok tcp 4455`.
3. Ngrok te da algo como `tcp://x.tcp.ngrok.io:12345`.
4. Conecta la app a ese host/puerto (reemplaza el host por `x.tcp.ngrok.io` y el puerto por el número asignado).
- Ventajas: acceso desde cualquier lugar en segundos, sin instalar nada en el PC con OBS.
- Ideal para: pruebas puntuales. **No lo dejes corriendo sin contraseña.**

> 🔐 En cualquier caso: mantén una **contraseña fuerte** en el servidor WebSocket de
> OBS y no expongas el puerto 4455 directamente a internet sin VPN.

---

## 🚀 Uso

1. Abre OBS Controller en el equipo remoto.
2. Clic en el indicador de conexión (arriba a la izquierda) e introduce:
   - **Host/IP**: IP del PC con OBS (local, de Tailscale o de Radmin VPN).
   - **Puerto**: `4455` (o el que hayas configurado).
   - **Contraseña**: la definida en OBS.
3. Pulsa **Conectar**. Los LEDs y el estado se actualizan en tiempo real.

La IP/puerto/contraseña se guardan cifrados en el equipo (con `safeStorage` de Electron).

---

## 🛠️ Compilar desde código

### Requisitos
- Node.js 18+ (probado con Node 22)
- npm 9+

### Comandos

```bash
npm install          # instalar dependencias
npm run dev          # desarrollo (recarga en caliente)
npm run build        # compilar a /out
npm run typecheck    # comprobar tipos (main + renderer)

# Windows (desde Windows):
npm run dist         # genera instalador NSIS en /dist
npx electron-builder --win portable   # .exe portátil de un solo archivo

# Linux:
npm run dist:linux   # genera AppImage en /dist
```

> **Nota (NSIS desde Linux)**: el instalador NSIS requiere `wine` y a veces falla el
> desinstalador bajo wine. Usa el target `portable` o compila en Windows con
> `npm run dist`. El **AppImage** de Linux se genera sin problemas.

---

## 🧱 Stack tecnológico

- **Electron 44** — app de escritorio multiplataforma (Windows y Linux)
- **React 19 + TypeScript 5.9** — UI tipada y reactiva
- **Vite 7 + electron-vite 5** — bundling ultrarrápido
- **obs-websocket-js 5** — cliente de referencia del protocolo v5 (~100% de requests/eventos)
- **Zustand** — estado global ligero
- **electron-builder** — empaquetado (NSIS/portable en Windows, AppImage en Linux)

---

## 📁 Estructura del proyecto

```
obs-controller/
├── src/
│   ├── shared/types.ts          # Contrato IPC + tipos compartidos
│   ├── main/                    # Proceso principal (Electron)
│   │   ├── index.ts             # Ventana + arranque
│   │   ├── obs-client.ts        # Cliente obs-websocket (conexión, reconexión, eventos)
│   │   ├── ipc.ts               # Handlers IPC
│   │   ├── credentials.ts       # Credenciales cifradas (safeStorage)
│   │   └── settings.ts          # Ajustes persistentes
│   ├── preload/index.ts         # Puente seguro main↔renderer
│   └── renderer/src/            # React UI
│       ├── App.tsx              # Layout + navegación
│       ├── stores/              # Estado (conexión, datos OBS)
│       ├── components/          # Toolbar, Sidebar, diálogos
│       └── modules/             # Los módulos del panel
├── electron.vite.config.ts
└── package.json
```

---

## 🔐 Seguridad

- La app es **solo cliente** del WebSocket de OBS (no abre puertos).
- La contraseña se guarda cifrada con el **safeStorage** del sistema operativo.
- IPC aislado con `contextIsolation: true` y sin `nodeIntegration`.

---

## 🤝 Contribuir

Como proyecto de código abierto hecho con vibecode, cualquier mejora es bienvenida:

1. Haz un *fork* del repositorio.
2. Crea una rama: `git checkout -b mi-mejora`.
3. Compila y prueba: `npm install && npm run typecheck && npm run dev`.
4. Abre un *Pull Request* describiendo el cambio.

Si encuentras un error, abre un *issue* con los pasos para reproducirlo, tu SO y la
versión de OBS.

---

## 📄 Licencia

MIT — ver [LICENSE](./LICENSE).

Hecho con vibecode. 🎛️
