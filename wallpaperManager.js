/*
 * Adwita Square - Wallpaper Manager
 * Utilities for loading folder wallpapers, thumbnails, automatic rotation, and live wallpapers.
 *
 * Copyright (C) 2024-2026 g-mobile.eu
 * Licensed under LGPL-2.1-or-later
 */

// ============================================================================
// SECTION: Wallpaper Formats & Detection
// I define supported image and video file extensions for wallpapers.
// Modify these arrays to allow additional file formats.
// ============================================================================

import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

export const SUPPORTED_IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.svg', '.jxl', '.avif'];
export const SUPPORTED_VIDEO_EXTS = ['.mp4', '.webm', '.mkv', '.mov', '.avi'];

export function isVideoFile(pathOrName) {
    if (!pathOrName) return false;
    const lower = pathOrName.toLowerCase();
    return SUPPORTED_VIDEO_EXTS.some(ext => lower.endsWith(ext));
}

export function isImageFile(pathOrName) {
    if (!pathOrName) return false;
    const lower = pathOrName.toLowerCase();
    return SUPPORTED_IMAGE_EXTS.some(ext => lower.endsWith(ext));
}

export function isSupportedFile(pathOrName) {
    return isImageFile(pathOrName) || isVideoFile(pathOrName);
}

// ============================================================================
// SECTION: Rotation Interval Presets
// I define preset intervals for wallpaper rotation (slider values in minutes).
// ============================================================================
export const INTERVAL_PRESETS = [
    { value: 0, label: 'Off', text: 'Disabled' },
    { value: 1, label: '1m', text: '1 min' },
    { value: 5, label: '5m', text: '5 min' },
    { value: 15, label: '15m', text: '15 min' },
    { value: 30, label: '30m', text: '30 min' },
    { value: 60, label: '60m', text: '60 min' },
];

export function getIntervalIndex(intervalMinutes) {
    const idx = INTERVAL_PRESETS.findIndex(p => p.value === intervalMinutes);
    return idx >= 0 ? idx : 0;
}

export function getIntervalPresetByIndex(index) {
    const clamped = Math.max(0, Math.min(INTERVAL_PRESETS.length - 1, Math.round(index)));
    return INTERVAL_PRESETS[clamped];
}

// ============================================================================
// SECTION: Folder Scanner
// I enumerate files in the specified folder and filter supported images and videos.
// ============================================================================
export function scanWallpaperFolder(folderPath) {
    if (!folderPath || !GLib.file_test(folderPath, GLib.FileTest.IS_DIR)) {
        return [];
    }
    const results = [];
    try {
        const dir = Gio.File.new_for_path(folderPath);
        const enumerator = dir.enumerate_children(
            'standard::name,standard::type,time::modified',
            Gio.FileQueryInfoFlags.NONE,
            null
        );
        let info;
        while ((info = enumerator.next_file(null)) !== null) {
            const name = info.get_name();
            if (name.startsWith('.')) continue;
            if (isSupportedFile(name)) {
                const child = enumerator.get_child(info);
                const isVid = isVideoFile(name);
                results.push({
                    name,
                    path: child.get_path(),
                    uri: child.get_uri(),
                    isVideo: isVid,
                    mtime: info.get_modification_date_time()?.to_unix() || 0,
                });
            }
        }
        enumerator.close(null);
    } catch (e) {
        console.warn('Error scanning wallpaper folder:', e);
    }

    results.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
    return results;
}

// ============================================================================
// SECTION: Thumbnail Generator & Cache
// I cache and generate video thumbnails using ffmpeg to preview video wallpapers.
// ============================================================================
export function getCacheDir() {
    const cacheDir = GLib.build_filenamev([GLib.get_user_cache_dir(), 'adwita-square', 'wallpapers']);
    GLib.mkdir_with_parents(cacheDir, 0o755);
    return cacheDir;
}

