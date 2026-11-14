/*
 * Adwita Square - Window Blur Manager
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
// SECTION: Window Background Blur Manager
// I implement background blur behind transparent GTK application windows using Clutter.
// Modify this class to customize blur radius scaling, window eligibility, or layering.
// ============================================================================

import Clutter from 'gi://Clutter';
import Shell from 'gi://Shell';
import Meta from 'gi://Meta';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

export class WindowBlurManager {
    constructor(settings) {
        this._settings = settings;
        this._trackedWindows = new Map(); // metaWindow -> { blurActor, blurEffect, signalIds }
        this._windowCreatedId = null;
        this._settingsBlurId = null;
        this._enabled = false;
    }

    // ============================================================================
    // SECTION: Lifecycle & Settings Observation
    // I listen for new windows and blur setting updates to apply blur dynamically.
    // ============================================================================
    enable() {
        if (this._enabled) return;
        this._enabled = true;

        // I watch for newly created windows
        this._windowCreatedId = global.display.connect('window-created', (_display, metaWindow) => {
            this._trackWindow(metaWindow);
        });

        // I watch for blur radius changes in extension settings
        if (this._settings) {
            this._settingsBlurId = this._settings.connect('changed::blur', () => {
                this._onBlurSettingChanged();
            });
        }

        // I track existing windows
        this._trackExistingWindows();
    }

    disable() {
        if (!this._enabled) return;
        this._enabled = false;

        if (this._windowCreatedId) {
            global.display.disconnect(this._windowCreatedId);
            this._windowCreatedId = null;
        }

        if (this._settingsBlurId && this._settings) {
            this._settings.disconnect(this._settingsBlurId);
            this._settingsBlurId = null;
        }

        // I untrack and destroy all blur actors
        for (const metaWindow of Array.from(this._trackedWindows.keys())) {
            this._untrackWindow(metaWindow);
        }
        this._trackedWindows.clear();
    }

    _getBlurRadius() {
        if (!this._settings) return 0;
        return Math.max(0, Math.min(50, this._settings.get_int('blur') || 0));
    }

    _onBlurSettingChanged() {
        const radius = this._getBlurRadius();
        for (const [metaWindow, data] of this._trackedWindows.entries()) {
            if (radius > 0) {
                if (data.blurEffect) {
                    this._applyRadius(data.blurEffect, radius);
                    if (data.blurActor) {
                        data.blurActor.visible = true;
                    }
                } else {
                    this._createBlur(metaWindow, data);
                }
            } else {
                if (data.blurActor) {
                    data.blurActor.visible = false;
                }
            }
        }
    }

    _applyRadius(blurEffect, radius) {
        if (!blurEffect) return;
        // I use 1:1 scaling (without doubling) to prevent excessive smearing
        const r = Math.max(1, Math.round(radius));
        try {
            if (typeof blurEffect.set_radius === 'function') {
                blurEffect.set_radius(r);
            } else {
                blurEffect.radius = r;
            }
        } catch (_) {
            try {
                blurEffect.radius = r;
            } catch (e) {
                console.warn('[adwita-square] Failed to set blur radius:', e);
            }
        }
    }

    _trackExistingWindows() {
        if (!global.workspace_manager) return;
        const nWorkspaces = global.workspace_manager.get_n_workspaces();
        for (let i = 0; i < nWorkspaces; i++) {
            const ws = global.workspace_manager.get_workspace_by_index(i);
            const windows = ws.list_windows();
            for (const win of windows) {
                this._trackWindow(win);
            }
        }
    }

    _isEligible(metaWindow) {
        if (!metaWindow || metaWindow.unmanaged) return false;
        try {
            const type = metaWindow.get_window_type();
            return type === Meta.WindowType.NORMAL ||
                   type === Meta.WindowType.DIALOG ||
                   type === Meta.WindowType.MODAL_DIALOG;
        } catch (_) {
            return false;
        }
    }

    _trackWindow(metaWindow) {
        if (!this._isEligible(metaWindow) || this._trackedWindows.has(metaWindow)) {
            return;
        }

        const data = {
            blurActor: null,
            blurEffect: null,
            signalIds: [],
        };
        this._trackedWindows.set(metaWindow, data);

        // I handle window cleanup when unmanaged (closed)
        const unmanagedId = metaWindow.connect('unmanaging', () => {
            this._untrackWindow(metaWindow);
        });
        data.signalIds.push({ obj: metaWindow, id: unmanagedId });

        const setupIfReady = () => {
            if (!this._enabled || !this._trackedWindows.has(metaWindow) || data.blurActor) {
                return;
            }
            const actor = metaWindow.get_compositor_private();
            if (actor) {
                this._setupWindowBlur(metaWindow, data, actor);
            }
        };

        const shownId = metaWindow.connect('shown', setupIfReady);
        data.signalIds.push({ obj: metaWindow, id: shownId });

        const windowActor = metaWindow.get_compositor_private();
        if (windowActor) {
            this._setupWindowBlur(metaWindow, data, windowActor);
        } else {
            GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
                setupIfReady();
                return GLib.SOURCE_REMOVE;
            });
        }
    }

    // ============================================================================
    // SECTION: Blur Setup & Hierarchy Positioning
    // I create the blur actor and insert it below the window surface texture.
    // ============================================================================
    _setupWindowBlur(metaWindow, data, windowActor) {
        if (data.blurActor) return;
        this._createBlur(metaWindow, data, windowActor);

        // I update geometry on window resize or position changes
        const updateGeom = () => this._updateGeometry(metaWindow, data);

        const sizeId = metaWindow.connect('size-changed', updateGeom);
        data.signalIds.push({ obj: metaWindow, id: sizeId });

        const posId = metaWindow.connect('position-changed', updateGeom);
        data.signalIds.push({ obj: metaWindow, id: posId });

        // I ensure blurActor remains at index 0 (below window texture) when new children are added
        const childAddedId = windowActor.connect('child-added', () => {
            if (data.blurActor && data.blurActor.get_parent() === windowActor) {
                windowActor.set_child_below_sibling(data.blurActor, null);
            }
        });
        data.signalIds.push({ obj: windowActor, id: childAddedId });

        const radius = this._getBlurRadius();
        if (radius === 0 && data.blurActor) {
            data.blurActor.visible = false;
        }
    }

    _createBlur(metaWindow, data, windowActor) {
        if (!windowActor) {
            windowActor = metaWindow.get_compositor_private();
        }
        if (!windowActor || data.blurActor) return;

        const radius = this._getBlurRadius();

        const blurActor = new Clutter.Actor({
            name: 'adwita-square-window-blur',
            reactive: false,
            clip_to_allocation: true,
        });

        const blurEffect = new Shell.BlurEffect({
            mode: Shell.BlurMode.BACKGROUND,
        });
        this._applyRadius(blurEffect, radius > 0 ? radius : 10);
        blurActor.add_effect(blurEffect);

        data.blurActor = blurActor;
        data.blurEffect = blurEffect;

        this._updateGeometry(metaWindow, data);

        // I insert blurActor as first child of windowActor (directly below window surface)
        windowActor.insert_child_at_index(blurActor, 0);

        if (radius === 0) {
            blurActor.visible = false;
        }
    }

    // ============================================================================
    // SECTION: Window Geometry Synchronization
    // I synchronize the blur actor's bounding box with the window frame rectangle.
    // ============================================================================
    _updateGeometry(metaWindow, data) {
        if (!data.blurActor || !metaWindow) return;
        try {
            const frame = metaWindow.get_frame_rect();
            const buffer = metaWindow.get_buffer_rect();

            const x = Math.max(0, frame.x - buffer.x);
            const y = Math.max(0, frame.y - buffer.y);
            const width = Math.max(1, frame.width);
            const height = Math.max(1, frame.height);

            data.blurActor.set_position(x, y);
            data.blurActor.set_size(width, height);
            data.blurActor.set_clip_to_allocation(true);
            data.blurActor.set_clip(0, 0, width, height);
        } catch (e) {
            console.warn('[adwita-square] Error updating blur geometry:', e);
        }
    }

    _untrackWindow(metaWindow) {
        const data = this._trackedWindows.get(metaWindow);
        if (!data) return;

        for (const item of data.signalIds) {
            try {
                item.obj.disconnect(item.id);
            } catch (_) {}
        }
        data.signalIds = [];

        if (data.blurActor) {
            try {
                data.blurActor.destroy();
            } catch (_) {}
            data.blurActor = null;
            data.blurEffect = null;
        }

        this._trackedWindows.delete(metaWindow);
    }
}
