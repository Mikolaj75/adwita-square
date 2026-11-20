/*
 * Adwita Square - Preferences
 * Square GTK theme based on Adwaita.
 *
 * Copyright (C) 2024-2026 g-mobile.eu
 * Based on Adwaita / Libadwaita stylesheets.
 * Original Adwaita copyright (C) 2014-2024 GNOME Project and contributors.
 *
 * Licensed under the GNU Lesser General Public License version 2.1 or later (LGPL-2.1-or-later).
 * See LICENSE file for details.
 */

import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gdk from 'gi://Gdk';
import GdkPixbuf from 'gi://GdkPixbuf';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Pango from 'gi://Pango';
import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import * as ThemeGenerator from './themeGenerator.js';
import * as ShellThemeGenerator from './shellThemeGenerator.js';
import * as BrowserTheme from './browserTheme.js';
import * as WallpaperManager from './wallpaperManager.js';
import * as IconThemeGenerator from './iconThemeGenerator.js';
import * as VideoWallpaperRenderer from './videoWallpaperRenderer.js';

// =========================================================================
// SECTION: Preferences Window & Settings Setup
// =========================================================================

export default class AdwitaSquarePreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();

        const versionStr = this.metadata?.['version-name']
            ? `v${this.metadata['version-name']}`
            : (this.metadata?.version !== undefined ? `v${this.metadata.version}` : 'v1.0.0');
        window.set_title(`Adwita Square (${versionStr})`);
        window.set_default_size(1140, 840);
        let interfaceSettings = null;
        try {
            interfaceSettings = new Gio.Settings({ schema_id: 'org.gnome.desktop.interface' });
        } catch (e) {
            console.warn('Could not load org.gnome.desktop.interface in preferences:', e);
        }

        let bgSettings = null;
        try {
            bgSettings = new Gio.Settings({ schema_id: 'org.gnome.desktop.background' });
        } catch (e) {
            console.warn('Could not load org.gnome.desktop.background in preferences:', e);
        }

        // State variables: I initialize from GSettings (and system interface for accent if available)
        let currentVariant = settings.get_string('theme-variant') || 'light';
        let currentAutoAccent = false;
        try {
            currentAutoAccent = settings.get_boolean('accent-color-automatic');
        } catch (_) {
            currentAutoAccent = false;
        }

        let currentAccent = 'blue';
        if (currentAutoAccent) {
            const autoColor = ThemeGenerator.extractAccentFromWallpaper(currentVariant === 'dark');
            if (autoColor && ThemeGenerator.ACCENT_PRESETS[autoColor]) {
                currentAccent = autoColor;
            }
        } else {
            currentAccent = (interfaceSettings && ThemeGenerator.ACCENT_PRESETS[interfaceSettings.get_string('accent-color')])
                ? interfaceSettings.get_string('accent-color')
                : (settings.get_string('accent-color') || 'blue');
        }
        let currentOpacity = settings.get_int('opacity');
        if (isNaN(currentOpacity) || currentOpacity < 0 || currentOpacity > 100) {
            currentOpacity = 0;
        }
        let currentAccentStrength = settings.get_int('accent-strength');
        if (isNaN(currentAccentStrength) || currentAccentStrength < 0) {
            currentAccentStrength = 15;
        }
        let currentBlur = Math.max(0, settings.get_int('blur') || 0);
        let currentCorner = settings.get_int('corner-radius');
        if (isNaN(currentCorner) || currentCorner < 0) {
            currentCorner = 3;
        }
        let currentButtonSize = settings.get_int('button-size');
        if (isNaN(currentButtonSize) || currentButtonSize < 20 || currentButtonSize > 48) {
            currentButtonSize = 24;
        }
        let currentControlButtons = false;
        try {
            currentControlButtons = settings.get_boolean('control-buttons');
        } catch (_) {
            currentControlButtons = false;
        }

        let currentDynamicPanelMaximized = true;
        try {
            currentDynamicPanelMaximized = settings.get_boolean('dynamic-panel-maximized');
        } catch (_) {
            currentDynamicPanelMaximized = true;
        }

        let currentFirefoxTheme = false;
        try {
            currentFirefoxTheme = settings.get_boolean('firefox-theme');
        } catch (_) {
            currentFirefoxTheme = false;
        }

        let currentChromiumTheme = false;
        try {
            currentChromiumTheme = settings.get_boolean('chromium-theme');
        } catch (_) {
            currentChromiumTheme = false;
        }

        let currentForceIconShape = true;
        try {
            currentForceIconShape = settings.get_boolean('force-icon-shape');
        } catch (_) {
            currentForceIconShape = true;
        }

        let currentIconShapeScale = 68;
        try {
            currentIconShapeScale = settings.get_int('icon-shape-scale');
            if (isNaN(currentIconShapeScale) || currentIconShapeScale < 50 || currentIconShapeScale > 90) {
                currentIconShapeScale = 68;
            }
        } catch (_) {
            currentIconShapeScale = 68;
        }

        let currentIconShapeSize = 52;
        try {
            currentIconShapeSize = settings.get_int('icon-shape-size');
            if (isNaN(currentIconShapeSize) || currentIconShapeSize < 40 || currentIconShapeSize > 72) {
                currentIconShapeSize = 52;
            }
        } catch (_) {
            currentIconShapeSize = 52;
        }

        let currentIconBorderWidth = 1;
        try {
            currentIconBorderWidth = settings.get_int('icon-border-width');
            if (isNaN(currentIconBorderWidth) || currentIconBorderWidth < 0 || currentIconBorderWidth > 5) {
                currentIconBorderWidth = 1;
            }
        } catch (_) {
            currentIconBorderWidth = 1;
        }

        let currentBorderWidth = 1;
        try {
            currentBorderWidth = settings.get_int('border-width');
            if (isNaN(currentBorderWidth) || currentBorderWidth < 0 || currentBorderWidth > 5) {
                currentBorderWidth = currentIconBorderWidth;
            }
        } catch (_) {
            currentBorderWidth = currentIconBorderWidth;
        }

        let currentDockOpacity = 0;
        try {
            currentDockOpacity = settings.get_int('dock-opacity');
            if (isNaN(currentDockOpacity) || currentDockOpacity < 0 || currentDockOpacity > 100) {
                currentDockOpacity = 0;
            }
        } catch (_) {
            currentDockOpacity = 0;
        }

        let currentDockBlur = 0;
        try {
            currentDockBlur = Math.max(0, settings.get_int('dock-blur') || 0);
        } catch (_) {
            currentDockBlur = 0;
        }

        let currentDockCornerRadius = 3;
        try {
            currentDockCornerRadius = settings.get_int('dock-corner-radius');
            if (isNaN(currentDockCornerRadius) || currentDockCornerRadius < 0 || currentDockCornerRadius > 35) {
                currentDockCornerRadius = currentCorner;
            }
        } catch (_) {
            currentDockCornerRadius = currentCorner;
        }

        let currentIconOpacity = 0;
        try {
            currentIconOpacity = settings.get_int('icon-opacity');
            if (isNaN(currentIconOpacity) || currentIconOpacity < 0 || currentIconOpacity > 100) {
                currentIconOpacity = 0;
            }
        } catch (_) {
            currentIconOpacity = 0;
        }

        let currentIconBlur = 0;

        let currentIconSquircleRadius = 24;
        try {
            currentIconSquircleRadius = settings.get_int('icon-squircle-radius');
            if (isNaN(currentIconSquircleRadius) || currentIconSquircleRadius < 4 || currentIconSquircleRadius > 36) {
                currentIconSquircleRadius = 24;
            }
        } catch (_) {
            currentIconSquircleRadius = 24;
        }

        let currentIconPaletteMode = 'accent';
        try {
            currentIconPaletteMode = settings.get_string('icon-palette-mode') || 'accent';
        } catch (_) {
            currentIconPaletteMode = 'accent';
        }

        let currentIconAutoRegen = true;
        try {
            currentIconAutoRegen = settings.get_boolean('icon-auto-regen');
        } catch (_) {
            currentIconAutoRegen = true;
        }

        let windowControlsBox = null;
        let renderPreviewControls = null;
        let renderIconPreview = null;

        let liveSettingsSyncTimeoutId = 0;
        const applyLiveSettings = () => {
            try {
                settings.set_boolean('accent-color-automatic', currentAutoAccent);
                settings.set_string('accent-color', currentAccent);
                settings.set_int('accent-strength', currentAccentStrength);
                settings.set_int('opacity', currentOpacity);
                settings.set_int('blur', currentBlur);
                settings.set_int('dock-opacity', currentDockOpacity);
                settings.set_int('dock-blur', currentDockBlur);
                settings.set_int('dock-corner-radius', currentDockCornerRadius);
                settings.set_int('icon-opacity', currentIconOpacity);
                settings.set_int('icon-blur', currentIconBlur);
                settings.set_boolean('force-icon-shape', currentForceIconShape);
                settings.set_int('icon-border-width', currentIconBorderWidth);
                try {
                    settings.set_int('border-width', currentBorderWidth);
                } catch (_) {}
                settings.set_int('icon-shape-scale', currentIconShapeScale);
                settings.set_int('icon-shape-size', currentIconShapeSize);
                try {
                    settings.set_int('icon-squircle-radius', currentIconSquircleRadius);
                    settings.set_string('icon-palette-mode', currentIconPaletteMode);
                    settings.set_boolean('icon-auto-regen', currentIconAutoRegen);
                    settings.set_boolean('dynamic-panel-maximized', currentDynamicPanelMaximized);
                } catch (_) {}
                if (interfaceSettings) {
                    try {
                        interfaceSettings.set_string('accent-color', currentAccent);
                    } catch (_) {}
                }
                const shellCss = ShellThemeGenerator.generateShellCss({
                    variant: currentVariant,
                    accentColor: currentAccent,
                    opacity: currentOpacity,
                    blur: currentBlur,
                    dockOpacity: currentDockOpacity,
                    dockBlur: currentDockBlur,
                    dockCornerRadius: currentDockCornerRadius,
                    iconOpacity: currentIconOpacity,
                    iconBlur: currentIconBlur,
                    cornerRadius: currentCorner,
                    borderWidth: currentBorderWidth,
                    accentStrength: currentAccentStrength,
                    forceIconShape: currentForceIconShape,
                    iconBorderWidth: currentIconBorderWidth,
                    iconShapeScale: currentIconShapeScale,
                    iconShapeSize: currentIconShapeSize,
                    iconSquircleRadius: currentIconSquircleRadius,
                });
                ShellThemeGenerator.saveShellCss(shellCss);
            } catch (_) {}
        };

        const syncLiveSettingsNow = () => {
            if (liveSettingsSyncTimeoutId) {
                GLib.source_remove(liveSettingsSyncTimeoutId);
                liveSettingsSyncTimeoutId = 0;
            }
            applyLiveSettings();
        };

        const scheduleLiveSettingsSync = () => {
            if (liveSettingsSyncTimeoutId) {
                GLib.source_remove(liveSettingsSyncTimeoutId);
                liveSettingsSyncTimeoutId = 0;
            }
            liveSettingsSyncTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 80, () => {
                liveSettingsSyncTimeoutId = 0;
                applyLiveSettings();
                return GLib.SOURCE_REMOVE;
            });
        };

        // I create the main preferences page
        const page = new Adw.PreferencesPage({
            title: 'Configuration & Preview',
            icon_name: 'preferences-desktop-theme-symbolic',
        });
        window.add(page);

        const group = new Adw.PreferencesGroup();
        page.add(group);

        // I build the two-column container for settings and live preview
        const columnsBox = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            spacing: 16,
            homogeneous: false,
            hexpand: true,
            vexpand: true,
            margin_top: 2,
            margin_bottom: 2,
            margin_start: 0,
            margin_end: 0,
        });
        group.add(columnsBox);

        // =========================================================================
        // SECTION: Tab 1 - General Settings (Variant, Accent, Panels)
        // =========================================================================
        const leftColumnBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 8,
            hexpand: true,
            vexpand: true,
            margin_end: 8,
        });
        columnsBox.append(leftColumnBox);

        // Gtk.Notebook matching Dash to Dock style
        const notebook = new Gtk.Notebook({
            hexpand: true,
            vexpand: true,
            show_border: false,
            margin_start: 2,
            margin_end: 2,
            margin_top: 0,
            margin_bottom: 4,
        });
        leftColumnBox.append(notebook);

        // Wallpaper lazy-loading state
        let loadWallpapersFromFolder = null;
        let wallpapersLoaded = false;
        let lastLoadedFolder = '';
        let wallpaperIdleId = 0;
        let wallpaperLoadGeneration = 0;

        notebook.connect('switch-page', (_nb, _pageWidget, pageNum) => {
            if (pageNum === 4) { // Tab 5: Wallpaper
                const curFolder = settings.get_string('wallpaper-folder');
                if (!wallpapersLoaded || lastLoadedFolder !== curFolder) {
                    wallpapersLoaded = true;
                    lastLoadedFolder = curFolder;
                    if (typeof loadWallpapersFromFolder === 'function') {
                        loadWallpapersFromFolder(curFolder);
                    }
                }
            }
        });

        // Helper method: I wrap tab contents in an independent ScrolledWindow
        const createTabPage = (tabChildBox) => {
            const scrolled = new Gtk.ScrolledWindow({
                hscrollbar_policy: Gtk.PolicyType.NEVER,
                vscrollbar_policy: Gtk.PolicyType.AUTOMATIC,
                hexpand: true,
                vexpand: true,
            });
            scrolled.set_child(tabChildBox);
            return scrolled;
        };

        // Tab 1: General
        const tabGeneralBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 12,
            hexpand: true,
            vexpand: true,
            margin_end: 6,
            margin_start: 2,
            margin_top: 8,
            margin_bottom: 4,
        });
        notebook.append_page(
            createTabPage(tabGeneralBox),
            new Gtk.Label({ label: 'General', can_focus: false })
        );

        // Tab 2: Windows
        const tabWindowsBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 12,
            hexpand: true,
            vexpand: true,
            margin_end: 6,
            margin_start: 2,
            margin_top: 8,
            margin_bottom: 4,
        });
        notebook.append_page(
            createTabPage(tabWindowsBox),
            new Gtk.Label({ label: 'Windows', can_focus: false })
        );

        // Tab 3: Dock
        const tabDockBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 12,
            hexpand: true,
            vexpand: true,
            margin_end: 6,
            margin_start: 2,
            margin_top: 8,
            margin_bottom: 4,
        });
        notebook.append_page(
            createTabPage(tabDockBox),
            new Gtk.Label({ label: 'Dock', can_focus: false })
        );

        // Tab 4: Icons
        const tabIconsBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 12,
            hexpand: true,
            vexpand: true,
            margin_end: 6,
            margin_start: 2,
            margin_top: 8,
            margin_bottom: 4,
        });
        notebook.append_page(
            createTabPage(tabIconsBox),
            new Gtk.Label({ label: 'Icons', can_focus: false })
        );

        // Tab 5: Wallpaper
        const tabWallpaperBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 12,
            hexpand: true,
            vexpand: true,
            margin_end: 6,
            margin_start: 2,
            margin_top: 8,
            margin_bottom: 4,
        });
        notebook.append_page(
            createTabPage(tabWallpaperBox),
            new Gtk.Label({ label: 'Wallpaper', can_focus: false })
        );

        // 1. I check whether the current system theme is Adwaita
        const currentSystemTheme = ThemeGenerator.getSystemGtkTheme();
        const isAdwaita = currentSystemTheme.toLowerCase().includes('adwaita');

        const themeNoticeBox = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            spacing: 12,
            css_classes: ['card'],
            margin_bottom: 4,
        });
        themeNoticeBox.set_margin_top(6);
        themeNoticeBox.set_margin_bottom(6);
        themeNoticeBox.set_margin_start(6);
        themeNoticeBox.set_margin_end(6);

        const noticeIcon = new Gtk.Image({
            icon_name: isAdwaita ? 'emblem-ok-symbolic' : 'dialog-warning-symbolic',
            pixel_size: 24,
        });
        themeNoticeBox.append(noticeIcon);

        const noticeLabelBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 2,
            hexpand: true,
        });
        const noticeTitle = new Gtk.Label({
            label: isAdwaita ? '<b>Adwaita system theme is active</b>' : '<b>Adwaita system theme required</b>',
            use_markup: true,
            xalign: 0,
            css_classes: ['heading'],
        });
        const noticeDesc = new Gtk.Label({
            label: isAdwaita
                ? 'System is using Adwaita theme; styles will apply fully.'
                : `Current theme: "${currentSystemTheme}". Adwaita must be selected for the styling to work properly.`,
            xalign: 0,
            wrap: true,
            css_classes: ['dim-label'],
        });
        noticeLabelBox.append(noticeTitle);
        noticeLabelBox.append(noticeDesc);
        themeNoticeBox.append(noticeLabelBox);

        if (!isAdwaita) {
            const setAdwaitaBtn = new Gtk.Button({
                label: 'Set Adwaita',
                valign: Gtk.Align.CENTER,
                css_classes: ['suggested-action'],
            });
            setAdwaitaBtn.connect('clicked', () => {
                ThemeGenerator.setSystemGtkThemeToAdwaita();
                noticeTitle.set_markup('<b>Adwaita theme has been set!</b>');
                noticeDesc.set_text('System theme has been switched to Adwaita.');
                noticeIcon.set_from_icon_name('emblem-ok-symbolic');
                setAdwaitaBtn.set_sensitive(false);
                window.add_toast(new Adw.Toast({ title: 'Adwaita system theme has been applied' }));
            });
            themeNoticeBox.append(setAdwaitaBtn);
        }
        tabGeneralBox.append(themeNoticeBox);

        // 2. Mode selection (Dark / Light)
        const variantFrame = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 8,
            css_classes: ['card'],
        });
        variantFrame.set_margin_start(6);
        variantFrame.set_margin_end(6);
        variantFrame.set_margin_top(4);
        variantFrame.set_margin_bottom(4);

        const variantHeader = new Gtk.Label({
            label: '<b>Theme Variant (Light / Dark)</b>',
            use_markup: true,
            xalign: 0,
            margin_start: 12,
            margin_top: 8,
            css_classes: ['heading'],
        });
        variantFrame.append(variantHeader);

        const variantButtonsBox = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            spacing: 12,
            homogeneous: true,
            margin_start: 12,
            margin_end: 12,
            margin_bottom: 12,
        });

        const lightBtn = new Gtk.ToggleButton({
            label: '☀️ Light',
            active: currentVariant === 'light',
            css_classes: ['variant-toggle-btn'],
        });
        const darkBtn = new Gtk.ToggleButton({
            label: '🌙 Dark',
            active: currentVariant === 'dark',
            group: lightBtn,
            css_classes: ['variant-toggle-btn'],
        });

        const variantStyleProvider = new Gtk.CssProvider();
        const updateVariantButtonStyles = () => {
            const accentPreset = ThemeGenerator.ACCENT_PRESETS[currentAccent] || ThemeGenerator.ACCENT_PRESETS.blue;
            const accentHex = accentPreset.hex;
            const borderAccent = ThemeGenerator.adjustBrightness(accentHex, -0.2);
            const hoverAccent = ThemeGenerator.adjustBrightness(accentHex, 0.1);

            variantStyleProvider.load_from_string(`
                .variant-toggle-btn {
                    border-radius: 8px;
                    font-weight: 600;
                    padding: 8px 16px;
                    border: 2px solid transparent;
                    transition: all 150ms ease;
                }
                .variant-toggle-btn:checked {
                    background-color: ${accentHex} !important;
                    color: #ffffff !important;
                    border-color: ${borderAccent} !important;
                    font-weight: bold !important;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
                }
                .variant-toggle-btn:checked:hover {
                    background-color: ${hoverAccent} !important;
                    color: #ffffff !important;
                }
            `);
        };

        updateVariantButtonStyles();
        Gtk.StyleContext.add_provider_for_display(
            Gdk.Display.get_default(),
            variantStyleProvider,
            Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION + 2
        );

        const accentButtons = {};
        let updateAutoColorPreview = () => ThemeGenerator.extractAccentFromWallpaper(currentVariant === 'dark') || 'blue';

        lightBtn.connect('toggled', () => {
            if (lightBtn.active) {
                currentVariant = 'light';
                const autoColor = updateAutoColorPreview();
                if (currentAutoAccent) {
                    if (autoColor && ThemeGenerator.ACCENT_PRESETS[autoColor] && currentAccent !== autoColor) {
                        currentAccent = autoColor;
                        if (accentButtons[autoColor]) accentButtons[autoColor].active = true;
                        updateVariantButtonStyles();
                        scheduleLiveSettingsSync();
                    }
                }
                updatePreview();
            }
        });
        darkBtn.connect('toggled', () => {
            if (darkBtn.active) {
                currentVariant = 'dark';
                const autoColor = updateAutoColorPreview();
                if (currentAutoAccent) {
                    if (autoColor && ThemeGenerator.ACCENT_PRESETS[autoColor] && currentAccent !== autoColor) {
                        currentAccent = autoColor;
                        if (accentButtons[autoColor]) accentButtons[autoColor].active = true;
                        updateVariantButtonStyles();
                        scheduleLiveSettingsSync();
                    }
                }
                updatePreview();
            }
        });

        variantButtonsBox.append(lightBtn);
        variantButtonsBox.append(darkBtn);
        variantFrame.append(variantButtonsBox);
        tabGeneralBox.append(variantFrame);

        // 3. Accent color selection (9 colors) - GNOME Settings Motif
        const accentFrame = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 8,
            css_classes: ['card'],
        });
        accentFrame.set_margin_start(6);
        accentFrame.set_margin_end(6);
        accentFrame.set_margin_top(4);
        accentFrame.set_margin_bottom(4);

        const accentHeader = new Gtk.Label({
            label: '<b>Accent Color</b>',
            use_markup: true,
            xalign: 0,
            margin_start: 12,
            margin_top: 8,
            css_classes: ['heading'],
        });
        accentFrame.append(accentHeader);

        const accentBox = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            spacing: 12,
            halign: Gtk.Align.CENTER,
            margin_start: 12,
            margin_end: 12,
            margin_top: 8,
            margin_bottom: 8,
        });

        const accentKeys = Object.keys(ThemeGenerator.ACCENT_PRESETS);
        let firstToggle = null;

        accentKeys.forEach(key => {
            const preset = ThemeGenerator.ACCENT_PRESETS[key];

            const toggle = new Gtk.ToggleButton({
                active: currentAccent === key,
                tooltip_text: preset.name,
                css_classes: ['accent-button', key, `accent-${key}`],
                width_request: 26,
                height_request: 26,
            });

            if (!firstToggle) {
                firstToggle = toggle;
            } else {
                toggle.set_group(firstToggle);
            }

            toggle.connect('toggled', () => {
                if (toggle.active) {
                    currentAccent = key;
                    updateVariantButtonStyles();
                    scheduleLiveSettingsSync();
                    updatePreview();
                }
            });

            accentButtons[key] = toggle;
            accentBox.append(toggle);
        });
        accentFrame.append(accentBox);

        // Automatic accent switch with preview circle
        const autoAccentBox = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            spacing: 12,
            margin_start: 12,
            margin_end: 12,
            margin_top: 4,
            margin_bottom: 8,
        });
        const autoAccentLabel = new Gtk.Label({
            label: 'Automatic color',
            xalign: 0,
            hexpand: true,
        });
        const autoColorPreview = new Gtk.Box({
            width_request: 26,
            height_request: 26,
            valign: Gtk.Align.CENTER,
            css_classes: ['accent-button', 'auto-accent-circle'],
        });
        const autoAccentSwitch = new Gtk.Switch({
            active: currentAutoAccent,
            valign: Gtk.Align.CENTER,
        });

        updateAutoColorPreview = () => {
            const detected = ThemeGenerator.extractAccentFromWallpaper(currentVariant === 'dark') || 'blue';
            const preset = ThemeGenerator.ACCENT_PRESETS[detected] || ThemeGenerator.ACCENT_PRESETS.blue;

            for (const key of Object.keys(ThemeGenerator.ACCENT_PRESETS)) {
                autoColorPreview.remove_css_class(key);
                autoColorPreview.remove_css_class(`accent-${key}`);
            }
            autoColorPreview.add_css_class(detected);
            autoColorPreview.add_css_class(`accent-${detected}`);
            autoColorPreview.set_tooltip_text(`Automatic: ${preset.name}`);

            if (currentAutoAccent) {
                autoColorPreview.add_css_class('active');
                autoColorPreview.set_opacity(1.0);
            } else {
                autoColorPreview.remove_css_class('active');
                autoColorPreview.set_opacity(0.45);
            }
            return detected;
        };

        const updateAutoAccentUI = () => {
            accentBox.set_sensitive(!currentAutoAccent);
            const autoColor = updateAutoColorPreview();
            if (currentAutoAccent) {
                if (autoColor && ThemeGenerator.ACCENT_PRESETS[autoColor]) {
                    currentAccent = autoColor;
                    if (accentButtons[autoColor]) {
                        accentButtons[autoColor].active = true;
                    }
                    updateVariantButtonStyles();
                    syncLiveSettingsNow();
                    updatePreview();
                }
            } else {
                syncLiveSettingsNow();
            }
        };

        autoAccentSwitch.connect('notify::active', () => {
            currentAutoAccent = autoAccentSwitch.active;
            updateAutoAccentUI();
        });

        updateAutoColorPreview();
        accentBox.set_sensitive(!currentAutoAccent);

        autoAccentBox.append(autoAccentLabel);
        autoAccentBox.append(autoColorPreview);
        autoAccentBox.append(autoAccentSwitch);
        accentFrame.append(autoAccentBox);

        // Accent strength slider
        const accentStrengthBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 4,
            margin_start: 12,
            margin_end: 12,
            margin_bottom: 12,
        });
        const accentStrengthLabel = new Gtk.Label({
            label: `Accent strength (sidebar): ${currentAccentStrength}%`,
            xalign: 0,
        });
        const accentStrengthScale = Gtk.Scale.new_with_range(Gtk.Orientation.HORIZONTAL, 0, 100, 5);
        accentStrengthScale.set_value(currentAccentStrength);
        accentStrengthScale.set_draw_value(false);
        accentStrengthScale.connect('value-changed', () => {
            currentAccentStrength = Math.round(accentStrengthScale.get_value());
            accentStrengthLabel.set_text(`Accent strength (sidebar): ${currentAccentStrength}%`);
            scheduleLiveSettingsSync();
            updatePreview();
        });
        accentStrengthBox.append(accentStrengthLabel);
        accentStrengthBox.append(accentStrengthScale);
        accentFrame.append(accentStrengthBox);

        if (interfaceSettings) {
            interfaceSettings.connect('changed::accent-color', () => {
                if (currentAutoAccent) return;
                const sysColor = interfaceSettings.get_string('accent-color');
                if (sysColor && accentButtons[sysColor] && currentAccent !== sysColor) {
                    currentAccent = sysColor;
                    accentButtons[sysColor].active = true;
                    updateVariantButtonStyles();
                    updatePreview();
                }
            });
        }

        if (bgSettings) {
            const onWallpaperChanged = () => {
                const autoColor = updateAutoColorPreview();
                if (currentAutoAccent) {
                    if (autoColor && ThemeGenerator.ACCENT_PRESETS[autoColor] && currentAccent !== autoColor) {
                        currentAccent = autoColor;
                        if (accentButtons[autoColor]) {
                            accentButtons[autoColor].active = true;
                        }
                        updateVariantButtonStyles();
                        syncLiveSettingsNow();
                        updatePreview();
                    }
                }
            };
            bgSettings.connect('changed::picture-uri', onWallpaperChanged);
            bgSettings.connect('changed::picture-uri-dark', onWallpaperChanged);
        }

        tabGeneralBox.append(accentFrame);

        // CSS Provider for Accent Buttons in preferences
        const accentStyleProvider = new Gtk.CssProvider();
        accentStyleProvider.load_from_string(`
            .accent-button {
                border-radius: 9999px;
                padding: 3px;
                min-width: 26px;
                min-height: 26px;
                outline: none;
                background-clip: content-box;
                box-shadow: none;
                border: none;
                transition: box-shadow 150ms ease, transform 100ms ease;
            }
            .accent-button:hover {
                box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent-bg-color) 45%, transparent);
            }
            .accent-button:checked {
                box-shadow: 0 0 0 3px var(--accent-bg-color);
                background-clip: content-box;
            }
            .auto-accent-circle {
                border-radius: 9999px;
                padding: 3px;
                min-width: 26px;
                min-height: 26px;
                outline: none;
                background-clip: content-box;
                box-shadow: 0 0 0 1px rgba(128, 128, 128, 0.25);
                transition: box-shadow 150ms ease, opacity 150ms ease;
            }
            .auto-accent-circle.active {
                box-shadow: 0 0 0 3px var(--accent-bg-color);
            }
            .accent-button.blue, .accent-button.accent-blue {
                background-color: ${ThemeGenerator.ACCENT_PRESETS.blue.hex};
                --accent-bg-color: ${ThemeGenerator.ACCENT_PRESETS.blue.hex};
            }
            .accent-button.teal, .accent-button.accent-teal {
                background-color: ${ThemeGenerator.ACCENT_PRESETS.teal.hex};
                --accent-bg-color: ${ThemeGenerator.ACCENT_PRESETS.teal.hex};
            }
            .accent-button.green, .accent-button.accent-green {
                background-color: ${ThemeGenerator.ACCENT_PRESETS.green.hex};
                --accent-bg-color: ${ThemeGenerator.ACCENT_PRESETS.green.hex};
            }
            .accent-button.yellow, .accent-button.accent-yellow {
                background-color: ${ThemeGenerator.ACCENT_PRESETS.yellow.hex};
                --accent-bg-color: ${ThemeGenerator.ACCENT_PRESETS.yellow.hex};
            }
            .accent-button.orange, .accent-button.orange {
                background-color: ${ThemeGenerator.ACCENT_PRESETS.orange.hex};
                --accent-bg-color: ${ThemeGenerator.ACCENT_PRESETS.orange.hex};
            }
            .accent-button.red, .accent-button.accent-red {
                background-color: ${ThemeGenerator.ACCENT_PRESETS.red.hex};
                --accent-bg-color: ${ThemeGenerator.ACCENT_PRESETS.red.hex};
            }
            .accent-button.pink, .accent-button.accent-pink {
                background-color: ${ThemeGenerator.ACCENT_PRESETS.pink.hex};
                --accent-bg-color: ${ThemeGenerator.ACCENT_PRESETS.pink.hex};
            }
            .accent-button.purple, .accent-button.accent-purple {
                background-color: ${ThemeGenerator.ACCENT_PRESETS.purple.hex};
                --accent-bg-color: ${ThemeGenerator.ACCENT_PRESETS.purple.hex};
            }
            .accent-button.slate, .accent-button.accent-slate {
                background-color: ${ThemeGenerator.ACCENT_PRESETS.slate.hex};
                --accent-bg-color: ${ThemeGenerator.ACCENT_PRESETS.slate.hex};
            }

            /* Dash to Dock style tabs */
            notebook > header {
                background-color: transparent;
                border: none;
                border-bottom: 1px solid alpha(currentColor, 0.15);
                padding: 0 4px;
                margin-bottom: 2px;
            }
            notebook > header tab {
                padding: 8px 18px;
                border: none;
                background: transparent;
                outline: none;
                box-shadow: none;
                color: alpha(currentColor, 0.7);
                font-weight: 500;
                border-bottom: 2px solid transparent;
                transition: color 150ms ease, border-color 150ms ease;
            }
            notebook > header tab:checked {
                color: @accent_color;
                border-bottom: 2px solid @accent_color;
            }
            notebook > header tab:hover:not(:checked) {
                color: currentColor;
            }
            notebook > stack {
                border: none;
                background: transparent;
            }

            /* Wallpaper Tab Cards & Badges */
            flowbox > flowboxchild {
                padding: 0;
                margin: 0;
                border-radius: 12px;
                background: transparent;
            }
            flowbox > flowboxchild:focus {
                outline: none;
            }
            aspectframe {
                border: none;
                background: transparent;
                padding: 0;
                margin: 0;
            }
            .wallpaper-thumbnail-card {
                border-radius: 10px;
                padding: 0;
                border: 2px solid transparent;
                background-color: alpha(currentColor, 0.08);
                transition: transform 120ms ease, box-shadow 150ms ease, border-color 150ms ease;
            }
            .wallpaper-thumbnail-card:hover {
                box-shadow: 0 3px 10px rgba(0, 0, 0, 0.35);
                transform: translateY(-1px);
            }
            .wallpaper-card-active {
                border: 2px solid var(--accent-bg-color, #3584e4) !important;
                box-shadow: 0 0 0 2px var(--accent-bg-color, #3584e4);
            }
            .wallpaper-check-badge {
                background-color: var(--accent-bg-color, #3584e4);
                color: #ffffff;
                border-radius: 9999px;
                min-width: 16px;
                min-height: 16px;
                padding: 2px;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
            }
            .wallpaper-close-btn {
                background-color: rgba(0, 0, 0, 0.65);
                color: #ffffff;
                border-radius: 9999px;
                min-width: 16px;
                min-height: 16px;
                padding: 2px;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
            }
            .wallpaper-close-btn:hover {
                background-color: #e01b24;
                color: #ffffff;
            }
            .wallpaper-video-badge {
                background-color: rgba(0, 0, 0, 0.72);
                color: #ffffff;
                border-radius: 4px;
                padding: 1px 4px;
                font-size: 9px;
                font-weight: bold;
            }
        `);
        Gtk.StyleContext.add_provider_for_display(
            Gdk.Display.get_default(),
            accentStyleProvider,
            Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION + 1
        );

        // =========================================================================
        // SECTION: Tab 2 - Windows & Controls Settings
        // =========================================================================

        // 4. I configure the Window Controls card
        const controlBtnCard = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 8,
            css_classes: ['card'],
        });
        controlBtnCard.set_margin_start(6);
        controlBtnCard.set_margin_end(6);
        controlBtnCard.set_margin_top(4);
        controlBtnCard.set_margin_bottom(4);

        const controlBtnHeader = new Gtk.Label({
            label: '<b>Window Controls [Experimental]</b>',
            use_markup: true,
            xalign: 0,
            margin_start: 12,
            margin_top: 8,
            margin_end: 12,
            css_classes: ['heading'],
        });
        controlBtnCard.append(controlBtnHeader);

        const controlBtnBox = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            spacing: 12,
            margin_start: 12,
            margin_end: 12,
            margin_top: 2,
            margin_bottom: 10,
        });

        const controlBtnTitle = new Gtk.Label({
            label: 'Stacked window controls [Experimental]',
            xalign: 0,
            hexpand: true,
        });

        const controlBtnSwitch = new Gtk.Switch({
            active: currentControlButtons,
            valign: Gtk.Align.CENTER,
        });
        controlBtnSwitch.connect('notify::active', () => {
            currentControlButtons = controlBtnSwitch.active;
            if (renderPreviewControls) {
                renderPreviewControls();
            }
            if (currentControlButtons) {
                const changed = ThemeGenerator.ensureWindowControlsEnabled();
                if (changed) {
                    window.add_toast(new Adw.Toast({
                        title: 'Enabled minimize and maximize buttons in system',
                        timeout: 3,
                    }));
                }
            }
            updatePreview();
        });

        controlBtnBox.append(controlBtnTitle);
        controlBtnBox.append(controlBtnSwitch);
        controlBtnCard.append(controlBtnBox);
        tabWindowsBox.append(controlBtnCard);

        // Dynamic Panel on Maximized Window Card
        const dynamicPanelCard = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 8,
            css_classes: ['card'],
            margin_top: 4,
            margin_bottom: 4,
        });

        const dynamicPanelHeader = new Gtk.Label({
            label: '<b>Top Bar &amp; Window Integration</b>',
            use_markup: true,
            xalign: 0,
            margin_top: 10,
            margin_start: 12,
            margin_end: 12,
            css_classes: ['heading'],
        });
        dynamicPanelCard.append(dynamicPanelHeader);

        const dynamicPanelRow = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            spacing: 12,
            margin_start: 12,
            margin_end: 12,
            margin_top: 2,
            margin_bottom: 12,
        });

        const dynamicPanelTextBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 2,
            hexpand: true,
        });
        const dynamicPanelTitle = new Gtk.Label({
            label: 'Adapt top bar to maximized window',
            xalign: 0,
        });
        const dynamicPanelDesc = new Gtk.Label({
            label: 'The top bar takes the solid background color of the maximized window (black for dark theme, white for light theme) for a seamless look.',
            xalign: 0,
            wrap: true,
            wrap_mode: Pango.WrapMode.WORD,
            css_classes: ['dim-label', 'caption'],
        });
        if (typeof dynamicPanelDesc.set_natural_wrap_mode === 'function') {
            dynamicPanelDesc.set_natural_wrap_mode(Gtk.NaturalWrapMode.NONE);
        }
        dynamicPanelTextBox.append(dynamicPanelTitle);
        dynamicPanelTextBox.append(dynamicPanelDesc);

        const dynamicPanelSwitch = new Gtk.Switch({
            active: currentDynamicPanelMaximized,
            valign: Gtk.Align.CENTER,
        });
        dynamicPanelSwitch.connect('notify::active', () => {
            currentDynamicPanelMaximized = dynamicPanelSwitch.active;
            try {
                settings.set_boolean('dynamic-panel-maximized', currentDynamicPanelMaximized);
            } catch (_) {}
        });

        dynamicPanelRow.append(dynamicPanelTextBox);
        dynamicPanelRow.append(dynamicPanelSwitch);
        dynamicPanelCard.append(dynamicPanelRow);
        tabWindowsBox.append(dynamicPanelCard);

        // =========================================================================
        // SECTION: Tab 4 - Unified Icon Theme & Squircle Generator
        // =========================================================================
        const iconShapeCard = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 12,
            css_classes: ['card'],
        });
        iconShapeCard.set_margin_start(6);
        iconShapeCard.set_margin_end(6);
        iconShapeCard.set_margin_top(4);
        iconShapeCard.set_margin_bottom(8);

        const iconShapeHeader = new Gtk.Label({
            label: '<b>Icon Shape & Squircle Theme Generator (adwita-square)</b>',
            use_markup: true,
            xalign: 0,
            wrap: true,
            wrap_mode: Pango.WrapMode.WORD,
            margin_start: 12,
            margin_top: 8,
            margin_end: 12,
            css_classes: ['heading'],
        });
        if (typeof iconShapeHeader.set_natural_wrap_mode === 'function') {
            iconShapeHeader.set_natural_wrap_mode(Gtk.NaturalWrapMode.NONE);
        }
        iconShapeCard.append(iconShapeHeader);

        const iconShapeDesc = new Gtk.Label({
            label: 'Configures a uniform squircle tile shape in GNOME Shell and generates a complete two-tone vector icon set in ~/.icons/adwita-square based on Adwaita. Ensures geometric consistency (corner radius, border, opacity, glyph scale) and resolves missing app icons.',
            xalign: 0,
            wrap: true,
            wrap_mode: Pango.WrapMode.WORD,
            margin_start: 12,
            margin_end: 12,
            css_classes: ['dim-label'],
        });
        if (typeof iconShapeDesc.set_natural_wrap_mode === 'function') {
            iconShapeDesc.set_natural_wrap_mode(Gtk.NaturalWrapMode.NONE);
        }
        iconShapeCard.append(iconShapeDesc);

        const iconShapeSwitchBox = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            spacing: 12,
            margin_start: 12,
            margin_end: 12,
            margin_top: 2,
            margin_bottom: 4,
        });

        const iconShapeSwitchTitle = new Gtk.Label({
            label: 'Force uniform icon shape',
            xalign: 0,
            wrap: true,
            wrap_mode: Pango.WrapMode.WORD,
            hexpand: true,
        });
        if (typeof iconShapeSwitchTitle.set_natural_wrap_mode === 'function') {
            iconShapeSwitchTitle.set_natural_wrap_mode(Gtk.NaturalWrapMode.NONE);
        }

        const iconShapeSwitch = new Gtk.Switch({
            active: currentForceIconShape,
            valign: Gtk.Align.CENTER,
        });

        const scheduleLiveIconSettingsSync = () => {
            scheduleLiveSettingsSync();
        };

        // 1. Squircle corner radius
        const iconSquircleRadiusBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 4,
            margin_start: 12,
            margin_end: 12,
            margin_top: 2,
        });
        const getSquircleRadiusText = val => `Squircle corner radius: ${val} px`;
        const iconSquircleRadiusLabel = new Gtk.Label({
            label: getSquircleRadiusText(currentIconSquircleRadius),
            xalign: 0,
        });
        const iconSquircleRadiusScale = Gtk.Scale.new_with_range(Gtk.Orientation.HORIZONTAL, 4, 36, 1);
        iconSquircleRadiusScale.set_value(currentIconSquircleRadius);
        iconSquircleRadiusScale.set_draw_value(false);
        iconSquircleRadiusScale.set_sensitive(currentForceIconShape);
        iconSquircleRadiusScale.connect('value-changed', () => {
            currentIconSquircleRadius = Math.round(iconSquircleRadiusScale.get_value());
            iconSquircleRadiusLabel.set_text(getSquircleRadiusText(currentIconSquircleRadius));
            scheduleLiveIconSettingsSync();
            if (renderIconPreview) {
                renderIconPreview();
            }
            updatePreview();
        });
        iconSquircleRadiusBox.append(iconSquircleRadiusLabel);
        iconSquircleRadiusBox.append(iconSquircleRadiusScale);

        // 2. Icon border width
        const iconBorderBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 4,
            margin_start: 12,
            margin_end: 12,
            margin_top: 2,
        });
        const getIconBorderText = val => val === 0 ? 'Icon border width: 0 px (no border)' : `Icon border width: ${val} px`;
        const iconBorderLabel = new Gtk.Label({
            label: getIconBorderText(currentIconBorderWidth),
            xalign: 0,
        });
        const iconBorderScale = Gtk.Scale.new_with_range(Gtk.Orientation.HORIZONTAL, 0, 5, 1);
        iconBorderScale.set_value(currentIconBorderWidth);
        iconBorderScale.set_draw_value(false);
        iconBorderScale.set_sensitive(currentForceIconShape);
        iconBorderScale.connect('value-changed', () => {
            currentIconBorderWidth = Math.round(iconBorderScale.get_value());
            iconBorderLabel.set_text(getIconBorderText(currentIconBorderWidth));
            scheduleLiveIconSettingsSync();
            updatePreview();
        });
        iconBorderBox.append(iconBorderLabel);
        iconBorderBox.append(iconBorderScale);

        // 3. Icon container opacity
        const iconOpacityBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 4,
            margin_start: 12,
            margin_end: 12,
            margin_top: 2,
        });
        const getIconOpacityText = val => {
            const extra = val === 0 ? ' (Fully opaque)' : (val === 100 ? ' (Fully transparent)' : '');
            return `Icon background transparency: ${val}%${extra}`;
        };
        const iconOpacityLabel = new Gtk.Label({
            label: getIconOpacityText(currentIconOpacity),
            xalign: 0,
        });
        const iconOpacityScale = Gtk.Scale.new_with_range(Gtk.Orientation.HORIZONTAL, 0, 100, 1);
        iconOpacityScale.set_value(currentIconOpacity);
        iconOpacityScale.set_draw_value(false);
        iconOpacityScale.set_sensitive(currentForceIconShape);
        iconOpacityScale.connect('value-changed', () => {
            currentIconOpacity = Math.round(iconOpacityScale.get_value());
            iconOpacityLabel.set_text(getIconOpacityText(currentIconOpacity));
            scheduleLiveIconSettingsSync();
            updatePreview();
        });
        iconOpacityBox.append(iconOpacityLabel);
        iconOpacityBox.append(iconOpacityScale);

        // 4. Inner icon scale
        const iconScaleBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 4,
            margin_start: 12,
            margin_end: 12,
            margin_top: 2,
        });
        const getIconScaleText = val => `Inner icon scale: ${val}%`;
        const iconScaleLabel = new Gtk.Label({
            label: getIconScaleText(currentIconShapeScale),
            xalign: 0,
        });
        const iconScaleScale = Gtk.Scale.new_with_range(Gtk.Orientation.HORIZONTAL, 50, 90, 2);
        iconScaleScale.set_value(currentIconShapeScale);
        iconScaleScale.set_draw_value(false);
        iconScaleScale.set_sensitive(currentForceIconShape);
        iconScaleScale.connect('value-changed', () => {
            currentIconShapeScale = Math.round(iconScaleScale.get_value());
            iconScaleLabel.set_text(getIconScaleText(currentIconShapeScale));
            if (renderIconPreview) {
                renderIconPreview();
            }
            scheduleLiveIconSettingsSync();
            updatePreview();
        });
        iconScaleBox.append(iconScaleLabel);
        iconScaleBox.append(iconScaleScale);

        // 5. Container size in shell
        const iconSizeBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 4,
            margin_start: 12,
            margin_end: 12,
            margin_top: 2,
        });
        const getIconSizeText = val => `Shell container size: ${val}×${val} px`;
        const iconSizeLabel = new Gtk.Label({
            label: getIconSizeText(currentIconShapeSize),
            xalign: 0,
        });
        const iconSizeScale = Gtk.Scale.new_with_range(Gtk.Orientation.HORIZONTAL, 40, 96, 2);
        iconSizeScale.set_value(currentIconShapeSize);
        iconSizeScale.set_draw_value(false);
        iconSizeScale.set_sensitive(currentForceIconShape);
        iconSizeScale.connect('value-changed', () => {
            currentIconShapeSize = Math.round(iconSizeScale.get_value());
            iconSizeLabel.set_text(getIconSizeText(currentIconShapeSize));
            if (renderIconPreview) {
                renderIconPreview();
            }
            scheduleLiveIconSettingsSync();
            updatePreview();
        });
        iconSizeBox.append(iconSizeLabel);
        iconSizeBox.append(iconSizeScale);

        // 6. Palette mode: Adaptive vs Accent
        const iconPaletteBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 4,
            margin_start: 12,
            margin_end: 12,
            margin_top: 2,
        });
        const iconPaletteLabel = new Gtk.Label({
            label: 'Icon color palette (Palette mode):',
            xalign: 0,
        });
        const paletteModel = new Gtk.StringList();
        paletteModel.append('Original colors (Multicolor)');
        paletteModel.append('Adaptive with accent (System accent)');
        paletteModel.append('Adaptive two-tone (White icon)');

        const paletteModes = ['colored', 'accent', 'adaptive'];
        let selectedIndex = paletteModes.indexOf(currentIconPaletteMode);
        if (selectedIndex === -1) selectedIndex = paletteModes.indexOf('accent');

        const iconPaletteDropDown = new Gtk.DropDown({
            model: paletteModel,
            selected: selectedIndex,
        });
        iconPaletteDropDown.set_sensitive(currentForceIconShape);
        iconPaletteDropDown.connect('notify::selected', () => {
            currentIconPaletteMode = paletteModes[iconPaletteDropDown.selected] || 'accent';
            scheduleLiveIconSettingsSync();
            updatePreview();
        });
        iconPaletteBox.append(iconPaletteLabel);
        iconPaletteBox.append(iconPaletteDropDown);

        // Option to automatically regenerate icons in background on accent / wallpaper change
        const iconAutoRegenBox = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            spacing: 12,
            margin_start: 12,
            margin_end: 12,
            margin_top: 2,
            margin_bottom: 4,
        });

        const iconAutoRegenTitleBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 2,
            hexpand: true,
        });

        const iconAutoRegenTitle = new Gtk.Label({
            label: 'Automatically refresh icons in background',
            xalign: 0,
        });

        const iconAutoRegenDesc = new Gtk.Label({
            label: 'When the accent color or wallpaper changes, the adaptive accent style automatically refreshes icons in the background.',
            xalign: 0,
            wrap: true,
            css_classes: ['dim-label'],
        });

        iconAutoRegenTitleBox.append(iconAutoRegenTitle);
        iconAutoRegenTitleBox.append(iconAutoRegenDesc);

        const iconAutoRegenSwitch = new Gtk.Switch({
            active: currentIconAutoRegen,
            valign: Gtk.Align.CENTER,
        });
        iconAutoRegenSwitch.set_sensitive(currentForceIconShape);

        iconAutoRegenSwitch.connect('notify::active', () => {
            currentIconAutoRegen = iconAutoRegenSwitch.active;
            scheduleLiveIconSettingsSync();
        });

        iconAutoRegenBox.append(iconAutoRegenTitleBox);
        iconAutoRegenBox.append(iconAutoRegenSwitch);

        // Progress bar and generator status
        const iconGenStatusBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 6,
            margin_start: 12,
            margin_end: 12,
            margin_top: 8,
        });
        const iconGenProgressBar = new Gtk.ProgressBar({
            fraction: 0,
            hexpand: true,
            visible: false,
        });
        const iconGenStatusLabel = new Gtk.Label({
            label: 'Ready to generate icons in ~/.icons/adwita-square',
            xalign: 0,
            wrap: true,
            css_classes: ['dim-label'],
        });
        iconGenStatusBox.append(iconGenProgressBar);
        iconGenStatusBox.append(iconGenStatusLabel);

        // Generator action buttons
        const iconGenBtnBox = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            spacing: 12,
            margin_start: 12,
            margin_end: 12,
            margin_top: 6,
            margin_bottom: 12,
            homogeneous: true,
        });

        const generateIconsBtn = new Gtk.Button({
            label: '⚡ Generate Icon Set',
            css_classes: ['suggested-action'],
        });
        generateIconsBtn.set_size_request(-1, 40);

        const applyIconsBtn = new Gtk.Button({
            label: '🚀 Activate Icon Theme',
            css_classes: ['accent'],
            sensitive: GLib.file_test(IconThemeGenerator.getIconThemeDir(), GLib.FileTest.IS_DIR),
        });
        applyIconsBtn.set_size_request(-1, 40);

        iconShapeSwitch.connect('notify::active', () => {
            currentForceIconShape = iconShapeSwitch.active;
            iconSquircleRadiusScale.set_sensitive(currentForceIconShape);
            iconBorderScale.set_sensitive(currentForceIconShape);
            iconSizeScale.set_sensitive(currentForceIconShape);
            iconScaleScale.set_sensitive(currentForceIconShape);
            iconOpacityScale.set_sensitive(currentForceIconShape);
            iconPaletteDropDown.set_sensitive(currentForceIconShape);
            iconAutoRegenSwitch.set_sensitive(currentForceIconShape);
            generateIconsBtn.set_sensitive(currentForceIconShape);
            if (renderIconPreview) {
                renderIconPreview();
            }
            scheduleLiveIconSettingsSync();
            updatePreview();
        });

        const showReloginDialog = () => {
            try {
                const dialog = new Adw.MessageDialog({
                    heading: 'Relogin Required',
                    body: 'The adwita-square icon theme has been activated in GNOME.\n\nFor all applications, the dock, and the app grid to load the new icons, it is recommended to log out and log back in.',
                });
                dialog.add_response('ok', 'Got it');
                dialog.set_default_response('ok');
                dialog.present(window);
            } catch (_) {
                window.add_toast(new Adw.Toast({
                    title: 'Theme activated! Log out and back in to update all icons.',
                    timeout: 8,
                }));
            }
        };

        generateIconsBtn.connect('clicked', () => {
            generateIconsBtn.set_sensitive(false);
            applyIconsBtn.set_sensitive(false);
            iconGenProgressBar.set_visible(true);
            iconGenProgressBar.set_fraction(0);
            iconGenStatusLabel.set_text('Starting icon generation...');

            IconThemeGenerator.generateFullIconThemeChunked(
                {
                    cornerRadius: currentIconSquircleRadius,
                    borderWidth: currentIconBorderWidth,
                    opacity: currentIconOpacity > 0 ? (100 - currentIconOpacity) : 100,
                    innerScale: currentIconShapeScale / 100,
                    accentColor: currentAccent,
                    paletteMode: currentIconPaletteMode,
                },
                (current, total, appName) => {
                    const frac = total > 0 ? current / total : 0;
                    iconGenProgressBar.set_fraction(frac);
                    iconGenStatusLabel.set_text(`Processing (${current}/${total}): ${appName || ''}`);
                },
                (result) => {
                    generateIconsBtn.set_sensitive(true);
                    applyIconsBtn.set_sensitive(true);
                    iconGenProgressBar.set_fraction(1.0);
                    iconGenStatusLabel.set_markup(
                        `<b>✓ Generated ${result.generatedCount} icons in ~/.icons/adwita-square!</b>`
                    );
                    window.add_toast(new Adw.Toast({
                        title: `Generated ${result.generatedCount} icons! Click 'Activate Icon Theme' and log out/in.`,
                        timeout: 6,
                    }));
                }
            );
        });

        applyIconsBtn.connect('clicked', () => {
            const ok = IconThemeGenerator.applyIconTheme();
            if (ok) {
                showReloginDialog();
            } else {
                window.add_toast(new Adw.Toast({
                    title: 'Error activating icon theme.',
                    timeout: 4,
                }));
            }
        });

        iconShapeSwitchBox.append(iconShapeSwitchTitle);
        iconShapeSwitchBox.append(iconShapeSwitch);
        iconShapeCard.append(iconShapeSwitchBox);

        iconShapeCard.append(iconSquircleRadiusBox);
        iconShapeCard.append(iconBorderBox);
        iconShapeCard.append(iconOpacityBox);
        iconShapeCard.append(iconScaleBox);
        iconShapeCard.append(iconSizeBox);
        iconShapeCard.append(iconPaletteBox);
        iconShapeCard.append(iconAutoRegenBox);
        iconShapeCard.append(iconGenStatusBox);

        iconGenBtnBox.append(generateIconsBtn);
        iconGenBtnBox.append(applyIconsBtn);
        iconShapeCard.append(iconGenBtnBox);

        tabIconsBox.append(iconShapeCard);

        // =========================================================================
        // SECTION: Tab 3 - Dock & Dash Settings
        // =========================================================================

        // 5. I configure the Dock & Dash card
        const dockCard = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 12,
            css_classes: ['card'],
        });
        dockCard.set_margin_start(6);
        dockCard.set_margin_end(6);
        dockCard.set_margin_top(4);
        dockCard.set_margin_bottom(4);

        const dockHeader = new Gtk.Label({
            label: '<b>Dock (Dock / Dash)</b>',
            use_markup: true,
            xalign: 0,
            margin_start: 12,
            margin_top: 8,
            css_classes: ['heading'],
        });
        dockCard.append(dockHeader);

        // Opacity dock
        const dockOpacityBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 4,
            margin_start: 12,
            margin_end: 12,
        });
        const getDockOpacityText = val => {
            const extra = val === 0 ? ' (Opaque)' : (val === 100 ? ' (Fully transparent)' : '');
            return `Dock opacity: ${val}%${extra}`;
        };
        const dockOpacityLabel = new Gtk.Label({
            label: getDockOpacityText(currentDockOpacity),
            xalign: 0,
        });
        const dockOpacityScale = Gtk.Scale.new_with_range(Gtk.Orientation.HORIZONTAL, 0, 100, 1);
        dockOpacityScale.set_value(currentDockOpacity);
        dockOpacityScale.set_draw_value(false);
        dockOpacityScale.connect('value-changed', () => {
            currentDockOpacity = Math.round(dockOpacityScale.get_value());
            dockOpacityLabel.set_text(getDockOpacityText(currentDockOpacity));
            scheduleLiveSettingsSync();
            updatePreview();
        });
        dockOpacityBox.append(dockOpacityLabel);
        dockOpacityBox.append(dockOpacityScale);
        dockCard.append(dockOpacityBox);

        // Blur dock
        const dockBlurBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 4,
            margin_start: 12,
            margin_end: 12,
        });
        const getDockBlurText = val => {
            const extra = val === 0 ? ' (Disabled)' : '';
            return `Dock background blur: ${val}px${extra}`;
        };
        const dockBlurLabel = new Gtk.Label({
            label: getDockBlurText(currentDockBlur),
            xalign: 0,
        });
        const dockBlurScale = Gtk.Scale.new_with_range(Gtk.Orientation.HORIZONTAL, 0, 40, 1);
        dockBlurScale.set_value(currentDockBlur);
        dockBlurScale.set_draw_value(false);
        dockBlurScale.connect('value-changed', () => {
            currentDockBlur = Math.round(dockBlurScale.get_value());
            dockBlurLabel.set_text(getDockBlurText(currentDockBlur));
            scheduleLiveSettingsSync();
            updatePreview();
        });
        dockBlurBox.append(dockBlurLabel);
        dockBlurBox.append(dockBlurScale);
        dockCard.append(dockBlurBox);

        // Dock border width
        const dockBorderBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 4,
            margin_start: 12,
            margin_end: 12,
        });
        const getDockBorderText = val => {
            const extra = val === 0 ? ' (No border)' : (val === 1 ? ' (Default: 1px)' : '');
            return `Dock border width: ${val}px${extra}`;
        };
        const dockBorderLabel = new Gtk.Label({
            label: getDockBorderText(currentBorderWidth),
            xalign: 0,
        });
        const dockBorderScale = Gtk.Scale.new_with_range(Gtk.Orientation.HORIZONTAL, 0, 5, 1);
        dockBorderScale.set_value(currentBorderWidth);
        dockBorderScale.set_draw_value(false);
        dockBorderScale.connect('value-changed', () => {
            currentBorderWidth = Math.round(dockBorderScale.get_value());
            dockBorderLabel.set_text(getDockBorderText(currentBorderWidth));
            scheduleLiveSettingsSync();
            updatePreview();
        });
        dockBorderBox.append(dockBorderLabel);
        dockBorderBox.append(dockBorderScale);
        dockCard.append(dockBorderBox);

        // Dock corner radius
        const dockCornerBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 4,
            margin_start: 12,
            margin_end: 12,
            margin_bottom: 8,
        });
        const getDockCornerText = val => {
            const extra = val === 0 ? ' (Sharp corners)' : (val === 3 ? ' (Default: 3px)' : '');
            return `Dock corner radius: ${val}px${extra}`;
        };
        const dockCornerLabel = new Gtk.Label({
            label: getDockCornerText(currentDockCornerRadius),
            xalign: 0,
        });
        const dockCornerScale = Gtk.Scale.new_with_range(Gtk.Orientation.HORIZONTAL, 0, 35, 1);
        dockCornerScale.set_value(currentDockCornerRadius);
        dockCornerScale.set_draw_value(false);
        dockCornerScale.connect('value-changed', () => {
            currentDockCornerRadius = Math.round(dockCornerScale.get_value());
            dockCornerLabel.set_text(getDockCornerText(currentDockCornerRadius));
            scheduleLiveSettingsSync();
            updatePreview();
        });
        dockCornerBox.append(dockCornerLabel);
        dockCornerBox.append(dockCornerScale);
        dockCard.append(dockCornerBox);

        tabDockBox.append(dockCard);

        // 6. Windows & Sidebar
        const slidersFrame = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 12,
            css_classes: ['card'],
        });
        slidersFrame.set_margin_start(6);
        slidersFrame.set_margin_end(6);
        slidersFrame.set_margin_top(4);
        slidersFrame.set_margin_bottom(4);

        const slidersHeader = new Gtk.Label({
            label: '<b>Windows &amp; Sidebar</b>',
            use_markup: true,
            xalign: 0,
            margin_start: 12,
            margin_top: 8,
            css_classes: ['heading'],
        });
        slidersFrame.append(slidersHeader);

        // Opacity slider: 0 = opaque, 100% = max transparent
        const opacityBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 4,
            margin_start: 12,
            margin_end: 12,
        });
        const getOpacityText = val => {
            const extra = val === 0 ? ' (Opaque)' : (val === 100 ? ' (Fully transparent)' : '');
            return `Window & sidebar opacity: ${val}%${extra}`;
        };
        const opacityLabel = new Gtk.Label({
            label: getOpacityText(currentOpacity),
            xalign: 0,
        });
        const opacityScale = Gtk.Scale.new_with_range(Gtk.Orientation.HORIZONTAL, 0, 100, 1);
        opacityScale.set_value(currentOpacity);
        opacityScale.set_draw_value(false);
        opacityScale.connect('value-changed', () => {
            currentOpacity = Math.round(opacityScale.get_value());
            opacityLabel.set_text(getOpacityText(currentOpacity));
            scheduleLiveSettingsSync();
            updatePreview();
        });
        opacityBox.append(opacityLabel);
        opacityBox.append(opacityScale);
        slidersFrame.append(opacityBox);

        // Blur slider: native background blur control [BETA]
        const blurBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 4,
            margin_start: 12,
            margin_end: 12,
        });
        const getBlurText = val => {
            const extra = val === 0 ? ' (Disabled)' : '';
            return `Window background blur [Beta]: ${val}px${extra}`;
        };
        const blurLabel = new Gtk.Label({
            label: getBlurText(currentBlur),
            xalign: 0,
        });
        const blurDesc = new Gtk.Label({
            label: 'Beta feature – experimental background blur effect behind application windows.',
            xalign: 0,
            wrap: true,
            css_classes: ['dim-label'],
        });
        const blurScale = Gtk.Scale.new_with_range(Gtk.Orientation.HORIZONTAL, 0, 40, 1);
        blurScale.set_value(currentBlur);
        blurScale.set_draw_value(false);
        blurScale.connect('value-changed', () => {
            currentBlur = Math.round(blurScale.get_value());
            blurLabel.set_text(getBlurText(currentBlur));
            scheduleLiveSettingsSync();
            updatePreview();
        });
        blurBox.append(blurLabel);
        blurBox.append(blurDesc);
        blurBox.append(blurScale);
        slidersFrame.append(blurBox);

        // Corner radius slider: 0px = square buttons
        const cornerBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 4,
            margin_start: 12,
            margin_end: 12,
            margin_bottom: 6,
        });
        const getCornerText = val => {
            const extra = val === 0 ? ' (Sharp corners)' : (val === 3 ? ' (Default: 3px)' : '');
            return `Corner radius: ${val}px${extra}`;
        };
        const cornerLabel = new Gtk.Label({
            label: getCornerText(currentCorner),
            xalign: 0,
        });
        const cornerScale = Gtk.Scale.new_with_range(Gtk.Orientation.HORIZONTAL, 0, 20, 1);
        cornerScale.set_value(currentCorner);
        cornerScale.set_draw_value(false);
        cornerScale.connect('value-changed', () => {
            currentCorner = Math.round(cornerScale.get_value());
            cornerLabel.set_text(getCornerText(currentCorner));
            scheduleLiveSettingsSync();
            updatePreview();
        });
        cornerBox.append(cornerLabel);
        cornerBox.append(cornerScale);
        slidersFrame.append(cornerBox);

        // Window buttons size slider (Headerbar / Topbar controls)
        const buttonSizeBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 4,
            margin_start: 12,
            margin_end: 12,
            margin_bottom: 12,
        });

        const buttonSizeLabel = new Gtk.Label({
            label: `Window headerbar buttons: ${currentButtonSize}×${currentButtonSize} px`,
            xalign: 0,
        });
        const buttonSizeDesc = new Gtk.Label({
            label: 'Size of window control buttons (close, minimize, maximize) in the headerbar.',
            xalign: 0,
            wrap: true,
            css_classes: ['dim-label'],
        });
        const buttonSizeScale = Gtk.Scale.new_with_range(Gtk.Orientation.HORIZONTAL, 20, 48, 1);
        buttonSizeScale.set_value(currentButtonSize);
        buttonSizeScale.set_draw_value(false);
        buttonSizeScale.connect('value-changed', () => {
            currentButtonSize = Math.round(buttonSizeScale.get_value());
            buttonSizeLabel.set_text(`Window headerbar buttons: ${currentButtonSize}×${currentButtonSize} px`);
            scheduleLiveSettingsSync();
            updatePreview();
        });
        buttonSizeBox.append(buttonSizeLabel);
        buttonSizeBox.append(buttonSizeDesc);
        buttonSizeBox.append(buttonSizeScale);
        slidersFrame.append(buttonSizeBox);

        tabWindowsBox.append(slidersFrame);

        // 4c. Browser Windows Integration Card (Firefox, Chrome, Chromium)
        const browsersCard = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 10,
            css_classes: ['card'],
        });
        browsersCard.set_margin_start(6);
        browsersCard.set_margin_end(6);
        browsersCard.set_margin_top(4);
        browsersCard.set_margin_bottom(4);

        const browsersHeader = new Gtk.Label({
            label: '<b>Web Browsers</b>',
            use_markup: true,
            xalign: 0,
            margin_start: 12,
            margin_top: 8,
            margin_end: 12,
            css_classes: ['heading'],
        });
        const browsersDesc = new Gtk.Label({
            label: 'Adwita Square style integration for browser windows. Firefox and Chrome/Chromium windows always use our classic horizontal square window controls (vertical stacked controls are intentionally disabled for them).',
            xalign: 0,
            margin_start: 12,
            margin_end: 12,
            margin_bottom: 4,
            css_classes: ['dim-label'],
            wrap: true,
            wrap_mode: Pango.WrapMode.WORD,
        });
        if (typeof browsersDesc.set_natural_wrap_mode === 'function') {
            browsersDesc.set_natural_wrap_mode(Gtk.NaturalWrapMode.NONE);
        }
        browsersCard.append(browsersHeader);
        browsersCard.append(browsersDesc);

        // Firefox Row with Switch
        const firefoxRowBox = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            spacing: 12,
            margin_start: 12,
            margin_end: 12,
            margin_top: 6,
            margin_bottom: 6,
        });
        const firefoxTextBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 2,
            hexpand: true,
        });
        const firefoxTitle = new Gtk.Label({
            label: '<b>Mozilla Firefox (tabs &amp; toolbars)</b>',
            use_markup: true,
            xalign: 0,
        });
        const firefoxSub = new Gtk.Label({
            label: 'Applies square tabs, sleek address bar, and accent color in Firefox (userChrome.css).',
            xalign: 0,
            css_classes: ['dim-label'],
            wrap: true,
        });
        firefoxTextBox.append(firefoxTitle);
        firefoxTextBox.append(firefoxSub);

        const firefoxSwitch = new Gtk.Switch({
            active: currentFirefoxTheme,
            valign: Gtk.Align.CENTER,
        });
        firefoxSwitch.connect('notify::active', () => {
            currentFirefoxTheme = firefoxSwitch.active;
            try {
                settings.set_boolean('firefox-theme', currentFirefoxTheme);
            } catch (_) {}

            if (currentFirefoxTheme) {
                const res = BrowserTheme.applyFirefoxTheme({
                    variant: currentVariant,
                    accentColor: currentAccent,
                    cornerRadius: currentCorner,
                    buttonSize: currentButtonSize,
                });
                window.add_toast(new Adw.Toast({
                    title: res.message,
                    timeout: 4,
                }));
            } else {
                const res = BrowserTheme.removeFirefoxTheme();
                window.add_toast(new Adw.Toast({
                    title: res.message,
                    timeout: 3,
                }));
            }
        });
        firefoxRowBox.append(firefoxTextBox);
        firefoxRowBox.append(firefoxSwitch);
        browsersCard.append(firefoxRowBox);

        // Chrome / Chromium Row with Switch
        const chromiumRowBox = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            spacing: 12,
            margin_start: 12,
            margin_end: 12,
            margin_top: 6,
            margin_bottom: 10,
        });
        const chromiumTextBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 2,
            hexpand: true,
        });
        const chromiumTitle = new Gtk.Label({
            label: '<b>Google Chrome &amp; Chromium (system title bar &amp; borders)</b>',
            use_markup: true,
            xalign: 0,
            wrap: true,
            wrap_mode: Pango.WrapMode.WORD,
        });
        if (typeof chromiumTitle.set_natural_wrap_mode === 'function') {
            chromiumTitle.set_natural_wrap_mode(Gtk.NaturalWrapMode.NONE);
        }
        const chromiumSub = new Gtk.Label({
            label: 'Enforces system headerbar with our square buttons and GTK theme.',
            xalign: 0,
            css_classes: ['dim-label'],
            wrap: true,
        });
        chromiumTextBox.append(chromiumTitle);
        chromiumTextBox.append(chromiumSub);

        const chromiumSwitch = new Gtk.Switch({
            active: currentChromiumTheme,
            valign: Gtk.Align.CENTER,
        });
        chromiumSwitch.connect('notify::active', () => {
            currentChromiumTheme = chromiumSwitch.active;
            try {
                settings.set_boolean('chromium-theme', currentChromiumTheme);
            } catch (_) {}

            const res = BrowserTheme.applyChromiumTheme(currentChromiumTheme);
            window.add_toast(new Adw.Toast({
                title: res.message,
                timeout: 4,
            }));
        });
        chromiumRowBox.append(chromiumTextBox);
        chromiumRowBox.append(chromiumSwitch);
        browsersCard.append(chromiumRowBox);

        tabWindowsBox.append(browsersCard);

        // =========================================================================
        // SECTION: Tab 5 - Wallpaper Slideshow & Video Backgrounds
        // =========================================================================

        // 1. I configure the Refresh Interval & Change on Login card
        const refreshCard = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 10,
            css_classes: ['card'],
        });
        refreshCard.set_margin_start(6);
        refreshCard.set_margin_end(6);
        refreshCard.set_margin_top(4);
        refreshCard.set_margin_bottom(6);

        // Header: "Refresh" on the left, current interval on the right in blue
        const refreshHeaderBox = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            spacing: 8,
            margin_start: 14,
            margin_end: 14,
            margin_top: 12,
        });
        const refreshTitleLabel = new Gtk.Label({
            label: '<b>Refresh</b>',
            use_markup: true,
            xalign: 0,
            hexpand: true,
            css_classes: ['heading'],
        });
        refreshHeaderBox.append(refreshTitleLabel);

        let currentInterval = 0;
        try {
            currentInterval = settings.get_int('wallpaper-interval');
        } catch (_) {}

        const currentPreset = WallpaperManager.getIntervalPresetByIndex(
            WallpaperManager.getIntervalIndex(currentInterval)
        );

        const refreshValueLabel = new Gtk.Label({
            label: `<span color="#3584e4" weight="bold">${currentPreset.text}</span>`,
            use_markup: true,
            xalign: 1,
            css_classes: ['accent-label'],
        });
        refreshHeaderBox.append(refreshValueLabel);
        refreshCard.append(refreshHeaderBox);

        // Slider (Scale) with marks: Off | 1m | 5m | 15m | 30m | 60m
        const scaleBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 4,
            margin_start: 14,
            margin_end: 14,
            margin_bottom: 8,
        });

        const refreshScale = Gtk.Scale.new_with_range(Gtk.Orientation.HORIZONTAL, 0, 5, 1);
        refreshScale.set_draw_value(false);
        refreshScale.set_round_digits(0);
        refreshScale.set_value(WallpaperManager.getIntervalIndex(currentInterval));

        for (let i = 0; i < WallpaperManager.INTERVAL_PRESETS.length; i++) {
            refreshScale.add_mark(i, Gtk.PositionType.BOTTOM, WallpaperManager.INTERVAL_PRESETS[i].label);
        }

        refreshScale.connect('value-changed', () => {
            const idx = Math.round(refreshScale.get_value());
            const preset = WallpaperManager.getIntervalPresetByIndex(idx);
            refreshValueLabel.set_markup(`<span color="#3584e4" weight="bold">${preset.text}</span>`);
            try {
                settings.set_int('wallpaper-interval', preset.value);
            } catch (_) {}
        });
        scaleBox.append(refreshScale);
        refreshCard.append(scaleBox);

        refreshCard.append(new Gtk.Separator({ orientation: Gtk.Orientation.HORIZONTAL }));

        // Action Row: "Change on login"
        const loginRow = new Adw.ActionRow({
            title: 'Change on login',
            subtitle: 'Automatically changes the wallpaper when the session starts',
        });
        if (typeof loginRow.set_subtitle_lines === 'function') loginRow.set_subtitle_lines(0);
        if (typeof loginRow.set_title_lines === 'function') loginRow.set_title_lines(0);
        const loginSwitch = new Gtk.Switch({
            valign: Gtk.Align.CENTER,
        });
        try {
            loginSwitch.set_active(settings.get_boolean('wallpaper-change-on-login'));
        } catch (_) {}
        loginSwitch.connect('notify::active', () => {
            try {
                settings.set_boolean('wallpaper-change-on-login', loginSwitch.get_active());
            } catch (_) {}
        });
        loginRow.add_suffix(loginSwitch);
        loginRow.set_activatable_widget(loginSwitch);
        refreshCard.append(loginRow);

        // Action Row: "Smooth wallpaper crossfade"
        const transitionRow = new Adw.ActionRow({
            title: 'Smooth wallpaper crossfade',
            subtitle: 'Smoothly crossfades from the old wallpaper to the new one using transparency',
        });
        if (typeof transitionRow.set_subtitle_lines === 'function') transitionRow.set_subtitle_lines(0);
        if (typeof transitionRow.set_title_lines === 'function') transitionRow.set_title_lines(0);
        const transitionSwitch = new Gtk.Switch({
            valign: Gtk.Align.CENTER,
        });
        try {
            transitionSwitch.set_active(settings.get_boolean('wallpaper-transition'));
        } catch (_) {}
        transitionSwitch.connect('notify::active', () => {
            try {
                settings.set_boolean('wallpaper-transition', transitionSwitch.get_active());
            } catch (_) {}
        });
        transitionRow.add_suffix(transitionSwitch);
        transitionRow.set_activatable_widget(transitionSwitch);
        refreshCard.append(transitionRow);

        // Action Row: "Wallpaper rotation" + Next wallpaper button
        const changeNowRow = new Adw.ActionRow({
            title: 'Wallpaper rotation',
            subtitle: 'Randomly changes wallpaper from the selected folder',
        });
        if (typeof changeNowRow.set_subtitle_lines === 'function') changeNowRow.set_subtitle_lines(0);
        if (typeof changeNowRow.set_title_lines === 'function') changeNowRow.set_title_lines(0);
        const randomSwitch = new Gtk.Switch({
            valign: Gtk.Align.CENTER,
            tooltip_text: 'Random order',
        });
        try {
            randomSwitch.set_active(settings.get_boolean('wallpaper-random'));
        } catch (_) {}
        randomSwitch.connect('notify::active', () => {
            try {
                settings.set_boolean('wallpaper-random', randomSwitch.get_active());
            } catch (_) {}
        });

        changeNowRow.add_suffix(new Gtk.Label({ label: 'Randomize:', css_classes: ['dim-label'], valign: Gtk.Align.CENTER }));
        changeNowRow.add_suffix(randomSwitch);
        refreshCard.append(changeNowRow);

        const nextBtnBox = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            margin_start: 14,
            margin_end: 14,
            margin_top: 2,
            margin_bottom: 8,
        });
        const nextBtn = new Gtk.Button({
            label: '🎲 Change wallpaper now',
            valign: Gtk.Align.CENTER,
            hexpand: true,
            css_classes: ['suggested-action'],
        });
        nextBtnBox.append(nextBtn);
        refreshCard.append(nextBtnBox);

        tabWallpaperBox.append(refreshCard);

        // 2. Wallpaper Folder & Thumbnails Grid Card (Image 1 style)
        const wallpaperCard = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 12,
            css_classes: ['card'],
        });
        wallpaperCard.set_margin_start(6);
        wallpaperCard.set_margin_end(6);
        wallpaperCard.set_margin_top(4);
        wallpaperCard.set_margin_bottom(8);

        // Header: "Background" on the left, "+ Add folder..." on the right
        const wpHeaderBox = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            spacing: 12,
            margin_start: 14,
            margin_end: 14,
            margin_top: 14,
        });

        const wpTitleBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 2,
            hexpand: true,
        });
        const wpTitleLabel = new Gtk.Label({
            label: '<b>Background</b>',
            use_markup: true,
            xalign: 0,
            css_classes: ['heading'],
        });
        const wpSubtitleLabel = new Gtk.Label({
            label: 'Load wallpapers from a selected folder (supports images, MP4/WEBM videos, and animated WebP)',
            xalign: 0,
            wrap: true,
            wrap_mode: Pango.WrapMode.WORD,
            css_classes: ['dim-label', 'caption'],
        });
        if (typeof wpSubtitleLabel.set_natural_wrap_mode === 'function') {
            wpSubtitleLabel.set_natural_wrap_mode(Gtk.NaturalWrapMode.NONE);
        }
        wpTitleBox.append(wpTitleLabel);
        wpTitleBox.append(wpSubtitleLabel);
        wpHeaderBox.append(wpTitleBox);

        const addFolderBtn = new Gtk.Button({
            label: '+ Add folder...',
            css_classes: ['suggested-action'],
            valign: Gtk.Align.CENTER,
        });
        wpHeaderBox.append(addFolderBtn);
        wallpaperCard.append(wpHeaderBox);

        // Folder path & refresh row
        const folderInfoBar = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            spacing: 8,
            margin_start: 14,
            margin_end: 14,
            margin_top: 4,
            margin_bottom: 4,
        });
        const folderPathLabel = new Gtk.Label({
            label: 'No folder selected',
            xalign: 0,
            hexpand: true,
            ellipsize: 3,
            css_classes: ['dim-label', 'caption'],
        });
        const refreshFolderBtn = new Gtk.Button({
            icon_name: 'view-refresh-symbolic',
            tooltip_text: 'Refresh folder',
            css_classes: ['flat', 'circular'],
            valign: Gtk.Align.CENTER,
        });
        folderInfoBar.append(folderPathLabel);
        folderInfoBar.append(refreshFolderBtn);
        wallpaperCard.append(folderInfoBar);

        // FlowBox for wallpapers grid scaling dynamically from 1 to 3 columns
        const flowBox = new Gtk.FlowBox({
            selection_mode: Gtk.SelectionMode.NONE,
            homogeneous: true,
            min_children_per_line: 1,
            max_children_per_line: 3,
            column_spacing: 12,
            row_spacing: 12,
            hexpand: true,
            margin_start: 10,
            margin_end: 10,
            margin_top: 8,
            margin_bottom: 12,
        });
        wallpaperCard.append(flowBox);

        let wallpaperCardsList = [];
        let currentColumns = 0;
        let currentCardHeight = 84;

        const updateFlowBoxColumns = () => {
            const width = flowBox.get_width();
            if (width <= 0) return;

            let targetCols = 3;
            if (width < 240) {
                targetCols = 1;
            } else if (width < 380) {
                targetCols = 2;
            } else {
                targetCols = 3;
            }

            const usableWidth = Math.max(80, width - 20 - (targetCols - 1) * 12);
            const colWidth = Math.floor(usableWidth / targetCols);
            const targetHeight = Math.max(60, Math.min(130, Math.round(colWidth / 1.5)));

            const numItems = wallpaperCardsList.length;
            const effectiveMin = Math.min(targetCols, numItems > 0 ? numItems : 1);

            if (currentColumns !== targetCols || flowBox.get_min_children_per_line() !== effectiveMin) {
                currentColumns = targetCols;
                flowBox.set_min_children_per_line(effectiveMin);
                flowBox.set_max_children_per_line(targetCols);
            }

            if (currentCardHeight !== targetHeight) {
                currentCardHeight = targetHeight;
                for (const c of wallpaperCardsList) {
                    c.set_size_request(-1, targetHeight);
                }
            }
        };

        const flowBoxTickId = flowBox.add_tick_callback(() => {
            updateFlowBoxColumns();
            return GLib.SOURCE_CONTINUE;
        });

        // Empty state container
        const emptyStateBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 8,
            halign: Gtk.Align.CENTER,
            valign: Gtk.Align.CENTER,
            margin_top: 24,
            margin_bottom: 24,
        });
        const emptyIcon = new Gtk.Image({
            icon_name: 'folder-pictures-symbolic',
            pixel_size: 48,
            css_classes: ['dim-label'],
        });
        const emptyLabel = new Gtk.Label({
            label: '<b>No wallpaper folder selected</b>\nClick “+ Add folder...” to load wallpapers (JPG, PNG, WebP, MP4, WEBM).',
            use_markup: true,
            justify: Gtk.Justification.CENTER,
            wrap: true,
            wrap_mode: Pango.WrapMode.WORD,
            css_classes: ['dim-label'],
        });
        if (typeof emptyLabel.set_natural_wrap_mode === 'function') {
            emptyLabel.set_natural_wrap_mode(Gtk.NaturalWrapMode.NONE);
        }
        emptyStateBox.append(emptyIcon);
        emptyStateBox.append(emptyLabel);
        wallpaperCard.append(emptyStateBox);

        tabWallpaperBox.append(wallpaperCard);

        loadWallpapersFromFolder = (folderPath) => {
            if (wallpaperIdleId) {
                GLib.source_remove(wallpaperIdleId);
                wallpaperIdleId = 0;
            }

            wallpaperCardsList = [];
            currentColumns = 0;

            let child = flowBox.get_first_child();
            while (child) {
                const next = child.get_next_sibling();
                flowBox.remove(child);
                child = next;
            }

            wallpapersLoaded = true;
            lastLoadedFolder = folderPath;

            if (!folderPath || !GLib.file_test(folderPath, GLib.FileTest.IS_DIR)) {
                folderPathLabel.set_text('No folder selected');
                emptyStateBox.visible = true;
                flowBox.visible = false;
                return;
            }

            folderPathLabel.set_text(`📁 ${folderPath}`);
            const items = WallpaperManager.scanWallpaperFolder(folderPath);

            if (items.length === 0) {
                emptyLabel.set_markup('<b>Folder contains no supported wallpapers</b>\nAdd image files (JPG, PNG, WebP) or video files (MP4, WEBM).');
                emptyStateBox.visible = true;
                flowBox.visible = false;
                return;
            }

            emptyStateBox.visible = false;
            flowBox.visible = true;

            let currentActivePath = '';
            try {
                currentActivePath = settings.get_string('wallpaper-current-path');
            } catch (_) {}
            const systemUri = bgSettings ? bgSettings.get_string('picture-uri') : '';

            let itemIdx = 0;
            const currentGen = ++wallpaperLoadGeneration;

            const createCardForItem = (item) => {
                const isVid = item.isVideo;
                const isCurrent = (currentActivePath && currentActivePath === item.path) ||
                                  (!currentActivePath && systemUri && (systemUri.endsWith(item.name) || systemUri === item.uri));

                const card = new Gtk.Box({
                    orientation: Gtk.Orientation.VERTICAL,
                    css_classes: ['card', 'wallpaper-thumbnail-card'],
                    hexpand: true,
                    vexpand: false,
                    overflow: Gtk.Overflow.HIDDEN,
                });
                card.set_size_request(-1, currentCardHeight);
                try {
                    card.set_cursor_from_name('pointer');
                } catch (_) {}
                wallpaperCardsList.push(card);

                const overlay = new Gtk.Overlay({
                    hexpand: true,
                    vexpand: true,
                });
                card.append(overlay);

                const thumbPath = WallpaperManager.getThumbnailForFile(item.path, isVid);
                const picture = new Gtk.Picture();
                if (thumbPath && GLib.file_test(thumbPath, GLib.FileTest.EXISTS)) {
                    try {
                        const pixbuf = GdkPixbuf.Pixbuf.new_from_file_at_scale(thumbPath, 240, 160, true);
                        if (pixbuf) {
                            const texture = Gdk.Texture.new_for_pixbuf(pixbuf);
                            picture.set_paintable(texture);
                        } else {
                            picture.set_filename(thumbPath);
                        }
                    } catch (_) {
                        picture.set_filename(thumbPath);
                    }
                }
                if (typeof picture.set_content_fit === 'function') {
                    picture.set_content_fit(Gtk.ContentFit.COVER);
                }
                picture.set_can_shrink(true);
                overlay.set_child(picture);

                // Video badge in top-left
                if (isVid) {
                    const ext = GLib.path_get_basename(item.path).split('.').pop().toUpperCase();
                    const badgeBox = new Gtk.Box({
                        orientation: Gtk.Orientation.HORIZONTAL,
                        halign: Gtk.Align.START,
                        valign: Gtk.Align.START,
                        margin_start: 4,
                        margin_top: 4,
                        css_classes: ['wallpaper-video-badge'],
                    });
                    const badgeLabel = new Gtk.Label({
                        label: `▶ ${ext}`,
                        css_classes: ['caption'],
                    });
                    badgeBox.append(badgeLabel);
                    overlay.add_overlay(badgeBox);
                }

                // Close button ('x') in top-right
                const closeBtn = new Gtk.Button({
                    icon_name: 'window-close-symbolic',
                    halign: Gtk.Align.END,
                    valign: Gtk.Align.START,
                    margin_end: 4,
                    margin_top: 4,
                    css_classes: ['flat', 'circular', 'wallpaper-close-btn'],
                    tooltip_text: 'Move file to trash',
                });
                closeBtn.connect('clicked', () => {
                    try {
                        const file = Gio.File.new_for_path(item.path);
                        file.trash(null);
                        window.add_toast(new Adw.Toast({
                            title: `Moved to trash: ${item.name}`,
                            timeout: 3,
                        }));
                        const curFolder = settings.get_string('wallpaper-folder');
                        loadWallpapersFromFolder(curFolder);
                    } catch (e) {
                        console.warn('Error deleting file:', e);
                    }
                });
                overlay.add_overlay(closeBtn);

                // Checkmark badge in bottom-right (if active)
                if (isCurrent) {
                    const checkBadge = new Gtk.Box({
                        halign: Gtk.Align.END,
                        valign: Gtk.Align.END,
                        margin_end: 4,
                        margin_bottom: 4,
                        css_classes: ['wallpaper-check-badge'],
                    });
                    const checkIcon = new Gtk.Image({
                        icon_name: 'object-select-symbolic',
                        pixel_size: 11,
                    });
                    checkBadge.append(checkIcon);
                    overlay.add_overlay(checkBadge);
                    card.add_css_class('wallpaper-card-active');
                }

                // Click gesture to select and apply
                const clickGesture = new Gtk.GestureClick();
                clickGesture.connect('pressed', () => {
                    const ok = WallpaperManager.applyWallpaper(item.path, settings, bgSettings);
                    if (ok) {
                        const curFolder = settings.get_string('wallpaper-folder');
                        loadWallpapersFromFolder(curFolder);
                        window.add_toast(new Adw.Toast({
                            title: `Applied wallpaper: ${item.name}`,
                            timeout: 3,
                        }));
                    }
                });
                card.add_controller(clickGesture);

                flowBox.append(card);
            };

            // Load cards incrementally in batches of 3 items per idle tick for responsive UI
            wallpaperIdleId = GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
                if (currentGen !== wallpaperLoadGeneration) {
                    wallpaperIdleId = 0;
                    return GLib.SOURCE_REMOVE;
                }
                const batchEnd = Math.min(itemIdx + 3, items.length);
                for (; itemIdx < batchEnd; itemIdx++) {
                    createCardForItem(items[itemIdx]);
                }
                updateFlowBoxColumns();
                if (itemIdx >= items.length) {
                    wallpaperIdleId = 0;
                    return GLib.SOURCE_REMOVE;
                }
                return GLib.SOURCE_CONTINUE;
            });
        };

        addFolderBtn.connect('clicked', () => {
            if (Gtk.FileDialog) {
                const dlg = new Gtk.FileDialog({
                    title: 'Select Wallpaper Folder',
                });
                dlg.select_folder(window, null, (source, res) => {
                    try {
                        const folder = dlg.select_folder_finish(res);
                        if (folder) {
                            const p = folder.get_path();
                            if (p) {
                                settings.set_string('wallpaper-folder', p);
                                loadWallpapersFromFolder(p);
                            }
                        }
                    } catch (_) {}
                });
            } else {
                const chooser = new Gtk.FileChooserNative({
                    title: 'Select Wallpaper Folder',
                    transient_for: window,
                    action: Gtk.FileChooserAction.SELECT_FOLDER,
                    accept_label: 'Select',
                    cancel_label: 'Cancel',
                });
                chooser.connect('response', (dlg, responseId) => {
                    if (responseId === Gtk.ResponseType.ACCEPT) {
                        const folder = dlg.get_file();
                        if (folder) {
                            const p = folder.get_path();
                            if (p) {
                                settings.set_string('wallpaper-folder', p);
                                loadWallpapersFromFolder(p);
                            }
                        }
                    }
                    dlg.destroy();
                });
                chooser.show();
            }
        });

        refreshFolderBtn.connect('clicked', () => {
            const folder = settings.get_string('wallpaper-folder');
            loadWallpapersFromFolder(folder);
            window.add_toast(new Adw.Toast({ title: 'Wallpaper list refreshed', timeout: 2 }));
        });

        nextBtn.connect('clicked', () => {
            const folder = settings.get_string('wallpaper-folder');
            if (!folder) {
                window.add_toast(new Adw.Toast({ title: 'Please select a wallpaper folder first', timeout: 3 }));
                return;
            }
            const isRandom = settings.get_boolean('wallpaper-random');
            const currentPath = settings.get_string('wallpaper-current-path');
            const next = WallpaperManager.getNextWallpaperPath(folder, currentPath, isRandom);
            if (next) {
                WallpaperManager.applyWallpaper(next, settings, bgSettings);
                loadWallpapersFromFolder(folder);
                window.add_toast(new Adw.Toast({ title: `Selected new wallpaper: ${GLib.path_get_basename(next)}`, timeout: 3 }));
            }
        });

        // Initial folder path label only (deferred thumbnail loading until Wallpaper tab is clicked)
        let initialFolder = '';
        try {
            initialFolder = settings.get_string('wallpaper-folder');
        } catch (_) {}
        if (initialFolder && GLib.file_test(initialFolder, GLib.FileTest.IS_DIR)) {
            folderPathLabel.set_text(`📁 ${initialFolder}`);
        } else {
            folderPathLabel.set_text('No folder selected');
        }

        // 5. Save Button and Relogin Notification
        const actionBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 10,
            margin_top: 8,
            margin_start: 6,
            margin_end: 6,
        });

        const saveBtn = new Gtk.Button({
            label: '💾 Save and Apply Adwaita Style',
            css_classes: ['suggested-action'],
            halign: Gtk.Align.FILL,
        });
        saveBtn.set_size_request(-1, 44);

        const reloginInfoLabel = new Gtk.Label({
            label: 'ℹ️ <b>Tip:</b> To ensure styles apply cleanly across all open apps, it is recommended to <b>log out and back in</b> after saving.',
            use_markup: true,
            wrap: true,
            wrap_mode: Pango.WrapMode.WORD,
            xalign: 0,
            css_classes: ['dim-label'],
        });
        if (typeof reloginInfoLabel.set_natural_wrap_mode === 'function') {
            reloginInfoLabel.set_natural_wrap_mode(Gtk.NaturalWrapMode.NONE);
        }

        saveBtn.connect('clicked', () => {
            applyAndSaveConfig();

            // I show Toast notification with relogin reminder
            window.add_toast(new Adw.Toast({
                title: '💾 Styles and theme saved successfully! Please log out and back in to apply changes across all applications.',
                timeout: 6,
            }));
        });

        const secondaryBtnsBox = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            spacing: 8,
            homogeneous: true,
            halign: Gtk.Align.FILL,
        });

        const restoreBtn = new Gtk.Button({
            label: '🔄 Restore Adwaita',
            css_classes: ['destructive-action'],
            halign: Gtk.Align.FILL,
            tooltip_text: 'Remove custom CSS and restore default GNOME Adwaita style',
        });
        restoreBtn.set_size_request(-1, 38);

        restoreBtn.connect('clicked', () => {
            settings.set_boolean('enable-classic-style', false);
            ThemeGenerator.removeAdwitaSquareCss();
            window.add_toast(new Adw.Toast({
                title: 'Restored original Adwaita style! Removed rules from ~/.config/gtk-4.0/',
                timeout: 5,
            }));
        });

        const supportBtn = new Gtk.Button({
            label: '☕ Buy me a coffee',
            halign: Gtk.Align.FILL,
            tooltip_text: 'Support development on buycoffee.to/e.mikolaj',
        });
        supportBtn.set_size_request(-1, 38);

        supportBtn.connect('clicked', () => {
            try {
                Gio.AppInfo.launch_default_for_uri('https://buycoffee.to/e.mikolaj', null);
            } catch (e) {
                console.warn('Could not open buycoffee link:', e);
            }
        });

        secondaryBtnsBox.append(restoreBtn);
        secondaryBtnsBox.append(supportBtn);

        actionBox.append(saveBtn);
        actionBox.append(secondaryBtnsBox);
        actionBox.append(reloginInfoLabel);
        leftColumnBox.append(actionBox);

        // =========================================================================
        // SECTION: Live Preview Mock Window & Dynamic CSS Provider
        // =========================================================================

        // I build the right column container for the live preview window
        const rightBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 8,
            hexpand: false,
            vexpand: false,
            valign: Gtk.Align.START,
            width_request: 300,
        });
        columnsBox.append(rightBox);

        const previewHeaderLabel = new Gtk.Label({
            label: '<b>Live Preview</b>',
            use_markup: true,
            xalign: 0,
            css_classes: ['heading'],
        });
        rightBox.append(previewHeaderLabel);

        // I build the mock window container (non-focusable to prevent scroll jumps)
        const mockWindow = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            name: 'adwita-square-preview',
            hexpand: false,
            vexpand: false,
            can_focus: false,
            focusable: false,
        });

        // 1. I build the mock window headerbar
        const mockHeader = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            spacing: 6,
            css_classes: ['preview-header'],
            can_focus: false,
            focusable: false,
        });

        const mockHeaderBtn = new Gtk.Button({
            icon_name: 'open-menu-symbolic',
            valign: Gtk.Align.CENTER,
            can_focus: false,
            focusable: false,
        });
        mockHeader.append(mockHeaderBtn);

        const mockTitleBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 0,
            hexpand: true,
            halign: Gtk.Align.CENTER,
            can_focus: false,
            focusable: false,
        });
        const mockTitle = new Gtk.Label({
            label: 'Adwaita',
            css_classes: ['preview-title'],
        });
        mockTitleBox.append(mockTitle);
        mockHeader.append(mockTitleBox);

        // I configure the window controls buttons container (dynamically populated)
        windowControlsBox = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            spacing: 3,
            valign: Gtk.Align.CENTER,
            can_focus: false,
            focusable: false,
        });
        mockHeader.append(windowControlsBox);

        renderPreviewControls = () => {
            if (!windowControlsBox) return;
            let child = windowControlsBox.get_first_child();
            while (child) {
                const next = child.get_next_sibling();
                windowControlsBox.remove(child);
                child = next;
            }

            if (currentControlButtons) {
                // Enabled (ON): I render stacked window controls (maximize on top, minimize on bottom + red close)
                const controlsGap = 6;
                windowControlsBox.set_spacing(controlsGap);

                const splitBox = new Gtk.Box({
                    orientation: Gtk.Orientation.VERTICAL,
                    spacing: 0,
                    valign: Gtk.Align.CENTER,
                    css_classes: ['split-window-controls'],
                    can_focus: false,
                    focusable: false,
                });
                const expMaxBtn = new Gtk.Button({ label: '□', css_classes: ['window-btn-maximize'], can_focus: false, focusable: false });
                const expMinBtn = new Gtk.Button({ label: '−', css_classes: ['window-btn-minimize'], can_focus: false, focusable: false });
                splitBox.append(expMaxBtn);
                splitBox.append(expMinBtn);

                const hoverController = new Gtk.EventControllerMotion();
                hoverController.connect('motion', (ctrl, x, y) => {
                    const h = splitBox.get_height();
                    if (y < h / 2) {
                        splitBox.remove_css_class('hover-bottom');
                        splitBox.add_css_class('hover-top');
                    } else {
                        splitBox.remove_css_class('hover-top');
                        splitBox.add_css_class('hover-bottom');
                    }
                });
                hoverController.connect('leave', () => {
                    splitBox.remove_css_class('hover-top');
                    splitBox.remove_css_class('hover-bottom');
                });
                splitBox.add_controller(hoverController);

                const expCloseBtn = new Gtk.Button({ label: '✕', css_classes: ['window-btn', 'window-btn-close'], can_focus: false, focusable: false });
                windowControlsBox.append(splitBox);
                windowControlsBox.append(expCloseBtn);
            } else {
                windowControlsBox.set_spacing(4);
                // Disabled (OFF): I render standard horizontal window controls
                const stdMinBtn = new Gtk.Button({ label: '−', css_classes: ['window-btn', 'window-btn-minimize'], can_focus: false, focusable: false });
                const stdMaxBtn = new Gtk.Button({ label: '□', css_classes: ['window-btn', 'window-btn-maximize'], can_focus: false, focusable: false });
                const stdCloseBtn = new Gtk.Button({ label: '✕', css_classes: ['window-btn', 'window-btn-close'], can_focus: false, focusable: false });
                windowControlsBox.append(stdMinBtn);
                windowControlsBox.append(stdMaxBtn);
                windowControlsBox.append(stdCloseBtn);
            }
        };

        renderPreviewControls();

        mockWindow.append(mockHeader);

        // 2. I build the mock window body (split: sidebar + content)
        const mockBody = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            hexpand: false,
            vexpand: false,
            css_classes: ['preview-content'],
            can_focus: false,
            focusable: false,
        });

        // Mini Sidebar
        const mockSidebar = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 3,
            width_request: 90,
            css_classes: ['preview-sidebar'],
            can_focus: false,
            focusable: false,
        });
        const sideDoc = new Gtk.Label({ label: '📁 Files', xalign: 0, css_classes: ['preview-sidebar-item'] });
        const sideDownloads = new Gtk.Label({ label: '📥 Downloads', xalign: 0, css_classes: ['preview-sidebar-item', 'selected'] });
        const sidePics = new Gtk.Label({ label: '🖼️ Pictures', xalign: 0, css_classes: ['preview-sidebar-item'] });
        const sideMusic = new Gtk.Label({ label: '🎵 Music', xalign: 0, css_classes: ['preview-sidebar-item'] });
        mockSidebar.append(sideDoc);
        mockSidebar.append(sideDownloads);
        mockSidebar.append(sidePics);
        mockSidebar.append(sideMusic);
        mockBody.append(mockSidebar);

        // Mini Main Content Area
        const mockContentArea = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 6,
            hexpand: true,
            margin_start: 8,
            margin_end: 8,
            margin_top: 8,
            margin_bottom: 8,
            css_classes: ['preview-main-content'],
            can_focus: false,
            focusable: false,
        });

        // Search Entry
        const mockEntry = new Gtk.Entry({
            placeholder_text: 'Search...',
            text: 'Notes_2026.txt',
            can_focus: false,
            focusable: false,
        });
        mockContentArea.append(mockEntry);

        // Action Buttons Row
        const mockBtnRow = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            spacing: 6,
            can_focus: false,
            focusable: false,
        });
        const mockSuggestedBtn = new Gtk.Button({
            label: 'Accent',
            css_classes: ['suggested-action'],
            can_focus: false,
            focusable: false,
        });
        const mockNormalBtn = new Gtk.Button({
            label: 'Normal',
            can_focus: false,
            focusable: false,
        });
        const mockDestructiveBtn = new Gtk.Button({
            label: 'Delete',
            css_classes: ['destructive-action'],
            can_focus: false,
            focusable: false,
        });
        mockBtnRow.append(mockSuggestedBtn);
        mockBtnRow.append(mockNormalBtn);
        mockBtnRow.append(mockDestructiveBtn);
        mockContentArea.append(mockBtnRow);

        // Controls Row (Switch & Checkbox)
        const mockControlsRow = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            spacing: 8,
            can_focus: false,
            focusable: false,
        });
        const mockSwitchBox = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            spacing: 4,
            can_focus: false,
            focusable: false,
        });
        const mockSwitch = new Gtk.Switch({ active: true, valign: Gtk.Align.CENTER, can_focus: false, focusable: false });
        mockSwitchBox.append(new Gtk.Label({ label: 'Active:' }));
        mockSwitchBox.append(mockSwitch);

        const mockCheck = new Gtk.CheckButton({ label: 'Option checked', active: true, can_focus: false, focusable: false });
        mockControlsRow.append(mockSwitchBox);
        mockControlsRow.append(mockCheck);
        mockContentArea.append(mockControlsRow);

        // Mock Slider (Scale)
        const mockScale = Gtk.Scale.new_with_range(Gtk.Orientation.HORIZONTAL, 0, 100, 5);
        mockScale.set_value(65);
        mockScale.set_draw_value(false);
        mockScale.set_can_focus(false);
        mockScale.set_focusable(false);
        mockContentArea.append(mockScale);

        // Mock Card
        const mockCard = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 2,
            css_classes: ['card'],
            can_focus: false,
            focusable: false,
        });
        mockCard.append(new Gtk.Label({
            label: '<b>Adwaita Style with Corner Integration</b>',
            use_markup: true,
            xalign: 0,
            css_classes: ['heading'],
        }));
        mockCard.append(new Gtk.Label({
            label: 'Clean square buttons and left sidebar accent tinting.',
            xalign: 0,
            wrap: true,
            css_classes: ['dim-label'],
        }));
        mockContentArea.append(mockCard);

        mockBody.append(mockContentArea);
        mockWindow.append(mockBody);

        const previewDesktopCard = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            css_classes: ['preview-desktop-card'],
            hexpand: false,
            vexpand: false,
            valign: Gtk.Align.START,
        });
        previewDesktopCard.append(mockWindow);
        rightBox.append(previewDesktopCard);

        // =========================================================================
        // SECTION: Icon Shape Preview Window
        // =========================================================================
        const iconPreviewHeaderLabel = new Gtk.Label({
            label: '<b>Icon Shape Preview</b>',
            use_markup: true,
            xalign: 0,
            margin_top: 8,
            css_classes: ['heading'],
        });
        rightBox.append(iconPreviewHeaderLabel);

        const iconPreviewCard = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 8,
            css_classes: ['icon-preview-desktop-card'],
            hexpand: false,
            vexpand: false,
            valign: Gtk.Align.START,
        });

        const iconCardTopRow = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            spacing: 8,
            hexpand: true,
        });
        const iconCardTitle = new Gtk.Label({
            label: 'Adwaita Square App Grid',
            css_classes: ['icon-preview-title'],
            xalign: 0,
            hexpand: true,
        });
        const iconCardBadge = new Gtk.Label({
            label: 'Uniform Vector',
            css_classes: ['icon-preview-badge'],
        });
        iconCardTopRow.append(iconCardTitle);
        iconCardTopRow.append(iconCardBadge);
        iconPreviewCard.append(iconCardTopRow);

        const iconGridBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 8,
            halign: Gtk.Align.CENTER,
            margin_top: 4,
            margin_bottom: 2,
        });

        const previewApps = [
            { id: 'files', name: 'Files', icons: ['org.gnome.Nautilus', 'system-file-manager', 'nautilus', 'folder'] },
            { id: 'calendar', name: 'Calendar', icons: ['org.gnome.Calendar', 'x-office-calendar', 'calendar'] },
            { id: 'calc', name: 'Calc', icons: ['org.gnome.Calculator', 'gnome-calculator', 'accessories-calculator', 'calculator'] },
            { id: 'software', name: 'Software', icons: ['org.gnome.Software', 'system-software-install', 'software-store', 'org.gnome.Software-symbolic'] },
            { id: 'settings', name: 'Settings', icons: ['org.gnome.Settings', 'gnome-control-center', 'preferences-system', 'emblem-system'] },
            { id: 'terminal', name: 'Terminal', icons: ['org.gnome.Ptyxis', 'ptyxis', 'org.gnome.Console', 'org.gnome.Terminal', 'gnome-terminal', 'utilities-terminal', 'terminal'] },
            { id: 'editor', name: 'Editor', icons: ['org.gnome.TextEditor', 'org.gnome.gedit', 'gedit', 'accessories-text-editor'] },
            { id: 'browser', name: 'Web', icons: ['firefox', 'org.mozilla.firefox', 'google-chrome', 'chromium', 'org.gnome.Epiphany', 'web-browser'] },
            { id: 'music', name: 'Music', icons: ['org.strawberrymusicplayer.strawberry', 'strawberry', 'rhythmbox', 'org.gnome.Music', 'io.bassi.Amberol', 'audio-player', 'multimedia-audio-player'] },
            { id: 'weather', name: 'Weather', icons: ['org.gnome.Weather', 'org.kde.kweather', 'weather-few-clouds', 'weather'] },
        ];

        const defaultDisplay = Gdk.Display.get_default();
        const iconTheme = defaultDisplay ? Gtk.IconTheme.get_for_display(defaultDisplay) : null;
        function resolveIconName(candidates) {
            if (iconTheme) {
                for (const name of candidates) {
                    if (iconTheme.has_icon(name)) return name;
                }
            }
            return candidates[0];
        }

        const iconWidgetItems = [];
        const row1 = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            spacing: 8,
            halign: Gtk.Align.CENTER,
            hexpand: true,
            homogeneous: true,
        });
        const row2 = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            spacing: 8,
            halign: Gtk.Align.CENTER,
            hexpand: true,
            homogeneous: true,
        });

        previewApps.forEach((app, idx) => {
            const itemBox = new Gtk.Box({
                orientation: Gtk.Orientation.VERTICAL,
                spacing: 4,
                halign: Gtk.Align.CENTER,
                valign: Gtk.Align.CENTER,
                hexpand: true,
                css_classes: ['icon-shape-item-box'],
            });

            const squareContainer = new Gtk.Box({
                halign: Gtk.Align.CENTER,
                valign: Gtk.Align.CENTER,
                hexpand: false,
                vexpand: false,
                css_classes: ['icon-shape-container'],
            });
            squareContainer.set_size_request(currentIconShapeSize, currentIconShapeSize);

            const iconName = resolveIconName(app.icons);
            const img = new Gtk.Image({
                halign: Gtk.Align.CENTER,
                valign: Gtk.Align.CENTER,
                hexpand: true,
                vexpand: true,
            });
            squareContainer.append(img);

            const lbl = new Gtk.Label({
                label: app.name,
                css_classes: ['icon-shape-label'],
                halign: Gtk.Align.CENTER,
                justify: Gtk.Justification.CENTER,
            });

            itemBox.append(squareContainer);
            itemBox.append(lbl);

            iconWidgetItems.push({ squareContainer, img, iconName, app });

            if (idx < 5) {
                row1.append(itemBox);
            } else {
                row2.append(itemBox);
            }
        });

        iconGridBox.set_hexpand(true);
        iconGridBox.set_halign(Gtk.Align.FILL);
        iconGridBox.append(row1);
        iconGridBox.append(row2);
        iconPreviewCard.append(iconGridBox);
        rightBox.append(iconPreviewCard);

        renderIconPreview = () => {
            if (iconCardBadge) {
                if (!currentForceIconShape) {
                    iconCardBadge.set_text('Default Icons');
                } else if (currentIconPaletteMode === 'colored') {
                    iconCardBadge.set_text('Multicolor Squircle');
                } else if (currentIconPaletteMode === 'adaptive') {
                    iconCardBadge.set_text('Adaptive 2-Tone');
                } else {
                    iconCardBadge.set_text('Accent Vector');
                }
            }

            for (const item of iconWidgetItems) {
                item.squareContainer.set_size_request(currentIconShapeSize, currentIconShapeSize);
                const paintable = IconThemeGenerator.generatePreviewIconPaintable(item.app, {
                    cornerRadius: currentIconSquircleRadius,
                    borderWidth: currentIconBorderWidth,
                    opacity: currentIconOpacity > 0 ? (100 - currentIconOpacity) : 100,
                    innerScale: currentIconShapeScale / 100,
                    accentColor: currentAccent,
                    paletteMode: currentIconPaletteMode,
                    targetSize: currentIconShapeSize,
                    forceIconShape: currentForceIconShape,
                    isDark: currentVariant === 'dark',
                    Gdk,
                });

                if (paintable) {
                    item.img.set_from_paintable(paintable);
                    item.img.set_pixel_size(currentIconShapeSize);
                } else if (item.iconName) {
                    const fallbackSize = currentForceIconShape
                        ? Math.round(currentIconShapeSize * currentIconShapeScale / 100)
                        : Math.round(currentIconShapeSize * 0.85);
                    item.img.set_pixel_size(fallbackSize);
                    item.img.set_from_icon_name(item.iconName);
                }
            }
        };

        // I register the live CSS provider for the preview window (updated smoothly in-place)
        const previewCssProvider = new Gtk.CssProvider();
        const display = Gdk.Display.get_default();
        if (display) {
            Gtk.StyleContext.add_provider_for_display(
                display,
                previewCssProvider,
                Gtk.STYLE_PROVIDER_PRIORITY_USER + 50
            );
        }

        function applyAndSaveConfig() {
            try {
                settings.set_boolean('accent-color-automatic', currentAutoAccent);
                settings.set_string('theme-variant', currentVariant);
                settings.set_string('accent-color', currentAccent);
                if (interfaceSettings) {
                    try {
                        interfaceSettings.set_string('accent-color', currentAccent);
                        interfaceSettings.set_string('color-scheme', currentVariant === 'dark' ? 'prefer-dark' : 'default');
                    } catch (e) {}
                }
                settings.set_int('opacity', currentOpacity);
                settings.set_int('accent-strength', currentAccentStrength);
                settings.set_int('blur', currentBlur);
                settings.set_int('dock-opacity', currentDockOpacity);
                settings.set_int('dock-blur', currentDockBlur);
                settings.set_int('dock-corner-radius', currentDockCornerRadius);
                settings.set_int('icon-opacity', currentIconOpacity);
                settings.set_int('icon-blur', currentIconBlur);
                settings.set_int('corner-radius', currentCorner);
                settings.set_int('button-size', currentButtonSize);
                try {
                    settings.set_boolean('control-buttons', currentControlButtons);
                    settings.set_boolean('dynamic-panel-maximized', currentDynamicPanelMaximized);
                } catch (_) {}
                try {
                    settings.set_boolean('force-icon-shape', currentForceIconShape);
                    settings.set_int('icon-shape-scale', currentIconShapeScale);
                    settings.set_int('icon-shape-size', currentIconShapeSize);
                    settings.set_int('icon-border-width', currentIconBorderWidth);
                    settings.set_int('icon-squircle-radius', currentIconSquircleRadius);
                    settings.set_string('icon-palette-mode', currentIconPaletteMode);
                } catch (_) {}
                if (GLib.file_test(IconThemeGenerator.getIconThemeDir(), GLib.FileTest.IS_DIR)) {
                    IconThemeGenerator.applyIconTheme();
                }
                try {
                    settings.set_int('border-width', currentBorderWidth);
                } catch (_) {}
                if (currentControlButtons) {
                    ThemeGenerator.ensureWindowControlsEnabled();
                }

                settings.set_boolean('enable-classic-style', true);

                const css = ThemeGenerator.generateAdwitaSquareCss({
                    variant: currentVariant,
                    accentColor: currentAccent,
                    opacity: currentOpacity,
                    accentStrength: currentAccentStrength,
                    blur: currentBlur,
                    cornerRadius: currentCorner,
                    buttonSize: currentButtonSize,
                    controlButtons: currentControlButtons,
                });
                const darkCss = ThemeGenerator.generateAdwitaSquareCss({
                    variant: 'dark',
                    accentColor: currentAccent,
                    opacity: currentOpacity,
                    accentStrength: currentAccentStrength,
                    blur: currentBlur,
                    cornerRadius: currentCorner,
                    buttonSize: currentButtonSize,
                    controlButtons: currentControlButtons,
                });
                ThemeGenerator.saveGtk4Css(css, darkCss);

                if (currentFirefoxTheme) {
                    try {
                        BrowserTheme.applyFirefoxTheme({
                            variant: currentVariant,
                            accentColor: currentAccent,
                            cornerRadius: currentCorner,
                            buttonSize: currentButtonSize,
                        });
                    } catch (_) {}
                }

                const shellCss = ShellThemeGenerator.generateShellCss({
                    variant: currentVariant,
                    accentColor: currentAccent,
                    opacity: currentOpacity,
                    blur: currentBlur,
                    dockOpacity: currentDockOpacity,
                    dockBlur: currentDockBlur,
                    dockCornerRadius: currentDockCornerRadius,
                    iconOpacity: currentIconOpacity,
                    iconBlur: currentIconBlur,
                    cornerRadius: currentCorner,
                    borderWidth: currentBorderWidth,
                    accentStrength: currentAccentStrength,
                    forceIconShape: currentForceIconShape,
                    iconBorderWidth: currentIconBorderWidth,
                    iconShapeScale: currentIconShapeScale,
                    iconShapeSize: currentIconShapeSize,
                    iconSquircleRadius: currentIconSquircleRadius,
                });
                ShellThemeGenerator.saveShellCss(shellCss);
            } catch (e) {
                console.error('[adwita-square] Error saving settings:', e);
            }
        }

        let previewIdleId = 0;
        function updatePreview() {
            if (previewIdleId) return;
            previewIdleId = GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
                previewIdleId = 0;
                if (renderPreviewControls) {
                    renderPreviewControls();
                }
                if (renderIconPreview) {
                    renderIconPreview();
                }
                const previewCss = ThemeGenerator.generatePreviewCss({
                    variant: currentVariant,
                    accentColor: currentAccent,
                    opacity: currentOpacity,
                    accentStrength: currentAccentStrength,
                    blur: currentBlur,
                    dockOpacity: currentDockOpacity,
                    dockBlur: currentDockBlur,
                    iconOpacity: currentIconOpacity,
                    iconBlur: currentIconBlur,
                    cornerRadius: currentCorner,
                    buttonSize: currentButtonSize,
                    controlButtons: currentControlButtons,
                    forceIconShape: currentForceIconShape,
                    iconShapeScale: currentIconShapeScale,
                    iconShapeSize: currentIconShapeSize,
                    iconBorderWidth: currentIconBorderWidth,
                    borderWidth: currentBorderWidth,
                    iconSquircleRadius: currentIconSquircleRadius,
                    iconPaletteMode: currentIconPaletteMode,
                });
                previewCssProvider.load_from_string(previewCss);
                return GLib.SOURCE_REMOVE;
            });
        }

        window.connect('destroy', () => {
            if (flowBoxTickId && flowBox) {
                flowBox.remove_tick_callback(flowBoxTickId);
            }
            if (wallpaperIdleId) {
                GLib.source_remove(wallpaperIdleId);
                wallpaperIdleId = 0;
            }
            if (previewIdleId) {
                GLib.source_remove(previewIdleId);
                previewIdleId = 0;
            }
            if (liveSettingsSyncTimeoutId) {
                GLib.source_remove(liveSettingsSyncTimeoutId);
                liveSettingsSyncTimeoutId = 0;
            }
            const disp = Gdk.Display.get_default();
            if (disp) {
                Gtk.StyleContext.remove_provider_for_display(disp, previewCssProvider);
                if (accentStyleProvider) {
                    Gtk.StyleContext.remove_provider_for_display(disp, accentStyleProvider);
                }
                if (variantStyleProvider) {
                    Gtk.StyleContext.remove_provider_for_display(disp, variantStyleProvider);
                }
            }
        });

        // I perform the initial preview render
        updatePreview();
    }
}
