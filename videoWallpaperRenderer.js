#!/usr/bin/env -S gjs -m
/*
 * Adwita Square - Live Wallpaper Renderer
 * GTK4 hardware-accelerated video wallpaper player.
 *
 * Copyright (C) 2024-2026 g-mobile.eu
 * Licensed under LGPL-2.1-or-later
 */

// ============================================================================
// SECTION: Live Wallpaper Video Renderer
// I created this standalone GTK4 runner to render hardware-accelerated looping
// video wallpapers across multiple connected monitors.
// ============================================================================

import Gtk from 'gi://Gtk?version=4.0';
import Gdk from 'gi://Gdk';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

const applicationId = 'eu.gmobile.adwitasquare.livewallpaper';

const app = new Gtk.Application({
    application_id: applicationId,
    flags: Gio.ApplicationFlags.HANDLES_COMMAND_LINE,
});

let currentVideoPath = '';
let activeWindows = [];
let activeMediaFiles = [];

// ============================================================================
// SECTION: Window & Display Setup
// I configure fullscreen borderless windows per monitor to play video seamlessly.
// ============================================================================
function setupWindows(videoPath) {
    if (!videoPath || !GLib.file_test(videoPath, GLib.FileTest.EXISTS)) {
        return;
    }

    if (activeWindows.length > 0 && currentVideoPath === videoPath) {
        return;
    }
    currentVideoPath = videoPath;

    // I clean up previous windows and media files
    for (const win of activeWindows) {
        try { win.destroy(); } catch (_) {}
    }
    activeWindows = [];
    activeMediaFiles = [];

    const display = Gdk.Display.get_default();
    const monitors = display ? [...display.get_monitors()] : [];
    const videoFile = Gio.File.new_for_path(videoPath);

    const monitorsList = monitors.length > 0 ? monitors : [null];

    monitorsList.forEach((monitor, idx) => {
        const win = new Gtk.Window({
            application: app,
            title: `@adwita-square-live-wallpaper!${idx}`,
            decorated: false,
            can_focus: false,
            focus_on_click: false,
        });

        if (monitor) {
            const geom = monitor.get_geometry();
            win.set_default_size(geom.width, geom.height);
        } else {
            win.set_default_size(1920, 1080);
        }

        const mediaFile = Gtk.MediaFile.new_for_file(videoFile);
        mediaFile.set_loop(true);
        mediaFile.set_muted(true);
        mediaFile.play();
        activeMediaFiles.push(mediaFile);

        const picture = new Gtk.Picture({
            paintable: mediaFile,
            hexpand: true,
            vexpand: true,
            can_shrink: true,
        });
        if (typeof picture.set_content_fit === 'function') {
            picture.set_content_fit(Gtk.ContentFit.COVER);
        }

        win.set_child(picture);
        win.present();
        activeWindows.push(win);
    });
}

app.connect('activate', () => {
    if (currentVideoPath) {
        setupWindows(currentVideoPath);
    }
});

app.connect('command-line', (appInstance, commandLine) => {
    const argv = commandLine.get_arguments();
    if (argv.length > 1) {
        const path = argv[1];
        setupWindows(path);
        commandLine.set_exit_status(0);
        return;
    }
    commandLine.set_exit_status(1);
});

// ============================================================================
// SECTION: Application Execution
// I run the application and process command line video path arguments.
// ============================================================================
export const VIDEO_WALLPAPER_APP_ID = applicationId;

export function runVideoWallpaperRenderer(argv = []) {
    currentVideoPath = argv[0] || '';
    const args = [import.meta.url, ...argv];
    return app.run(args);
}

// I run when executed directly as a standalone script
if (typeof ARGV !== 'undefined' && Array.isArray(ARGV) && ARGV.length > 0) {
    runVideoWallpaperRenderer(ARGV);
}
