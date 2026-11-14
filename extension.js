/*
 * Adwita Square - GNOME Shell Extension
 * Square GTK theme based on Adwaita.
 *
 * Copyright (C) 2024-2026 g-mobile.eu
 * Based on Adwaita / Libadwaita stylesheets.
 * Original Adwaita copyright (C) 2014-2024 GNOME Project and contributors.
 *
 * Licensed under the GNU Lesser General Public License version 2.1 or later (LGPL-2.1-or-later).
 * See LICENSE file for details.
 */

import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Meta from 'gi://Meta';
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import Shell from 'gi://Shell';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as IconGrid from 'resource:///org/gnome/shell/ui/iconGrid.js';
import * as Background from 'resource:///org/gnome/shell/ui/background.js';
import * as ThemeGenerator from './themeGenerator.js';
import * as ShellThemeGenerator from './shellThemeGenerator.js';
import * as BrowserTheme from './browserTheme.js';
import * as WallpaperManager from './wallpaperManager.js';
import { WindowBlurManager } from './windowBlur.js';
import * as IconThemeGenerator from './iconThemeGenerator.js';
import { DynamicPanelManager } from './dynamicPanelManager.js';

const WALLPAPER_TRANSITION_DURATION = 1800; // ms (smooth cinematic crossfade)

// ============================================================================
// SECTION: Top Panel Blur Manager (PanelBlurManager)
// I implement background blur behind the GNOME Shell top panel when transparency is active.
// Modify this section to customize panel blur constraints or overview visibility behavior.
// ============================================================================
class PanelBlurManager {
    constructor() {
        this._blurActor = null;
        this._blurEffect = null;
        this._overviewShowingId = null;
        this._overviewHidingId = null;
        this._suppressed = false;
    }

    setSuppressed(suppressed) {
        this._suppressed = !!suppressed;
        if (this._blurActor) {
            this._blurActor.visible = !this._suppressed && !Main.overview?.visible;
        }
    }

    apply(blurRadius) {
        if (!Main.layoutManager?.panelBox || !Main.uiGroup) return;

        if (blurRadius > 0) {
            if (!this._blurActor) {
                this._blurActor = new Clutter.Actor({
                    name: 'adwita-square-panel-blur-actor',
                    reactive: false,
                });

                // I bind position and dimensions strictly to panelBox
                this._blurActor.add_constraint(new Clutter.BindConstraint({
                    source: Main.layoutManager.panelBox,
                    coordinate: Clutter.BindCoordinate.ALL,
                }));

                this._blurEffect = new Shell.BlurEffect({
                    mode: Shell.BlurMode.BACKGROUND,
                });
                this._blurActor.add_effect(this._blurEffect);

                // I insert the actor into uiGroup right below panelBox (to blur wallpaper/windows behind the panel)
                Main.uiGroup.insert_child_below(this._blurActor, Main.layoutManager.panelBox);

                if (Main.overview) {
                    this._overviewShowingId = Main.overview.connect('showing', () => {
                        if (this._blurActor) this._blurActor.visible = false;
                    });
                    this._overviewHidingId = Main.overview.connect('hiding', () => {
                        if (this._blurActor) this._blurActor.visible = !this._suppressed;
                    });
                }
            }

            const r = Math.max(1, Math.round(blurRadius));
            if (typeof this._blurEffect.set_radius === 'function') {
                this._blurEffect.set_radius(r);
            } else {
                this._blurEffect.radius = r;
            }
            this._blurActor.visible = !this._suppressed && !Main.overview?.visible;
        } else {
            this.destroy();
        }
    }

    destroy() {
        if (this._overviewShowingId && Main.overview) {
            Main.overview.disconnect(this._overviewShowingId);
            this._overviewShowingId = null;
        }
        if (this._overviewHidingId && Main.overview) {
            Main.overview.disconnect(this._overviewHidingId);
            this._overviewHidingId = null;
        }
        if (this._blurActor) {
            this._blurActor.destroy();
            this._blurActor = null;
            this._blurEffect = null;
        }
    }
}

// ============================================================================
// SECTION: Popover & Menu Blur Manager (PopupBlurManager)
// I implement background blur behind GNOME Shell popovers (Quick Settings, Calendar, App Menus).
// Modify this section to customize popup blur synchronization or stage-transformed coordinates.
// ============================================================================
class PopupBlurManager {
    constructor() {
        this._trackedMenus = new Map();
        this._radius = 0;
        this._opacity = 0;
        this._shouldBlur = false;
    }

    apply(blurRadius, opacity) {
        this._radius = Math.max(1, Math.round(blurRadius));
        this._opacity = opacity;
        this._shouldBlur = this._opacity > 0 && blurRadius > 0;

        const menus = new Set();
        if (Main.panel?.menuManager?._menus) {
            for (const m of Main.panel.menuManager._menus) {
                if (m) menus.add(m);
            }
        }
        if (Main.panel?.statusArea) {
            for (const key of Object.keys(Main.panel.statusArea)) {
                const item = Main.panel.statusArea[key];
                if (item?.menu) menus.add(item.menu);
            }
        }

        // I remove any previous direct effects from menu.box/menu.actor
        for (const menu of menus) {
            try {
                if (menu.box) {
                    const eff = menu.box.get_effect('adwita-square-popup-blur');
                    if (eff) menu.box.remove_effect(eff);
                }
                if (menu.actor) {
                    const eff = menu.actor.get_effect('adwita-square-popup-blur');
                    if (eff) menu.actor.remove_effect(eff);
                }
            } catch (_) {}
        }

        if (this._shouldBlur) {
            for (const menu of menus) {
                this._trackMenu(menu);
            }
        } else {
            this.destroy();
        }
    }

    _trackMenu(menu) {
        if (!menu || !Main.uiGroup) return;

        // I skip PopupDummyMenu (e.g. Activities), which does not have its own BoxPointer
        const boxPointer = menu._boxPointer;
        if (!boxPointer || !menu.actor) return;

        let data = this._trackedMenus.get(menu);
        if (!data) {
            const targetActor = menu.box || boxPointer;

            const blurActor = new Clutter.Actor({
                name: 'adwita-square-popup-blur-actor',
                reactive: false,
                visible: false,
            });

            // I synchronize only the opacity with the BoxPointer open/close animation.
            // I calculate position and size (including scaling/translation) in stage coordinates
            // directly from get_transformed_position() / get_transformed_size() on targetActor (menu.box).
            // NOTE: I avoid Clutter.BindConstraint because it overrides allocation with local x=0
            // before BoxPointer moves to the right side of the screen (Quick Settings).
            const bindings = [];
            try {
                const b = boxPointer.bind_property('opacity', blurActor, 'opacity', GObject.BindingFlags.SYNC_CREATE);
                bindings.push(b);
            } catch (_) {}

            const blurEffect = new Shell.BlurEffect({
                name: 'adwita-square-popup-blur-effect',
                mode: Shell.BlurMode.BACKGROUND,
            });
            blurActor.add_effect(blurEffect);

            const ensureInUiGroup = () => {
                if (!Main.uiGroup || !menu.actor) return false;
                let uiChild = menu.actor;
                while (uiChild && uiChild.get_parent() !== Main.uiGroup) {
                    uiChild = uiChild.get_parent();
                }
                if (!uiChild) return false;

                if (blurActor.get_parent() !== Main.uiGroup) {
                    if (blurActor.get_parent()) {
                        blurActor.get_parent().remove_child(blurActor);
                    }
                    Main.uiGroup.insert_child_below(blurActor, uiChild);
                } else {
                    Main.uiGroup.set_child_below_sibling(blurActor, uiChild);
                }
                return true;
            };

            const syncGeometry = () => {
                if (!blurActor || !boxPointer || !targetActor) return;
                const isShowing = this._shouldBlur &&
                    boxPointer.visible &&
                    (menu.isOpen || boxPointer.opacity > 0);

                if (!isShowing) {
                    blurActor.visible = false;
                    return;
                }

                if (!boxPointer.has_allocation() || !targetActor.has_allocation()) {
                    blurActor.visible = false;
                    return;
                }

                try {
                    const [absX, absY] = targetActor.get_transformed_position();
                    const [w, h] = targetActor.get_transformed_size();
                    if (w > 1 && h > 1 && !Number.isNaN(absX) && !Number.isNaN(absY)) {
                        if (ensureInUiGroup()) {
                            const rx = Math.round(absX);
                            const ry = Math.round(absY);
                            const rw = Math.round(w);
                            const rh = Math.round(h);
                            if (blurActor.x !== rx || blurActor.y !== ry) {
                                blurActor.set_position(rx, ry);
                            }
                            if (blurActor.width !== rw || blurActor.height !== rh) {
                                blurActor.set_size(rw, rh);
                            }
                            blurActor.visible = true;
                        }
                    } else {
                        blurActor.visible = false;
                    }
                } catch (_) {}
            };

            data = {
                blurActor,
                blurEffect,
                signalIds: [],
                bindings,
                boxPointer,
                targetActor,
                laterId: 0,
                ensureInUiGroup,
                syncGeometry,
                scheduleSync: null,
            };

            const scheduleSync = () => {
                syncGeometry();
                if (!data.laterId && global.compositor?.get_laters) {
                    try {
                        const laters = global.compositor.get_laters();
                        data.laterId = laters.add(Meta.LaterType.BEFORE_REDRAW, () => {
                            data.laterId = 0;
                            syncGeometry();
                            return GLib.SOURCE_REMOVE;
                        });
                    } catch (_) {}
                }
            };
            data.scheduleSync = scheduleSync;

            const connectSignal = (obj, sig, handler) => {
                try {
                    const id = obj.connect(sig, handler);
                    data.signalIds.push({ obj, id });
                } catch (_) {}
            };

            connectSignal(menu, 'open-state-changed', () => scheduleSync());
            connectSignal(menu, 'menu-closed', () => {
                blurActor.visible = false;
            });
            connectSignal(menu, 'destroy', () => {
                this._untrackMenu(menu);
            });

            for (const prop of [
                'notify::allocation',
                'notify::x',
                'notify::y',
                'notify::width',
                'notify::height',
                'notify::translation-x',
                'notify::translation-y',
                'notify::scale-x',
                'notify::scale-y',
                'notify::visible',
                'notify::mapped',
            ]) {
                connectSignal(boxPointer, prop, () => scheduleSync());
            }

            if (targetActor !== boxPointer) {
                for (const prop of [
                    'notify::allocation',
                    'notify::x',
                    'notify::y',
                    'notify::width',
                    'notify::height',
                ]) {
                    connectSignal(targetActor, prop, () => scheduleSync());
                }
            }

            this._trackedMenus.set(menu, data);
        }

        // I update the blur radius
        if (data.blurEffect) {
            if (typeof data.blurEffect.set_radius === 'function') {
                data.blurEffect.set_radius(this._radius);
            } else {
                data.blurEffect.radius = this._radius;
            }
        }

        data.scheduleSync();
    }

