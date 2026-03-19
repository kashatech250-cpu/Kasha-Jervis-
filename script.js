/**
 * KASHA JERVI - AI ASSISTANT
 * Voice-controlled AI assistant with OpenAI integration
 * Created by Tuyisenge Jean Dieu Aime
 */

// ============================================
// CONFIGURATION & STATE
// ============================================

const APP_STATE = {
    isListening: false,
    isSpeaking: false,
    isThinking: false,
    apiKey: localStorage.getItem('kashajervi_api_key') || '',
    conversationHistory: [],
    recognition: null,
    synthesis: window.speechSynthesis
};

// DOM Elements
const elements = {
    clock: document.getElementById('clock'),
    date: document.getElementById('date'),
    statusDot: document.getElementById('status-dot'),
    statusText: document.getElementById('status-text'),
    aiCore: document.getElementById('ai-core'),
    aiStatus: document.getElementById('ai-status'),
    voiceWaves: document.getElementById('voice-waves'),
    micButton: document.getElementById('mic-button'),
    micHint: document.getElementById('mic-hint'),
    apiSetup: document.getElementById('api-setup'),
    apiKeyInput: document.getElementById('api-key-input'),
    saveApiKeyBtn: document.getElementById('save-api-key'),
    conversationHistory: document.getElementById('conversation-history'),
    clearBtn: document.getElementById('clear-btn'),
    loadingOverlay: document.getElementById('loading-overlay'),
    commandHelp: document.getElementById('command-help')
};

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

function initializeApp() {
    // Start clock
    updateClock();
    setInterval(updateClock, 1000);

    // Check for API key
    if (!APP_STATE.apiKey) {
        showApiSetup();
    } else {
        hideApiSetup();
        addSystemMessage('KashaJervi activated. Ready for commands.');
        speak('KashaJervi online. How can I assist you?');
    }

    // Initialize speech recognition
    initializeSpeechRecognition();

    // Event listeners
    elements.micButton.addEventListener('click', toggleListening);
    elements.saveApiKeyBtn.addEventListener('click', saveApiKey);
    elements.clearBtn.addEventListener('click', clearConversation);
    elements.apiKeyInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') saveApiKey();
    });

    // Handle Enter key for API key input
    elements.apiKeyInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            saveApiKey();
        }
    });
}

// ============================================
// CLOCK & DATE
// ============================================

function updateClock() {
    const now = new Date();
    
    // Digital clock
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    elements.clock.textContent = `${hours}:${minutes}:${seconds}`;
    
    // Date
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    elements.date.textContent = now.toLocaleDateString('en-US', options);
}

// ============================================
// API KEY MANAGEMENT
// ============================================

function showApiSetup() {
    elements.apiSetup.classList.remove('hidden');
}

function hideApiSetup() {
    elements.apiSetup.classList.add('hidden');
}

function saveApiKey() {
    const apiKey = elements.apiKeyInput.value.trim();
    
    if (!apiKey) {
        alert('Please enter a valid OpenAI API key');
        return;
    }
    
    if (!apiKey.startsWith('sk-')) {
        alert('Invalid API key format. OpenAI keys start with "sk-"');
        return;
    }
    
    APP_STATE.apiKey = apiKey;
    localStorage.setItem('kashajervi_api_key', apiKey);
    
    hideApiSetup();
    addSystemMessage('API key saved successfully. KashaJervi is now active.');
    speak('KashaJervi online. How can I assist you?');
}

// ============================================
// SPEECH RECOGNITION (Web Speech API)
// ============================================

function initializeSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
        addSystemMessage('Error: Speech recognition not supported in this browser. Please use Chrome.');
        elements.micButton.disabled = true;
        elements.micHint.textContent = 'Speech recognition not available';
        return;
    }
    
    APP_STATE.recognition = new SpeechRecognition();
    APP_STATE.recognition.continuous = false;
    APP_STATE.recognition.interimResults = false;
    APP_STATE.recognition.lang = 'en-US';
    
    APP_STATE.recognition.onstart = () => {
        APP_STATE.isListening = true;
        updateUIState('listening');
        addSystemMessage('Listening...');
    };
    
    APP_STATE.recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        handleUserInput(transcript);
    };
    
    APP_STATE.recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        APP_STATE.isListening = false;
        updateUIState('idle');
        
        let errorMessage = 'Speech recognition error';
        switch(event.error) {
            case 'no-speech':
                errorMessage = 'No speech detected. Please try again.';
                break;
            case 'audio-capture':
                errorMessage = 'No microphone detected. Please check your microphone.';
                break;
            case 'not-allowed':
                errorMessage = 'Microphone access denied. Please allow microphone access.';
                break;
            case 'network':
                errorMessage = 'Network error. Please check your connection.';
                break;
        }
        addSystemMessage(errorMessage);
    };
    
    APP_STATE.recognition.onend = () => {
        APP_STATE.isListening = false;
        if (!APP_STATE.isThinking) {
            updateUIState('idle');
        }
    };
}

