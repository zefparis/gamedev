class DebugGame {
    constructor() {
        this.currentLevel = 1;
        this.maxLevels = 5;
        this.currentLanguage = 'fr';
        this.levelData = null;
        this.gameCompleted = false;
        
        this.initializeElements();
        this.bindEvents();
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

        // Enter key in textarea
        this.userFix.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'Enter') {
                e.preventDefault();
                this.validateUserFix();
            }
        });
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
        
        // Show completion card
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
        
        this.gameCompleted = true;
    }

    restartGame() {
        this.currentLevel = 1;
        this.gameCompleted = false;
        this.gameCompleteCard.classList.add('hidden');
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