    _untrackMenu(menu) {
        const data = this._trackedMenus.get(menu);
        if (!data) return;

        if (data.laterId && global.compositor?.get_laters) {
            try {
                global.compositor.get_laters().remove(data.laterId);
            } catch (_) {}
            data.laterId = 0;
        }

        for (const item of data.signalIds) {
            try {
                item.obj.disconnect(item.id);
            } catch (_) {}
        }
        for (const b of data.bindings) {
            try {
                b.unbind();
            } catch (_) {}
        }

        if (data.blurActor) {
            try {
                data.blurActor.destroy();
            } catch (_) {}
        }

        this._trackedMenus.delete(menu);
    }

    destroy() {
        for (const menu of Array.from(this._trackedMenus.keys())) {
            this._untrackMenu(menu);
        }
        this._trackedMenus.clear();
    }
}

// ============================================================================
// SECTION: Dock & Dash Blur Manager (DockBlurManager)
// I implement background blur behind the GNOME Dash and Dash to Dock / Ubuntu Dock.
// Modify this section to customize dock blur detection, FBO redirect rules, or container constraints.
// ============================================================================
class DockBlurManager {
    constructor() {
        this._trackedDocks = new Map();
        this._radius = 0;
        this._opacity = 0;
        this._shouldBlur = false;
        this._extensionStateChangedId = null;
        this._monitorsChangedId = null;
        this._overviewShowingId = null;
        this._overviewShownId = null;
        this._overviewHidingId = null;
        this._overviewHiddenId = null;
        this._uiGroupChildAddedId = null;
    }

    apply(blurRadius, opacity) {
        this._radius = Math.max(1, Math.round(blurRadius));
        this._opacity = opacity;
        this._shouldBlur = this._opacity > 0 && blurRadius > 0;

        if (this._shouldBlur) {
            this._setupListeners();
            this._refreshTrackedDocks();
        } else {
            this.destroy();
        }
    }

    _setupListeners() {
        if (!this._extensionStateChangedId && Main.extensionManager) {
            try {
                this._extensionStateChangedId = Main.extensionManager.connect('extension-state-changed', () => {
                    if (this._shouldBlur) this._refreshTrackedDocks();
                });
            } catch (_) {}
        }
        if (!this._monitorsChangedId && Main.layoutManager) {
            try {
                this._monitorsChangedId = Main.layoutManager.connect('monitors-changed', () => {
                    if (this._shouldBlur) this._refreshTrackedDocks();
                });
            } catch (_) {}
        }
        if (!this._overviewShowingId && Main.overview) {
            try {
                this._overviewShowingId = Main.overview.connect('showing', () => {
                    if (this._shouldBlur) this._refreshTrackedDocks();
                });
            } catch (_) {}
        }
        if (!this._overviewShownId && Main.overview) {
            try {
                this._overviewShownId = Main.overview.connect('shown', () => {
                    if (this._shouldBlur) this._refreshTrackedDocks();
                });
            } catch (_) {}
        }
        if (!this._overviewHidingId && Main.overview) {
            try {
                this._overviewHidingId = Main.overview.connect('hiding', () => {
                    if (this._shouldBlur) this._refreshTrackedDocks();
                });
            } catch (_) {}
        }
        if (!this._overviewHiddenId && Main.overview) {
            try {
                this._overviewHiddenId = Main.overview.connect('hidden', () => {
                    if (this._shouldBlur) this._refreshTrackedDocks();
                });
            } catch (_) {}
        }
        if (!this._uiGroupChildAddedId && Main.uiGroup) {
            try {
                this._uiGroupChildAddedId = Main.uiGroup.connect('child-added', (_, actor) => {
                    if (this._shouldBlur && (actor?.name === 'dashtodockContainer' || actor?.has_style_class_name?.('dashtodockContainer'))) {
                        this._refreshTrackedDocks();
                    }
                });
            } catch (_) {}
        }
    }

    _findDocks() {
        const docks = [];

        // 1. Standard Overview Dash in GNOME Shell
        if (Main.overview?.dash) {
            const dash = Main.overview.dash;
            const bgActor = dash._background || dash;
            docks.push({
                key: 'overview-dash',
                isOverview: true,
                dashActor: dash,
                bgActor,
                targetActor: bgActor,
            });
        }

        // 2. Dash to Dock / Ubuntu Dock if present
        const d2dContainers = new Set();
        if (Main.uiGroup) {
            for (const child of Main.uiGroup.get_children()) {
                if (child.name === 'dashtodockContainer' ||
                    child.has_style_class_name?.('dashtodockContainer')) {
                    d2dContainers.add(child);
                }
            }
        }

        for (const uuid of ['dash-to-dock@micxgx.gmail.com', 'ubuntu-dock@ubuntu.com']) {
            const ext = Main.extensionManager?.lookup?.(uuid);
            const stateObj = ext?.stateObj;
            if (stateObj) {
                const dockManager = stateObj._dockManager || stateObj.dockManager;
                if (dockManager?._docks) {
                    for (const d of dockManager._docks) {
                        const box = d?._box || d?.actor;
                        if (box) d2dContainers.add(box);
                    }
                } else if (stateObj._dock?._box) {
                    d2dContainers.add(stateObj._dock._box);
                }
            }
        }

        let idx = 0;
        for (const container of d2dContainers) {
            let bgActor = null;
            let dashActor = null;

            const searchBg = (act) => {
                if (!act) return;
                if (act.name === 'dash' || act._background) {
                    dashActor = act;
                    if (act._background) bgActor = act._background;
                }
                if (!bgActor && act.has_style_class_name?.('dash-background')) {
                    bgActor = act;
                }
                if (typeof act.get_children === 'function') {
                    for (const ch of act.get_children()) {
                        searchBg(ch);
                    }
                }
            };
            searchBg(container);

            const effectiveDash = dashActor || container;
            const effectiveBg = bgActor || dashActor || container;

            docks.push({
                key: `dash-to-dock-${idx++}`,
                isOverview: false,
                dashActor: effectiveDash,
                bgActor: effectiveBg,
                targetActor: effectiveBg,
            });
        }

        return docks;
    }

