class DebugGame {
    constructor() {
        this.currentLevel = 1;
        this.maxLevels = 6;
        this.currentLanguage = 'fr';
        this.levelData = null;
        this.gameCompleted = false;
        this.recruiterMode = window.RECRUITER_MODE || false;
        
        // Initialize performance tracking for recruiter mode
        this.playerStats = {
            levels: {},
            totalTime: 0,
            copyPasteDetected: false,
            recruiterMode: this.recruiterMode,
            completed: false,
            startTime: Date.now()
        };
        
        this.levelStartTime = null;
        this.levelAttempts = 0;
        
        // Initialiser les éléments et vérifier que tout est ok
        if (!this.initializeElements()) {
            console.error('Impossible d\'initialiser les éléments HTML');
            return;
        }
        
        this.bindEvents();
        this.setupRecruiterModeTracking();
        this.loadLevel(this.currentLevel);
    }

    initializeElements() {
        // UI Elements
        this.languageSelector = document.getElementById('languageSelector');
        this.progressBar = document.getElementById('progressBar');
        this.progressText = document.getElementById('progressText');
        this.levelTitle = document.getElementById('levelTitle');
        this.levelLanguage = document.getElementById('levelLanguage');
        this.levelDescription = document.getElementById('levelDescription');
        this.levelHint = document.getElementById('levelHint');
        this.hintText = document.getElementById('hintText');
        this.buggyCode = document.getElementById('buggyCode');
        this.userFix = document.getElementById('userFix');
        this.validateButton = document.getElementById('validateButton');
        this.hintButton = document.getElementById('hintButton');
        this.feedbackCard = document.getElementById('feedbackCard');
        this.feedbackIcon = document.getElementById('feedbackIcon');
        this.feedbackMessage = document.getElementById('feedbackMessage');
        this.nextLevelButton = document.getElementById('nextLevelButton');
        this.gameCompleteCard = document.getElementById('gameCompleteCard');
        this.restartButton = document.getElementById('restartButton');
        this.loadingOverlay = document.getElementById('loadingOverlay');
        this.impossibleLevelWarning = document.getElementById('impossibleLevelWarning');
        
        // Recruiter mode elements (ces éléments peuvent être null si pas en mode recruteur)
        this.recruiterCompleteCard = document.getElementById('recruiterCompleteCard');
        this.generateCertButton = document.getElementById('generateCertButton');
        this.playerNameInput = document.getElementById('playerName');
        this.cheatingWarning = document.getElementById('cheatingWarning');
        this.recruiterRestartButton = document.getElementById('recruiterRestartButton');
        this.finalTotalTime = document.getElementById('finalTotalTime');
        this.finalTotalAttempts = document.getElementById('finalTotalAttempts');
        this.finalHintsUsed = document.getElementById('finalHintsUsed');
        this.finalCopyPaste = document.getElementById('finalCopyPaste');

        // Vérifier les éléments essentiels
        if (!this.levelTitle || !this.buggyCode || !this.userFix) {
            console.error('Éléments HTML essentiels manquants');
            return false;
        }
        return true;
    }

    bindEvents() {
        // Language selector change
        this.languageSelector.addEventListener('change', (e) => {
            this.currentLanguage = e.target.value;
            this.loadLevel(this.currentLevel);
        });

        // Validate button click
        this.validateButton.addEventListener('click', () => {
            this.validateUserFix();
        });

        // Hint button click
        this.hintButton.addEventListener('click', () => {
            this.showHint();
        });

        // Next level button click
        this.nextLevelButton.addEventListener('click', () => {
            this.nextLevel();
        });

        // Restart button click
        this.restartButton.addEventListener('click', () => {
            this.restartGame();
        });

        // Enter key in textarea + recruiter mode key blocking
        this.userFix.addEventListener('keydown', (e) => {
            // Ctrl+Enter pour valider
            if (e.ctrlKey && e.key === 'Enter') {
                e.preventDefault();
                this.validateUserFix();
                return;
            }
            
            // Mode recruteur : bloquer Ctrl+V et Cmd+V
            if (this.recruiterMode && (e.ctrlKey || e.metaKey) && (e.key === 'v' || e.key === 'V')) {
                e.preventDefault();
                this.playerStats.copyPasteDetected = true;
                this.showError('🚫 Ctrl+V bloqué en mode recruteur !');
            }
        });

        // Recruiter mode events
        if (this.recruiterMode) {
            if (this.generateCertButton) {
                this.generateCertButton.addEventListener('click', () => this.generateCertificate());
            }
            if (this.recruiterRestartButton) {
                this.recruiterRestartButton.addEventListener('click', () => this.restartGame());
            }
        }
    }

