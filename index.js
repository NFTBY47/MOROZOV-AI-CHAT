const API_KEY = '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';
const API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Получаем элементы интерфейса
const chatContainer = document.getElementById('chatContainer');
const userInput = document.getElementById('userInput');
const sendButton = document.getElementById('sendButton');
const clearChatButton = document.getElementById('clearChat');

let conversationHistory = [];
let isWaitingForResponse = false;

// Инициализация приложения
function init() {
    sendButton.addEventListener('click', sendMessage);
    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    clearChatButton.addEventListener('click', clearChat);
    userInput.addEventListener('input', updateSendButtonState);
    
    loadHistory();
    updateSendButtonState();
}

// Отправка сообщения (ОСНОВНОЙ ИСПРАВЛЕННЫЙ МЕТОД)
async function sendMessage() {
    const message = userInput.value.trim();
    if (!message || isWaitingForResponse) return;

    addMessage(message, 'user');
    userInput.value = '';
    isWaitingForResponse = true;
    updateSendButtonState();
    
    const loadingId = showLoadingIndicator();
    
    try {
        conversationHistory.push({ role: 'user', content: message });
        
        // КРИТИЧЕСКИ ВАЖНЫЕ ЗАГОЛОВКИ
        const headers = {
            'Authorization': `Bearer ${API_KEY}`,
            'HTTP-Referer': window.location.href, // Текущий URL
            'X-Title': 'AI Chat App',
            'Content-Type': 'application/json'
        };

        console.log('Отправляемые заголовки:', headers); // Для отладки
        
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                model: "openchat/openchat-7b",
                messages: conversationHistory,
                temperature: 0.7,
                max_tokens: 1000
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.choices?.[0]?.message?.content) {
            throw new Error('Неверный формат ответа от API');
        }

        const botResponse = data.choices[0].message.content;
        conversationHistory.push({ role: 'assistant', content: botResponse });
        saveHistory();
        
        addMessage(botResponse, 'bot');
    } catch (error) {
        console.error('API Error:', error);
        addMessage(`Ошибка: ${error.message}. Пожалуйста, попробуйте еще раз.`, 'bot');
    } finally {
        hideLoadingIndicator(loadingId);
        isWaitingForResponse = false;
        updateSendButtonState();
    }
}

// Вспомогательные функции
function addMessage(text, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;
    messageDiv.innerHTML = `
        <div class="message-content">${formatMessageText(text)}</div>
        <span class="message-time">${getCurrentTime()}</span>
    `;
    chatContainer.appendChild(messageDiv);
    scrollToBottom();
}

function formatMessageText(text) {
    return text
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br>');
}

function showLoadingIndicator() {
    const loadingId = `loading-${Date.now()}`;
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'message bot-message';
    loadingDiv.id = loadingId;
    loadingDiv.innerHTML = `
        <div class="loading-dots">
            <div></div>
            <div></div>
            <div></div>
        </div>
    `;
    chatContainer.appendChild(loadingDiv);
    scrollToBottom();
    return loadingId;
}

function hideLoadingIndicator(id) {
    const loadingElement = document.getElementById(id);
    if (loadingElement) loadingElement.remove();
}

function updateSendButtonState() {
    sendButton.disabled = userInput.value.trim() === '' || isWaitingForResponse;
}

function scrollToBottom() {
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function getCurrentTime() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function clearChat() {
    if (isWaitingForResponse || !confirm('Очистить историю чата?')) return;
    
    chatContainer.innerHTML = `
        <div class="welcome-message">
            <h2>Как я могу вам помочь?</h2>
            <p>Задайте вопрос, и я постараюсь ответить</p>
        </div>
    `;
    conversationHistory = [];
    localStorage.removeItem('chatHistory');
}

function saveHistory() {
    try {
        localStorage.setItem('chatHistory', JSON.stringify(conversationHistory));
    } catch (e) {
        console.error('Ошибка сохранения:', e);
    }
}

function loadHistory() {
    try {
        const savedHistory = localStorage.getItem('chatHistory');
        if (savedHistory) {
            conversationHistory = JSON.parse(savedHistory);
            conversationHistory.forEach(msg => {
                if (msg.role && msg.content) {
                    addMessage(msg.content, msg.role === 'user' ? 'user' : 'bot');
                }
            });
            if (conversationHistory.length > 0) {
                document.querySelector('.welcome-message')?.remove();
            }
        }
    } catch (e) {
        console.error('Ошибка загрузки:', e);
    }
}

// Запуск приложения
document.addEventListener('DOMContentLoaded', init);
