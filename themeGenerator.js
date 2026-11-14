/*
 * Adwita Square - GTK Theme Generator
 * Square GTK theme based on Adwaita.
 *
 * Copyright (C) 2024-2026 g-mobile.eu
 * Based on Adwaita / Libadwaita stylesheets.
 * Original Adwaita copyright (C) 2014-2024 GNOME Project and contributors:
 * Jakub Steiner, Lapo Calamandrei, William Jon McCann, Allan Day, Alexander Larsson, and others.
 *
 * Licensed under the GNU Lesser General Public License version 2.1 or later (LGPL-2.1-or-later).
 * See LICENSE file for details.
 */

import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import GdkPixbuf from 'gi://GdkPixbuf';

export const START_MARKER = '/* Adwita Square Extension Start */';
export const END_MARKER = '/* Adwita Square Extension End */';
export const OLDWAITA_START_MARKER = '/* Oldwaita Adwaita Extension Start */';
export const OLDWAITA_END_MARKER = '/* Oldwaita Adwaita Extension End */';
export const LEGACY_START_MARKER = '/* Oldwaita Classic Zukitwo Extension Start */';
export const LEGACY_END_MARKER = '/* Oldwaita Classic Zukitwo Extension End */';

export const ACCENT_PRESETS = {
    blue: { name: 'Blue', hex: '#3584e4' },
    teal: { name: 'Teal', hex: '#2190a4' },
    green: { name: 'Green', hex: '#3a944a' },
    yellow: { name: 'Yellow', hex: '#c88800' },
    orange: { name: 'Orange', hex: '#ed5b00' },
    red: { name: 'Red', hex: '#e01b24' },
    pink: { name: 'Pink', hex: '#d56199' },
    purple: { name: 'Purple', hex: '#9141ac' },
    slate: { name: 'Slate', hex: '#6f8396' },
};

// =========================================================================
// SECTION: Color Utilities & Palette Calculations
// =========================================================================

export function hexToRgb(hex) {
    let cleanHex = hex.replace('#', '');
    if (cleanHex.length === 3) {
        cleanHex = cleanHex.split('').map(c => c + c).join('');
    }
    const num = parseInt(cleanHex, 16);
    return {
        r: (num >> 16) & 255,
        g: (num >> 8) & 255,
        b: num & 255,
    };
}

export function hexToRgba(hex, alpha) {
    const { r, g, b } = hexToRgb(hex);
    return `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(2)})`;
}

export function adjustBrightness(hex, factor) {
    const { r, g, b } = hexToRgb(hex);
    const clamp = val => Math.min(255, Math.max(0, Math.round(val)));
    const nr = clamp(factor >= 0 ? r + (255 - r) * factor : r * (1 + factor));
    const ng = clamp(factor >= 0 ? g + (255 - g) * factor : g * (1 + factor));
    const nb = clamp(factor >= 0 ? b + (255 - b) * factor : b * (1 + factor));
    const toHex = c => c.toString(16).padStart(2, '0');
    return `#${toHex(nr)}${toHex(ng)}${toHex(nb)}`;
}

export function mixColors(hex1, hex2, weightPercent, alpha = 1.0) {
    const w1 = Math.max(0, Math.min(100, weightPercent)) / 100;
    const w2 = 1.0 - w1;
    const rgb1 = hexToRgb(hex1);
    const rgb2 = hexToRgb(hex2);
    const r = Math.round(rgb1.r * w1 + rgb2.r * w2);
    const g = Math.round(rgb1.g * w1 + rgb2.g * w2);
    const b = Math.round(rgb1.b * w1 + rgb2.b * w2);
    if (alpha !== undefined && alpha < 1.0) {
        if (alpha <= 0) return 'transparent';
        return `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(2)})`;
    }
    const toHex = c => c.toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
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
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
        }
        h *= 360;
    }
    return { h, s, l };
}

// =========================================================================
// SECTION: Wallpaper Accent Extraction
// =========================================================================

export function getWallpaperPath(isDark = false) {
    try {
        const bgSettings = new Gio.Settings({ schema_id: 'org.gnome.desktop.background' });
        let uri = isDark
            ? (bgSettings.get_string('picture-uri-dark') || bgSettings.get_string('picture-uri'))
            : bgSettings.get_string('picture-uri');

        if (!uri) return null;
        let file = Gio.File.new_for_uri(uri);
        let path = file.get_path();
        if (!path || !GLib.file_test(path, GLib.FileTest.EXISTS)) {
            if (isDark) {
                uri = bgSettings.get_string('picture-uri');
                if (uri) {
                    file = Gio.File.new_for_uri(uri);
                    path = file.get_path();
                }
            }
        }
        if (!path || !GLib.file_test(path, GLib.FileTest.EXISTS)) return null;

        // I inspect if it's a GNOME dynamic XML slideshow wallpaper
        if (path.endsWith('.xml')) {
            try {
                const [ok, bytes] = GLib.file_get_contents(path);
                if (ok) {
                    const xmlStr = new TextDecoder().decode(bytes);
                    const match = xmlStr.match(/<filename>(.*?)<\/filename>/) || xmlStr.match(/<file>(.*?)<\/file>/);
                    if (match && match[1]) {
                        const subPath = match[1].trim();
                        if (GLib.file_test(subPath, GLib.FileTest.EXISTS)) {
                            path = subPath;
                        }
                    }
                }
            } catch (_) {}
        }
        return path;
    } catch (_) {
        return null;
    }
}

let _wallpaperAccentCache = {
    key: '',
    winner: 'blue',
};

export function extractAccentFromWallpaper(isDark = false) {
    const path = getWallpaperPath(isDark);
    if (!path) return 'blue';

    try {
        let mtime = 0;
        try {
            const file = Gio.File.new_for_path(path);
            const info = file.query_info('time::modified', Gio.FileQueryInfoFlags.NONE, null);
            mtime = info.get_attribute_uint64('time::modified');
        } catch (_) {}

        const cacheKey = `${path}:${mtime}:${isDark}`;
        if (_wallpaperAccentCache.key === cacheKey) {
            return _wallpaperAccentCache.winner;
        }

        const pixbuf = GdkPixbuf.Pixbuf.new_from_file_at_scale(path, 32, 32, false);
        const pixels = pixbuf.get_pixels();
        const nChannels = pixbuf.get_n_channels();
        const rowstride = pixbuf.get_rowstride();
        const width = pixbuf.get_width();
        const height = pixbuf.get_height();

        const PRESET_HUES = {
            blue: 213,
            teal: 189,
            green: 131,
            yellow: 41,
            orange: 23,
            red: 357,
            pink: 331,
            purple: 285,
        };

        const scores = {
            blue: 0,
            teal: 0,
            green: 0,
            yellow: 0,
            orange: 0,
            red: 0,
            pink: 0,
            purple: 0,
            slate: 0,
        };

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const offset = y * rowstride + x * nChannels;
                const r = pixels[offset];
                const g = pixels[offset + 1];
                const b = pixels[offset + 2];
                const hsl = rgbToHsl(r, g, b);

                // I ignore near-black or near-white pixels
                if (hsl.l < 0.08 || hsl.l > 0.92) continue;

                // Neutral / low-saturation colors vote for slate
                if (hsl.s < 0.16) {
                    scores.slate += (1.0 - hsl.s) * 0.45;
                    continue;
                }

                // Vibrant pixel: I find closest preset hue
                let closestKey = 'blue';
                let minDiff = 360;
                for (const [key, hue] of Object.entries(PRESET_HUES)) {
                    let diff = Math.abs(hsl.h - hue);
                    if (diff > 180) diff = 360 - diff;
                    if (diff < minDiff) {
                        minDiff = diff;
                        closestKey = key;
                    }
                }

                const weight = hsl.s * (1 - Math.abs(hsl.l - 0.5));
                scores[closestKey] += weight;
            }
        }

        let winner = 'blue';
        let maxScore = -1;
        for (const [key, score] of Object.entries(scores)) {
            if (score > maxScore) {
                maxScore = score;
                winner = key;
            }
        }
        _wallpaperAccentCache = {
            key: cacheKey,
            winner,
        };
        return winner;
    } catch (e) {
        console.warn('extractAccentFromWallpaper error:', e);
        return 'blue';
    }
}

// =========================================================================
// SECTION: GTK3 & GTK4 Theme Stylesheet Generator
// =========================================================================

export function generateAdwitaSquareCss(options) {
    const isDark = options.variant === 'dark';
    const accentPreset = ACCENT_PRESETS[options.accentColor] || ACCENT_PRESETS.blue;
    const accentHex = accentPreset.hex;
    // Inverted transparency: 0 = opaque (opacity 1.0), 100 = fully transparent (0.0)
    const transparency = Math.max(0, Math.min(100, options.opacity !== undefined ? options.opacity : 0));
    const opacityVal = (1.0 - (transparency / 100)).toFixed(2);
    const isTransparent = transparency > 0;
    const blurVal = Math.max(0, Math.min(50, options.blur !== undefined ? options.blur : 0));
    const accentStrength = Math.max(0, Math.min(100, options.accentStrength ?? 15));
    const cornerVal = Math.max(0, Math.min(20, options.cornerRadius !== undefined ? options.cornerRadius : 3));
    const btnSize = Math.max(20, Math.min(48, options.buttonSize ?? 24));
    const btnInnerW = btnSize - 2;
    const closeInnerSize = btnSize - 2;
    // Half heights: I split the button into maximize and minimize components
    const topOuterH = Math.floor(btnSize / 2);
    const bottomOuterH = btnSize - topOuterH;
    const topH = Math.max(1, topOuterH - 2); // top border 1px + bottom border 1px
    const bottomH = Math.max(1, bottomOuterH - 2); // top border 1px + bottom border 1px
    const restCenterY = Math.round(bottomOuterH / 2);
    // I calculate proportional, sharp icon sizing across all button sizes
    const smallIconSize = Math.max(9, Math.min(22, topOuterH - 3));
    const restIconSize = Math.max(14, Math.min(24, Math.round(btnSize * 0.42)));
    const controlsGap = 6;
    const enableControlButtons = options.controlButtons ?? false;
    const iconBtnSize = Math.max(24, Math.min(28, Math.min(btnSize, 28)));
    const vMargin = 2;
    const btnMarginV = 3;
    const baseHeaderH = 41;
    const vDiff = Math.max(0, baseHeaderH - btnSize);
    const vTop = Math.floor(vDiff / 2);
    const vBottom = vDiff - vTop;

    // Adwaita Base Colors for Windows, Headerbars and Sidebar
    const windowBaseHex = isDark ? '#000000' : '#fafafa';
    const viewBaseHex = isDark ? '#000000' : '#ffffff';
    // Top bar: White in light mode, Black in dark mode
    const headerBaseHex = isDark ? '#000000' : '#ffffff';
    const sidebarBaseHex = isDark ? '#1e1e1e' : '#f0f0f0';

    // Text & Button Colors: Dark = white font (#ffffff), Light = black font (#000000)
    // Secondary text (dim, subtitles): Dark = light grey (#c0bfbc), Light = dark grey (#4a4a4a)
    const textFg = isDark ? '#ffffff' : '#000000';
    const textSecondary = isDark ? '#c0bfbc' : '#4a4a4a';
    const btnFg = isDark ? '#ffffff' : '#000000';
    const borderColor = isDark ? 'rgba(255, 255, 255, 0.16)' : 'rgba(0, 0, 0, 0.18)';
    const headerBorder = isDark ? 'rgba(255, 255, 255, 0.10)' : 'rgba(0, 0, 0, 0.10)';

    const cardBaseHex = isDark ? 'rgba(255, 255, 255, 0.08)' : '#ffffff';
    const cardBorderColor = isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)';

    const btnBorderColor = isDark ? 'rgba(255, 255, 255, 0.14)' : 'rgba(0, 0, 0, 0.16)';
    const btnBgColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)';
    const btnHoverBorderColor = isDark ? 'rgba(255, 255, 255, 0.24)' : 'rgba(0, 0, 0, 0.26)';
    const btnHoverBgColor = isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.10)';
    const btnActiveBorderColor = isDark ? 'rgba(255, 255, 255, 0.32)' : 'rgba(0, 0, 0, 0.34)';
    const btnActiveBgColor = isDark ? 'rgba(255, 255, 255, 0.22)' : 'rgba(0, 0, 0, 0.16)';

    const headerBgCss = headerBaseHex;
    const sidebarBaseCss = transparency === 0
        ? sidebarBaseHex
        : (transparency === 100 ? 'transparent' : hexToRgba(sidebarBaseHex, parseFloat(opacityVal)));

    const accentColorWithAlpha = transparency === 0
        ? accentHex
        : (transparency === 100 ? 'transparent' : hexToRgba(accentHex, parseFloat(opacityVal)));
    const sidebarBgCss = accentStrength > 0
        ? (transparency === 100
            ? 'transparent'
            : `color-mix(in srgb, ${accentColorWithAlpha} ${accentStrength}%, ${sidebarBaseCss})`)
        : sidebarBaseCss;

    const accentDark = adjustBrightness(accentHex, -0.15);
    const accentDarker = adjustBrightness(accentHex, -0.25);

    return `
${START_MARKER}
/*
 * Adwita Square GTK Theme
 * Square GTK theme based on Adwaita.
 *
 * Copyright (C) 2024-2026 g-mobile.eu
 * Original Adwaita theme copyright (C) 2014-2024 The GNOME Project contributors:
 * Jakub Steiner, Lapo Calamandrei, William Jon McCann, Allan Day, Alexander Larsson, and others.
 *
 * Licensed under the GNU Lesser General Public License, version 2.1 or later (LGPL-2.1+).
 * Mode: ${isDark ? 'Dark' : 'Light'} | Accent: ${accentPreset.name} (${accentHex}) | Corner: ${cornerVal}px
 */

@define-color accent_color ${accentHex};
@define-color accent_bg_color ${accentHex};
@define-color accent_fg_color #ffffff;

@define-color window_bg_color ${windowBaseHex};
@define-color window_fg_color ${textFg};
@define-color view_bg_color ${viewBaseHex};
@define-color view_fg_color ${textFg};
@define-color headerbar_bg_color ${headerBgCss};
@define-color headerbar_fg_color ${textFg};
@define-color headerbar_backdrop_color ${headerBgCss};
@define-color headerbar_shade_color transparent;
@define-color headerbar_darker_shade_color transparent;

@define-color sidebar_bg_color ${sidebarBgCss};
@define-color sidebar_fg_color #ffffff;
@define-color sidebar_backdrop_color ${sidebarBgCss};
@define-color secondary_sidebar_bg_color ${sidebarBgCss};
@define-color secondary_sidebar_fg_color #ffffff;
@define-color secondary_sidebar_backdrop_color ${sidebarBgCss};

@define-color card_bg_color ${cardBaseHex};
@define-color card_fg_color ${textFg};
@define-color card_shade_color ${isDark ? 'rgba(0, 0, 0, 0.36)' : 'rgba(0, 0, 0, 0.07)'};

@define-color dialog_bg_color ${windowBaseHex};
@define-color dialog_fg_color ${textFg};

@define-color popover_bg_color ${isDark ? '#303030' : '#ffffff'};
@define-color popover_fg_color ${textFg};

@define-color tooltip_bg_color ${isDark ? '#303030' : '#ffffff'};
@define-color tooltip_fg_color ${textFg};

@define-color thumbnail_bg_color ${isDark ? '#303030' : '#ffffff'};
@define-color thumbnail_fg_color ${textFg};

:root {
    --accent-color: ${accentHex};
    --accent-bg-color: ${accentHex};
    --accent-fg-color: #ffffff;
    --window-bg-color: ${windowBaseHex};
    --window-fg-color: ${textFg};
    --view-bg-color: ${viewBaseHex};
    --view-fg-color: ${textFg};
    --headerbar-bg-color: ${headerBgCss};
    --headerbar-fg-color: ${textFg};
    --headerbar-backdrop-color: ${headerBgCss};
    --headerbar-shade-color: transparent;
    --headerbar-darker-shade-color: transparent;
    --sidebar-bg-color: ${sidebarBgCss};
    --sidebar-fg-color: #ffffff;
    --sidebar-backdrop-color: ${sidebarBgCss};
    --secondary-sidebar-bg-color: ${sidebarBgCss};
    --secondary-sidebar-backdrop-color: ${sidebarBgCss};
    --card-bg-color: ${cardBaseHex};
    --card-fg-color: ${textFg};
    --dialog-bg-color: ${windowBaseHex};
    --dialog-fg-color: ${textFg};
    --popover-bg-color: ${isDark ? '#303030' : '#ffffff'};
    --popover-fg-color: ${textFg};
    --thumbnail-bg-color: ${isDark ? '#303030' : '#ffffff'};
    --thumbnail-fg-color: ${textFg};
    --standalone-color-oklab: ${isDark ? 'max(l, 0.85) a b' : 'min(l, 0.5) a b'};
}

${!isDark ? `
@media (prefers-color-scheme: dark) {
    @define-color window_bg_color ${windowBaseHex};
    @define-color window_fg_color ${textFg};
    @define-color view_bg_color ${viewBaseHex};
    @define-color view_fg_color ${textFg};
    @define-color headerbar_bg_color ${headerBgCss};
    @define-color headerbar_fg_color ${textFg};
    @define-color headerbar_shade_color transparent;
    @define-color headerbar_darker_shade_color transparent;
    @define-color sidebar_bg_color ${sidebarBgCss};
    @define-color sidebar_fg_color #ffffff;
    @define-color card_bg_color ${cardBaseHex};
    @define-color card_fg_color ${textFg};
    @define-color dialog_bg_color ${windowBaseHex};
    @define-color dialog_fg_color ${textFg};
    @define-color popover_bg_color #ffffff;
    @define-color popover_fg_color ${textFg};
    :root {
        --window-bg-color: ${windowBaseHex};
        --window-fg-color: ${textFg};
        --view-bg-color: ${viewBaseHex};
        --view-fg-color: ${textFg};
        --headerbar-bg-color: ${headerBgCss};
        --headerbar-fg-color: ${textFg};
        --headerbar-shade-color: transparent;
        --headerbar-darker-shade-color: transparent;
        --sidebar-bg-color: ${sidebarBgCss};
        --sidebar-fg-color: #ffffff;
        --card-bg-color: ${cardBaseHex};
        --card-fg-color: ${textFg};
        --dialog-bg-color: ${windowBaseHex};
        --dialog-fg-color: ${textFg};
        --popover-bg-color: #ffffff;
        --popover-fg-color: ${textFg};
        --standalone-color-oklab: min(l, 0.5) a b;
    }
}
` : ''}

/* Window root background and canvas */
${isTransparent ? `
window,
window.background,
window.csd {
    background-color: transparent;
}