    _refreshTrackedDocks() {
        const docks = this._findDocks();
        const activeTargets = new Set();

        for (const dock of docks) {
            const targetActor = dock.bgActor || dock.targetActor;
            if (targetActor) {
                activeTargets.add(targetActor);
                this._trackDock(dock);
            }
        }

        for (const targetActor of Array.from(this._trackedDocks.keys())) {
            if (!activeTargets.has(targetActor)) {
                this._untrackDock(targetActor);
            }
        }
    }

    _trackDock(dock) {
        const targetActor = dock.bgActor || dock.targetActor;
        const parentActor = dock.dashActor || targetActor?.get_parent();
        if (!targetActor) return;

        let data = this._trackedDocks.get(targetActor);
        if (!data) {
            // In default GNOME Shell Dash uses offscreen_redirect: ALWAYS.
            // This redirects rendering to an isolated FBO buffer where Shell.BlurEffect(BACKGROUND) cannot sample desktop pixels.
            // I change this to AUTOMATIC_FOR_OPACITY to allow direct and dynamic background sampling.
            let origOffscreenRedirect = undefined;
            if (parentActor && parentActor.offscreen_redirect !== undefined) {
                origOffscreenRedirect = parentActor.offscreen_redirect;
                if (parentActor.offscreen_redirect === Clutter.OffscreenRedirect.ALWAYS) {
                    parentActor.offscreen_redirect = Clutter.OffscreenRedirect.AUTOMATIC_FOR_OPACITY;
                }
            }

            const blurActor = new Clutter.Actor({
                name: 'adwita-square-dock-blur-actor',
                reactive: false,
            });

            const blurEffect = new Shell.BlurEffect({
                name: 'adwita-square-dock-blur-effect',
                mode: Shell.BlurMode.BACKGROUND,
            });
            blurActor.add_effect(blurEffect);

            // I bind geometry (x, y, width, height) directly to targetActor (dock background)
            blurActor.add_constraint(new Clutter.BindConstraint({
                source: targetActor,
                coordinate: Clutter.BindCoordinate.ALL,
            }));

            // I place blurActor directly underneath the background inside the dock container
            if (parentActor && targetActor.get_parent() === parentActor) {
                parentActor.insert_child_below(blurActor, targetActor);
            } else if (targetActor.get_parent()) {
                targetActor.get_parent().insert_child_below(blurActor, targetActor);
            }

            const bindings = [];
            try {
                const bVis = targetActor.bind_property('visible', blurActor, 'visible', GObject.BindingFlags.SYNC_CREATE);
                bindings.push(bVis);
            } catch (_) {}
            try {
                const bOp = targetActor.bind_property('opacity', blurActor, 'opacity', GObject.BindingFlags.SYNC_CREATE);
                bindings.push(bOp);
            } catch (_) {}

            const signalIds = [];
            const connectSignal = (obj, sig, handler) => {
                try {
                    const id = obj.connect(sig, handler);
                    signalIds.push({ obj, id });
                } catch (_) {}
            };

            connectSignal(targetActor, 'destroy', () => {
                this._untrackDock(targetActor);
            });
            if (parentActor && parentActor !== targetActor) {
                connectSignal(parentActor, 'destroy', () => {
                    this._untrackDock(targetActor);
                });
            }

            data = {
                targetActor,
                parentActor,
                blurActor,
                blurEffect,
                bindings,
                signalIds,
                origOffscreenRedirect,
            };
            this._trackedDocks.set(targetActor, data);
        }

        if (data.blurEffect) {
            const r = Math.max(1, Math.round(this._radius));
            if (typeof data.blurEffect.set_radius === 'function') {
                data.blurEffect.set_radius(r);
            } else {
                data.blurEffect.radius = r;
            }
        }
    }

    _untrackDock(targetActor) {
        const data = this._trackedDocks.get(targetActor);
        if (!data) return;

        for (const item of data.signalIds) {
            try {
                item.obj.disconnect(item.id);
            } catch (_) {}
        }

        for (const b of data.bindings) {
            try {
                b.unbind();
            } catch (_) {}
        }

        if (data.blurActor) {
            try {
                data.blurActor.destroy();
            } catch (_) {}
        }

        if (data.origOffscreenRedirect !== undefined && data.parentActor) {
            try {
                data.parentActor.offscreen_redirect = data.origOffscreenRedirect;
            } catch (_) {}
        }

        this._trackedDocks.delete(targetActor);
    }

    destroy() {
        if (this._extensionStateChangedId && Main.extensionManager) {
            try {
                Main.extensionManager.disconnect(this._extensionStateChangedId);
            } catch (_) {}
            this._extensionStateChangedId = null;
        }
        if (this._monitorsChangedId && Main.layoutManager) {
            try {
                Main.layoutManager.disconnect(this._monitorsChangedId);
            } catch (_) {}
            this._monitorsChangedId = null;
        }
        if (this._overviewShowingId && Main.overview) {
            try {
                Main.overview.disconnect(this._overviewShowingId);
            } catch (_) {}
            this._overviewShowingId = null;
        }
        if (this._overviewShownId && Main.overview) {
            try {
                Main.overview.disconnect(this._overviewShownId);
            } catch (_) {}
            this._overviewShownId = null;
        }
        if (this._overviewHidingId && Main.overview) {
            try {
                Main.overview.disconnect(this._overviewHidingId);
            } catch (_) {}
            this._overviewHidingId = null;
        }
        if (this._overviewHiddenId && Main.overview) {
            try {
                Main.overview.disconnect(this._overviewHiddenId);
            } catch (_) {}
            this._overviewHiddenId = null;
        }
        if (this._uiGroupChildAddedId && Main.uiGroup) {
            try {
                Main.uiGroup.disconnect(this._uiGroupChildAddedId);
            } catch (_) {}
            this._uiGroupChildAddedId = null;
        }

        for (const targetActor of Array.from(this._trackedDocks.keys())) {
            this._untrackDock(targetActor);
        }
        this._trackedDocks.clear();
    }
}

// ============================================================================
// SECTION: Icon Squircle Shape Manager (IconShapeManager)
// I adaptively style icon containers in GNOME Shell overview and app grid to match squircle geometry.
// ============================================================================
class IconShapeManager {
    constructor() {
        this._origBaseIconInit = null;
        this._enabled = false;
        this._iconBlur = 0;
        this._iconOpacity = 0;
    }

    enable(iconBlur = 0, iconOpacity = 0) {
        this._iconBlur = iconBlur;
        this._iconOpacity = iconOpacity;

        if (this._enabled) {
            this._refreshEffects();
            return;
        }
        this._enabled = true;

        if (IconGrid?.BaseIcon && !this._origBaseIconInit) {
            this._origBaseIconInit = IconGrid.BaseIcon.prototype._init;
            const self = this;
            IconGrid.BaseIcon.prototype._init = function (label, params) {
                self._origBaseIconInit.call(this, label, params);
                if (this._iconBin) {
                    this._iconBin.x_align = Clutter.ActorAlign.CENTER;
                    this._iconBin.y_align = Clutter.ActorAlign.CENTER;
                    self._applyBlurToBin(this._iconBin);
                }
            };
        }

        this._updateExistingIcons(Clutter.ActorAlign.CENTER);
        this._refreshEffects();
    }

    updateConfig(iconBlur = 0, iconOpacity = 0) {
        this._iconBlur = iconBlur;
        this._iconOpacity = iconOpacity;
        if (this._enabled) {
            this._refreshEffects();
        }
    }

    disable() {
        if (!this._enabled) return;
        this._enabled = false;

        if (this._origBaseIconInit && IconGrid?.BaseIcon) {
            IconGrid.BaseIcon.prototype._init = this._origBaseIconInit;
            this._origBaseIconInit = null;
        }

        this._iconBlur = 0;
        this._iconOpacity = 0;
        this._refreshEffects();
        this._updateExistingIcons(Clutter.ActorAlign.FILL);
    }

