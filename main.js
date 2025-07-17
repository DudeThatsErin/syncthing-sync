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
        console.log('[Syncthing] Plugin loading started');
        
        try {
            // Load settings
            console.log('[Syncthing] Loading settings...');
            await this.loadSettings();
            console.log('[Syncthing] Settings loaded:', JSON.stringify(this.settings, null, 2));
            
            // Add status bar item
            console.log('[Syncthing] Adding status bar item...');
            this.statusBarItem = this.addStatusBarItem();
            this.updateStatusBarItem();
            console.log('[Syncthing] Status bar item added');
            
            // Add settings tab
            console.log('[Syncthing] Adding settings tab...');
            this.addSettingTab(new SyncthingSettingTab(this.app, this));
            console.log('[Syncthing] Settings tab added');
            
            // Add command to force sync
            console.log('[Syncthing] Adding force sync command...');
            this.addCommand({
                id: 'force-sync',
                name: 'Force Sync',
                callback: () => this.forceSync()
            });
            
            // Add command to check connection
            console.log('[Syncthing] Adding check connection command...');
            this.addCommand({
                id: 'check-connection',
                name: 'Check Syncthing Connection',
                callback: () => this.testConnection()
            });
            
            // Add command to delete sync conflict files
            console.log('[Syncthing] Adding delete sync conflicts command...');
            this.addCommand({
                id: 'delete-sync-conflicts',
                name: 'Delete All Sync Conflict Files',
                callback: () => this.deleteSyncConflictFiles()
            });
            
            // Start polling after a short delay
            console.log('[Syncthing] Scheduling polling to start in 2 seconds...');
            setTimeout(() => {
                console.log('[Syncthing] Starting polling now (from timeout)...');
                this.startPolling();
            }, 2000);
            
            console.log('[Syncthing] Plugin loading completed successfully');
        } catch (error) {
            console.error('[Syncthing] Error during plugin loading:', error);
        }
    }
    
    onunload() {
        console.log('Unloading Syncthing plugin');
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }
    }
    
    async loadSettings() {
        console.log('[Syncthing] Loading settings from disk...');
        const savedData = await this.loadData();
        console.log('[Syncthing] Loaded data from disk:', savedData ? JSON.stringify(savedData) : 'No saved data');
        this.settings = Object.assign({}, this.settings, savedData);
        console.log('[Syncthing] Settings after merge:', JSON.stringify(this.settings, null, 2));
    }
    
    async saveSettings() {
        await this.saveData(this.settings);
    }
    
    startPolling() {
        console.log('[Syncthing] Starting polling function called');
        
        if (this.intervalId) {
            console.log('[Syncthing] Clearing existing polling interval');
            clearInterval(this.intervalId);
        }
        
        // Check if we have the necessary settings
        if (!this.settings.folderId) {
            console.log('[Syncthing] ERROR: Folder ID not set, cannot start polling');
            this.syncStatus = 'error';
            this.statusBarItem.setAttribute('aria-label', 'Error: Folder ID not set');
            this.updateStatusBarItem();
            return;
        }
        
        console.log(`[Syncthing] Starting polling with interval: ${this.settings.pollInterval} seconds`);
        console.log(`[Syncthing] Using URL: ${this.settings.syncthingUrl}`);
        console.log(`[Syncthing] Using Folder ID: ${this.settings.folderId}`);
        console.log(`[Syncthing] Auth: ${this.settings.syncthingUsername ? 'Username provided' : 'No username'}, ${this.settings.syncthingPassword ? 'Password provided' : 'No password'}`);
        
        this.intervalId = setInterval(() => {
            console.log('[Syncthing] Running scheduled status check...');
            this.checkSyncStatus();
        }, this.settings.pollInterval * 1000);
        
        // Initial check
        console.log('[Syncthing] Running initial status check...');
        this.checkSyncStatus();
    }
    
    // Helper function to safely parse JSON responses
    async safeParseResponse(response, endpoint) {
        console.log(`[Syncthing] Handling response from ${endpoint}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
        }
        
        try {
            const responseText = await response.text();
            console.log(`[Syncthing] Raw response: ${responseText}`);
            
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
                        
                    console.log(`[Syncthing] Cleaned JSON: ${cleanedText}`);
                    return JSON.parse(cleanedText);
                } catch (parseError) {
                    console.log('[Syncthing] Response is not JSON or is malformed:', parseError);
                    return { text: responseText, success: true };
                }
            } else {
                return { success: true };
            }
        } catch (error) {
            console.log('[Syncthing] Could not read response text, assuming success');
            return { success: true };
        }
    }
    
    async testConnection() {
        console.log('[Syncthing] Testing connection...');
        try {
            new obsidian.Notice('Testing Syncthing connection...');
            
            if (!this.settings.syncthingUrl) {
                console.log('[Syncthing] ERROR: No URL configured');
                new obsidian.Notice('Error: No Syncthing URL configured');
                return false;
            }
            
            console.log(`[Syncthing] Testing connection to ${this.settings.syncthingUrl}`);
            
            // Create headers
            let headers = {};
            if (this.settings.syncthingApiKey) {
                console.log('[Syncthing] Using API key for authentication');
                headers['X-API-Key'] = this.settings.syncthingApiKey;
            } else if (this.settings.syncthingUsername && this.settings.syncthingPassword) {
                console.log(`[Syncthing] Using basic auth with username: ${this.settings.syncthingUsername}`);
                const authHeader = 'Basic ' + btoa(`${this.settings.syncthingUsername}:${this.settings.syncthingPassword}`);
                headers['Authorization'] = authHeader;
            } else {
                console.log('[Syncthing] No authentication credentials provided');
            }
            
            // Try to get system version
            console.log('[Syncthing] Sending request to /rest/system/version...');
            const response = await fetch(`${this.settings.syncthingUrl}/rest/system/version`, {
                headers: headers
            });
            
            console.log(`[Syncthing] Response status: ${response.status} ${response.statusText}`);
            
            const data = await this.safeParseResponse(response, '/rest/system/version');
            
            if (data.version) {
                new obsidian.Notice(`Connected to Syncthing ${data.version}`);
                console.log(`[Syncthing] Successfully connected to Syncthing ${data.version}`);
            } else {
                new obsidian.Notice('Connected to Syncthing');
                console.log('[Syncthing] Successfully connected to Syncthing');
            }
            return true;
        } catch (error) {
            console.error('[Syncthing] Connection test error:', error);
            new obsidian.Notice(`Connection error: ${error.message}`);
            return false;
        }
    }
    
    async checkSyncStatus() {
        console.log('[Syncthing] Checking sync status...');
        try {
            // Check if we have the necessary settings
            if (!this.settings.folderId) {
                console.log('[Syncthing] ERROR: Folder ID not set');
                this.syncStatus = 'error';
                this.statusBarItem.setAttribute('aria-label', 'Error: Folder ID not set');
                this.updateStatusBarItem();
                return;
            }
            
            // Set status to syncing while we check
            this.syncStatus = 'syncing';
            this.updateStatusBarItem();
            console.log('[Syncthing] Set status to syncing while checking');
            
            // Create headers
            let headers = {};
            if (this.settings.syncthingApiKey) {
                console.log('[Syncthing] Using API key for authentication');
                headers['X-API-Key'] = this.settings.syncthingApiKey;
            } else if (this.settings.syncthingUsername && this.settings.syncthingPassword) {
                console.log('[Syncthing] Adding authentication header');
                const authHeader = 'Basic ' + btoa(`${this.settings.syncthingUsername}:${this.settings.syncthingPassword}`);
                headers['Authorization'] = authHeader;
            } else {
                console.log('[Syncthing] No authentication credentials for API calls');
            }
            
            // First, try a simpler endpoint to check connection
            console.log('[Syncthing] Testing basic connectivity with ping...');
            try {
                console.log(`[Syncthing] Sending request to ${this.settings.syncthingUrl}/rest/system/ping`);
                const pingResponse = await fetch(`${this.settings.syncthingUrl}/rest/system/ping`, {
                    headers: headers
                });
                
                console.log(`[Syncthing] Ping response status: ${pingResponse.status} ${pingResponse.statusText}`);
                
                if (!pingResponse.ok) {
                    throw new Error(`Cannot connect to Syncthing: HTTP ${pingResponse.status} ${pingResponse.statusText}`);
                } else {
                    try {
                        const pingText = await pingResponse.text();
                        console.log(`[Syncthing] Ping response text: ${pingText}`);
                    } catch (textError) {
                        console.log('[Syncthing] Could not read ping response text');
                    }
                }
            } catch (pingError) {
                console.error('[Syncthing] Ping error:', pingError);
                throw new Error(`Connection failed: ${pingError.message}`);
            }
            
            // Now check folder status
            console.log('[Syncthing] Checking folder status...');
            try {
                console.log(`[Syncthing] Sending request to ${this.settings.syncthingUrl}/rest/db/status?folder=${this.settings.folderId}`);
                const folderResponse = await fetch(`${this.settings.syncthingUrl}/rest/db/status?folder=${this.settings.folderId}`, {
                    headers: headers
                });
                
                console.log(`[Syncthing] Folder status response: ${folderResponse.status} ${folderResponse.statusText}`);
                
                if (!folderResponse.ok) {
                    throw new Error(`Folder status error: HTTP ${folderResponse.status} ${folderResponse.statusText}`);
                }
                
                try {
                    const data = await this.safeParseResponse(folderResponse, '/rest/db/status');
                    console.log('[Syncthing] Folder status parsed data:', data);
                    
                    // Check if there are any files being synced
                    if (data.inSyncFiles < data.globalFiles) {
                        console.log(`[Syncthing] Files being synced: ${data.inSyncFiles}/${data.globalFiles}`);
                        this.syncStatus = 'syncing';
                        this.statusBarItem.setAttribute('aria-label', `Syncing: ${data.inSyncFiles}/${data.globalFiles} files`);
                    } else {
                        console.log('[Syncthing] All files in sync');
                        this.syncStatus = 'synced';
                        this.statusBarItem.setAttribute('aria-label', 'All files in sync');
                    }
                } catch (error) {
                    console.error('[Syncthing] Error parsing folder status:', error);
                    this.syncStatus = 'synced';
                    this.statusBarItem.setAttribute('aria-label', 'All files in sync (assumed)');
                }
            } catch (folderError) {
                console.error('[Syncthing] Folder status error:', folderError);
                throw new Error(`Folder error: ${folderError.message}`);
            }
        } catch (error) {
            console.error('[Syncthing] Error checking Syncthing status:', error);
            this.syncStatus = 'error';
            this.statusBarItem.setAttribute('aria-label', `Error: ${error.message}`);
        }
        
        console.log(`[Syncthing] Final status: ${this.syncStatus}`);
        this.updateStatusBarItem();
    }
    
    async forceSync() {
        console.log('[Syncthing] Force sync requested');
        try {
            if (!this.settings.folderId) {
                console.log('[Syncthing] ERROR: Cannot force sync, folder ID not set');
                new obsidian.Notice('Error: Folder ID not set');
                return;
            }
            
            this.syncStatus = 'syncing';
            this.updateStatusBarItem();
            console.log('[Syncthing] Set status to syncing');
            
            new obsidian.Notice('Forcing Syncthing rescan...');
            
            // Create headers
            let headers = {};
            if (this.settings.syncthingApiKey) {
                console.log('[Syncthing] Using API key for authentication');
                headers['X-API-Key'] = this.settings.syncthingApiKey;
            } else if (this.settings.syncthingUsername && this.settings.syncthingPassword) {
                console.log('[Syncthing] Adding authentication header for rescan');
                const authHeader = 'Basic ' + btoa(`${this.settings.syncthingUsername}:${this.settings.syncthingPassword}`);
                headers['Authorization'] = authHeader;
            }
            
            console.log(`[Syncthing] Sending POST request to ${this.settings.syncthingUrl}/rest/db/scan?folder=${this.settings.folderId}`);
            const response = await fetch(`${this.settings.syncthingUrl}/rest/db/scan?folder=${this.settings.folderId}`, {
                method: 'POST',
                headers: headers
            });
            
            console.log(`[Syncthing] Rescan response status: ${response.status} ${response.statusText}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
            }
            
            try {
                await this.safeParseResponse(response, '/rest/db/scan');
            } catch (error) {
                console.log('[Syncthing] Could not parse rescan response, but continuing');
            }
            
            new obsidian.Notice('Syncthing rescan initiated');
            console.log('[Syncthing] Rescan initiated successfully');
            
            // After forcing sync, check status
            console.log('[Syncthing] Will check status in 2 seconds...');
            setTimeout(() => this.checkSyncStatus(), 2000);
        } catch (error) {
            console.error('[Syncthing] Error forcing Syncthing sync:', error);
            this.syncStatus = 'error';
            this.statusBarItem.setAttribute('aria-label', `Error: ${error.message}`);
            this.updateStatusBarItem();
            new obsidian.Notice(`Sync error: ${error.message}`);
        }
    }
    
    updateStatusBarItem() {
        console.log(`[Syncthing] Updating status bar item to status: ${this.syncStatus}`);
        let statusText = '';
        let statusClass = '';
        
        switch (this.syncStatus) {
            case 'idle':
                statusText = 'Syncthing: Idle';
                statusClass = 'syncthing-idle';
                break;
            case 'syncing':
                statusText = 'Syncthing: Syncing...';
                statusClass = 'syncthing-syncing';
                break;
            case 'error':
                statusText = 'Syncthing: Error';
                statusClass = 'syncthing-error';
                break;
            case 'synced':
                statusText = 'Syncthing: Synced';
                statusClass = 'syncthing-synced';
                break;
        }
        
        // Remove all classes first
        this.statusBarItem.removeClass('syncthing-idle', 'syncthing-syncing', 'syncthing-error', 'syncthing-synced');
        
        // Add the current status class
        this.statusBarItem.addClass(statusClass);
        
        // Update text
        this.statusBarItem.setText(statusText);
        console.log(`[Syncthing] Status bar updated to: ${statusText}`);
    }
    
    async deleteSyncConflictFiles() {
        console.log('[Syncthing] Starting to delete sync conflict files...');
        new obsidian.Notice('Searching for sync conflict files...');
        
        try {
            // Get the vault path
            const vaultPath = this.app.vault.adapter.basePath;
            console.log(`[Syncthing] Vault path: ${vaultPath}`);
            
            // Get all files in the vault
            const files = await this.app.vault.adapter.list('');
            console.log(`[Syncthing] Found ${files.files.length} files in vault`);
            
            // Filter for sync conflict files (typically end with .sync-conflict-*)
            const conflictPattern = /\.sync-conflict-[\d-]+/;
            const conflictFiles = files.files.filter(file => conflictPattern.test(file));
            
            console.log(`[Syncthing] Found ${conflictFiles.length} sync conflict files`);
            
            if (conflictFiles.length === 0) {
                new obsidian.Notice('No sync conflict files found');
                return;
            }
            
            // Delete each conflict file
            let deletedCount = 0;
            for (const file of conflictFiles) {
                try {
                    console.log(`[Syncthing] Deleting conflict file: ${file}`);
                    await this.app.vault.adapter.remove(file);
                    deletedCount++;
                } catch (deleteError) {
                    console.error(`[Syncthing] Error deleting file ${file}:`, deleteError);
                }
            }
            
            new obsidian.Notice(`Deleted ${deletedCount} sync conflict files`);
            console.log(`[Syncthing] Successfully deleted ${deletedCount} sync conflict files`);
        } catch (error) {
            console.error('[Syncthing] Error while deleting sync conflict files:', error);
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
            .addSlider(slider => slider
                .setLimits(5, 60, 5)
                .setValue(this.plugin.settings.pollInterval)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    this.plugin.settings.pollInterval = value;
                    await this.plugin.saveSettings();
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