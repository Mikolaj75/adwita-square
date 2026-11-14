/*
 * Adwita Square - Dynamic Panel Manager
 * Adapts GNOME Shell top panel to maximized windows (solid dark/light matching).
 *
 * Copyright (C) 2024-2026 g-mobile.eu
 * Licensed under the GNU Lesser General Public License version 2.1 or later (LGPL-2.1-or-later).
 */

// ============================================================================
// SECTION: Dynamic Panel Manager
// I monitor open windows on the active workspace and dynamically adapt
// the GNOME Shell top panel appearance (solid opaque dark/light) when a window
// is maximized to create a seamless edge-to-edge header.
// ============================================================================

import Meta from 'gi://Meta';
import GLib from 'gi://GLib';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

export class DynamicPanelManager {
    constructor(settings) {
        this._settings = settings;
        this._enabled = false;
        this._isMaximized = false;
        this._globalSignals = [];
        this._trackedWindows = new Map(); // metaWindow -> signalIds[]
        this._defaultPanelConfig = null;
        this._panelBlurManager = null;
        this._checkId = 0;
    }

    // ============================================================================
    // SECTION: Lifecycle & Signal Setup
    // I connect to workspace and window signals to monitor geometry changes.
    // ============================================================================
    enable(panelBlurManager = null) {
        if (this._enabled) return;
        this._enabled = true;
        this._panelBlurManager = panelBlurManager;

        // I connect global display and window manager signals
        if (global.display) {
            this._globalSignals.push(
                global.display.connect('window-created', (_d, metaWindow) => {
                    this._trackWindow(metaWindow);
                    this._queueCheck();
                }),
                global.display.connect('restacked', () => {
                    this._queueCheck();
                }),
                global.display.connect('in-fullscreen-changed', () => {
                    this._queueCheck();
                })
            );
        }

        if (global.window_manager) {
            this._globalSignals.push(
                global.window_manager.connect('switch-workspace', () => {
                    this._queueCheck();
                }),
                global.window_manager.connect('size-change', () => {
                    this._queueCheck();
                })
            );
        }

        if (Main.overview) {
            this._globalSignals.push(
                Main.overview.connect('showing', () => {
                    if (this._isMaximized) {
                        this._restoreDefaultStyle();
                    }
                }),
                Main.overview.connect('hiding', () => {
                    this._queueCheck();
                })
            );
        }

        // I track existing windows
        this._trackExistingWindows();

        // I perform initial check
        this._queueCheck();
    }

    disable() {
        if (!this._enabled) return;
        this._enabled = false;

        if (this._checkId) {
            GLib.source_remove(this._checkId);
            this._checkId = 0;
        }

        // I disconnect global signals
        if (global.display) {
            for (const id of this._globalSignals) {
                try {
                    global.display.disconnect(id);
                } catch (_) {}
            }
        }
        if (global.window_manager) {
            for (const id of this._globalSignals) {
                try {
                    global.window_manager.disconnect(id);
                } catch (_) {}
            }
        }
        if (Main.overview) {
            for (const id of this._globalSignals) {
                try {
                    Main.overview.disconnect(id);
                } catch (_) {}
            }
        }
        this._globalSignals = [];

        // I untrack windows
        for (const metaWindow of Array.from(this._trackedWindows.keys())) {
            this._untrackWindow(metaWindow);
        }
        this._trackedWindows.clear();

        // I restore default style
        this._isMaximized = false;
        this._restoreDefaultStyle();
    }

    updateConfig(panelConfig) {
        this._defaultPanelConfig = panelConfig;
        if (this._isMaximized) {
            this._applyMaximizedStyle();
        } else {
            this._restoreDefaultStyle();
        }
        this._queueCheck();
    }

    setPanelBlurManager(mgr) {
        this._panelBlurManager = mgr;
    }

    _trackExistingWindows() {
        if (!global.workspace_manager) return;
        const nWorkspaces = global.workspace_manager.get_n_workspaces();
        for (let i = 0; i < nWorkspaces; i++) {
            const ws = global.workspace_manager.get_workspace_by_index(i);
            if (!ws) continue;
            for (const metaWindow of ws.list_windows()) {
                this._trackWindow(metaWindow);
            }
        }
    }

    _trackWindow(metaWindow) {
        if (!metaWindow || this._trackedWindows.has(metaWindow)) return;

        const signalIds = [];
        try {
            signalIds.push(
                metaWindow.connect('notify::maximized-horizontally', () => this._queueCheck()),
                metaWindow.connect('notify::maximized-vertically', () => this._queueCheck()),
                metaWindow.connect('notify::minimized', () => this._queueCheck()),
                metaWindow.connect('workspace-changed', () => this._queueCheck()),
                metaWindow.connect('unmanaged', () => this._untrackWindow(metaWindow))
            );
        } catch (_) {}

        this._trackedWindows.set(metaWindow, signalIds);
    }