/* Window shadow frame decoration: background must stay transparent to prevent Mutter redraw flicker */
window decoration,
decoration {
    background: transparent;
    background-color: transparent;
}
` : `
window,
window.background,
window.csd {
    background-color: ${windowBaseHex};
}
`}

/* Native background blur (GTK 4.20+ / GSK & ext-background-effect-v1) */
${blurVal > 0 ? `
window,
window.background,
window.csd,
.sidebar-pane,
navigation-split-view > .sidebar-pane,
overlay-split-view > .sidebar-pane,
.sidebar-pane headerbar,
.sidebar-pane toolbarview > .top-bar,
.tweak-titlebar-left,
#left_box {
    backdrop-filter: blur(${blurVal}px);
}
` : ''}

/* Nautilus folder view background - strictly solid, never transparent */
NautilusWindowSlot,
NautilusFilesView,
NautilusView,
NautilusWindow .content-pane scrolledwindow,
NautilusWindow .content-pane scrolledwindow viewport,
NautilusWindow .content-pane gridview,
NautilusWindow .content-pane columnview,
NautilusWindow .content-pane listview,
NautilusWindow .content-pane .view,
NautilusWindow .view,
.nautilus-canvas-view,
.nautilus-list-view,
.nautilus-grid-view,
.content-pane scrolledwindow,
.content-pane scrolledwindow viewport,
.content-pane gridview,
.content-pane columnview,
.content-pane listview,
.content-pane .view,
gridview,
columnview {
    background-color: ${viewBaseHex};
}

/* Content areas remain solid so text and files are always crisp and readable */
.content-pane toolbarview > .content,
.content-pane > toolbarview > .content,
.content-pane > stack,
.content-pane preferences-page,
.content-pane status-page,
toolbarview > .content,
toolbarview > widget:not(.top-bar):not(.bottom-bar),
status-page,
statuspage,
preferences-page,
preferencespage,
navigation-page,
navigationpage,
ExmBrowsePage,
ExmInstalledPage,
ExmWindow breakpointbin > box,
ExmWindow stack,
ExmWindow statuspage,
ExmWindow preferencespage,
window:not(.sidebar-pane) > box > widget:not(headerbar):not(.top-bar):not(tabbar),
window:not(.sidebar-pane) > box > stack,
window:not(.sidebar-pane) > box > scrolledwindow,
tab-view,
view-stack,
#right_box,
leaflet > box:first-child {
    background-color: ${windowBaseHex};
}

/* Outer corner radius for content pane matching window corner */
window:not(.maximized):not(.fullscreen) .content-pane toolbarview > .content,
window:not(.maximized):not(.fullscreen) navigation-split-view > .content-pane toolbarview > .content,
window:not(.maximized):not(.fullscreen) overlay-split-view > .content-pane toolbarview > .content,
window:not(.maximized):not(.fullscreen) toolbarview > .content,
window:not(.maximized):not(.fullscreen) .content-pane scrolledwindow,
window:not(.maximized):not(.fullscreen) .content-pane scrolledwindow viewport,
window:not(.maximized):not(.fullscreen) NautilusWindowSlot,
window:not(.maximized):not(.fullscreen) #right_box {
    border-bottom-right-radius: ${cornerVal}px;
}

/* Window corner radius and visible frame border matching preview */
window:not(.maximized):not(.fullscreen),
window.csd:not(.maximized):not(.fullscreen),
window.background:not(.maximized):not(.fullscreen) {
    border: 1px solid ${borderColor};
    outline: 1px solid ${borderColor};
    outline-offset: -1px;
    box-shadow: 0 0 0 1px ${borderColor}, 0 4px 16px rgba(0, 0, 0, 0.25);
    border-radius: ${cornerVal}px;
}

window:not(.maximized):not(.fullscreen) decoration {
    border-radius: ${cornerVal}px;
}

window.maximized,
window.fullscreen,
window.csd.maximized,
window.csd.fullscreen {
    border: none;
    outline: none;
    box-shadow: none;
    border-radius: 0;
}

/* Top bar / headerbar */
headerbar,
.titlebar,
toolbarview > .top-bar,
.content-pane headerbar,
.content-pane toolbarview > .top-bar,
#right_box headerbar,
.tweak-titlebar-right {
    background: ${headerBgCss};
    background-color: ${headerBgCss};
    background-image: none;
    box-shadow: none;
}

headerbar:backdrop,
.titlebar:backdrop,
toolbarview > .top-bar:backdrop,
.content-pane headerbar:backdrop,
.content-pane toolbarview > .top-bar:backdrop,
#right_box headerbar:backdrop,
.tweak-titlebar-right:backdrop {
    background: ${headerBgCss};
    background-color: ${headerBgCss};
    background-image: none;
    box-shadow: none;
}

/* Outer corners of the continuous top bar matching window corner radius */
window:not(.maximized):not(.fullscreen) headerbar:first-child,
window:not(.maximized):not(.fullscreen) .sidebar-pane headerbar,
window:not(.maximized):not(.fullscreen) .sidebar-pane toolbarview > .top-bar,
window:not(.maximized):not(.fullscreen) #left_box headerbar,
window:not(.maximized):not(.fullscreen) .tweak-titlebar-left {
    border-top-left-radius: ${cornerVal}px;
}

window:not(.maximized):not(.fullscreen) headerbar:last-child,
window:not(.maximized):not(.fullscreen) .content-pane headerbar,
window:not(.maximized):not(.fullscreen) .content-pane toolbarview > .top-bar,
window:not(.maximized):not(.fullscreen) #right_box headerbar,
window:not(.maximized):not(.fullscreen) .tweak-titlebar-right {
    border-top-right-radius: ${cornerVal}px;
}

window:not(.maximized):not(.fullscreen) toolbarview > .top-bar,
window:not(.maximized):not(.fullscreen) GsShell toolbarview > .top-bar,
window:not(.maximized):not(.fullscreen) ExmWindow toolbarview > .top-bar,
window:not(.maximized):not(.fullscreen) ExtensionPrefsDialog toolbarview > .top-bar {
    border-top-left-radius: ${cornerVal}px;
    border-top-right-radius: ${cornerVal}px;
}

window:not(.maximized):not(.fullscreen) .sidebar-pane toolbarview > .top-bar {
    border-top-right-radius: 0;
}
window:not(.maximized):not(.fullscreen) .content-pane toolbarview > .top-bar {
    border-top-left-radius: 0;
}

/* All Regular Buttons (outside topbar) - Adwaita Style with Borders & Font Color */
button:not(.flat):not(.accent-button):not(.circular):not(.suggested-action):not(.destructive-action):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button) {
    border-radius: ${cornerVal}px;
    border: 1px solid ${btnBorderColor};
    background-color: ${btnBgColor};
    color: ${btnFg};
    min-height: 24px;
    transition: all 120ms ease;
}

/* Ensure button labels and icons take the font color: white in dark, black in light */
button:not(.flat):not(.accent-button):not(.circular):not(.suggested-action):not(.destructive-action):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button) label,
button:not(.flat):not(.accent-button):not(.circular):not(.suggested-action):not(.destructive-action):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button) image {
    color: ${btnFg};
}

/* Headerbar and Titlebar Buttons sizing */
headerbar button:not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button),
.titlebar button:not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button),
headerbar menubutton > button,
.titlebar menubutton > button,
headerbar splitbutton > button,
.titlebar splitbutton > button {
    min-height: 26px;
    margin-top: ${btnMarginV}px;
    margin-bottom: ${btnMarginV}px;
}

headerbar button.image-button:not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button),
.titlebar button.image-button:not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button),
headerbar menubutton > button.image-button,
.titlebar menubutton > button.image-button {
    min-width: ${iconBtnSize}px;
    min-height: 26px;
    padding: 0 4px;
    margin-left: 2px;
    margin-right: 2px;
}

/* Topbar & Headerbar Buttons - Borderless & Flat at Rest State (frames removed at rest) */
headerbar button:not(.suggested-action):not(.destructive-action):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button),
headerbar button.flat:not(.suggested-action):not(.destructive-action):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button),
headerbar button.image-button:not(.suggested-action):not(.destructive-action):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button),
headerbar menubutton > button:not(.suggested-action):not(.destructive-action),
headerbar splitbutton > button:not(.suggested-action):not(.destructive-action),
headerbar splitbutton > menubutton > button:not(.suggested-action):not(.destructive-action),
headerbar togglebutton:not(.suggested-action):not(.destructive-action),
.titlebar button:not(.suggested-action):not(.destructive-action):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button),
.titlebar button.flat:not(.suggested-action):not(.destructive-action):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button),
.titlebar button.image-button:not(.suggested-action):not(.destructive-action):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button),
.titlebar menubutton > button:not(.suggested-action):not(.destructive-action),
.titlebar splitbutton > button:not(.suggested-action):not(.destructive-action),
.titlebar splitbutton > menubutton > button:not(.suggested-action):not(.destructive-action),
.titlebar togglebutton:not(.suggested-action):not(.destructive-action),
toolbarview > .top-bar button:not(.suggested-action):not(.destructive-action):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button),
toolbarview > .top-bar button.flat:not(.suggested-action):not(.destructive-action):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button),
toolbarview > .top-bar button.image-button:not(.suggested-action):not(.destructive-action):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button),
toolbarview > .top-bar menubutton > button:not(.suggested-action):not(.destructive-action),
toolbarview > .top-bar splitbutton > button:not(.suggested-action):not(.destructive-action),
toolbarview > .top-bar splitbutton > menubutton > button:not(.suggested-action):not(.destructive-action),
toolbarview > .top-bar togglebutton:not(.suggested-action):not(.destructive-action) {
    border-radius: ${cornerVal}px;
    border: 1px solid ${btnBorderColor};
    background: transparent;
    background-color: transparent;
    background-image: none;
    box-shadow: none;
    color: ${btnFg};
    transition: all 120ms ease;
}

headerbar splitbutton,
.titlebar splitbutton,
toolbarview > .top-bar splitbutton {
    background: transparent;
    background-color: transparent;
    background-image: none;
    border: none;
    box-shadow: none;
}

headerbar button:not(.suggested-action):not(.destructive-action):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button) image,
headerbar button:not(.suggested-action):not(.destructive-action):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button) label,
headerbar menubutton > button image,
headerbar splitbutton > button image,
headerbar togglebutton image,
.titlebar button:not(.suggested-action):not(.destructive-action):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button) image,
.titlebar button:not(.suggested-action):not(.destructive-action):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button) label,
toolbarview > .top-bar button:not(.suggested-action):not(.destructive-action):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button) image,
toolbarview > .top-bar button:not(.suggested-action):not(.destructive-action):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button) label,
toolbarview > .top-bar menubutton > button image,
toolbarview > .top-bar splitbutton > button image,
toolbarview > .top-bar togglebutton image {
    color: ${btnFg};
}

/* Button Hover State - Content Buttons */
button:hover:not(.accent-button):not(.circular):not(.suggested-action):not(.destructive-action):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button),
button.flat:hover:not(.accent-button):not(.circular):not(.suggested-action):not(.destructive-action):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button) {
    background-color: color-mix(in srgb, ${accentHex} 14%, ${btnHoverBgColor});
    border-color: color-mix(in srgb, ${accentHex} 40%, ${btnHoverBorderColor});
    color: ${btnFg};
}

/* Topbar & Headerbar Buttons - Frame & border appear ONLY on hover */
headerbar button:hover:not(:active):not(:checked):not(.suggested-action):not(.destructive-action):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button),
headerbar button.flat:hover:not(:active):not(:checked):not(.suggested-action):not(.destructive-action):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button),
headerbar button.image-button:hover:not(:active):not(:checked):not(.suggested-action):not(.destructive-action):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button),
headerbar menubutton > button:hover:not(:active):not(:checked):not(.suggested-action):not(.destructive-action),
headerbar splitbutton > button:hover:not(:active):not(:checked):not(.suggested-action):not(.destructive-action),
headerbar splitbutton > menubutton > button:hover:not(:active):not(:checked):not(.suggested-action):not(.destructive-action),
headerbar togglebutton:hover:not(:active):not(:checked):not(.suggested-action):not(.destructive-action),
.titlebar button:hover:not(:active):not(:checked):not(.suggested-action):not(.destructive-action):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button),
.titlebar button.flat:hover:not(:active):not(:checked):not(.suggested-action):not(.destructive-action):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button),
.titlebar button.image-button:hover:not(:active):not(:checked):not(.suggested-action):not(.destructive-action):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button),
.titlebar menubutton > button:hover:not(:active):not(:checked):not(.suggested-action):not(.destructive-action),
.titlebar splitbutton > button:hover:not(:active):not(:checked):not(.suggested-action):not(.destructive-action),
.titlebar splitbutton > menubutton > button:hover:not(:active):not(:checked):not(.suggested-action):not(.destructive-action),
.titlebar togglebutton:hover:not(:active):not(:checked):not(.suggested-action):not(.destructive-action),
toolbarview > .top-bar button:hover:not(:active):not(:checked):not(.suggested-action):not(.destructive-action):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button),
toolbarview > .top-bar button.flat:hover:not(:active):not(:checked):not(.suggested-action):not(.destructive-action):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button),
toolbarview > .top-bar button.image-button:hover:not(:active):not(:checked):not(.suggested-action):not(.destructive-action):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button),
toolbarview > .top-bar menubutton > button:hover:not(:active):not(:checked):not(.suggested-action):not(.destructive-action),
toolbarview > .top-bar splitbutton > button:hover:not(:active):not(:checked):not(.suggested-action):not(.destructive-action),
toolbarview > .top-bar splitbutton > menubutton > button:hover:not(:active):not(:checked):not(.suggested-action):not(.destructive-action),
toolbarview > .top-bar togglebutton:hover:not(:active):not(:checked):not(.suggested-action):not(.destructive-action) {
    background-color: ${btnHoverBgColor};
    border: 1px solid ${btnHoverBorderColor};
    border-radius: ${cornerVal}px;
    color: ${btnFg};
}

/* Button Active State - Content Buttons */
button:active:not(.accent-button):not(.circular):not(.suggested-action):not(.destructive-action):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button),
button.flat:active:not(.accent-button):not(.circular):not(.suggested-action):not(.destructive-action):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button) {
    background-color: ${btnActiveBgColor};
    border-color: ${btnActiveBorderColor};
    color: ${btnFg};
}

/* Topbar & Headerbar Buttons - Accent Color Appears on Click / Active / Checked */
headerbar button:active:not(.destructive-action):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button),
headerbar button:checked:not(.destructive-action):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button),
headerbar button.flat:active:not(.destructive-action):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button),
headerbar button.flat:checked:not(.destructive-action):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button),
headerbar button.image-button:active:not(.destructive-action):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button),
headerbar button.image-button:checked:not(.destructive-action):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button),
headerbar menubutton > button:active:not(.destructive-action),
headerbar menubutton > button:checked:not(.destructive-action),
headerbar splitbutton > button:active:not(.destructive-action),
headerbar splitbutton > button:checked:not(.destructive-action),
headerbar splitbutton > menubutton > button:active:not(.destructive-action),
headerbar splitbutton > menubutton > button:checked:not(.destructive-action),
headerbar togglebutton:active:not(.destructive-action),
headerbar togglebutton:checked:not(.destructive-action),
.titlebar button:active:not(.destructive-action):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button),
.titlebar button:checked:not(.destructive-action):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button),
.titlebar button.flat:active:not(.destructive-action):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button),
.titlebar button.flat:checked:not(.destructive-action):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button),
.titlebar button.image-button:active:not(.destructive-action):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button),
.titlebar button.image-button:checked:not(.destructive-action):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button),
.titlebar menubutton > button:active:not(.destructive-action),
.titlebar menubutton > button:checked:not(.destructive-action),
.titlebar splitbutton > button:active:not(.destructive-action),
.titlebar splitbutton > button:checked:not(.destructive-action),
.titlebar splitbutton > menubutton > button:active:not(.destructive-action),
.titlebar splitbutton > menubutton > button:checked:not(.destructive-action),
.titlebar togglebutton:active:not(.destructive-action),
.titlebar togglebutton:checked:not(.destructive-action),
toolbarview > .top-bar button:active:not(.destructive-action):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button),
toolbarview > .top-bar button:checked:not(.destructive-action):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button),
toolbarview > .top-bar button.flat:active:not(.destructive-action):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button),
toolbarview > .top-bar button.flat:checked:not(.destructive-action):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button),
toolbarview > .top-bar button.image-button:active:not(.destructive-action):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button),
toolbarview > .top-bar button.image-button:checked:not(.destructive-action):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button),
toolbarview > .top-bar menubutton > button:active:not(.destructive-action),
toolbarview > .top-bar menubutton > button:checked:not(.destructive-action),
toolbarview > .top-bar splitbutton > button:active:not(.destructive-action),
toolbarview > .top-bar splitbutton > button:checked:not(.destructive-action),
toolbarview > .top-bar splitbutton > menubutton > button:active:not(.destructive-action),
toolbarview > .top-bar splitbutton > menubutton > button:checked:not(.destructive-action),
toolbarview > .top-bar togglebutton:active:not(.destructive-action),
toolbarview > .top-bar togglebutton:checked:not(.destructive-action) {
    background-color: ${accentHex};
    border: 1px solid ${accentDark};
    border-radius: ${cornerVal}px;
    color: #ffffff;
}

headerbar button:active:not(.destructive-action):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button) image,
headerbar button:checked:not(.destructive-action):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button) image,
headerbar button:active:not(.destructive-action):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button) label,
headerbar button:checked:not(.destructive-action):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button) label,
headerbar menubutton > button:active image,
headerbar menubutton > button:checked image,
headerbar menubutton > button:active label,
headerbar menubutton > button:checked label,
headerbar splitbutton > button:active image,
headerbar splitbutton > button:checked image,
headerbar splitbutton > button:active label,
headerbar splitbutton > button:checked label,
headerbar splitbutton > menubutton > button:active image,
headerbar splitbutton > menubutton > button:checked image,
headerbar splitbutton > menubutton > button:active label,
headerbar splitbutton > menubutton > button:checked label,
headerbar togglebutton:active image,
headerbar togglebutton:checked image,
headerbar togglebutton:active label,
headerbar togglebutton:checked label,
.titlebar button:active:not(.destructive-action):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button) image,
.titlebar button:checked:not(.destructive-action):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button) image,
.titlebar button:active:not(.destructive-action):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button) label,
.titlebar button:checked:not(.destructive-action):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button) label,
.titlebar menubutton > button:active image,
.titlebar menubutton > button:checked image,
.titlebar splitbutton > button:active image,
.titlebar splitbutton > button:checked image,
.titlebar splitbutton > menubutton > button:active image,
.titlebar splitbutton > menubutton > button:checked image,
toolbarview > .top-bar button:active:not(.destructive-action):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button) image,
toolbarview > .top-bar button:checked:not(.destructive-action):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button) image,
toolbarview > .top-bar button:active:not(.destructive-action):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button) label,
toolbarview > .top-bar button:checked:not(.destructive-action):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button) label,
toolbarview > .top-bar menubutton > button:active image,
toolbarview > .top-bar menubutton > button:checked image,
toolbarview > .top-bar splitbutton > button:active image,
toolbarview > .top-bar splitbutton > button:checked image,
toolbarview > .top-bar togglebutton:active image,
toolbarview > .top-bar togglebutton:checked image {
    color: #ffffff;
}

/* Button Checked / Selected State (Uses Accent Color for non-topbar buttons) */
button:checked:not(.accent-button):not(.circular):not(.destructive-action):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button),
button.flat:checked:not(.accent-button):not(.circular):not(.destructive-action):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button) {
    background-color: ${accentHex};
    border-color: ${accentDark};
    color: #ffffff;
}

button:checked:not(.accent-button):not(.circular):not(.destructive-action) label,
button:checked:not(.accent-button):not(.circular):not(.destructive-action) image {
    color: #ffffff;
}

/* Button Disabled State */
button:disabled,
button.flat:disabled,
headerbar button:disabled,
.titlebar button:disabled {
    opacity: 0.45;
}

/* Suggested Action Button (Accent Color) */
button.suggested-action,
button.suggested-action.flat,
headerbar button.suggested-action,
.titlebar button.suggested-action,
toolbarview > .top-bar button.suggested-action {
    border-radius: ${cornerVal}px;
    background-color: ${accentHex};
    background-image: none;
    border: 1px solid color-mix(in srgb, ${accentHex} 75%, black);
    color: #ffffff;
    min-height: 24px;
    transition: all 120ms ease;
}

button.suggested-action label,
button.suggested-action image {
    color: #ffffff;
}

button.suggested-action:hover,
headerbar button.suggested-action:hover,
.titlebar button.suggested-action:hover,
toolbarview > .top-bar button.suggested-action:hover {
    background-color: color-mix(in srgb, ${accentHex} 88%, white);
    border-color: color-mix(in srgb, ${accentHex} 65%, black);
    color: #ffffff;
}

button.suggested-action:active,
headerbar button.suggested-action:active,
.titlebar button.suggested-action:active,
toolbarview > .top-bar button.suggested-action:active {
    background-color: color-mix(in srgb, ${accentHex} 75%, black);
    border-color: color-mix(in srgb, ${accentHex} 60%, black);
    color: #ffffff;
}

/* Destructive Action Button (Red Style) */
button.destructive-action,
button.destructive-action.flat,
headerbar button.destructive-action,
.titlebar button.destructive-action,
toolbarview > .top-bar button.destructive-action {
    border-radius: ${cornerVal}px;
    background-color: #e01b24;
    background-image: none;
    border: 1px solid #c01c28;
    color: #ffffff;
    min-height: 24px;
    transition: all 120ms ease;
}

button.destructive-action label,
button.destructive-action image {
    color: #ffffff;
}

button.destructive-action:hover,
headerbar button.destructive-action:hover,
.titlebar button.destructive-action:hover,
toolbarview > .top-bar button.destructive-action:hover {
    background-color: #eb2a33;
    border-color: #a8161e;
    color: #ffffff;
}

button.destructive-action:active,
headerbar button.destructive-action:active,
.titlebar button.destructive-action:active,
toolbarview > .top-bar button.destructive-action:active {
    background-color: #a8161e;
    border-color: #7a1016;
    color: #ffffff;
}

/* Outer corner integration for linked and split buttons */
splitbutton > button:first-child,
.linked:not(.vertical) > button:first-child {
    border-top-left-radius: ${cornerVal}px;
    border-bottom-left-radius: ${cornerVal}px;
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
}

splitbutton > button:last-child,
splitbutton > menubutton > button,
splitbutton > menubutton:last-child > button,
.linked:not(.vertical) > button:last-child {
    border-top-right-radius: ${cornerVal}px;
    border-bottom-right-radius: ${cornerVal}px;
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
    border-left: none;
}

splitbutton separator {
    background-color: ${btnBorderColor};
    min-width: 1px;
}

.linked:not(.vertical) > button:not(:first-child):not(:last-child) {
    border-radius: 0;
    border-left: none;
}

/* Preserve round circular GNOME accent color picker buttons */
.accent-button,
button.accent-button {
    min-width: 26px;
    min-height: 26px;
    padding: 3px;
    border-radius: 9999px;
    background: var(--accent-bg-color);
    background-clip: content-box;
    border: none;
    box-shadow: none;
    outline: none;
    transition: box-shadow 150ms ease, background-color 150ms ease;
}

.accent-button:hover,
button.accent-button:hover {
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent-bg-color) 45%, transparent);
}

.accent-button:checked,
button.accent-button:checked {
    background: var(--accent-bg-color);
    background-clip: content-box;
    box-shadow: 0 0 0 3px var(--accent-bg-color);
    border: none;
}

.accent-button:focus:focus-visible,
button.accent-button:focus:focus-visible {
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent-color) 30%, transparent);
}

.accent-button:checked:focus:focus-visible,
button.accent-button:checked:focus:focus-visible {
    box-shadow: 0 0 0 3px var(--accent-bg-color),
                0 0 0 6px color-mix(in srgb, var(--accent-color) 30%, transparent);
}

.accent-button.blue, button.accent-button.blue { --accent-bg-color: #3584e4; }
.accent-button.teal, button.accent-button.teal { --accent-bg-color: #2190a4; }
.accent-button.green, button.accent-button.green { --accent-bg-color: #3a944a; }
.accent-button.yellow, button.accent-button.yellow { --accent-bg-color: #c88800; }
.accent-button.orange, button.accent-button.orange { --accent-bg-color: #ed5b00; }
.accent-button.red, button.accent-button.red { --accent-bg-color: #e01b24; }
.accent-button.pink, button.accent-button.pink { --accent-bg-color: #d56199; }
.accent-button.purple, button.accent-button.purple { --accent-bg-color: #9141ac; }
.accent-button.slate, button.accent-button.slate { --accent-bg-color: #6f8396; }

/* Nautilus Path Bar - Unified square container, seamless breadcrumbs & integrated 3-dots */
.nautilus-pathbar {
    border-radius: ${cornerVal}px;
    border: 1px solid ${btnBorderColor};
    background: transparent;
    background-color: transparent;
    background-image: none;
    padding: 0;
    margin-top: ${btnMarginV}px;
    margin-bottom: ${btnMarginV}px;
    box-shadow: none;
}

.nautilus-pathbar > scrolledwindow:dir(ltr) undershoot.left {
    border-radius: ${cornerVal}px 0 0 ${cornerVal}px;
}

.nautilus-pathbar > scrolledwindow:dir(rtl) undershoot.right {
    border-radius: 0 ${cornerVal}px ${cornerVal}px 0;
}

/* Breadcrumb buttons inside pathbar: flat, transparent, no borders at rest */
.nautilus-pathbar .nautilus-path-button,
.nautilus-pathbar button.nautilus-path-button,
.nautilus-path-button,
button.nautilus-path-button {
    border: none;
    border-radius: ${Math.max(0, cornerVal - 1)}px;
    background: transparent;
    background-color: transparent;
    box-shadow: none;
    outline: none;
    margin: 2px 1px;
    padding: 2px 6px;
    min-height: 20px;
    min-width: 8px;
    color: ${btnFg};
    transition: background-color 100ms ease;
}

.nautilus-pathbar .nautilus-path-button:hover,
.nautilus-pathbar button.nautilus-path-button:hover,
.nautilus-path-button:hover,
button.nautilus-path-button:hover {
    border: none;
    box-shadow: none;
    background-color: color-mix(in srgb, currentColor 10%, transparent);
    color: ${btnFg};
}

.nautilus-pathbar .nautilus-path-button:active,
.nautilus-pathbar button.nautilus-path-button:active,
.nautilus-path-button:active,
button.nautilus-path-button:active {
    border: none;
    box-shadow: none;
    background-color: color-mix(in srgb, currentColor 18%, transparent);
    color: ${btnFg};
}

.nautilus-pathbar .nautilus-path-button.current-dir,
.nautilus-pathbar button.nautilus-path-button.current-dir,
.nautilus-path-button.current-dir,
button.nautilus-path-button.current-dir {
    border: none;
    box-shadow: none;
    background: transparent;
    background-color: transparent;
    font-weight: bold;
}

/* Three-dots menu button inside pathbar: seamless at the end of the unified bar */
.nautilus-pathbar > menubutton,
.nautilus-pathbar menubutton {
    margin: 0;
    padding: 0;
    border: none;
    background: transparent;
    background-color: transparent;
    background-image: none;
    box-shadow: none;
}

.nautilus-pathbar > menubutton > button,
.nautilus-pathbar menubutton > button,
.nautilus-pathbar > menubutton > button.image-button,
.nautilus-pathbar menubutton > button.image-button,
.nautilus-pathbar menubutton.flat > button {
    border: none;
    border-radius: ${Math.max(0, cornerVal - 1)}px;
    background: transparent;
    background-color: transparent;
    background-image: none;
    box-shadow: none;
    outline: none;
    margin: 2px 2px 2px 0;
    padding: 0 4px;
    min-width: 22px;
    min-height: 20px;
    color: ${btnFg};
    transition: background-color 100ms ease;
}

.nautilus-pathbar > menubutton > button:hover,
.nautilus-pathbar menubutton > button:hover {
    border: none;
    box-shadow: none;
    background-color: color-mix(in srgb, currentColor 10%, transparent);
    color: ${btnFg};
}

.nautilus-pathbar > menubutton > button:active,
.nautilus-pathbar menubutton > button:active,
.nautilus-pathbar > menubutton > button:checked,
.nautilus-pathbar menubutton > button:checked {
    border: none;
    box-shadow: none;
    background-color: color-mix(in srgb, currentColor 18%, transparent);
    color: ${btnFg};
}

.nautilus-pathbar menubutton > button image,
.nautilus-pathbar > menubutton > button image,
.nautilus-pathbar .nautilus-path-button image,
.nautilus-pathbar .nautilus-path-button label {
    color: ${btnFg};
}


/* Square Window Controls Buttons (Adwaita Style) - Overriding Libadwaita */
windowcontrols,
headerbar windowcontrols,
.titlebar windowcontrols,
toolbarview > .top-bar windowcontrols {
    border-spacing: 4px;
    padding: 0;
    margin: 0 2px;
    margin-top: ${vTop}px;
    margin-bottom: ${vBottom}px;
}

windowcontrols button,
windowcontrols > button,
windowcontrols > button.image-button,
headerbar windowcontrols button,
headerbar windowcontrols > button,
headerbar windowcontrols > button.image-button,
headerbar.titlebar windowcontrols button,
headerbar.titlebar windowcontrols > button,
.titlebar windowcontrols button,
.titlebar windowcontrols > button,
.titlebar windowcontrols > button.image-button,
headerbar.tweak-titlebar-right windowcontrols button,
.tweak-titlebar-right windowcontrols button,
toolbarview > .top-bar windowcontrols button,
toolbarview > .top-bar windowcontrols > button,
toolbarview > .top-bar windowcontrols > button.image-button,
window.background.csd headerbar windowcontrols button,
window.background.csd windowcontrols button,
window.background windowcontrols button,
window windowcontrols button {
    border-radius: ${cornerVal}px;
    border: 1px solid ${btnBorderColor};
    background-color: ${btnBgColor};
    color: ${btnFg};
    min-width: ${btnSize}px;
    min-height: ${btnSize}px;
    padding: 0;
    margin: 0 1px;
    box-shadow: none;
    outline: none;
    transition: all 120ms ease;
}

windowcontrols button image,
windowcontrols button > image,
windowcontrols > button image,
windowcontrols > button > image,
headerbar windowcontrols button image,
headerbar windowcontrols button > image,
headerbar.titlebar windowcontrols button image,
headerbar.titlebar windowcontrols button > image,
.titlebar windowcontrols button image,
.titlebar windowcontrols button > image,
headerbar.tweak-titlebar-right windowcontrols button image,
.tweak-titlebar-right windowcontrols button image,
toolbarview > .top-bar windowcontrols button image,
toolbarview > .top-bar windowcontrols button > image,
window.background.csd headerbar windowcontrols button image,
window.background.csd windowcontrols button image,
window.background windowcontrols button image,
window windowcontrols button image {
    background: transparent;
    background-color: transparent;
    border: none;
    box-shadow: none;
    border-radius: 0;
    padding: 0;
    margin: 0;
    -gtk-icon-size: ${restIconSize}px;
    min-width: ${restIconSize}px;
    min-height: ${restIconSize}px;
    opacity: 1;
    color: ${btnFg};
}

windowcontrols button:hover:not(.close):not(.minimize):not(.maximize),
windowcontrols > button:hover:not(.close):not(.minimize):not(.maximize),
headerbar windowcontrols button:hover:not(.close):not(.minimize):not(.maximize),
headerbar windowcontrols > button:hover:not(.close):not(.minimize):not(.maximize),
.titlebar windowcontrols button:hover:not(.close):not(.minimize):not(.maximize),
.titlebar windowcontrols > button:hover:not(.close):not(.minimize):not(.maximize) {
    background-color: ${btnHoverBgColor};
    border-color: ${btnHoverBorderColor};
    color: ${btnFg};
}

windowcontrols button:active:not(.close):not(.minimize):not(.maximize),
windowcontrols > button:active:not(.close):not(.minimize):not(.maximize),
headerbar windowcontrols button:active:not(.close):not(.minimize):not(.maximize),
headerbar windowcontrols > button:active:not(.close):not(.minimize):not(.maximize),
.titlebar windowcontrols button:active:not(.close):not(.minimize):not(.maximize),
.titlebar windowcontrols > button:active:not(.close):not(.minimize):not(.maximize) {
    background-color: ${accentHex};
    border: 1px solid ${accentDark};
    color: #ffffff;
}

/* Window Controls - Rest State: Neutral style matching other buttons */
windowcontrols button:not(.close):not(.minimize):not(.maximize):not(:hover):not(:active),
windowcontrols > button:not(.close):not(.minimize):not(.maximize):not(:hover):not(:active),
windowcontrols > button.image-button:not(.close):not(.minimize):not(.maximize):not(:hover):not(:active),
headerbar windowcontrols button:not(.close):not(.minimize):not(.maximize):not(:hover):not(:active),
headerbar windowcontrols > button:not(.close):not(.minimize):not(.maximize):not(:hover):not(:active),
headerbar windowcontrols > button.image-button:not(.close):not(.minimize):not(.maximize):not(:hover):not(:active),
headerbar.titlebar windowcontrols button:not(.close):not(.minimize):not(.maximize):not(:hover):not(:active),
headerbar.titlebar windowcontrols > button:not(.close):not(.minimize):not(.maximize):not(:hover):not(:active),
.titlebar windowcontrols button:not(.close):not(.minimize):not(.maximize):not(:hover):not(:active),
.titlebar windowcontrols > button:not(.close):not(.minimize):not(.maximize):not(:hover):not(:active),
.titlebar windowcontrols > button.image-button:not(.close):not(.minimize):not(.maximize):not(:hover):not(:active),
headerbar.tweak-titlebar-right windowcontrols button:not(.close):not(.minimize):not(.maximize):not(:hover):not(:active),
.tweak-titlebar-right windowcontrols button:not(.close):not(.minimize):not(.maximize):not(:hover):not(:active),
toolbarview > .top-bar windowcontrols button:not(.close):not(.minimize):not(.maximize):not(:hover):not(:active),
toolbarview > .top-bar windowcontrols > button:not(.close):not(.minimize):not(.maximize):not(:hover):not(:active),
toolbarview > .top-bar windowcontrols > button.image-button:not(.close):not(.minimize):not(.maximize):not(:hover):not(:active),
window.background.csd headerbar windowcontrols button:not(.close):not(.minimize):not(.maximize):not(:hover):not(:active),
window.background.csd windowcontrols button:not(.close):not(.minimize):not(.maximize):not(:hover):not(:active),
window.background windowcontrols button:not(.close):not(.minimize):not(.maximize):not(:hover):not(:active),
window windowcontrols button:not(.close):not(.minimize):not(.maximize):not(:hover):not(:active) {
    background-color: ${btnBgColor};
    border: 1px solid ${btnBorderColor};
    color: ${btnFg};
}

windowcontrols button:not(.close):not(.minimize):not(.maximize):not(:hover):not(:active) image,
windowcontrols > button:not(.close):not(.minimize):not(.maximize):not(:hover):not(:active) image,
headerbar windowcontrols button:not(.close):not(.minimize):not(.maximize):not(:hover):not(:active) image,
headerbar windowcontrols > button:not(.close):not(.minimize):not(.maximize):not(:hover):not(:active) image,
headerbar.titlebar windowcontrols button:not(.close):not(.minimize):not(.maximize):not(:hover):not(:active) image,
headerbar.titlebar windowcontrols > button:not(.close):not(.minimize):not(.maximize):not(:hover):not(:active) image,
.titlebar windowcontrols button:not(.close):not(.minimize):not(.maximize):not(:hover):not(:active) image,
.titlebar windowcontrols > button:not(.close):not(.minimize):not(.maximize):not(:hover):not(:active) image,
headerbar.tweak-titlebar-right windowcontrols button:not(.close):not(.minimize):not(.maximize):not(:hover):not(:active) image,
.tweak-titlebar-right windowcontrols button:not(.close):not(.minimize):not(.maximize):not(:hover):not(:active) image,
toolbarview > .top-bar windowcontrols button:not(.close):not(.minimize):not(.maximize):not(:hover):not(:active) image,
toolbarview > .top-bar windowcontrols > button:not(.close):not(.minimize):not(.maximize):not(:hover):not(:active) image,
window.background.csd headerbar windowcontrols button:not(.close):not(.minimize):not(.maximize):not(:hover):not(:active) image,
window.background.csd windowcontrols button:not(.close):not(.minimize):not(.maximize):not(:hover):not(:active) image,
window.background windowcontrols button:not(.close):not(.minimize):not(.maximize):not(:hover):not(:active) image,
window windowcontrols button:not(.close):not(.minimize):not(.maximize):not(:hover):not(:active) image {
    color: ${btnFg};
}

windowcontrols button.close:not(:hover):not(:active),
windowcontrols > button.close:not(:hover):not(:active),
headerbar windowcontrols button.close:not(:hover):not(:active),
headerbar windowcontrols > button.close:not(:hover):not(:active),
headerbar.titlebar windowcontrols button.close:not(:hover):not(:active),
headerbar.titlebar windowcontrols > button.close:not(:hover):not(:active),
.titlebar windowcontrols button.close:not(:hover):not(:active),
.titlebar windowcontrols > button.close:not(:hover):not(:active),
headerbar.tweak-titlebar-right windowcontrols button.close:not(:hover):not(:active),
.tweak-titlebar-right windowcontrols button.close:not(:hover):not(:active),
toolbarview > .top-bar windowcontrols button.close:not(:hover):not(:active),
toolbarview > .top-bar windowcontrols > button.close:not(:hover):not(:active),
window.background.csd headerbar windowcontrols button.close:not(:hover):not(:active),
window.background.csd windowcontrols button.close:not(:hover):not(:active),
window.background windowcontrols button.close:not(:hover):not(:active),
window windowcontrols button.close:not(:hover):not(:active) {
    background-color: ${btnBgColor};
    border: 1px solid ${btnBorderColor};
    color: ${btnFg};
}
windowcontrols button.close:not(:hover):not(:active) image,
windowcontrols > button.close:not(:hover):not(:active) image,
headerbar windowcontrols button.close:not(:hover):not(:active) image,
headerbar windowcontrols > button.close:not(:hover):not(:active) image,
headerbar.titlebar windowcontrols button.close:not(:hover):not(:active) image,
headerbar.titlebar windowcontrols > button.close:not(:hover):not(:active) image,
.titlebar windowcontrols button.close:not(:hover):not(:active) image,
.titlebar windowcontrols > button.close:not(:hover):not(:active) image,
headerbar.tweak-titlebar-right windowcontrols button.close:not(:hover):not(:active) image,
.tweak-titlebar-right windowcontrols button.close:not(:hover):not(:active) image,
toolbarview > .top-bar windowcontrols button.close:not(:hover):not(:active) image,
toolbarview > .top-bar windowcontrols > button.close:not(:hover):not(:active) image,
window.background.csd headerbar windowcontrols button.close:not(:hover):not(:active) image,
window.background.csd windowcontrols button.close:not(:hover):not(:active) image,
window.background windowcontrols button.close:not(:hover):not(:active) image,
window windowcontrols button.close:not(:hover):not(:active) image {
    color: ${btnFg};
}

/* Window Controls - Close Button (Red ONLY on hover and active) */
windowcontrols button.close:hover,
windowcontrols > button.close:hover,
windowcontrols > button.close.image-button:hover,
windowcontrols > button.close:hover:not(.raised):not(.suggested-action):not(.destructive-action):not(.opaque),
windowcontrols > button.close:hover:not(.raised):not(.suggested-action):not(.destructive-action):not(.opaque).image-button,
headerbar windowcontrols button.close:hover,
headerbar windowcontrols > button.close:hover,
headerbar windowcontrols > button.close.image-button:hover,
headerbar windowcontrols > button.close:hover:not(.raised):not(.suggested-action):not(.destructive-action):not(.opaque),
headerbar windowcontrols > button.close:hover:not(.raised):not(.suggested-action):not(.destructive-action):not(.opaque).image-button,
.titlebar windowcontrols button.close:hover,
.titlebar windowcontrols > button.close:hover,
.titlebar windowcontrols > button.close.image-button:hover,
.titlebar windowcontrols > button.close:hover:not(.raised):not(.suggested-action):not(.destructive-action):not(.opaque),
.titlebar windowcontrols > button.close:hover:not(.raised):not(.suggested-action):not(.destructive-action):not(.opaque).image-button,
toolbarview > .top-bar windowcontrols button.close:hover,
toolbarview > .top-bar windowcontrols > button.close:hover,
toolbarview > .top-bar windowcontrols > button.close.image-button:hover,
toolbarview > .top-bar windowcontrols > button.close:hover:not(.raised):not(.suggested-action):not(.destructive-action):not(.opaque),
toolbarview > .top-bar windowcontrols > button.close:hover:not(.raised):not(.suggested-action):not(.destructive-action):not(.opaque).image-button,
button.close:hover {
    background: rgb(249, 55, 0);
    background-color: rgb(249, 55, 0);
    border: 1px solid #d92e00;
    color: #ffffff;
}

windowcontrols button.close:active,
windowcontrols > button.close:active,
windowcontrols > button.close.image-button:active,
windowcontrols > button.close:active:not(.raised):not(.suggested-action):not(.destructive-action):not(.opaque),
windowcontrols > button.close:active:not(.raised):not(.suggested-action):not(.destructive-action):not(.opaque).image-button,
headerbar windowcontrols button.close:active,
headerbar windowcontrols > button.close:active,
headerbar windowcontrols > button.close.image-button:active,
headerbar windowcontrols > button.close:active:not(.raised):not(.suggested-action):not(.destructive-action):not(.opaque),
headerbar windowcontrols > button.close:active:not(.raised):not(.suggested-action):not(.destructive-action):not(.opaque).image-button,
.titlebar windowcontrols button.close:active,
.titlebar windowcontrols > button.close:active,
.titlebar windowcontrols > button.close.image-button:active,
.titlebar windowcontrols > button.close:active:not(.raised):not(.suggested-action):not(.destructive-action):not(.opaque),
.titlebar windowcontrols > button.close:active:not(.raised):not(.suggested-action):not(.destructive-action):not(.opaque).image-button,
toolbarview > .top-bar windowcontrols button.close:active,
toolbarview > .top-bar windowcontrols > button.close:active,
toolbarview > .top-bar windowcontrols > button.close.image-button:active,
toolbarview > .top-bar windowcontrols > button.close:active:not(.raised):not(.suggested-action):not(.destructive-action):not(.opaque),
toolbarview > .top-bar windowcontrols > button.close:active:not(.raised):not(.suggested-action):not(.destructive-action):not(.opaque).image-button,
button.close:active {
    background: #d92e00;
    background-color: #d92e00;
    border: 1px solid #b52600;
    color: #ffffff;
}

windowcontrols button.close:hover image,
windowcontrols > button.close:hover image,
windowcontrols button.close:hover > image,
windowcontrols > button.close:hover > image,
headerbar windowcontrols button.close:hover image,
headerbar windowcontrols > button.close:hover image,
headerbar windowcontrols button.close:hover > image,
headerbar windowcontrols > button.close:hover > image,
.titlebar windowcontrols button.close:hover image,
.titlebar windowcontrols > button.close:hover image,
.titlebar windowcontrols button.close:hover > image,
.titlebar windowcontrols > button.close:hover > image,
toolbarview > .top-bar windowcontrols button.close:hover image,
toolbarview > .top-bar windowcontrols > button.close:hover image,
toolbarview > .top-bar windowcontrols button.close:hover > image,
toolbarview > .top-bar windowcontrols > button.close:hover > image,
windowcontrols button.close:hover *,
windowcontrols > button.close:hover *,
headerbar windowcontrols button.close:hover *,
headerbar windowcontrols > button.close:hover *,
.titlebar windowcontrols button.close:hover *,
.titlebar windowcontrols > button.close:hover *,
button.close:hover image,
button.close:hover > image,
button.close:hover image.icon {
    color: #ffffff;
}

windowcontrols button.close:active image,
windowcontrols > button.close:active image,
windowcontrols button.close:active > image,
windowcontrols > button.close:active > image,
headerbar windowcontrols button.close:active image,
headerbar windowcontrols > button.close:active image,
headerbar windowcontrols button.close:active > image,
headerbar windowcontrols > button.close:active > image,
.titlebar windowcontrols button.close:active image,
.titlebar windowcontrols > button.close:active image,
.titlebar windowcontrols button.close:active > image,
.titlebar windowcontrols > button.close:active > image,
toolbarview > .top-bar windowcontrols button.close:active image,
toolbarview > .top-bar windowcontrols > button.close:active image,
toolbarview > .top-bar windowcontrols button.close:active > image,
toolbarview > .top-bar windowcontrols > button.close:active > image,
windowcontrols button.close:active *,
windowcontrols > button.close:active *,
headerbar windowcontrols button.close:active *,
headerbar windowcontrols > button.close:active *,
.titlebar windowcontrols button.close:active *,
.titlebar windowcontrols > button.close:active *,
button.close:active image,
button.close:active > image,
button.close:active image.icon {
    color: #ffffff;
}

/* Window Controls - Minimize & Maximize (Hover frame, Accent Color on active; icon is always black/btnFg) */
windowcontrols button.minimize:hover,
windowcontrols > button.minimize:hover,
windowcontrols > button.minimize:hover.image-button,
windowcontrols > button.minimize:hover:not(.raised):not(.suggested-action):not(.destructive-action):not(.opaque),
windowcontrols > button.minimize:hover:not(.raised):not(.suggested-action):not(.destructive-action):not(.opaque).image-button,
headerbar windowcontrols button.minimize:hover,
headerbar windowcontrols > button.minimize:hover,
headerbar windowcontrols > button.minimize:hover.image-button,
headerbar windowcontrols > button.minimize:hover:not(.raised):not(.suggested-action):not(.destructive-action):not(.opaque),
headerbar windowcontrols > button.minimize:hover:not(.raised):not(.suggested-action):not(.destructive-action):not(.opaque).image-button,
.titlebar windowcontrols button.minimize:hover,
.titlebar windowcontrols > button.minimize:hover,
.titlebar windowcontrols > button.minimize:hover.image-button,
.titlebar windowcontrols > button.minimize:hover:not(.raised):not(.suggested-action):not(.destructive-action):not(.opaque),
.titlebar windowcontrols > button.minimize:hover:not(.raised):not(.suggested-action):not(.destructive-action):not(.opaque).image-button,
toolbarview > .top-bar windowcontrols button.minimize:hover,
toolbarview > .top-bar windowcontrols > button.minimize:hover,
toolbarview > .top-bar windowcontrols > button.minimize:hover.image-button,
toolbarview > .top-bar windowcontrols > button.minimize:hover:not(.raised):not(.suggested-action):not(.destructive-action):not(.opaque),
toolbarview > .top-bar windowcontrols > button.minimize:hover:not(.raised):not(.suggested-action):not(.destructive-action):not(.opaque).image-button,
windowcontrols button.maximize:hover,
windowcontrols > button.maximize:hover,
windowcontrols > button.maximize:hover.image-button,
windowcontrols > button.maximize:hover:not(.raised):not(.suggested-action):not(.destructive-action):not(.opaque),
windowcontrols > button.maximize:hover:not(.raised):not(.suggested-action):not(.destructive-action):not(.opaque).image-button,
headerbar windowcontrols button.maximize:hover,
headerbar windowcontrols > button.maximize:hover,
headerbar windowcontrols > button.maximize:hover.image-button,
headerbar windowcontrols > button.maximize:hover:not(.raised):not(.suggested-action):not(.destructive-action):not(.opaque),
headerbar windowcontrols > button.maximize:hover:not(.raised):not(.suggested-action):not(.destructive-action):not(.opaque).image-button,
.titlebar windowcontrols button.maximize:hover,
.titlebar windowcontrols > button.maximize:hover,
.titlebar windowcontrols > button.maximize:hover.image-button,
.titlebar windowcontrols > button.maximize:hover:not(.raised):not(.suggested-action):not(.destructive-action):not(.opaque),
.titlebar windowcontrols > button.maximize:hover:not(.raised):not(.suggested-action):not(.destructive-action):not(.opaque).image-button,
toolbarview > .top-bar windowcontrols button.maximize:hover,
toolbarview > .top-bar windowcontrols > button.maximize:hover,
toolbarview > .top-bar windowcontrols > button.maximize:hover.image-button,
toolbarview > .top-bar windowcontrols > button.maximize:hover:not(.raised):not(.suggested-action):not(.destructive-action):not(.opaque),
toolbarview > .top-bar windowcontrols > button.maximize:hover:not(.raised):not(.suggested-action):not(.destructive-action):not(.opaque).image-button,
button.minimize:hover,
button.maximize:hover {
    background-color: ${btnHoverBgColor};
    border: 1px solid ${btnHoverBorderColor};
    color: ${btnFg};
}

windowcontrols button.minimize:active,
windowcontrols > button.minimize:active,
windowcontrols > button.minimize:active.image-button,
windowcontrols > button.minimize:active:not(.raised):not(.suggested-action):not(.destructive-action):not(.opaque),
windowcontrols > button.minimize:active:not(.raised):not(.suggested-action):not(.destructive-action):not(.opaque).image-button,
headerbar windowcontrols button.minimize:active,
headerbar windowcontrols > button.minimize:active,
headerbar windowcontrols > button.minimize:active.image-button,
headerbar windowcontrols > button.minimize:active:not(.raised):not(.suggested-action):not(.destructive-action):not(.opaque),
headerbar windowcontrols > button.minimize:active:not(.raised):not(.suggested-action):not(.destructive-action):not(.opaque).image-button,
.titlebar windowcontrols button.minimize:active,
.titlebar windowcontrols > button.minimize:active,
.titlebar windowcontrols > button.minimize:active.image-button,
.titlebar windowcontrols > button.minimize:active:not(.raised):not(.suggested-action):not(.destructive-action):not(.opaque),
.titlebar windowcontrols > button.minimize:active:not(.raised):not(.suggested-action):not(.destructive-action):not(.opaque).image-button,
toolbarview > .top-bar windowcontrols button.minimize:active,
toolbarview > .top-bar windowcontrols > button.minimize:active,
toolbarview > .top-bar windowcontrols > button.minimize:active.image-button,
toolbarview > .top-bar windowcontrols > button.minimize:active:not(.raised):not(.suggested-action):not(.destructive-action):not(.opaque),
toolbarview > .top-bar windowcontrols > button.minimize:active:not(.raised):not(.suggested-action):not(.destructive-action):not(.opaque).image-button,
windowcontrols button.maximize:active,
windowcontrols > button.maximize:active,
windowcontrols > button.maximize:active.image-button,
windowcontrols > button.maximize:active:not(.raised):not(.suggested-action):not(.destructive-action):not(.opaque),
windowcontrols > button.maximize:active:not(.raised):not(.suggested-action):not(.destructive-action):not(.opaque).image-button,
headerbar windowcontrols button.maximize:active,
headerbar windowcontrols > button.maximize:active,
headerbar windowcontrols > button.maximize:active.image-button,
headerbar windowcontrols > button.maximize:active:not(.raised):not(.suggested-action):not(.destructive-action):not(.opaque),
headerbar windowcontrols > button.maximize:active:not(.raised):not(.suggested-action):not(.destructive-action):not(.opaque).image-button,
.titlebar windowcontrols button.maximize:active,
.titlebar windowcontrols > button.maximize:active,
.titlebar windowcontrols > button.maximize:active.image-button,
.titlebar windowcontrols > button.maximize:active:not(.raised):not(.suggested-action):not(.destructive-action):not(.opaque),
.titlebar windowcontrols > button.maximize:active:not(.raised):not(.suggested-action):not(.destructive-action):not(.opaque).image-button,
toolbarview > .top-bar windowcontrols button.maximize:active,
toolbarview > .top-bar windowcontrols > button.maximize:active,
toolbarview > .top-bar windowcontrols > button.maximize:active.image-button,
toolbarview > .top-bar windowcontrols > button.maximize:active:not(.raised):not(.suggested-action):not(.destructive-action):not(.opaque),
toolbarview > .top-bar windowcontrols > button.maximize:active:not(.raised):not(.suggested-action):not(.destructive-action):not(.opaque).image-button,
button.minimize:active,
button.maximize:active {
    background-color: ${accentHex};
    border: 1px solid ${accentDark};
    color: ${btnFg};
}

windowcontrols button.minimize image,
windowcontrols > button.minimize image,
headerbar windowcontrols button.minimize image,
headerbar windowcontrols > button.minimize image,
.titlebar windowcontrols button.minimize image,
.titlebar windowcontrols > button.minimize image,
toolbarview > .top-bar windowcontrols button.minimize image,
toolbarview > .top-bar windowcontrols > button.minimize image,
windowcontrols button.maximize image,
windowcontrols > button.maximize image,
headerbar windowcontrols button.maximize image,
headerbar windowcontrols > button.maximize image,
.titlebar windowcontrols button.maximize image,
.titlebar windowcontrols > button.maximize image,
toolbarview > .top-bar windowcontrols button.maximize image,
toolbarview > .top-bar windowcontrols > button.maximize image,
button.minimize image,
button.maximize image,
button.minimize > image,
button.maximize > image,
windowcontrols button.minimize:hover image,
windowcontrols > button.minimize:hover image,
headerbar windowcontrols button.minimize:hover image,
headerbar windowcontrols > button.minimize:hover image,
.titlebar windowcontrols button.minimize:hover image,
.titlebar windowcontrols > button.minimize:hover image,
toolbarview > .top-bar windowcontrols button.minimize:hover image,
toolbarview > .top-bar windowcontrols > button.minimize:hover image,
windowcontrols button.maximize:hover image,
windowcontrols > button.maximize:hover image,
headerbar windowcontrols button.maximize:hover image,
headerbar windowcontrols > button.maximize:hover image,
.titlebar windowcontrols button.maximize:hover image,
.titlebar windowcontrols > button.maximize:hover image,
toolbarview > .top-bar windowcontrols button.maximize:hover image,
toolbarview > .top-bar windowcontrols > button.maximize:hover image,
button.minimize:hover image,
button.maximize:hover image,
button.minimize:hover > image,
button.maximize:hover > image,
windowcontrols button.minimize:active image,
windowcontrols > button.minimize:active image,
headerbar windowcontrols button.minimize:active image,
headerbar windowcontrols > button.minimize:active image,
.titlebar windowcontrols button.minimize:active image,
.titlebar windowcontrols > button.minimize:active image,
toolbarview > .top-bar windowcontrols button.minimize:active image,
toolbarview > .top-bar windowcontrols > button.minimize:active image,
windowcontrols button.maximize:active image,
windowcontrols > button.maximize:active image,
headerbar windowcontrols button.maximize:active image,
headerbar windowcontrols > button.maximize:active image,
.titlebar windowcontrols button.maximize:active image,
.titlebar windowcontrols > button.maximize:active image,
toolbarview > .top-bar windowcontrols button.maximize:active image,
toolbarview > .top-bar windowcontrols > button.maximize:active image,
button.minimize:active image,
button.maximize:active image,
button.minimize:active > image,
button.maximize:active > image {
    color: ${btnFg};
}

${enableControlButtons ? `
/* Experimental Split Window Controls (Stacked Minimize & Maximize) */
.split-window-controls {
    border: 1px solid ${btnBorderColor};
    border-radius: ${cornerVal}px;
    padding: 0;
    margin: 0;
    min-width: ${btnInnerW}px;
    min-height: ${closeInnerSize}px;
    background: transparent;
    background-color: transparent;
    background-image: none;
}

