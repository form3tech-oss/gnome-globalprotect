const St = imports.gi.St;
const Gio = imports.gi.Gio;

const ExtensionUtils = imports.misc.extensionUtils;
const Lang = imports.lang;
const GLib = imports.gi.GLib;
const Me = ExtensionUtils.getCurrentExtension();
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;

const SHOW_UI_COMMAND = "globalprotect launch-ui";

let globalProtectUILauncher;

const GlobalProtectUILauncher = new Lang.Class({
    Name: `${Me.metadata.name}`,

    _init: function() {
        let launcherName = `${Me.metadata.name} UI Launcher`;
        
        let launcherButton = new PanelMenu.Button(0.0, launcherName, false);
        
        let icon = new St.Icon({
            gicon: new Gio.ThemedIcon({name: 'network-vpn-symbolic'}),
            style_class: 'system-status-icon'
        });
        launcherButton.actor.connect('button_press_event', Lang.bind(this, this._showui, false))
        launcherButton.add_child(icon);

        Main.panel.addToStatusArea(launcherName, launcherButton);
    },

    _showui: function() {
        this._spawn(SHOW_UI_COMMAND);
    },

    _spawn: function(cmd) {
        log(`spawning command ${cmd}`);

        try {
            GLib.spawn_command_line_async(cmd);
        } catch (err) {
            logError(err);
        }
    },
});

class Extension {
    constructor() {
    }

    enable() {
        log(`enabling ${Me.metadata.name}`);
        globalProtectUILauncher = new GlobalProtectUILauncher();
    }

    disable() {
        log(`disabling ${Me.metadata.name}`);

        globalProtectUILauncher.destroy();
        globalProtectUILauncher = null;
    }
}

function init() {
    log(`initializing ${Me.metadata.name}`);
    return new Extension();
}