function toggleListening() {
    if (!APP_STATE.apiKey) {
        showApiSetup();
        return;
    }
    
    if (APP_STATE.isListening) {
        APP_STATE.recognition.stop();
    } else {
        // Cancel any ongoing speech
        APP_STATE.synthesis.cancel();
        APP_STATE.isSpeaking = false;
        
        try {
            APP_STATE.recognition.start();
        } catch (error) {
            console.error('Error starting recognition:', error);
            addSystemMessage('Error starting speech recognition. Please try again.');
        }
    }
}

// ============================================
// TEXT TO SPEECH
// ============================================

function speak(text) {
    if (!text) return;
    
    // Cancel any ongoing speech
    APP_STATE.synthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;
    utterance.lang = 'en-US';
    
    // Try to use a good voice
    const voices = APP_STATE.synthesis.getVoices();
    const preferredVoice = voices.find(voice => 
        voice.name.includes('Google US English') || 
        voice.name.includes('Samantha') ||
        voice.name.includes('Daniel')
    );
    if (preferredVoice) {
        utterance.voice = preferredVoice;
    }
    
    utterance.onstart = () => {
        APP_STATE.isSpeaking = true;
    };
    
    utterance.onend = () => {
        APP_STATE.isSpeaking = false;
    };
    
    utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event);
        APP_STATE.isSpeaking = false;
    };
    
    APP_STATE.synthesis.speak(utterance);
}

// Load voices when available
if (speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = () => {
        // Voices loaded
    };
}

// ============================================
// USER INPUT HANDLING
// ============================================

async function handleUserInput(text) {
    if (!text.trim()) return;
    
    // Add user message to conversation
    addUserMessage(text);
    
    // Process the command
    const lowerText = text.toLowerCase().trim();
    
    // Check for built-in commands first
    const handled = await processBuiltInCommands(lowerText, text);
    
    if (!handled) {
        // Use OpenAI for other queries
        await processWithOpenAI(text);
    }
}