.split-window-controls button {
    border: none;
    border-radius: 0;
    margin: 0;
    padding: 0;
    min-width: ${btnInnerW}px;
    box-shadow: none;
    background: transparent;
    background-color: transparent;
    background-image: none;
    color: ${btnFg};
}

.split-window-controls button label,
.split-window-controls button image {
    color: ${btnFg};
    font-size: ${smallIconSize}px;
    line-height: 1;
    -gtk-icon-size: ${smallIconSize}px;
    transform: none;
    -gtk-icon-transform: none;
    margin: 0;
    padding: 0;
}

/* Position 1: Rest state (single square with standard-size icon inside, transparent background) */
.split-window-controls button:first-child {
    min-height: ${closeInnerSize}px;
    background: transparent;
    background-color: transparent;
    background-image: none;
    border-radius: ${cornerVal}px;
    border: none;
}

.split-window-controls button:first-child label,
.split-window-controls button:first-child image {
    margin: 0;
    padding: 0;
    font-size: ${restIconSize}px;
    -gtk-icon-size: ${restIconSize}px;
    transform: none;
    -gtk-icon-transform: none;
}

.split-window-controls button:last-child {
    min-height: 0px;
    background: transparent;
    background-color: transparent;
    border-radius: 0;
    border: none;
    opacity: 0;
}

.split-window-controls button:last-child label,
.split-window-controls button:last-child image {
    opacity: 0;
    color: transparent;
    font-size: 0px;
    -gtk-icon-size: 0px;
}

/* Position 2: Top button hover (only top button is visible) */
.split-window-controls.hover-top button:first-child,
.split-window-controls button:first-child:hover {
    min-height: ${topH}px;
    border: 1px solid ${btnBorderColor};
    border-radius: ${Math.max(0, cornerVal - 1)}px ${Math.max(0, cornerVal - 1)}px 0 0;
    background-color: ${btnHoverBgColor};
}

.split-window-controls.hover-top button:first-child label,
.split-window-controls.hover-top button:first-child image,
.split-window-controls button:first-child:hover label,
.split-window-controls button:first-child:hover image {
    font-size: ${smallIconSize}px;
    -gtk-icon-size: ${smallIconSize}px;
    transform: none;
    -gtk-icon-transform: none;
    margin-bottom: 1px;
    opacity: 1;
    color: ${btnFg};
}

.split-window-controls.hover-top button:last-child {
    min-height: 0px;
    border: none;
    opacity: 0;
}

.split-window-controls.hover-top button:last-child label,
.split-window-controls.hover-top button:last-child image {
    opacity: 0;
    font-size: 0px;
}

/* Pozycja 2: Po najechaniu na dolny przycisk (tylko dolny jest widoczny) */
.split-window-controls.hover-bottom button:last-child,
.split-window-controls button:last-child:hover {
    min-height: ${bottomH}px;
    opacity: 1;
    border: 1px solid ${btnBorderColor};
    border-radius: 0 0 ${Math.max(0, cornerVal - 1)}px ${Math.max(0, cornerVal - 1)}px;
    background-color: ${btnHoverBgColor};
}

.split-window-controls.hover-bottom button:last-child label,
.split-window-controls.hover-bottom button:last-child image,
.split-window-controls button:last-child:hover label,
.split-window-controls button:last-child:hover image {
    font-size: ${smallIconSize}px;
    -gtk-icon-size: ${smallIconSize}px;
    transform: none;
    -gtk-icon-transform: none;
    opacity: 1;
    color: ${btnFg};
    margin-top: 1px;
}

.split-window-controls.hover-bottom button:first-child {
    min-height: 0px;
    border: none;
    opacity: 0;
}

.split-window-controls.hover-bottom button:first-child label,
.split-window-controls.hover-bottom button:first-child image {
    opacity: 0;
    font-size: 0px;
}

/* Pozycja 3: Po kliku (aktywny przycisk na niebiesko / accent_color, drugi ukryty) */
.split-window-controls button:first-child:active {
    min-height: ${topH}px;
    background-color: ${accentHex};
    color: #ffffff;
    border: 1px solid ${accentDark};
    border-radius: ${Math.max(0, cornerVal - 1)}px ${Math.max(0, cornerVal - 1)}px 0 0;
}

.split-window-controls button:first-child:active label,
.split-window-controls button:first-child:active image {
    color: #ffffff;
    font-size: ${smallIconSize}px;
    opacity: 1;
    transform: none;
    -gtk-icon-transform: none;
}

.split-window-controls button:last-child:active {
    min-height: ${bottomH}px;
    background-color: ${accentHex};
    color: #ffffff;
    border: 1px solid ${accentDark};
    border-radius: 0 0 ${Math.max(0, cornerVal - 1)}px ${Math.max(0, cornerVal - 1)}px;
}

.split-window-controls button:last-child:active label,
.split-window-controls button:last-child:active image {
    color: #ffffff;
    font-size: ${smallIconSize}px;
    opacity: 1;
    transform: none;
    -gtk-icon-transform: none;
}

/* Experimental Window Controls - Stacked Minimize & Maximize in GTK4 apps */
toolbarview > .top-bar windowcontrols {
    border-spacing: 0px;
    padding: 0;
    margin: 0 2px;
    margin-top: ${vTop}px;
    margin-bottom: ${vBottom}px;
}

/* Strip any default round shadow, background or padding from all icons in windowcontrols */
toolbarview > .top-bar windowcontrols button image,
toolbarview > .top-bar windowcontrols > button image,
toolbarview > .top-bar windowcontrols > button > image,
navigation-split-view windowcontrols button image,
navigation-split-view windowcontrols > button image,
navigation-split-view windowcontrols > button > image,
toolbarview > .top-bar windowcontrols button:hover image,
toolbarview > .top-bar windowcontrols > button:hover image,
toolbarview > .top-bar windowcontrols > button:hover > image,
navigation-split-view windowcontrols button:hover image,
navigation-split-view windowcontrols > button:hover image,
navigation-split-view windowcontrols > button:hover > image,
toolbarview > .top-bar windowcontrols button:active image,
toolbarview > .top-bar windowcontrols > button:active image,
toolbarview > .top-bar windowcontrols > button:active > image,
navigation-split-view windowcontrols button:active image,
navigation-split-view windowcontrols > button:active image,
navigation-split-view windowcontrols > button:active > image {
    background: transparent;
    background-color: transparent;
    background-image: none;
    border-radius: 0;
    border: none;
    box-shadow: none;
    outline: none;
    -gtk-icon-shadow: none;
    padding: 0;
}

toolbarview > .top-bar windowcontrols button.maximize,
toolbarview > .top-bar windowcontrols > button.maximize,
toolbarview > .top-bar windowcontrols > button.maximize.image-button,
navigation-split-view windowcontrols button.maximize,
navigation-split-view windowcontrols > button.maximize {
    min-height: ${topH}px;
    min-width: ${btnInnerW}px;
    padding: 0;
    border-radius: ${cornerVal}px ${cornerVal}px 0 0;
    border: 1px solid transparent;
    background: transparent;
    background-color: transparent;
    background-image: none;
    color: ${btnFg};
    box-shadow: none;
    outline: none;
}