    _applyBlurToBin(iconBin) {
        if (!iconBin) return;
        const effectName = 'adwita-square-icon-blur';
        let effect = null;
        try {
            effect = iconBin.get_effect ? iconBin.get_effect(effectName) : null;
        } catch (_) {}

        if (this._iconBlur > 0 && this._iconOpacity > 0) {
            if (!effect) {
                try {
                    effect = new Shell.BlurEffect({
                        name: effectName,
                        mode: Shell.BlurMode.BACKGROUND,
                    });
                    iconBin.add_effect(effect);
                } catch (_) {}
            }
            if (effect) {
                const r = Math.max(1, Math.round(this._iconBlur));
                try {
                    if (typeof effect.set_radius === 'function') {
                        effect.set_radius(r);
                    } else {
                        effect.radius = r;
                    }
                } catch (_) {}
            }
        } else if (effect) {
            try {
                iconBin.remove_effect(effect);
            } catch (_) {}
        }
    }

    _refreshEffects() {
        try {
            const appDisplay = Main.overview?._overview?.controls?.appDisplay;
            if (appDisplay) {
                this._traverseAndApplyBlur(appDisplay);
            }
            if (Main.overview?.dash) {
                this._traverseAndApplyBlur(Main.overview.dash);
            }
        } catch (_) {}
    }

    _traverseAndApplyBlur(actor) {
        if (!actor) return;
        if (actor.icon?._iconBin) {
            this._applyBlurToBin(actor.icon._iconBin);
        }
        if (actor._delegate?.icon?._iconBin) {
            this._applyBlurToBin(actor._delegate.icon._iconBin);
        }
        if (typeof actor.get_children === 'function') {
            for (const child of actor.get_children()) {
                this._traverseAndApplyBlur(child);
            }
        }
    }

    _updateExistingIcons(align) {
        try {
            const appDisplay = Main.overview?._overview?.controls?.appDisplay;
            if (appDisplay) {
                this._applyAlign(appDisplay, align);
            }
            if (Main.overview?.dash) {
                this._applyAlign(Main.overview.dash, align);
            }
        } catch (e) {
            console.warn('[adwita-square] Failed to update icon alignment:', e);
        }
    }

    _applyAlign(actor, align) {
        if (!actor) return;
        if (actor.icon?._iconBin) {
            actor.icon._iconBin.x_align = Clutter.ActorAlign.CENTER;
            actor.icon._iconBin.y_align = align;
        }
        if (actor._delegate?.icon?._iconBin) {
            actor._delegate.icon._iconBin.x_align = Clutter.ActorAlign.CENTER;
            actor._delegate.icon._iconBin.y_align = align;
        }
        if (typeof actor.get_children === 'function') {
            for (const child of actor.get_children()) {
                this._applyAlign(child, align);
            }
        }
    }
}

// ============================================================================
// SECTION: Live Video Wallpaper Manager (LiveWallpaperManager)
// I manage hardware-accelerated video wallpaper subprocesses and Clutter crossfade transitions.
// Modify this section to customize live wallpaper window handling, opacity crossfades, or durations.
// ============================================================================
class LiveWallpaperManager {
    constructor(extensionPath) {
        this._extensionPath = extensionPath;
        this._currentProcess = null;
        this._currentVideoPath = null;
        this._mapId = null;
        this._clutterClones = [];
        this._managedWindows = new Set();
        this._fadingItems = [];
        this._useTransition = true;
    }

    start(videoPath, useTransition = true) {
        if (!videoPath || !GLib.file_test(videoPath, GLib.FileTest.EXISTS)) return;
        if (this._currentVideoPath === videoPath && this._currentProcess) {
            return;
        }

        this._useTransition = useTransition;

        // I clean up any previous process that was still fading out
        if (this._fadingItems.length > 0) {
            this._cleanupItems(this._fadingItems);
            this._fadingItems = [];
        }

        // If video is currently playing, I move it to fading items (_fadingItems)
        // instead of destroying it immediately - allowing the previous wallpaper to keep playing smoothly
        if (this._clutterClones.length > 0 || this._currentProcess) {
            if (useTransition) {
                this._fadingItems.push({
                    clones: [...this._clutterClones],
                    windows: new Set(this._managedWindows),
                    process: this._currentProcess,
                });
            } else {
                this._cleanupItems([{
                    clones: this._clutterClones,
                    windows: this._managedWindows,
                    process: this._currentProcess,
                }]);
            }
            this._clutterClones = [];
            this._managedWindows = new Set();
            this._currentProcess = null;
        }

        this._currentVideoPath = videoPath;
        this._setupWindowListener();

        const rendererScript = GLib.build_filenamev([this._extensionPath, 'videoWallpaperRenderer.js']);
        try {
            this._currentProcess = new Gio.Subprocess({
                argv: ['gjs', '-m', rendererScript, videoPath],
                flags: Gio.SubprocessFlags.NONE,
            });
            this._currentProcess.init(null);
        } catch (e) {
            console.warn('Could not launch video wallpaper renderer:', e);
        }
    }

    _setupWindowListener() {
        if (this._mapId || !global.window_manager) return;

        this._mapId = global.window_manager.connect_after('map', (_wm, windowActor) => {
            const window = windowActor?.get_meta_window?.();
            if (!window) return;

            const title = window.get_title();
            if (title && title.startsWith('@adwita-square-live-wallpaper!')) {
                this._manageWallpaperWindow(window, windowActor);
            }
        });
    }

    _manageWallpaperWindow(window, windowActor) {
        try {
            window.skip_taskbar = true;
            window.lower();
            windowActor.opacity = 0;

            if (Main.layoutManager?._backgroundGroup) {
                const bgGroup = Main.layoutManager._backgroundGroup;
                const clone = new Clutter.Clone({
                    source: windowActor,
                    x_expand: true,
                    y_expand: true,
                });

                // I check if an old wallpaper is on top (from _fadingItems)
                let topFadingClone = null;
                for (const item of this._fadingItems) {
                    for (const c of item.clones) {
                        if (c && c.get_parent() === bgGroup) {
                            topFadingClone = c;
                            break;
                        }
                    }
                    if (topFadingClone) break;
                }

                if (topFadingClone && this._useTransition) {
                    // TRANSPARENCY TECHNIQUE:
                    // 1. I place the new wallpaper underneath the old one!
                    clone.opacity = 255;
                    bgGroup.insert_child_below(clone, topFadingClone);
                    this._clutterClones.push(clone);

                    // 2. The old wallpaper on top smoothly fades opacity to 0 and disappears,
                    // revealing the new wallpaper beneath!
                    const itemsToFade = [...this._fadingItems];
                    this._fadingItems = [];

                    for (const item of itemsToFade) {
                        for (const oldClone of item.clones) {
                            try {
                                oldClone.ease({
                                    opacity: 0,
                                    duration: WALLPAPER_TRANSITION_DURATION,
                                    mode: Clutter.AnimationMode.EASE_OUT_QUAD,
                                    onComplete: () => {
                                        try { oldClone.destroy(); } catch (_) {}
                                    },
                                });
                            } catch (_) {
                                try { oldClone.destroy(); } catch (_) {}
                            }
                        }

                        // After the animation finishes, I close the window and terminate the old wallpaper process
                        GLib.timeout_add(GLib.PRIORITY_DEFAULT, WALLPAPER_TRANSITION_DURATION + 100, () => {
                            for (const win of item.windows) {
                                try { win.delete(global.get_current_time()); } catch (_) {}
                            }
                            item.windows.clear();
                            if (item.process) {
                                try { item.process.force_exit(); } catch (_) {}
                            }
                            return GLib.SOURCE_REMOVE;
                        });
                    }
                } else {
                    // No previous video wallpaper (e.g. transition from GNOME static wallpaper):
                    // The GNOME static wallpaper is already at the bottom of bgGroup.
                    // I add the new video wallpaper and smoothly fade it in (opacity 0 -> 255).
                    if (this._useTransition) {
                        clone.opacity = 0;
                        bgGroup.add_child(clone);
                        this._clutterClones.push(clone);
                        clone.ease({
                            opacity: 255,
                            duration: WALLPAPER_TRANSITION_DURATION,
                            mode: Clutter.AnimationMode.EASE_OUT_QUAD,
                        });
                    } else {
                        clone.opacity = 255;
                        bgGroup.add_child(clone);
                        this._clutterClones.push(clone);
                    }
                }
            }
            this._managedWindows.add(window);
        } catch (e) {
            console.warn('Error managing live wallpaper window:', e);
        }
    }

