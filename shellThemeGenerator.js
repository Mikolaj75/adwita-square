/*
 * Adwita Square - GNOME Shell Theme Generator
 * Dynamic stylesheet generation for GNOME Shell UI.
 *
 * Copyright (C) 2024-2026 g-mobile.eu
 * Licensed under the GNU Lesser General Public License version 2.1 or later (LGPL-2.1-or-later).
 */

// ============================================================================
// SECTION: Shell Theme Generator & Color Computation
// I compute color palettes, shadows, borders, and transparency values for GNOME Shell UI.
// Modify these parameters to customize top panel, popovers, notifications, or dock look.
// ============================================================================

import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import { ACCENT_PRESETS, hexToRgba, adjustBrightness, mixColors } from './themeGenerator.js';

export function getPanelConfig(options = {}) {
    const isDark = options.variant === 'dark';
    const accentPreset = ACCENT_PRESETS[options.accentColor] || ACCENT_PRESETS.blue;
    const accentHex = accentPreset.hex;

    const rawOpacity = options.opacity !== undefined ? options.opacity : 0;
    const transparency = Math.max(0, Math.min(100, rawOpacity));
    const popupTransparency = Math.min(transparency, 50);
    const rawDockOpacity = options.dockOpacity !== undefined
        ? options.dockOpacity
        : (options.opacity !== undefined ? options.opacity : 0);
    const dockTransparency = Math.max(0, Math.min(100, rawDockOpacity));
    const blurVal = Math.max(0, Math.min(50, options.blur !== undefined ? options.blur : 0));
    const cornerVal = Math.max(0, Math.min(20, options.cornerRadius !== undefined ? options.cornerRadius : 3));
    const rawDockCornerRadius = options.dockCornerRadius !== undefined
        ? options.dockCornerRadius
        : (options.cornerRadius !== undefined ? options.cornerRadius : 3);
    const dockCornerVal = Math.max(0, Math.min(35, rawDockCornerRadius));
    const dotRadius = Math.min(cornerVal, 2);
    const rawBorderWidth = options.borderWidth !== undefined
        ? options.borderWidth
        : (options.iconBorderWidth !== undefined ? options.iconBorderWidth : 1);
    const borderWidth = Math.max(0, Math.min(5, rawBorderWidth));

    let panelBgColor;
    let panelShadow;
    let fgColor;
    let fgHoverColor;
    let hoverBgColor;
    let activeBgColor = accentHex;
    let activeFgColor = '#ffffff';
    let activeHoverBgColor;
    const activePressedBgColor = adjustBrightness(accentHex, isDark ? -0.10 : -0.16);
    const calendarAccentBgColor = hexToRgba(accentHex, 0.50);
    const calendarAccentHoverBgColor = hexToRgba(accentHex, 0.70);
    const dialogPrimaryInsensitiveBgColor = hexToRgba(accentHex, 0.45);
    const dialogSecondaryBgColor = hexToRgba(accentHex, isDark ? 0.32 : 0.22);
    const dialogSecondaryHoverBgColor = hexToRgba(accentHex, isDark ? 0.48 : 0.36);
    const dialogSecondaryActiveBgColor = hexToRgba(accentHex, isDark ? 0.65 : 0.52);
    const dialogSecondaryBorderColor = hexToRgba(accentHex, isDark ? 0.55 : 0.45);
    const dialogSecondaryHoverBorderColor = hexToRgba(accentHex, isDark ? 0.80 : 0.68);
    const dialogSecondaryFgColor = isDark ? '#ffffff' : '#1a1a1e';
    const dialogSecondaryInsensitiveBgColor = hexToRgba(accentHex, 0.14);
    const dialogSecondaryInsensitiveBorderColor = hexToRgba(accentHex, 0.22);

    // I configure popover and popup menus (Quick Settings, Calendar, etc.)
    let popupBgColor;
    let popupFgColor;
    let popupFgDimColor;
    let popupBorderColor;
    let popupShadow;
    let popupCardBgColor;
    let popupCardHoverBgColor;
    let popupCardBorderColor;
    let popupSeparatorColor;

    // I configure notification cards (independent solid cards for readability and stack support)
    let messageCardBgColor;
    let messageCardHoverBgColor;
    let messageCardBorderColor;
    let messageCardSecondStackBgColor;
    let messageCardLowerStackBgColor;

    // I configure dock styles (Dash / Dash to Dock)
    let dockBgColor;
    let dockBorderColor;
    let dockShadow;
    let dockRunningDotColor;

    if (isDark) {
        if (transparency === 0) {
            panelBgColor = '#141414';
            panelShadow = 'inset 0 -1px 0 0 rgba(255, 255, 255, 0.10)';
        } else if (transparency === 100) {
            panelBgColor = 'transparent';
            panelShadow = 'none';
        } else {
            const panelAlpha = (1.0 - (transparency / 100)).toFixed(2);
            panelBgColor = hexToRgba('#141414', parseFloat(panelAlpha));
            panelShadow = `inset 0 -1px 0 0 rgba(255, 255, 255, ${(0.10 * panelAlpha).toFixed(3)})`;
        }

        if (popupTransparency === 0) {
            popupBgColor = '#141414';
            popupShadow = '0 8px 24px rgba(0, 0, 0, 0.45)';
        } else {
            const popupAlpha = (1.0 - (popupTransparency / 100)).toFixed(2);
            popupBgColor = hexToRgba('#141414', parseFloat(popupAlpha));
            popupShadow = `0 8px 24px rgba(0, 0, 0, ${(0.45 * popupAlpha).toFixed(3)})`;
        }

        if (dockTransparency === 0) {
            dockBgColor = '#141414';
            dockBorderColor = 'rgba(255, 255, 255, 0.14)';
            dockShadow = '0 4px 16px rgba(0, 0, 0, 0.45)';
        } else if (dockTransparency === 100) {
            dockBgColor = 'transparent';
            dockBorderColor = 'transparent';
            dockShadow = 'none';
        } else {
            const dockAlpha = (1.0 - (dockTransparency / 100)).toFixed(2);
            dockBgColor = hexToRgba('#141414', parseFloat(dockAlpha));
            dockBorderColor = `rgba(255, 255, 255, ${(0.14 * dockAlpha).toFixed(3)})`;
            dockShadow = `0 4px 16px rgba(0, 0, 0, ${(0.45 * dockAlpha).toFixed(3)})`;
        }
        dockRunningDotColor = '#ffffff';

        popupBorderColor = 'rgba(255, 255, 255, 0.18)';
        fgColor = '#ffffff';
        fgHoverColor = '#ffffff';
        hoverBgColor = 'rgba(255, 255, 255, 0.14)';
        activeHoverBgColor = adjustBrightness(accentHex, 0.12);

        popupFgColor = '#ffffff';
        popupFgDimColor = 'rgba(255, 255, 255, 0.65)';
        popupCardBgColor = 'rgba(255, 255, 255, 0.08)';
        popupCardHoverBgColor = 'rgba(255, 255, 255, 0.14)';
        popupCardBorderColor = 'rgba(255, 255, 255, 0.14)';
        popupSeparatorColor = 'rgba(255, 255, 255, 0.14)';

        messageCardBgColor = '#242428';
        messageCardHoverBgColor = '#2f2f35';
        messageCardBorderColor = 'rgba(255, 255, 255, 0.16)';
        messageCardSecondStackBgColor = '#1e1e22';
        messageCardLowerStackBgColor = '#18181b';
    } else {
        if (transparency === 0) {
            panelBgColor = '#ffffff';
            panelShadow = 'inset 0 -1px 0 0 rgba(0, 0, 0, 0.14)';
        } else if (transparency === 100) {
            panelBgColor = 'transparent';
            panelShadow = 'none';
        } else {
            const panelAlpha = (1.0 - (transparency / 100)).toFixed(2);
            panelBgColor = hexToRgba('#ffffff', parseFloat(panelAlpha));
            panelShadow = `inset 0 -1px 0 0 rgba(0, 0, 0, ${(0.14 * panelAlpha).toFixed(3)})`;
        }

        if (popupTransparency === 0) {
            popupBgColor = '#ffffff';
            popupShadow = '0 8px 24px rgba(0, 0, 0, 0.15)';
        } else {
            const popupAlpha = (1.0 - (popupTransparency / 100)).toFixed(2);
            popupBgColor = hexToRgba('#ffffff', parseFloat(popupAlpha));
            popupShadow = `0 8px 24px rgba(0, 0, 0, ${(0.15 * popupAlpha).toFixed(3)})`;
        }

        if (dockTransparency === 0) {
            dockBgColor = '#ffffff';
            dockBorderColor = '#4a4a4e';
            dockShadow = '0 4px 16px rgba(0, 0, 0, 0.14)';
        } else if (dockTransparency === 100) {
            dockBgColor = 'transparent';
            dockBorderColor = 'transparent';
            dockShadow = 'none';
        } else {
            const dockAlpha = (1.0 - (dockTransparency / 100)).toFixed(2);
            dockBgColor = hexToRgba('#ffffff', parseFloat(dockAlpha));
            const dockBorderAlpha = (0.45 + 0.55 * parseFloat(dockAlpha)).toFixed(2);
            dockBorderColor = hexToRgba('#4a4a4e', parseFloat(dockBorderAlpha));
            dockShadow = `0 4px 16px rgba(0, 0, 0, ${(0.14 * dockAlpha).toFixed(3)})`;
        }
        dockRunningDotColor = '#1a1a1e';

        popupBorderColor = 'rgba(0, 0, 0, 0.16)';
        fgColor = '#222226';
        fgHoverColor = '#000000';
        hoverBgColor = 'rgba(0, 0, 0, 0.08)';
        activeHoverBgColor = adjustBrightness(accentHex, -0.08);

        popupFgColor = '#1a1a1e';
        popupFgDimColor = 'rgba(0, 0, 0, 0.60)';
        popupCardBgColor = 'rgba(0, 0, 0, 0.06)';
        popupCardHoverBgColor = 'rgba(0, 0, 0, 0.11)';
        popupCardBorderColor = 'rgba(0, 0, 0, 0.12)';
        popupSeparatorColor = 'rgba(0, 0, 0, 0.12)';

        messageCardBgColor = '#ffffff';
        messageCardHoverBgColor = '#f5f5f7';
        messageCardBorderColor = 'rgba(0, 0, 0, 0.14)';
        messageCardSecondStackBgColor = '#ebebef';
        messageCardLowerStackBgColor = '#e2e2e6';
    }

    const dockBorderCss = borderWidth === 0
        ? 'border: none !important;'
        : `border: ${borderWidth}px solid ${dockBorderColor} !important;`;

    return {
        isDark,
        borderWidth,
        panelBgColor,
        panelShadow,
        dockOpacity: dockTransparency,
        dockBlur: options.dockBlur !== undefined ? options.dockBlur : blurVal,
        dockBgColor,
        dockBorderColor,
        dockBorderCss,
        dockShadow,
        dockRunningDotColor,
        fgColor,
        fgHoverColor,
        hoverBgColor,
        activeBgColor,
        activeFgColor,
        activeHoverBgColor,
        activePressedBgColor,
        calendarAccentBgColor,
        calendarAccentHoverBgColor,
        dialogPrimaryInsensitiveBgColor,
        dialogSecondaryBgColor,
        dialogSecondaryHoverBgColor,
        dialogSecondaryActiveBgColor,
        dialogSecondaryBorderColor,
        dialogSecondaryHoverBorderColor,
        dialogSecondaryFgColor,
        dialogSecondaryInsensitiveBgColor,
        dialogSecondaryInsensitiveBorderColor,
        cornerVal,
        dockCornerVal,
        dotRadius,
        popupBgColor,
        popupFgColor,
        popupFgDimColor,
        popupBorderColor,
        popupShadow,
        popupCardBgColor,
        popupCardHoverBgColor,
        popupCardBorderColor,
        popupSeparatorColor,
        messageCardBgColor,
        messageCardHoverBgColor,
        messageCardBorderColor,
        messageCardSecondStackBgColor,
        messageCardLowerStackBgColor,
    };
}

