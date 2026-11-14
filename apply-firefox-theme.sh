#!/usr/bin/env bash
# Adwita Square - Script applying window and tabs styling for Firefox
set -e

MOZILLA_DIR="$HOME/.mozilla/firefox"

echo "=== Adwita Square: Mozilla Firefox Integration ==="

if [ ! -d "$MOZILLA_DIR" ]; then
    echo "Directory $MOZILLA_DIR does not exist."
    echo "Launch Firefox at least once to create a default profile, then run this script again."
    exit 1
fi

# I retrieve settings from the extension (if gsettings is available)
ACCENT="teal"
VARIANT="dark"
CORNER="3"
BUTTON_SIZE="28"

if command -v gsettings >/dev/null 2>&1; then
    SCHEMA="org.gnome.shell.extensions.adwita-square"
    if gsettings list-schemas | grep -q "$SCHEMA"; then
        ACCENT=$(gsettings get "$SCHEMA" accent-color 2>/dev/null | tr -d "'" || echo "teal")
        VARIANT=$(gsettings get "$SCHEMA" theme-variant 2>/dev/null | tr -d "'" || echo "dark")
        CORNER=$(gsettings get "$SCHEMA" corner-radius 2>/dev/null || echo "3")
        BUTTON_SIZE=$(gsettings get "$SCHEMA" button-size 2>/dev/null || echo "28")
        if [ "$BUTTON_SIZE" -gt 30 ] 2>/dev/null || [ "$BUTTON_SIZE" -lt 16 ] 2>/dev/null; then
            BUTTON_SIZE="28"
        fi
    fi
fi

# I map accent color names to hex values
case "$ACCENT" in
    blue)   ACCENT_HEX="#3584e4" ;;
    teal)   ACCENT_HEX="#2190a4" ;;
    green)  ACCENT_HEX="#3a944a" ;;
    yellow) ACCENT_HEX="#c88800" ;;
    orange) ACCENT_HEX="#ed5b00" ;;
    red)    ACCENT_HEX="#e01b24" ;;
    pink)   ACCENT_HEX="#d56199" ;;
    purple) ACCENT_HEX="#9141ac" ;;
    slate)  ACCENT_HEX="#6f8396" ;;
    *)      ACCENT_HEX="#2190a4" ;;
esac

if [ "$VARIANT" = "dark" ]; then
    BG_HEX="#000000"
    TAB_BG="#1a1a1a"
    BORDER_COLOR="rgba(255, 255, 255, 0.16)"
    BTN_BG="rgba(255, 255, 255, 0.08)"
    BTN_HOVER_BORDER="rgba(255, 255, 255, 0.26)"
    BTN_HOVER="rgba(255, 255, 255, 0.15)"
    ICON_STROKE="#ffffff"
else
    BG_HEX="#ffffff"
    TAB_BG="#f0f0f0"
    BORDER_COLOR="rgba(0, 0, 0, 0.16)"
    BTN_BG="rgba(0, 0, 0, 0.05)"
    BTN_HOVER_BORDER="rgba(0, 0, 0, 0.26)"
    BTN_HOVER="rgba(0, 0, 0, 0.10)"
    ICON_STROKE="#000000"
fi

echo "Settings: Variant: $VARIANT | Accent: $ACCENT ($ACCENT_HEX) | Corner radius: ${CORNER}px | Button size: ${BUTTON_SIZE}px"

PROFILES_FOUND=0

for p in "$MOZILLA_DIR"/*; do
    if [ -d "$p" ] && ([ -f "$p/prefs.js" ] || [ -f "$p/compatibility.ini" ] || [[ "$p" == *".default"* ]] || [ -d "$p/chrome" ]); then
        PROFILES_FOUND=$((PROFILES_FOUND + 1))
        CHROME_DIR="$p/chrome"
        USER_CHROME="$CHROME_DIR/userChrome.css"
        USER_JS="$p/user.js"

        mkdir -p "$CHROME_DIR"

        cat <<EOF > "$USER_CHROME"
/* Adwita Square - Firefox userChrome.css */
/* Window controls, tabs, and toolbar styling matching Adwita Square */

