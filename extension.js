const Lang = imports.lang;
const St = imports.gi.St;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const ExtensionUtils = imports.misc.extensionUtils;
const ThisExtension = ExtensionUtils.getCurrentExtension();
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const ByteArray = imports.byteArray;

const SHOW_UI_COMMAND = "globalprotect launch-ui";
const IS_CONNECTED_COMMAND = "ip link show gpd0";

const CHECK_CONNECTION_INTERVAL_MS = 5000;

const CONNECTED_ICON = Gio.icon_new_for_string(ThisExtension.path + "/icons/connected.png");
const DISCONNECTED_ICON = Gio.icon_new_for_string(ThisExtension.path + "/icons/disconnected.png");

const connectedIcon = new St.Icon({ gicon: CONNECTED_ICON, style_class: 'system-status-icon' });
const disconnectedIcon = new St.Icon({ gicon: DISCONNECTED_ICON, style_class: 'system-status-icon' });

let globalProtectUILauncher;
let clearInterval = GLib.Source.remove;

function setInterval(func, delay, ...args) {
    const wrappedFunc = () => {
        return func.apply(this, args) || true;
    };
    return GLib.timeout_add(GLib.PRIORITY_DEFAULT, delay, wrappedFunc);
}

const GlobalProtectUILauncher = new Lang.Class({
    Name: `${ThisExtension.metadata.name}`,

    connectionMonitor: null,
    launcherButton: null,
    icon: disconnectedIcon,

    _init: function() {
        let launcherName = `${ThisExtension.metadata.name} UI Launcher`;
        
        this.launcherButton = new PanelMenu.Button(0.0, launcherName, false);
        this.launcherButton.connect('button_press_event', Lang.bind(this, this.showui, false))
        this.launcherButton.add_child(this.icon);
        Main.panel.addToStatusArea(launcherName, this.launcherButton);

        this.connectionMonitor = setInterval(Lang.bind(this, this.checkConnection, false), CHECK_CONNECTION_INTERVAL_MS);
    },

    showui: function() {
        this._spawn(SHOW_UI_COMMAND, null);
    },

    checkConnection: function() {
        this._spawn(IS_CONNECTED_COMMAND, Lang.bind(this, function(output) {
            if (output !== "" && output.includes("UP")) {
                this.launcherButton.remove_child(this.icon);
                this.icon = connectedIcon;
                this.launcherButton.add_child(this.icon)
            } else {
                this.launcherButton.remove_child(this.icon);
                this.icon = disconnectedIcon;
                this.launcherButton.add_child(this.icon);
            }
        }, false));
    },

    _spawn: function(cmd, resultCallback) {
        let success, argv, pid, in_fd, out_fd, err_fd;
        [success,argv] = GLib.shell_parse_argv(cmd);

        try {
            [success, pid, in_fd, out_fd, err_fd] = GLib.spawn_async_with_pipes(
                null,
                argv,
                null,
                GLib.SpawnFlags.SEARCH_PATH | GLib.SpawnFlags.DO_NOT_REAP_CHILD,
                null);
        } catch(err) {
            logError(err);
        }
        
        if (success && pid != 0) {
            let stdout = new Gio.DataInputStream({ 
                base_stream: new Gio.UnixInputStream({fd: out_fd}) 
            });
    
            GLib.child_watch_add( GLib.PRIORITY_DEFAULT, pid,
                function(pid) {
                    GLib.spawn_close_pid(pid);
                    var [line, size, buf] = [null, 0, ""];
                    while (([line, size] = stdout.read_line(null)) != null && line != null) {
                        buf += ByteArray.toString(line);
                    }
                  
                    typeof resultCallback == 'function' && resultCallback(buf);
                }
            );
        }
    },

    destroy: function() {
        if (this.connectionMonitor != null) {
            clearInterval(this.connectionMonitor);
        }

        if (this.launcherButton != null) {
            this.launcherButton.remove_child(this.icon);
            this.launcherButton.destroy();
            this.launcherButton = null;
        }
    }
});

class Extension {
    constructor() {
    }

    enable() {
        log(`enabling ${ThisExtension.metadata.name}`);
        globalProtectUILauncher = new GlobalProtectUILauncher();
    }

    disable() {
        log(`disabling ${ThisExtension.metadata.name}`);

        globalProtectUILauncher.destroy();
        globalProtectUILauncher = null;
    }
}

function init() {
    log(`initializing ${ThisExtension.metadata.name}`);
    return new Extension();
}