// ============================================================================
// SECTION: Shell Stylesheet Generator (CSS)
// I generate the complete GNOME Shell stylesheet rules for panel, popups, and dock.
// ============================================================================
export function generateShellCss(options = {}) {
    const config = getPanelConfig(options);

    return `/* Adwita Square - Dynamic Shell Theme */
/* Generated: ${new Date().toISOString()} */

/* --- Top Bar (Panel) --- */
#panel,
#panelBox #panel,
StWidget#panel {
    background-color: ${config.panelBgColor} !important;
    font-weight: bold;
    height: 2.2em;
    transition-duration: 250ms;
    box-shadow: ${config.panelShadow} !important;
}

#panelBox {
    background-color: transparent !important;
    box-shadow: none !important;
}

#panel:overview,
#panel.unlock-screen,
#panel.login-screen {
    background-color: transparent !important;
    box-shadow: none !important;
}

/* --- Maximized Window State for Panel --- */
#panel.adwita-square-panel-maximized-dark,
#panelBox #panel.adwita-square-panel-maximized-dark,
StWidget#panel.adwita-square-panel-maximized-dark {
    background-color: #000000 !important;
    box-shadow: inset 0 -1px 0 0 rgba(255, 255, 255, 0.08) !important;
}

#panel.adwita-square-panel-maximized-dark .panel-button,
#panel.adwita-square-panel-maximized-dark .panel-button StLabel,
#panel.adwita-square-panel-maximized-dark .panel-button .clock,
#panel.adwita-square-panel-maximized-dark .panel-button StIcon,
#panel.adwita-square-panel-maximized-dark .panel-button .system-status-icon {
    color: #ffffff !important;
}

#panel.adwita-square-panel-maximized-dark .panel-button:focus,
#panel.adwita-square-panel-maximized-dark .panel-button:hover {
    color: #ffffff !important;
    box-shadow: inset 0 0 0 100px rgba(255, 255, 255, 0.14) !important;
}

#panel.adwita-square-panel-maximized-light,
#panelBox #panel.adwita-square-panel-maximized-light,
StWidget#panel.adwita-square-panel-maximized-light {
    background-color: #ffffff !important;
    box-shadow: inset 0 -1px 0 0 rgba(0, 0, 0, 0.08) !important;
}

#panel.adwita-square-panel-maximized-light .panel-button,
#panel.adwita-square-panel-maximized-light .panel-button StLabel,
#panel.adwita-square-panel-maximized-light .panel-button .clock,
#panel.adwita-square-panel-maximized-light .panel-button StIcon,
#panel.adwita-square-panel-maximized-light .panel-button .system-status-icon {
    color: #1a1a1e !important;
}

#panel.adwita-square-panel-maximized-light .panel-button:focus,
#panel.adwita-square-panel-maximized-light .panel-button:hover {
    color: #1a1a1e !important;
    box-shadow: inset 0 0 0 100px rgba(0, 0, 0, 0.08) !important;
}

/* --- Panel Buttons (Square Styling) --- */
#panel .panel-button {
    font-weight: bold;
    color: ${config.fgColor} !important;
    border-radius: ${config.cornerVal}px !important;
    border: 2px solid transparent !important;
    transition-duration: 150ms;
    box-shadow: inset 0 0 0 100px transparent !important;
    -natural-hpadding: 10px;
    -minimum-hpadding: 6px;
}

#panel .panel-button StLabel,
#panel .panel-button .clock,
#panel .panel-button StIcon,
#panel .panel-button .system-status-icon {
    color: ${config.fgColor} !important;
    transition-duration: 150ms;
}

#panel .panel-button:focus,
#panel .panel-button:hover {
    color: ${config.fgHoverColor} !important;
    box-shadow: inset 0 0 0 100px ${config.hoverBgColor} !important;
}

#panel .panel-button:focus StLabel,
#panel .panel-button:focus .clock,
#panel .panel-button:focus StIcon,
#panel .panel-button:focus .system-status-icon,
#panel .panel-button:hover StLabel,
#panel .panel-button:hover .clock,
#panel .panel-button:hover StIcon,
#panel .panel-button:hover .system-status-icon {
    color: ${config.fgHoverColor} !important;
}

#panel .panel-button:active,
#panel .panel-button:checked,
#panel .panel-button:overview {
    color: ${config.activeFgColor} !important;
    box-shadow: inset 0 0 0 100px ${config.activeBgColor} !important;
}

#panel .panel-button:active StLabel,
#panel .panel-button:active .clock,
#panel .panel-button:active StIcon,
#panel .panel-button:active .system-status-icon,
#panel .panel-button:checked StLabel,
#panel .panel-button:checked .clock,
#panel .panel-button:checked .system-status-icon,
#panel .panel-button:overview StLabel,
#panel .panel-button:overview .clock,
#panel .panel-button:overview StIcon,
#panel .panel-button:overview .system-status-icon {
    color: ${config.activeFgColor} !important;
}

#panel .panel-button:active:hover,
#panel .panel-button:checked:hover {
    color: ${config.activeFgColor} !important;
    box-shadow: inset 0 0 0 100px ${config.activeHoverBgColor} !important;
}

/* --- Clock Display --- */
#panel .panel-button.clock-display {
    border-radius: ${config.cornerVal}px !important;
}

#panel .panel-button.clock-display .clock {
    border-radius: ${config.cornerVal}px !important;
    transition-duration: 150ms;
}

#panel .panel-button.clock-display:hover .clock,
#panel .panel-button.clock-display:focus .clock {
    box-shadow: inset 0 0 0 100px ${config.hoverBgColor} !important;
}

#panel .panel-button.clock-display:active .clock,
#panel .panel-button.clock-display:checked .clock {
    box-shadow: inset 0 0 0 100px ${config.activeBgColor} !important;
}

/* --- Activities Indicator & Workspace Dots --- */
#panel .panel-button#panelActivities .workspace-dot {
    border-radius: ${config.dotRadius}px !important;
    min-width: 0.5455em;
    min-height: 0.5455em;
    background-color: ${config.fgColor} !important;
    transition-duration: 150ms;
}

#panel .panel-button#panelActivities:hover .workspace-dot {
    background-color: ${config.fgHoverColor} !important;
}

#panel .panel-button#panelActivities:active .workspace-dot,
#panel .panel-button#panelActivities:checked .workspace-dot {
    background-color: ${config.activeFgColor} !important;
}

/* --- Recording & Sharing Indicators --- */
#panel .panel-button.screen-recording-indicator,
#panel .panel-button.screen-sharing-indicator {
    border-radius: ${config.cornerVal}px !important;
}

/* ===================================================================
 * Popovers & Windows: Quick Settings, Calendar / Message Tray, Menus
 * =================================================================== */

/* Main Popover Windows & Menus Containers */
.popup-menu-content,
.candidate-popup-content,
.datemenu-popover,
.quick-settings {
    background-color: ${config.popupBgColor} !important;
    border: 1px solid ${config.popupBorderColor} !important;
    box-shadow: ${config.popupShadow} !important;
    border-radius: ${config.cornerVal}px !important;
    color: ${config.popupFgColor} !important;
}

#calendarArea {
    background-color: transparent !important;
}

.popup-menu {
    color: ${config.popupFgColor} !important;
}

.popup-sub-menu {
    border-radius: ${config.cornerVal}px !important;
    border: 1px solid ${config.popupCardBorderColor} !important;
    background-color: ${config.popupCardBgColor} !important;
}

/* ===================================================================
 * Modal Dialogs (End Session: Log Out, Power Off, Restart, Polkit)
 * =================================================================== */
.modal-dialog {
    border-radius: ${config.cornerVal}px !important;
    background-color: ${config.popupBgColor} !important;
    border: 1px solid ${config.popupBorderColor} !important;
    box-shadow: ${config.popupShadow} !important;
    color: ${config.popupFgColor} !important;
}

.modal-dialog .message-dialog-title,
.modal-dialog .dialog-list .dialog-list-title,
.modal-dialog .dialog-list .dialog-list-box .dialog-list-item .dialog-list-item-title,
.modal-dialog .check-box StLabel {
    color: ${config.popupFgColor} !important;
}

.modal-dialog .message-dialog-description,
.modal-dialog .dialog-list .dialog-list-box .dialog-list-item .dialog-list-item-description,
.modal-dialog .dialog-list .dialog-list-box .dialog-list-item .dialog-list-item-title-description,
.modal-dialog .run-dialog-description {
    color: ${config.popupFgDimColor} !important;
}

.end-session-dialog .end-session-dialog-battery-warning,
.end-session-dialog .dialog-list-title,
.prompt-dialog .prompt-dialog-error-label,
.prompt-dialog .prompt-dialog-info-label,
.prompt-dialog .prompt-dialog-null-label {
    border-radius: ${config.cornerVal}px !important;
}

.modal-dialog .check-box StIcon {
    border-radius: ${Math.min(config.cornerVal, 4)}px !important;
    border-color: ${config.popupBorderColor} !important;
}

.modal-dialog .check-box:checked StIcon {
    background-color: ${config.activeBgColor} !important;
    border-color: ${config.activeBgColor} !important;
    color: ${config.activeFgColor} !important;
}

.modal-dialog StEntry {
    border-radius: ${config.cornerVal}px !important;
    background-color: ${config.popupCardBgColor} !important;
    border: 1px solid ${config.popupCardBorderColor} !important;
    color: ${config.popupFgColor} !important;
}

.modal-dialog StEntry:focus {
    border-color: ${config.activeBgColor} !important;
    box-shadow: inset 0 0 0 1px ${config.activeBgColor} !important;
    color: ${config.popupFgColor} !important;
}

/* Primary Action Buttons ("Log Out", "Power Off", "Restart", "Boot Options") */
.modal-dialog .modal-dialog-button-box .modal-dialog-button {
    background-color: ${config.activeBgColor} !important;
    border: 1px solid ${config.activeBgColor} !important;
    color: ${config.activeFgColor} !important;
    border-radius: ${config.cornerVal}px !important;
    box-shadow: none !important;
    transition-duration: 150ms;
}

.modal-dialog .modal-dialog-button-box .modal-dialog-button StLabel,
.modal-dialog .modal-dialog-button-box .modal-dialog-button StIcon {
    color: inherit !important;
}

.modal-dialog .modal-dialog-button-box .modal-dialog-button:focus {
    background-color: ${config.activeBgColor} !important;
    border-color: ${config.activeFgColor} !important;
    color: ${config.activeFgColor} !important;
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.65) !important;
}

.modal-dialog .modal-dialog-button-box .modal-dialog-button:hover,
.modal-dialog .modal-dialog-button-box .modal-dialog-button:focus:hover {
    background-color: ${config.activeHoverBgColor} !important;
    border-color: ${config.activeHoverBgColor} !important;
    color: ${config.activeFgColor} !important;
    box-shadow: none !important;
}

.modal-dialog .modal-dialog-button-box .modal-dialog-button:active,
.modal-dialog .modal-dialog-button-box .modal-dialog-button:active:hover,
.modal-dialog .modal-dialog-button-box .modal-dialog-button:active:focus,
.modal-dialog .modal-dialog-button-box .modal-dialog-button:checked,
.modal-dialog .modal-dialog-button-box .modal-dialog-button:checked:hover,
.modal-dialog .modal-dialog-button-box .modal-dialog-button:checked:active {
    background-color: ${config.activePressedBgColor} !important;
    border-color: ${config.activePressedBgColor} !important;
    color: ${config.activeFgColor} !important;
    box-shadow: none !important;
}

.modal-dialog .modal-dialog-button-box .modal-dialog-button:insensitive {
    background-color: ${config.dialogPrimaryInsensitiveBgColor} !important;
    border-color: transparent !important;
    color: rgba(255, 255, 255, 0.55) !important;
    box-shadow: none !important;
}

/* Secondary / Cancel Button ("Anuluj") - Toned / Semi-Transparent Accent */
.modal-dialog .modal-dialog-button-box .modal-dialog-button:first-child {
    background-color: ${config.dialogSecondaryBgColor} !important;
    border: 1px solid ${config.dialogSecondaryBorderColor} !important;
    color: ${config.dialogSecondaryFgColor} !important;
    box-shadow: none !important;
}

.modal-dialog .modal-dialog-button-box .modal-dialog-button:first-child:focus {
    background-color: ${config.dialogSecondaryBgColor} !important;
    border-color: ${config.activeBgColor} !important;
    color: ${config.dialogSecondaryFgColor} !important;
    box-shadow: inset 0 0 0 1px ${config.dialogSecondaryHoverBorderColor} !important;
}

.modal-dialog .modal-dialog-button-box .modal-dialog-button:first-child:hover,
.modal-dialog .modal-dialog-button-box .modal-dialog-button:first-child:focus:hover {
    background-color: ${config.dialogSecondaryHoverBgColor} !important;
    border-color: ${config.dialogSecondaryHoverBorderColor} !important;
    color: ${config.dialogSecondaryFgColor} !important;
    box-shadow: none !important;
}

.modal-dialog .modal-dialog-button-box .modal-dialog-button:first-child:active,
.modal-dialog .modal-dialog-button-box .modal-dialog-button:first-child:active:hover,
.modal-dialog .modal-dialog-button-box .modal-dialog-button:first-child:active:focus,
.modal-dialog .modal-dialog-button-box .modal-dialog-button:first-child:checked,
.modal-dialog .modal-dialog-button-box .modal-dialog-button:first-child:checked:hover,
.modal-dialog .modal-dialog-button-box .modal-dialog-button:first-child:checked:active {
    background-color: ${config.dialogSecondaryActiveBgColor} !important;
    border-color: ${config.activeBgColor} !important;
    color: ${config.activeFgColor} !important;
    box-shadow: none !important;
}

.modal-dialog .modal-dialog-button-box .modal-dialog-button:first-child:insensitive {
    background-color: ${config.dialogSecondaryInsensitiveBgColor} !important;
    border-color: ${config.dialogSecondaryInsensitiveBorderColor} !important;
    color: ${config.popupFgDimColor} !important;
    box-shadow: none !important;
}

/* Single-Button Modal Dialogs ("OK" / "Zamknij") - Keep Full Accent */
.modal-dialog .modal-dialog-button-box .modal-dialog-button:first-child:last-child {
    background-color: ${config.activeBgColor} !important;
    border: 1px solid ${config.activeBgColor} !important;
    color: ${config.activeFgColor} !important;
    box-shadow: none !important;
}

.modal-dialog .modal-dialog-button-box .modal-dialog-button:first-child:last-child:focus {
    background-color: ${config.activeBgColor} !important;
    border-color: ${config.activeFgColor} !important;
    color: ${config.activeFgColor} !important;
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.65) !important;
}

.modal-dialog .modal-dialog-button-box .modal-dialog-button:first-child:last-child:hover,
.modal-dialog .modal-dialog-button-box .modal-dialog-button:first-child:last-child:focus:hover {
    background-color: ${config.activeHoverBgColor} !important;
    border-color: ${config.activeHoverBgColor} !important;
    color: ${config.activeFgColor} !important;
    box-shadow: none !important;
}

.modal-dialog .modal-dialog-button-box .modal-dialog-button:first-child:last-child:active,
.modal-dialog .modal-dialog-button-box .modal-dialog-button:first-child:last-child:active:hover,
.modal-dialog .modal-dialog-button-box .modal-dialog-button:first-child:last-child:active:focus {
    background-color: ${config.activePressedBgColor} !important;
    border-color: ${config.activePressedBgColor} !important;
    color: ${config.activeFgColor} !important;
    box-shadow: none !important;
}

/* ===================================================================
 * Quick Settings / System Menu
 * =================================================================== */

/* Quick Toggle Buttons (Tiles) */
.quick-toggle,
.quick-toggle-has-menu,
.quick-toggle.button {
    background-color: ${config.popupCardBgColor} !important;
    border: 1px solid ${config.popupCardBorderColor} !important;
    color: ${config.popupFgColor} !important;
    border-radius: ${config.cornerVal}px !important;
    transition-duration: 150ms;
}

.quick-toggle:hover,
.quick-toggle-has-menu:hover {
    background-color: ${config.popupCardHoverBgColor} !important;
    border-color: ${config.isDark ? 'rgba(255, 255, 255, 0.28)' : 'rgba(0, 0, 0, 0.22)'} !important;
    color: ${config.popupFgColor} !important;
}

.quick-toggle:checked,
.quick-toggle-has-menu:checked,
.quick-toggle.button:checked {
    background-color: ${config.activeBgColor} !important;
    border-color: ${config.activeBgColor} !important;
    color: ${config.activeFgColor} !important;
}

.quick-toggle:checked:hover,
.quick-toggle-has-menu:checked:hover {
    background-color: ${config.activeHoverBgColor} !important;
    border-color: ${config.activeHoverBgColor} !important;
    color: ${config.activeFgColor} !important;
}

/* Quick Toggle Labels & Icons */
.quick-toggle .quick-toggle-title,
.quick-toggle StLabel {
    color: ${config.popupFgColor} !important;
    font-weight: bold;
}

.quick-toggle .quick-toggle-subtitle {
    color: ${config.popupFgDimColor} !important;
}

.quick-toggle .quick-toggle-icon,
.quick-toggle StIcon {
    color: ${config.popupFgColor} !important;
}

.quick-toggle:checked .quick-toggle-title,
.quick-toggle:checked StLabel,
.quick-toggle:checked .quick-toggle-icon,
.quick-toggle:checked StIcon {
    color: ${config.activeFgColor} !important;
}

.quick-toggle:checked .quick-toggle-subtitle {
    color: rgba(255, 255, 255, 0.85) !important;
}

/* Split Toggle Corners & Menu Buttons */
.quick-toggle-has-menu .quick-toggle:ltr {
    border-radius: ${config.cornerVal}px 0 0 ${config.cornerVal}px !important;
}

.quick-toggle-has-menu .quick-toggle:rtl {
    border-radius: 0 ${config.cornerVal}px ${config.cornerVal}px 0 !important;
}

.quick-toggle-has-menu .quick-toggle:ltr:last-child,
.quick-toggle-has-menu .quick-toggle:rtl:last-child {
    border-radius: ${config.cornerVal}px !important;
}

.quick-toggle-has-menu .quick-toggle-menu-button {
    background-color: ${config.popupCardBgColor} !important;
    border: 1px solid ${config.popupCardBorderColor} !important;
    border-left: none !important;
    color: ${config.popupFgColor} !important;
    transition-duration: 150ms;
}

.quick-toggle-has-menu .quick-toggle-menu-button:rtl {
    border-left: 1px solid ${config.popupCardBorderColor} !important;
    border-right: none !important;
}

.quick-toggle-has-menu .quick-toggle-menu-button:hover {
    background-color: ${config.popupCardHoverBgColor} !important;
    border-color: ${config.isDark ? 'rgba(255, 255, 255, 0.28)' : 'rgba(0, 0, 0, 0.22)'} !important;
    color: ${config.popupFgColor} !important;
}

.quick-toggle-has-menu .quick-toggle-menu-button:checked {
    background-color: ${config.activeBgColor} !important;
    border-color: ${config.activeBgColor} !important;
    color: ${config.activeFgColor} !important;
}

.quick-toggle-has-menu .quick-toggle-menu-button:checked:hover {
    background-color: ${config.activeHoverBgColor} !important;
    border-color: ${config.activeHoverBgColor} !important;
    color: ${config.activeFgColor} !important;
}

.quick-toggle-has-menu .quick-toggle-menu-button:ltr {
    border-radius: 0 ${config.cornerVal}px ${config.cornerVal}px 0 !important;
}

.quick-toggle-has-menu .quick-toggle-menu-button:rtl {
    border-radius: ${config.cornerVal}px 0 0 ${config.cornerVal}px !important;
}

.quick-toggle-has-menu .quick-toggle-menu-button StIcon {
    color: inherit !important;
}

.quick-toggle-has-menu .quick-toggle-separator {
    background-color: ${config.popupSeparatorColor} !important;
}

/* Quick Toggle Submenus (e.g. WiFi / Bluetooth lists) */
.quick-toggle-menu {
    background-color: ${config.popupCardBgColor} !important;
    color: ${config.popupFgColor} !important;
    border-radius: ${config.cornerVal}px !important;
    border: 1px solid ${config.popupCardBorderColor} !important;
}

.quick-toggle-menu .header .title {
    color: ${config.popupFgColor} !important;
    font-weight: bold;
}

.quick-toggle-menu .header .subtitle {
    color: ${config.popupFgDimColor} !important;
}

.quick-toggle-menu .header .icon {
    border-radius: ${config.cornerVal}px !important;
    border: 1px solid ${config.popupCardBorderColor} !important;
    background-color: ${config.popupCardHoverBgColor} !important;
    color: ${config.popupFgColor} !important;
}

.quick-toggle-menu .header .icon.active {
    background-color: ${config.activeBgColor} !important;
    border-color: ${config.activeBgColor} !important;
    color: ${config.activeFgColor} !important;
}

.quick-toggle-menu .device-subtitle {
    color: ${config.popupFgDimColor} !important;
}

/* System Action Buttons (Power, Lock, Settings, Screenshot) */
.quick-settings .icon-button,
.quick-settings .button,
.quick-settings-system-item .icon-button,
.quick-settings-system-item .button {
    background-color: ${config.popupCardBgColor} !important;
    border: 1px solid ${config.popupCardBorderColor} !important;
    color: ${config.popupFgColor} !important;
    border-radius: ${config.cornerVal}px !important;
    transition-duration: 150ms;
}

.quick-settings .icon-button:hover,
.quick-settings .button:hover,
.quick-settings-system-item .icon-button:hover,
.quick-settings-system-item .button:hover {
    background-color: ${config.popupCardHoverBgColor} !important;
    border-color: ${config.isDark ? 'rgba(255, 255, 255, 0.28)' : 'rgba(0, 0, 0, 0.22)'} !important;
    color: ${config.popupFgColor} !important;
}

.quick-settings .icon-button:active,
.quick-settings .button:active,
.quick-settings-system-item .icon-button:active,
.quick-settings-system-item .button:active {
    background-color: ${config.activeBgColor} !important;
    border-color: ${config.activeBgColor} !important;
    color: ${config.activeFgColor} !important;
}

.quick-settings .icon-button StIcon,
.quick-settings .button StIcon,
.quick-settings-system-item .icon-button StIcon,
.quick-settings-system-item .button StIcon {
    color: ${config.popupFgColor} !important;
}

/* Quick Sliders (Volume, Microphone, Brightness) - Transparent & Borderless */
.quick-slider,
.quick-slider > StBoxLayout,
.quick-slider .slider-bin,
.quick-slider .slider-bin:hover,
.quick-slider .slider-bin:focus,
.quick-slider .slider-bin:active,
.quick-toggle-menu .slider-bin,
.quick-toggle-menu .slider-bin:hover,
.quick-toggle-menu .slider-bin:focus {
    background-color: transparent !important;
    border: none !important;
    box-shadow: none !important;
    color: ${config.popupFgColor} !important;
}

.quick-settings .quick-slider .icon-button,
.quick-settings .quick-slider .icon-button:insensitive,
.quick-slider .icon-button,
.quick-slider .icon-button:insensitive {
    background-color: transparent !important;
    border: none !important;
    box-shadow: none !important;
    border-radius: ${config.cornerVal}px !important;
    color: ${config.popupFgColor} !important;
}

.quick-settings .quick-slider .icon-button:hover,
.quick-settings .quick-slider .icon-button:focus,
.quick-slider .icon-button:hover,
.quick-slider .icon-button:focus {
    background-color: ${config.popupCardHoverBgColor} !important;
    border: none !important;
    box-shadow: none !important;
    color: ${config.popupFgColor} !important;
}

.quick-settings .quick-slider .icon-button:active,
.quick-slider .icon-button:active {
    background-color: ${config.activeBgColor} !important;
    border: none !important;
    box-shadow: none !important;
    color: ${config.activeFgColor} !important;
}

.quick-settings .quick-slider .icon-button StIcon,
.quick-slider .icon-button StIcon {
    color: ${config.popupFgColor} !important;
}

.quick-settings .quick-slider .icon-button:active StIcon,
.quick-slider .icon-button:active StIcon {
    color: ${config.activeFgColor} !important;
}

.quick-slider .slider,
.quick-toggle-menu .slider {
    background-color: transparent !important;
    border: none !important;
    box-shadow: none !important;
    color: ${config.popupFgColor} !important;
    -barlevel-background-color: ${config.popupSeparatorColor} !important;
    -barlevel-active-background-color: ${config.activeBgColor} !important;
}

/* Background Apps Section */
.background-app-item,
.background-apps-quick-toggle {
    background-color: ${config.popupCardBgColor} !important;
    border: 1px solid ${config.popupCardBorderColor} !important;
    color: ${config.popupFgColor} !important;
    border-radius: ${config.cornerVal}px !important;
}

.background-app-item .title {
    color: ${config.popupFgColor} !important;
}

.background-app-item .subtitle {
    color: ${config.popupFgDimColor} !important;
}

/* ===================================================================
 * Calendar & Message Tray (DateMenu)
 * =================================================================== */

/* Main Calendar Widget & Today Header */
.calendar,
.calendar:hover,
.calendar:focus,
.calendar:active {
    background-color: transparent !important;
    box-shadow: none !important;
    color: ${config.popupFgColor} !important;
    border-radius: ${config.cornerVal}px !important;
}

.datemenu-today-button {
    background-color: transparent !important;
    box-shadow: none !important;
    color: ${config.popupFgColor} !important;
    border-radius: ${config.cornerVal}px !important;
}

.datemenu-today-button:hover,
.datemenu-today-button:focus,
.datemenu-today-button:active {
    background-color: ${config.popupCardHoverBgColor} !important;
}

.datemenu-today-button .date-label,
.datemenu-today-button .day-label {
    color: ${config.popupFgColor} !important;
}

.calendar .calendar-month-header .calendar-month-label,
.calendar .calendar-month-header .calendar-month-label:hover,
.calendar .calendar-month-header .calendar-month-label:focus,
.calendar .calendar-month-header .calendar-month-label:active,
.calendar .calendar-month-header .calendar-month-label:selected,
.calendar .calendar-month-header .calendar-month-label:checked {
    background-color: ${config.calendarAccentBgColor} !important;
    color: ${config.popupFgColor} !important;
    border-radius: ${config.cornerVal}px !important;
    font-weight: bold;
    box-shadow: none !important;
}

.calendar .calendar-month-header .pager-button {
    background-color: ${config.calendarAccentBgColor} !important;
    color: ${config.popupFgColor} !important;
    border-radius: ${config.cornerVal}px !important;
    box-shadow: none !important;
}

.calendar .calendar-month-header .pager-button:hover,
.calendar .calendar-month-header .pager-button:focus {
    background-color: ${config.calendarAccentHoverBgColor} !important;
    color: ${config.popupFgColor} !important;
}

.calendar .calendar-month-header .pager-button:active {
    background-color: ${config.activeBgColor} !important;
    color: ${config.activeFgColor} !important;
}

.calendar .calendar-month-header .pager-button StIcon {
    color: ${config.popupFgColor} !important;
}

.calendar .calendar-month-header .pager-button:active StIcon {
    color: ${config.activeFgColor} !important;
}

/* Days of Week Header (Mo, Tu, We...) */
.calendar .calendar-day-heading,
.calendar .calendar-day-heading:hover,
.calendar .calendar-day-heading:focus,
.calendar .calendar-day-heading:active,
.calendar .calendar-day-heading:selected,
.calendar .calendar-day-heading:checked {
    background-color: ${config.calendarAccentBgColor} !important;
    color: ${config.popupFgColor} !important;
    border-radius: ${config.cornerVal}px !important;
    font-weight: bold;
    box-shadow: none !important;
}

/* Calendar Days Grid */
.calendar .calendar-day {
    color: ${config.popupFgColor} !important;
    border-radius: ${config.cornerVal}px !important;
    background-color: transparent !important;
    box-shadow: none !important;
    transition-duration: 100ms;
}

.calendar .calendar-day.calendar-other-month,
.calendar .calendar-day.calendar-day-other-month,
.calendar .calendar-day:insensitive {
    color: ${config.popupFgDimColor} !important;
    opacity: 0.55;
}

.calendar .calendar-day:hover {
    background-color: ${config.popupCardHoverBgColor} !important;
    color: ${config.popupFgColor} !important;
}

.calendar .calendar-day:selected,
.calendar .calendar-day:active,
.calendar .calendar-day:focus {
    background-color: ${config.activeBgColor} !important;
    color: ${config.activeFgColor} !important;
    opacity: 1;
}

.calendar .calendar-today {
    background-color: ${config.activeBgColor} !important;
    color: ${config.activeFgColor} !important;
    font-weight: bold;
    border-radius: ${config.cornerVal}px !important;
    opacity: 1;
}

.calendar .calendar-week-number {
    border-radius: ${Math.min(config.cornerVal, 4)}px !important;
    color: ${config.popupFgDimColor} !important;
    background-color: ${config.popupCardBgColor} !important;
}

/* Side Sections: Events, World Clocks, Weather Cards */
.events-button,
.world-clocks-button,
.weather-button {
    background-color: ${config.popupCardBgColor} !important;
    border: 1px solid ${config.popupCardBorderColor} !important;
    border-radius: ${config.cornerVal}px !important;
    color: ${config.popupFgColor} !important;
}

.events-button:hover,
.world-clocks-button:hover,
.weather-button:hover {
    background-color: ${config.popupCardHoverBgColor} !important;
}

.events-button .events-title,
.world-clocks-button .world-clocks-header,
.weather-button .weather-header {
    color: ${config.popupFgColor} !important;
    font-weight: bold;
}

.events-button .event-summary,
.world-clocks-button .world-clocks-city,
.world-clocks-button .world-clocks-time,
.weather-button .weather-forecast-temp {
    color: ${config.popupFgColor} !important;
}

.events-button .event-time,
.world-clocks-button .world-clocks-timezone,
.weather-button .weather-header.location,
.weather-button .weather-forecast-time {
    color: ${config.popupFgDimColor} !important;
}

.weather-button .weather-forecast-icon,
.events-button StIcon,
.world-clocks-button StIcon {
    color: ${config.popupFgColor} !important;
}

.events-button .events-box .events-list .event-box {
    border-radius: ${config.cornerVal}px !important;
}

/* ===================================================================
 * Message Tray & Notification Cards
 * =================================================================== */
.message-list {
    border-color: ${config.popupSeparatorColor} !important;
}

.message-list .message-list-placeholder,
.message-list .message-list-placeholder > StIcon {
    color: ${config.popupFgDimColor} !important;
}

.message-list-controls .message-list-clear-button {
    background-color: ${config.messageCardBgColor} !important;
    border: 1px solid ${config.messageCardBorderColor} !important;
    color: ${config.popupFgColor} !important;
    border-radius: ${config.cornerVal}px !important;
}

.message-list-controls .message-list-clear-button:hover {
    background-color: ${config.messageCardHoverBgColor} !important;
    color: ${config.popupFgColor} !important;
}

/* Notification Cards (Desktop Banner and DateMenu Message List) */
.message,
.message-view .message,
.media-message,
.notification-banner {
    background-color: ${config.messageCardBgColor} !important;
    border: 1px solid ${config.messageCardBorderColor} !important;
    border-radius: ${config.cornerVal}px !important;
    color: ${config.popupFgColor} !important;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25) !important;
}

.message:hover,
.message-view .message:hover,
.media-message:hover,
.notification-banner:hover {
    background-color: ${config.messageCardHoverBgColor} !important;
}

/* Notification Stacking Support (prevents ghost/overlapping text in collapsed groups) */
.message:second-in-stack {
    background-color: ${config.messageCardSecondStackBgColor} !important;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.20) !important;
}

.message:lower-in-stack {
    background-color: ${config.messageCardLowerStackBgColor} !important;
    box-shadow: none !important;
    border-color: transparent !important;
}

.message:second-in-stack > *,
.message:lower-in-stack > *,
.message:second-in-stack .message-content,
.message:lower-in-stack .message-content,
.message:second-in-stack .message-header,
.message:lower-in-stack .message-header,
.message:second-in-stack .message-body,
.message:lower-in-stack .message-body,
.message:second-in-stack StLabel,
.message:lower-in-stack StLabel,
.message:second-in-stack StIcon,
.message:lower-in-stack StIcon {
    opacity: 0 !important;
    color: transparent !important;
}

.message .message-title,
.message .message-source-title,
.message-notification-group .message-group-title {
    color: ${config.popupFgColor} !important;
    font-weight: bold;
}

.message .message-body,
.message .message-body StLabel {
    color: ${config.popupFgColor} !important;
}

.message .message-header .event-time {
    color: ${config.popupFgDimColor} !important;
}

.message .message-header .message-expand-button,
.message .message-header .message-close-button,
.message-notification-group .message-collapse-button,
.message .message-media-control {
    color: ${config.popupFgColor} !important;
    border-radius: ${config.cornerVal}px !important;
}

.message .message-header .message-expand-button:hover,
.message .message-header .message-close-button:hover,
.message-notification-group .message-collapse-button:hover,
.message .message-media-control:hover {
    background-color: ${config.popupCardHoverBgColor} !important;
    color: ${config.popupFgColor} !important;
}

.notification-button,
.message .message-action-bin * {
    background-color: ${config.popupCardBgColor} !important;
    color: ${config.popupFgColor} !important;
    border-radius: ${config.cornerVal}px !important;
}

.notification-button:hover,
.message .message-action-bin *:hover {
    background-color: ${config.popupCardHoverBgColor} !important;
    color: ${config.popupFgColor} !important;
}

/* ===================================================================
 * General Popup Menus (from panel or submenus)
 * =================================================================== */
.popup-menu-item {
    color: ${config.popupFgColor} !important;
    border-radius: ${Math.min(config.cornerVal, 4)}px !important;
}

.popup-menu-item:hover,
.popup-menu-item:focus,
.popup-menu-item:selected {
    background-color: ${config.popupCardHoverBgColor} !important;
    color: ${config.popupFgColor} !important;
}

.popup-menu-item:active,
.popup-menu-item:checked {
    background-color: ${config.activeBgColor} !important;
    color: ${config.activeFgColor} !important;
}

.popup-menu-item StIcon,
.popup-menu-item StLabel {
    color: inherit !important;
}

.popup-separator-menu-item .separator {
    background-color: ${config.popupSeparatorColor} !important;
}
${options.forceIconShape !== false ? (() => {
    const rawOpacity = options.iconOpacity !== undefined
        ? options.iconOpacity
        : (options.opacity !== undefined ? options.opacity : 0);
    const transparency = Math.max(0, Math.min(100, rawOpacity));
    const opacityVal = (1.0 - (transparency / 100)).toFixed(2);
    const accentStrength = Math.max(0, Math.min(100, options.accentStrength ?? 15));
    const isDark = options.variant === 'dark';
    const accentHex = config.activeBgColor;
    const accentWithAlpha = transparency === 0
        ? accentHex
        : (transparency === 100 ? 'transparent' : hexToRgba(accentHex, parseFloat(opacityVal)));

    const iconBaseHex = isDark ? '#1e1e22' : '#ffffff';
    const effAlpha = transparency === 100 ? 0 : (transparency === 0 ? 1.0 : parseFloat(opacityVal));
    const iconShellBgColor = transparency === 100
        ? 'transparent'
        : mixColors(accentHex, iconBaseHex, accentStrength, effAlpha);

    const iconHoverBaseHex = isDark ? '#26262c' : '#f0f0f4';
    const hoverAlpha = transparency === 100 ? 0.15 : (transparency === 0 ? 1.0 : Math.min(1.0, parseFloat(opacityVal) + 0.15));
    const iconShellHoverBgColor = mixColors(accentHex, iconHoverBaseHex, Math.min(100, accentStrength + 10), hoverAlpha);

    const iconShapeSize = Math.max(36, Math.min(96, options.iconShapeSize ?? 52));
    const iconScale = Math.max(50, Math.min(90, options.iconShapeScale ?? 68));
    const iconBorderWidth = Math.max(0, Math.min(5, options.iconBorderWidth ?? 1));
    const iconPixelSize = Math.max(16, Math.min(84, Math.round(iconShapeSize * (iconScale / 100))));

    const iconBorderColor = isDark ? '#7a7a82' : '#484850';
    const iconBorderHoverColor = isDark ? '#9e9ea6' : '#2e2e36';
    const iconBorderCss = iconBorderWidth === 0
        ? 'border: none !important;'
        : `border: ${iconBorderWidth}px solid ${iconBorderColor} !important;`;
    const iconBorderHoverCss = iconBorderWidth === 0
        ? 'border: none !important;'
        : `border-color: ${iconBorderHoverColor} !important;`;
    const iconBorderActiveCss = iconBorderWidth === 0
        ? 'border: none !important;'
        : `border-color: ${iconBorderColor} !important;`;

    const iconCornerRadius = options.iconSquircleRadius !== undefined
        ? Math.max(3, Math.round(options.iconSquircleRadius * (iconShapeSize / 128)))
        : Math.max(3, Math.round(iconShapeSize * 0.22));

    let isThemeAdwitaSquare = options.iconTheme === 'adwita-square';
    if (!isThemeAdwitaSquare) {
        try {
            const ifaceSettings = new Gio.Settings({ schema_id: 'org.gnome.desktop.interface' });
            isThemeAdwitaSquare = ifaceSettings.get_string('icon-theme') === 'adwita-square';
        } catch (_) {}
    }

    const containerBorderCss = isThemeAdwitaSquare
        ? 'border: none !important;'
        : iconBorderCss;
    const containerBgCss = isThemeAdwitaSquare
        ? 'background-color: transparent !important;'
        : `background-color: ${iconShellBgColor} !important;`;
    const containerShadowCss = isThemeAdwitaSquare
        ? 'box-shadow: none !important;'
        : `box-shadow: ${isDark ? '0 2px 8px rgba(0, 0, 0, 0.45)' : '0 2px 8px rgba(0, 0, 0, 0.12)'} !important;`;
    const containerHoverBorderCss = isThemeAdwitaSquare
        ? 'border: none !important;'
        : iconBorderHoverCss;
    const containerHoverBgCss = isThemeAdwitaSquare
        ? (isDark ? 'background-color: rgba(255, 255, 255, 0.08) !important;' : 'background-color: rgba(0, 0, 0, 0.06) !important;')
        : `background-color: ${iconShellHoverBgColor} !important;`;
    const containerHoverShadowCss = isThemeAdwitaSquare
        ? (isDark ? 'box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35) !important;' : 'box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;')
        : `box-shadow: ${isDark ? '0 4px 12px rgba(0, 0, 0, 0.60)' : '0 4px 12px rgba(0, 0, 0, 0.25)'} !important;`;

    const effectiveIconSize = isThemeAdwitaSquare ? iconShapeSize : iconPixelSize;

    return `
/* ===================================================================
 * Force Icon Shape (Adaptive Square Style)
 * =================================================================== */

/* 1. App Grid (All Apps), Folder Dialogs, and Search Results */
.icon-grid .overview-tile .overview-icon StBin,
.icon-grid .overview-icon.overview-icon-with-label StBin,
.app-folder-dialog .overview-tile .overview-icon StBin,
.app-folder .overview-icon StBin,
.grid-search-result .overview-icon StBin {
    border-radius: ${iconCornerRadius}px !important;
    ${containerBorderCss}
    ${containerBgCss}
    ${containerShadowCss}
    width: ${iconShapeSize}px !important;
    height: ${iconShapeSize}px !important;
    padding: 0 !important;
    margin-left: auto !important;
    margin-right: auto !important;
    transition-duration: 150ms;
}

.icon-grid .overview-tile:hover .overview-icon StBin,
.app-folder-dialog .overview-tile:hover .overview-icon StBin,
.app-folder:hover .overview-icon StBin,
.grid-search-result:hover .overview-icon StBin {
    ${containerHoverBorderCss}
    ${containerHoverShadowCss}
    ${containerHoverBgCss}
}

.icon-grid .overview-tile:active .overview-icon StBin,
.app-folder-dialog .overview-tile:active .overview-icon StBin,
.grid-search-result:active .overview-icon StBin {
    ${containerHoverBorderCss}
    background-color: ${config.activeBgColor} !important;
}

/* Inner Icon Scaling & Centering inside App Grid Tiles */
.icon-grid .overview-tile .overview-icon StBin StIcon,
.icon-grid .overview-icon.overview-icon-with-label StBin StIcon,
.app-folder-dialog .overview-tile .overview-icon StBin StIcon,
.app-folder .overview-icon StBin StIcon,
.grid-search-result .overview-icon StBin StIcon {
    icon-size: ${effectiveIconSize}px !important;
    width: ${effectiveIconSize}px !important;
    height: ${effectiveIconSize}px !important;
    margin: auto !important;
}

/* App Folder Tile: make outer tile transparent so only the square icon card shows */
.app-folder {
    background-color: transparent !important;
    box-shadow: none !important;
}

/* App Folder mini-icons inside the preview grid shouldn't have nested borders */
.app-folder .overview-icon StBin StBin {
    border: none !important;
    background-color: transparent !important;
    box-shadow: none !important;
    padding: 0 !important;
    width: auto !important;
    height: auto !important;
}

/* Ensure the outer tile hover background doesn't collide with the square icon card */
.icon-grid .overview-tile,
.app-folder-dialog .overview-tile,
.grid-search-result {
    border-radius: ${config.cornerVal}px !important;
}

.icon-grid .overview-tile:hover,
.app-folder-dialog .overview-tile:hover,
.grid-search-result:hover {
    background-color: transparent !important;
}

/* 2. Dash & Dock Icons */
#dash .overview-icon,
#dash .dash-item-container .overview-tile .overview-icon,
#dash .dash-item-container .show-apps .overview-icon,
#dash .dash-item-container .grid-search-result .overview-icon,
#dashtodockContainer .overview-icon,
#dashtodockContainer .dash-item-container .overview-tile .overview-icon,
#dashtodockContainer .dash-item-container .show-apps .overview-icon,
#dashtodockContainer .app-well-app .overview-icon,
#dashtodockContainer .show-apps .overview-icon {
    border-radius: ${iconCornerRadius}px !important;
    ${containerBorderCss}
    ${containerBgCss}
    ${containerShadowCss}
    width: ${iconShapeSize}px !important;
    height: ${iconShapeSize}px !important;
    padding: 0 !important;
    margin-left: auto !important;
    margin-right: auto !important;
    transition-duration: 150ms;
}

