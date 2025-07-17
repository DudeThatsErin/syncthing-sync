'use strict';

const obsidian = require('obsidian');

class SyncthingPlugin extends obsidian.Plugin {
    statusBarItem;
    syncStatus = 'idle'; // 'idle', 'syncing', 'error', 'synced'
    settings = {
        syncthingUsername: '',
        syncthingPassword: '',
        syncthingApiKey: '', // API key for Syncthing authentication
        syncthingUrl: 'http://localhost:8384',
        pollInterval: 10, // seconds
        folderId: '' // Syncthing folder ID that corresponds to this vault
    };
    
    intervalId = null;

    async onload() {

        
        try {
            // Load settings

            await this.loadSettings();

            
            // Add status bar item

            this.statusBarItem = this.addStatusBarItem();
            this.updateStatusBarItem();

            
            // Add settings tab

            this.addSettingTab(new SyncthingSettingTab(this.app, this));

            
            // Add command to force sync

            this.addCommand({
                id: 'force-sync',
                name: 'Force Sync',
                callback: () => this.forceSync()
            });
            
            // Add command to check connection

            this.addCommand({
                id: 'check-connection',
                name: 'Check Syncthing Connection',
                callback: () => this.testConnection()
            });
            
            // Add command to delete sync conflict files

            this.addCommand({
                id: 'delete-sync-conflicts',
                name: 'Delete All Sync Conflict Files',
                callback: () => this.deleteSyncConflictFiles()
            });
            
            // Start polling after a short delay

            setTimeout(() => {

                this.startPolling();
            }, 2000);
            

        } catch (error) {

        }
    }
    
    onunload() {

        if (this.intervalId) {
            clearInterval(this.intervalId);
        }
    }
    
    async loadSettings() {

        const savedData = await this.loadData();

        this.settings = Object.assign({}, this.settings, savedData);

    }
    
    async saveSettings() {
        await this.saveData(this.settings);
    }
    
    startPolling() {

        
        if (this.intervalId) {

            clearInterval(this.intervalId);
        }
        
        // Check if we have the necessary settings
        if (!this.settings.folderId) {

            this.syncStatus = 'error';
            this.statusBarItem.setAttribute('data-tooltip', 'Error: Folder ID not set');
            this.updateStatusBarItem();
            return;
        }
        




        
        this.intervalId = setInterval(() => {

            this.checkSyncStatus();
        }, this.settings.pollInterval * 1000);
        
        // Initial check

        this.checkSyncStatus();
    }
    
    // Helper function to safely parse JSON responses
    async safeParseResponse(response, endpoint) {

        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
        }
        