toolbarview > .top-bar windowcontrols button.minimize,
toolbarview > .top-bar windowcontrols > button.minimize,
toolbarview > .top-bar windowcontrols > button.minimize.image-button,
navigation-split-view windowcontrols button.minimize,
navigation-split-view windowcontrols > button.minimize {
    min-height: ${bottomH}px;
    min-width: ${btnInnerW}px;
    padding: 0;
    border-radius: 0 0 ${cornerVal}px ${cornerVal}px;
    border: 1px solid transparent;
    background: transparent;
    background-color: transparent;
    background-image: none;
    color: ${btnFg};
    box-shadow: none;
    outline: none;
}

/* Base icon hidden state for maximize and minimize */
toolbarview > .top-bar windowcontrols button.maximize image,
toolbarview > .top-bar windowcontrols button.maximize > image,
toolbarview > .top-bar windowcontrols > button.maximize image,
toolbarview > .top-bar windowcontrols > button.maximize > image,
navigation-split-view windowcontrols button.maximize image,
navigation-split-view windowcontrols > button.maximize image,
toolbarview > .top-bar windowcontrols button.minimize image,
toolbarview > .top-bar windowcontrols button.minimize > image,
toolbarview > .top-bar windowcontrols > button.minimize image,
toolbarview > .top-bar windowcontrols > button.minimize > image,
navigation-split-view windowcontrols button.minimize image,
navigation-split-view windowcontrols > button.minimize image {
    min-width: 0px;
    min-height: 0px;
    -gtk-icon-size: 0px;
    transform: none;
    -gtk-icon-transform: none;
    padding: 0;
    margin: 0;
    background: transparent;
    background-color: transparent;
    border: none;
    box-shadow: none;
    color: transparent;
    opacity: 0;
}

/* Position 1: Rest state - centered standard square icon when neither button is hovered */
toolbarview > .top-bar windowcontrols button.minimize:not(:hover):not(:active) + button.maximize:not(:hover):not(:active) image,
toolbarview > .top-bar windowcontrols > button.minimize:not(:hover):not(:active) + button.maximize:not(:hover):not(:active) image,
navigation-split-view windowcontrols button.minimize:not(:hover):not(:active) + button.maximize:not(:hover):not(:active) image,
navigation-split-view windowcontrols > button.minimize:not(:hover):not(:active) + button.maximize:not(:hover):not(:active) image,
toolbarview > .top-bar windowcontrols button.maximize:first-child:not(:hover):not(:active) image,
toolbarview > .top-bar windowcontrols > button.maximize:first-child:not(:hover):not(:active) image,
navigation-split-view windowcontrols button.maximize:first-child:not(:hover):not(:active) image,
navigation-split-view windowcontrols > button.maximize:first-child:not(:hover):not(:active) image {
    min-width: ${restIconSize}px;
    min-height: ${restIconSize}px;
    -gtk-icon-size: ${restIconSize}px;
    transform: none;
    -gtk-icon-transform: none;
    padding: 0;
    margin: 0;
    background: transparent;
    background-color: transparent;
    border: none;
    box-shadow: none;
    color: ${btnFg};
    opacity: 1;
}

toolbarview > .top-bar windowcontrols button.minimize:not(:hover):not(:active) + button.maximize:not(:hover):not(:active),
toolbarview > .top-bar windowcontrols > button.minimize:not(:hover):not(:active) + button.maximize:not(:hover):not(:active),
navigation-split-view windowcontrols button.minimize:not(:hover):not(:active) + button.maximize:not(:hover):not(:active),
navigation-split-view windowcontrols > button.minimize:not(:hover):not(:active) + button.maximize:not(:hover):not(:active) {
    margin: 0;
    margin-left: -${btnSize}px;
    margin-top: 0;
    margin-bottom: 0;
    min-height: ${closeInnerSize}px;
    border-radius: ${cornerVal}px;
    border: 1px solid ${btnBorderColor};
    background: transparent;
    background-color: transparent;
    background-image: none;
    box-shadow: none;
}

/* Position 1: Bottom minimize button - shifted down and hidden at rest */
toolbarview > .top-bar windowcontrols button.minimize:first-child,
toolbarview > .top-bar windowcontrols > button.minimize:first-child,
toolbarview > .top-bar windowcontrols button.minimize:not(:hover):not(:active),
toolbarview > .top-bar windowcontrols > button.minimize:not(:hover):not(:active),
navigation-split-view windowcontrols button.minimize:not(:hover):not(:active),
navigation-split-view windowcontrols > button.minimize:not(:hover):not(:active) {
    margin: 0;
    margin-top: ${topOuterH}px;
    margin-bottom: 0;
    margin-left: 0;
    margin-right: 0;
    background: transparent;
    background-color: transparent;
    background-image: none;
    border: 1px solid transparent;
    box-shadow: none;
    outline: none;
}

/* Minimize icon is completely hidden at rest */
windowcontrols button.minimize:not(:hover):not(:active) image,
windowcontrols > button.minimize:not(:hover):not(:active) image,
headerbar windowcontrols button.minimize:not(:hover):not(:active) image,
headerbar windowcontrols > button.minimize:not(:hover):not(:active) image,
toolbarview windowcontrols button.minimize:not(:hover):not(:active) image,
toolbarview > .top-bar windowcontrols button.minimize:not(:hover):not(:active) image,
toolbarview > .top-bar windowcontrols > button.minimize:not(:hover):not(:active) image,
navigation-split-view windowcontrols button.minimize:not(:hover):not(:active) image,
navigation-split-view windowcontrols > button.minimize:not(:hover):not(:active) image {
    opacity: 0;
    min-width: 0px;
    min-height: 0px;
    -gtk-icon-size: 0px;
    color: transparent;
}

/* Position 2: Top button hover (only top button is visible) */
toolbarview > .top-bar windowcontrols button.maximize:hover,
toolbarview > .top-bar windowcontrols > button.maximize:hover,
toolbarview > .top-bar windowcontrols > button.maximize.image-button:hover,
navigation-split-view windowcontrols button.maximize:hover,
navigation-split-view windowcontrols > button.maximize:hover,
toolbarview > .top-bar windowcontrols button.minimize + button.maximize:hover,
toolbarview > .top-bar windowcontrols > button.minimize + button.maximize:hover,
navigation-split-view windowcontrols button.minimize + button.maximize:hover,
navigation-split-view windowcontrols > button.minimize + button.maximize:hover {
    margin: 0;
    margin-left: -${btnSize}px;
    margin-top: 0;
    margin-bottom: ${bottomOuterH}px;
    min-height: ${topH}px;
    background-color: ${btnHoverBgColor};
    border: 1px solid ${btnBorderColor};
    border-radius: ${cornerVal}px ${cornerVal}px 0 0;
    color: ${btnFg};
}

toolbarview > .top-bar windowcontrols button.maximize:hover image,
toolbarview > .top-bar windowcontrols button.maximize:hover > image,
toolbarview > .top-bar windowcontrols > button.maximize:hover image,
toolbarview > .top-bar windowcontrols > button.maximize:hover > image,
navigation-split-view windowcontrols button.maximize:hover image,
navigation-split-view windowcontrols > button.maximize:hover image {
    min-width: ${smallIconSize}px;
    min-height: ${smallIconSize}px;
    -gtk-icon-size: ${smallIconSize}px;
    transform: none;
    -gtk-icon-transform: none;
    margin-bottom: 1px;
    color: ${btnFg};
    opacity: 1;
}

/* Pozycja 2: Po najechaniu na dolny przycisk (tylko dolny przycisk jest widoczny) */
toolbarview > .top-bar windowcontrols button.minimize:hover,
toolbarview > .top-bar windowcontrols > button.minimize:hover,
toolbarview > .top-bar windowcontrols > button.minimize.image-button:hover,
navigation-split-view windowcontrols button.minimize:hover,
navigation-split-view windowcontrols > button.minimize:hover {
    margin: 0;
    margin-top: ${topOuterH}px;
    margin-bottom: 0;
    margin-left: 0;
    margin-right: 0;
    min-height: ${bottomH}px;
    background-color: ${btnHoverBgColor};
    border: 1px solid ${btnBorderColor};
    border-radius: 0 0 ${cornerVal}px ${cornerVal}px;
    color: ${btnFg};
}

toolbarview > .top-bar windowcontrols button.minimize:hover image,
toolbarview > .top-bar windowcontrols button.minimize:hover > image,
toolbarview > .top-bar windowcontrols > button.minimize:hover image,
toolbarview > .top-bar windowcontrols > button.minimize:hover > image,
navigation-split-view windowcontrols button.minimize:hover image,
navigation-split-view windowcontrols > button.minimize:hover image {
    min-width: ${smallIconSize}px;
    min-height: ${smallIconSize}px;
    -gtk-icon-size: ${smallIconSize}px;
    transform: none;
    -gtk-icon-transform: none;
    opacity: 1;
    color: ${btnFg};
    margin-top: -2px;
    margin-bottom: 2px;
}

/* When bottom button is hovered or active, top button remains in top half but is hidden */
toolbarview > .top-bar windowcontrols button.minimize:hover + button.maximize,
toolbarview > .top-bar windowcontrols > button.minimize:hover + button.maximize,
navigation-split-view windowcontrols button.minimize:hover + button.maximize,
navigation-split-view windowcontrols > button.minimize:hover + button.maximize,
toolbarview > .top-bar windowcontrols button.minimize:active + button.maximize,
toolbarview > .top-bar windowcontrols > button.minimize:active + button.maximize,
navigation-split-view windowcontrols button.minimize:active + button.maximize,
navigation-split-view windowcontrols > button.minimize:active + button.maximize {
    margin: 0;
    margin-left: -${btnSize}px;
    margin-top: 0;
    margin-bottom: ${bottomOuterH}px;
    min-height: ${topH}px;
    border: 1px solid transparent;
    background: transparent;
    background-color: transparent;
    background-image: none;
    box-shadow: none;
}

toolbarview > .top-bar windowcontrols button.minimize:hover + button.maximize image,
toolbarview > .top-bar windowcontrols > button.minimize:hover + button.maximize image,
navigation-split-view windowcontrols button.minimize:hover + button.maximize image,
navigation-split-view windowcontrols > button.minimize:hover + button.maximize image,
toolbarview > .top-bar windowcontrols button.minimize:active + button.maximize image,
toolbarview > .top-bar windowcontrols > button.minimize:active + button.maximize image,
navigation-split-view windowcontrols button.minimize:active + button.maximize image,
navigation-split-view windowcontrols > button.minimize:active + button.maximize image {
    min-width: 0px;
    min-height: 0px;
    -gtk-icon-size: 0px;
    transform: none;
    -gtk-icon-transform: none;
    opacity: 0;
    color: transparent;
    background: transparent;
    border: none;
    box-shadow: none;
}

/* Position 3: Top button clicked/active (top button highlighted in accent color) */
toolbarview > .top-bar windowcontrols button.maximize:active,
toolbarview > .top-bar windowcontrols > button.maximize:active,
toolbarview > .top-bar windowcontrols > button.maximize.image-button:active,
navigation-split-view windowcontrols button.maximize:active,
navigation-split-view windowcontrols > button.maximize:active,
toolbarview > .top-bar windowcontrols button.minimize + button.maximize:active,
toolbarview > .top-bar windowcontrols > button.minimize + button.maximize:active,
navigation-split-view windowcontrols button.minimize:active + button.maximize:active,
navigation-split-view windowcontrols > button.minimize:active + button.maximize:active {
    margin: 0;
    margin-left: -${btnSize}px;
    margin-top: 0;
    margin-bottom: ${bottomOuterH}px;
    min-height: ${topH}px;
    background-color: ${accentHex};
    border: 1px solid ${accentDark};
    border-radius: ${cornerVal}px ${cornerVal}px 0 0;
    color: #ffffff;
}

toolbarview > .top-bar windowcontrols button.maximize:active image,
toolbarview > .top-bar windowcontrols button.maximize:active > image,
toolbarview > .top-bar windowcontrols > button.maximize:active image,
toolbarview > .top-bar windowcontrols > button.maximize:active > image,
navigation-split-view windowcontrols button.maximize:active image,
navigation-split-view windowcontrols > button.maximize:active image {
    min-width: ${smallIconSize}px;
    min-height: ${smallIconSize}px;
    -gtk-icon-size: ${smallIconSize}px;
    transform: none;
    -gtk-icon-transform: none;
    margin-bottom: 1px;
    color: #ffffff;
    opacity: 1;
}

/* Position 3: Bottom button clicked/active (bottom button highlighted in accent color) */
toolbarview > .top-bar windowcontrols button.minimize:active,
toolbarview > .top-bar windowcontrols > button.minimize:active,
toolbarview > .top-bar windowcontrols > button.minimize.image-button:active,
navigation-split-view windowcontrols button.minimize:active,
navigation-split-view windowcontrols > button.minimize:active {
    margin: 0;
    margin-top: ${topOuterH}px;
    margin-bottom: 0;
    margin-left: 0;
    margin-right: 0;
    min-height: ${bottomH}px;
    background-color: ${accentHex};
    border: 1px solid ${accentDark};
    border-radius: 0 0 ${cornerVal}px ${cornerVal}px;
    color: #ffffff;
}

toolbarview > .top-bar windowcontrols button.minimize:active image,
toolbarview > .top-bar windowcontrols button.minimize:active > image,
toolbarview > .top-bar windowcontrols > button.minimize:active image,
toolbarview > .top-bar windowcontrols > button.minimize:active > image,
navigation-split-view windowcontrols button.minimize:active image,
navigation-split-view windowcontrols > button.minimize:active image {
    min-width: ${smallIconSize}px;
    min-height: ${smallIconSize}px;
    -gtk-icon-size: ${smallIconSize}px;
    transform: none;
    -gtk-icon-transform: none;
    opacity: 1;
    color: #ffffff;
    margin-top: -2px;
    margin-bottom: 2px;
}
toolbarview > .top-bar windowcontrols button.maximize:first-child:not(:hover):not(:active),
toolbarview > .top-bar windowcontrols > button.maximize:first-child:not(:hover):not(:active),
navigation-split-view windowcontrols button.maximize:first-child:not(:hover):not(:active),
navigation-split-view windowcontrols > button.maximize:first-child:not(:hover):not(:active) {
    margin: 0;
    margin-top: 0;
    margin-bottom: 0;
    min-height: ${closeInnerSize}px;
    border-radius: ${cornerVal}px;
    border: 1px solid ${btnBorderColor};
    background: transparent;
    background-color: transparent;
    background-image: none;
}
toolbarview > .top-bar windowcontrols button.maximize:first-child:hover,
toolbarview > .top-bar windowcontrols > button.maximize:first-child:hover,
navigation-split-view windowcontrols button.maximize:first-child:hover,
navigation-split-view windowcontrols > button.maximize:first-child:hover {
    margin: 0;
    margin-top: 0;
    margin-bottom: ${bottomOuterH}px;
    min-height: ${topH}px;
    border: 1px solid ${btnBorderColor};
    background-color: ${btnHoverBgColor};
    border-radius: ${cornerVal}px ${cornerVal}px 0 0;
}
toolbarview > .top-bar windowcontrols button.maximize + button.minimize,
toolbarview > .top-bar windowcontrols > button.maximize + button.minimize {
    margin: 0;
    margin-left: -${btnSize}px;
    margin-top: ${topOuterH}px;
    margin-bottom: 0;
    margin-right: 0;
}

