# Adwita Square

Square GTK theme and GNOME Shell extension based on Adwaita.

![Adwita Square](https://img.shields.io/badge/GNOME-45%20--%2051-blue)
![License](https://img.shields.io/badge/License-LGPL--2.1-green)

**Adwita Square** transforms GNOME Shell and GTK applications into a clean, modern, square aesthetic while preserving native Adwaita look and feel.

---

## ✨ Features

- **Square Window Controls & Buttons:** Clean square window control buttons (close, minimize, maximize) with optional vertical stacked controls.
- **Dynamic Top Panel:** Intelligent panel transparency and styling that dynamically adapts when windows are maximized.
- **Background Blur:** Hardware-accelerated background blur for the top panel, dock/dash, popovers, and app windows.
- **Unified Squircle Icon Generator:** Automatic generation of uniform, high-quality squircle app icons matching your accent color or adaptive palette.
- **Browser Theme Integration:** Cohesive styling for Firefox (`userChrome.css`) and Chromium/Chrome to match the square desktop motif.
- **Wallpaper Manager & Live Video Wallpaper:** Automatic rotation of desktop wallpapers, smooth transitions, and support for MP4/WebM animated live wallpapers.
- **Accent Color Selection:** Full integration with GNOME accent color presets and automatic dominant color extraction from your current wallpaper.

---

## 💻 Compatibility

- **GNOME Shell:** 45, 46, 47, 48, 49, 50, 51
- **Toolkits:** GTK 4, GTK 3, Libadwaita

---

## 🚀 Installation

### Option 1: Manual Installation from Source

1. Clone or download this repository:
   ```bash
   git clone https://github.com/Mikolaj75/adwita-square.git ~/.local/share/gnome-shell/extensions/adwita-square@g-mobile.eu
   ```

2. Compile the GSettings schema:
   ```bash
   glib-compile-schemas ~/.local/share/gnome-shell/extensions/adwita-square@g-mobile.eu/schemas/
   ```

3. Restart GNOME Shell (or log out and log back in on Wayland).

4. Enable the extension:
   ```bash
   gnome-extensions enable adwita-square@g-mobile.eu
   ```

---

## ⚙️ Configuration

Open the extension settings via:
- **Extensions** (`gnome-extensions-app`) or **Extension Manager**
- Or directly via command line:
  ```bash
  gnome-extensions prefs adwita-square@g-mobile.eu
  ```

---

## 📄 License

This project is licensed under the GNU Lesser General Public License version 2.1 or later (**LGPL-2.1-or-later**). See the [LICENSE](LICENSE) file for details.
