<script lang="ts">
  import { onMount } from 'svelte';
  import { electronApi } from '$lib/api';
  import type { EntryDetail, EntrySummary } from '../../../../electron/api-types';
  
  // URLから直接projectIdを取得
  const getProjectIdFromUrl = (): string => {
    const pathParts = window.location.pathname.split('/');
    return pathParts[pathParts.length - 1];
  };

  let projectId = $state('');
  let entries: EntrySummary[] = $state([]);
  let selectedEntry: EntryDetail | null = $state(null);
  let isNewEntry = $state(true);
  let loading = $state(true);
  let searchQuery = $state('');
  let activeTab: 'edit' | 'preview' = $state('edit');

  // 編集フォーム
  let editTitle = $state('');
  let editBody = $state('');
  let editIsStarred = $state(false);

  onMount(async () => {
    projectId = getProjectIdFromUrl();
    await loadEntries();
  });

  async function loadEntries() {

    if (!projectId) {
      console.warn('projectId is empty, skipping loadEntries');
      return;
    }

    try {
      loading = true;
      const result = await electronApi.entries.list({
        project_id: projectId,
        query: searchQuery || undefined
      });
      entries = result.entries;
    } catch (error) {
      console.error('Failed to load entries:', error);
      alert('履歴の読み込みに失敗しました');
    } finally {
      loading = false;
    }
  }

  async function selectEntry(id: string) {
    try {
      const result = await electronApi.entries.get(id);
      selectedEntry = result.entry;
      editTitle = result.entry.title || '';
      editBody = result.entry.body_markdown;
      editIsStarred = result.entry.is_starred;
      isNewEntry = false;
      activeTab = 'edit';
    } catch (error) {
      console.error('Failed to load entry:', error);
      alert('エントリの読み込みに失敗しました');
    }
  }

  function startNewEntry() {
    selectedEntry = null;
    editTitle = '';
    editBody = '';
    editIsStarred = false;
    isNewEntry = true;
    activeTab = 'edit';
  }

  async function saveEntry() {
    if (!editBody.trim()) {
      alert('プロンプト本文を入力してください');
      return;
    }

    if (!projectId) {
      alert('プロジェクトIDが取得できませんでした。ページを再読み込みしてください。');
      console.error('projectId is empty');
      return;
    }

    try {
      const result = await electronApi.entries.upsert({
        id: isNewEntry ? undefined : selectedEntry?.id,
        project_id: projectId,
        title: editTitle || undefined,
        body_markdown: editBody,
        is_starred: editIsStarred
      });
      
      if (!result || !result.id) {
        alert('保存に失敗しました（レスポンスが不正です）');
        return;
      }
      await loadEntries();
      
      // 保存後、そのエントリを選択状態にする
      await selectEntry(result.id);
      
    } catch (error) {
      console.error('Failed to save entry:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      alert(`保存に失敗しました\n\n${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async function deleteEntry() {
    if (!selectedEntry) return;
    if (!confirm('このエントリを削除しますか？')) return;

    try {
      await electronApi.entries.delete(selectedEntry.id);
      await loadEntries();
      startNewEntry();
    } catch (error) {
      console.error('Failed to delete entry:', error);
      alert('削除に失敗しました');
    }
  }

  async function toggleStar() {
    if (!selectedEntry) return;

    try {
      const newStarred = !editIsStarred;
      await electronApi.entries.toggleStar(selectedEntry.id, newStarred);
      editIsStarred = newStarred;
      await loadEntries();
    } catch (error) {
      console.error('Failed to toggle star:', error);
    }
  }

  function copyToClipboard() {
    navigator.clipboard.writeText(editBody);
    alert('クリップボードにコピーしました');
  }

  function formatDate(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleDateString('ja-JP', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // 検索時に再読み込み
  $effect(() => {
    if (searchQuery !== undefined) {
      loadEntries();
    }
  });
</script>

<div class="project-detail">
  <header class="header">
    <button class="btn btn-secondary back-btn" onclick={() => window.location.href = '/'}>
      ← 戻る
    </button>
    <input
      type="search"
      placeholder="検索..."
      bind:value={searchQuery}
      class="search-input"
    />
  </header>

  <div class="content">
    <!-- 左ペイン：履歴一覧 -->
    <aside class="sidebar">
      <div class="sidebar-header">
        <h2>履歴</h2>
        <button class="btn btn-primary btn-sm" onclick={startNewEntry}>
          ＋ 新規
        </button>
      </div>

      <div class="entries-list">
        {#if loading}
          <p class="loading">読み込み中...</p>
        {:else if entries.length === 0}
          <p class="empty">履歴がありません</p>
        {:else}
          {#each entries as entry (entry.id)}
            <button
              class="entry-item"
              class:active={selectedEntry?.id === entry.id}
              onclick={() => selectEntry(entry.id)}
            >
              <div class="entry-header">
                {#if entry.is_starred}
                  <span class="star">⭐</span>
                {/if}
                <span class="entry-title">
                  {entry.title || '無題'}
                </span>
              </div>
              <div class="entry-meta">
                {formatDate(entry.updated_at)}
              </div>
              <div class="entry-snippet">
                {entry.snippet}...
              </div>
            </button>
          {/each}
        {/if}
      </div>
    </aside>

    <!-- 右ペイン：編集エリア -->
    <main class="main-content">
      <div class="tabs">
        <button
          class="tab"
          class:active={activeTab === 'edit'}
          onclick={() => activeTab = 'edit'}
        >
          編集
        </button>
        <button
          class="tab"
          class:active={activeTab === 'preview'}
          onclick={() => activeTab = 'preview'}
        >
          プレビュー
        </button>
      </div>

      <div class="editor-area">
        {#if activeTab === 'edit'}
          <div class="edit-form">
            <input
              type="text"
              placeholder="タイトル（任意）"
              bind:value={editTitle}
              class="title-input"
            />

            <textarea
              placeholder="プロンプトをMarkdown形式で入力..."
              bind:value={editBody}
              class="body-textarea"
            ></textarea>

            <div class="actions">
              <div class="actions-left">
                <button class="btn btn-primary" onclick={saveEntry}>
                  💾 保存
                </button>
                <button class="btn btn-secondary" onclick={copyToClipboard}>
                  📋 コピー
                </button>
                {#if !isNewEntry}
                  <button class="btn btn-secondary" onclick={toggleStar}>
                    {editIsStarred ? '⭐' : '☆'} スター
                  </button>
                {/if}
              </div>

              <div class="actions-right">
                {#if !isNewEntry}
                  <button class="btn btn-danger" onclick={deleteEntry}>
                    🗑️ 削除
                  </button>
                {/if}
                <button class="btn btn-secondary" onclick={startNewEntry}>
                  📄 新規クリア
                </button>
              </div>
            </div>
          </div>
        {:else}
          <div class="preview-area">
            <div class="preview-content">
              {#if editTitle}
                <h1>{editTitle}</h1>
              {/if}
              <div class="markdown-body">
                {@html editBody
                  .replace(/&/g, '&amp;')
                  .replace(/</g, '&lt;')
                  .replace(/>/g, '&gt;')
                  .replace(/\n/g, '<br>')}
              </div>
            </div>
            <div class="preview-actions">
              <button class="btn btn-secondary" onclick={copyToClipboard}>
                📋 コピー
              </button>
            </div>
          </div>
        {/if}
      </div>
    </main>
  </div>
</div>

<style>
  .project-detail {
    display: flex;
    flex-direction: column;
    height: 100vh;
  }

  .header {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem 1.5rem;
    background-color: white;
    border-bottom: 1px solid var(--color-border);
  }

  .back-btn {
    flex-shrink: 0;
  }

  .search-input {
    flex: 1;
    max-width: 400px;
    padding: 0.5rem 1rem;
    border: 1px solid var(--color-border);
    border-radius: 4px;
  }

  .content {
    display: flex;
    flex: 1;
    overflow: hidden;
  }

  /* 左ペイン */
  .sidebar {
    width: 300px;
    border-right: 1px solid var(--color-border);
    display: flex;
    flex-direction: column;
    background-color: var(--color-bg-secondary);
  }

  .sidebar-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    border-bottom: 1px solid var(--color-border);
  }

  .sidebar-header h2 {
    font-size: 1.125rem;
    font-weight: 600;
  }

  .btn-sm {
    padding: 0.375rem 0.75rem;
    font-size: 0.8125rem;
  }

  .entries-list {
    flex: 1;
    overflow-y: auto;
  }

  .loading, .empty {
    padding: 2rem 1rem;
    text-align: center;
    color: var(--color-text-secondary);
  }

  .entry-item {
    width: 100%;
    padding: 1rem;
    border: none;
    border-bottom: 1px solid var(--color-border);
    background-color: white;
    text-align: left;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .entry-item:hover {
    background-color: var(--color-bg-secondary);
  }

  .entry-item.active {
    background-color: #e7f3ff;
    border-left: 3px solid var(--color-primary);
  }

  .entry-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.25rem;
  }

  .star {
    font-size: 0.875rem;
  }

  .entry-title {
    font-weight: 600;
    font-size: 0.9375rem;
  }

  .entry-meta {
    font-size: 0.75rem;
    color: var(--color-text-secondary);
    margin-bottom: 0.25rem;
  }

  .entry-snippet {
    font-size: 0.8125rem;
    color: var(--color-text-secondary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* 右ペイン */
  .main-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .tabs {
    display: flex;
    border-bottom: 1px solid var(--color-border);
    background-color: white;
  }

  .tab {
    padding: 0.75rem 1.5rem;
    border: none;
    background: none;
    font-weight: 500;
    color: var(--color-text-secondary);
    border-bottom: 2px solid transparent;
    transition: all 0.2s;
  }

  .tab:hover {
    color: var(--color-text);
  }

  .tab.active {
    color: var(--color-primary);
    border-bottom-color: var(--color-primary);
  }

  .editor-area {
    flex: 1;
    overflow: hidden;
  }

  .edit-form {
    height: 100%;
    display: flex;
    flex-direction: column;
    padding: 1.5rem;
    gap: 1rem;
  }

  .title-input {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    font-size: 1.125rem;
    font-weight: 600;
  }

  .body-textarea {
    flex: 1;
    padding: 1rem;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    font-family: 'Courier New', monospace;
    font-size: 0.9375rem;
    resize: none;
  }

  .actions {
    display: flex;
    justify-content: space-between;
    gap: 0.75rem;
  }

  .actions-left, .actions-right {
    display: flex;
    gap: 0.75rem;
  }

  /* プレビュー */
  .preview-area {
    height: 100%;
    display: flex;
    flex-direction: column;
    padding: 1.5rem;
    gap: 1rem;
  }

  .preview-content {
    flex: 1;
    overflow-y: auto;
    padding: 1.5rem;
    background-color: white;
    border: 1px solid var(--color-border);
    border-radius: 4px;
  }

  .preview-content h1 {
    font-size: 1.5rem;
    margin-bottom: 1rem;
  }

  .markdown-body {
    line-height: 1.8;
    white-space: pre-wrap;
  }

  .preview-actions {
    display: flex;
    gap: 0.75rem;
  }
</style>