export function getThumbnailForFile(filePath, isVid = false) {
    if (!filePath || !GLib.file_test(filePath, GLib.FileTest.EXISTS)) {
        return null;
    }
    if (!isVid) {
        return filePath;
    }

    const cacheDir = getCacheDir();
    const hash = GLib.compute_checksum_for_string(GLib.ChecksumType.SHA256, filePath, -1);
    const thumbPath = GLib.build_filenamev([cacheDir, `${hash}.jpg`]);

    if (GLib.file_test(thumbPath, GLib.FileTest.EXISTS)) {
        return thumbPath;
    }

    try {
        const cmd = [
            'ffmpeg', '-y',
            '-ss', '00:00:01',
            '-i', filePath,
            '-frames:v', '1',
            '-update', '1',
            '-vf', 'scale=240:-1:flags=lanczos',
            '-q:v', '3',
            thumbPath
        ];
        const [ok, , , exitStatus] = GLib.spawn_sync(null, cmd, null, GLib.SpawnFlags.SEARCH_PATH, null);
        if (ok && exitStatus === 0 && GLib.file_test(thumbPath, GLib.FileTest.EXISTS)) {
            return thumbPath;
        }

        // I provide a fallback frame extraction at 0s for videos shorter than 1s
        const fallbackCmd = [
            'ffmpeg', '-y',
            '-ss', '00:00:00',
            '-i', filePath,
            '-frames:v', '1',
            '-update', '1',
            '-vf', 'scale=240:-1:flags=lanczos',
            '-q:v', '3',
            thumbPath
        ];
        const [fOk, , , fExit] = GLib.spawn_sync(null, fallbackCmd, null, GLib.SpawnFlags.SEARCH_PATH, null);
        if (fOk && fExit === 0 && GLib.file_test(thumbPath, GLib.FileTest.EXISTS)) {
            return thumbPath;
        }
    } catch (e) {
        console.warn('ffmpeg thumbnail generation error:', e);
    }

    return null;
}

// ============================================================================
// SECTION: Wallpaper Rotation & Application
// I select the next wallpaper in sequence or randomly and apply it to GNOME background.
// ============================================================================
export function getNextWallpaperPath(folderPath, currentPath = '', random = true) {
    const list = scanWallpaperFolder(folderPath);
    if (!list || list.length === 0) return null;
    if (list.length === 1) return list[0].path;

    if (random) {
        const pool = list.filter(item => item.path !== currentPath);
        const choices = pool.length > 0 ? pool : list;
        const randomIndex = Math.floor(Math.random() * choices.length);
        return choices[randomIndex].path;
    } else {
        const currentIndex = list.findIndex(item => item.path === currentPath);
        const nextIndex = (currentIndex + 1) % list.length;
        return list[nextIndex].path;
    }
}

export function applyWallpaper(filePath, settings = null, bgSettings = null) {
    if (!filePath || !GLib.file_test(filePath, GLib.FileTest.EXISTS)) {
        return false;
    }
    if (!bgSettings) {
        try {
            bgSettings = new Gio.Settings({ schema_id: 'org.gnome.desktop.background' });
        } catch (e) {
            console.warn('Could not load org.gnome.desktop.background:', e);
        }
    }
    if (settings) {
        try {
            settings.set_string('wallpaper-current-path', filePath);
        } catch (_) {}
    }

    const isVid = isVideoFile(filePath);
    if (isVid) {
        const thumb = getThumbnailForFile(filePath, true);
        if (thumb && bgSettings) {
            const uri = Gio.File.new_for_path(thumb).get_uri();
            bgSettings.set_string('picture-uri', uri);
            bgSettings.set_string('picture-uri-dark', uri);
        }
    } else {
        if (bgSettings) {
            const uri = Gio.File.new_for_path(filePath).get_uri();
            bgSettings.set_string('picture-uri', uri);
            bgSettings.set_string('picture-uri-dark', uri);
        }
    }
    return true;
}