async function processBuiltInCommands(lowerText, originalText) {
    // Hello
    if (lowerText.includes('hello') || lowerText.includes('hi') || lowerText.includes('hey')) {
        const responses = [
            'Hello! I am KashaJervi, your AI assistant. How can I help you today?',
            'Greetings! KashaJervi at your service.',
            'Hello there! Ready to assist you.'
        ];
        const response = responses[Math.floor(Math.random() * responses.length)];
        addAIMessage(response);
        speak(response);
        return true;
    }
    
    // Who are you
    if (lowerText.includes('who are you') || lowerText.includes('what are you')) {
        const response = 'I am KashaJervi, a futuristic AI assistant designed to help you with information, tasks, and conversation. I am powered by advanced artificial intelligence and created by Tuyisenge Jean Dieu Aime.';
        addAIMessage(response);
        speak(response);
        return true;
    }
    
    // Who created you
    if (lowerText.includes('who created you') || lowerText.includes('who made you') || lowerText.includes('your creator')) {
        const response = 'I am KashaJervi, created by Tuyisenge Jean Dieu Aime.';
        addAIMessage(response);
        speak(response);
        return true;
    }
    
    // What time is it
    if (lowerText.includes('what time') || lowerText.includes('current time')) {
        const now = new Date();
        const timeString = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        const response = `The current time is ${timeString}.`;
        addAIMessage(response);
        speak(response);
        return true;
    }
    
    // Open YouTube
    if (lowerText.includes('open youtube')) {
        const response = 'Opening YouTube for you.';
        addAIMessage(response);
        speak(response);
        setTimeout(() => {
            window.open('https://www.youtube.com', '_blank');
        }, 1000);
        return true;
    }
    
    // Open Google
    if (lowerText.includes('open google')) {
        const response = 'Opening Google for you.';
        addAIMessage(response);
        speak(response);
        setTimeout(() => {
            window.open('https://www.google.com', '_blank');
        }, 1000);
        return true;
    }
    
    // Search for something
    if (lowerText.startsWith('search for') || lowerText.startsWith('search')) {
        let searchQuery = originalText;
        if (lowerText.startsWith('search for')) {
            searchQuery = originalText.replace(/search for/i, '').trim();
        } else if (lowerText.startsWith('search')) {
            searchQuery = originalText.replace(/search/i, '').trim();
        }
        
        if (searchQuery) {
            const response = `Searching for "${searchQuery}" on Google.`;
            addAIMessage(response);
            speak(response);
            setTimeout(() => {
                window.open(`https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`, '_blank');
            }, 1500);
        } else {
            const response = 'What would you like me to search for?';
            addAIMessage(response);
            speak(response);
        }
        return true;
    }
    
    // Tell me a joke
    if (lowerText.includes('joke') || lowerText.includes('funny')) {
        const jokes = [
            'Why do programmers prefer dark mode? Because light attracts bugs!',
            'Why did the AI cross the road? To optimize the path to the other side!',
            'What do you call a fake noodle? An impasta!',
            'Why don\'t scientists trust atoms? Because they make up everything!',
            'What did the ocean say to the beach? Nothing, it just waved!',
            'Why do cows have hooves instead of feet? Because they lactose!',
            'I told my computer I needed a break, and now it won\'t stop sending me Kit-Kats!'
        ];
        const response = jokes[Math.floor(Math.random() * jokes.length)];
        addAIMessage(response);
        speak(response);
        return true;
    }
    
    // Motivate me
    if (lowerText.includes('motivate') || lowerText.includes('inspire') || lowerText.includes('motivation')) {
        const quotes = [
            'The future belongs to those who believe in the beauty of their dreams. - Eleanor Roosevelt',
            'Success is not final, failure is not fatal: it is the courage to continue that counts. - Winston Churchill',
            'The only way to do great work is to love what you do. - Steve Jobs',
            'Believe you can and you\'re halfway there. - Theodore Roosevelt',
            'Your time is limited, don\'t waste it living someone else\'s life. - Steve Jobs',
            'The best way to predict the future is to create it. - Peter Drucker',
            'Every expert was once a beginner. Keep learning, keep growing!'
        ];
        const response = quotes[Math.floor(Math.random() * quotes.length)];
        addAIMessage(response);
        speak(response);
        return true;
    }
    
    // Thank you
    if (lowerText.includes('thank') || lowerText.includes('thanks')) {
        const responses = [
            'You\'re welcome! Always happy to help.',
            'Anytime! That\'s what I\'m here for.',
            'Glad I could assist! Let me know if you need anything else.'
        ];
        const response = responses[Math.floor(Math.random() * responses.length)];
        addAIMessage(response);
        speak(response);
        return true;
    }
    
    // Goodbye
    if (lowerText.includes('goodbye') || lowerText.includes('bye') || lowerText.includes('see you')) {
        const response = 'Goodbye! Have a wonderful day. I\'ll be here whenever you need me.';
        addAIMessage(response);
        speak(response);
        return true;
    }
    
    // Not a built-in command
    return false;
}

// ============================================
// OPENAI INTEGRATION
// ============================================

async function processWithOpenAI(userMessage) {
    showLoading(true);
    updateUIState('thinking');
    
    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${APP_STATE.apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [
                    {
                        role: 'system',
                        content: 'You are KashaJervi, a futuristic AI assistant created by Tuyisenge Jean Dieu Aime. You are helpful, intelligent, and friendly. Keep your responses concise and conversational, suitable for voice output. Avoid using markdown formatting or special characters that would be difficult to speak.'
                    },
                    {
                        role: 'user',
                        content: userMessage
                    }
                ],
                max_tokens: 300,
                temperature: 0.7
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'API request failed');
        }
        
        const data = await response.json();
        const aiResponse = data.choices[0].message.content.trim();
        
        addAIMessage(aiResponse);
        speak(aiResponse);
        
    } catch (error) {
        console.error('OpenAI API error:', error);
        let errorMessage = 'Sorry, I encountered an error processing your request.';
        
        if (error.message.includes('Invalid API key')) {
            errorMessage = 'Invalid API key. Please check your OpenAI API key and try again.';
            showApiSetup();
        } else if (error.message.includes('Rate limit')) {
            errorMessage = 'I\'m experiencing high traffic. Please try again in a moment.';
        } else if (error.message.includes('insufficient_quota')) {
            errorMessage = 'Your OpenAI API quota has been exceeded. Please check your billing settings.';
        }
        
        addAIMessage(errorMessage);
        speak(errorMessage);
    } finally {
        showLoading(false);
        updateUIState('idle');
    }
}