#dash .overview-tile:hover .overview-icon,
#dash .show-apps:hover .overview-icon,
#dash .overview-icon:hover,
#dashtodockContainer .app-well-app:hover .overview-icon,
#dashtodockContainer .show-apps:hover .overview-icon,
#dashtodockContainer .overview-icon:hover {
    ${containerHoverBorderCss}
    ${containerHoverShadowCss}
    ${containerHoverBgCss}
}

#dash .overview-tile:active .overview-icon,
#dash .show-apps:active .overview-icon,
#dash .overview-icon:active,
#dashtodockContainer .app-well-app:active .overview-icon,
#dashtodockContainer .show-apps:active .overview-icon,
#dashtodockContainer .overview-icon:active {
    ${containerHoverBorderCss}
    background-color: ${config.activeBgColor} !important;
}

#dash .overview-icon StBin,
#dashtodockContainer .overview-icon StBin {
    border: none !important;
    background-color: transparent !important;
    box-shadow: none !important;
    padding: 0 !important;
    width: ${iconShapeSize}px !important;
    height: ${iconShapeSize}px !important;
}

/* Inner Icon Scaling & Centering inside Dash / Dock Tiles */
#dash .overview-icon StIcon,
#dash .overview-icon StBin StIcon,
#dashtodockContainer .overview-icon StIcon,
#dashtodockContainer .overview-icon StBin StIcon {
    icon-size: ${effectiveIconSize}px !important;
    width: ${effectiveIconSize}px !important;
    height: ${effectiveIconSize}px !important;
    margin: auto !important;
}

