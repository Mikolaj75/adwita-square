/*
 * Adwita Square - Hybrid Icon Theme Generator
 * Generates a unified squircle icon theme based on Adwaita symbolic SVGs,
 * application SVGs, and Cairo raster fallback for PNG apps.
 *
 * Copyright (C) 2024-2026 g-mobile.eu
 * Licensed under the GNU Lesser General Public License version 2.1 or later (LGPL-2.1-or-later).
 */

// ============================================================================
// SECTION: Icon Theme Directories & Constants
// I define the destination icon theme paths and names for ~/.icons and ~/.local/share/icons.
// ============================================================================

import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import GdkPixbuf from 'gi://GdkPixbuf';
import cairo from 'cairo';
import { ACCENT_PRESETS, hexToRgb } from './themeGenerator.js';

export const ICON_THEME_NAME = 'adwita-square';

export function getIconThemeDir() {
    return GLib.build_filenamev([GLib.get_home_dir(), '.icons', ICON_THEME_NAME]);
}

export function getXdgIconThemeDir() {
    return GLib.build_filenamev([GLib.get_home_dir(), '.local', 'share', 'icons', ICON_THEME_NAME]);
}

export function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) {
        h = s = 0;
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return [h, s, l];
}

export function hslToRgb(h, s, l) {
    let r, g, b;
    if (s === 0) {
        r = g = b = l;
    } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

export function drawSquircle(cr, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    const k = 0.5522847498;
    cr.newSubPath();
    cr.moveTo(x + r, y);
    cr.lineTo(x + width - r, y);
    cr.curveTo(x + width - r * (1 - k), y, x + width, y + r * (1 - k), x + width, y + r);
    cr.lineTo(x + width, y + height - r);
    cr.curveTo(x + width, y + height - r * (1 - k), x + width - r * (1 - k), y + height, x + width - r, y + height);
    cr.lineTo(x + r, y + height);
    cr.curveTo(x + r * (1 - k), y + height, x, y + height - r * (1 - k), x, y + height - r);
    cr.lineTo(x, y + r);
    cr.curveTo(x, y + r * (1 - k), x + r * (1 - k), y, x + r, y);
    cr.closePath();
}

/**
 * Scans directories for .desktop files and returns map of iconName -> [appNames].
 */
export function getInstalledAppIcons() {
    const appDirs = [
        '/usr/share/applications',
        GLib.build_filenamev([GLib.get_home_dir(), '.local', 'share', 'applications']),
        '/var/lib/flatpak/exports/share/applications',
        GLib.build_filenamev([GLib.get_home_dir(), '.local', 'share', 'flatpak', 'exports', 'share', 'applications']),
    ];

    const iconMap = new Map();

    for (const dirPath of appDirs) {
        if (!GLib.file_test(dirPath, GLib.FileTest.IS_DIR)) continue;
        const dir = Gio.File.new_for_path(dirPath);
        let enumerator = null;
        try {
            enumerator = dir.enumerate_children('standard::name', Gio.FileQueryInfoFlags.NONE, null);
        } catch (_) {
            continue;
        }

        let info;
        while ((info = enumerator.next_file(null)) !== null) {
            const fileName = info.get_name();
            if (!fileName.endsWith('.desktop')) continue;
            const fullPath = GLib.build_filenamev([dirPath, fileName]);

            const keyFile = new GLib.KeyFile();
            try {
                keyFile.load_from_file(fullPath, GLib.KeyFileFlags.NONE);
            } catch (_) {
                continue;
            }

            let iconName = '';
            let appName = '';
            try {
                iconName = keyFile.get_string('Desktop Entry', 'Icon');
            } catch (_) {}
            try {
                appName = keyFile.get_string('Desktop Entry', 'Name');
            } catch (_) {}

            if (!iconName) continue;
            let baseIcon = iconName;
            if (baseIcon.startsWith('/')) {
                baseIcon = GLib.path_get_basename(baseIcon);
            }
            if (baseIcon.endsWith('.png') || baseIcon.endsWith('.svg') || baseIcon.endsWith('.xpm')) {
                baseIcon = baseIcon.substring(0, baseIcon.lastIndexOf('.'));
            }

            if (!iconMap.has(baseIcon)) {
                iconMap.set(baseIcon, {
                    baseName: baseIcon,
                    rawIcon: iconName,
                    appName: appName || baseIcon,
                    desktopPath: fullPath,
                });
            }
        }
    }

    return Array.from(iconMap.values());
}

/**
 * Searches system folders for the actual image file of an icon.
 */
export function findIconFile(iconName) {
    if (!iconName) return null;
    if (iconName.startsWith('/') && GLib.file_test(iconName, GLib.FileTest.EXISTS)) {
        return iconName;
    }

    const searchDirs = [
        GLib.build_filenamev([GLib.get_home_dir(), '.local', 'share', 'icons']),
        GLib.build_filenamev([GLib.get_home_dir(), '.icons']),
        '/usr/share/icons/hicolor',
        '/usr/share/icons/Adwaita',
        '/usr/share/icons/AdwaitaLegacy',
        '/usr/share/pixmaps',
        '/var/lib/flatpak/exports/share/icons/hicolor',
        GLib.build_filenamev([GLib.get_home_dir(), '.local', 'share', 'flatpak', 'exports', 'share', 'icons', 'hicolor']),
    ];

    const sizes = ['scalable', '512x512', '256x256', '128x128', '96x96', '64x64', '48x48', '32x32'];
    const cats = ['apps', 'mimetypes', 'categories', 'devices', 'places', 'status', 'legacy', 'actions', 'notifications', 'emblems'];

    // 1. First priority: I look for scalable/vector SVG icons
    for (const base of searchDirs) {
        if (!GLib.file_test(base, GLib.FileTest.IS_DIR)) continue;

        for (const size of sizes) {
            for (const cat of cats) {
                const candidate = GLib.build_filenamev([base, size, cat, `${iconName}.svg`]);
                if (candidate.includes('/adwita-square/')) continue;
                if (GLib.file_test(candidate, GLib.FileTest.EXISTS)) {
                    return candidate;
                }
            }
        }

        const directCandidate = GLib.build_filenamev([base, `${iconName}.svg`]);
        if (!directCandidate.includes('/adwita-square/') && GLib.file_test(directCandidate, GLib.FileTest.EXISTS)) {
            return directCandidate;
        }
    }

    // 2. Second priority: I look for high-resolution PNGs (512, 256, 128, etc.)
    for (const size of sizes) {
        for (const base of searchDirs) {
            if (!GLib.file_test(base, GLib.FileTest.IS_DIR)) continue;

            for (const cat of cats) {
                const candidate = GLib.build_filenamev([base, size, cat, `${iconName}.png`]);
                if (candidate.includes('/adwita-square/')) continue;
                if (GLib.file_test(candidate, GLib.FileTest.EXISTS)) {
                    return candidate;
                }
            }
        }
    }

    // 3. Fallback: I search directly in searchDirs root
    for (const base of searchDirs) {
        if (!GLib.file_test(base, GLib.FileTest.IS_DIR)) continue;
        const candidate = GLib.build_filenamev([base, `${iconName}.png`]);
        if (!candidate.includes('/adwita-square/') && GLib.file_test(candidate, GLib.FileTest.EXISTS)) {
            return candidate;
        }
    }

    return null;
}

/**
 * Finds a vector icon in besgnulinux-labile or custom two-tone themes.
 */
export function findLabileIcon(iconName, rawIcon) {
    const labileDirs = [
        GLib.build_filenamev([GLib.get_home_dir(), '.icons', 'besgnulinux-labile', 'apps', 'scalable']),
        GLib.build_filenamev([GLib.get_home_dir(), '.icons', 'besgnulinux-labile-dark', 'apps', 'scalable']),
        '/usr/share/icons/besgnulinux-labile/apps/scalable',
        '/usr/share/icons/besgnulinux-labile-dark/apps/scalable',
    ];

    const candidates = [];
    const addCand = (n) => {
        if (!n) return;
        let b = n;
        if (b.startsWith('/')) b = GLib.path_get_basename(b);
        if (b.endsWith('.png') || b.endsWith('.svg') || b.endsWith('.xpm')) {
            b = b.substring(0, b.lastIndexOf('.'));
        }
        candidates.push(`${b}.svg`);
        candidates.push(`${b.toLowerCase()}.svg`);
        const clean = b.replace(/-symbolic$/, '');
        if (clean !== b) candidates.push(`${clean}.svg`);
        const parts = b.split('.');
        if (parts.length > 1) {
            candidates.push(`${parts[parts.length - 1]}.svg`);
            candidates.push(`${parts[parts.length - 1].toLowerCase()}.svg`);
        }
    };

    addCand(iconName);
    addCand(rawIcon);

    for (const d of labileDirs) {
        if (!GLib.file_test(d, GLib.FileTest.IS_DIR)) continue;
        for (const cand of candidates) {
            const p = GLib.build_filenamev([d, cand]);
            if (GLib.file_test(p, GLib.FileTest.EXISTS)) {
                return p;
            }
        }
    }
    return null;
}

/**
 * Finds an Adwaita or system symbolic icon for an application if available.
 */
export function findSymbolicIcon(iconName, rawIcon = null) {
    if (!iconName && !rawIcon) return null;

    const names = [iconName, rawIcon].filter(Boolean);
    const candidates = [];

    const aliasMap = {
        'gedit': 'accessories-text-editor-symbolic.svg',
        'org.gnome.TextEditor': 'accessories-text-editor-symbolic.svg',
        'org.gnome.Calculator': 'accessories-calculator-symbolic.svg',
        'gnome-calculator': 'accessories-calculator-symbolic.svg',
        'org.gnome.Nautilus': 'system-file-manager-symbolic.svg',
        'system-file-manager': 'system-file-manager-symbolic.svg',
        'org.gnome.Terminal': 'utilities-terminal-symbolic.svg',
        'gnome-terminal': 'utilities-terminal-symbolic.svg',
        'ptyxis': 'utilities-terminal-symbolic.svg',
        'org.gnome.Ptyxis': 'utilities-terminal-symbolic.svg',
        'org.gnome.Settings': 'preferences-system-symbolic.svg',
        'preferences-system': 'preferences-system-symbolic.svg',
        'help': 'help-browser-symbolic.svg',
        'system-help': 'system-help-symbolic.svg',
        'org.gnome.Calendar': 'x-office-calendar-symbolic.svg',
        'org.gnome.Weather': 'org.gnome.Weather-symbolic.svg',
        'weather': 'org.gnome.Weather-symbolic.svg',
        'org.gnome.Software': 'org.gnome.Software-symbolic.svg',
        'software-store': 'org.gnome.Software-symbolic.svg',
        'firefox': 'firefox-symbolic.svg',
        'org.mozilla.firefox': 'firefox-symbolic.svg',
        'google-chrome': 'web-browser-symbolic.svg',
        'chromium': 'web-browser-symbolic.svg',
        'org.strawberrymusicplayer.strawberry': 'audio-x-generic-symbolic.svg',
        'strawberry': 'audio-x-generic-symbolic.svg',
        'org.gnome.Music': 'audio-x-generic-symbolic.svg',
        'music': 'audio-x-generic-symbolic.svg',
        'audio-player': 'audio-x-generic-symbolic.svg',
        'org.gnome.clocks': 'org.gnome.clocks-symbolic.svg',
        'org.gnome.Logs': 'org.gnome.Logs-symbolic.svg',
        'org.gnome.DiskUtility': 'drive-harddisk-symbolic.svg',
        'org.gnome.baobab': 'drive-harddisk-symbolic.svg',
        'org.gnome.SystemMonitor': 'org.gnome.SystemMonitor-symbolic.svg',
        'gnome-system-monitor': 'org.gnome.SystemMonitor-symbolic.svg',
        'auto-cpufreq': 'battery-full-symbolic.svg',
        'gparted': 'drive-harddisk-symbolic.svg',
        'gnome-color-manager': 'preferences-color-symbolic.svg',
        'rpi-imager': 'media-flash-symbolic.svg',
        'org.fedoraproject.MediaWriter': 'media-flash-symbolic.svg',
        'cura-icon': 'printer-symbolic.svg',
        'cura': 'printer-symbolic.svg',
        'idle3': 'text-x-python-symbolic.svg',
        'blender': 'applications-graphics-symbolic.svg',
        'openscad': 'applications-engineering-symbolic.svg',
        'occ': 'applications-engineering-symbolic.svg',
    };

    for (const n of names) {
        let b = n;
        if (b.startsWith('/')) b = GLib.path_get_basename(b);
        if (b.endsWith('.svg') || b.endsWith('.png') || b.endsWith('.xpm')) {
            b = b.substring(0, b.lastIndexOf('.'));
        }
        const clean = b.replace(/-symbolic$/, '');
        if (aliasMap[clean]) candidates.push(aliasMap[clean]);
        if (aliasMap[b]) candidates.push(aliasMap[b]);
        candidates.push(`${clean}-symbolic.svg`);

        const parts = b.split('.');
        if (parts.length > 1) {
            const lastPart = parts[parts.length - 1];
            if (aliasMap[lastPart]) candidates.push(aliasMap[lastPart]);
            candidates.push(`${lastPart}-symbolic.svg`);
        }
    }

    const symbolicDirs = [
        '/usr/share/icons/Adwaita/symbolic/legacy',
        '/usr/share/icons/Adwaita/symbolic/ui',
        '/usr/share/icons/Adwaita/symbolic/categories',
        '/usr/share/icons/Adwaita/symbolic/devices',
        '/usr/share/icons/Adwaita/symbolic/places',
        '/usr/share/icons/Adwaita/symbolic/status',
        '/usr/share/icons/Adwaita/symbolic/actions',
        '/usr/share/icons/Adwaita/symbolic/mimetypes',
        '/usr/share/icons/Adwaita/symbolic/apps',
        '/usr/share/icons/Adwaita/symbolic/emotes',
        '/usr/share/icons/Adwaita/symbolic/emblems',
        '/usr/share/icons/hicolor/symbolic/apps',
        '/var/lib/flatpak/exports/share/icons/hicolor/symbolic/apps',
        GLib.build_filenamev([GLib.get_home_dir(), '.local', 'share', 'flatpak', 'exports', 'share', 'icons', 'hicolor', 'symbolic', 'apps']),
        GLib.build_filenamev([GLib.get_home_dir(), '.local', 'share', 'icons', 'hicolor', 'symbolic', 'apps']),
    ];

    for (const d of symbolicDirs) {
        if (!GLib.file_test(d, GLib.FileTest.IS_DIR)) continue;
        for (const cand of candidates) {
            const p = GLib.build_filenamev([d, cand]);
            if (GLib.file_test(p, GLib.FileTest.EXISTS)) {
                return p;
            }
        }
    }

    return null;
}

// ============================================================================
// SECTION: Dominant Color Sampling
// I sample dominant hues from application icon assets to build adaptive squircle backgrounds.
// ============================================================================
/**
 * Samples dominant colors from an SVG or image file.
 */
export function sampleColors(imagePath, paletteMode, accentHex) {
    if (paletteMode === 'colored') {
        const borderHex = accentHex || '#3584e4';
        return {
            bgHex: '#1e2433',
            borderHex,
            fgHex: '#ffffff',
            bgRgb: [30, 36, 51],
            fgRgb: [255, 255, 255],
        };
    }

    // In 'accent' mode:
    // I adaptively sample the background squircle from the application's icon.
    // I render the middle icon glyph in the toned system accent color.
    if (paletteMode === 'accent') {
        const accRgb = hexToRgb(accentHex || '#3584e4');
        const [accH, accS] = rgbToHsl(accRgb.r, accRgb.g, accRgb.b);
        const fgSat = Math.min(0.85, Math.max(0.55, accS * 0.90));
        const fgLight = (accH > 0.12 && accH < 0.18) ? 0.68 : 0.72;
        const [fgR, fgG, fgB] = hslToRgb(accH, fgSat, fgLight);
        const fgHex = `rgb(${fgR}, ${fgG}, ${fgB})`;

        let bgR = 30, bgG = 36, bgB = 51;
        let bgHex = `rgb(${bgR}, ${bgG}, ${bgB})`;

        if (imagePath) {
            try {
                const pb = imagePath.endsWith('.svg')
                    ? GdkPixbuf.Pixbuf.new_from_file_at_scale(imagePath, 32, 32, true)
                    : GdkPixbuf.Pixbuf.new_from_file(imagePath);
                if (pb) {
                    const pixels = pb.get_pixels();
                    const nChannels = pb.get_n_channels();
                    let total = 0, sumR = 0, sumG = 0, sumB = 0;
                    for (let i = 0; i < pixels.length; i += nChannels) {
                        const a = nChannels === 4 ? pixels[i + 3] : 255;
                        if (a > 60) {
                            sumR += pixels[i];
                            sumG += pixels[i + 1];
                            sumB += pixels[i + 2];
                            total++;
                        }
                    }
                    if (total > 0) {
                        const [h, s] = rgbToHsl(sumR / total, sumG / total, sumB / total);
                        [bgR, bgG, bgB] = hslToRgb(h, Math.min(0.45, Math.max(0.20, s * 0.70)), 0.22);
                        bgHex = `rgb(${bgR}, ${bgG}, ${bgB})`;
                    }
                }
            } catch (_) {}
        }

        if (bgR === 30 && bgG === 36 && bgB === 51) {
            [bgR, bgG, bgB] = hslToRgb(accH, Math.min(0.35, Math.max(0.15, accS * 0.50)), 0.20);
            bgHex = `rgb(${bgR}, ${bgG}, ${bgB})`;
        }

        return {
            bgHex,
            borderHex: accentHex || '#3584e4',
            fgHex,
            bgRgb: [bgR, bgG, bgB],
            fgRgb: [fgR, fgG, fgB],
        };
    }

    // In 'adaptive' mode:
    // I adaptively sample the background squircle from the application's icon.
    // I render the middle icon glyph in white/near-white.
    if (imagePath) {
        try {
            const pb = imagePath.endsWith('.svg')
                ? GdkPixbuf.Pixbuf.new_from_file_at_scale(imagePath, 32, 32, true)
                : GdkPixbuf.Pixbuf.new_from_file(imagePath);
            if (pb) {
                const pixels = pb.get_pixels();
                const nChannels = pb.get_n_channels();
                let total = 0, sumR = 0, sumG = 0, sumB = 0;
                for (let i = 0; i < pixels.length; i += nChannels) {
                    const a = nChannels === 4 ? pixels[i + 3] : 255;
                    if (a > 60) {
                        sumR += pixels[i];
                        sumG += pixels[i + 1];
                        sumB += pixels[i + 2];
                        total++;
                    }
                }
                if (total > 0) {
                    const [h, s] = rgbToHsl(sumR / total, sumG / total, sumB / total);
                    const [bgR, bgG, bgB] = hslToRgb(h, Math.min(0.45, Math.max(0.20, s * 0.70)), 0.24);
                    const [fgR, fgG, fgB] = hslToRgb(h, Math.min(0.60, s * 0.85), 0.88);
                    return {
                        bgHex: `rgb(${bgR}, ${bgG}, ${bgB})`,
                        borderHex: `rgb(${fgR}, ${fgG}, ${fgB})`,
                        fgHex: `rgb(${fgR}, ${fgG}, ${fgB})`,
                        bgRgb: [bgR, bgG, bgB],
                        fgRgb: [fgR, fgG, fgB],
                    };
                }
            }
        } catch (_) {}
    }

    const defaultRgb = hexToRgb(accentHex || '#3584e4');
    const [defH, defS] = rgbToHsl(defaultRgb.r, defaultRgb.g, defaultRgb.b);
    const [defBgR, defBgG, defBgB] = hslToRgb(defH, Math.min(0.40, Math.max(0.18, defS * 0.65)), 0.20);
    const [defFgR, defFgG, defFgB] = hslToRgb(defH, Math.min(0.85, Math.max(0.55, defS * 0.90)), 0.72);
    return {
        bgHex: `rgb(${defBgR}, ${defBgG}, ${defBgB})`,
        borderHex: accentHex || '#3584e4',
        fgHex: `rgb(${defFgR}, ${defFgG}, ${defFgB})`,
        bgRgb: [defBgR, defBgG, defBgB],
        fgRgb: [defFgR, defFgG, defFgB],
    };
}

/**
 * Wraps a Labile 2-color SVG icon into our custom squircle vector geometry.
 */
export function wrapLabileSvg(srcSvgPath, options = {}) {
    const {
        cornerRadius = 24,
        borderWidth = 1,
        bgHex = '#1e2433',
        borderHex = '#3584e4',
        fgHex = '#f6f5f4',
        opacity = 100,
        innerScale = 0.68,
    } = options;

    let contentBytes;
    try {
        const [ok, bytes] = GLib.file_get_contents(srcSvgPath);
        if (!ok || !bytes) return null;
        contentBytes = bytes;
    } catch (_) {
        return null;
    }

    const decoder = new TextDecoder('utf-8');
    let svgStr = decoder.decode(contentBytes);

    svgStr = svgStr.replace(/<path[^>]*fill-opacity=["']0?\.3[0-9]*["'][^>]*\/>/gi, '');
    svgStr = svgStr.replace(/<path[^>]*fill-opacity=["']0?\.3[0-9]*["'][^>]*>[\s\S]*?<\/path>/gi, '');

    const innerMatch = svgStr.match(/<svg[^>]*>([\s\S]*)<\/svg>/i);
    if (!innerMatch) return null;
    let innerContent = innerMatch[1].trim();

    innerContent = innerContent.replace(/fill=["']#[0-9a-fA-F]{3,8}["']/gi, `fill="${fgHex}"`);
    innerContent = innerContent.replace(/stroke=["']#[0-9a-fA-F]{3,8}["']/gi, `stroke="${fgHex}"`);

    const targetSize = 128;
    const pad = 4;
    const sqSize = targetSize - pad * 2;
    const alphaVal = (Math.max(0.1, Math.min(1.0, opacity / 100))).toFixed(2);
    const borderStroke = borderWidth > 0
        ? `stroke="${borderHex}" stroke-width="${borderWidth}" stroke-opacity="0.35"`
        : '';

    const scale = (2.0 * (innerScale / 0.68)).toFixed(4);
    const offset = ((targetSize - 64 * parseFloat(scale)) / 2).toFixed(2);

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${targetSize} ${targetSize}" width="${targetSize}" height="${targetSize}">
  <rect x="${pad}" y="${pad}" width="${sqSize}" height="${sqSize}" rx="${cornerRadius}" fill="${bgHex}" fill-opacity="${alphaVal}" ${borderStroke} />
  <g transform="translate(${offset}, ${offset}) scale(${scale})" fill="${fgHex}">
    ${innerContent}
  </g>
</svg>
`;
}

/**
 * Wraps an Adwaita symbolic SVG icon into a unified squircle vector with explicit colors.
 */
export function wrapSymbolicSvg(srcSvgPath, options = {}) {
    const {
        cornerRadius = 24,
        borderWidth = 1,
        bgHex = '#1e2230',
        borderHex = '#3584e4',
        fgHex = '#f6f5f4',
        innerScale = 0.68,
        opacity = 100,
    } = options;

    let contentBytes;
    try {
        const [ok, bytes] = GLib.file_get_contents(srcSvgPath);
        if (!ok || !bytes) return null;
        contentBytes = bytes;
    } catch (_) {
        return null;
    }

    const decoder = new TextDecoder('utf-8');
    let svgStr = decoder.decode(contentBytes);

    let minX = 0, minY = 0, origW = 16, origH = 16;
    const vbMatch = svgStr.match(/viewBox=["']([^"']+)["']/i);
    if (vbMatch) {
        const parts = vbMatch[1].trim().split(/[\s,]+/).map(Number);
        if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
            minX = parts[0] || 0;
            minY = parts[1] || 0;
            origW = parts[2];
            origH = parts[3];
        }
    } else {
        const wMatch = svgStr.match(/width=["']([0-9.]+)[^"']*["']/i);
        const hMatch = svgStr.match(/height=["']([0-9.]+)[^"']*["']/i);
        if (wMatch && hMatch) {
            origW = parseFloat(wMatch[1]) || 16;
            origH = parseFloat(hMatch[1]) || 16;
        }
    }

    const innerMatch = svgStr.match(/<svg[^>]*>([\s\S]*)<\/svg>/i);
    if (!innerMatch) return null;
    let innerContent = innerMatch[1];

    // I clean out editor metadata, inkscape/sodipodi/osb tags and attributes that cause XML parse failures in librsvg
    innerContent = innerContent.replace(/<metadata[\s\S]*?<\/metadata>/gi, '');
    innerContent = innerContent.replace(/<sodipodi:namedview[\s\S]*?<\/sodipodi:namedview>/gi, '');
    innerContent = innerContent.replace(/<sodipodi:namedview[^>]*\/>/gi, '');
    innerContent = innerContent.replace(/<title[\s\S]*?<\/title>/gi, '');
    innerContent = innerContent.replace(/sodipodi:[a-z0-9_-]+=["'][^"']*["']/gi, '');
    innerContent = innerContent.replace(/inkscape:[a-z0-9_-]+=["'][^"']*["']/gi, '');
    innerContent = innerContent.replace(/osb:[a-z0-9_-]+=["'][^"']*["']/gi, '');
    innerContent = innerContent.replace(/xmlns:[a-z0-9_-]+=["'][^"']*["']/gi, '');

    // I map solid color fills/strokes to fgHex, preserving none, currentColor, and url()
    innerContent = innerContent.replace(/fill=["']#(?:241f31|bebebe|478cbf|000000|2e3436|3d3846|deddda|ffffff|fff|[0-9a-fA-F]{6}|[0-9a-fA-F]{3})["']/gi, `fill="${fgHex}"`);
    innerContent = innerContent.replace(/stroke=["']#(?:241f31|bebebe|478cbf|000000|2e3436|3d3846|deddda|ffffff|fff|[0-9a-fA-F]{6}|[0-9a-fA-F]{3})["']/gi, `stroke="${fgHex}"`);
    innerContent = innerContent.replace(/-inkscape-[a-z0-9_-]+:[^;"']+;?/gi, '');
    innerContent = innerContent.replace(/style="([^"]*)"/gi, (match, styleVal) => {
        let cleaned = styleVal
            .replace(/-inkscape-[a-z0-9_-]+:[^;"]+;?/gi, '')
            .replace(/fill\s*:\s*#[0-9a-fA-F]{3,8}/gi, `fill:${fgHex}`)
            .replace(/stroke\s*:\s*#[0-9a-fA-F]{3,8}/gi, `stroke:${fgHex}`);
        return `style="${cleaned}"`;
    });
    innerContent = innerContent.replace(/style='([^']*)'/gi, (match, styleVal) => {
        let cleaned = styleVal
            .replace(/-inkscape-[a-z0-9_-]+:[^;']+;?/gi, '')
            .replace(/fill\s*:\s*#[0-9a-fA-F]{3,8}/gi, `fill:${fgHex}`)
            .replace(/stroke\s*:\s*#[0-9a-fA-F]{3,8}/gi, `stroke:${fgHex}`);
        return `style="${cleaned}"`;
    });

    const targetSize = 128;
    const pad = 4;
    const sqSize = targetSize - pad * 2;
    const glyphSize = sqSize * Math.max(0.45, Math.min(0.85, innerScale));
    const scale = glyphSize / Math.max(origW, origH);
    const scaledW = origW * scale;
    const scaledH = origH * scale;
    const offsetX = (targetSize - scaledW) / 2 - minX * scale;
    const offsetY = (targetSize - scaledH) / 2 - minY * scale;
    const alphaVal = (Math.max(0.1, Math.min(1.0, opacity / 100))).toFixed(2);

    const borderStroke = borderWidth > 0
        ? `stroke="${borderHex}" stroke-width="${borderWidth}" stroke-opacity="0.35"`
        : '';

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:svg="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd" viewBox="0 0 ${targetSize} ${targetSize}" width="${targetSize}" height="${targetSize}">
  <rect x="${pad}" y="${pad}" width="${sqSize}" height="${sqSize}" rx="${cornerRadius}" fill="${bgHex}" fill-opacity="${alphaVal}" ${borderStroke} />
  <g transform="translate(${offsetX.toFixed(2)}, ${offsetY.toFixed(2)}) scale(${scale.toFixed(4)})" fill="${fgHex}">
    ${innerContent}
  </g>
</svg>
`;
}

/**
 * Wraps any third-party or application vector SVG icon into a unified squircle vector.
 * Supports smooth accent tinting (paletteMode === 'accent' or 'adaptive') or pure original colors ('colored').
 */
export function wrapAppSvg(srcSvgPath, options = {}) {
    const {
        cornerRadius = 24,
        borderWidth = 1,
        bgHex = '#1e2433',
        borderHex = '#3584e4',
        fgHex = '#f6f5f4',
        opacity = 100,
        innerScale = 0.68,
        paletteMode = 'accent',
        colors = null,
    } = options;

    let contentBytes;
    try {
        const [ok, bytes] = GLib.file_get_contents(srcSvgPath);
        if (!ok || !bytes) return null;
        contentBytes = bytes;
    } catch (_) {
        return null;
    }

    const decoder = new TextDecoder('utf-8');
    let svgStr = decoder.decode(contentBytes);

    // I clean metadata, RDF, sodipodi and editor tags that break librsvg
    svgStr = svgStr.replace(/<metadata[\s\S]*?<\/metadata>/gi, '');
    svgStr = svgStr.replace(/<rdf:RDF[\s\S]*?<\/rdf:RDF>/gi, '');
    svgStr = svgStr.replace(/<sodipodi:namedview[\s\S]*?<\/sodipodi:namedview>/gi, '');
    svgStr = svgStr.replace(/<sodipodi:namedview[^>]*\/>/gi, '');
    svgStr = svgStr.replace(/<title[\s\S]*?<\/title>/gi, '');
    svgStr = svgStr.replace(/<inkscape:perspective[\s\S]*?<\/inkscape:perspective>/gi, '');
    svgStr = svgStr.replace(/<inkscape:perspective[^>]*\/>/gi, '');

    // I deduplicate XML namespaces so no prefix is defined twice (which invalidates XML)
    const nsMap = new Map([
        ['xmlns', 'http://www.w3.org/2000/svg'],
        ['xmlns:xlink', 'http://www.w3.org/1999/xlink'],
        ['xmlns:svg', 'http://www.w3.org/2000/svg'],
        ['xmlns:inkscape', 'http://www.inkscape.org/namespaces/inkscape'],
        ['xmlns:sodipodi', 'http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd'],
        ['xmlns:osb', 'http://www.openswatchbook.org/uri/2009/osb'],
        ['xmlns:rdf', 'http://www.w3.org/1999/02/22-rdf-syntax-ns#'],
        ['xmlns:dc', 'http://purl.org/dc/elements/1.1/'],
        ['xmlns:cc', 'http://creativecommons.org/ns#'],
    ]);

    const rootMatch = svgStr.match(/<svg([^>]*)>/i);
    if (rootMatch) {
        const rootAttrs = rootMatch[1];
        const nsRegex = /(xmlns(?::[a-zA-Z0-9_-]+)?)=["']([^"']+)["']/g;
        let m;
        while ((m = nsRegex.exec(rootAttrs)) !== null) {
            nsMap.set(m[1], m[2]);
        }
    }

    const nsAttributes = Array.from(nsMap.entries())
        .map(([k, v]) => `${k}="${v}"`)
        .join(' ');

    let minX = 0, minY = 0, origW = 128, origH = 128;
    const vbMatch = svgStr.match(/viewBox=["']([^"']+)["']/i);
    if (vbMatch) {
        const parts = vbMatch[1].trim().split(/[\s,]+/).map(Number);
        if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
            minX = parts[0] || 0;
            minY = parts[1] || 0;
            origW = parts[2];
            origH = parts[3];
        }
    } else {
        const wMatch = svgStr.match(/width=["']([0-9.]+)[^"']*["']/i);
        const hMatch = svgStr.match(/height=["']([0-9.]+)[^"']*["']/i);
        if (wMatch && hMatch) {
            origW = parseFloat(wMatch[1]) || 128;
            origH = parseFloat(hMatch[1]) || 128;
        }
    }

    const innerMatch = svgStr.match(/<svg[^>]*>([\s\S]*)<\/svg>/i);
    if (!innerMatch) return null;
    const innerContent = innerMatch[1].trim();

    const targetSize = 128;
    const pad = 4;
    const sqSize = targetSize - pad * 2;
    const clampedScale = Math.max(0.45, Math.min(0.85, innerScale));
    const glyphSize = Math.round(sqSize * clampedScale);
    const offset = ((targetSize - glyphSize) / 2).toFixed(2);
    const alphaVal = (Math.max(0.1, Math.min(1.0, opacity / 100))).toFixed(2);

    const borderStroke = borderWidth > 0
        ? `stroke="${borderHex}" stroke-width="${borderWidth}" stroke-opacity="0.35"`
        : '';

    let filterDef = '';
    let filterAttr = '';

    if (paletteMode === 'accent' || paletteMode === 'adaptive') {
        const fgRgb = (colors && colors.fgRgb) ? colors.fgRgb : [134, 178, 232];
        const bgRgb = (colors && colors.bgRgb) ? colors.bgRgb : [30, 49, 71];
        const rFg = (fgRgb[0] / 255).toFixed(3);
        const gFg = (fgRgb[1] / 255).toFixed(3);
        const bFg = (fgRgb[2] / 255).toFixed(3);
        const rBg = (bgRgb[0] / 255 * 0.25).toFixed(3);
        const gBg = (bgRgb[1] / 255 * 0.25).toFixed(3);
        const bBg = (bgRgb[2] / 255 * 0.25).toFixed(3);

        filterDef = `
  <defs>
    <filter id="accent-tint" color-interpolation-filters="sRGB">
      <feColorMatrix type="matrix"
        values="0.299 0.587 0.114 0 0
                0.299 0.587 0.114 0 0
                0.299 0.587 0.114 0 0
                0     0     0     1 0" result="lum" />
      <feColorMatrix type="matrix" in="lum"
        values="${rFg} 0 0 0 ${rBg}
                ${gFg} 0 0 0 ${gBg}
                ${bFg} 0 0 0 ${bBg}
                0 0 0 1 0" />
    </filter>
  </defs>`;
        filterAttr = 'filter="url(#accent-tint)"';
    }

    const vbAttr = `${minX} ${minY} ${origW} ${origH}`;

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg ${nsAttributes} viewBox="0 0 ${targetSize} ${targetSize}" width="${targetSize}" height="${targetSize}">
  ${filterDef}
  <rect x="${pad}" y="${pad}" width="${sqSize}" height="${sqSize}" rx="${cornerRadius}" fill="${bgHex}" fill-opacity="${alphaVal}" ${borderStroke} />
  <g ${filterAttr}>
    <svg x="${offset}" y="${offset}" width="${glyphSize}" height="${glyphSize}" viewBox="${vbAttr}">
      ${innerContent}
    </svg>
  </g>
</svg>
`;
}

/**
 * Paints a GdkPixbuf cleanly onto a Cairo Context using pure Cairo ImageSurface.
 * Avoids any dependency on Gdk.cairo_set_source_pixbuf in the GNOME Shell process.
 */
function paintPixbufToCairo(cr, pixbuf, x, y) {
    if (!cr || !pixbuf) return;
    const tmpPath = GLib.build_filenamev([GLib.get_tmp_dir(), `_adwita_pb_${GLib.random_int()}.png`]);
    try {
        pixbuf.savev(tmpPath, 'png', [], []);
        const surf = cairo.ImageSurface.createFromPNG(tmpPath);
        cr.setSourceSurface(surf, x, y);
        cr.paint();
    } catch (e) {
        console.warn('Failed to paint pixbuf onto Cairo context:', e);
    } finally {
        try { GLib.unlink(tmpPath); } catch (_) {}
    }
}

/**
 * Creates and renders a true high-fidelity squircle icon for raster PNG applications using Cairo.
 * Preserves 100% alpha transparency and antialiased edges without harsh pixelation.
 */
export function renderSquircleIcon(srcImagePath, options = {}) {
    const {
        cornerRadius = 24,
        borderWidth = 1,
        opacity = 100,
        innerScale = 0.68,
        accentHex = '#3584e4',
        paletteMode = 'accent',
        targetSize = 128,
        colors = null,
    } = options;

    let srcPb = null;
    try {
        if (srcImagePath.endsWith('.svg')) {
            srcPb = GdkPixbuf.Pixbuf.new_from_file_at_scale(srcImagePath, targetSize * 2, targetSize * 2, true);
        } else {
            srcPb = GdkPixbuf.Pixbuf.new_from_file(srcImagePath);
        }
    } catch (_) {
        return null;
    }

    if (!srcPb) return null;

    let bgR = 37, bgG = 32, bgB = 53;
    let fgR = 216, fgG = 228, fgB = 248;

    if (colors && colors.bgRgb && colors.fgRgb) {
        [bgR, bgG, bgB] = colors.bgRgb;
        [fgR, fgG, fgB] = colors.fgRgb;
    } else {
        const c = sampleColors(srcImagePath, paletteMode, accentHex);
        [bgR, bgG, bgB] = c.bgRgb;
        [fgR, fgG, fgB] = c.fgRgb;
    }

    const surface = new cairo.ImageSurface(cairo.Format.ARGB32, targetSize, targetSize);
    const cr = new cairo.Context(surface);

    const pad = Math.max(2, Math.round(targetSize * 0.035));
    const sqSize = targetSize - pad * 2;
    const alphaVal = Math.max(0.1, Math.min(1.0, opacity / 100));

    // 1. I draw the squircle background
    const scaledCorner = Math.round(cornerRadius * (targetSize / 128));
    drawSquircle(cr, pad, pad, sqSize, sqSize, scaledCorner);
    cr.setSourceRGBA(bgR / 255, bgG / 255, bgB / 255, alphaVal);
    cr.fillPreserve();

    if (borderWidth > 0) {
        const scaledBorder = Math.max(1, Math.round(borderWidth * (targetSize / 128)));
        cr.setSourceRGBA(fgR / 255, fgG / 255, fgB / 255, 0.35);
        cr.setLineWidth(scaledBorder);
        cr.stroke();
    } else {
        cr.newPath();
    }

    // 2. I render the icon inside
    const clampedScale = Math.max(0.45, Math.min(0.85, innerScale));
    const glyphSize = Math.round(sqSize * clampedScale);
    const glyphOffset = Math.round((targetSize - glyphSize) / 2);

    // I scale the original pixbuf cleanly to target glyphSize with Bilinear filtering
    const scaledSrc = srcPb.scale_simple(glyphSize, glyphSize, GdkPixbuf.InterpType.BILINEAR);
    if (!scaledSrc) return surface;

    if (paletteMode === 'colored') {
        paintPixbufToCairo(cr, scaledSrc, glyphOffset, glyphOffset);
        return surface;
    }

    // Tinted mode (accent or adaptive): I apply smooth luminance mapping preserving 100% alpha & antialiasing
    const w = scaledSrc.get_width();
    const h = scaledSrc.get_height();
    const nChannels = scaledSrc.get_n_channels();
    const stride = scaledSrc.get_rowstride();
    const pixels = scaledSrc.get_pixels();

    const cornerA = nChannels === 4 ? pixels[3] : 255;
    const cornerR = pixels[0];
    const cornerG = pixels[1];
    const cornerB = pixels[2];
    const hasSolidBg = cornerA > 220;

    const glyphArr = new Uint8Array(w * h * 4);

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const srcIdx = y * stride + x * nChannels;
            const dstIdx = (y * w + x) * 4;
            const r = pixels[srcIdx];
            const g = pixels[srcIdx + 1];
            const b = pixels[srcIdx + 2];
            let a = nChannels === 4 ? pixels[srcIdx + 3] : 255;

            if (hasSolidBg) {
                const dr = r - cornerR;
                const dg = g - cornerG;
                const db = b - cornerB;
                const dist = Math.sqrt(dr * dr + dg * dg + db * db);
                if (dist < 28) {
                    a = 0;
                } else if (dist < 45) {
                    a = Math.round(a * ((dist - 28) / 17));
                }
            }

            if (a <= 5) {
                glyphArr[dstIdx + 3] = 0;
                continue;
            }

            // I compute perceptual luminance (ITU-R BT.601)
            const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

            // I use continuous smooth mapping without hard threshold cuts
            const rOut = Math.round(bgR * 0.25 * (1 - lum) + fgR * lum);
            const gOut = Math.round(bgG * 0.25 * (1 - lum) + fgG * lum);
            const bOut = Math.round(bgB * 0.25 * (1 - lum) + fgB * lum);

            glyphArr[dstIdx] = Math.min(255, Math.max(0, rOut));
            glyphArr[dstIdx + 1] = Math.min(255, Math.max(0, gOut));
            glyphArr[dstIdx + 2] = Math.min(255, Math.max(0, bOut));
            glyphArr[dstIdx + 3] = a;
        }
    }

    try {
        const glyphPb = GdkPixbuf.Pixbuf.new_from_bytes(
            new GLib.Bytes(glyphArr),
            GdkPixbuf.Colorspace.RGB,
            true,
            8,
            w,
            h,
            w * 4
        );
        paintPixbufToCairo(cr, glyphPb, glyphOffset, glyphOffset);
    } catch (_) {}

    return surface;
}

/**
 * Generates a real-time live preview paintable (Gdk.Texture) for an app icon.
 * Reflects exact squircle geometry, inner scale, palette mode, and accent colors.
 */
export function generatePreviewIconPaintable(app, options = {}) {
    const Gdk = options.Gdk || null;
    if (!Gdk) return null;

    const {
        cornerRadius = 24,
        borderWidth = 1,
        opacity = 100,
        innerScale = 0.68,
        accentColor = 'blue',
        paletteMode = 'accent',
        forceIconShape = true,
        targetSize = 128,
        isDark = true,
    } = options;

    let appImageFile = null;
    let symbolicSvg = null;
    let labileSvg = null;

    const iconNames = Array.isArray(app.icons) ? app.icons : [app.icon || app.rawIcon || app.baseName];
    for (const name of iconNames) {
        if (!name) continue;
        if (!appImageFile) appImageFile = findIconFile(name);
        if (!symbolicSvg) symbolicSvg = findSymbolicIcon(name);
        if (!labileSvg) labileSvg = findLabileIcon(name);
    }

    if (!forceIconShape) {
        if (appImageFile) {
            try {
                return Gdk.Texture.new_from_file(Gio.File.new_for_path(appImageFile));
            } catch (_) {}
        }
        return null;
    }

    const accentPreset = ACCENT_PRESETS[accentColor] || ACCENT_PRESETS.blue;
    const accentHex = accentPreset.hex;

    let normalIcon = null;
    if (paletteMode === 'colored') {
        normalIcon = appImageFile;
        if (!normalIcon) {
            symbolicSvg = symbolicSvg || findSymbolicIcon(iconNames[0]);
        }
    } else {
        normalIcon = (!symbolicSvg && !labileSvg) ? appImageFile : null;
    }

    const colors = sampleColors(appImageFile || normalIcon || labileSvg || symbolicSvg, paletteMode, accentHex);

    let svgStr = null;

    if (normalIcon && normalIcon.endsWith('.svg')) {
        svgStr = wrapAppSvg(normalIcon, {
            cornerRadius,
            borderWidth,
            bgHex: colors.bgHex,
            borderHex: colors.borderHex,
            fgHex: colors.fgHex,
            opacity,
            innerScale,
            paletteMode,
            colors,
        });
    } else if (normalIcon && !normalIcon.endsWith('.svg')) {
        try {
            const [ok, bytes] = GLib.file_get_contents(normalIcon);
            if (ok && bytes) {
                const b64 = GLib.base64_encode(bytes);
                const pad = 4;
                const sqSize = 128 - pad * 2;
                const innerSize = sqSize * innerScale;
                const offset = (128 - innerSize) / 2;
                const alphaVal = (Math.max(0.0, Math.min(1.0, opacity / 100))).toFixed(2);
                const fillVal = opacity === 0 ? 'transparent' : colors.bgHex;
                const borderStroke = borderWidth > 0
                    ? `stroke="${colors.borderHex}" stroke-width="${borderWidth}" stroke-opacity="0.35"`
                    : '';
                svgStr = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 128 128" width="128" height="128">
  <rect x="${pad}" y="${pad}" width="${sqSize}" height="${sqSize}" rx="${cornerRadius}" fill="${fillVal}" fill-opacity="${alphaVal}" ${borderStroke} />
  <image href="data:image/png;base64,${b64}" x="${offset.toFixed(1)}" y="${offset.toFixed(1)}" width="${innerSize.toFixed(1)}" height="${innerSize.toFixed(1)}" />
</svg>`;
            }
        } catch (_) {}
    } else if (symbolicSvg) {
        svgStr = wrapSymbolicSvg(symbolicSvg, {
            cornerRadius,
            borderWidth,
            bgHex: colors.bgHex,
            borderHex: colors.borderHex,
            fgHex: colors.fgHex,
            opacity,
            innerScale,
        });
    } else if (labileSvg) {
        svgStr = wrapLabileSvg(labileSvg, {
            cornerRadius,
            borderWidth,
            bgHex: colors.bgHex,
            borderHex: colors.borderHex,
            fgHex: colors.fgHex,
            opacity,
            innerScale,
        });
    }

    if (svgStr) {
        try {
            const bytes = GLib.Bytes.new(new TextEncoder().encode(svgStr));
            return Gdk.Texture.new_from_bytes(bytes);
        } catch (e) {
            console.warn('[adwita-square] Error creating texture from preview SVG:', e);
        }
    }

    return null;
}

// ============================================================================
// SECTION: Icon Theme Generation Orchestrator
// I asynchronously generate the complete unified squircle icon theme in idle chunks
// for all discovered applications, supporting SVG vector wrapping and PNG raster fallbacks.
// ============================================================================
/**
 * Asynchronously generates the unified two-tone icon theme in small chunks.
 */
export function generateFullIconThemeChunked(options = {}, onProgress = null, onComplete = null) {
    const {
        cornerRadius = 24,
        borderWidth = 1,
        opacity = 100,
        innerScale = 0.68,
        accentColor = 'blue',
        paletteMode = 'accent',
    } = options;

    const accentPreset = ACCENT_PRESETS[accentColor] || ACCENT_PRESETS.blue;
    const accentHex = accentPreset.hex;

    const themeDir = getIconThemeDir();
    const xdgDir = getXdgIconThemeDir();

    const subDirs = [
        themeDir,
        GLib.build_filenamev([themeDir, 'apps']),
        GLib.build_filenamev([themeDir, 'apps', 'scalable']),
        GLib.build_filenamev([themeDir, 'apps', '256x256']),
        GLib.build_filenamev([themeDir, 'apps', '128x128']),
        GLib.build_filenamev([themeDir, 'apps', '48x48']),
    ];

    for (const d of subDirs) {
        try {
            Gio.File.new_for_path(d).make_directory_with_parents(null);
        } catch (_) {}
    }

    const dirScalable = GLib.build_filenamev([themeDir, 'apps', 'scalable']);
    const dir256 = GLib.build_filenamev([themeDir, 'apps', '256x256']);
    const dir128 = GLib.build_filenamev([themeDir, 'apps', '128x128']);
    const dir48 = GLib.build_filenamev([themeDir, 'apps', '48x48']);

    const clearDir = (dirPath) => {
        try {
            const dir = Gio.File.new_for_path(dirPath);
            const enumerator = dir.enumerate_children('standard::name', Gio.FileQueryInfoFlags.NONE, null);
            let info;
            while ((info = enumerator.next_file(null)) !== null) {
                const child = dir.get_child(info.get_name());
                try { child.delete(null); } catch (_) {}
            }
        } catch (_) {}
    };

    clearDir(dirScalable);
    clearDir(dir256);
    clearDir(dir128);
    clearDir(dir48);

    const indexThemeContent = `[Icon Theme]
Name=${ICON_THEME_NAME}
Comment=Adwita Square Hybrid Icon Theme based on Adwaita with custom squircle geometry
Inherits=MoreWaita,Papirus,Papirus-Dark,Adwaita,AdwaitaLegacy,hicolor
Example=folder

Directories=apps/scalable,apps/256x256,apps/128x128,apps/48x48

[apps/scalable]
Size=128
Type=Scalable
MinSize=16
MaxSize=512

[apps/256x256]
Size=256
Type=Fixed

[apps/128x128]
Size=128
Type=Fixed

[apps/48x48]
Size=48
Type=Fixed
`;

    const indexFile = GLib.build_filenamev([themeDir, 'index.theme']);
    GLib.file_set_contents(indexFile, indexThemeContent);

    try {
        const xdgParent = GLib.build_filenamev([GLib.get_home_dir(), '.local', 'share', 'icons']);
        Gio.File.new_for_path(xdgParent).make_directory_with_parents(null);
        if (!GLib.file_test(xdgDir, GLib.FileTest.EXISTS)) {
            const targetFile = Gio.File.new_for_path(xdgDir);
            targetFile.make_symbolic_link(themeDir, null);
        }
    } catch (_) {}

    const appList = getInstalledAppIcons();
    const total = appList.length;
    let currentIndex = 0;
    let generatedCount = 0;

    const batchSize = 6;

    const tick = () => {
        const end = Math.min(total, currentIndex + batchSize);
        for (; currentIndex < end; currentIndex++) {
            const app = appList[currentIndex];

            // If the desktop entry specifies an absolute path for Icon=,
            // GNOME Shell ignores any icon theme and loads that raw file directly.
            // I create a user override in ~/.local/share/applications with Icon=<baseName>
            if (app.rawIcon && app.rawIcon.startsWith('/') && app.desktopPath) {
                try {
                    const localAppsDir = GLib.build_filenamev([GLib.get_home_dir(), '.local', 'share', 'applications']);
                    Gio.File.new_for_path(localAppsDir).make_directory_with_parents(null);
                    const desktopBasename = GLib.path_get_basename(app.desktopPath);
                    const localDesktopPath = GLib.build_filenamev([localAppsDir, desktopBasename]);

                    const [ok, content] = GLib.file_get_contents(app.desktopPath);
                    if (ok && content) {
                        const decoder = new TextDecoder('utf-8');
                        let text = decoder.decode(content);
                        text = text.replace(/^Icon=.*$/m, `Icon=${app.baseName}`);
                        GLib.file_set_contents(localDesktopPath, text);
                    }
                } catch (_) {}
            }

            // I look up the authentic application image file to sample dominant colors
            const appImageFile = findIconFile(app.rawIcon) || findIconFile(app.baseName);

            let normalIcon = null;
            let symbolicSvg = null;
            let labileSvg = null;

            if (paletteMode === 'colored') {
                // In colored mode, I prioritize authentic multicolor vector or raster icons
                normalIcon = appImageFile;
                if (!normalIcon) {
                    symbolicSvg = findSymbolicIcon(app.baseName, app.rawIcon);
                    if (!symbolicSvg) {
                        labileSvg = findLabileIcon(app.baseName, app.rawIcon);
                    }
                }
            } else {
                // In two-tone modes ('accent' and 'adaptive'):
                // I prioritize clean vector glyphs (symbolic / labile) for true two-tone elegance,
                // falling back to tone-mapped authentic vector or raster icons.
                symbolicSvg = findSymbolicIcon(app.baseName, app.rawIcon);
                labileSvg = !symbolicSvg ? findLabileIcon(app.baseName, app.rawIcon) : null;
                normalIcon = (!symbolicSvg && !labileSvg) ? appImageFile : null;
            }

            const colors = sampleColors(appImageFile || normalIcon || labileSvg || symbolicSvg, paletteMode, accentHex);
            let handledAsSvg = false;

            // 1. When I have an authentic Application Vector SVG -> I keep 100% vector sharpness!
            if (normalIcon && normalIcon.endsWith('.svg')) {
                const wrapped = wrapAppSvg(normalIcon, {
                    cornerRadius,
                    borderWidth,
                    bgHex: colors.bgHex,
                    borderHex: colors.borderHex,
                    fgHex: colors.fgHex,
                    opacity,
                    innerScale,
                    paletteMode,
                    colors,
                });
                if (wrapped) {
                    const outSvg = GLib.build_filenamev([dirScalable, `${app.baseName}.svg`]);
                    GLib.file_set_contents(outSvg, wrapped);
                    generatedCount++;
                    handledAsSvg = true;

                    if (app.rawIcon && app.rawIcon !== app.baseName && !app.rawIcon.startsWith('/')) {
                        const rawClean = app.rawIcon.replace(/-symbolic$/, '').replace(/\.(png|svg)$/, '');
                        if (rawClean && rawClean !== app.baseName) {
                            const rawSvg = GLib.build_filenamev([dirScalable, `${rawClean}.svg`]);
                            try { GLib.file_set_contents(rawSvg, wrapped); } catch (_) {}
                        }
                    }
                }
            } else if (normalIcon) {
                // 2. When I have an authentic Application Raster PNG -> I render at dedicated crisp sizes (256, 128, 48)
                try {
                    const renderAndSave = (size, targetDir) => {
                        const surface = renderSquircleIcon(normalIcon, {
                            cornerRadius: Math.round(cornerRadius * (size / 128)),
                            borderWidth: Math.max(1, Math.round(borderWidth * (size / 128))),
                            opacity,
                            innerScale,
                            accentHex,
                            paletteMode,
                            targetSize: size,
                            colors,
                        });
                        if (surface) {
                            const outPath = GLib.build_filenamev([targetDir, `${app.baseName}.png`]);
                            surface.writeToPNG(outPath);

                            if (app.rawIcon && app.rawIcon !== app.baseName && !app.rawIcon.startsWith('/')) {
                                const rawClean = app.rawIcon.replace(/-symbolic$/, '').replace(/\.(png|svg)$/, '');
                                if (rawClean && rawClean !== app.baseName) {
                                    const rawPath = GLib.build_filenamev([targetDir, `${rawClean}.png`]);
                                    try { surface.writeToPNG(rawPath); } catch (_) {}
                                }
                            }
                            return true;
                        }
                        return false;
                    };

                    const ok256 = renderAndSave(256, dir256);
                    const ok128 = renderAndSave(128, dir128);
                    renderAndSave(48, dir48);

                    if (ok256 || ok128) {
                        generatedCount++;
                        handledAsSvg = true;
                    }
                } catch (_) {}
            }

            // 3. Fallback: I generate from Symbolic SVG
            if (!handledAsSvg && symbolicSvg) {
                const wrapped = wrapSymbolicSvg(symbolicSvg, {
                    cornerRadius,
                    borderWidth,
                    bgHex: colors.bgHex,
                    borderHex: colors.borderHex,
                    fgHex: colors.fgHex,
                    opacity,
                    innerScale,
                });
                if (wrapped) {
                    const outSvg = GLib.build_filenamev([dirScalable, `${app.baseName}.svg`]);
                    GLib.file_set_contents(outSvg, wrapped);
                    generatedCount++;
                    handledAsSvg = true;

                    if (app.rawIcon && app.rawIcon !== app.baseName && !app.rawIcon.startsWith('/')) {
                        const rawClean = app.rawIcon.replace(/-symbolic$/, '').replace(/\.(png|svg)$/, '');
                        if (rawClean && rawClean !== app.baseName) {
                            const rawSvg = GLib.build_filenamev([dirScalable, `${rawClean}.svg`]);
                            try { GLib.file_set_contents(rawSvg, wrapped); } catch (_) {}
                        }
                    }
                }
            } else if (!handledAsSvg && labileSvg) {
                // 4. Fallback: I generate from Labile 2-tone SVG
                const wrapped = wrapLabileSvg(labileSvg, {
                    cornerRadius,
                    borderWidth,
                    bgHex: colors.bgHex,
                    borderHex: colors.borderHex,
                    fgHex: colors.fgHex,
                    opacity,
                    innerScale,
                });
                if (wrapped) {
                    const outSvg = GLib.build_filenamev([dirScalable, `${app.baseName}.svg`]);
                    GLib.file_set_contents(outSvg, wrapped);
                    generatedCount++;
                    handledAsSvg = true;

                    if (app.rawIcon && app.rawIcon !== app.baseName && !app.rawIcon.startsWith('/')) {
                        const rawClean = app.rawIcon.replace(/-symbolic$/, '').replace(/\.(png|svg)$/, '');
                        if (rawClean && rawClean !== app.baseName) {
                            const rawSvg = GLib.build_filenamev([dirScalable, `${rawClean}.svg`]);
                            try { GLib.file_set_contents(rawSvg, wrapped); } catch (_) {}
                        }
                    }
                }
            }

            if (typeof onProgress === 'function') {
                onProgress(currentIndex + 1, total, app.appName);
            }
        }

        if (currentIndex < total) {
            return GLib.SOURCE_CONTINUE;
        }

        try {
            GLib.spawn_command_line_async(`gtk-update-icon-cache -f -t "${themeDir}"`);
            const localAppsDir = GLib.build_filenamev([GLib.get_home_dir(), '.local', 'share', 'applications']);
            GLib.spawn_command_line_async(`update-desktop-database "${localAppsDir}"`);
        } catch (_) {}

        if (typeof onComplete === 'function') {
            onComplete({
                success: true,
                generatedCount,
                totalApps: total,
                themeDir,
            });
        }
        return GLib.SOURCE_REMOVE;
    };

    GLib.timeout_add(GLib.PRIORITY_DEFAULT_IDLE, 5, tick);
}


/**
 * Sets 'adwita-square' as the current icon theme in GNOME interface settings.
 */
export function applyIconTheme() {
    try {
        const settings = new Gio.Settings({ schema_id: 'org.gnome.desktop.interface' });
        settings.set_string('icon-theme', ICON_THEME_NAME);
        return true;
    } catch (e) {
        console.error('Failed to set icon-theme to adwita-square:', e);
        return false;
    }
}
