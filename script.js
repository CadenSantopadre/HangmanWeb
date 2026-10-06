// Global variable to hold our loaded word list
let dictionary = [];

// Fetch and parse the JSON dictionary on page load
window.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('dictionary.json');
        const data = await response.json();
        
        // Extract words from JSON keys
        dictionary = Object.keys(data).map(word => word.trim().toLowerCase());
        console.log(`Loaded ${dictionary.length} words from JSON!`);
    } catch (error) {
        console.error("Failed to load dictionary.json:", error);
    }
});

const countForm = document.getElementById('letter-count-form');
const setupContainer = document.getElementById('setup-container');
const solverContainer = document.getElementById('solver-container');
const patternDisplay = document.getElementById('pattern-display');
const wrongLettersInput = document.getElementById('wrong-letters');
const letterSuggestions = document.getElementById('letter-suggestions');
const wordMatches = document.getElementById('word-matches');
const resetBtn = document.getElementById('reset-btn');

let wordLength = 0;

countForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    wordLength = parseInt(formData.get('count'), 10);

    if (wordLength > 0) {
        patternDisplay.value = "_".repeat(wordLength);
        patternDisplay.maxLength = wordLength;
        
        setupContainer.classList.add('hidden');
        solverContainer.classList.remove('hidden');
        
        updatePredictions();
    }
});

patternDisplay.addEventListener('input', updatePredictions);
wrongLettersInput.addEventListener('input', updatePredictions);

function updatePredictions() {
    let pattern = patternDisplay.value.toLowerCase();
    
    if (pattern.length < wordLength) {
        pattern = pattern + "_".repeat(wordLength - pattern.length);
    }

    // Clean up user inputs
    const wrongLetters = wrongLettersInput.value.toLowerCase().replace(/[^a-z]/g, '').split('');
    const correctLetters = pattern.split('').filter(char => char !== '_');

    // 1. Strict Structural Filtering (Handles structural roots/suffixes implicitly)
    const matches = dictionary.filter(word => {
        if (word.length !== wordLength) return false;
        
        for (let i = 0; i < wordLength; i++) {
            const patternChar = pattern[i];
            if (patternChar !== '_') {
                if (word[i] !== patternChar) return false;
            } else {
                // If this slot is blank, the word can't have a known wrong letter here
                if (wrongLetters.includes(word[i])) return false;
                // Important Hangman Rule: If we found all 'E's, a blank slot CANNOT be an 'E'
                if (correctLetters.includes(word[i])) return false;
            }
        }
        return true;
    });

    // 2. Position-Aware and Strategy Frequency Mapping
    const letterWeights = {};
    const vowels = ['a', 'e', 'i', 'o', 'u'];
    
    // Check how many vowels have already been successfully uncovered
    const discoveredVowelsCount = correctLetters.filter(char => vowels.includes(char)).length;

    matches.forEach(word => {
        const lettersInWord = word.split('');
        const uniqueLetters = new Set(lettersInWord);

        uniqueLetters.forEach(char => {
            // Skip letters already processed
            if (pattern.includes(char) || wrongLetters.includes(char)) return;

            if (!letterWeights[char]) letterWeights[char] = 0;

            // Base weight: +1 for appearing in a valid word
            let weight = 1;

            // AI Strat A: Reward positional trends (detects roots like -ing, -ed, un- automatically)
            for (let i = 0; i < wordLength; i++) {
                if (pattern[i] === '_' && word[i] === char) {
                    weight += 0.5; // Extra weight if this letter frequently solves this exact blank space
                }
            }

            // AI Strat B: Dynamic Vowel Tuning
            if (vowels.includes(char)) {
                if (discoveredVowelsCount >= 2) {
                    // We already found vowels! Penalize remaining vowels slightly to favor game-winning consonants
                    weight *= 0.5;
                } else {
                    // Vowels are missing! Boost their priority to uncover the word framework
                    weight *= 1.5;
                }
            }

            letterWeights[char] += weight;
        });
    });

    // Sort letters based on our complex algorithmic weight
    const sortedLetters = Object.keys(letterWeights).sort((a, b) => letterWeights[b] - letterWeights[a]);

    // 3. Keep the UI ultra-fast and descriptive
    const displayMatches = matches.slice(0, 50);
    const hiddenCount = matches.length - displayMatches.length;

    wordMatches.textContent = matches.length > 0 
        ? displayMatches.join(', ') + (hiddenCount > 0 ? ` ...and ${hiddenCount} more matches` : '')
        : "No matches found in your JSON dictionary.";
        
    letterSuggestions.textContent = sortedLetters.length > 0 
        ? sortedLetters.join(', ').toUpperCase() 
        : "No logical guesses left.";
}

resetBtn.addEventListener('click', () => {
    countForm.reset();
    wrongLettersInput.value = '';
    setupContainer.classList.remove('hidden');
    solverContainer.classList.add('hidden');
});