/* Close button - Neutral frame in rest, red on hover/active */
toolbarview > .top-bar windowcontrols button.close,
toolbarview > .top-bar windowcontrols > button.close,
toolbarview > .top-bar windowcontrols > button.close.image-button {
    background: transparent;
    background-color: transparent;
    background-image: none;
    border: 1px solid ${btnBorderColor};
    color: ${btnFg};
    min-width: ${btnInnerW}px;
    min-height: ${closeInnerSize}px;
    border-radius: ${cornerVal}px;
    padding: 0;
    margin: 0;
    margin-left: ${controlsGap}px;
    margin-right: 1px;
    box-shadow: none;
    outline: none;
}
toolbarview > .top-bar windowcontrols button.close:first-child,
toolbarview > .top-bar windowcontrols > button.close:first-child {
    margin-left: 1px;
    margin-right: ${controlsGap}px;
}
toolbarview > .top-bar windowcontrols button.close image,
toolbarview > .top-bar windowcontrols > button.close image,
toolbarview > .top-bar windowcontrols button.close *,
toolbarview > .top-bar windowcontrols > button.close * {
    background: transparent;
    background-color: transparent;
    background-image: none;
    border: none;
    box-shadow: none;
    outline: none;
    -gtk-icon-shadow: none;
}
toolbarview > .top-bar windowcontrols button.close image,
toolbarview > .top-bar windowcontrols > button.close image,
navigation-split-view windowcontrols button.close image,
navigation-split-view windowcontrols > button.close image {
    color: ${btnFg};
    padding: 0;
    margin: 0;
    -gtk-icon-size: ${restIconSize}px;
    min-width: ${restIconSize}px;
    min-height: ${restIconSize}px;
}
toolbarview > .top-bar windowcontrols button.close:hover,
toolbarview > .top-bar windowcontrols > button.close:hover,
toolbarview > .top-bar windowcontrols > button.close.image-button:hover,
navigation-split-view windowcontrols button.close:hover,
navigation-split-view windowcontrols > button.close:hover {
    background: rgb(249, 55, 0);
    background-color: rgb(249, 55, 0);
    background-image: none;
    border: 1px solid #d92e00;
    color: #ffffff;
}
toolbarview > .top-bar windowcontrols button.close:hover image,
toolbarview > .top-bar windowcontrols > button.close:hover image,
navigation-split-view windowcontrols button.close:hover image,
navigation-split-view windowcontrols > button.close:hover image,
toolbarview > .top-bar windowcontrols button.close:hover *,
navigation-split-view windowcontrols button.close:hover * {
    color: #ffffff;
    background: transparent;
    background-color: transparent;
    background-image: none;
    border: none;
    box-shadow: none;
    outline: none;
    -gtk-icon-shadow: none;
}
toolbarview > .top-bar windowcontrols button.close:active,
toolbarview > .top-bar windowcontrols > button.close:active,
toolbarview > .top-bar windowcontrols > button.close.image-button:active,
navigation-split-view windowcontrols button.close:active,
navigation-split-view windowcontrols > button.close:active {
    background: #d92e00;
    background-color: #d92e00;
    background-image: none;
    border: 1px solid #b52600;
    color: #ffffff;
}
toolbarview > .top-bar windowcontrols button.close:active image,
toolbarview > .top-bar windowcontrols > button.close:active image,
navigation-split-view windowcontrols button.close:active image,
navigation-split-view windowcontrols > button.close:active image,
toolbarview > .top-bar windowcontrols button.close:active *,
navigation-split-view windowcontrols button.close:active * {
    color: #ffffff;
    background: transparent;
    background-color: transparent;
    background-image: none;
    border: none;
    box-shadow: none;
    outline: none;
    -gtk-icon-shadow: none;
}
` : ''}


/* Entry, Card and Boxed Lists Styling */
entry {
    border-radius: ${cornerVal}px;
    border: 1px solid ${btnBorderColor};
    color: ${btnFg};
}

.card,
card,
.boxed-list,
list.boxed-list,
list.content,
list.boxed-list-separate > row {
    border-radius: ${cornerVal}px;
    background-color: ${cardBaseHex};
    color: ${textFg};
}

.card:not(.osd),
card:not(.osd),
list.boxed-list:not(.osd),
list.boxed-list-separate > row:not(.osd) {
    border: 1px solid ${cardBorderColor};
}

/* Typography & Text Contrast: Black (#000000) & Dark Grey (#4a4a4a) in Light Mode, White (#ffffff) in Dark Mode */
window,
window.background,
window.csd,
.content-pane,
preferences-page,
preferencespage,
preferences-group,
preferencesgroup,
preferencesgroup > box,
adw-action-row,
adw-expander-row,
row.activatable,
dialog {
    color: ${textFg};
}

/* Primary text & headings: Black in Light, White in Dark */
label,
.title,
label.title,
label.heading,
heading,
preferencesgroup .title,
preferencesgroup .header .title,
preferencesgroup box.header label.title,
preferencesgroup box.header label,
adw-action-row .title,
adw-preferences-group .title,
list.boxed-list > row label.title,
list.boxed-list > row .title,
list.content > row label.title,
list.content > row .title,
ExmWindow label,
ExmInstalledPage label,
ExmBrowsePage label {
    color: ${textFg};
}

/* Secondary / Subtitle / Dim labels: Dark Grey (#4a4a4a) in Light Mode, Light Grey (#c0bfbc) in Dark Mode */
.dim-label,
label.dim-label,
.subtitle,
label.subtitle,
preferencesgroup .subtitle,
preferencesgroup .header .subtitle,
preferencesgroup box.header label.subtitle,
adw-action-row .subtitle,
adw-preferences-group .subtitle,
list.boxed-list > row label.subtitle,
list.boxed-list > row .subtitle,
list.content > row label.subtitle,
list.content > row .subtitle,
ExmWindow .subtitle,
ExmInstalledPage .subtitle,
ExmBrowsePage .subtitle,
ExmWindow label.dim-label,
ExmInstalledPage label.dim-label {
    color: ${textSecondary};
    opacity: 1;
}

/* Section headers and group titles */
preferencesgroup .title,
preferencesgroup .header .title,
preferencesgroup box.header label.title,
label.title,
label.heading,
adw-action-row .title,
adw-preferences-group .title {
    font-weight: bold;
    color: ${textFg};
}

/* Sidebar & Navigation (Coloring of Left Column) */
.sidebar-pane,
stack.sidebar-pane,
navigation-split-view > .sidebar-pane,
overlay-split-view > .sidebar-pane,
window .sidebar-pane,
window navigation-split-view > .sidebar-pane,
window overlay-split-view > .sidebar-pane {
    min-width: 260px;
    background-color: ${sidebarBgCss};
    border-right: 1px solid color-mix(in srgb, currentColor 10%, transparent);
}

/* GNOME Tweaks Sidebar (left_box) */
#left_box,
window #left_box,
window leaflet > .sidebar,
window leaflet > box:last-child,
window leaflet > box:nth-child(7),
leaflet > box:last-child,
leaflet > box:nth-child(7) {
    background-color: ${sidebarBgCss};
    border-right: 1px solid color-mix(in srgb, currentColor 10%, transparent);
    border-top: none;
    box-shadow: none;
}

#left_box:backdrop,
window .sidebar-pane:backdrop,
window navigation-split-view > .sidebar-pane:backdrop,
window overlay-split-view > .sidebar-pane:backdrop,
window #left_box:backdrop,
window leaflet > .sidebar:backdrop,
window leaflet > box:last-child:backdrop,
window leaflet > box:nth-child(7):backdrop,
leaflet > box:last-child:backdrop,
leaflet > box:nth-child(7):backdrop {
    background-color: ${sidebarBgCss};
}

/* Sidebar headerbars matching sidebar color and seamless */
headerbar.titlebar.tweak-titlebar-left,
headerbar.tweak-titlebar-left,
.titlebar.tweak-titlebar-left,
.tweak-titlebar-left,
.sidebar-pane headerbar,
.sidebar-pane toolbarview > .top-bar {
    min-width: 260px;
    background: ${sidebarBgCss};
    background-color: ${sidebarBgCss};
    background-image: none;
    border-style: solid;
    border-width: 0 1px 0 0;
    border-color: color-mix(in srgb, currentColor 10%, transparent);
    border-bottom: none;
    border-bottom-width: 0;
    box-shadow: none;
    color: #ffffff;
}

headerbar.titlebar.tweak-titlebar-left label,
headerbar.titlebar.tweak-titlebar-left .title,
headerbar.tweak-titlebar-left label,
headerbar.tweak-titlebar-left .title,
.titlebar.tweak-titlebar-left label,
.titlebar.tweak-titlebar-left .title,
.tweak-titlebar-left label,
.tweak-titlebar-left .title,
.sidebar-pane headerbar label,
.sidebar-pane headerbar .title,
.sidebar-pane headerbar windowtitle,
.sidebar-pane headerbar windowtitle .title,
.sidebar-pane toolbarview > .top-bar label,
.sidebar-pane toolbarview > .top-bar .title,
.sidebar-pane toolbarview > .top-bar windowtitle .title,
navigation-split-view > .sidebar-pane headerbar label,
navigation-split-view > .sidebar-pane headerbar .title,
overlay-split-view > .sidebar-pane headerbar label,
overlay-split-view > .sidebar-pane headerbar .title {
    color: #ffffff;
}

/* Sidebar Headerbar Buttons (Search / Lupa and 3-Dots / Menu):
   In Nautilus, GNOME Settings, GNOME Tweaks:
   Rest state: White icon, NO border, transparent background */
.sidebar-pane headerbar button:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button),
.sidebar-pane headerbar button.flat:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button),
.sidebar-pane headerbar button.image-button:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button),
.sidebar-pane headerbar togglebutton:not(.accent-button):not(.circular),
.sidebar-pane headerbar menubutton > button:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize),
.sidebar-pane headerbar splitbutton > button:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize),
.sidebar-pane .top-bar button:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button),
.sidebar-pane .top-bar button.flat:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button),
.sidebar-pane toolbarview > .top-bar button:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button),
.sidebar-pane toolbarview > .top-bar button.flat:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button),
navigation-split-view > widget.sidebar-pane headerbar button:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button),
navigation-split-view > widget.sidebar-pane headerbar button.flat:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button),
navigation-split-view > widget.sidebar-pane headerbar button.image-button:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button),
navigation-split-view > widget.sidebar-pane headerbar menubutton > button:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize),
navigation-split-view > *:first-child headerbar button:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button),
navigation-split-view > *:first-child headerbar button.flat:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button),
navigation-split-view > *:first-child headerbar menubutton > button:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize),
navigation-split-view > *:first-child .top-bar button:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button),
navigation-split-view > *:first-child .top-bar button.flat:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button),
navigation-split-view > *:first-child toolbarview > .top-bar button:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button),
navigation-split-view > .sidebar-pane headerbar button:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button),
navigation-split-view > .sidebar-pane headerbar button.flat:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button),
navigation-split-view > .sidebar-pane headerbar menubutton > button:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize),
navigation-split-view > .sidebar-pane .top-bar button:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button),
navigation-split-view > .sidebar-pane .top-bar button.flat:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button),
navigation-split-view > .sidebar-pane toolbarview > .top-bar button:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button),
navigation-split-view > .sidebar-pane toolbarview > .top-bar button.flat:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button),
overlay-split-view > widget.sidebar-pane headerbar button:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize),
overlay-split-view > widget.sidebar-pane headerbar menubutton > button:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize),
overlay-split-view > *:first-child headerbar button:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize),
overlay-split-view > *:first-child headerbar button.flat:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize),
overlay-split-view > *:first-child headerbar menubutton > button:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize),
overlay-split-view > .sidebar-pane headerbar button:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize),
overlay-split-view > .sidebar-pane headerbar button.flat:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize),
overlay-split-view > .sidebar-pane .top-bar button:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize),
overlay-split-view > .sidebar-pane .top-bar button.flat:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize),
overlay-split-view > .sidebar-pane toolbarview > .top-bar button:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize),
overlay-split-view > .sidebar-pane toolbarview > .top-bar button.flat:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize),
headerbar.titlebar.tweak-titlebar-left button:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button),
headerbar.titlebar.tweak-titlebar-left button.flat:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button),
headerbar.titlebar.tweak-titlebar-left button.image-button:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button),
headerbar.titlebar.tweak-titlebar-left menubutton > button:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize),
headerbar.tweak-titlebar-left button:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button),
headerbar.tweak-titlebar-left button.flat:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button),
headerbar.tweak-titlebar-left button.image-button:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button),
headerbar.tweak-titlebar-left menubutton > button:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize),
.titlebar.tweak-titlebar-left button:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize),
.titlebar.tweak-titlebar-left button.flat:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize),
.titlebar.tweak-titlebar-left menubutton > button:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize),
.tweak-titlebar-left button:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize),
.tweak-titlebar-left button.flat:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize),
.tweak-titlebar-left menubutton > button:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize),
#left_box headerbar button:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize),
#left_box headerbar button.flat:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize),
#left_box headerbar menubutton > button:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize),
#left_box .top-bar button:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize),
#left_box .top-bar button.flat:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize),
#left_box toolbarview > .top-bar button:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize),
#left_box toolbarview > .top-bar button.flat:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize),
leaflet > .sidebar headerbar button:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize),
leaflet > .sidebar headerbar button.flat:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize),
leaflet > .sidebar menubutton > button:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize),
leaflet > box:last-child headerbar button:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize),
leaflet > box:last-child headerbar button.flat:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize),
leaflet > box:last-child menubutton > button:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize),
leaflet > box:nth-child(7) headerbar button:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize),
leaflet > box:nth-child(7) headerbar button.flat:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize),
leaflet > box:nth-child(7) menubutton > button:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize) {
    background: transparent;
    background-color: transparent;
    border: 1px solid transparent;
    border-radius: ${cornerVal}px;
    box-shadow: none;
    color: #ffffff;
}

.sidebar-pane headerbar button:not(.accent-button):not(.circular):not(.suggested-action):not(.destructive-action):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button) image,
.sidebar-pane headerbar button.flat:not(.accent-button):not(.circular):not(.suggested-action):not(.destructive-action):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button) image,
.sidebar-pane headerbar button.image-button:not(.accent-button):not(.circular):not(.suggested-action):not(.destructive-action):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button) image,
.sidebar-pane headerbar togglebutton:not(.accent-button):not(.circular) image,
.sidebar-pane headerbar menubutton > button:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize) image,
.sidebar-pane headerbar splitbutton > button:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize) image,
.sidebar-pane .top-bar button:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button) image,
.sidebar-pane toolbarview > .top-bar button:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button) image,
navigation-split-view > widget.sidebar-pane headerbar button:not(.accent-button):not(.circular):not(.suggested-action):not(.destructive-action):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button) image,
navigation-split-view > widget.sidebar-pane headerbar menubutton > button:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize) image,
navigation-split-view > *:first-child headerbar button:not(.accent-button):not(.circular):not(.suggested-action):not(.destructive-action):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button) image,
navigation-split-view > *:first-child headerbar menubutton > button:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize) image,
navigation-split-view > *:first-child .top-bar button:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button) image,
navigation-split-view > *:first-child toolbarview > .top-bar button:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button) image,
navigation-split-view > .sidebar-pane headerbar button:not(.accent-button):not(.circular):not(.suggested-action):not(.destructive-action):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button) image,
navigation-split-view > .sidebar-pane headerbar menubutton > button:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize) image,
navigation-split-view > .sidebar-pane .top-bar button:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button) image,
navigation-split-view > .sidebar-pane toolbarview > .top-bar button:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button) image,
overlay-split-view > widget.sidebar-pane headerbar button:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize) image,
overlay-split-view > widget.sidebar-pane headerbar menubutton > button:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize) image,
overlay-split-view > *:first-child headerbar button:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize) image,
overlay-split-view > *:first-child headerbar menubutton > button:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize) image,
overlay-split-view > .sidebar-pane headerbar button:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize) image,
overlay-split-view > .sidebar-pane .top-bar button:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize) image,
overlay-split-view > .sidebar-pane toolbarview > .top-bar button:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize) image,
headerbar.titlebar.tweak-titlebar-left button:not(.accent-button):not(.circular):not(.suggested-action):not(.destructive-action):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button) image,
headerbar.titlebar.tweak-titlebar-left menubutton > button:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize) image,
headerbar.tweak-titlebar-left button:not(.accent-button):not(.circular):not(.suggested-action):not(.destructive-action):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button) image,
headerbar.tweak-titlebar-left menubutton > button:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize) image,
.titlebar.tweak-titlebar-left button:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize) image,
.titlebar.tweak-titlebar-left menubutton > button:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize) image,
.tweak-titlebar-left button:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize) image,
.tweak-titlebar-left menubutton > button:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize) image,
#left_box headerbar button:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize) image,
#left_box headerbar menubutton > button:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize) image,
#left_box .top-bar button:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize) image,
#left_box toolbarview > .top-bar button:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize) image,
leaflet > .sidebar headerbar button:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize) image,
leaflet > .sidebar menubutton > button:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize) image,
leaflet > box:last-child headerbar button:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize) image,
leaflet > box:last-child menubutton > button:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize) image,
leaflet > box:nth-child(7) headerbar button:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize) image,
leaflet > box:nth-child(7) menubutton > button:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize) image,
.sidebar-pane headerbar button:not(.close):not(.minimize):not(.maximize) label,
.sidebar-pane toolbarview > .top-bar button:not(.close):not(.minimize):not(.maximize) label,
navigation-split-view > .sidebar-pane headerbar button:not(.close):not(.minimize):not(.maximize) label,
headerbar.tweak-titlebar-left button:not(.close):not(.minimize):not(.maximize) label {
    color: #ffffff;
    opacity: 1;
}

/* Hover state on sidebar buttons: subtle transparent highlight without border */
.sidebar-pane headerbar button:hover:not(:active):not(:checked):not(.accent-button):not(.circular):not(.suggested-action):not(.destructive-action):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button),
.sidebar-pane headerbar menubutton > button:hover:not(:active):not(:checked):not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize),
.sidebar-pane .top-bar button:hover:not(:active):not(:checked):not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button),
.sidebar-pane toolbarview > .top-bar button:hover:not(:active):not(:checked):not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button),
navigation-split-view > widget.sidebar-pane headerbar button:hover:not(:active):not(:checked):not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button),
navigation-split-view > widget.sidebar-pane headerbar menubutton > button:hover:not(:active):not(:checked):not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize),
navigation-split-view > *:first-child headerbar button:hover:not(:active):not(:checked):not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button),
navigation-split-view > *:first-child .top-bar button:hover:not(:active):not(:checked):not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button),
navigation-split-view > .sidebar-pane headerbar button:hover:not(:active):not(:checked):not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button),
navigation-split-view > .sidebar-pane .top-bar button:hover:not(:active):not(:checked):not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button),
navigation-split-view > .sidebar-pane toolbarview > .top-bar button:hover:not(:active):not(:checked):not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button),
overlay-split-view > widget.sidebar-pane headerbar button:hover:not(:active):not(:checked):not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize),
overlay-split-view > *:first-child headerbar button:hover:not(:active):not(:checked):not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize),
overlay-split-view > .sidebar-pane headerbar button:hover:not(:active):not(:checked):not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize),
headerbar.titlebar.tweak-titlebar-left button:hover:not(:active):not(:checked):not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize),
headerbar.titlebar.tweak-titlebar-left menubutton > button:hover:not(:active):not(:checked):not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize),
headerbar.tweak-titlebar-left button:hover:not(:active):not(:checked):not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize),
headerbar.tweak-titlebar-left menubutton > button:hover:not(:active):not(:checked):not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize),
.titlebar.tweak-titlebar-left button:hover:not(:active):not(:checked):not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize),
.tweak-titlebar-left button:hover:not(:active):not(:checked):not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize),
#left_box headerbar button:hover:not(:active):not(:checked):not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize),
#left_box toolbarview > .top-bar button:hover:not(:active):not(:checked):not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize),
leaflet > .sidebar headerbar button:hover:not(:active):not(:checked):not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize),
leaflet > box:last-child headerbar button:hover:not(:active):not(:checked):not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize),
leaflet > box:nth-child(7) headerbar button:hover:not(:active):not(:checked):not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize),
.sidebar-pane menubutton > button:hover:not(:active):not(:checked):not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize) {
    background: rgba(255, 255, 255, 0.16);
    background-color: rgba(255, 255, 255, 0.16);
    border: 1px solid rgba(255, 255, 255, 0.35);
    border-radius: ${cornerVal}px;
    box-shadow: none;
    color: #ffffff;
}

.sidebar-pane headerbar button:hover:not(:active):not(:checked):not(.close):not(.minimize):not(.maximize) image,
.sidebar-pane headerbar menubutton > button:hover:not(:active):not(:checked):not(.close):not(.minimize):not(.maximize) image,
navigation-split-view > widget.sidebar-pane headerbar button:hover:not(:active):not(:checked):not(.close):not(.minimize):not(.maximize) image,
navigation-split-view > widget.sidebar-pane headerbar menubutton > button:hover:not(:active):not(:checked):not(.close):not(.minimize):not(.maximize) image,
navigation-split-view > *:first-child headerbar button:hover:not(:active):not(:checked):not(.close):not(.minimize):not(.maximize) image,
navigation-split-view > *:first-child .top-bar button:hover:not(:active):not(:checked):not(.close):not(.minimize):not(.maximize) image,
navigation-split-view > .sidebar-pane headerbar button:hover:not(:active):not(:checked):not(.close):not(.minimize):not(.maximize) image,
headerbar.tweak-titlebar-left button:hover:not(:active):not(:checked):not(.close):not(.minimize):not(.maximize) image,
headerbar.tweak-titlebar-left menubutton > button:hover:not(:active):not(:checked):not(.close):not(.minimize):not(.maximize) image {
    color: #ffffff;
    opacity: 1;
}

/* Clicked / Active / Checked state: Square border appears! */
.sidebar-pane headerbar button:active:not(.accent-button):not(.circular):not(.destructive-action):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button),
.sidebar-pane headerbar button:checked:not(.accent-button):not(.circular):not(.destructive-action):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button),
.sidebar-pane headerbar menubutton > button:active:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize),
.sidebar-pane headerbar menubutton > button:checked:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize),
.sidebar-pane .top-bar button:active:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button),
.sidebar-pane .top-bar button:checked:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button),
.sidebar-pane toolbarview > .top-bar button:active:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button),
.sidebar-pane toolbarview > .top-bar button:checked:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button),
navigation-split-view > widget.sidebar-pane headerbar button:active:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button),
navigation-split-view > widget.sidebar-pane headerbar button:checked:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button),
navigation-split-view > widget.sidebar-pane headerbar menubutton > button:active:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize),
navigation-split-view > widget.sidebar-pane headerbar menubutton > button:checked:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize),
navigation-split-view > *:first-child headerbar button:active:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button),
navigation-split-view > *:first-child headerbar button:checked:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button),
navigation-split-view > *:first-child .top-bar button:active:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button),
navigation-split-view > *:first-child .top-bar button:checked:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button),
navigation-split-view > .sidebar-pane headerbar button:active:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button),
navigation-split-view > .sidebar-pane headerbar button:checked:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button),
navigation-split-view > .sidebar-pane .top-bar button:active:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button),
navigation-split-view > .sidebar-pane .top-bar button:checked:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button),
navigation-split-view > .sidebar-pane toolbarview > .top-bar button:active:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button),
navigation-split-view > .sidebar-pane toolbarview > .top-bar button:checked:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize):not(.nautilus-path-button),
overlay-split-view > widget.sidebar-pane headerbar button:active:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize),
overlay-split-view > widget.sidebar-pane headerbar button:checked:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize),
overlay-split-view > *:first-child headerbar button:active:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize),
overlay-split-view > *:first-child headerbar button:checked:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize),
overlay-split-view > .sidebar-pane headerbar button:active:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize),
overlay-split-view > .sidebar-pane headerbar button:checked:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize),
headerbar.titlebar.tweak-titlebar-left button:active:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize),
headerbar.titlebar.tweak-titlebar-left button:checked:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize),
headerbar.titlebar.tweak-titlebar-left menubutton > button:active:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize),
headerbar.titlebar.tweak-titlebar-left menubutton > button:checked:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize),
headerbar.tweak-titlebar-left button:active:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize),
headerbar.tweak-titlebar-left button:checked:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize),
headerbar.tweak-titlebar-left menubutton > button:active:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize),
headerbar.tweak-titlebar-left menubutton > button:checked:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize),
.titlebar.tweak-titlebar-left button:active:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize),
.titlebar.tweak-titlebar-left button:checked:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize),
.tweak-titlebar-left button:active:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize),
.tweak-titlebar-left button:checked:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize),
#left_box headerbar button:active:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize),
#left_box headerbar button:checked:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize),
#left_box toolbarview > .top-bar button:active:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize),
#left_box toolbarview > .top-bar button:checked:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize),
leaflet > .sidebar headerbar button:active:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize),
leaflet > .sidebar headerbar button:checked:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize),
leaflet > box:last-child headerbar button:active:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize),
leaflet > box:last-child headerbar button:checked:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize),
leaflet > box:nth-child(7) headerbar button:active:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize),
leaflet > box:nth-child(7) headerbar button:checked:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize),
.sidebar-pane menubutton > button:active:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize),
.sidebar-pane menubutton > button:checked:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize) {
    background: rgba(255, 255, 255, 0.22);
    background-color: rgba(255, 255, 255, 0.22);
    border: 1px solid rgba(255, 255, 255, 0.50);
    border-radius: ${cornerVal}px;
    box-shadow: none;
    color: #ffffff;
}

.sidebar-pane headerbar button:active:not(.accent-button):not(.circular):not(.destructive-action):not(.close):not(.minimize):not(.maximize) image,
.sidebar-pane headerbar button:checked:not(.accent-button):not(.circular):not(.destructive-action):not(.close):not(.minimize):not(.maximize) image,
.sidebar-pane headerbar menubutton > button:active:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize) image,
.sidebar-pane headerbar menubutton > button:checked:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize) image,
.sidebar-pane .top-bar button:active:not(.close):not(.minimize):not(.maximize) image,
.sidebar-pane .top-bar button:checked:not(.close):not(.minimize):not(.maximize) image,
.sidebar-pane toolbarview > .top-bar button:active:not(.close):not(.minimize):not(.maximize) image,
.sidebar-pane toolbarview > .top-bar button:checked:not(.close):not(.minimize):not(.maximize) image,
navigation-split-view > widget.sidebar-pane headerbar button:active:not(.close):not(.minimize):not(.maximize) image,
navigation-split-view > widget.sidebar-pane headerbar button:checked:not(.close):not(.minimize):not(.maximize) image,
navigation-split-view > widget.sidebar-pane headerbar menubutton > button:active:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize) image,
navigation-split-view > widget.sidebar-pane headerbar menubutton > button:checked:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize) image,
navigation-split-view > *:first-child headerbar button:active:not(.close):not(.minimize):not(.maximize) image,
navigation-split-view > *:first-child headerbar button:checked:not(.close):not(.minimize):not(.maximize) image,
navigation-split-view > *:first-child .top-bar button:active:not(.close):not(.minimize):not(.maximize) image,
navigation-split-view > *:first-child .top-bar button:checked:not(.close):not(.minimize):not(.maximize) image,
navigation-split-view > .sidebar-pane headerbar button:active:not(.close):not(.minimize):not(.maximize) image,
navigation-split-view > .sidebar-pane headerbar button:checked:not(.close):not(.minimize):not(.maximize) image,
navigation-split-view > .sidebar-pane .top-bar button:active:not(.close):not(.minimize):not(.maximize) image,
navigation-split-view > .sidebar-pane .top-bar button:checked:not(.close):not(.minimize):not(.maximize) image,
navigation-split-view > .sidebar-pane toolbarview > .top-bar button:active:not(.close):not(.minimize):not(.maximize) image,
navigation-split-view > .sidebar-pane toolbarview > .top-bar button:checked:not(.close):not(.minimize):not(.maximize) image,
overlay-split-view > widget.sidebar-pane headerbar button:active:not(.close):not(.minimize):not(.maximize) image,
overlay-split-view > widget.sidebar-pane headerbar button:checked:not(.close):not(.minimize):not(.maximize) image,
overlay-split-view > *:first-child headerbar button:active:not(.close):not(.minimize):not(.maximize) image,
overlay-split-view > *:first-child headerbar button:checked:not(.close):not(.minimize):not(.maximize) image,
overlay-split-view > .sidebar-pane headerbar button:active:not(.close):not(.minimize):not(.maximize) image,
overlay-split-view > .sidebar-pane headerbar button:checked:not(.close):not(.minimize):not(.maximize) image,
headerbar.titlebar.tweak-titlebar-left button:active:not(.close):not(.minimize):not(.maximize) image,
headerbar.titlebar.tweak-titlebar-left button:checked:not(.close):not(.minimize):not(.maximize) image,
headerbar.tweak-titlebar-left button:active:not(.close):not(.minimize):not(.maximize) image,
headerbar.tweak-titlebar-left button:checked:not(.close):not(.minimize):not(.maximize) image,
headerbar.tweak-titlebar-left menubutton > button:active:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize) image,
headerbar.tweak-titlebar-left menubutton > button:checked:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize) image,
.titlebar.tweak-titlebar-left button:active:not(.close):not(.minimize):not(.maximize) image,
.titlebar.tweak-titlebar-left button:checked:not(.close):not(.minimize):not(.maximize) image,
.tweak-titlebar-left button:active:not(.close):not(.minimize):not(.maximize) image,
.tweak-titlebar-left button:checked:not(.close):not(.minimize):not(.maximize) image,
#left_box headerbar button:active:not(.close):not(.minimize):not(.maximize) image,
#left_box headerbar button:checked:not(.close):not(.minimize):not(.maximize) image,
#left_box toolbarview > .top-bar button:active:not(.close):not(.minimize):not(.maximize) image,
#left_box toolbarview > .top-bar button:checked:not(.close):not(.minimize):not(.maximize) image,
leaflet > .sidebar headerbar button:active:not(.close):not(.minimize):not(.maximize) image,
leaflet > .sidebar headerbar button:checked:not(.close):not(.minimize):not(.maximize) image,
leaflet > box:last-child headerbar button:active:not(.close):not(.minimize):not(.maximize) image,
leaflet > box:last-child headerbar button:checked:not(.close):not(.minimize):not(.maximize) image,
leaflet > box:nth-child(7) headerbar button:active:not(.close):not(.minimize):not(.maximize) image,
leaflet > box:nth-child(7) headerbar button:checked:not(.close):not(.minimize):not(.maximize) image,
.sidebar-pane menubutton > button:active:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize) image,
.sidebar-pane menubutton > button:checked:not(.accent-button):not(.circular):not(.close):not(.minimize):not(.maximize) image {
    color: #ffffff;
    opacity: 1;
}

headerbar.titlebar.tweak-titlebar-left:backdrop,
headerbar.tweak-titlebar-left:backdrop,
.titlebar.tweak-titlebar-left:backdrop,
.tweak-titlebar-left:backdrop,
.sidebar-pane headerbar:backdrop,
.sidebar-pane toolbarview > .top-bar:backdrop {
    background: ${sidebarBgCss};
    background-color: ${sidebarBgCss};
    background-image: none;
    border-style: solid;
    border-width: 0 1px 0 0;
    border-color: color-mix(in srgb, currentColor 10%, transparent);
    border-bottom: none;
    border-bottom-width: 0;
    box-shadow: none;
}

headerbar.tweak-titlebar-left > windowhandle,
headerbar.tweak-titlebar-left > windowhandle > box,
headerbar.tweak-titlebar-left box,
.tweak-titlebar-left > windowhandle,
.tweak-titlebar-left > windowhandle > box,
.tweak-titlebar-left box {
    background: transparent;
    background-color: transparent;
    border: none;
    box-shadow: none;
}

/* Split views & sidebar containers transparency */
overlay-split-view,
navigation-split-view,
overlay-split-view.view,
navigation-split-view.view,
.content-pane,
navigation-split-view > .content-pane,
overlay-split-view > .content-pane,
#header,
leaflet#header,
#main_leaflet,
adw-leaflet {
    background: transparent;
    background-color: transparent;
    border: none;
    box-shadow: none;
}

/* Sidebar inner containers transparency */
#left_box box,
#left_box row > box,
#left_box searchbar,
#left_box searchbar > revealer > box,
#left_box scrolledwindow,
#left_box scrolledwindow > viewport,
#left_box list,
#left_box list.view,
#left_box row,
leaflet > box:last-child box,
leaflet > box:last-child row > box,
leaflet > box:last-child searchbar,
leaflet > box:last-child searchbar > revealer > box,
leaflet > box:last-child scrolledwindow,
leaflet > box:last-child scrolledwindow > viewport,
leaflet > box:last-child list,
leaflet > box:last-child list.view,
leaflet > box:last-child row,
.sidebar-pane searchbar,
.sidebar-pane searchbar > revealer > box,
.sidebar-pane scrolledwindow,
.sidebar-pane scrolledwindow > viewport,
.sidebar-pane listview,
.sidebar-pane list,
.sidebar-pane list.view,
.sidebar-pane row,
.sidebar-pane stack,
.sidebar-pane toolbarview,
.sidebar-pane toolbarview > widget:not(.top-bar):not(.bottom-bar),
.sidebar-pane toolbarview > .content,
.sidebar-pane navigation-page,
.sidebar-pane navigation-view,
NautilusSidebar,
NautilusSidebarRow,
#places_sidebar,
places_sidebar,
placessidebar,
placesview,
placesview list,
placesview list.view,
placesview row,
navigation-split-view > .sidebar-pane scrolledwindow,
overlay-split-view > .sidebar-pane scrolledwindow,
navigation-split-view > .sidebar-pane list.view,
overlay-split-view > .sidebar-pane list.view {
    background: transparent;
    background-color: transparent;
}

#left_box searchbar,
#left_box searchbar > revealer > box,
leaflet > box:last-child searchbar,
leaflet > box:last-child searchbar > revealer > box,
leaflet > box:nth-child(7) searchbar,
leaflet > box:nth-child(7) searchbar > revealer > box,
.sidebar-pane searchbar,
.sidebar-pane searchbar > revealer > box,
#left_box scrolledwindow,
leaflet > box:last-child scrolledwindow,
leaflet > box:nth-child(7) scrolledwindow,
.sidebar-pane scrolledwindow {
    border: none;
    border-top: none;
    border-bottom: none;
    box-shadow: none;
}

.navigation-sidebar,
navigation-sidebar,
placessidebar,
placessidebar > list,
placesview,
placesview > list,
.places-tree {
    padding-top: 10px;
    padding-bottom: 6px;
    background: transparent;
    background-color: transparent;
}

.navigation-sidebar > row,
navigation-sidebar > row,
placessidebar row,
placesview row,
NautilusSidebarRow,
#places_sidebar row,
#left_box list > row,
#left_box row {
    margin: 2px 8px;
    padding: 3px 8px;
    background: transparent;
    background-color: transparent;
    border: 1px solid transparent;
}

/* Sidebar shortcut icons: always clearly visible next to shortcuts with full opacity and crisp contrast */
window .sidebar-pane list > row:not(:selected) image,
window .sidebar-pane row:not(:selected) image,
window .sidebar-pane list > row:not(:selected) .sidebar-icon,
window .sidebar-pane row:not(:selected) .sidebar-icon,
window .navigation-sidebar row:not(:selected) image,
window .navigation-sidebar row:not(:selected) .sidebar-icon,
window placessidebar row:not(:selected) image,
window placessidebar row:not(:selected) .sidebar-icon,
window placesview row:not(:selected) image,
window NautilusSidebarRow:not(:selected) image,
window #places_sidebar row:not(:selected) image,
window #left_box list > row:not(:selected) image,
window #left_box row:not(:selected) image,
leaflet > box:last-child row:not(:selected) image {
    color: #ffffff;
    opacity: 1;
    -gtk-icon-size: 16px;
}

/* Sidebar shortcut labels in rest state - white text */
window .sidebar-pane list > row:not(:selected) label,
window .sidebar-pane row:not(:selected) label,
window .navigation-sidebar row:not(:selected) label,
window placessidebar row:not(:selected) label,
window placesview row:not(:selected) label,
window NautilusSidebarRow:not(:selected) label,
window #places_sidebar row:not(:selected) label,
window #left_box list > row:not(:selected) label,
window #left_box row:not(:selected) label,
leaflet > box:last-child row:not(:selected) label {
    color: #ffffff;
    font-weight: normal;
}

/* All sidebar labels, titles, headings and icons: White (#ffffff) */
.sidebar-pane label,
stack.sidebar-pane label,
navigation-split-view > .sidebar-pane label,
overlay-split-view > .sidebar-pane label,
#left_box label,
window #left_box label,
.navigation-sidebar label,
navigation-sidebar label,
placessidebar label,
placesview label,
#places_sidebar label,
NautilusSidebarRow label,
leaflet > .sidebar label,
leaflet > box:last-child label,
leaflet > box:nth-child(7) label {
    color: #ffffff;
}

.sidebar-pane image,
stack.sidebar-pane image,
navigation-split-view > .sidebar-pane image,
overlay-split-view > .sidebar-pane image,
#left_box image,
window #left_box image,
.navigation-sidebar image,
navigation-sidebar image,
placessidebar image,
placesview image,
#places_sidebar image,
NautilusSidebarRow image,
leaflet > .sidebar image,
leaflet > box:last-child image,
leaflet > box:nth-child(7) image {
    color: #ffffff;
    opacity: 1;
}

/* Sidebar subtitles, headings and dim labels */
.sidebar-pane .dim-label,
.sidebar-pane label.dim-label,
.sidebar-pane .subtitle,
.sidebar-pane label.subtitle,
#left_box .dim-label,
#left_box label.dim-label,
#left_box .subtitle,
#left_box label.subtitle,
.navigation-sidebar .dim-label,
.navigation-sidebar label.dim-label,
.navigation-sidebar .subtitle,
.navigation-sidebar label.subtitle,
placessidebar .dim-label,
placesview .dim-label,
#places_sidebar .dim-label,
NautilusSidebarRow .dim-label,
leaflet > box:last-child .dim-label,
leaflet > box:nth-child(7) .dim-label,
leaflet > .sidebar .dim-label {
    color: rgba(255, 255, 255, 0.80);
    opacity: 1;
}

.sidebar-pane .heading,
.sidebar-pane label.heading,
.sidebar-pane .title,
.sidebar-pane label.title,
#left_box .heading,
#left_box label.heading,
#left_box .title,
#left_box label.title,
.navigation-sidebar .heading,
.navigation-sidebar label.heading,
.navigation-sidebar .title,
.navigation-sidebar label.title,
placessidebar .heading,
placessidebar label.heading,
placesview .heading,
placesview label.heading {
    color: #ffffff;
    font-weight: bold;
}

/* Sidebar buttons (e.g. unmount, eject, search) */
NautilusSidebarRow button,
.navigation-sidebar button,
placessidebar button,
placesview button,
.sidebar-pane button {
    color: #ffffff;
}
NautilusSidebarRow button image,
.navigation-sidebar button image,
placessidebar button image,
placesview button image,
.sidebar-pane button image {
    color: #ffffff;
}

/* Sidebar hover row: white highlight bar with accent-colored text and icon */
window .navigation-sidebar > row:hover:not(:selected),
window .navigation-sidebar row:hover:not(:selected),
window navigation-sidebar > row:hover:not(:selected),
window navigation-sidebar row:hover:not(:selected),
window sidebar row:hover:not(:selected),
window placessidebar row:hover:not(:selected),
window placesview row:hover:not(:selected),
window .sidebar-pane list > row:hover:not(:selected),
window .sidebar-pane row:hover:not(:selected),
window NautilusSidebarRow:hover:not(:selected),
window #places_sidebar row:hover:not(:selected),
window #left_box list > row:hover:not(:selected),
window #left_box row:hover:not(:selected),
leaflet > box:last-child row:hover:not(:selected),
.navigation-sidebar > row:hover:not(:selected),
.navigation-sidebar row:hover:not(:selected),
navigation-sidebar > row:hover:not(:selected),
navigation-sidebar row:hover:not(:selected),
sidebar row:hover:not(:selected),
placessidebar row:hover:not(:selected),
placesview row:hover:not(:selected),
.sidebar-pane list > row:hover:not(:selected),
.sidebar-pane row:hover:not(:selected),
NautilusSidebarRow:hover:not(:selected),
#places_sidebar row:hover:not(:selected),
#left_box list > row:hover:not(:selected),
#left_box row:hover:not(:selected) {
    background: rgba(255, 255, 255, 0.50);
    background-color: rgba(255, 255, 255, 0.50);
    border: 1px solid transparent;
    border-radius: ${cornerVal}px;
    box-shadow: none;
}

window .navigation-sidebar row:hover:not(:selected) label,
window navigation-sidebar row:hover:not(:selected) label,
window sidebar row:hover:not(:selected) label,
window placessidebar row:hover:not(:selected) label,
window placesview row:hover:not(:selected) label,
window .sidebar-pane list > row:hover:not(:selected) label,
window .sidebar-pane row:hover:not(:selected) label,
window NautilusSidebarRow:hover:not(:selected) label,
window #places_sidebar row:hover:not(:selected) label,
window #left_box list > row:hover:not(:selected) label,
window #left_box row:hover:not(:selected) label,
leaflet > box:last-child row:hover:not(:selected) label,
.navigation-sidebar row:hover:not(:selected) label,
navigation-sidebar row:hover:not(:selected) label,
sidebar row:hover:not(:selected) label,
placessidebar row:hover:not(:selected) label,
placesview row:hover:not(:selected) label,
.sidebar-pane list > row:hover:not(:selected) label,
.sidebar-pane row:hover:not(:selected) label,
NautilusSidebarRow:hover:not(:selected) label,
#places_sidebar row:hover:not(:selected) label,
#left_box list > row:hover:not(:selected) label,
#left_box row:hover:not(:selected) label {
    color: #ffffff;
    font-weight: normal;
}

window .navigation-sidebar row:hover:not(:selected) image,
window .navigation-sidebar row:hover:not(:selected) .sidebar-icon,
window navigation-sidebar row:hover:not(:selected) image,
window navigation-sidebar row:hover:not(:selected) .sidebar-icon,
window sidebar row:hover:not(:selected) image,
window sidebar row:hover:not(:selected) .sidebar-icon,
window placessidebar row:hover:not(:selected) image,
window placessidebar row:hover:not(:selected) .sidebar-icon,
window placesview row:hover:not(:selected) image,
window placesview row:hover:not(:selected) .sidebar-icon,
window .sidebar-pane list > row:hover:not(:selected) image,
window .sidebar-pane list > row:hover:not(:selected) .sidebar-icon,
window .sidebar-pane row:hover:not(:selected) image,
window .sidebar-pane row:hover:not(:selected) .sidebar-icon,
window NautilusSidebarRow:hover:not(:selected) image,
window NautilusSidebarRow:hover:not(:selected) .sidebar-icon,
window #places_sidebar row:hover:not(:selected) image,
window #places_sidebar row:hover:not(:selected) .sidebar-icon,
window #left_box list > row:hover:not(:selected) image,
window #left_box list > row:hover:not(:selected) .sidebar-icon,
window #left_box row:hover:not(:selected) image,
window #left_box row:hover:not(:selected) .sidebar-icon,
leaflet > box:last-child row:hover:not(:selected) image,
leaflet > box:last-child row:hover:not(:selected) .sidebar-icon,
.navigation-sidebar row:hover:not(:selected) image,
.navigation-sidebar row:hover:not(:selected) .sidebar-icon,
navigation-sidebar row:hover:not(:selected) image,
navigation-sidebar row:hover:not(:selected) .sidebar-icon,
sidebar row:hover:not(:selected) image,
sidebar row:hover:not(:selected) .sidebar-icon,
placessidebar row:hover:not(:selected) image,
placessidebar row:hover:not(:selected) .sidebar-icon,
placesview row:hover:not(:selected) image,
placesview row:hover:not(:selected) .sidebar-icon,
.sidebar-pane list > row:hover:not(:selected) image,
.sidebar-pane list > row:hover:not(:selected) .sidebar-icon,
.sidebar-pane row:hover:not(:selected) image,
.sidebar-pane row:hover:not(:selected) .sidebar-icon,
NautilusSidebarRow:hover:not(:selected) image,
NautilusSidebarRow:hover:not(:selected) .sidebar-icon,
#places_sidebar row:hover:not(:selected) image,
#places_sidebar row:hover:not(:selected) .sidebar-icon,
#left_box list > row:hover:not(:selected) image,
#left_box list > row:hover:not(:selected) .sidebar-icon,
#left_box row:hover:not(:selected) image,
#left_box row:hover:not(:selected) .sidebar-icon {
    color: #ffffff;
    opacity: 1;
}

window .navigation-sidebar row:hover:not(:selected) button,
window .sidebar-pane row:hover:not(:selected) button,
window placessidebar row:hover:not(:selected) button,
window .navigation-sidebar row:hover:not(:selected) button image,
window .sidebar-pane row:hover:not(:selected) button image,
window placessidebar row:hover:not(:selected) button image {
    color: #ffffff;
}

window .sidebar-pane row:hover:not(:selected) .dim-label,
window .navigation-sidebar row:hover:not(:selected) .dim-label,
window placessidebar row:hover:not(:selected) .dim-label {
    color: rgba(255, 255, 255, 0.90);
    opacity: 0.9;
}

/* Sidebar selected row (clicked shortcut) - white background with accent text and icon */
window .navigation-sidebar row:selected,
window navigation-sidebar row:selected,
window sidebar row:selected,
window placessidebar row:selected,
window placesview row:selected,
window .sidebar-pane list > row:selected,
window .sidebar-pane row:selected,
window NautilusSidebarRow:selected,
window #places_sidebar row:selected,
window #left_box list > row:selected,
window #left_box row:selected,
leaflet > box:last-child row:selected,
window .navigation-sidebar row:active,
window navigation-sidebar row:active,
window sidebar row:active,
window placessidebar row:active,
window placesview row:active,
window .sidebar-pane list > row:active,
window .sidebar-pane row:active,
window NautilusSidebarRow:active,
window #places_sidebar row:active,
window #left_box list > row:active,
window #left_box row:active,
leaflet > box:last-child row:active,
.navigation-sidebar row:selected,
navigation-sidebar row:selected,
sidebar row:selected,
placessidebar row:selected,
placesview row:selected,
.sidebar-pane list > row:selected,
.sidebar-pane row:selected,
NautilusSidebarRow:selected,
#places_sidebar row:selected,
#left_box list > row:selected,
#left_box row:selected,
.navigation-sidebar row:active,
navigation-sidebar row:active,
sidebar row:active,
placessidebar row:active,
placesview row:active,
.sidebar-pane list > row:active,
.sidebar-pane row:active,
NautilusSidebarRow:active,
#places_sidebar row:active,
#left_box list > row:active,
#left_box row:active {
    background: #ffffff;
    background-color: #ffffff;
    border: 1px solid #ffffff;
    border-radius: ${cornerVal}px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.22);
}

window .navigation-sidebar row:selected label,
window navigation-sidebar row:selected label,
window sidebar row:selected label,
window placessidebar row:selected label,
window placesview row:selected label,
window .sidebar-pane list > row:selected label,
window .sidebar-pane row:selected label,
window NautilusSidebarRow:selected label,
window #places_sidebar row:selected label,
window #left_box list > row:selected label,
window #left_box row:selected label,
leaflet > box:last-child row:selected label,
window .navigation-sidebar row:active label,
window navigation-sidebar row:active label,
window sidebar row:active label,
window placessidebar row:active label,
window placesview row:active label,
window .sidebar-pane list > row:active label,
window .sidebar-pane row:active label,
window NautilusSidebarRow:active label,
window #places_sidebar row:active label,
window #left_box list > row:active label,
window #left_box row:active label,
leaflet > box:last-child row:active label,
.navigation-sidebar row:selected label,
navigation-sidebar row:selected label,
sidebar row:selected label,
placessidebar row:selected label,
placesview row:selected label,
.sidebar-pane list > row:selected label,
.sidebar-pane row:selected label,
NautilusSidebarRow:selected label,
#places_sidebar row:selected label,
#left_box list > row:selected label,
#left_box row:selected label,
.navigation-sidebar row:active label,
navigation-sidebar row:active label,
sidebar row:active label,
placessidebar row:active label,
placesview row:active label,
.sidebar-pane list > row:active label,
.sidebar-pane row:active label,
NautilusSidebarRow:active label,
#places_sidebar row:active label,
#left_box list > row:active label,
#left_box row:active label {
    color: ${accentHex};
    font-weight: bold;
}

window .navigation-sidebar row:selected image,
window .navigation-sidebar row:selected .sidebar-icon,
window navigation-sidebar row:selected image,
window navigation-sidebar row:selected .sidebar-icon,
window sidebar row:selected image,
window sidebar row:selected .sidebar-icon,
window placessidebar row:selected image,
window placessidebar row:selected .sidebar-icon,
window placesview row:selected image,
window placesview row:selected .sidebar-icon,
window .sidebar-pane list > row:selected image,
window .sidebar-pane list > row:selected .sidebar-icon,
window .sidebar-pane row:selected image,
window .sidebar-pane row:selected .sidebar-icon,
window NautilusSidebarRow:selected image,
window NautilusSidebarRow:selected .sidebar-icon,
window #places_sidebar row:selected image,
window #places_sidebar row:selected .sidebar-icon,
window #left_box list > row:selected image,
window #left_box list > row:selected .sidebar-icon,
window #left_box row:selected image,
window #left_box row:selected .sidebar-icon,
leaflet > box:last-child row:selected image,
leaflet > box:last-child row:selected .sidebar-icon,
window .navigation-sidebar row:active image,
window .navigation-sidebar row:active .sidebar-icon,
window navigation-sidebar row:active image,
window navigation-sidebar row:active .sidebar-icon,
window sidebar row:active image,
window sidebar row:active .sidebar-icon,
window placessidebar row:active image,
window placessidebar row:active .sidebar-icon,
window placesview row:active image,
window placesview row:active .sidebar-icon,
window .sidebar-pane list > row:active image,
window .sidebar-pane list > row:active .sidebar-icon,
window .sidebar-pane row:active image,
window .sidebar-pane row:active .sidebar-icon,
window NautilusSidebarRow:active image,
window NautilusSidebarRow:active .sidebar-icon,
window #places_sidebar row:active image,
window #places_sidebar row:active .sidebar-icon,
window #left_box list > row:active image,
window #left_box list > row:active .sidebar-icon,
window #left_box row:active image,
window #left_box row:active .sidebar-icon,
leaflet > box:last-child row:active image,
leaflet > box:last-child row:active .sidebar-icon,
.navigation-sidebar row:selected image,
.navigation-sidebar row:selected .sidebar-icon,
navigation-sidebar row:selected image,
navigation-sidebar row:selected .sidebar-icon,
sidebar row:selected image,
sidebar row:selected .sidebar-icon,
placessidebar row:selected image,
placessidebar row:selected .sidebar-icon,
placesview row:selected image,
placesview row:selected .sidebar-icon,
.sidebar-pane list > row:selected image,
.sidebar-pane list > row:selected .sidebar-icon,
.sidebar-pane row:selected image,
.sidebar-pane row:selected .sidebar-icon,
NautilusSidebarRow:selected image,
NautilusSidebarRow:selected .sidebar-icon,
#places_sidebar row:selected image,
#places_sidebar row:selected .sidebar-icon,
#left_box list > row:selected image,
#left_box list > row:selected .sidebar-icon,
#left_box row:selected image,
#left_box row:selected .sidebar-icon,
.navigation-sidebar row:active image,
.navigation-sidebar row:active .sidebar-icon,
navigation-sidebar row:active image,
navigation-sidebar row:active .sidebar-icon,
sidebar row:active image,
sidebar row:active .sidebar-icon,
placessidebar row:active image,
placessidebar row:active .sidebar-icon,
placesview row:active image,
placesview row:active .sidebar-icon,
.sidebar-pane list > row:active image,
.sidebar-pane list > row:active .sidebar-icon,
.sidebar-pane row:active image,
.sidebar-pane row:active .sidebar-icon,
NautilusSidebarRow:active image,
NautilusSidebarRow:active .sidebar-icon,
#places_sidebar row:active image,
#places_sidebar row:active .sidebar-icon,
#left_box list > row:active image,
#left_box list > row:active .sidebar-icon,
#left_box row:active image,
#left_box row:active .sidebar-icon {
    color: ${accentHex};
    opacity: 1;
    -gtk-icon-size: 16px;
}

window .navigation-sidebar row:selected button,
window .sidebar-pane row:selected button,
window placessidebar row:selected button,
window .navigation-sidebar row:selected button image,
window .sidebar-pane row:selected button image,
window placessidebar row:selected button image,
window .navigation-sidebar row:active button,
window .sidebar-pane row:active button,
window placessidebar row:active button,
window .navigation-sidebar row:active button image,
window .sidebar-pane row:active button image,
window placessidebar row:active button image {
    color: ${accentHex};
}

window .sidebar-pane row:selected .dim-label,
window .navigation-sidebar row:selected .dim-label,
window placessidebar row:selected .dim-label,
window .sidebar-pane row:active .dim-label,
window .navigation-sidebar row:active .dim-label,
window placessidebar row:active .dim-label {
    color: ${accentHex};
    opacity: 0.85;
}

/* Ensure sidebar view widgets stay transparent */
.sidebar-pane .view,
.sidebar-pane list.view,
#left_box .view,
#left_box list.view,
leaflet > box:last-child .view,
leaflet > box:last-child list.view,
#places_sidebar .view,
placesview list.view {
    background: transparent;
    background-color: transparent;
}

/* Window corner radius matching on bottom sidebar */
window:not(.maximized):not(.fullscreen) #left_box,
window:not(.maximized):not(.fullscreen) .sidebar-pane,
window:not(.maximized):not(.fullscreen) navigation-split-view > .sidebar-pane,
window:not(.maximized):not(.fullscreen) overlay-split-view > .sidebar-pane,
window:not(.maximized):not(.fullscreen) leaflet > .sidebar,
window:not(.maximized):not(.fullscreen) leaflet > box:last-child,
window:not(.maximized):not(.fullscreen) leaflet > box:nth-child(7) {
    border-bottom-left-radius: ${cornerVal}px;
}

/* Ensure sidebar pane inner content stays transparent */
window .sidebar-pane toolbarview > .content,
window .sidebar-pane toolbarview > widget:not(.top-bar):not(.bottom-bar),
window overlay-split-view > .sidebar-pane toolbarview > .content,
window navigation-split-view > .sidebar-pane toolbarview > .content,
window leaflet > box:last-child toolbarview > .content,
window #left_box toolbarview > .content {
    background: transparent;
    background-color: transparent;
}

/* Popover & Menus (3-dots menus, context menus, popup menus):
   Outer container is transparent, borderless and shadowless to prevent double window/frame */
popover,
popover.menu,
popover.background,
headerbar popover,
headerbar popover.menu,
.titlebar popover,
.titlebar popover.menu,
toolbarview > .top-bar popover,
toolbarview > .top-bar popover.menu,
splitbutton popover,
splitbutton popover.menu,
menubutton popover,
menubutton popover.menu,
.sidebar-pane popover,
.sidebar-pane popover.menu,
navigation-split-view > widget.sidebar-pane popover,
navigation-split-view > widget.sidebar-pane popover.menu,
navigation-split-view > .sidebar-pane popover,
navigation-split-view > .sidebar-pane popover.menu,
navigation-split-view > *:first-child popover,
navigation-split-view > *:first-child popover.menu,
overlay-split-view > widget.sidebar-pane popover,
overlay-split-view > .sidebar-pane popover,
headerbar.titlebar.tweak-titlebar-left popover,
headerbar.tweak-titlebar-left popover,
#left_box popover,
leaflet popover {
    background: transparent;
    background-color: transparent;
    border: none;
    box-shadow: none;
    padding: 0;
    color: ${textFg};
}

/* Popover card / bubble contents - single clean border and drop shadow */
popover > contents,
popover contents,
popover.menu > contents,
popover.menu contents,
headerbar popover > contents,
headerbar popover contents,
headerbar popover.menu > contents,
.titlebar popover > contents,
.titlebar popover contents,
toolbarview > .top-bar popover > contents,
toolbarview > .top-bar popover contents,
toolbarview > .top-bar popover.menu > contents,
splitbutton popover > contents,
splitbutton popover contents,
splitbutton popover.menu > contents,
menubutton popover > contents,
menubutton popover contents,
menubutton popover.menu > contents,
.sidebar-pane popover > contents,
.sidebar-pane popover contents,
.sidebar-pane popover.menu > contents,
.sidebar-pane popover.menu contents,
navigation-split-view > widget.sidebar-pane popover > contents,
navigation-split-view > widget.sidebar-pane popover contents,
navigation-split-view > widget.sidebar-pane popover.menu > contents,
navigation-split-view > .sidebar-pane popover > contents,
navigation-split-view > .sidebar-pane popover contents,
navigation-split-view > .sidebar-pane popover.menu > contents,
navigation-split-view > *:first-child popover > contents,
navigation-split-view > *:first-child popover contents,
navigation-split-view > *:first-child popover.menu > contents,
overlay-split-view > widget.sidebar-pane popover > contents,
overlay-split-view > .sidebar-pane popover > contents,
headerbar.titlebar.tweak-titlebar-left popover > contents,
headerbar.tweak-titlebar-left popover > contents,
#left_box popover > contents,
leaflet popover > contents {
    background-color: ${isDark ? '#303030' : '#ffffff'};
    color: ${textFg};
    border-radius: ${cornerVal}px;
    border: 1px solid ${isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.14)'};
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
    padding: 4px;
}

/* Popover arrow - seamless with popover contents */
popover > arrow,
popover arrow,
popover.menu > arrow,
popover.menu arrow,
headerbar popover > arrow,
.titlebar popover > arrow,
toolbarview > .top-bar popover > arrow,
splitbutton popover > arrow,
menubutton popover > arrow,
.sidebar-pane popover > arrow {
    background-color: ${isDark ? '#303030' : '#ffffff'};
    border-color: ${isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.14)'};
}

/* Popover inner text, labels, icons and modelbuttons */
popover label,
popover image,
popover modelbutton,
popover modelbutton label,
popover modelbutton image,
popover.menu label,
popover.menu image,
popover.menu modelbutton,
popover.menu modelbutton label,
popover.menu modelbutton image,
popover listview,
popover listview > row,
popover listview > row label,
popover listview > row image,
.sidebar-pane popover label,
.sidebar-pane popover image,
.sidebar-pane popover modelbutton,
.sidebar-pane popover modelbutton label,
.sidebar-pane popover modelbutton image,
.sidebar-pane popover.menu label,
.sidebar-pane popover.menu image,
.sidebar-pane popover.menu modelbutton,
.sidebar-pane popover.menu modelbutton label,
.sidebar-pane popover.menu modelbutton image,
.sidebar-pane popover listview,
.sidebar-pane popover listview > row,
.sidebar-pane popover listview > row label,
.sidebar-pane popover listview > row image,
navigation-split-view > widget.sidebar-pane popover label,
navigation-split-view > widget.sidebar-pane popover image,
navigation-split-view > widget.sidebar-pane popover modelbutton,
navigation-split-view > widget.sidebar-pane popover modelbutton label,
navigation-split-view > widget.sidebar-pane popover modelbutton image,
navigation-split-view > widget.sidebar-pane popover.menu label,
navigation-split-view > widget.sidebar-pane popover.menu image,
navigation-split-view > widget.sidebar-pane popover.menu modelbutton,
navigation-split-view > widget.sidebar-pane popover.menu modelbutton label,
navigation-split-view > widget.sidebar-pane popover.menu modelbutton image,
navigation-split-view > .sidebar-pane popover label,
navigation-split-view > .sidebar-pane popover image,
navigation-split-view > .sidebar-pane popover modelbutton,
navigation-split-view > .sidebar-pane popover modelbutton label,
navigation-split-view > .sidebar-pane popover modelbutton image,
navigation-split-view > *:first-child popover label,
navigation-split-view > *:first-child popover image,
navigation-split-view > *:first-child popover modelbutton,
navigation-split-view > *:first-child popover modelbutton label,
navigation-split-view > *:first-child popover modelbutton image,
overlay-split-view > widget.sidebar-pane popover label,
overlay-split-view > widget.sidebar-pane popover image,
overlay-split-view > widget.sidebar-pane popover modelbutton,
overlay-split-view > widget.sidebar-pane popover modelbutton label,
overlay-split-view > widget.sidebar-pane popover modelbutton image,
headerbar.titlebar.tweak-titlebar-left popover label,
headerbar.titlebar.tweak-titlebar-left popover image,
headerbar.titlebar.tweak-titlebar-left popover modelbutton,
headerbar.titlebar.tweak-titlebar-left popover modelbutton label,
headerbar.titlebar.tweak-titlebar-left popover modelbutton image,
headerbar.tweak-titlebar-left popover label,
headerbar.tweak-titlebar-left popover image,
headerbar.tweak-titlebar-left popover modelbutton,
headerbar.tweak-titlebar-left popover modelbutton label,
headerbar.tweak-titlebar-left popover modelbutton image,
#left_box popover label,
#left_box popover image,
#left_box popover modelbutton,
#left_box popover modelbutton label,
#left_box popover modelbutton image,
leaflet popover label,
leaflet popover image {
    color: ${textFg};
}

/* Popover modelbutton layout & margins */
popover modelbutton,
popover.menu modelbutton,
.sidebar-pane popover modelbutton,
.sidebar-pane popover.menu modelbutton {
    min-height: 28px;
    padding: 4px 10px;
    border-radius: ${cornerVal}px;
    background: transparent;
    background-color: transparent;
    border: none;
    box-shadow: none;
}

/* Popover buttons (e.g. zoom controls, action rows in menu) */
popover button,
popover.menu button,
.sidebar-pane popover button,
.sidebar-pane popover.menu button {
    border-radius: ${cornerVal}px;
    border: 1px solid ${btnBorderColor};
    background-color: ${btnBgColor};
    color: ${btnFg};
}

popover button label,
popover button image,
popover.menu button label,
popover.menu button image,
.sidebar-pane popover button label,
.sidebar-pane popover button image,
.sidebar-pane popover.menu button label,
.sidebar-pane popover.menu button image {
    color: ${btnFg};
}

/* Popover accelerators / secondary text */
popover accelerator,
popover .dim-label,
popover label.dim-label,
popover label.subtitle,
.sidebar-pane popover accelerator,
.sidebar-pane popover .dim-label,
.sidebar-pane popover label.dim-label,
.sidebar-pane popover.menu accelerator,
headerbar.tweak-titlebar-left popover accelerator,
#left_box popover accelerator {
    color: ${textSecondary};
}

/* Popover menu item hover & selection */
popover modelbutton:hover,
popover modelbutton:selected,
popover.menu modelbutton:hover,
popover.menu modelbutton:selected,
popover listview > row:hover,
popover listview > row:selected,
.sidebar-pane popover modelbutton:hover,
.sidebar-pane popover modelbutton:selected,
.sidebar-pane popover.menu modelbutton:hover,
.sidebar-pane popover.menu modelbutton:selected,
.sidebar-pane popover listview > row:hover,
.sidebar-pane popover listview > row:selected {
    background-color: ${accentHex};
    color: #ffffff;
    border-radius: ${cornerVal}px;
}

popover modelbutton:hover label,
popover modelbutton:hover image,
popover modelbutton:selected label,
popover modelbutton:selected image,
popover.menu modelbutton:hover label,
popover.menu modelbutton:hover image,
popover.menu modelbutton:selected label,
popover.menu modelbutton:selected image,
popover listview > row:hover label,
popover listview > row:hover image,
popover listview > row:selected label,
popover listview > row:selected image,
.sidebar-pane popover modelbutton:hover label,
.sidebar-pane popover modelbutton:hover image,
.sidebar-pane popover modelbutton:selected label,
.sidebar-pane popover modelbutton:selected image,
.sidebar-pane popover.menu modelbutton:hover label,
.sidebar-pane popover.menu modelbutton:hover image,
.sidebar-pane popover.menu modelbutton:selected label,
.sidebar-pane popover.menu modelbutton:selected image,
.sidebar-pane popover listview > row:hover label,
.sidebar-pane popover listview > row:hover image,
.sidebar-pane popover listview > row:selected label,
.sidebar-pane popover listview > row:selected image {
    color: #ffffff;
}

popover modelbutton:hover accelerator,
popover modelbutton:selected accelerator,
popover.menu modelbutton:hover accelerator,
popover.menu modelbutton:selected accelerator,
.sidebar-pane popover modelbutton:hover accelerator,
.sidebar-pane popover modelbutton:selected accelerator,
.sidebar-pane popover.menu modelbutton:hover accelerator,
.sidebar-pane popover.menu modelbutton:selected accelerator {
    color: rgba(255, 255, 255, 0.85);
}

/* Popover separator */
popover separator,
popover.menu separator,
.sidebar-pane popover separator,
.sidebar-pane popover.menu separator {
    margin: 4px 2px;
    background-color: ${isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)'};
}

/* Tooltips (popup hints on hovering buttons / overflow menu):
   In light mode: light background and subtle border with dark text.
   In dark mode: dark background and light text. */
tooltip,
tooltip.background,
.sidebar-pane tooltip,
.sidebar-pane tooltip.background,
navigation-split-view tooltip,
navigation-split-view tooltip.background,
headerbar tooltip,
headerbar tooltip.background,
window tooltip,
window tooltip.background {
    background-color: ${isDark ? '#303030' : '#ffffff'};
    background-clip: padding-box;
    border: 1px solid ${isDark ? 'rgba(255, 255, 255, 0.16)' : 'rgba(0, 0, 0, 0.15)'};
    color: ${textFg};
    border-radius: ${cornerVal}px;
    box-shadow: 0 3px 12px ${isDark ? 'rgba(0, 0, 0, 0.40)' : 'rgba(0, 0, 0, 0.18)'};
    padding: 6px 10px;
}

tooltip label,
tooltip image,
tooltip box,
tooltip box label,
tooltip box image,
.sidebar-pane tooltip label,
.sidebar-pane tooltip image,
.sidebar-pane tooltip box label,
.sidebar-pane tooltip box image,
navigation-split-view tooltip label,
navigation-split-view tooltip image,
navigation-split-view tooltip box label,
navigation-split-view tooltip box image,
headerbar tooltip label,
headerbar tooltip image,
headerbar tooltip box label,
headerbar tooltip box image {
    color: ${textFg};
}

/* ====================================================================
 * GTK3 & Native Browser Window Styling (Firefox, Chromium/Chrome CSD, Tweaks)
 * Enforce classic horizontal window control buttons (no stacked controls)
 * ==================================================================== */
window.csd decoration,
window.solid-csd decoration {
    border-radius: ${cornerVal}px;
}

/* Browser windows in GTK - classic control spacing */
window#main-window windowcontrols,
window.MozillaFirefox windowcontrols,
window.firefox windowcontrols,
window.Firefox windowcontrols,
window.google-chrome windowcontrols,
window.Google-chrome windowcontrols,
window.chromium windowcontrols,
window.Chromium windowcontrols,
window.chromium-browser windowcontrols,
window.Chrome_WidgetWin_1 windowcontrols,
headerbar.tweak-titlebar-right windowcontrols,
.tweak-titlebar-right windowcontrols,
headerbar button.titlebutton,
.titlebar button.titlebutton,
button.titlebutton {
    border-spacing: 4px;
}

/* Classic square horizontal window control buttons for Chrome, Chromium, Firefox, Tweaks and GTK3 */
window#main-window windowcontrols button,
window#main-window windowcontrols > button,
window.MozillaFirefox windowcontrols button,
window.firefox windowcontrols button,
window.google-chrome windowcontrols button,
window.google-chrome windowcontrols > button,
window.Google-chrome windowcontrols button,
window.chromium windowcontrols button,
window.chromium windowcontrols > button,
window.Chromium windowcontrols button,
window.chromium-browser windowcontrols button,
window.Chrome_WidgetWin_1 windowcontrols button,
headerbar.tweak-titlebar-right windowcontrols button,
.tweak-titlebar-right windowcontrols button,
headerbar button.titlebutton,
.titlebar button.titlebutton,
button.titlebutton {
    border-radius: ${cornerVal}px;
    border: 1px solid transparent;
    border-color: transparent;
    background-color: transparent;
    background-image: none;
    color: ${btnFg};
    min-width: ${btnSize}px;
    min-height: ${btnSize}px;
    padding: 0;
    margin: 0 1px;
    margin-left: 1px;
    margin-right: 1px;
    margin-top: 0;
    margin-bottom: 0;
    box-shadow: none;
    outline: none;
    opacity: 1;
    transition: all 120ms ease;
}

/* Disable vertical stacked controls in browsers, GNOME Tweaks, and GTK3 */
window#main-window windowcontrols button.maximize,
window#main-window windowcontrols button.minimize,
window#main-window windowcontrols button.close,
window.MozillaFirefox windowcontrols button.maximize,
window.MozillaFirefox windowcontrols button.minimize,
window.MozillaFirefox windowcontrols button.close,
window.firefox windowcontrols button.maximize,
window.firefox windowcontrols button.minimize,
window.firefox windowcontrols button.close,
window.google-chrome windowcontrols button.maximize,
window.google-chrome windowcontrols button.minimize,
window.google-chrome windowcontrols button.close,
window.Google-chrome windowcontrols button.maximize,
window.Google-chrome windowcontrols button.minimize,
window.Google-chrome windowcontrols button.close,
window.chromium windowcontrols button.maximize,
window.chromium windowcontrols button.minimize,
window.chromium windowcontrols button.close,
window.Chromium windowcontrols button.maximize,
window.Chromium windowcontrols button.minimize,
window.Chromium windowcontrols button.close,
window.chromium-browser windowcontrols button.maximize,
window.chromium-browser windowcontrols button.minimize,
window.chromium-browser windowcontrols button.close,
window.Chrome_WidgetWin_1 windowcontrols button.maximize,
window.Chrome_WidgetWin_1 windowcontrols button.minimize,
window.Chrome_WidgetWin_1 windowcontrols button.close,
headerbar.tweak-titlebar-right windowcontrols button.maximize,
headerbar.tweak-titlebar-right windowcontrols button.minimize,
headerbar.tweak-titlebar-right windowcontrols button.close,
.tweak-titlebar-right windowcontrols button.maximize,
.tweak-titlebar-right windowcontrols button.minimize,
.tweak-titlebar-right windowcontrols button.close,
headerbar button.titlebutton.maximize,
headerbar button.titlebutton.minimize,
headerbar button.titlebutton.close,
button.titlebutton.maximize,
button.titlebutton.minimize,
button.titlebutton.close {
    min-width: ${btnSize}px;
    min-height: ${btnSize}px;
    margin: 0 1px;
    margin-left: 1px;
    margin-right: 1px;
    margin-top: 0;
    margin-bottom: 0;
    border-radius: ${cornerVal}px;
    border: 1px solid transparent;
    border-color: transparent;
    background-color: transparent;
    color: ${btnFg};
    box-shadow: none;
    outline: none;
    opacity: 1;
}

/* Rest State: neutral transparent borders and background for window buttons (border appears on hover) */
window#main-window windowcontrols button:not(:hover):not(:active),
window.MozillaFirefox windowcontrols button:not(:hover):not(:active),
window.firefox windowcontrols button:not(:hover):not(:active),
window.google-chrome windowcontrols button:not(:hover):not(:active),
window.Google-chrome windowcontrols button:not(:hover):not(:active),
window.chromium windowcontrols button:not(:hover):not(:active),
window.Chromium windowcontrols button:not(:hover):not(:active),
window.chromium-browser windowcontrols button:not(:hover):not(:active),
window.Chrome_WidgetWin_1 windowcontrols button:not(:hover):not(:active),
headerbar.tweak-titlebar-right windowcontrols button:not(:hover):not(:active),
.tweak-titlebar-right windowcontrols button:not(:hover):not(:active),
headerbar button.titlebutton:not(:hover):not(:active),
.titlebar button.titlebutton:not(:hover):not(:active),
button.titlebutton:not(:hover):not(:active) {
    background-color: transparent;
    border: 1px solid transparent;
    border-color: transparent;
    color: ${btnFg};
}

window#main-window windowcontrols button.close:not(:hover):not(:active),
window.MozillaFirefox windowcontrols button.close:not(:hover):not(:active),
window.firefox windowcontrols button.close:not(:hover):not(:active),
window.google-chrome windowcontrols button.close:not(:hover):not(:active),
window.Google-chrome windowcontrols button.close:not(:hover):not(:active),
window.chromium windowcontrols button.close:not(:hover):not(:active),
window.Chromium windowcontrols button.close:not(:hover):not(:active),
window.chromium-browser windowcontrols button.close:not(:hover):not(:active),
window.Chrome_WidgetWin_1 windowcontrols button.close:not(:hover):not(:active),
headerbar.tweak-titlebar-right windowcontrols button.close:not(:hover):not(:active),
.tweak-titlebar-right windowcontrols button.close:not(:hover):not(:active),
headerbar button.titlebutton.close:not(:hover):not(:active),
.titlebar button.titlebutton.close:not(:hover):not(:active),
button.titlebutton.close:not(:hover):not(:active) {
    background-color: transparent;
    border: 1px solid transparent;
    border-color: transparent;
    color: ${btnFg};
}

window#main-window windowcontrols button.close:not(:hover):not(:active) image,
window.MozillaFirefox windowcontrols button.close:not(:hover):not(:active) image,
window.firefox windowcontrols button.close:not(:hover):not(:active) image,
window.google-chrome windowcontrols button.close:not(:hover):not(:active) image,
window.Google-chrome windowcontrols button.close:not(:hover):not(:active) image,
window.chromium windowcontrols button.close:not(:hover):not(:active) image,
window.Chromium windowcontrols button.close:not(:hover):not(:active) image,
window.chromium-browser windowcontrols button.close:not(:hover):not(:active) image,
window.Chrome_WidgetWin_1 windowcontrols button.close:not(:hover):not(:active) image,
headerbar.tweak-titlebar-right windowcontrols button.close:not(:hover):not(:active) image,
.tweak-titlebar-right windowcontrols button.close:not(:hover):not(:active) image,
headerbar button.titlebutton.close:not(:hover):not(:active) image,
.titlebar button.titlebutton.close:not(:hover):not(:active) image,
button.titlebutton.close:not(:hover):not(:active) image {
    color: ${btnFg};
}

window#main-window windowcontrols button.maximize:first-child,
window.google-chrome windowcontrols button.maximize:first-child,
window.chromium windowcontrols button.maximize:first-child,
window.Chrome_WidgetWin_1 windowcontrols button.maximize:first-child,
headerbar.tweak-titlebar-right windowcontrols button.maximize:first-child,
headerbar.tweak-titlebar-right windowcontrols button.minimize:first-child,
.tweak-titlebar-right windowcontrols button.maximize:first-child,
.tweak-titlebar-right windowcontrols button.minimize:first-child {
    min-height: ${btnSize}px;
    border-radius: ${cornerVal}px;
    margin: 0 1px;
    margin-top: 0;
    margin-bottom: 0;
}

window#main-window windowcontrols button.maximize + button.minimize,
window#main-window windowcontrols > button.maximize + button.minimize,
window.MozillaFirefox windowcontrols button.maximize + button.minimize,
window.google-chrome windowcontrols button.maximize + button.minimize,
window.google-chrome windowcontrols > button.maximize + button.minimize,
window.Google-chrome windowcontrols button.maximize + button.minimize,
window.chromium windowcontrols button.maximize + button.minimize,
window.chromium windowcontrols > button.maximize + button.minimize,
window.Chromium windowcontrols button.maximize + button.minimize,
window.Chrome_WidgetWin_1 windowcontrols button.maximize + button.minimize,
headerbar.tweak-titlebar-right windowcontrols button.maximize + button.minimize,
headerbar.tweak-titlebar-right windowcontrols button.minimize + button.maximize,
.tweak-titlebar-right windowcontrols button.maximize + button.minimize,
.tweak-titlebar-right windowcontrols button.minimize + button.maximize,
headerbar button.titlebutton.maximize + button.titlebutton.minimize,
button.titlebutton.maximize + button.titlebutton.minimize {
    margin: 0 1px;
    margin-left: 1px;
    margin-right: 1px;
    margin-top: 0;
    margin-bottom: 0;
    min-width: ${btnSize}px;
    min-height: ${btnSize}px;
    border-radius: ${cornerVal}px;
}

/* Classic full-size icons (14px) in browsers, Tweaks, and GTK3 windows */
window#main-window windowcontrols button image,
window#main-window windowcontrols button > image,
window.google-chrome windowcontrols button image,
window.google-chrome windowcontrols button > image,
window.Google-chrome windowcontrols button image,
window.chromium windowcontrols button image,
window.Chromium windowcontrols button image,
window.Chrome_WidgetWin_1 windowcontrols button image,
headerbar.tweak-titlebar-right windowcontrols button image,
headerbar.tweak-titlebar-right windowcontrols button > image,
.tweak-titlebar-right windowcontrols button image,
.tweak-titlebar-right windowcontrols button > image,
headerbar button.titlebutton image,
headerbar button.titlebutton > image,
button.titlebutton image,
button.titlebutton > image {
    opacity: 1;
    -gtk-icon-transform: none;
    transform: none;
    font-size: 14px;
    -gtk-icon-size: 14px;
    min-width: 14px;
    min-height: 14px;
    margin: 0;
    padding: 0;
    color: ${btnFg};
}

/* Hover and active highlight for classic buttons in browsers, Tweaks, and GTK3 (square frame appears on hover) */
window#main-window windowcontrols button:hover:not(.close),
window.MozillaFirefox windowcontrols button:hover:not(.close),
window.firefox windowcontrols button:hover:not(.close),
window.google-chrome windowcontrols button:hover:not(.close),
window.Google-chrome windowcontrols button:hover:not(.close),
window.chromium windowcontrols button:hover:not(.close),
window.Chromium windowcontrols button:hover:not(.close),
window.Chrome_WidgetWin_1 windowcontrols button:hover:not(.close),
headerbar.tweak-titlebar-right windowcontrols button:hover:not(.close),
.tweak-titlebar-right windowcontrols button:hover:not(.close),
headerbar button.titlebutton:hover:not(.close),
.titlebar button.titlebutton:hover:not(.close),
button.titlebutton:hover:not(.close) {
    background-color: ${btnHoverBgColor};
    border: 1px solid ${btnHoverBorderColor};
    border-color: ${btnHoverBorderColor};
    color: ${btnFg};
}

window#main-window windowcontrols button:active:not(.close),
window.MozillaFirefox windowcontrols button:active:not(.close),
window.firefox windowcontrols button:active:not(.close),
window.google-chrome windowcontrols button:active:not(.close),
window.Google-chrome windowcontrols button:active:not(.close),
window.chromium windowcontrols button:active:not(.close),
window.Chromium windowcontrols button:active:not(.close),
window.Chrome_WidgetWin_1 windowcontrols button:active:not(.close),
headerbar.tweak-titlebar-right windowcontrols button:active:not(.close),
.tweak-titlebar-right windowcontrols button:active:not(.close),
headerbar button.titlebutton:active:not(.close),
.titlebar button.titlebutton:active:not(.close),
button.titlebutton:active:not(.close) {
    background-color: ${accentHex};
    border: 1px solid ${accentDark};
    border-color: ${accentDark};
    color: #ffffff;
}

/* Red close button on hover/active */
window#main-window windowcontrols button.close:hover,
window.MozillaFirefox windowcontrols button.close:hover,
window.firefox windowcontrols button.close:hover,
window.google-chrome windowcontrols button.close:hover,
window.Google-chrome windowcontrols button.close:hover,
window.chromium windowcontrols button.close:hover,
window.Chromium windowcontrols button.close:hover,
window.Chrome_WidgetWin_1 windowcontrols button.close:hover,
headerbar.tweak-titlebar-right windowcontrols button.close:hover,
.tweak-titlebar-right windowcontrols button.close:hover,
headerbar button.titlebutton.close:hover,
.titlebar button.titlebutton.close:hover,
button.titlebutton.close:hover {
    background-color: rgb(249, 55, 0);
    border: 1px solid #d92e00;
    border-color: #d92e00;
    color: #ffffff;
}

window#main-window windowcontrols button.close:active,
window.MozillaFirefox windowcontrols button.close:active,
window.firefox windowcontrols button.close:active,
window.google-chrome windowcontrols button.close:active,
window.Google-chrome windowcontrols button.close:active,
window.chromium windowcontrols button.close:active,
window.Chromium windowcontrols button.close:active,
window.Chrome_WidgetWin_1 windowcontrols button.close:active,
headerbar.tweak-titlebar-right windowcontrols button.close:active,
.tweak-titlebar-right windowcontrols button.close:active,
headerbar button.titlebutton.close:active,
.titlebar button.titlebutton.close:active,
button.titlebutton.close:active {
    background-color: #d92e00;
    border: 1px solid #b52600;
    border-color: #b52600;
    color: #ffffff;
}

window#main-window windowcontrols button.close:hover *,
window.MozillaFirefox windowcontrols button.close:hover *,
window.firefox windowcontrols button.close:hover *,
window.google-chrome windowcontrols button.close:hover *,
window.Google-chrome windowcontrols button.close:hover *,
window.chromium windowcontrols button.close:hover *,
window.Chromium windowcontrols button.close:hover *,
window.Chrome_WidgetWin_1 windowcontrols button.close:hover *,
headerbar.tweak-titlebar-right windowcontrols button.close:hover *,
.tweak-titlebar-right windowcontrols button.close:hover *,
headerbar button.titlebutton.close:hover *,
button.titlebutton.close:hover * {
    color: #ffffff;
}

window#main-window windowcontrols button.close:active *,
window.MozillaFirefox windowcontrols button.close:active *,
window.firefox windowcontrols button.close:active *,
window.google-chrome windowcontrols button.close:active *,
window.Google-chrome windowcontrols button.close:active *,
window.chromium windowcontrols button.close:active *,
window.Chromium windowcontrols button.close:active *,
window.Chrome_WidgetWin_1 windowcontrols button.close:active *,
headerbar.tweak-titlebar-right windowcontrols button.close:active *,
.tweak-titlebar-right windowcontrols button.close:active *,
headerbar button.titlebutton.close:active *,
button.titlebutton.close:active * {
    color: #ffffff;
}
${END_MARKER}
`;
}

