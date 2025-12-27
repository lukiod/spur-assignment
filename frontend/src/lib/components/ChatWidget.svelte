<script lang="ts">
  import { onMount } from 'svelte';
  import MessageBubble from './MessageBubble.svelte';
  import TypingIndicator from './TypingIndicator.svelte';
  import { api, type Message } from '$lib/api';

  let messages: Message[] = [];
  let inputMessage = '';
  let sessionId: string | null = null;
  let isLoading = false;
  let error: string | null = null;
  let messagesContainer: HTMLDivElement;
  let inputElement: HTMLTextAreaElement;

  // Load session from localStorage
  onMount(async () => {
    const savedSessionId = localStorage.getItem('chatSessionId');
    if (savedSessionId) {
      try {
        const history = await api.getHistory(savedSessionId);
        messages = history.messages.map(msg => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
        sessionId = savedSessionId;
        scrollToBottom();
      } catch (err) {
        console.error('Failed to load history:', err);
        // Start fresh if history fails to load
        localStorage.removeItem('chatSessionId');
      }
    }

    // Show welcome message if no history
    if (messages.length === 0) {
      messages = [
        {
          sender: 'ai',
          text: 'Hi! 👋 Welcome to ShopEase support. How can I help you today?',
          timestamp: new Date()
        }
      ];
    }
  });

  function scrollToBottom() {
    setTimeout(() => {
      if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
    }, 50);
  }

  async function handleSend() {
    const trimmed = inputMessage.trim();
    if (!trimmed || isLoading) return;

    if (trimmed.length > 1000) {
      error = 'Message is too long. Please keep it under 1000 characters.';
      return;
    }

    error = null;
    const userMessage: Message = {
      sender: 'user',
      text: trimmed,
      timestamp: new Date()
    };

    messages = [...messages, userMessage];
    inputMessage = '';
    isLoading = true;
    scrollToBottom();

    // Auto-resize textarea
    if (inputElement) {
      inputElement.style.height = 'auto';
    }

    try {
      const response = await api.sendMessage(trimmed, sessionId || undefined);
      
      // Save session ID
      sessionId = response.sessionId;
      localStorage.setItem('chatSessionId', sessionId);

      // Add AI response
      const aiMessage: Message = {
        sender: 'ai',
        text: response.reply,
        timestamp: new Date()
      };
      messages = [...messages, aiMessage];
      scrollToBottom();
    } catch (err: any) {
      error = err.message || 'Failed to send message. Please try again.';
      console.error('Send error:', err);
    } finally {
      isLoading = false;
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleNewChat() {
    messages = [
      {
        sender: 'ai',
        text: 'Hi! 👋 Welcome to ShopEase support. How can I help you today?',
        timestamp: new Date()
      }
    ];
    sessionId = null;
    localStorage.removeItem('chatSessionId');
    inputMessage = '';
    error = null;
  }

  function autoResize() {
    if (inputElement) {
      inputElement.style.height = 'auto';
      inputElement.style.height = Math.min(inputElement.scrollHeight, 120) + 'px';
    }
  }

  $: characterCount = inputMessage.length;
  $: isNearLimit = characterCount > 800;
</script>

<div class="chat-widget">
  <!-- Header -->
  <div class="header">
    <div class="header-content">
      <div class="header-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      </div>
      <div class="header-text">
        <h1>ShopEase Support</h1>
        <p>AI Assistant • Always Available</p>
      </div>
    </div>
    <button class="new-chat-btn" on:click={handleNewChat} title="Start new conversation">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="12" y1="5" x2="12" y2="19"/>
        <line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
    </button>
  </div>

  <!-- Messages -->
  <div class="messages" bind:this={messagesContainer}>
    {#each messages as message (message.timestamp.getTime())}
      <MessageBubble 
        sender={message.sender}
        text={message.text}
        timestamp={message.timestamp}
      />
    {/each}
    
    {#if isLoading}
      <TypingIndicator />
    {/if}
  </div>

  <!-- Error Message -->
  {#if error}
    <div class="error-banner">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <span>{error}</span>
      <button on:click={() => error = null}>×</button>
    </div>
  {/if}

  <!-- Input -->
  <div class="input-container">
    <div class="input-wrapper">
      <textarea
        bind:this={inputElement}
        bind:value={inputMessage}
        on:keydown={handleKeyDown}
        on:input={autoResize}
        placeholder="Ask about shipping, returns, or anything else..."
        disabled={isLoading}
        rows="1"
      />
      {#if isNearLimit}
        <span class="char-counter" class:warning={characterCount > 950}>
          {characterCount}/1000
        </span>
      {/if}
    </div>
    <button 
      class="send-btn" 
      on:click={handleSend}
      disabled={!inputMessage.trim() || isLoading}
      title="Send message (Enter)"
    >
      {#if isLoading}
        <div class="spinner"></div>
      {:else}
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="22" y1="2" x2="11" y2="13"/>
          <polygon points="22 2 15 22 11 13 2 9 22 2"/>
        </svg>
      {/if}
    </button>
  </div>
</div>

<style>
  .chat-widget {
    width: 100%;
    max-width: 800px;
    height: 90vh;
    max-height: 700px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-xl);
    overflow: hidden;
    animation: fadeIn 0.5s ease-out;
  }

  /* Header */
  .header {
    background: var(--gradient-primary);
    color: white;
    padding: 1.25rem 1.5rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    box-shadow: var(--shadow-md);
  }

  .header-content {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .header-icon {
    width: 48px;
    height: 48px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .header-text h1 {
    font-size: 1.25rem;
    font-weight: 600;
    margin: 0;
  }

  .header-text p {
    font-size: 0.875rem;
    margin: 0;
    opacity: 0.9;
  }

  .new-chat-btn {
    width: 40px;
    height: 40px;
    background: rgba(255, 255, 255, 0.2);
    border: none;
    border-radius: 50%;
    color: white;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  }

  .new-chat-btn:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: rotate(90deg);
  }

  /* Messages */
  .messages {
    flex: 1;
    overflow-y: auto;
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
  }

  /* Error Banner */
  .error-banner {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.875rem 1rem;
    margin: 0 1.5rem;
    background: #fee;
    border: 1px solid #fcc;
    border-radius: var(--radius-md);
    color: #c33;
    font-size: 0.875rem;
    animation: slideIn 0.3s ease-out;
  }

  .error-banner button {
    margin-left: auto;
    background: none;
    border: none;
    color: #c33;
    font-size: 1.5rem;
    line-height: 1;
    cursor: pointer;
    padding: 0;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* Input */
  .input-container {
    padding: 1.25rem 1.5rem;
    border-top: 1px solid rgba(0, 0, 0, 0.1);
    display: flex;
    gap: 0.75rem;
    background: white;
  }

  .input-wrapper {
    flex: 1;
    position: relative;
  }

  textarea {
    width: 100%;
    padding: 0.875rem 1rem;
    border: 2px solid rgba(102, 126, 234, 0.2);
    border-radius: var(--radius-lg);
    font-family: inherit;
    font-size: 0.9375rem;
    resize: none;
    outline: none;
    transition: border-color 0.2s;
    min-height: 48px;
    max-height: 120px;
  }

  textarea:focus {
    border-color: var(--color-primary);
  }

  textarea:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .char-counter {
    position: absolute;
    bottom: 0.5rem;
    right: 0.75rem;
    font-size: 0.75rem;
    color: var(--color-text-light);
  }

  .char-counter.warning {
    color: #f56565;
    font-weight: 600;
  }

  .send-btn {
    width: 48px;
    height: 48px;
    background: var(--gradient-primary);
    border: none;
    border-radius: var(--radius-lg);
    color: white;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    flex-shrink: 0;
  }

  .send-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: var(--shadow-lg);
  }

  .send-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .spinner {
    width: 20px;
    height: 20px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateX(-20px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @media (max-width: 640px) {
    .chat-widget {
      max-width: 100%;
      height: 100vh;
      max-height: 100vh;
      border-radius: 0;
    }

    .header {
      padding: 1rem;
    }

    .header-text h1 {
      font-size: 1.125rem;
    }

    .messages {
      padding: 1rem;
    }

    .input-container {
      padding: 1rem;
    }
  }
</style>