    stop(useTransition = true) {
        if (this._mapId && global.window_manager) {
            try { global.window_manager.disconnect(this._mapId); } catch (_) {}
            this._mapId = null;
        }

        if (this._fadingItems.length > 0) {
            this._cleanupItems(this._fadingItems);
            this._fadingItems = [];
        }

        if (this._clutterClones.length > 0) {
            if (useTransition) {
                // Transition from video to static wallpaper:
                // The new GNOME static wallpaper is beneath in bgGroup.
                // The old video wallpaper smoothly fades opacity to 0 and disappears!
                const clones = [...this._clutterClones];
                const wins = new Set(this._managedWindows);
                const proc = this._currentProcess;

                this._clutterClones = [];
                this._managedWindows = new Set();
                this._currentProcess = null;
                this._currentVideoPath = null;

                for (const clone of clones) {
                    try {
                        clone.ease({
                            opacity: 0,
                            duration: WALLPAPER_TRANSITION_DURATION,
                            mode: Clutter.AnimationMode.EASE_OUT_QUAD,
                            onComplete: () => {
                                try { clone.destroy(); } catch (_) {}
                            },
                        });
                    } catch (_) {
                        try { clone.destroy(); } catch (_) {}
                    }
                }

                GLib.timeout_add(GLib.PRIORITY_DEFAULT, WALLPAPER_TRANSITION_DURATION + 100, () => {
                    for (const win of wins) {
                        try { win.delete(global.get_current_time()); } catch (_) {}
                    }
                    if (proc) {
                        try { proc.force_exit(); } catch (_) {}
                    }
                    return GLib.SOURCE_REMOVE;
                });
                return;
            } else {
                for (const clone of this._clutterClones) {
                    try { clone.destroy(); } catch (_) {}
                }
                this._clutterClones = [];
            }
        }

        for (const win of this._managedWindows) {
            try { win.delete(global.get_current_time()); } catch (_) {}
        }
        this._managedWindows.clear();

        if (this._currentProcess) {
            try {
                this._currentProcess.force_exit();
            } catch (_) {}
            this._currentProcess = null;
        }
        this._currentVideoPath = null;
    }

    _cleanupItems(items) {
        for (const item of items) {
            for (const clone of item.clones) {
                try { clone.destroy(); } catch (_) {}
            }
            for (const win of item.windows) {
                try { win.delete(global.get_current_time()); } catch (_) {}
            }
            if (item.process) {
                try { item.process.force_exit(); } catch (_) {}
            }
        }
    }
}

// ============================================================================
// SECTION: Main Extension Controller (AdwitaSquareExtension)
// I manage lifecycle, settings synchronization, GSettings change listeners, and subsystem dispatch.
// Modify this section to tweak default behaviors, key bindings, or signal bindings.
// ============================================================================
export default class AdwitaSquareExtension extends Extension {
    _settings = null;
    _settingsChangedId = null;
    _interfaceSettings = null;
    _interfaceGtkThemeChangedId = null;
    _interfaceAccentColorChangedId = null;
    _interfaceColorSchemeChangedId = null;
    _isSyncingAccent = false;
    _blurManager = null;
    _shellStylesheetFile = null;
    _panelBlurManager = null;
    _dynamicPanelManager = null;
    _dockBlurManager = null;
    _popupBlurManager = null;
    _iconShapeManager = null;
    _liveWallpaperManager = null;
    _wallpaperTimerId = 0;
    _syncAccentTimerId = 0;
    _autoIconRegenTimerId = 0;
    _isAutoRegeneratingIcons = false;
    _pendingAutoIconRegen = false;
    _origSwapBackgroundActor = null;

    enable() {
        console.log(`[${this.uuid}] Enabling adwita-square extension...`);

        try {
            this._settings = this.getSettings();
            this._interfaceSettings = new Gio.Settings({ schema_id: 'org.gnome.desktop.interface' });
            this._bgSettings = new Gio.Settings({ schema_id: 'org.gnome.desktop.background' });
            this._liveWallpaperManager = new LiveWallpaperManager(this.path);

            // I smooth and slow down the native GNOME Shell static wallpaper crossfade (up to 1800ms)
            if (Background?.BackgroundManager?.prototype?._swapBackgroundActor) {
                this._origSwapBackgroundActor = Background.BackgroundManager.prototype._swapBackgroundActor;
                const extSettings = this._settings;
                Background.BackgroundManager.prototype._swapBackgroundActor = function () {
                    const oldBackgroundActor = this.backgroundActor;
                    this.backgroundActor = this._newBackgroundActor;
                    this._newBackgroundActor = null;
                    this.emit('changed');

                    if (Main.layoutManager?.screenTransition?.visible) {
                        oldBackgroundActor?.destroy?.();
                        return;
                    }

                    const useTransition = extSettings?.get_boolean('wallpaper-transition') ?? true;
                    if (useTransition && oldBackgroundActor) {
                        oldBackgroundActor.ease({
                            opacity: 0,
                            duration: WALLPAPER_TRANSITION_DURATION,
                            mode: Clutter.AnimationMode.EASE_OUT_QUAD,
                            onComplete: () => {
                                try { oldBackgroundActor.destroy(); } catch (_) {}
                            },
                        });
                    } else if (oldBackgroundActor) {
                        oldBackgroundActor.destroy();
                    }
                };
            }

            // Sync with wallpaper or system accent color on startup if valid
            if (this._settings.get_boolean('accent-color-automatic')) {
                this._syncAccentFromWallpaper();
            } else {
                this._syncAccentFromSystem();
            }

            // Change wallpaper on login if enabled
            if (this._settings.get_boolean('wallpaper-change-on-login')) {
                const folder = this._settings.get_string('wallpaper-folder');
                if (folder) {
                    const isRandom = this._settings.get_boolean('wallpaper-random');
                    const currentPath = this._settings.get_string('wallpaper-current-path');
                    const next = WallpaperManager.getNextWallpaperPath(folder, currentPath, isRandom);
                    if (next) {
                        WallpaperManager.applyWallpaper(next, this._settings, this._bgSettings);
                    }
                }
            }

            this._checkAndApplyCurrentWallpaper();
            this._setupWallpaperTimer();

            this._settingsChangedId = this._settings.connect('changed', (settings, key) => {
                if (key === 'accent-color') {
                    this._syncAccentToSystem();
                    this._applyTheme();
                    this._triggerAutoIconRegen();
                } else if (key === 'accent-color-automatic') {
                    if (this._settings.get_boolean('accent-color-automatic')) {
                        this._syncAccentFromWallpaper();
                    } else {
                        this._syncAccentFromSystem();
                    }
                    this._applyTheme();
                } else if (key === 'icon-palette-mode') {
                    this._triggerAutoIconRegen();
                } else if (key === 'firefox-theme') {
                    const enabled = this._settings.get_boolean('firefox-theme');
                    if (!enabled) {
                        BrowserTheme.removeFirefoxTheme();
                    }
                } else if (key === 'chromium-theme') {
                    const enabled = this._settings.get_boolean('chromium-theme');
                    BrowserTheme.applyChromiumTheme(enabled);
                } else if (key === 'wallpaper-interval' || key === 'wallpaper-folder') {
                    this._setupWallpaperTimer();
                } else if (key === 'wallpaper-current-path') {
                    this._checkAndApplyCurrentWallpaper();
                } else if (key.startsWith('wallpaper-')) {
                    // I ignore wallpaper settings keys when reloading shell styles
                } else {
                    this._applyTheme();
                }
            });

            this._bgChangedId = this._bgSettings.connect('changed::picture-uri', () => {
                this._debounceSyncAccent();
            });

            this._bgDarkChangedId = this._bgSettings.connect('changed::picture-uri-dark', () => {
                this._debounceSyncAccent();
            });

            this._interfaceGtkThemeChangedId = this._interfaceSettings.connect('changed::gtk-theme', () => {
                this._applyTheme();
            });

            this._interfaceAccentColorChangedId = this._interfaceSettings.connect('changed::accent-color', () => {
                this._syncAccentFromSystem();
            });

            this._interfaceColorSchemeChangedId = this._interfaceSettings.connect('changed::color-scheme', () => {
                const scheme = this._interfaceSettings.get_string('color-scheme');
                const newVariant = scheme === 'prefer-dark' ? 'dark' : 'light';
                if (this._settings && this._settings.get_string('theme-variant') !== newVariant) {
                    this._settings.set_string('theme-variant', newVariant);
                }
                if (this._settings && this._settings.get_boolean('accent-color-automatic')) {
                    this._syncAccentFromWallpaper();
                }
                this._applyTheme();
            });

            // Window Blur Manager: I manage background blur for GTK windows
            this._blurManager = new WindowBlurManager(this._settings);
            this._blurManager.enable();

            // Panel Blur Manager: I manage blur behind the GNOME top panel
            this._panelBlurManager = new PanelBlurManager();

            // Dock Blur Manager: I manage blur behind Dash / Dash to Dock
            this._dockBlurManager = new DockBlurManager();

            // Popup Blur Manager: I manage blur behind popups and menus
            this._popupBlurManager = new PopupBlurManager();

            // Icon Shape Manager: I manage adaptive icon squircle styling in the shell
            this._iconShapeManager = new IconShapeManager();

            // Dynamic Panel Manager: I adapt the top panel when windows are maximized
            this._dynamicPanelManager = new DynamicPanelManager(this._settings);
            this._dynamicPanelManager.enable(this._panelBlurManager);

            this._applyTheme();
        } catch (e) {
            console.error(`[${this.uuid}] Error during extension initialization:`, e);
        }
    }

