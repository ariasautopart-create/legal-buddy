# Instrucciones para Compilar ARIAS LEGAL GESTIÓN como Ejecutable Windows

## Requisitos Previos

1. **Node.js** (versión 18 o superior)
   - Descarga: https://nodejs.org/
   
2. **Git** (para clonar el repositorio)
   - Descarga: https://git-scm.com/

## Pasos para Compilar

### 1. Exportar el proyecto a GitHub
- En Lovable, ve a **Settings** → **GitHub** → **Connect project**
- Crea un nuevo repositorio

### 2. Clonar el repositorio en tu PC
```bash
git clone https://github.com/TU_USUARIO/TU_REPOSITORIO.git
cd TU_REPOSITORIO
```

### 3. Instalar dependencias
```bash
npm install
```

### 4. Instalar dependencias de Electron
```bash
npm install --save-dev electron electron-builder
```

### 5. Modificar package.json
Agrega las siguientes líneas a tu `package.json`:

```json
{
  "main": "electron/main.js",
  "scripts": {
    "electron:dev": "vite build && electron .",
    "electron:build": "vite build && electron-builder --win",
    "electron:build:all": "vite build && electron-builder --win --mac --linux"
  }
}
```

### 6. Compilar la aplicación web
```bash
npm run build
```

### 7. Crear el ejecutable de Windows
```bash
npm run electron:build
```

## Resultado

El instalador se creará en la carpeta `release/`:
- `ARIAS LEGAL GESTIÓN-Setup-1.0.0.exe`

## Instalación en Windows

1. Ejecuta el archivo `.exe` generado
2. Selecciona la carpeta de instalación (por defecto: `C:\Program Files\ARIAS LEGAL GESTIÓN`)
3. Se creará un acceso directo en el escritorio y menú inicio

## Notas Importantes

- **Conexión a Internet**: La aplicación necesita conexión para sincronizar datos con el servidor
- **Actualizaciones**: Para actualizar, deberás recompilar y reinstalar
- **Icono personalizado**: Puedes reemplazar `public/pwa-512x512.png` con tu logo (debe ser 512x512 px)

## Solución de Problemas

### Error: electron-builder no encontrado
```bash
npm install -g electron-builder
```

### Error: No se puede compilar
Asegúrate de tener Visual Studio Build Tools instalado:
```bash
npm install --global windows-build-tools
```

## Soporte

Para soporte técnico, contacta al equipo de desarrollo de ARIAS LEGAL.