// =========================================================================
// SECTION: GTK CSS Files Storage & Removal
// =========================================================================

export function getGtkCssFiles() {
    const home = GLib.get_home_dir();
    const configGtk4 = GLib.build_filenamev([home, '.config', 'gtk-4.0']);
    const configGtk3 = GLib.build_filenamev([home, '.config', 'gtk-3.0']);
    const files = [
        {
            dir: configGtk4,
            file: GLib.build_filenamev([configGtk4, 'gtk.css']),
            backup: GLib.build_filenamev([configGtk4, 'gtk.css.adwita-square-bak']),
        },
        {
            dir: configGtk4,
            file: GLib.build_filenamev([configGtk4, 'gtk-dark.css']),
            backup: GLib.build_filenamev([configGtk4, 'gtk-dark.css.adwita-square-bak']),
        },
        {
            dir: configGtk3,
            file: GLib.build_filenamev([configGtk3, 'gtk.css']),
            backup: GLib.build_filenamev([configGtk3, 'gtk.css.adwita-square-bak']),
        },
        {
            dir: configGtk3,
            file: GLib.build_filenamev([configGtk3, 'gtk-dark.css']),
            backup: GLib.build_filenamev([configGtk3, 'gtk-dark.css.adwita-square-bak']),
        },
    ];

    const flatpakConfigs = [
        GLib.build_filenamev([home, '.var', 'app', 'com.google.Chrome', 'config']),
        GLib.build_filenamev([home, '.var', 'app', 'org.chromium.Chromium', 'config']),
        GLib.build_filenamev([home, '.var', 'app', 'com.brave.Browser', 'config']),
        GLib.build_filenamev([home, '.var', 'app', 'org.mozilla.firefox', 'config']),
    ];

    for (const fBase of flatpakConfigs) {
        const baseFile = Gio.File.new_for_path(fBase);
        if (baseFile.query_exists(null)) {
            for (const ver of ['gtk-4.0', 'gtk-3.0']) {
                const gtkDir = GLib.build_filenamev([fBase, ver]);
                files.push({
                    dir: gtkDir,
                    file: GLib.build_filenamev([gtkDir, 'gtk.css']),
                    backup: GLib.build_filenamev([gtkDir, 'gtk.css.adwita-square-bak']),
                });
                files.push({
                    dir: gtkDir,
                    file: GLib.build_filenamev([gtkDir, 'gtk-dark.css']),
                    backup: GLib.build_filenamev([gtkDir, 'gtk-dark.css.adwita-square-bak']),
                });
            }
        }
    }

    return files;
}

