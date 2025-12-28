<script lang="ts">
  export let sender: 'user' | 'ai';
  export let text: string;
  export let timestamp: Date;

  $: formattedTime = new Date(timestamp).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
</script>

<div class="message {sender}" class:user={sender === 'user'} class:ai={sender === 'ai'}>
  <div class="bubble">
    <p>{text}</p>
    <span class="timestamp">{formattedTime}</span>
  </div>
</div>

<style>
  .message {
    display: flex;
    margin-bottom: 1rem;
    animation: fadeIn 0.3s ease-out;
  }

  .message.user {
    justify-content: flex-end;
  }

  .message.ai {
    justify-content: flex-start;
  }

  .bubble {
    max-width: 70%;
    padding: 0.875rem 1.125rem;
    border-radius: var(--radius-lg);
    position: relative;
    word-wrap: break-word;
    box-shadow: var(--shadow-md);
    transition: transform 0.2s, box-shadow 0.2s;
  }

  .bubble:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-lg);
  }

  .user .bubble {
    background: var(--color-bg-user);
    color: var(--color-text-white);
    border-bottom-right-radius: 0.25rem;
  }

  .ai .bubble {
    background: var(--color-bg-ai);
    color: var(--color-text-dark);
    border-bottom-left-radius: 0.25rem;
    border: 1px solid rgba(102, 126, 234, 0.1);
  }

  p {
    margin: 0;
    line-height: 1.5;
    font-size: 0.9375rem;
  }

  .timestamp {
    display: block;
    margin-top: 0.5rem;
    font-size: 0.75rem;
    opacity: 0;
    transition: opacity 0.2s;
  }

  .user .timestamp {
    color: rgba(255, 255, 255, 0.8);
    text-align: right;
  }

  .ai .timestamp {
    color: var(--color-text-light);
    text-align: left;
  }

  .bubble:hover .timestamp {
    opacity: 1;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @media (max-width: 640px) {
    .bubble {
      max-width: 85%;
      padding: 0.75rem 1rem;
    }

    p {
      font-size: 0.875rem;
    }
  }
</style>



