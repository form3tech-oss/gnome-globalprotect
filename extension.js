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
        this.launcherButton.connect('button_press_event', Lang.bind(this, this.showui))
        this.launcherButton.add_child(this.icon);
        Main.panel.addToStatusArea(launcherName, this.launcherButton);

        this.connectionMonitor = setInterval(Lang.bind(this, this.checkConnection), CHECK_CONNECTION_INTERVAL_MS);
    },

    showui: function() {
        this._spawn(SHOW_UI_COMMAND);
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
        }));
    },

    _spawn: function(cmd, resultCallback) {
        

        try {
            let [success,argv] = GLib.shell_parse_argv("sh -c '" + cmd + "'");
            if (success) {
                let [_, pid, stdin, stdout, stderr] = GLib.spawn_async_with_pipes(
                    null,
                    argv,
                    null,
                    GLib.SpawnFlags.SEARCH_PATH | GLib.SpawnFlags.DO_NOT_REAP_CHILD,
                    null
                );

                this.stdout = new Gio.UnixInputStream({fd: stdout, close_fd: true});
                this.dataStdout = new Gio.DataInputStream({ base_stream: this.stdout });

                new Gio.UnixOutputStream({fd: stdin, close_fd: true}).close(null);
                new Gio.UnixInputStream({fd: stderr, close_fd: true}).close(null);

                this.childWatch = GLib.child_watch_add(GLib.PRIORITY_DEFAULT, pid, Lang.bind(this, function(pid) {
                    GLib.source_remove(this.childWatch);

                    if (typeof resultCallback == 'function') {
                        this._readStdout(resultCallback);
                    }
                }));
            }
        } catch(err) {
            logError(err);
        }
    },

    _readStdout: function(callback) {
        this.dataStdout.fill_async(-1, GLib.PRIORITY_DEFAULT, null, Lang.bind(this, function(stream, result) {
            if (stream.fill_finish(result) == 0){
                try {
                    callback(ByteArray.toString(stream.peek_buffer()));
                } catch(err) {
                    logError(err);
                }
                this.stdout.close(null);
                return;
            }

            stream.set_buffer_size(2 * stream.get_buffer_size());
            this._readStdout(callback);
        }));
    },

    destroy: function() {
        if (this.childWatch != null) {
            GLib.source_remove(this.childWatch);
            this.childWatch = null;
        }

        if (!this.dataStdout.is_closed()) {
            this.stdout.close(null);
        }

        if (this.connectionMonitor != null) {
            clearInterval(this.connectionMonitor);
            this.connectionMonitor = null;
        }

        if (this.launcherButton != null) {
            this.launcherButton.remove_child(this.icon);
            this.launcherButton.destroy();
            this.launcherButton = null;
        }
    },
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