export function getGtk4CssFiles() {
    return getGtkCssFiles();
}

export function getGtk4CssPath() {
    const configDir = GLib.build_filenamev([GLib.get_home_dir(), '.config', 'gtk-4.0']);
    return {
        dir: configDir,
        file: GLib.build_filenamev([configDir, 'gtk.css']),
        backup: GLib.build_filenamev([configDir, 'gtk.css.adwita-square-bak']),
    };
}

export function saveGtk4Css(generatedCss, darkCss = null) {
    const files = getGtkCssFiles();
    for (const item of files) {
        const configDir = item.dir || GLib.path_get_dirname(item.file);
        const dirFile = Gio.File.new_for_path(configDir);
        if (!dirFile.query_exists(null)) {
            try {
                dirFile.make_directory_with_parents(null);
            } catch (_) {}
        }

        const isDarkFile = item.file.endsWith('gtk-dark.css');
        const contentForFile = (isDarkFile && darkCss) ? darkCss : generatedCss;
        const cssFile = Gio.File.new_for_path(item.file);
        let originalContent = '';

        if (cssFile.query_exists(null)) {
            const [success, contents] = cssFile.load_contents(null);
            if (success) {
                originalContent = new TextDecoder('utf-8').decode(contents);
                const backupFile = Gio.File.new_for_path(item.backup);
                if (!backupFile.query_exists(null)) {
                    try {
                        backupFile.replace_contents(
                            contents,
                            null,
                            false,
                            Gio.FileCreateFlags.NONE,
                            null
                        );
                    } catch (_) {}
                }
            }
        }

        // I clean up legacy Zukitwo markers if present
        if (originalContent.includes(LEGACY_START_MARKER)) {
            const legStart = originalContent.indexOf(LEGACY_START_MARKER);
            const legEnd = originalContent.indexOf(LEGACY_END_MARKER);
            if (legStart !== -1 && legEnd !== -1) {
                originalContent = originalContent.substring(0, legStart) + originalContent.substring(legEnd + LEGACY_END_MARKER.length);
            }
        }

        // I clean up Oldwaita markers if present
        if (originalContent.includes(OLDWAITA_START_MARKER)) {
            const oldStart = originalContent.indexOf(OLDWAITA_START_MARKER);
            const oldEnd = originalContent.indexOf(OLDWAITA_END_MARKER);
            if (oldStart !== -1 && oldEnd !== -1) {
                originalContent = originalContent.substring(0, oldStart) + originalContent.substring(oldEnd + OLDWAITA_END_MARKER.length);
            }
        }

        let updatedContent = '';
        const startIndex = originalContent.indexOf(START_MARKER);
        const endIndex = originalContent.indexOf(END_MARKER);

        if (startIndex !== -1 && endIndex !== -1) {
            let before = originalContent.substring(0, startIndex);
            let after = originalContent.substring(endIndex + END_MARKER.length);
            updatedContent = (before.trim() ? (before.trim() + '\n\n') : '') + contentForFile.trim() + (after.trim() ? ('\n\n' + after.trim()) : '');
        } else {
            let cleanOriginal = originalContent;
            updatedContent = cleanOriginal.trim() ? (cleanOriginal.trim() + '\n\n' + contentForFile.trim()) : contentForFile.trim();
        }

        try {
            GLib.file_set_contents(item.file, updatedContent + '\n');
        } catch (err) {
            console.warn(`[adwita-square] Failed to save ${item.file}:`, err);
        }
    }
    return true;
}

export function removeAdwitaSquareCss() {
    const files = getGtkCssFiles();
    for (const item of files) {
        const cssFile = Gio.File.new_for_path(item.file);
        if (!cssFile.query_exists(null)) {
            continue;
        }

        const [success, contents] = cssFile.load_contents(null);
        if (!success) {
            continue;
        }

        let content = new TextDecoder('utf-8').decode(contents);

        // I remove legacy Zukitwo markers if present
        while (content.includes(LEGACY_START_MARKER) && content.includes(LEGACY_END_MARKER)) {
            const legStart = content.indexOf(LEGACY_START_MARKER);
            const legEnd = content.indexOf(LEGACY_END_MARKER);
            if (legStart !== -1 && legEnd !== -1 && legEnd >= legStart) {
                content = content.substring(0, legStart) + content.substring(legEnd + LEGACY_END_MARKER.length);
            } else {
                break;
            }
        }

        // I remove Oldwaita markers if present
        while (content.includes(OLDWAITA_START_MARKER) && content.includes(OLDWAITA_END_MARKER)) {
            const oldStart = content.indexOf(OLDWAITA_START_MARKER);
            const oldEnd = content.indexOf(OLDWAITA_END_MARKER);
            if (oldStart !== -1 && oldEnd !== -1 && oldEnd >= oldStart) {
                content = content.substring(0, oldStart) + content.substring(oldEnd + OLDWAITA_END_MARKER.length);
            } else {
                break;
            }
        }

        // I remove Adwita Square markers if present
        while (content.includes(START_MARKER) && content.includes(END_MARKER)) {
            const startIndex = content.indexOf(START_MARKER);
            const endIndex = content.indexOf(END_MARKER);
            if (startIndex !== -1 && endIndex !== -1 && endIndex >= startIndex) {
                content = content.substring(0, startIndex) + content.substring(endIndex + END_MARKER.length);
            } else {
                break;
            }
        }

        const cleanContent = content.trim();
        if (cleanContent) {
            try {
                GLib.file_set_contents(item.file, cleanContent + '\n');
            } catch (_) {}
        } else {
            try {
                cssFile.delete(null);
            } catch (e) {
                try {
                    GLib.file_set_contents(item.file, '');
                } catch (_) {}
            }
        }
    }
}

// =========================================================================
// SECTION: Firefox userChrome.css Generator
// =========================================================================

