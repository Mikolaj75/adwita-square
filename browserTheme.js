/*
 * Adwita Square - Browser Theme Integration (Firefox, Chrome, Chromium)
 *
 * Copyright (C) 2024-2026 g-mobile.eu
 * Licensed under the GNU Lesser General Public License version 2.1 or later (LGPL-2.1-or-later).
 */

// ============================================================================
// SECTION: Browser Integration Constants & Profile Discovery
// I discover profile folders for Mozilla Firefox and Chromium-based browsers.
// ============================================================================

import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import { ACCENT_PRESETS } from './themeGenerator.js';

export const USER_CHROME_MARKER_START = '/* Adwita Square Firefox userChrome Start */';
export const USER_CHROME_MARKER_END = '/* Adwita Square Firefox userChrome End */';

/**
 * Returns all Firefox profile directories for the current user.
 */
export function getFirefoxProfileDirs() {
    const mozillaDir = GLib.build_filenamev([GLib.get_home_dir(), '.mozilla', 'firefox']);
    const dirFile = Gio.File.new_for_path(mozillaDir);
    if (!dirFile.query_exists(null)) {
        return [];
    }

    const profiles = [];
    try {
        const enumerator = dirFile.enumerate_children(
            'standard::name,standard::type',
            Gio.FileQueryInfoFlags.NONE,
            null
        );

        let fileInfo;
        while ((fileInfo = enumerator.next_file(null)) !== null) {
            if (fileInfo.get_file_type() === Gio.FileType.DIRECTORY) {
                const name = fileInfo.get_name();
                const profilePath = GLib.build_filenamev([mozillaDir, name]);
                const prefsFile = Gio.File.new_for_path(GLib.build_filenamev([profilePath, 'prefs.js']));
                const compatFile = Gio.File.new_for_path(GLib.build_filenamev([profilePath, 'compatibility.ini']));

                if (prefsFile.query_exists(null) || compatFile.query_exists(null) || name.includes('.default')) {
                    profiles.push(profilePath);
                }
            }
        }
    } catch (e) {
        console.warn('[adwita-square] Error searching for Firefox profiles:', e);
    }
    return profiles;
}

// ============================================================================
// SECTION: Firefox userChrome.css Generator
// I generate custom userChrome CSS matching Adwita Square square window buttons and tabs.
// ============================================================================
/**
 * Generates userChrome.css for Firefox matching Adwita Square settings.
 */
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

/* Solid top window bar (navigator-toolbox, titlebar, TabsToolbar, nav-bar) */
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

/* Square tabs and consistent spacing */
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

/* Square URL and search address bars */
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

/* Classic square window control buttons in Firefox - matching Chrome */
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

// ============================================================================
// SECTION: Firefox Theme Application & Removal
// I inject or remove Adwita Square userChrome CSS and configure user.js preferences.
// ============================================================================
/**
 * Applies the Adwita Square theme to all found Firefox profiles.
 */