:root {
    --toolbar-bgcolor: $BG_HEX !important;
    --toolbox-bgcolor: $BG_HEX !important;
    --toolbox-background-color: $BG_HEX !important;
    --toolbox-background-color-inactive: $BG_HEX !important;
    --lwt-accent-color: $BG_HEX !important;
    --lwt-accent-color-inactive: $BG_HEX !important;
    --lwt-selected-tab-background-color: $TAB_BG !important;
    --tab-selected-bgcolor: $TAB_BG !important;
    --tab-border-radius: ${CORNER}px !important;
    --arrowpanel-border-radius: ${CORNER}px !important;
    --titlebar-button-size: ${BUTTON_SIZE}px !important;
}

/* Solid top window bar (navigator-toolbox, titlebar, TabsToolbar, nav-bar) */
#navigator-toolbox,
#titlebar,
#TabsToolbar,
#toolbar-menubar,
#nav-bar,
#PersonalToolbar {
    background-color: $BG_HEX !important;
    background-image: none !important;
    color: $ICON_STROKE !important;
}

/* Square tabs and consistent spacing */
.tabbrowser-tab,
.tab-background {
    border-radius: ${CORNER}px !important;
    margin-block: 2px !important;
}

.tab-background[selected="true"] {
    background-color: $TAB_BG !important;
    border: 1px solid $ACCENT_HEX !important;
    box-shadow: none !important;
}

.tab-background:not([selected="true"]):hover {
    background-color: $BTN_BG !important;
}

/* Square URL and search address bars */
#urlbar-background,
#searchbar {
    border-radius: ${CORNER}px !important;
    border: 1px solid $BORDER_COLOR !important;
}

#urlbar[focused="true"] #urlbar-background {
    border-color: $ACCENT_HEX !important;
}

/* Square toolbar buttons */
toolbarbutton,
.toolbarbutton-1 {
    border-radius: ${CORNER}px !important;
}

toolbarbutton:hover,
.toolbarbutton-1:hover {
    background-color: $BTN_HOVER !important;
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
    width: ${BUTTON_SIZE}px !important;
    height: ${BUTTON_SIZE}px !important;
    min-width: ${BUTTON_SIZE}px !important;
    min-height: ${BUTTON_SIZE}px !important;
    box-sizing: border-box !important;
    border-radius: ${CORNER}px !important;
    border: 1px solid transparent !important;
    border-color: transparent !important;
    background-color: transparent !important;
    stroke: $ICON_STROKE !important;
    color: $ICON_STROKE !important;
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
    background-color: $BTN_HOVER !important;
    border: 1px solid $BTN_HOVER_BORDER !important;
    border-color: $BTN_HOVER_BORDER !important;
}

.titlebar-button:not(.titlebar-close):active > .toolbarbutton-icon {
    background-color: $ACCENT_HEX !important;
    border: 1px solid $ACCENT_HEX !important;
    border-color: $ACCENT_HEX !important;
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
EOF

        # I enable legacy user stylesheets in Firefox profile
        touch "$USER_JS"
        if ! grep -q "toolkit.legacyUserProfileCustomizations.stylesheets" "$USER_JS"; then
            echo 'user_pref("toolkit.legacyUserProfileCustomizations.stylesheets", true);' >> "$USER_JS"
        else
            sed -i 's/.*toolkit\.legacyUserProfileCustomizations\.stylesheets.*/user_pref("toolkit.legacyUserProfileCustomizations.stylesheets", true);/' "$USER_JS"
        fi

        echo "-> Applied style for profile: $(basename "$p")"
    fi
done

if [ "$PROFILES_FOUND" -eq 0 ]; then
    echo "No active profiles found in $MOZILLA_DIR."
    echo "Launch Firefox to create a default profile, then retry."
    exit 1
fi

echo ""
echo "Done! Restart Firefox to see the new look."
