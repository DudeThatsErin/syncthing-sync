# Syncthing Sync for Obsidian

![GitHub release](https://img.shields.io/github/v/release/DudeThatsErin/syncthing-sync)
![License: GPL-3.0](https://img.shields.io/badge/License-GPL--3.0-blue.svg)

An Obsidian plugin that integrates with [Syncthing](https://syncthing.net/) to provide sync status and management directly within Obsidian. Monitor your sync status in real-time, force syncs when needed, and easily clean up sync conflict files—all without leaving Obsidian.

## 🌟 Features

- **Real-time Sync Status**: View your Syncthing sync status directly in Obsidian's status bar
- **Force Sync**: Trigger a Syncthing rescan/sync from within Obsidian
- **Conflict Management**: Automatically find and delete all sync conflict files with a single command
- **API Integration**: Works with Syncthing's REST API for reliable status updates
- **Customizable**: Configure polling intervals and authentication options

## 📋 Requirements

- Obsidian v1.0.0 or higher
- [Syncthing](https://syncthing.net/) installed and running on your device or network
- Syncthing API access (API key or username/password)

## 🔧 Installation

### Method 1: Using BRAT (Beta Reviewer's Auto-update Tool)

1. Install the [BRAT plugin](https://github.com/TfTHacker/obsidian42-brat) from Obsidian's Community Plugins
2. Open BRAT settings
3. Click "Add Beta Plugin"
4. Enter `https://github.com/DudeThatsErin/syncthing-sync`
5. Enable the "Syncthing Sync" plugin in Obsidian's Community Plugins settings

### Method 2: Manual Installation

1. Download the latest release from the [releases page](https://github.com/DudeThatsErin/syncthing-sync/releases)
2. Extract the files into your `.obsidian/plugins/syncthing-sync/` folder
3. Enable the plugin in Obsidian's Community Plugins settings

## ⚙️ Configuration

1. Open Obsidian Settings
2. Navigate to the "Syncthing Sync" section
3. Configure the following settings:

   - **Syncthing URL**: The URL of your Syncthing instance (default: `http://localhost:8384`)
   - **API Key**: Your Syncthing API key (found in Syncthing Web GUI under Actions > Settings > GUI > API Key)
   - **Folder ID**: The Syncthing folder ID that corresponds to your Obsidian vault
   - **Poll Interval**: How often to check sync status (in seconds)
   - **Username/Password**: Alternative authentication method if not using API key

### Finding Your Folder ID

1. Open your Syncthing Web GUI
2. Click on the folder that contains your Obsidian vault
3. Look at the URL in your browser - the folder ID is in the URL path
4. Alternatively, check your Syncthing `config.xml` file for the folder ID

## 🛠️ Usage

### Status Bar

The plugin adds a status indicator to your Obsidian status bar:

- 🟢 **Green**: All files are in sync
- 🟡 **Yellow**: Syncing in progress
- 🔴 **Red**: Sync error or disconnected

### Commands

The following commands are available in the Obsidian Command Palette (Ctrl/Cmd+P):

- **Force Sync**: Triggers a rescan of your vault folder in Syncthing
- **Delete All Sync Conflict Files**: Scans your vault for `.sync-conflict-*` files and deletes them
- **Check Connection**: Tests the connection to your Syncthing instance

## ❓ Frequently Asked Questions

### Does Syncthing need to be running on my computer for this plugin to work?

Yes, Syncthing must be running on your computer (or accessible on your network) for this plugin to work. The plugin communicates with Syncthing's REST API to check sync status and perform operations like forcing syncs or scanning for changes. If Syncthing is not running, the plugin will show a disconnected status and won't be able to monitor or control your sync process.

### Can I use this plugin with a remote Syncthing instance like my Oracle server?

Yes! You don't need Syncthing running on your local computer. You can connect directly to a remote Syncthing instance (like one running on your Oracle server) by setting the appropriate URL in the plugin settings. This means:

1. Syncthing can be running exclusively on your remote server
2. Your Obsidian client with this plugin will connect directly to that remote instance
3. You'll need to configure the following:
   - Set the Syncthing URL to your server's address (e.g., `http://your-external-server-ip:8384`)
   - Ensure your server's firewall allows connections to the Syncthing port (typically 8384)
   - Configure your Syncthing instance on the server to accept remote connections
   - Use the API key from your server's Syncthing instance

This setup is ideal for users who want to keep Syncthing running on a server that's always on, rather than having to run it locally on each device.

<a id="how-do-i-find-my-syncthing-api-key"></a>
### How do I find my Syncthing API key?

The API key is required for authenticating with Syncthing's REST API. **Important:** You need to use the API key from the Syncthing instance you're connecting to:

- If connecting to Syncthing running on your local computer, use your local Syncthing's API key
- If connecting to a remote Syncthing instance (e.g., on your Oracle server), use that remote server's Syncthing API key

You can find the API key in two ways:

#### Method 1: Through the Syncthing Web GUI

1. Open your Syncthing Web GUI (typically at http://localhost:8384)
2. Go to Actions > Settings > GUI
3. Look for the API Key field (it should be displayed there)

#### Method 2: From the config.xml file

If you can't find it in the GUI, you can check the config file:

1. Locate your Syncthing config.xml file:
   - Windows: `%LOCALAPPDATA%\Syncthing\config.xml`
   - macOS: `~/Library/Application Support/Syncthing/config.xml`
   - Linux: `~/.config/syncthing/config.xml`

2. Open the file in a text editor

3. Look for the `<apikey>` tag within the `<gui>` section, which looks like this:
   ```xml
   <gui>
       <!-- other settings -->
       <apikey>abcdefghijklmnopqrstuvwxyz123456</apikey>
       <!-- other settings -->
   </gui>
   ```

## 🔍 Troubleshooting

### CORS Issues

If you encounter CORS errors, ensure your Syncthing configuration has the following settings in the `<gui>` section of your `config.xml`:

```xml
<gui>
    <insecureAdminAccess>true</insecureAdminAccess>
    <insecureAllowFrames>true</insecureAllowFrames>
    <insecureSkipHostCheck>true</insecureSkipHostCheck>
</gui>
```

### Connection Issues

- Verify your Syncthing instance is running
- Check that the URL is correct (including port number)
- Ensure your API key or username/password is correct
- Check if your firewall is blocking connections

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the GNU General Public License v3.0 (GPL-3.0) - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgements

- [Syncthing](https://syncthing.net/) for the excellent sync tool
- [Obsidian](https://obsidian.md/) for the amazing knowledge base platform
- All contributors and users of this plugin