// ============================================
// CONVERSATION MANAGEMENT
// ============================================

function addUserMessage(text) {
    const message = {
        type: 'user',
        text: text,
        timestamp: new Date()
    };
    APP_STATE.conversationHistory.push(message);
    renderMessage(message);
}

function addAIMessage(text) {
    const message = {
        type: 'ai',
        text: text,
        timestamp: new Date()
    };
    APP_STATE.conversationHistory.push(message);
    renderMessage(message);
}

function addSystemMessage(text) {
    const message = {
        type: 'system',
        text: text,
        timestamp: new Date()
    };
    APP_STATE.conversationHistory.push(message);
    renderMessage(message);
}

function renderMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${message.type}-message`;
    
    const timeString = message.timestamp.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    messageDiv.innerHTML = `
        <span class="timestamp">[${timeString}]</span>
        <span class="message-text">${escapeHtml(message.text)}</span>
    `;
    
    elements.conversationHistory.appendChild(messageDiv);
    elements.conversationHistory.scrollTop = elements.conversationHistory.scrollHeight;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function clearConversation() {
    APP_STATE.conversationHistory = [];
    elements.conversationHistory.innerHTML = '';
    addSystemMessage('Conversation history cleared.');
}

// ============================================
// UI STATE MANAGEMENT
// ============================================

function updateUIState(state) {
    // Remove all state classes
    elements.aiCore.classList.remove('listening', 'thinking');
    elements.micButton.classList.remove('listening');
    elements.voiceWaves.classList.remove('active');
    
    switch(state) {
        case 'listening':
            elements.aiCore.classList.add('listening');
            elements.micButton.classList.add('listening');
            elements.voiceWaves.classList.add('active');
            elements.aiStatus.textContent = 'Listening...';
            elements.micHint.textContent = 'Click to stop listening';
            elements.statusText.textContent = 'LISTENING';
            elements.statusDot.style.background = 'var(--accent-color)';
            elements.statusDot.style.boxShadow = '0 0 10px var(--accent-color)';
            break;
            
        case 'thinking':
            elements.aiCore.classList.add('thinking');
            elements.aiStatus.textContent = 'Processing...';
            elements.micHint.textContent = 'AI is thinking...';
            elements.statusText.textContent = 'PROCESSING';
            elements.statusDot.style.background = 'var(--warning-color)';
            elements.statusDot.style.boxShadow = '0 0 10px var(--warning-color)';
            break;
            
        case 'idle':
        default:
            elements.aiStatus.textContent = 'Ready';
            elements.micHint.textContent = 'Click the microphone or say "Hey Kasha"';
            elements.statusText.textContent = 'SYSTEM ONLINE';
            elements.statusDot.style.background = 'var(--success-color)';
            elements.statusDot.style.boxShadow = '0 0 10px var(--success-color)';
            break;
    }
}

function showLoading(show) {
    if (show) {
        elements.loadingOverlay.classList.add('active');
    } else {
        elements.loadingOverlay.classList.remove('active');
    }
}

// ============================================
// KEYBOARD SHORTCUTS
// ============================================

document.addEventListener('keydown', (e) => {
    // Spacebar to toggle listening (when not typing in input)
    if (e.code === 'Space' && document.activeElement !== elements.apiKeyInput) {
        e.preventDefault();
        toggleListening();
    }
    
    // Escape to stop listening
    if (e.code === 'Escape' && APP_STATE.isListening) {
        APP_STATE.recognition.stop();
    }
});

// ============================================
// VISIBILITY API - Pause when tab is hidden
// ============================================

document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Pause speech when tab is hidden
        if (APP_STATE.isSpeaking) {
            APP_STATE.synthesis.pause();
        }
    } else {
        // Resume when tab becomes visible
        if (APP_STATE.isSpeaking) {
            APP_STATE.synthesis.resume();
        }
    }
});

// ============================================
// CONSOLE WELCOME MESSAGE
// ============================================

console.log('%c🔷 KASHA JERVI 🔷', 'color: #00d4ff; font-size: 24px; font-weight: bold;');
console.log('%cAI Assistant created by Tuyisenge Jean Dieu Aime', 'color: #a0a0b0; font-size: 14px;');
console.log('%cVoice-controlled AI powered by OpenAI', 'color: #00ff88; font-size: 12px;');
