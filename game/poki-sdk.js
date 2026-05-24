// game/poki-sdk.js
// Poki SDK Integration for Stack Knight
// Features: Cloud Saves, Rewarded Ads, Analytics

class PokiSDKManager {
    constructor() {
        this.initialized = false;
        this.isAdPlaying = false;
        this.adCallback = null;
        this.saveData = null;
        this.isOnline = navigator.onLine;
        this.saveQueue = [];
        
        // Initialize Poki SDK
        this.initPoki();
        
        // Listen for online/offline status
        window.addEventListener('online', () => this.isOnline = true);
        window.addEventListener('offline', () => this.isOnline = false);
    }

    // Initialize Poki SDK
    initPoki() {
        if (typeof window.PokiSDK === 'undefined') {
            if (this.initRetries === undefined) this.initRetries = 0;
            if (this.initRetries < 5) {
                this.initRetries++;
                setTimeout(() => this.initPoki(), 500);
                return;
            }
            // After 5 retries, fail gracefully
            console.warn('Poki SDK failed to load (offline/dev mode)');
            this.initialized = false;
            this.loadProgress();
            return;
        }

        try {
            window.PokiSDK.init().then(() => {
                this.initialized = true;
                console.log('Poki SDK initialized successfully');
                
                // Fire ready event for Poki
                this.fireGameReady();
                
                // Load saved progress
                this.loadProgress();
            }).catch(err => {
                console.warn('Poki SDK init error (likely offline):', err);
                this.initialized = false;
                this.loadProgress();
            });
        } catch (err) {
            console.warn('Poki SDK error:', err);
            this.initialized = false;
            this.loadProgress();
        }
    }

    // Tell Poki the game is ready to start
    fireGameReady() {
        if (this.initialized && window.PokiSDK) {
            try {
                window.PokiSDK.gameStart();
            } catch (err) {
                console.warn('Could not fire gameStart:', err);
            }
        }
    }

    // Fire game end event (before showing ads)
    fireGameEnd() {
        if (this.initialized && window.PokiSDK) {
            try {
                window.PokiSDK.gameEnd();
            } catch (err) {
                console.warn('Could not fire gameEnd:', err);
            }
        }
    }

    // Show rewarded ad (e.g., for revive)
    showRewardedAd(callback) {
        if (!this.initialized || !window.PokiSDK) {
            console.warn('Poki SDK not ready, executing callback directly');
            if (callback) callback(true);
            return;
        }

        if (this.isAdPlaying) {
            console.warn('Ad already playing');
            return;
        }

        this.isAdPlaying = true;
        this.adCallback = callback;

        try {
            window.PokiSDK.commercialBreak().then(() => {
                // Ad completed successfully
                this.isAdPlaying = false;
                if (this.adCallback) {
                    this.adCallback(true);
                    this.adCallback = null;
                }
            }).catch(() => {
                // Ad was skipped or failed
                this.isAdPlaying = false;
                if (this.adCallback) {
                    this.adCallback(false);
                    this.adCallback = null;
                }
            });
        } catch (err) {
            console.error('Error showing rewarded ad:', err);
            this.isAdPlaying = false;
            if (this.adCallback) {
                this.adCallback(false);
                this.adCallback = null;
            }
        }
    }

    // Save progress to cloud
    saveProgress(gameData) {
        const data = {
            score: gameData.score || 0,
            highScore: gameData.highScore || 0,
            gamesPlayed: gameData.gamesPlayed || 0,
            totalPlayTime: gameData.totalPlayTime || 0,
            timestamp: Date.now()
        };

        this.saveData = data;

        if (!this.isOnline) {
            // Queue save for later
            this.saveQueue.push(data);
            console.log('Offline: Save queued', data);
            
            // Try local storage as backup
            try {
                localStorage.setItem('stackknight_save', JSON.stringify(data));
            } catch (err) {
                console.warn('LocalStorage save failed:', err);
            }
            return;
        }

        if (!this.initialized || !window.PokiSDK) {
            // Fallback to localStorage
            try {
                localStorage.setItem('stackknight_save', JSON.stringify(data));
            } catch (err) {
                console.warn('LocalStorage save failed:', err);
            }
            return;
        }

        try {
            // Save to Poki cloud
            window.PokiSDK.saveData = data;
            console.log('Game saved to Poki cloud:', data);
            
            // Clear queue if this save succeeds
            this.saveQueue = [];
        } catch (err) {
            console.error('Error saving to Poki:', err);
            // Fallback to localStorage
            try {
                localStorage.setItem('stackknight_save', JSON.stringify(data));
            } catch (e) {
                console.warn('LocalStorage save failed:', e);
            }
        }
    }

    // Load progress from cloud
    loadProgress() {
        if (this.initialized && window.PokiSDK) {
            try {
                const data = window.PokiSDK.saveData;
                if (data) {
                    this.saveData = data;
                    console.log('Game loaded from Poki cloud:', data);
                    return data;
                }
            } catch (err) {
                console.warn('Error loading from Poki:', err);
            }
        }

        // Fallback to localStorage
        try {
            const stored = localStorage.getItem('stackknight_save');
            if (stored) {
                this.saveData = JSON.parse(stored);
                console.log('Game loaded from localStorage:', this.saveData);
                return this.saveData;
            }
        } catch (err) {
            console.warn('Error loading from localStorage:', err);
        }

        return null;
    }

    // Track game events for analytics
    trackEvent(eventName, eventData = {}) {
        if (!this.initialized || !window.PokiSDK) {
            console.log('Event tracked (offline):', eventName, eventData);
            return;
        }

        try {
            // Poki SDK v3 custom analytics
            if (window.PokiSDK.customEvent) {
                window.PokiSDK.customEvent(eventName, eventData);
            }
            console.log('Event tracked:', eventName, eventData);
        } catch (err) {
            console.warn('Error tracking event:', err);
        }
    }

    // Track high score
    trackHighScore(score) {
        this.trackEvent('high_score', { score });
    }

    // Track session start
    trackSessionStart() {
        this.trackEvent('session_start', { timestamp: Date.now() });
    }

    // Track session end
    trackSessionEnd(sessionData) {
        this.trackEvent('session_end', {
            duration: sessionData.duration,
            score: sessionData.score
        });
    }

    // Get persisted high score
    getHighScore() {
        if (this.saveData && this.saveData.highScore) {
            return this.saveData.highScore;
        }
        return 0;
    }
}

// Global instance
window.pokiSDK = new PokiSDKManager();
