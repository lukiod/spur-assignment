<script lang="ts">
</script>

<div class="typing-indicator">
  <span class="dot"></span>
  <span class="dot"></span>
  <span class="dot"></span>
</div>

<style>
  .typing-indicator {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.875rem 1.125rem;
    background: var(--color-bg-ai);
    border-radius: var(--radius-lg);
    border-bottom-left-radius: 0.25rem;
    box-shadow: var(--shadow-md);
    max-width: fit-content;
    border: 1px solid rgba(102, 126, 234, 0.1);
    animation: fadeIn 0.3s ease-out;
  }

  .dot {
    width: 8px;
    height: 8px;
    background: var(--color-primary);
    border-radius: 50%;
    animation: bounce 1.4s infinite ease-in-out both;
  }

  .dot:nth-child(1) {
    animation-delay: -0.32s;
  }

  .dot:nth-child(2) {
    animation-delay: -0.16s;
  }

  @keyframes bounce {
    0%, 80%, 100% {
      transform: scale(0);
      opacity: 0.5;
    }
    40% {
      transform: scale(1);
      opacity: 1;
    }
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
</style>