/* 3. List search results & Alt-Tab switcher */
.list-search-result .list-search-result-title StIcon,
.switcher-list .item-box .overview-icon,
.switcher-list .item-box StIcon {
    border-radius: ${Math.min(config.cornerVal, 6)}px !important;
    ${iconBorderCss}
    background-color: ${iconShellBgColor} !important;
    padding: 4px !important;
}
`;
})() : ''}

/* ===================================================================
 * 4. Dock / Dash Integration (GNOME Dash, Dash to Dock, Ubuntu Dock)
 * =================================================================== */
#dash,
#dashtodockContainer {
    font-family: inherit;
}

#dash .dash-background,
#dashtodockContainer #dash .dash-background,
#dashtodockContainer .dash-background,
#dashtodockContainer.dashtodock #dash .dash-background,
#dashtodockContainer.opaque #dash .dash-background,
#dashtodockContainer.transparent #dash .dash-background,
#dashtodockContainer.straight-corner #dash .dash-background,
#dashtodockContainer.shrink.straight-corner #dash .dash-background {
    background-color: ${config.dockBgColor} !important;
    border-radius: ${config.dockCornerVal}px !important;
    ${config.dockBorderCss}
    box-shadow: ${config.dockShadow} !important;
    transition-duration: 200ms;
}

#dashtodockContainer #dash {
    border-radius: ${config.dockCornerVal}px !important;
}

/* Extended mode (dock pinned across edge): keep screen edges flush */
#dashtodockContainer.extended.bottom #dash .dash-background,
#dashtodockContainer.extended.top #dash .dash-background,
#dashtodockContainer.extended.left #dash .dash-background,
#dashtodockContainer.extended.right #dash .dash-background {
    border-radius: 0 !important;
}

/* Running App Indicators */
#dash .dash-item-container .app-grid-running-dot,
#dashtodockContainer .app-well-app-running-dot,
#dash .app-well-app-running-dot {
    background-color: ${config.dockRunningDotColor} !important;
    border-radius: ${Math.min(config.cornerVal, 2)}px !important;
}

#dash .dash-item-container .show-apps:hover .app-grid-running-dot,
#dash .dash-item-container .overview-tile:hover .app-grid-running-dot,
#dashtodockContainer .app-well-app:hover .app-well-app-running-dot,
StWidget.focused .app-well-app-running-dot {
    background-color: ${config.activeBgColor} !important;
}

/* Dash Tooltip / Labels */
#dash .dash-label,
.dashtodock-app-well-preview-menu-item {
    border-radius: ${config.cornerVal}px !important;
    background-color: ${config.popupBgColor} !important;
    color: ${config.popupFgColor} !important;
    border: 1px solid ${config.popupBorderColor} !important;
    box-shadow: ${config.popupShadow} !important;
}
`;
}

// ============================================================================
// SECTION: Shell Stylesheet File Cache & I/O
// I manage saving and removing the generated shell-theme.css in the user cache directory.
// ============================================================================
export function getShellCssCacheFile() {
    const cacheDir = GLib.build_filenamev([GLib.get_user_cache_dir(), 'adwita-square']);
    const dirFile = Gio.File.new_for_path(cacheDir);
    if (!dirFile.query_exists(null)) {
        dirFile.make_directory_with_parents(null);
    }
    const filePath = GLib.build_filenamev([cacheDir, 'shell-theme.css']);
    return Gio.File.new_for_path(filePath);
}

export function saveShellCss(cssContent) {
    const file = getShellCssCacheFile();
    file.replace_contents(
        cssContent,
        null,
        false,
        Gio.FileCreateFlags.REPLACE_DESTINATION,
        null
    );
    return file;
}

export function removeShellCss() {
    try {
        const file = getShellCssCacheFile();
        if (file.query_exists(null)) {
            file.delete(null);
        }
    } catch (e) {
        console.warn('[adwita-square] Error while removing shell-theme.css:', e);
    }
}