        try {
            const responseText = await response.text();

            
            if (responseText) {
                try {
                    // Try to clean up malformed JSON before parsing
                    const cleanedText = responseText
                        .replace(/\s+/g, ' ')  // Replace multiple whitespace with single space
                        .replace(/([\{\[,])\s*(['"])?([a-zA-Z0-9_]+)(['"])?\s*:/g, '$1"$3":') // Ensure property names are quoted
                        .replace(/:\s*'([^']*)'/g, ':"$1"')  // Replace single quotes with double quotes
                        .replace(/,\s*([\}\]])/g, '$1')  // Remove trailing commas
                        .replace(/([^\\])\"(\w+)\"(\s*):/g, '$1"$2":')  // Fix property names
                        .replace(/:\s*([^\s\{\}\[\]\,"]+)/g, function(match, p1) {
                            // If value is true/false/null or a number, keep it as is, otherwise quote it
                            if (p1 === 'true' || p1 === 'false' || p1 === 'null' || !isNaN(p1)) {
                                return ': ' + p1;
                            }
                            return ': "' + p1 + '"';
                        });
                        

                    return JSON.parse(cleanedText);
                } catch (parseError) {

                    return { text: responseText, success: true };
                }
            } else {
                return { success: true };
            }
        } catch (error) {

            return { success: true };
        }
    }
    
    async testConnection() {

        try {
            new obsidian.Notice('Testing Syncthing connection...');
            
            if (!this.settings.syncthingUrl) {

                new obsidian.Notice('Error: No Syncthing URL configured');
                return false;
            }
            

            
            // Create headers
            let headers = {};
            if (this.settings.syncthingApiKey) {

                headers['X-API-Key'] = this.settings.syncthingApiKey;
            } else if (this.settings.syncthingUsername && this.settings.syncthingPassword) {

                const authHeader = 'Basic ' + btoa(`${this.settings.syncthingUsername}:${this.settings.syncthingPassword}`);
                headers['Authorization'] = authHeader;
            } else {

            }
            
            // Try to get system version

            const response = await fetch(`${this.settings.syncthingUrl}/rest/system/version`, {
                headers: headers
            });
            

            
            const data = await this.safeParseResponse(response, '/rest/system/version');
            
            if (data.version) {
                new obsidian.Notice(`Connected to Syncthing ${data.version}`);

            } else {
                new obsidian.Notice('Connected to Syncthing');

            }
            return true;
        } catch (error) {

            new obsidian.Notice(`Connection error: ${error.message}`);
            return false;
        }
    }
    
    async checkSyncStatus() {

        try {
            // Check if we have the necessary settings
            if (!this.settings.folderId) {

                this.syncStatus = 'error';
                this.statusBarItem.setAttribute('data-tooltip', 'Error: Folder ID not set');
                this.updateStatusBarItem();
                return;
            }
            
            // Set status to syncing while we check
            this.syncStatus = 'syncing';
            this.updateStatusBarItem();

            
            // Create headers
            let headers = {};
            if (this.settings.syncthingApiKey) {

                headers['X-API-Key'] = this.settings.syncthingApiKey;
            } else if (this.settings.syncthingUsername && this.settings.syncthingPassword) {

                const authHeader = 'Basic ' + btoa(`${this.settings.syncthingUsername}:${this.settings.syncthingPassword}`);
                headers['Authorization'] = authHeader;
            } else {

            }
            
            // First, try a simpler endpoint to check connection

            try {

                const pingResponse = await fetch(`${this.settings.syncthingUrl}/rest/system/ping`, {
                    headers: headers
                });
                

                
                if (!pingResponse.ok) {
                    throw new Error(`Cannot connect to Syncthing: HTTP ${pingResponse.status} ${pingResponse.statusText}`);
                } else {
                    try {
                        const pingText = await pingResponse.text();

                    } catch (textError) {

                    }
                }
            } catch (pingError) {

                throw new Error(`Connection failed: ${pingError.message}`);
            }
            
            // Now check folder status

            try {

                const folderResponse = await fetch(`${this.settings.syncthingUrl}/rest/db/status?folder=${this.settings.folderId}`, {
                    headers: headers
                });
                

                
                if (!folderResponse.ok) {
                    throw new Error(`Folder status error: HTTP ${folderResponse.status} ${folderResponse.statusText}`);
                }
                
                try {
                    const data = await this.safeParseResponse(folderResponse, '/rest/db/status');

                    
                    // Check if there are any files being synced
                    if (data.inSyncFiles < data.globalFiles) {

                        this.syncStatus = 'syncing';
                        this.statusBarItem.setAttribute('data-tooltip', `Syncing: ${data.inSyncFiles}/${data.globalFiles} files`);
                    } else {

                        this.syncStatus = 'synced';
                        this.statusBarItem.setAttribute('data-tooltip', 'All files in sync');
                    }
                } catch (error) {

                    this.syncStatus = 'synced';
                    this.statusBarItem.setAttribute('data-tooltip', 'All files in sync (assumed)');
                }
            } catch (folderError) {

                throw new Error(`Folder error: ${folderError.message}`);
            }
        } catch (error) {

            this.syncStatus = 'error';
            this.statusBarItem.setAttribute('data-tooltip', `Error: ${error.message}`);
        }
        

        this.updateStatusBarItem();
    }
    
    async forceSync() {

        try {
            if (!this.settings.folderId) {

                new obsidian.Notice('Error: Folder ID not set');
                return;
            }
            
            this.syncStatus = 'syncing';
            this.updateStatusBarItem();

            
            new obsidian.Notice('Forcing Syncthing rescan...');
            
            // Create headers
            let headers = {};
            if (this.settings.syncthingApiKey) {

                headers['X-API-Key'] = this.settings.syncthingApiKey;
            } else if (this.settings.syncthingUsername && this.settings.syncthingPassword) {

                const authHeader = 'Basic ' + btoa(`${this.settings.syncthingUsername}:${this.settings.syncthingPassword}`);
                headers['Authorization'] = authHeader;
            }
            

            const response = await fetch(`${this.settings.syncthingUrl}/rest/db/scan?folder=${this.settings.folderId}`, {
                method: 'POST',
                headers: headers
            });
            

            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
            }
            
            try {
                await this.safeParseResponse(response, '/rest/db/scan');
            } catch (error) {

            }
            
            new obsidian.Notice('Syncthing rescan initiated');

            
            // After forcing sync, check status

            setTimeout(() => this.checkSyncStatus(), 2000);
        } catch (error) {

            this.syncStatus = 'error';
            this.statusBarItem.setAttribute('data-tooltip', `Error: ${error.message}`);
            this.updateStatusBarItem();
            new obsidian.Notice(`Sync error: ${error.message}`);
        }
    }
    
    updateStatusBarItem() {
        let statusText = '';
        
        switch (this.syncStatus) {
            case 'idle':
                statusText = 'Syncthing: Idle';
                break;
            case 'syncing':
                statusText = 'Syncthing: Syncing...';
                break;
            case 'error':
                statusText = 'Syncthing: Error';
                break;
            case 'synced':
                statusText = 'Syncthing: Synced';
                break;
        }
        
        // Set data attribute for status
        this.statusBarItem.setAttribute('data-status', this.syncStatus);
        
        // Update text
        this.statusBarItem.setText(statusText);
    }
    
    async deleteSyncConflictFiles() {

        new obsidian.Notice('Searching for sync conflict files...');
        
        try {
            // Get the vault path
            const vaultPath = this.app.vault.adapter.basePath;

            
            // Get all files in the vault
            const files = await this.app.vault.adapter.list('');

            
            // Filter for sync conflict files (typically end with .sync-conflict-*)
            const conflictPattern = /\.sync-conflict-[\d-]+/;
            const conflictFiles = files.files.filter(file => conflictPattern.test(file));
            

            
            if (conflictFiles.length === 0) {
                new obsidian.Notice('No sync conflict files found');
                return;
            }
            
            // Delete each conflict file
            let deletedCount = 0;
            for (const file of conflictFiles) {
                try {

                    await this.app.vault.adapter.remove(file);
                    deletedCount++;
                } catch (deleteError) {

                }
            }
            
            new obsidian.Notice(`Deleted ${deletedCount} sync conflict files`);

        } catch (error) {

            new obsidian.Notice(`Error deleting sync conflict files: ${error.message}`);
        }
    }
}

class SyncthingSettingTab extends obsidian.PluginSettingTab {
    plugin;
    
    constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
    }
    
    display() {
        const {containerEl} = this;
        
        containerEl.empty();
        
        containerEl.createEl('h2', {text: 'Syncthing Settings'});
        
        new obsidian.Setting(containerEl)
            .setName('Syncthing URL')
            .setDesc('URL of your Syncthing Web GUI (default: http://localhost:8384)')
            .addText(text => text
                .setValue(this.plugin.settings.syncthingUrl)
                .onChange(async (value) => {
                    this.plugin.settings.syncthingUrl = value;
                    await this.plugin.saveSettings();
                }));
        
        const apiKeyDesc = document.createDocumentFragment();
        apiKeyDesc.append(
            'API Key for the Syncthing instance you want to connect to. ',
            'Use the API key from your local Syncthing or from your remote server (if connecting to a remote instance). ',
            createEl('a', {
                href: 'https://github.com/DudeThatsErin/syncthing-sync/tree/main#how-do-i-find-my-syncthing-api-key',
                text: 'Click here for instructions on where to get the API key',
                target: '_blank'
            })
        );
        
        new obsidian.Setting(containerEl)
            .setName('API Key')
            .setDesc(apiKeyDesc)
            .addText(text => text
                .setValue(this.plugin.settings.syncthingApiKey)
                .setPlaceholder('API Key')
                .onChange(async (value) => {
                    this.plugin.settings.syncthingApiKey = value;
                    await this.plugin.saveSettings();
                }));
                
        new obsidian.Setting(containerEl)
            .setName('Username (Alternative)')
            .setDesc('Syncthing GUI Username (only needed if not using API Key)')
            .addText(text => text
                .setValue(this.plugin.settings.syncthingUsername)
                .setPlaceholder('Username')
                .onChange(async (value) => {
                    this.plugin.settings.syncthingUsername = value;
                    await this.plugin.saveSettings();
                }));
                
        new obsidian.Setting(containerEl)
            .setName('Password (Alternative)')
            .setDesc('Syncthing GUI Password (only needed if not using API Key)')
            .addText(text => text
                .setValue(this.plugin.settings.syncthingPassword)
                .setPlaceholder('Password')
                .onChange(async (value) => {
                    this.plugin.settings.syncthingPassword = value;
                    await this.plugin.saveSettings();
                }));
        
        new obsidian.Setting(containerEl)
            .setName('Folder ID')
            .setDesc('Syncthing Folder ID for this vault (found in Syncthing Web GUI under Actions > Settings > Folders)')
            .addText(text => text
                .setValue(this.plugin.settings.folderId)
                .setPlaceholder('Folder ID')
                .onChange(async (value) => {
                    this.plugin.settings.folderId = value;
                    await this.plugin.saveSettings();
                }));
        
        new obsidian.Setting(containerEl)
            .setName('Poll Interval')
            .setDesc('How often to check sync status (in seconds)')
            .addText(text => text
                .setValue(String(this.plugin.settings.pollInterval))
                .setPlaceholder('10')
                .onChange(async (value) => {
                    // Convert to number and validate
                    const numValue = parseInt(value, 10);
                    // Ensure it's a valid number and at least 5 seconds
                    if (!isNaN(numValue) && numValue >= 5) {
                        this.plugin.settings.pollInterval = numValue;
                        await this.plugin.saveSettings();
                    }
                }));
                
        // Add test connection button
        new obsidian.Setting(containerEl)
            .setName('Test Connection')
            .setDesc('Test connection to Syncthing')
            .addButton(button => button
                .setButtonText('Test Connection')
                .onClick(() => {
                    this.plugin.testConnection();
                }));
                
        // Add start/stop polling button
        new obsidian.Setting(containerEl)
            .setName('Restart Sync')
            .setDesc('Restart the sync monitoring')
            .addButton(button => button
                .setButtonText('Restart Sync')
                .onClick(() => {
                    this.plugin.startPolling();
                    new obsidian.Notice('Sync monitoring restarted');
                }));
    }
}

module.exports = SyncthingPlugin;