export function applyFirefoxTheme(options = {}) {
    const profiles = getFirefoxProfileDirs();
    if (profiles.length === 0) {
        return {
            success: false,
            count: 0,
            message: 'Firefox profile not found. Launch Firefox once, then enable the switch.',
        };
    }

    const cssContent = generateFirefoxUserChrome(options);
    let updatedCount = 0;

    for (const profilePath of profiles) {
        try {
            const chromeDir = GLib.build_filenamev([profilePath, 'chrome']);
            const chromeDirFile = Gio.File.new_for_path(chromeDir);
            if (!chromeDirFile.query_exists(null)) {
                chromeDirFile.make_directory_with_parents(null);
            }

            const userChromeFile = GLib.build_filenamev([chromeDir, 'userChrome.css']);
            const cssFile = Gio.File.new_for_path(userChromeFile);
            let existingContent = '';

            if (cssFile.query_exists(null)) {
                const [bytes] = cssFile.load_bytes(null);
                if (bytes) {
                    existingContent = new TextDecoder('utf-8').decode(bytes.toArray());
                }
            }

            let newContent = '';
            const startIndex = existingContent.indexOf(USER_CHROME_MARKER_START);
            const endIndex = existingContent.indexOf(USER_CHROME_MARKER_END);

            if (startIndex !== -1 && endIndex !== -1) {
                const before = existingContent.substring(0, startIndex);
                const after = existingContent.substring(endIndex + USER_CHROME_MARKER_END.length);
                newContent = (before.trim() ? before.trim() + '\n\n' : '') + cssContent.trim() + (after.trim() ? '\n\n' + after.trim() : '');
            } else {
                newContent = existingContent.trim() ? existingContent.trim() + '\n\n' + cssContent.trim() : cssContent.trim();
            }

            GLib.file_set_contents(userChromeFile, newContent + '\n');

            // I configure user.js to enable legacy user stylesheet loading
            const userJsPath = GLib.build_filenamev([profilePath, 'user.js']);
            const userJsFile = Gio.File.new_for_path(userJsPath);
            let userJsContent = '';
            if (userJsFile.query_exists(null)) {
                const [bytes] = userJsFile.load_bytes(null);
                if (bytes) {
                    userJsContent = new TextDecoder('utf-8').decode(bytes.toArray());
                }
            }

            const prefString = 'user_pref("toolkit.legacyUserProfileCustomizations.stylesheets", true);';
            if (!userJsContent.includes('toolkit.legacyUserProfileCustomizations.stylesheets')) {
                userJsContent = userJsContent.trim() ? userJsContent.trim() + '\n' + prefString : prefString;
                GLib.file_set_contents(userJsPath, userJsContent + '\n');
            } else if (!userJsContent.includes(prefString)) {
                userJsContent = userJsContent.replace(
                    /user_pref\(\s*"toolkit\.legacyUserProfileCustomizations\.stylesheets"\s*,\s*false\s*\);/,
                    prefString
                );
                GLib.file_set_contents(userJsPath, userJsContent + '\n');
            }

            updatedCount++;
        } catch (e) {
            console.warn(`[adwita-square] Error saving Firefox profile ${profilePath}:`, e);
        }
    }

    return {
        success: updatedCount > 0,
        count: updatedCount,
        message: `Applied style to ${updatedCount} Firefox profile(s) (browser restart required).`,
    };
}

/**
 * Removes Adwita Square userChrome.css from Firefox profiles.
 */
export function removeFirefoxTheme() {
    const profiles = getFirefoxProfileDirs();
    let removedCount = 0;

    for (const profilePath of profiles) {
        try {
            const userChromeFile = GLib.build_filenamev([profilePath, 'chrome', 'userChrome.css']);
            const cssFile = Gio.File.new_for_path(userChromeFile);
            if (!cssFile.query_exists(null)) continue;

            const [bytes] = cssFile.load_bytes(null);
            if (!bytes) continue;

            let content = new TextDecoder('utf-8').decode(bytes.toArray());
            while (content.includes(USER_CHROME_MARKER_START) && content.includes(USER_CHROME_MARKER_END)) {
                const start = content.indexOf(USER_CHROME_MARKER_START);
                const end = content.indexOf(USER_CHROME_MARKER_END);
                if (start !== -1 && end !== -1 && end >= start) {
                    content = content.substring(0, start) + content.substring(end + USER_CHROME_MARKER_END.length);
                } else {
                    break;
                }
            }

            const cleanContent = content.trim();
            if (cleanContent) {
                GLib.file_set_contents(userChromeFile, cleanContent + '\n');
            } else {
                try {
                    cssFile.delete(null);
                } catch (_) {
                    GLib.file_set_contents(userChromeFile, '');
                }
            }
            removedCount++;
        } catch (e) {
            console.warn(`[adwita-square] Error removing Firefox style for ${profilePath}:`, e);
        }
    }

    return {
        success: true,
        count: removedCount,
        message: 'Disabled Adwita Square style for Firefox.',
    };
}