export function generateFirefoxUserChrome(options = {}) {
    const isDark = options.variant === 'dark';
    const accentPreset = ACCENT_PRESETS[options.accentColor] || ACCENT_PRESETS.blue;
    const accentHex = accentPreset.hex;
    const cornerVal = Math.max(0, Math.min(20, options.cornerRadius !== undefined ? options.cornerRadius : 3));
    const btnSize = options.buttonSize && options.buttonSize <= 30 ? Math.max(16, options.buttonSize) : 28;

    const bgHex = isDark ? '#000000' : '#ffffff';
    const tabSelectedBg = isDark ? '#1a1a1a' : '#f0f0f0';
    const btnBorderColor = isDark ? 'rgba(255, 255, 255, 0.16)' : 'rgba(0, 0, 0, 0.16)';
    const btnBgColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)';
    const btnHoverBorderColor = isDark ? 'rgba(255, 255, 255, 0.26)' : 'rgba(0, 0, 0, 0.26)';
    const btnHover = isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.10)';

    return `${USER_CHROME_MARKER_START}
/*
 * Adwita Square - Firefox Theme (Tabs, Toolbar, Accent Borders)
 * Mode: ${isDark ? 'Dark' : 'Light'} | Accent: ${accentPreset.name} (${accentHex}) | Corner: ${cornerVal}px
 */

:root {
    --toolbar-bgcolor: ${bgHex} !important;
    --toolbox-bgcolor: ${bgHex} !important;
    --toolbox-background-color: ${bgHex} !important;
    --toolbox-background-color-inactive: ${bgHex} !important;
    --lwt-accent-color: ${bgHex} !important;
    --lwt-accent-color-inactive: ${bgHex} !important;
    --lwt-selected-tab-background-color: ${tabSelectedBg} !important;
    --tab-selected-bgcolor: ${tabSelectedBg} !important;
    --tab-border-radius: ${cornerVal}px !important;
    --arrowpanel-border-radius: ${cornerVal}px !important;
    --titlebar-button-size: ${btnSize}px !important;
}

/* Dark top bar of the window (navigator-toolbox, titlebar, TabsToolbar, nav-bar) */
#navigator-toolbox,
#titlebar,
#TabsToolbar,
#toolbar-menubar,
#nav-bar,
#PersonalToolbar {
    background-color: ${bgHex} !important;
    background-image: none !important;
    color: ${isDark ? '#ffffff' : '#000000'} !important;
}

/* Square tabs and consistent margins */
.tabbrowser-tab,
.tab-background {
    border-radius: ${cornerVal}px !important;
    margin-block: 2px !important;
}

.tab-background[selected="true"] {
    background-color: ${tabSelectedBg} !important;
    border: 1px solid ${accentHex} !important;
    box-shadow: none !important;
}

.tab-background:not([selected="true"]):hover {
    background-color: ${btnBgColor} !important;
}

/* Square address and search bar */
#urlbar-background,
#searchbar {
    border-radius: ${cornerVal}px !important;
    border: 1px solid ${btnBorderColor} !important;
}

#urlbar[focused="true"] #urlbar-background {
    border-color: ${accentHex} !important;
}

/* Square toolbar buttons */
toolbarbutton,
.toolbarbutton-1 {
    border-radius: ${cornerVal}px !important;
}

toolbarbutton:hover,
.toolbarbutton-1:hover {
    background-color: ${btnHover} !important;
}

/* Classic square window control buttons in Firefox - matches Chrome style */
.titlebar-buttonbox {
    margin: 0 4px !important;
    padding: 0 !important;
    align-items: center !important;
}

.titlebar-button {
    padding: 0 !important;
    margin: 0 2px !important;
    appearance: none !important;
    background: transparent !important;
    background-color: transparent !important;
    border: none !important;
    box-shadow: none !important;
    outline: none !important;
}

.titlebar-button > .toolbarbutton-icon {
    width: ${btnSize}px !important;
    height: ${btnSize}px !important;
    min-width: ${btnSize}px !important;
    min-height: ${btnSize}px !important;
    box-sizing: border-box !important;
    border-radius: ${cornerVal}px !important;
    border: 1px solid transparent !important;
    border-color: transparent !important;
    background-color: transparent !important;
    stroke: ${isDark ? '#ffffff' : '#000000'} !important;
    color: ${isDark ? '#ffffff' : '#000000'} !important;
    background-size: 14px !important;
    background-position: center !important;
    background-repeat: no-repeat !important;
    transition: background-color 120ms ease, border-color 120ms ease !important;
}

.titlebar-button:not(:hover):not(:active) > .toolbarbutton-icon {
    border: 1px solid transparent !important;
    border-color: transparent !important;
    background-color: transparent !important;
}

/* Hover and active states for minimize and maximize */
.titlebar-button:not(.titlebar-close):hover > .toolbarbutton-icon {
    background-color: ${btnHover} !important;
    border: 1px solid ${btnHoverBorderColor} !important;
    border-color: ${btnHoverBorderColor} !important;
}

.titlebar-button:not(.titlebar-close):active > .toolbarbutton-icon {
    background-color: ${accentHex} !important;
    border: 1px solid ${accentHex} !important;
    border-color: ${accentHex} !important;
    stroke: #ffffff !important;
}

/* Red square close button on hover / active */
.titlebar-close:hover > .toolbarbutton-icon {
    background-color: rgb(249, 55, 0) !important;
    border: 1px solid #d92e00 !important;
    border-color: #d92e00 !important;
    stroke: #ffffff !important;
}

.titlebar-close:active > .toolbarbutton-icon {
    background-color: #d92e00 !important;
    border: 1px solid #b52600 !important;
    border-color: #b52600 !important;
    stroke: #ffffff !important;
}
${USER_CHROME_MARKER_END}
`;
}

/**
 * Applies the Adwita Square theme to all found Firefox profiles.
 */

export const removeOldwaitaCss = removeAdwitaSquareCss;
export const generateOldwaitaCss = generateAdwitaSquareCss;

// =========================================================================
// SECTION: System Theme & Window Control Preferences
// =========================================================================

export function getSystemGtkTheme() {
    try {
        const settings = new Gio.Settings({ schema_id: 'org.gnome.desktop.interface' });
        return settings.get_string('gtk-theme');
    } catch (e) {
        return 'unknown';
    }
}

export function setSystemGtkThemeToAdwaita() {
    try {
        const settings = new Gio.Settings({ schema_id: 'org.gnome.desktop.interface' });
        settings.set_string('gtk-theme', 'Adwaita');
        return true;
    } catch (e) {
        console.error('Error setting gtk-theme to Adwaita:', e);
        return false;
    }
}

export function areWindowControlsEnabled() {
    try {
        const settings = new Gio.Settings({ schema_id: 'org.gnome.desktop.wm.preferences' });
        const layout = settings.get_string('button-layout') || '';
        return layout.includes('minimize') && layout.includes('maximize');
    } catch (e) {
        return false;
    }
}

export function ensureWindowControlsEnabled() {
    try {
        const settings = new Gio.Settings({ schema_id: 'org.gnome.desktop.wm.preferences' });
        let layout = settings.get_string('button-layout') || '';
        const hasMinimize = layout.includes('minimize');
        const hasMaximize = layout.includes('maximize');

        if (hasMinimize && hasMaximize) {
            return false;
        }

        const parts = layout.split(':');
        let left = parts[0] || '';
        let right = parts.length > 1 ? parts[1] : '';

        if (left.includes('close')) {
            const leftBtns = left.split(',').filter(b => b.length > 0);
            if (!leftBtns.includes('minimize')) leftBtns.push('minimize');
            if (!leftBtns.includes('maximize')) leftBtns.push('maximize');
            left = leftBtns.join(',');
        } else {
            const rightBtns = right.split(',').filter(b => b.length > 0);
            const closeIdx = rightBtns.indexOf('close');
            const toInsert = [];
            if (!rightBtns.includes('minimize')) toInsert.push('minimize');
            if (!rightBtns.includes('maximize')) toInsert.push('maximize');

            if (closeIdx !== -1) {
                rightBtns.splice(closeIdx, 0, ...toInsert);
            } else {
                rightBtns.push(...toInsert);
                if (!rightBtns.includes('close')) rightBtns.push('close');
            }
            right = rightBtns.join(',');
        }

        const newLayout = `${left}:${right}`;
        settings.set_string('button-layout', newLayout);
        console.log(`[adwita-square] Enabled minimize and maximize buttons in system: ${newLayout}`);
        return true;
    } catch (e) {
        console.error('[adwita-square] Error while enabling minimize and maximize buttons:', e);
        return false;
    }
}

// =========================================================================
// SECTION: Preferences Dialog CSS Generator (Live Preview)
// =========================================================================

export function generatePreviewCss(options) {
    const isDark = options.variant === 'dark';
    const accentPreset = ACCENT_PRESETS[options.accentColor] || ACCENT_PRESETS.blue;
    const accentHex = accentPreset.hex;
    // Inverted transparency: 0 = opaque (opacity 1.0), 100 = fully transparent (0.0)
    const transparency = Math.max(0, Math.min(100, options.opacity !== undefined ? options.opacity : 0));
    const opacityVal = (1.0 - (transparency / 100)).toFixed(2);
    const blurVal = Math.max(0, Math.min(50, options.blur !== undefined ? options.blur : 0));
    const accentStrength = Math.max(0, Math.min(100, options.accentStrength ?? 15));
    const cornerVal = Math.max(0, Math.min(20, options.cornerRadius !== undefined ? options.cornerRadius : 3));
    const btnSize = Math.max(20, Math.min(48, options.buttonSize ?? 24));
    const btnInnerW = btnSize - 2;
    const closeInnerSize = btnSize - 2;
    const topOuterH = Math.floor(btnSize / 2);
    const bottomOuterH = btnSize - topOuterH;
    const topH = Math.max(1, topOuterH - 2);
    const bottomH = Math.max(1, bottomOuterH - 2);
    const restCenterY = Math.round(bottomOuterH / 2);
    const smallIconSize = Math.max(9, Math.min(22, topOuterH - 3));
    const restIconSize = Math.max(14, Math.min(24, Math.round(btnSize * 0.42)));
    const enableControlButtons = options.controlButtons ?? false;
    const iconBorderWidth = Math.max(0, Math.min(5, options.iconBorderWidth ?? 1));
    const iconShapeSize = Math.max(40, Math.min(72, options.iconShapeSize ?? 52));

    const windowBaseHex = isDark ? '#000000' : '#fafafa';
    const headerBaseHex = isDark ? '#000000' : '#ffffff';
    const sidebarBaseHex = isDark ? '#1e1e1e' : '#f0f0f0';

    const textFg = isDark ? '#ffffff' : '#000000';
    const btnFg = isDark ? '#ffffff' : '#000000';
    const borderColor = isDark ? 'rgba(255, 255, 255, 0.16)' : 'rgba(0, 0, 0, 0.18)';
    const headerBorder = isDark ? 'rgba(255, 255, 255, 0.10)' : 'rgba(0, 0, 0, 0.10)';

    const btnBorderColor = isDark ? 'rgba(255, 255, 255, 0.14)' : 'rgba(0, 0, 0, 0.16)';
    const btnBgColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)';
    const btnHoverBorderColor = isDark ? 'rgba(255, 255, 255, 0.24)' : 'rgba(0, 0, 0, 0.26)';
    const btnHoverBgColor = isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.10)';

    const headerBgCss = headerBaseHex;
    const sidebarBaseCss = transparency === 0
        ? sidebarBaseHex
        : (transparency === 100 ? 'transparent' : hexToRgba(sidebarBaseHex, parseFloat(opacityVal)));

    const accentColorWithAlpha = transparency === 0
        ? accentHex
        : (transparency === 100 ? 'transparent' : hexToRgba(accentHex, parseFloat(opacityVal)));
    const sidebarBgCss = accentStrength > 0
        ? (transparency === 100
            ? 'transparent'
            : `color-mix(in srgb, ${accentColorWithAlpha} ${accentStrength}%, ${sidebarBaseCss})`)
        : sidebarBaseCss;

    const iconShapeScale = Math.max(40, Math.min(95, options.iconShapeScale ?? 68));
    const iconPixelSize = Math.round(iconShapeSize * iconShapeScale / 100);
    const iconBaseHex = isDark ? '#1e1e22' : '#f6f6f8';
    const iconTransparency = Math.max(0, Math.min(100, options.iconOpacity !== undefined ? options.iconOpacity : (options.opacity !== undefined ? options.opacity : 0)));
    const iconOpacityVal = (1.0 - (iconTransparency / 100)).toFixed(2);
    const iconEffAlpha = iconTransparency === 100 ? 0 : (iconTransparency === 0 ? 1.0 : parseFloat(iconOpacityVal));
    const iconBgCss = iconTransparency === 100
        ? 'transparent'
        : mixColors(accentHex, iconBaseHex, accentStrength, iconEffAlpha);
    const iconSquircleRadius = options.iconSquircleRadius !== undefined ? options.iconSquircleRadius : 24;
    const iconCornerRadius = options.forceIconShape !== false
        ? Math.max(2, Math.round(iconSquircleRadius * (iconShapeSize / 128)))
        : 12;
    const iconBlurVal = Math.max(0, Math.min(50, options.iconBlur !== undefined ? options.iconBlur : 0));
    const iconBorderColor = options.iconPaletteMode === 'accent' && accentHex
        ? hexToRgba(accentHex, 0.6)
        : (isDark ? '#7a7a82' : '#484850');
    const iconBorderHoverColor = options.iconPaletteMode === 'accent' && accentHex
        ? hexToRgba(accentHex, 0.9)
        : (isDark ? '#9e9ea6' : '#2e2e36');
    const iconBorderCss = options.forceIconShape !== false
        ? (iconBorderWidth === 0 ? 'none' : `${iconBorderWidth}px solid ${iconBorderColor}`)
        : '1.5px solid transparent';

    const accentDark = adjustBrightness(accentHex, -0.15);
    const accentDarker = adjustBrightness(accentHex, -0.25);

    return `
    .preview-desktop-card {
        background: ${isDark
            ? 'linear-gradient(135deg, #0f2027 0%, #203a43 40%, #2c5364 75%, #e67e22 100%)'
            : 'linear-gradient(135deg, #1e3c72 0%, #2a5298 35%, #e67e22 80%, #f39c12 100%)'};
        border-radius: 8px;
        padding: 10px;
    }
    #adwita-square-preview {
        background-color: transparent;
        color: ${textFg};
        border-radius: ${cornerVal}px;
        border: 1px solid ${borderColor};
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
        ${blurVal > 0 ? `backdrop-filter: blur(${blurVal}px);` : ''}
    }
    #adwita-square-preview .preview-header {
        background-color: ${headerBgCss};
        border-bottom: 1px solid ${headerBorder};
        border-top-left-radius: ${cornerVal}px;
        border-top-right-radius: ${cornerVal}px;
        color: ${textFg};
        padding: 4px 8px;
    }
    #adwita-square-preview .preview-title {
        font-weight: bold;
        font-size: 12px;
        color: ${textFg};
    }
    #adwita-square-preview .preview-subtitle {
        font-size: 10px;
        opacity: 0.7;
        color: ${textFg};
    }
    #adwita-square-preview .preview-content,
    #adwita-square-preview .preview-body {
        background: transparent;
        border-bottom-left-radius: ${cornerVal}px;
        border-bottom-right-radius: ${cornerVal}px;
        padding: 0;
    }
    #adwita-square-preview .preview-sidebar {
        background-color: ${sidebarBgCss};
        border-right: 1px solid ${headerBorder};
        border-bottom-left-radius: ${cornerVal}px;
        padding: 6px 4px;
        color: #ffffff;
        ${blurVal > 0 ? `backdrop-filter: blur(${blurVal}px);` : ''}
    }
    #adwita-square-preview .preview-sidebar-item {
        padding: 4px 6px;
        font-size: 11px;
        border-radius: ${cornerVal}px;
        color: #ffffff;
        background: transparent;
    }
    #adwita-square-preview .preview-sidebar-item:hover:not(.selected) {
        background-color: rgba(255, 255, 255, 0.18);
    }
    #adwita-square-preview .preview-sidebar-item.selected {
        background-color: ${accentStrength >= 40
            ? `color-mix(in srgb, #ffffff 28%, ${accentHex})`
            : accentHex};
        color: #ffffff;
        font-weight: bold;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25), inset 0 0 0 1px ${accentStrength >= 40 ? 'rgba(255, 255, 255, 0.40)' : 'rgba(255, 255, 255, 0.25)'};
    }
    #adwita-square-preview .preview-main-content {
        background-color: ${windowBaseHex};
        color: ${textFg};
        border-bottom-right-radius: ${cornerVal}px;
        padding: 8px;
    }
    #adwita-square-preview button {
        border-radius: ${cornerVal}px;
        border: 1px solid ${btnBorderColor};
        background-color: ${btnBgColor};
        color: ${btnFg};
        padding: 2px 8px;
        font-size: 11px;
    }
    #adwita-square-preview button label,
    #adwita-square-preview button image {
        color: ${btnFg};
    }
    #adwita-square-preview button:hover {
        background-color: ${btnHoverBgColor};
        border-color: ${btnHoverBorderColor};
    }
    #adwita-square-preview button.suggested-action {
        background-color: ${accentHex};
        border-color: ${accentHex};
        color: #ffffff;
        border-radius: ${cornerVal}px;
    }
    #adwita-square-preview button.suggested-action label {
        color: #ffffff;
    }
    #adwita-square-preview button.destructive-action {
        background-color: #e01b24;
        border-color: #c01c28;
        color: #ffffff;
        border-radius: ${cornerVal}px;
    }
    #adwita-square-preview button.destructive-action label {
        color: #ffffff;
    }
    #adwita-square-preview entry {
        background-color: ${isDark ? 'rgba(255, 255, 255, 0.08)' : '#ffffff'};
        color: ${textFg};
        border: 1px solid ${btnBorderColor};
        border-radius: ${cornerVal}px;
        padding: 2px 6px;
        font-size: 11px;
    }
    #adwita-square-preview entry:focus-within {
        border-color: ${accentHex};
    }
    #adwita-square-preview .card {
        background-color: ${isDark ? 'rgba(255, 255, 255, 0.06)' : '#ffffff'};
        border: 1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)'};
        border-radius: ${cornerVal}px;
        color: ${textFg};
        padding: 6px 8px;
    }
    #adwita-square-preview switch:checked {
        background-color: ${accentHex};
    }
    #adwita-square-preview scale > trough > highlight {
        background-color: ${accentHex};
    }
    #adwita-square-preview check:checked,
    #adwita-square-preview checkbutton check:checked {
        background-color: ${accentHex};
        color: #ffffff;
    }
    #adwita-square-preview .preview-header button:not(.window-btn-maximize):not(.window-btn-minimize) {
        min-height: ${closeInnerSize}px;
        min-width: ${btnInnerW}px;
        padding: 0;
        border-radius: ${cornerVal}px;
        border: 1px solid ${btnBorderColor};
        background: transparent;
        background-color: transparent;
        background-image: none;
        color: ${btnFg};
    }
    ${enableControlButtons ? `
    /* Split Window Controls (Stacked Maximize and Minimize) */
    #adwita-square-preview .split-window-controls {
        border: 1px solid ${btnBorderColor};
        border-radius: ${cornerVal}px;
        padding: 0;
        margin: 0;
        min-width: ${btnInnerW}px;
        min-height: ${closeInnerSize}px;
        background: transparent;
        background-color: transparent;
        background-image: none;
    }
    #adwita-square-preview .split-window-controls button {
        border: none;
        border-radius: 0;
        margin: 0;
        padding: 0;
        min-width: ${btnInnerW}px;
        box-shadow: none;
        background: transparent;
        background-color: transparent;
        background-image: none;
        color: ${btnFg};
    }
    #adwita-square-preview .split-window-controls button label {
        color: ${btnFg};
        font-size: ${smallIconSize}px;
        line-height: 1;
        font-weight: bold;
        margin: 0;
        padding: 0;
    }
    /* Position 1: Rest state (single square with standard-size icon inside, transparent background) */
    #adwita-square-preview .split-window-controls button:first-child {
        min-height: ${closeInnerSize}px;
        background: transparent;
        background-color: transparent;
        background-image: none;
        border-radius: ${cornerVal}px;
        border: none;
    }
    #adwita-square-preview .split-window-controls button:first-child label {
        margin: 0;
        padding: 0;
        font-size: ${restIconSize}px;
        font-weight: bold;
        transform: none;
    }
    #adwita-square-preview .split-window-controls button:last-child {
        min-height: 0px;
        background: transparent;
        background-color: transparent;
        border: none;
        opacity: 0;
    }
    #adwita-square-preview .split-window-controls button:last-child label {
        margin: 0;
        padding: 0;
        opacity: 0;
        color: transparent;
        font-size: 0px;
    }

    /* Position 2: Top button hover (only top button is visible) */
    #adwita-square-preview .split-window-controls.hover-top button:first-child,
    #adwita-square-preview .split-window-controls button:first-child:hover {
        min-height: ${topH}px;
        border: 1px solid ${btnBorderColor};
        border-radius: ${Math.max(0, cornerVal - 1)}px ${Math.max(0, cornerVal - 1)}px 0 0;
        background-color: ${btnHoverBgColor};
        opacity: 1;
    }
    #adwita-square-preview .split-window-controls.hover-top button:first-child label,
    #adwita-square-preview .split-window-controls button:first-child:hover label {
        font-size: ${smallIconSize}px;
        margin-bottom: 1px;
        transform: none;
        opacity: 1;
        color: ${btnFg};
    }
    #adwita-square-preview .split-window-controls.hover-top button:last-child {
        min-height: 0px;
        border: none;
        opacity: 0;
    }
    #adwita-square-preview .split-window-controls.hover-top button:last-child label {
        opacity: 0;
        font-size: 0px;
    }

    /* Position 2: Bottom button hover (only bottom button is visible) */
    #adwita-square-preview .split-window-controls.hover-bottom button:last-child,
    #adwita-square-preview .split-window-controls button:last-child:hover {
        min-height: ${bottomH}px;
        border: 1px solid ${btnBorderColor};
        border-radius: 0 0 ${Math.max(0, cornerVal - 1)}px ${Math.max(0, cornerVal - 1)}px;
        background-color: ${btnHoverBgColor};
        opacity: 1;
    }
    #adwita-square-preview .split-window-controls.hover-bottom button:last-child label,
    #adwita-square-preview .split-window-controls button:last-child:hover label {
        font-size: ${smallIconSize}px;
        opacity: 1;
        color: ${btnFg};
        margin-top: 1px;
    }
    #adwita-square-preview .split-window-controls.hover-bottom button:first-child {
        min-height: 0px;
        border: none;
        opacity: 0;
    }
    #adwita-square-preview .split-window-controls.hover-bottom button:first-child label {
        opacity: 0;
        font-size: 0px;
    }

    /* Position 3: Active state (active button highlighted in accent color, other hidden) */
    #adwita-square-preview .split-window-controls button:first-child:active {
        min-height: ${topH}px;
        background-color: ${accentHex};
        border: 1px solid ${accentDark};
        border-radius: ${Math.max(0, cornerVal - 1)}px ${Math.max(0, cornerVal - 1)}px 0 0;
        opacity: 1;
    }
    #adwita-square-preview .split-window-controls button:first-child:active label {
        color: #ffffff;
        font-size: ${smallIconSize}px;
        transform: none;
        opacity: 1;
    }
    #adwita-square-preview .split-window-controls button:last-child:active {
        min-height: ${bottomH}px;
        background-color: ${accentHex};
        border: 1px solid ${accentDark};
        border-radius: 0 0 ${Math.max(0, cornerVal - 1)}px ${Math.max(0, cornerVal - 1)}px;
        opacity: 1;
    }
    #adwita-square-preview .split-window-controls button:last-child:active label {
        color: #ffffff;
        font-size: ${smallIconSize}px;
        opacity: 1;
    }

    /* Close Button (3 states: rest = frame with dark/btnFg X, hover = red with white X, active = darker red with white X) */
    #adwita-square-preview button.window-btn-close {
        background: transparent;
        background-color: transparent;
        background-image: none;
        border: 1px solid ${btnBorderColor};
        color: ${btnFg};
        min-width: ${closeInnerSize}px;
        min-height: ${closeInnerSize}px;
        border-radius: ${cornerVal}px;
        padding: 0;
        margin: 0;
    }
    #adwita-square-preview button.window-btn-close label {
        color: ${btnFg};
        font-size: ${restIconSize}px;
        font-weight: bold;
        margin: 0;
        padding: 0;
        background: transparent;
        background-color: transparent;
    }
    #adwita-square-preview button.window-btn-close:hover {
        background: rgb(249, 55, 0);
        background-color: rgb(249, 55, 0);
        background-image: none;
        border: 1px solid #d92e00;
        color: #ffffff;
    }
    #adwita-square-preview button.window-btn-close:hover label {
        color: #ffffff;
        background: transparent;
        background-color: transparent;
    }
    #adwita-square-preview button.window-btn-close:active {
        background: #d92e00;
        background-color: #d92e00;
        background-image: none;
        border: 1px solid #b52600;
        color: #ffffff;
    }
    #adwita-square-preview button.window-btn-close:active label {
        color: #ffffff;
        background: transparent;
        background-color: transparent;
    }

    #adwita-square-preview button.window-btn:not(.window-btn-close) {
        min-width: ${btnSize}px;
        min-height: ${btnSize}px;
        font-size: ${restIconSize}px;
        font-weight: bold;
        border-radius: ${cornerVal}px;
        padding: 0;
        margin: 1px;
        border: 1px solid ${btnBorderColor};
        background-color: ${btnBgColor};
        color: ${btnFg};
    }
    #adwita-square-preview button.window-btn:not(.window-btn-close):hover {
        background-color: ${btnHoverBgColor};
    }
    ` : `
    #adwita-square-preview button.window-btn {
        min-width: ${btnSize}px;
        min-height: ${btnSize}px;
        font-size: ${restIconSize}px;
        font-weight: bold;
        border-radius: ${cornerVal}px;
        padding: 0;
        margin: 1px;
        border: 1px solid ${btnBorderColor};
        background-color: ${btnBgColor};
        color: ${btnFg};
    }
    #adwita-square-preview button.window-btn:hover {
        background-color: ${btnHoverBgColor};
    }
    #adwita-square-preview button.window-btn-close:hover {
        background-color: rgb(249, 55, 0);
        border-color: #d92e00;
        color: #ffffff;
    }
    #adwita-square-preview button.window-btn-close:hover label {
        color: #ffffff;
    }
    #adwita-square-preview button.window-btn-close:active {
        background-color: #d92e00;
        border-color: #b52600;
        color: #ffffff;
    }
    #adwita-square-preview button.window-btn-minimize:hover,
    #adwita-square-preview button.window-btn-maximize:hover {
        background-color: ${accentHex};
        border-color: ${accentDark};
        color: #ffffff;
    }
    #adwita-square-preview button.window-btn-minimize:hover label,
    #adwita-square-preview button.window-btn-maximize:hover label {
        color: #ffffff;
    }
    #adwita-square-preview button.window-btn-minimize:active,
    #adwita-square-preview button.window-btn-maximize:active {
        background-color: ${accentDark};
        border-color: ${accentDarker};
        color: #ffffff;
    }
    `}

    /* Icon Shape Preview (Adaptive Square Style) */
    .icon-preview-desktop-card {
        background: ${isDark
            ? 'linear-gradient(135deg, #0f2027 0%, #203a43 40%, #2c5364 75%, #e67e22 100%)'
            : 'linear-gradient(135deg, #1e3c72 0%, #2a5298 35%, #e67e22 80%, #f39c12 100%)'};
        border-radius: 8px;
        padding: 12px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
    }
    .icon-preview-title {
        font-weight: bold;
        font-size: 12px;
        color: #ffffff;
        text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
    }
    .icon-preview-badge {
        font-size: 10px;
        font-weight: 600;
        padding: 2px 6px;
        border-radius: 4px;
        background-color: ${accentHex};
        color: #ffffff;
    }
    .icon-shape-item-box {
        padding: 2px;
    }
    .icon-shape-container {
        min-width: ${iconShapeSize}px;
        min-height: ${iconShapeSize}px;
        border-radius: ${iconCornerRadius}px;
        background: transparent;
        background-color: transparent;
        border: none;
        box-shadow: none;
        transition: transform 150ms ease;
    }
    .icon-shape-container:hover {
        transform: scale(1.08);
    }
    .icon-shape-container image {
        min-width: ${iconShapeSize}px;
        min-height: ${iconShapeSize}px;
        margin: 0;
    }
    .icon-shape-label {
        font-size: 10px;
        font-weight: 500;
        color: #ffffff;
        margin-top: 3px;
        text-shadow: 0 1px 3px rgba(0, 0, 0, 0.7);
        opacity: 0.95;
    }
    `;
}
