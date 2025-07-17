# Syncthing Sync for Obsidian

![GitHub release](https://img.shields.io/github/v/release/DudeThatsErin/syncthing-sync)
![License: GPL-3.0](https://img.shields.io/badge/License-GPL--3.0-blue.svg)

**Syncthing Sync for Obsidian** integrates [Syncthing](https://syncthing.net/) with Obsidian to show sync status, trigger rescans, and clean up conflict files—all directly from within Obsidian.

📚 Full documentation and setup instructions are available in the [📖 Official Wiki »](https://github.com/DudeThatsErin/syncthing-sync/wiki)

## 🌟 Features

- **Real-time Sync Status** in Obsidian's status bar
- **Force Sync** to trigger a Syncthing rescan
- **Conflict Management**: find and delete `.sync-conflict` files
- **Syncthing REST API integration**
- Configurable polling, folder ID, and auth

## 📋 Requirements

- Obsidian v1.0.0 or later
- [Syncthing](https://syncthing.net/) installed and running locally or remotely
- API key or username/password for your Syncthing instance

🔗 See: [Requirements & Setup →](https://github.com/DudeThatsErin/syncthing-sync/wiki#-requirements)

## 🔧 Installation

**Recommended**: Install via [BRAT](https://github.com/TfTHacker/obsidian42-brat)

🔗 Step-by-step guide: [Install via BRAT or GitHub Releases →](https://github.com/DudeThatsErin/syncthing-sync/wiki/Setup-Guide/Install-Options)

## ⚙️ Configuration

After installing, configure the plugin:

- Syncthing URL (e.g., `http://localhost:8384`)
- API Key or username/password
- Folder ID of your synced vault
- Poll interval (seconds)

🔗 Full setup: [Plugin Settings →](https://github.com/DudeThatsErin/syncthing-sync/wiki/Plugin-Settings)  
🔑 [How to find your API key](https://github.com/DudeThatsErin/syncthing-sync/wiki/API-Key)  
📁 [How to find your Folder ID](https://github.com/DudeThatsErin/syncthing-sync/wiki/Syncthing-Folder-ID)

## 🛠 Usage

Available commands (via Cmd/Ctrl+P):

- ✅ Force Sync
- 🧹 Delete All Sync Conflict Files
- 🔄 Check Syncthing Connection

Visual sync status appears in the status bar:
- 🟢 Synced
- 🟡 Syncing
- 🔴 Error

📘 Learn more: [Usage & Status Indicators →](https://github.com/DudeThatsErin/syncthing-sync/wiki/Plugin-Settings#status-bar)

## ❓ FAQ & Troubleshooting

- Can I connect to a remote server?
- How do I fix CORS errors?
- Why is my sync stuck or failing?

📘 [Read the FAQ](https://github.com/DudeThatsErin/syncthing-sync/wiki/FAQ)  
🐛 [Troubleshooting Guide](https://github.com/DudeThatsErin/syncthing-sync/wiki/Troubleshooting)

## 📖 Full Wiki Index

- [🧭 Home](https://github.com/DudeThatsErin/syncthing-sync/wiki)
- [🔧 Setup Guide](https://github.com/DudeThatsErin/syncthing-sync/wiki/Setup-Guide/Install-Options)
- [📱 Mobile Sync Guide](https://github.com/DudeThatsErin/syncthing-sync/wiki/Mobile-Sync-Guide)
- [⚙️ Plugin Settings](https://github.com/DudeThatsErin/syncthing-sync/wiki/Plugin-Settings)
- [🧠 Best Practices](https://github.com/DudeThatsErin/syncthing-sync/wiki/Best-Practices)
- [❓ FAQ](https://github.com/DudeThatsErin/syncthing-sync/wiki/FAQ)
- [🚨 Troubleshooting](https://github.com/DudeThatsErin/syncthing-sync/wiki/Troubleshooting)

## 🤝 Contributing

Contributions are welcome!  
→ [Open an issue](https://github.com/DudeThatsErin/syncthing-sync/issues)  
→ [Start a discussion](https://github.com/DudeThatsErin/syncthing-sync/discussions)

## 📄 License

GPL-3.0  
See [LICENSE](./LICENSE)
