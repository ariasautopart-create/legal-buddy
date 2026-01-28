# Compilar ARIAS LEGAL GESTIÓN con Tauri

Tauri genera ejecutables más pequeños y rápidos que Electron, usando Rust como backend.

## Requisitos Previos

### 1. Instalar Rust
Descarga e instala desde: https://rustup.rs/

```bash
# Verificar instalación
rustc --version
cargo --version
```

### 2. Instalar dependencias de Windows
- Microsoft Visual Studio C++ Build Tools
- WebView2 (viene preinstalado en Windows 10/11)

## Pasos para Compilar

### 1. Clonar el repositorio
```bash
git clone https://github.com/TU_USUARIO/TU_REPOSITORIO.git
cd TU_REPOSITORIO
```

### 2. Instalar dependencias del proyecto
```bash
npm install
```

### 3. Instalar Tauri CLI
```bash
npm install --save-dev @tauri-apps/cli @tauri-apps/api
```

### 4. Inicializar Tauri
```bash
npx tauri init
```

Durante la inicialización, responde:
- **App name**: ARIAS LEGAL GESTION
- **Window title**: ARIAS LEGAL GESTIÓN
- **Web assets location**: ../dist
- **Dev server URL**: http://localhost:5173
- **Dev command**: npm run dev
- **Build command**: npm run build

### 5. Configurar package.json
Añade estos scripts a tu `package.json`:

```json
{
  "scripts": {
    "tauri": "tauri",
    "tauri:dev": "tauri dev",
    "tauri:build": "tauri build"
  }
}
```

### 6. Configurar Tauri (src-tauri/tauri.conf.json)
Después de inicializar, edita `src-tauri/tauri.conf.json`:

```json
{
  "$schema": "https://schema.tauri.app/config/2",
  "productName": "ARIAS LEGAL GESTION",
  "version": "1.0.0",
  "identifier": "com.ariaslegal.gestion",
  "build": {
    "beforeDevCommand": "npm run dev",
    "devUrl": "http://localhost:5173",
    "beforeBuildCommand": "npm run build",
    "frontendDist": "../dist"
  },
  "app": {
    "windows": [
      {
        "title": "ARIAS LEGAL GESTIÓN",
        "width": 1200,
        "height": 800,
        "resizable": true,
        "fullscreen": false,
        "center": true
      }
    ],
    "security": {
      "csp": null
    }
  },
  "bundle": {
    "active": true,
    "targets": ["msi", "nsis"],
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ],
    "windows": {
      "certificateThumbprint": null,
      "digestAlgorithm": "sha256",
      "timestampUrl": ""
    }
  }
}
```

### 7. Compilar para producción
```bash
npm run tauri:build
```

El instalador se generará en:
```
src-tauri/target/release/bundle/
├── msi/          <- Instalador MSI
└── nsis/         <- Instalador NSIS (.exe)
```

## Ventajas de Tauri vs Electron

| Característica | Tauri | Electron |
|---------------|-------|----------|
| Tamaño del ejecutable | ~3-10 MB | ~150+ MB |
| Uso de RAM | Bajo | Alto |
| Velocidad de inicio | Rápido | Lento |
| Backend | Rust | Node.js |

## Desarrollo Local
```bash
# Modo desarrollo con hot-reload
npm run tauri:dev
```

## Iconos
Crea una carpeta `src-tauri/icons/` con los siguientes archivos:
- icon.ico (Windows)
- icon.icns (macOS)
- 32x32.png
- 128x128.png
- 128x128@2x.png

Puedes generar los iconos automáticamente:
```bash
npx tauri icon ruta/a/tu/logo.png
```

## Solución de Problemas

### Error: "failed to run custom build command for webkit2gtk"
Solo aplica en Linux. En Windows no deberías ver este error.

### Error: "WebView2 is not installed"
Descarga WebView2 Runtime desde:
https://developer.microsoft.com/en-us/microsoft-edge/webview2/

### La aplicación no carga
Verifica que `npm run build` funcione correctamente y que exista la carpeta `dist/`.

## Recursos
- Documentación oficial: https://tauri.app/
- GitHub: https://github.com/tauri-apps/tauri