    _untrackWindow(metaWindow) {
        if (!this._trackedWindows.has(metaWindow)) return;
        const signalIds = this._trackedWindows.get(metaWindow) || [];
        for (const id of signalIds) {
            try {
                metaWindow.disconnect(id);
            } catch (_) {}
        }
        this._trackedWindows.delete(metaWindow);
        this._queueCheck();
    }

    _queueCheck() {
        if (!this._enabled) return;
        if (this._checkId) return;
        this._checkId = GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
            this._checkId = 0;
            this._checkMaximizedState();
            return GLib.SOURCE_REMOVE;
        });
    }

    _checkMaximizedState() {
        if (!this._enabled || !this._settings) return;

        let dynamicEnabled = true;
        try {
            dynamicEnabled = this._settings.get_boolean('dynamic-panel-maximized');
        } catch (_) {
            dynamicEnabled = true;
        }

        if (!dynamicEnabled || Main.overview?.visible) {
            if (this._isMaximized) {
                this._isMaximized = false;
                this._restoreDefaultStyle();
            }
            return;
        }

        if (!global.workspace_manager) return;
        const activeWorkspace = global.workspace_manager.get_active_workspace();
        if (!activeWorkspace) return;

        const windows = activeWorkspace.list_windows();
        let hasMaximized = false;

        // ============================================================================
        // SECTION: Maximized Window Detection
        // I check whether any visible normal window is maximized on the primary monitor.
        // ============================================================================
        for (const metaWindow of windows) {
            if (!metaWindow || metaWindow.minimized) continue;
            if (typeof metaWindow.is_hidden === 'function' && metaWindow.is_hidden()) continue;
            if (typeof metaWindow.is_on_primary_monitor === 'function' && !metaWindow.is_on_primary_monitor()) continue;

            const type = metaWindow.get_window_type();
            if (type !== Meta.WindowType.NORMAL) continue;

            const isMax = (typeof metaWindow.is_maximized === 'function' && metaWindow.is_maximized()) ||
                          (metaWindow.maximized_horizontally && metaWindow.maximized_vertically);

            if (isMax) {
                hasMaximized = true;
                break;
            }
        }

        if (hasMaximized !== this._isMaximized) {
            this._isMaximized = hasMaximized;
            if (hasMaximized) {
                this._applyMaximizedStyle();
            } else {
                this._restoreDefaultStyle();
            }
        }
    }

    // ============================================================================
    // SECTION: Dynamic Panel Styling
    // I apply solid opaque background when maximized and restore transparent style when unmaximized.
    // ============================================================================
    _applyMaximizedStyle() {
        if (!Main.panel) return;

        const variant = this._settings ? (this._settings.get_string('theme-variant') || 'dark') : 'dark';
        const isDark = variant === 'dark';

        try {
            if (isDark) {
                // I set a solid black panel to blend seamlessly with the dark window headerbar
                Main.panel.set_style('background-color: #000000; box-shadow: inset 0 -1px 0 0 rgba(255, 255, 255, 0.08);');
                Main.panel.add_style_class_name('adwita-square-panel-maximized-dark');
                Main.panel.remove_style_class_name('adwita-square-panel-maximized-light');
            } else {
                // I set a solid white panel to blend seamlessly with the light window headerbar
                Main.panel.set_style('background-color: #ffffff; box-shadow: inset 0 -1px 0 0 rgba(0, 0, 0, 0.08);');
                Main.panel.add_style_class_name('adwita-square-panel-maximized-light');
                Main.panel.remove_style_class_name('adwita-square-panel-maximized-dark');
            }

            // I suspend background panel blur (unnecessary when the panel is 100% opaque)
            if (this._panelBlurManager && typeof this._panelBlurManager.setSuppressed === 'function') {
                this._panelBlurManager.setSuppressed(true);
            }
        } catch (e) {
            console.warn('[AdwitaSquare] Error applying maximized panel style:', e);
        }
    }

    _restoreDefaultStyle() {
        if (!Main.panel) return;

        try {
            Main.panel.remove_style_class_name('adwita-square-panel-maximized-dark');
            Main.panel.remove_style_class_name('adwita-square-panel-maximized-light');

            if (this._defaultPanelConfig) {
                Main.panel.set_style(`background-color: ${this._defaultPanelConfig.panelBgColor}; box-shadow: ${this._defaultPanelConfig.panelShadow};`);
            }

            if (this._panelBlurManager && typeof this._panelBlurManager.setSuppressed === 'function') {
                this._panelBlurManager.setSuppressed(false);
            }
        } catch (e) {
            console.warn('[AdwitaSquare] Error restoring panel style:', e);
        }
    }
}
