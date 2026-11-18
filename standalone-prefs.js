/*
 * Adwita Square - Standalone Preferences Runner
 * Square GTK theme based on Adwaita.
 *
 * Copyright (C) 2024-2026 g-mobile.eu
 * Based on Adwaita / Libadwaita stylesheets.
 * Original Adwaita copyright (C) 2014-2024 GNOME Project and contributors.
 *
 * Licensed under the GNU Lesser General Public License version 2.1 or later (LGPL-2.1-or-later).
 * See LICENSE file for details.
 */

// ============================================================================
// SECTION: Standalone Preferences Application
// I designed this runner to test and preview extension settings in a standalone window
// without needing to restart GNOME Shell or use the gnome-extensions app.
// ============================================================================

import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Adw from 'gi://Adw';

const currentDir = GLib.path_get_dirname(import.meta.url.replace('file://', ''));

try {
    // I load built-in GNOME Shell extensions resource if available
    const res = Gio.Resource.load('/usr/share/gnome-shell/org.gnome.Shell.Extensions.src.gresource');
    res._register();
} catch (e) {
    console.warn('Could not load built-in Extensions resource:', e.message);
}

// I dynamically import preferences module
const { default: AdwitaSquarePreferences } = await import(`file://${currentDir}/prefs.js`);

const app = new Adw.Application({
    application_id: 'eu.gmobile.adwitasquare.standalone',
    flags: Gio.ApplicationFlags.FLAGS_NONE,
});

app.connect('activate', () => {
    // I initialize the preferences window
    const window = new Adw.PreferencesWindow({
        application: app,
    });

    const metadata = {
        uuid: 'adwita-square@g-mobile.eu',
        'gettext-domain': 'adwita-square',
        'settings-schema': 'org.gnome.shell.extensions.adwita-square',
        version: 3,
        'version-name': '1.0.2',
        dir: Gio.File.new_for_path(currentDir),
        path: currentDir,
    };

    const prefs = new AdwitaSquarePreferences(metadata);

    const schemaSource = Gio.SettingsSchemaSource.new_from_directory(
        GLib.build_filenamev([currentDir, 'schemas']),
        Gio.SettingsSchemaSource.get_default(),
        false
    );
    const schema = schemaSource.lookup('org.gnome.shell.extensions.adwita-square', false);
    const settings = new Gio.Settings({ settings_schema: schema });
    prefs.getSettings = () => settings;

    prefs.fillPreferencesWindow(window);
    window.present();
});

app.run([import.meta.url, ...ARGV]);
