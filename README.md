# Gnome GlobalProtect

Displays an icon in the menu bar which opens the GlobalProtect UI when clicked. The icon will be grayed out when no VPN connection exists. The extension checks for the VPN connectivity status every 5 seconds.

## Installation

Clone this repo to the extensions folder:

```
mkdir -p ~/.local/share/gnome-shell/extensions
git clone https://github.com/form3tech-oss/gnome-globalprotect ~/.local/share/gnome-shell/extensions/gnomeglobalprotect@form3tech-oss
```

Confirm PanGPUI is set as a startup program:

```
gnome-session-properties
```

Confirm that PanGPUI is in the list of startup programs and is checked. If not, add a new program with the following:

```
Name: PanGPUI
Command: /opt/paloaltonetworks/globalprotect/PanGPUI
```

> **_NOTE:_** Failing to set PanGPUI as a startup program can result in gnome freezing when you click on the GlobalProtect Icon.

Enable the extension:

```
gnome-extensions enable gnomeglobalprotect@form3tech-oss
```

Restart the GNOME shell with <kbd>Alt</kbd> + <kbd>F2</kbd> and type `r`.