// ============================================================================
// SECTION: Chrome & Chromium Integration
// I configure Chrome / Chromium to use system title bars and GTK square window controls.
// ============================================================================
/**
 * Finds all Chrome and Chromium profile directories.
 */
export function getChromiumProfileDirs() {
    const home = GLib.get_home_dir();
    const candidateBases = [
        GLib.build_filenamev([home, '.config', 'google-chrome']),
        GLib.build_filenamev([home, '.config', 'chromium']),
        GLib.build_filenamev([home, '.var', 'app', 'com.google.Chrome', 'config', 'google-chrome']),
        GLib.build_filenamev([home, '.var', 'app', 'org.chromium.Chromium', 'config', 'chromium']),
        GLib.build_filenamev([home, '.var', 'app', 'com.brave.Browser', 'config', 'BraveSoftware', 'Brave-Browser']),
        GLib.build_filenamev([home, '.config', 'BraveSoftware', 'Brave-Browser']),
        GLib.build_filenamev([home, '.config', 'microsoft-edge']),
        GLib.build_filenamev([home, '.var', 'app', 'com.microsoft.Edge', 'config', 'microsoft-edge']),
    ];

    const profiles = [];
    for (const base of candidateBases) {
        const baseDir = Gio.File.new_for_path(base);
        if (!baseDir.query_exists(null)) continue;

        try {
            const enumerator = baseDir.enumerate_children(
                'standard::name,standard::type',
                Gio.FileQueryInfoFlags.NONE,
                null
            );

            let fileInfo;
            while ((fileInfo = enumerator.next_file(null)) !== null) {
                if (fileInfo.get_file_type() === Gio.FileType.DIRECTORY) {
                    const name = fileInfo.get_name();
                    if (name === 'Default' || name.startsWith('Profile ')) {
                        const prefPath = GLib.build_filenamev([base, name, 'Preferences']);
                        const prefFile = Gio.File.new_for_path(prefPath);
                        if (prefFile.query_exists(null)) {
                            profiles.push(prefPath);
                        }
                    }
                }
            }
        } catch (e) {
            console.warn(`[adwita-square] Error scanning Chromium in ${base}:`, e);
        }
    }
    return profiles;
}

/**
 * Configures Chrome/Chromium to use the system title bar and GTK theme.
 */
export function applyChromiumTheme(enable = true) {
    const prefFiles = getChromiumProfileDirs();
    if (prefFiles.length === 0) {
        return {
            success: false,
            count: 0,
            message: 'No active Chrome / Chromium profiles found.',
        };
    }

    let modifiedCount = 0;
    for (const prefPath of prefFiles) {
        try {
            const file = Gio.File.new_for_path(prefPath);
            const [bytes] = file.load_bytes(null);
            if (!bytes) continue;

            const text = new TextDecoder('utf-8').decode(bytes.toArray());
            const data = JSON.parse(text);

            if (!data.browser) data.browser = {};
            // I set custom_chrome_frame to false to enforce system window titlebar and borders
            data.browser.custom_chrome_frame = !enable;

            if (!data.extensions) data.extensions = {};
            if (!data.extensions.theme) data.extensions.theme = {};
            data.extensions.theme.use_system = enable;

            GLib.file_set_contents(prefPath, JSON.stringify(data, null, 2));
            modifiedCount++;
        } catch (e) {
            console.warn(`[adwita-square] Error configuring Chrome preferences in ${prefPath}:`, e);
        }
    }

    return {
        success: modifiedCount > 0,
        count: modifiedCount,
        message: enable
            ? `Enabled system title bar and borders in Chrome/Chromium (${modifiedCount} profile(s)).`
            : `Restored default borders in Chrome/Chromium (${modifiedCount} profile(s)).`,
    };
}