    _debounceSyncAccent() {
        if (this._syncAccentTimerId) {
            GLib.source_remove(this._syncAccentTimerId);
            this._syncAccentTimerId = 0;
        }
        this._syncAccentTimerId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 80, () => {
            this._syncAccentTimerId = 0;
            this._syncAccentFromWallpaper();
            return GLib.SOURCE_REMOVE;
        });
    }

    _syncAccentFromWallpaper() {
        if (!this._settings || this._isSyncingAccent) return;
        if (!this._settings.get_boolean('accent-color-automatic')) return;
        try {
            const isDark = (this._settings.get_string('theme-variant') || 'light') === 'dark';
            const autoColor = ThemeGenerator.extractAccentFromWallpaper(isDark);
            if (autoColor && ThemeGenerator.ACCENT_PRESETS[autoColor]) {
                const currentExtAccent = this._settings.get_string('accent-color');
                const currentSysAccent = this._interfaceSettings ? this._interfaceSettings.get_string('accent-color') : '';
                if (currentExtAccent !== autoColor || currentSysAccent !== autoColor) {
                    this._isSyncingAccent = true;
                    this._settings.set_string('accent-color', autoColor);
                    if (this._interfaceSettings) {
                        try {
                            this._interfaceSettings.set_string('accent-color', autoColor);
                        } catch (_) {}
                    }
                    this._isSyncingAccent = false;
                    this._applyTheme();
                    this._triggerAutoIconRegen();
                }
            }
        } catch (e) {
            console.warn(`[${this.uuid}] Error synchronizing accent color from wallpaper:`, e);
        }
    }

    _syncAccentFromSystem() {
        if (!this._settings || !this._interfaceSettings || this._isSyncingAccent) return;
        if (this._settings.get_boolean('accent-color-automatic')) return;
        try {
            const sysAccent = this._interfaceSettings.get_string('accent-color');
            if (sysAccent && ThemeGenerator.ACCENT_PRESETS[sysAccent]) {
                const currentExtAccent = this._settings.get_string('accent-color');
                if (currentExtAccent !== sysAccent) {
                    this._isSyncingAccent = true;
                    this._settings.set_string('accent-color', sysAccent);
                    this._isSyncingAccent = false;
                    this._applyTheme();
                    this._triggerAutoIconRegen();
                }
            }
        } catch (e) {
            console.warn(`[${this.uuid}] Error synchronizing accent color from system:`, e);
        }
    }

    _syncAccentToSystem() {
        if (!this._settings || !this._interfaceSettings || this._isSyncingAccent) return;
        try {
            const extAccent = this._settings.get_string('accent-color');
            if (extAccent && ThemeGenerator.ACCENT_PRESETS[extAccent]) {
                const currentSysAccent = this._interfaceSettings.get_string('accent-color');
                if (currentSysAccent !== extAccent) {
                    this._isSyncingAccent = true;
                    this._interfaceSettings.set_string('accent-color', extAccent);
                    this._isSyncingAccent = false;
                }
            }
        } catch (e) {
            console.warn(`[${this.uuid}] Error writing accent color to system:`, e);
        }
    }

    _triggerAutoIconRegen() {
        if (!this._settings) return;
        const autoRegen = this._settings.get_boolean('icon-auto-regen');
        if (!autoRegen) return;

        const paletteMode = this._settings.get_string('icon-palette-mode') || 'accent';
        // I run automatic background regeneration dedicated to 'accent' style
        if (paletteMode !== 'accent') return;

        const themeDir = IconThemeGenerator.getIconThemeDir();
        if (!GLib.file_test(themeDir, GLib.FileTest.IS_DIR)) return;

        if (this._autoIconRegenTimerId) {
            GLib.source_remove(this._autoIconRegenTimerId);
            this._autoIconRegenTimerId = 0;
        }

        if (this._isAutoRegeneratingIcons) {
            this._pendingAutoIconRegen = true;
            return;
        }

        this._autoIconRegenTimerId = GLib.timeout_add(GLib.PRIORITY_LOW, 600, () => {
            this._autoIconRegenTimerId = 0;
            if (this._isAutoRegeneratingIcons) {
                this._pendingAutoIconRegen = true;
                return GLib.SOURCE_REMOVE;
            }

            this._isAutoRegeneratingIcons = true;
            try {
                const cornerRadius = this._settings.get_int('icon-squircle-radius') || 24;
                const borderWidth = this._settings.get_int('icon-border-width') || 1;
                const iconOpacity = this._settings.get_int('icon-opacity') || 0;
                const opacity = iconOpacity > 0 ? (100 - iconOpacity) : 100;
                const innerScale = (this._settings.get_int('icon-shape-scale') || 80) / 100;
                const accentColor = this._settings.get_string('accent-color') || 'blue';

                IconThemeGenerator.generateFullIconThemeChunked(
                    {
                        cornerRadius,
                        borderWidth,
                        opacity,
                        innerScale,
                        accentColor,
                        paletteMode: 'accent',
                    },
                    null,
                    (res) => {
                        this._isAutoRegeneratingIcons = false;
                        console.log(`[${this.uuid}] Automatycznie zaktualizowano ikony w tle dla akcentu '${accentColor}' (${res?.generatedCount || 0} ikon).`);
                        if (this._pendingAutoIconRegen) {
                            this._pendingAutoIconRegen = false;
                            this._triggerAutoIconRegen();
                        }
                    }
                );
            } catch (e) {
                this._isAutoRegeneratingIcons = false;
                console.warn(`[${this.uuid}] Failed to auto-regenerate icons:`, e);
            }
            return GLib.SOURCE_REMOVE;
        });
    }

    _applyTheme() {
        if (!this._settings) return;

        const isEnabled = this._settings.get_boolean('enable-classic-style');
        if (!isEnabled) {
            ThemeGenerator.removeAdwitaSquareCss();
            this._resetPanelStyle();
            this._resetDockStyle();
            this._removeShellStylesheet();
            if (this._panelBlurManager) {
                this._panelBlurManager.destroy();
            }
            if (this._dockBlurManager) {
                this._dockBlurManager.destroy();
            }
            if (this._popupBlurManager) {
                this._popupBlurManager.destroy();
            }
            if (this._iconShapeManager) {
                this._iconShapeManager.disable();
            }
            ShellThemeGenerator.removeShellCss();
            if (this._blurManager) {
                this._blurManager.disable();
            }
            return;
        } else if (this._blurManager && !this._blurManager._enabled) {
            this._blurManager.enable();
        }

        const variant = this._settings.get_string('theme-variant') || 'light';
        const accentColor = this._settings.get_string('accent-color') || 'blue';
        const opacity = Math.max(0, Math.min(100, this._settings.get_int('opacity') || 0));
        let accentStrength = this._settings.get_int('accent-strength');
        if (isNaN(accentStrength) || accentStrength < 0) accentStrength = 15;
        const blur = Math.max(0, this._settings.get_int('blur') || 0);

        let dockOpacity = 0;
        try {
            dockOpacity = Math.max(0, Math.min(100, this._settings.get_int('dock-opacity') || 0));
        } catch (_) {
            dockOpacity = 0;
        }

        let dockBlur = 0;
        try {
            dockBlur = Math.max(0, Math.min(50, this._settings.get_int('dock-blur') || 0));
        } catch (_) {
            dockBlur = 0;
        }

        let iconOpacity = 0;
        try {
            iconOpacity = Math.max(0, Math.min(100, this._settings.get_int('icon-opacity') || 0));
        } catch (_) {
            iconOpacity = 0;
        }

        let iconBlur = 0;
        try {
            iconBlur = Math.max(0, Math.min(50, this._settings.get_int('icon-blur') || 0));
        } catch (_) {
            iconBlur = 0;
        }
        let cornerRadius = this._settings.get_int('corner-radius');
        if (isNaN(cornerRadius) || cornerRadius < 0) cornerRadius = 3;

        let dockCornerRadius = 3;
        try {
            dockCornerRadius = this._settings.get_int('dock-corner-radius');
            if (isNaN(dockCornerRadius) || dockCornerRadius < 0 || dockCornerRadius > 35) {
                dockCornerRadius = cornerRadius;
            }
        } catch (_) {
            dockCornerRadius = cornerRadius;
        }
        let buttonSize = this._settings.get_int('button-size');
        if (isNaN(buttonSize) || buttonSize < 20 || buttonSize > 48) buttonSize = 24;
        let controlButtons = false;
        try {
            controlButtons = this._settings.get_boolean('control-buttons');
        } catch (_) {
            controlButtons = false;
        }

        let forceIconShape = true;
        try {
            forceIconShape = this._settings.get_boolean('force-icon-shape');
        } catch (_) {
            forceIconShape = true;
        }

        let iconBorderWidth = 1;
        try {
            iconBorderWidth = this._settings.get_int('icon-border-width');
            if (isNaN(iconBorderWidth) || iconBorderWidth < 0 || iconBorderWidth > 5) {
                iconBorderWidth = 1;
            }
        } catch (_) {
            iconBorderWidth = 1;
        }

        let borderWidth = 1;
        try {
            borderWidth = this._settings.get_int('border-width');
            if (isNaN(borderWidth) || borderWidth < 0 || borderWidth > 5) {
                borderWidth = iconBorderWidth;
            }
        } catch (_) {
            borderWidth = iconBorderWidth;
        }

        let iconShapeScale = 68;
        try {
            iconShapeScale = this._settings.get_int('icon-shape-scale');
            if (isNaN(iconShapeScale) || iconShapeScale < 50 || iconShapeScale > 90) {
                iconShapeScale = 68;
            }
        } catch (_) {
            iconShapeScale = 68;
        }

        let iconShapeSize = 52;
        try {
            iconShapeSize = this._settings.get_int('icon-shape-size');
            if (isNaN(iconShapeSize) || iconShapeSize < 40 || iconShapeSize > 96) {
                iconShapeSize = 52;
            }
        } catch (_) {
            iconShapeSize = 52;
        }

        let iconSquircleRadius = 24;
        try {
            iconSquircleRadius = this._settings.get_int('icon-squircle-radius');
            if (isNaN(iconSquircleRadius) || iconSquircleRadius < 4 || iconSquircleRadius > 36) {
                iconSquircleRadius = 24;
            }
        } catch (_) {
            iconSquircleRadius = 24;
        }

        let iconPaletteMode = 'accent';
        try {
            iconPaletteMode = this._settings.get_string('icon-palette-mode') || 'accent';
        } catch (_) {
            iconPaletteMode = 'accent';
        }

        if (controlButtons) {
            ThemeGenerator.ensureWindowControlsEnabled();
        }

        // 1. I apply styling for GTK-4.0 and GTK-3.0 applications
        const css = ThemeGenerator.generateAdwitaSquareCss({
            variant,
            accentColor,
            opacity,
            accentStrength,
            blur,
            cornerRadius,
            buttonSize,
            controlButtons,
        });

        const darkCss = ThemeGenerator.generateAdwitaSquareCss({
            variant: 'dark',
            accentColor,
            opacity,
            accentStrength,
            blur,
            cornerRadius,
            buttonSize,
            controlButtons,
        });

        try {
            ThemeGenerator.saveGtk4Css(css, darkCss);
            console.log(`[${this.uuid}] Updated style for GTK-3.0 and GTK-4.0 (variant: ${variant}, accent: ${accentColor})`);
        } catch (e) {
            console.warn(`[${this.uuid}] Skipped saving GTK CSS (e.g. in GDM session):`, e);
        }

        if (this._settings) {
            try {
                if (this._settings.get_boolean('firefox-theme')) {
                    BrowserTheme.applyFirefoxTheme({
                        variant,
                        accentColor,
                        cornerRadius,
                        buttonSize,
                    });
                }
            } catch (_) {}
        }

        // 2. I apply styling for GNOME Shell elements (panel and buttons)
        const panelConfig = ShellThemeGenerator.getPanelConfig({
            variant,
            accentColor,
            opacity,
            blur,
            dockOpacity,
            dockBlur,
            cornerRadius,
            dockCornerRadius,
            borderWidth,
            accentStrength,
        });

        // I enforce a direct style on Main.panel (guarantees proper background regardless of shell theme)
        if (this._dynamicPanelManager) {
            this._dynamicPanelManager.setPanelBlurManager(this._panelBlurManager);
            this._dynamicPanelManager.updateConfig(panelConfig);
        } else if (Main.panel) {
            try {
                // I remove any existing direct blur effect from Main.panel
                const oldEffect = Main.panel.get_effect('adwita-square-panel-blur');
                if (oldEffect) Main.panel.remove_effect(oldEffect);

                Main.panel.set_style(`background-color: ${panelConfig.panelBgColor}; box-shadow: ${panelConfig.panelShadow};`);
            } catch (e) {
                console.warn(`[${this.uuid}] Failed to set Main.panel style:`, e);
            }
        }

        // I enforce a direct style on the dock / dash (with corner radius and shadow)
        this._applyDockStyle(panelConfig);

        const shellCss = ShellThemeGenerator.generateShellCss({
            variant,
            accentColor,
            opacity,
            blur,
            dockOpacity,
            dockBlur,
            iconOpacity,
            iconBlur,
            cornerRadius,
            dockCornerRadius,
            borderWidth,
            accentStrength,
            forceIconShape,
            iconBorderWidth,
            iconShapeScale,
            iconShapeSize,
            iconSquircleRadius,
            iconPaletteMode,
        });

        const shellFile = ShellThemeGenerator.saveShellCss(shellCss);
        this._applyShellStylesheet(shellFile);

        // I apply background blur behind the top panel (only when panel transparency is enabled)
        if (!this._panelBlurManager) {
            this._panelBlurManager = new PanelBlurManager();
        }
        const effectiveBlur = opacity > 0 ? blur : 0;
        this._panelBlurManager.apply(effectiveBlur);

        // I apply background blur behind the dock (Dash / Dash to Dock)
        if (!this._dockBlurManager) {
            this._dockBlurManager = new DockBlurManager();
        }
        const effectiveDockBlur = dockOpacity > 0 ? dockBlur : 0;
        this._dockBlurManager.apply(effectiveDockBlur, dockOpacity);

        // I apply background blur behind popover menus (Quick Settings, Calendar)
        if (!this._popupBlurManager) {
            this._popupBlurManager = new PopupBlurManager();
        }
        this._popupBlurManager.apply(blur, opacity);

        // I manage shell icon container shapes and alignment
        if (forceIconShape) {
            if (!this._iconShapeManager) {
                this._iconShapeManager = new IconShapeManager();
            }
            this._iconShapeManager.enable(iconBlur, iconOpacity);
        } else if (this._iconShapeManager) {
            this._iconShapeManager.disable();
        }
    }

    // =========================================================================
    // SECTION: GNOME Shell Stylesheet & Panel/Dock Styling
    // =========================================================================

    _applyShellStylesheet(newFile) {
        try {
            const themeContext = St.ThemeContext.get_for_stage(global.stage);
            const theme = themeContext.get_theme();
            if (this._shellStylesheetFile) {
                try {
                    theme.unload_stylesheet(this._shellStylesheetFile);
                } catch (e) {
                    console.warn(`[${this.uuid}] Failed to unload previous shell stylesheet:`, e);
                }
            }
            this._shellStylesheetFile = newFile;
            theme.load_stylesheet(this._shellStylesheetFile);
            console.log(`[${this.uuid}] Loaded dynamic shell stylesheet for the top panel`);
        } catch (e) {
            console.error(`[${this.uuid}] Failed to load shell stylesheet:`, e);
        }
    }

    _removeShellStylesheet() {
        if (this._shellStylesheetFile) {
            try {
                const themeContext = St.ThemeContext.get_for_stage(global.stage);
                const theme = themeContext.get_theme();
                theme.unload_stylesheet(this._shellStylesheetFile);
                console.log(`[${this.uuid}] Restored Adwaita style – unloaded shell stylesheet`);
            } catch (e) {
                console.warn(`[${this.uuid}] Failed to unload shell stylesheet:`, e);
            }
            this._shellStylesheetFile = null;
        }
    }

    _resetPanelStyle() {
        if (Main.panel) {
            try {
                Main.panel.remove_style_class_name('adwita-square-panel-maximized-dark');
                Main.panel.remove_style_class_name('adwita-square-panel-maximized-light');
                Main.panel.set_style(null);
                const oldEffect = Main.panel.get_effect('adwita-square-panel-blur');
                if (oldEffect) Main.panel.remove_effect(oldEffect);
            } catch (e) {
                console.warn(`[${this.uuid}] Failed to reset panel style:`, e);
            }
        }
    }

    _applyDockStyle(panelConfig) {
        const dockRadius = panelConfig.dockCornerVal !== undefined ? panelConfig.dockCornerVal : panelConfig.cornerVal;
        const dockStyle = `background-color: ${panelConfig.dockBgColor} !important; border-radius: ${dockRadius}px !important; ${panelConfig.dockBorderCss} box-shadow: ${panelConfig.dockShadow} !important;`;

        // 1. Standard GNOME Shell Dash in overview
        if (Main.overview?.dash?._background) {
            try {
                Main.overview.dash._background.set_style(dockStyle);
            } catch (e) {
                console.warn(`[${this.uuid}] Failed to set dash._background style:`, e);
            }
        }

        // 2. Dash to Dock / Ubuntu Dock if present
        if (this._dockBlurManager) {
            try {
                const docks = this._dockBlurManager._findDocks();
                for (const d of docks) {
                    if (d.targetActor && d.targetActor !== Main.overview?.dash?._background) {
                        d.targetActor.set_style(dockStyle);
                    }
                }
            } catch (_) {}
        }

        this._syncDashToDockSettings(panelConfig);
    }

    _resetDockStyle() {
        if (Main.overview?.dash?._background) {
            try {
                Main.overview.dash._background.set_style(null);
            } catch (_) {}
        }
        if (this._dockBlurManager) {
            try {
                const docks = this._dockBlurManager._findDocks();
                for (const d of docks) {
                    if (d.targetActor) {
                        d.targetActor.set_style(null);
                    }
                }
            } catch (_) {}
        }
    }

    _syncDashToDockSettings(panelConfig) {
        try {
            for (const uuid of ['dash-to-dock@micxgx.gmail.com', 'ubuntu-dock@ubuntu.com']) {
                const ext = Main.extensionManager?.lookup?.(uuid);
                const s = ext?.stateObj?.getSettings ? ext.stateObj.getSettings() : null;
                if (s) {
                    if (!s.get_boolean('apply-custom-theme')) {
                        s.set_boolean('apply-custom-theme', true);
                    }
                }
            }
        } catch (_) {}
    }

    disable() {
        console.log(`[${this.uuid}] Disabling adwita-square extension...`);

        if (this._blurManager) {
            this._blurManager.disable();
            this._blurManager = null;
        }

        // I restore GNOME Shell to default factory state
        if (this._dynamicPanelManager) {
            this._dynamicPanelManager.disable();
            this._dynamicPanelManager = null;
        }

        this._resetPanelStyle();
        this._resetDockStyle();
        this._removeShellStylesheet();

        if (this._panelBlurManager) {
            this._panelBlurManager.destroy();
            this._panelBlurManager = null;
        }

        if (this._dockBlurManager) {
            this._dockBlurManager.destroy();
            this._dockBlurManager = null;
        }

        if (this._popupBlurManager) {
            this._popupBlurManager.destroy();
            this._popupBlurManager = null;
        }

        if (this._iconShapeManager) {
            this._iconShapeManager.disable();
            this._iconShapeManager = null;
        }

        ShellThemeGenerator.removeShellCss();

        if (this._settingsChangedId && this._settings) {
            this._settings.disconnect(this._settingsChangedId);
            this._settingsChangedId = null;
        }

        if (this._interfaceGtkThemeChangedId && this._interfaceSettings) {
            this._interfaceSettings.disconnect(this._interfaceGtkThemeChangedId);
            this._interfaceGtkThemeChangedId = null;
        }

        if (this._interfaceAccentColorChangedId && this._interfaceSettings) {
            this._interfaceSettings.disconnect(this._interfaceAccentColorChangedId);
            this._interfaceAccentColorChangedId = null;
        }

        if (this._interfaceColorSchemeChangedId && this._interfaceSettings) {
            this._interfaceSettings.disconnect(this._interfaceColorSchemeChangedId);
            this._interfaceColorSchemeChangedId = null;
        }

        if (this._bgChangedId && this._bgSettings) {
            this._bgSettings.disconnect(this._bgChangedId);
            this._bgChangedId = null;
        }

        if (this._bgDarkChangedId && this._bgSettings) {
            this._bgSettings.disconnect(this._bgDarkChangedId);
            this._bgDarkChangedId = null;
        }

        if (this._origSwapBackgroundActor && Background?.BackgroundManager?.prototype) {
            Background.BackgroundManager.prototype._swapBackgroundActor = this._origSwapBackgroundActor;
            this._origSwapBackgroundActor = null;
        }

        if (this._syncAccentTimerId) {
            GLib.source_remove(this._syncAccentTimerId);
            this._syncAccentTimerId = 0;
        }

        if (this._autoIconRegenTimerId) {
            GLib.source_remove(this._autoIconRegenTimerId);
            this._autoIconRegenTimerId = 0;
        }

        if (this._wallpaperTimerId) {
            GLib.source_remove(this._wallpaperTimerId);
            this._wallpaperTimerId = 0;
        }

        if (this._liveWallpaperManager) {
            this._liveWallpaperManager.stop(false);
            this._liveWallpaperManager = null;
        }

        this._settings = null;
        this._interfaceSettings = null;
        this._bgSettings = null;

        // I restore original Adwaita style by removing generated CSS from ~/.config/gtk-4.0/
        try {
            ThemeGenerator.removeAdwitaSquareCss();
            console.log(`[${this.uuid}] Restored Adwaita style – removed adwita-square CSS from ~/.config/gtk-4.0/`);
        } catch (e) {
            console.error(`[${this.uuid}] Failed to remove CSS styles:`, e);
        }
    }

    // =========================================================================
    // SECTION: Wallpaper Rotation & Live Wallpaper Helpers
    // =========================================================================

    _setupWallpaperTimer() {
        if (this._wallpaperTimerId) {
            GLib.source_remove(this._wallpaperTimerId);
            this._wallpaperTimerId = 0;
        }
        if (!this._settings) return;

        const interval = this._settings.get_int('wallpaper-interval');
        if (interval > 0) {
            this._wallpaperTimerId = GLib.timeout_add_seconds(
                GLib.PRIORITY_DEFAULT,
                interval * 60,
                () => {
                    this._rotateWallpaper();
                    return GLib.SOURCE_CONTINUE;
                }
            );
        }
    }

    _rotateWallpaper() {
        if (!this._settings) return;
        const folder = this._settings.get_string('wallpaper-folder');
        if (!folder) return;

        const isRandom = this._settings.get_boolean('wallpaper-random');
        const currentPath = this._settings.get_string('wallpaper-current-path');
        const next = WallpaperManager.getNextWallpaperPath(folder, currentPath, isRandom);
        if (next) {
            WallpaperManager.applyWallpaper(next, this._settings, this._bgSettings);
        }
    }

    _checkAndApplyCurrentWallpaper() {
        if (!this._settings) return;
        const currentPath = this._settings.get_string('wallpaper-current-path');
        const useTransition = this._settings.get_boolean('wallpaper-transition');
        if (currentPath && WallpaperManager.isVideoFile(currentPath)) {
            if (this._liveWallpaperManager) {
                this._liveWallpaperManager.start(currentPath, useTransition);
            }
        } else {
            if (this._liveWallpaperManager) {
                this._liveWallpaperManager.stop(useTransition);
            }
        }
    }
}
