<script lang="ts">
  import ChatWidget from '$lib/components/ChatWidget.svelte';
  import '../app.css';
</script>

<svelte:head>
  <title>ShopEase - AI Support Chat</title>
  <meta name="description" content="Get instant help from our AI support agent" />
</svelte:head>

<main>
  <ChatWidget />
</main>

<style>
  main {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    background: var(--gradient-bg);
  }

  @media (max-width: 640px) {
    main {
      padding: 0;
    }
  }
</style>