    setupRecruiterModeTracking() {
        if (!this.recruiterMode) return;

        // Track and PREVENT copy/paste attempts
        this.userFix.addEventListener('paste', (e) => {
            e.preventDefault(); // Empêcher le collage
            this.playerStats.copyPasteDetected = true;
            console.warn('Copy/paste detected in recruiter mode');
            
            // Afficher un message d'avertissement
            this.showError('🚫 Copier/coller détecté ! Cette action est interdite en mode recruteur.');
        });

        // Track keystroke activity
        this.userFix.addEventListener('input', () => {
            if (!this.playerStats.levels[this.currentLevel]) {
                this.playerStats.levels[this.currentLevel] = {
                    keystrokes: 0,
                    attempts: 0,
                    time: 0,
                    hint_used: false
                };
            }
            this.playerStats.levels[this.currentLevel].keystrokes++;
        });

        // Démarrer le chronomètre global
        this.startGlobalTimer();
    }

    startGlobalTimer() {
        if (!this.recruiterMode) return;

        // Créer l'affichage du chronomètre s'il n'existe pas
        if (!document.getElementById('globalTimer')) {
            const timerDiv = document.createElement('div');
            timerDiv.id = 'globalTimer';
            timerDiv.className = 'fixed top-4 right-4 bg-yellow-600 text-black px-4 py-2 rounded-lg font-mono font-bold shadow-lg z-50';
            timerDiv.innerHTML = '⏱️ 00:00';
            document.body.appendChild(timerDiv);
        }

        // Mettre à jour le chronomètre toutes les secondes
        this.timerInterval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - this.playerStats.startTime) / 1000);
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;
            const timerElement = document.getElementById('globalTimer');
            if (timerElement) {
                timerElement.innerHTML = `⏱️ ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }
        }, 1000);
    }

    startLevelTimer() {
        if (!this.recruiterMode || !this.levelStartTime) return;

        // Arrêter le chronomètre précédent s'il existe
        if (this.levelTimerInterval) {
            clearInterval(this.levelTimerInterval);
        }

        // Démarrer le nouveau chronomètre du niveau
        this.levelTimerInterval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - this.levelStartTime) / 1000);
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;
            const levelTimerElement = document.getElementById('levelTimer');
            if (levelTimerElement) {
                levelTimerElement.innerHTML = `⏱️ ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }
        }, 1000);
    }

    showLoading() {
        this.loadingOverlay.classList.remove('hidden');
    }

    hideLoading() {
        this.loadingOverlay.classList.add('hidden');
    }

    async loadLevel(level) {
        try {
            this.showLoading();
            
            const response = await fetch(`/api/level/${level}?lang=${this.currentLanguage}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            this.levelData = await response.json();
            this.renderLevel();
            this.updateProgress();
            this.clearFeedback();
            this.userFix.value = '';
            
            // Start level timing for recruiter mode
            if (this.recruiterMode) {
                this.levelStartTime = Date.now();
                this.levelAttempts = 0;
                if (!this.playerStats.levels[level]) {
                    this.playerStats.levels[level] = {
                        keystrokes: 0,
                        attempts: 0,
                        time: 0,
                        hint_used: false
                    };
                }
                
                // Démarrer le chronomètre du niveau
                this.startLevelTimer();
            }
            
        } catch (error) {
            console.error('Error loading level:', error);
            this.showError('Failed to load level. Please try again.');
        } finally {
            this.hideLoading();
        }
    }

    renderLevel() {
        if (!this.levelData) return;

        // Update level info
        this.levelTitle.textContent = `Level ${this.levelData.id}`;
        this.levelLanguage.textContent = this.levelData.language;
        this.levelDescription.textContent = this.levelData.description;
        this.buggyCode.textContent = this.levelData.code;
        
        // Store hint for later use
        this.hintText.textContent = this.levelData.hint || '';
        
        // Hide hint initially
        this.levelHint.classList.add('hidden');
        
        // Show impossible level warning for level 6
        if (this.currentLevel === 6) {
            this.impossibleLevelWarning.classList.remove('hidden');
            // Update text based on language
            const warningTitle = this.impossibleLevelWarning.querySelector('p.font-semibold');
            const warningText = this.impossibleLevelWarning.querySelector('p.text-sm');
            
            if (this.currentLanguage === 'fr') {
                warningTitle.textContent = 'Niveau Impossible';
                warningText.textContent = 'Seulement 0.1% des joueurs l\'ont réussi.';
            } else {
                warningTitle.textContent = 'Impossible Level';
                warningText.textContent = 'Only 0.1% of players have completed this.';
            }
        } else {
            this.impossibleLevelWarning.classList.add('hidden');
        }
        
        // Update validate button text based on language
        const buttonText = this.currentLanguage === 'fr' ? 'Valider' : 'Validate';
        this.validateButton.textContent = buttonText;
    }

    updateProgress() {
        const progressPercent = Math.round(((this.currentLevel - 1) / this.maxLevels) * 100);
        this.progressBar.style.width = `${progressPercent}%`;
        
        const progressTextContent = this.currentLanguage === 'fr' 
            ? `Niveau ${this.currentLevel}/${this.maxLevels} (${progressPercent}%)`
            : `Level ${this.currentLevel}/${this.maxLevels} (${progressPercent}%)`;
        
        this.progressText.textContent = progressTextContent;
    }

    async validateUserFix() {
        const userCode = this.userFix.value.trim();
        
        if (!userCode) {
            const message = this.currentLanguage === 'fr' 
                ? 'Veuillez entrer votre correction.'
                : 'Please enter your fix.';
            this.showError(message);
            return;
        }

        // Track attempt in recruiter mode
        if (this.recruiterMode && this.playerStats.levels[this.currentLevel]) {
            this.playerStats.levels[this.currentLevel].attempts++;
        }

        try {
            this.validateButton.disabled = true;
            this.validateButton.textContent = this.currentLanguage === 'fr' ? 'Validation...' : 'Validating...';
            
            const response = await fetch(`/api/validate/${this.currentLevel}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    fix: userCode,
                    lang: this.currentLanguage
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            
            if (result.correct) {
                // Record completion time for recruiter mode
                if (this.recruiterMode && this.levelStartTime && this.playerStats.levels[this.currentLevel]) {
                    this.playerStats.levels[this.currentLevel].time = Date.now() - this.levelStartTime;
                    
                    // Arrêter le chronomètre du niveau
                    if (this.levelTimerInterval) {
                        clearInterval(this.levelTimerInterval);
                    }
                }
                
                this.showSuccess(result.message);
                if (this.currentLevel < this.maxLevels) {
                    this.nextLevelButton.classList.remove('hidden');
                } else {
                    this.completeGame();
                }
            } else {
                this.showError(result.message);
                this.userFix.classList.add('shake');
                setTimeout(() => {
                    this.userFix.classList.remove('shake');
                }, 500);
            }
            
        } catch (error) {
            console.error('Error validating fix:', error);
            const errorMessage = this.currentLanguage === 'fr' 
                ? 'Erreur de validation. Veuillez réessayer.'
                : 'Validation error. Please try again.';
            this.showError(errorMessage);
        } finally {
            this.validateButton.disabled = false;
            const buttonText = this.currentLanguage === 'fr' ? 'Valider' : 'Validate';
            this.validateButton.textContent = buttonText;
        }
    }

    showSuccess(message) {
        this.feedbackCard.classList.remove('hidden');
        this.feedbackCard.className = 'bg-green-800 border border-green-700 rounded-lg p-6';
        this.feedbackIcon.textContent = '✅';
        this.feedbackMessage.textContent = message;
        this.feedbackMessage.className = 'font-semibold text-green-100';
        
        // Add bounce animation
        this.feedbackCard.classList.add('bounce');
        setTimeout(() => {
            this.feedbackCard.classList.remove('bounce');
        }, 1000);
    }

    showError(message) {
        this.feedbackCard.classList.remove('hidden');
        this.feedbackCard.className = 'bg-red-800 border border-red-700 rounded-lg p-6';
        this.feedbackIcon.textContent = '❌';
        this.feedbackMessage.textContent = message;
        this.feedbackMessage.className = 'font-semibold text-red-100';
        this.nextLevelButton.classList.add('hidden');
    }

    clearFeedback() {
        this.feedbackCard.classList.add('hidden');
        this.nextLevelButton.classList.add('hidden');
    }

    showHint() {
        if (this.levelData && this.levelData.hint) {
            this.levelHint.classList.remove('hidden');
            this.hintButton.disabled = true;
            this.hintButton.textContent = '💡';
            this.hintButton.className = 'bg-gray-600 text-white font-semibold py-3 px-4 rounded-lg cursor-not-allowed';
            
            // Track hint usage in recruiter mode
            if (this.recruiterMode && this.playerStats.levels[this.currentLevel]) {
                this.playerStats.levels[this.currentLevel].hint_used = true;
            }
        }
    }

    nextLevel() {
        if (this.currentLevel < this.maxLevels) {
            this.currentLevel++;
            this.loadLevel(this.currentLevel);
        }
    }

    completeGame() {
        // Update progress to 100%
        this.progressBar.style.width = '100%';
        const progressTextContent = this.currentLanguage === 'fr' 
            ? `Niveau ${this.maxLevels}/${this.maxLevels} (100%)`
            : `Level ${this.maxLevels}/${this.maxLevels} (100%)`;
        this.progressText.textContent = progressTextContent;
        
        // Complete player stats for recruiter mode
        if (this.recruiterMode) {
            this.playerStats.completed = true;
            this.playerStats.totalTime = Date.now() - this.playerStats.startTime;
            
            // Arrêter tous les chronomètres
            if (this.timerInterval) {
                clearInterval(this.timerInterval);
            }
            if (this.levelTimerInterval) {
                clearInterval(this.levelTimerInterval);
            }
            
            this.showRecruiterCompletionCard();
        } else {
            // Show regular completion card
            this.gameCompleteCard.classList.remove('hidden');
            
            // Update completion message
            const congratsText = this.currentLanguage === 'fr' 
                ? '🎉 Félicitations !'
                : '🎉 Congratulations!';
            const completionText = this.currentLanguage === 'fr' 
                ? 'Vous avez terminé tous les défis de débogage !'
                : 'You\'ve completed all debugging challenges!';
            const restartText = this.currentLanguage === 'fr' 
                ? 'Rejouer'
                : 'Play Again';
            
            this.gameCompleteCard.querySelector('h3').textContent = congratsText;
            this.gameCompleteCard.querySelector('p').textContent = completionText;
            this.restartButton.textContent = restartText;
        }
        
        this.gameCompleted = true;
    }

    showRecruiterCompletionCard() {
        // Hide regular completion card, show recruiter mode card
        this.gameCompleteCard.classList.add('hidden');
        this.recruiterCompleteCard.classList.remove('hidden');
        
        // Calculate and display final stats
        const totalAttempts = Object.values(this.playerStats.levels)
            .reduce((sum, level) => sum + (level.attempts || 0), 0);
        const hintsUsed = Object.values(this.playerStats.levels)
            .filter(level => level.hint_used).length;
        
        this.finalTotalTime.textContent = `${Math.round(this.playerStats.totalTime / 1000)}s`;
        this.finalTotalAttempts.textContent = totalAttempts;
        this.finalHintsUsed.textContent = hintsUsed;
        this.finalCopyPaste.textContent = this.playerStats.copyPasteDetected ? 'Détecté' : 'Non détecté';
        
        // Show cheating warning if detected
        if (this.playerStats.copyPasteDetected) {
            this.cheatingWarning.classList.remove('hidden');
            this.generateCertButton.disabled = true;
            this.generateCertButton.textContent = 'Certificat Indisponible';
        }
    }

    async generateCertificate() {
        const playerName = this.playerNameInput.value.trim();
        
        if (!playerName) {
            alert('Veuillez entrer votre nom et prénom.');
            return;
        }
        
        if (this.playerStats.copyPasteDetected) {
            alert('Certificat non disponible : comportement suspect détecté.');
            return;
        }
        
        try {
            this.generateCertButton.disabled = true;
            this.generateCertButton.textContent = 'Génération...';
            
            const response = await fetch('/certify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: playerName,
                    stats: this.playerStats
                })
            });
            
            const result = await response.json();
            
            if (response.ok && result.success) {
                // Create download link
                const downloadLink = document.createElement('a');
                downloadLink.href = result.download_url;
                downloadLink.download = `certificat-${playerName}.pdf`;
                downloadLink.click();
                
                alert(`Certificat généré avec succès !\nHash de vérification : ${result.hash.substring(0, 16)}...`);
            } else {
                if (result.error === 'cheating_detected') {
                    this.cheatingWarning.classList.remove('hidden');
                    alert(result.message);
                } else {
                    alert('Erreur lors de la génération du certificat.');
                }
            }
        } catch (error) {
            console.error('Error generating certificate:', error);
            alert('Erreur lors de la génération du certificat.');
        } finally {
            this.generateCertButton.disabled = false;
            this.generateCertButton.textContent = 'Générer Mon Certificat Professionnel';
        }
    }

    restartGame() {
        this.currentLevel = 1;
        this.gameCompleted = false;
        this.gameCompleteCard.classList.add('hidden');
        
        // Reset recruiter mode stats
        if (this.recruiterMode) {
            this.recruiterCompleteCard.classList.add('hidden');
            this.cheatingWarning.classList.add('hidden');
            this.playerStats = {
                levels: {},
                totalTime: 0,
                copyPasteDetected: false,
                recruiterMode: this.recruiterMode,
                completed: false,
                startTime: Date.now()
            };
            this.playerNameInput.value = '';
            this.generateCertButton.disabled = false;
            this.generateCertButton.textContent = 'Générer Mon Certificat Professionnel';
            
            // Redémarrer les chronomètres
            if (this.timerInterval) {
                clearInterval(this.timerInterval);
            }
            if (this.levelTimerInterval) {
                clearInterval(this.levelTimerInterval);
            }
            this.startGlobalTimer();
        }
        
        this.loadLevel(this.currentLevel);
    }
}

// Initialize the game when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new DebugGame();
});

// Add some utility functions for enhanced UX
document.addEventListener('keydown', (e) => {
    // Global keyboard shortcuts
    if (e.altKey && e.key === 'h') {
        e.preventDefault();
        document.getElementById('hintButton').click();
    }
    
    if (e.altKey && e.key === 'v') {
        e.preventDefault();
        document.getElementById('validateButton').click();
    }
});

// Add visual feedback for keyboard shortcuts
document.addEventListener('DOMContentLoaded', () => {
    const hintButton = document.getElementById('hintButton');
    const validateButton = document.getElementById('validateButton');
    
    hintButton.title = 'Show hint (Alt+H)';
    validateButton.title = 'Validate solution (Alt+V or Ctrl+Enter in textarea)';
});
