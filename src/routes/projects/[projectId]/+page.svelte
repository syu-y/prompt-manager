<script lang="ts">
  import { onMount } from 'svelte';
  import { marked } from 'marked';
  import { electronApi } from '$lib/api';
  import type { EntryDetail, EntrySummary, ProjectSummary, Tag, Template } from '../../../../electron/api-types';
  
  // Markdownパーサーの設定
  marked.setOptions({
    breaks: true, // 改行を<br>に変換
    gfm: true, // GitHub Flavored Markdown
  });
  
  // URLから直接projectIdを取得
  const getProjectIdFromUrl = (): string => {
    const pathParts = window.location.pathname.split('/');
    return pathParts[pathParts.length - 1];
  };

  let projectId = $state('');
  let projectName = $state('');
  let projects: ProjectSummary[] = $state([]);
  let entries: EntrySummary[] = $state([]);
  let selectedEntry: EntryDetail | null = $state(null);
  let isNewEntry = $state(true);
  let loading = $state(true);
  let searchQuery = $state('');
  let isExporting = $state(false);

  // ソート機能
  let sortBy = $state<'title' | 'created' | 'updated' | 'starred'>('created');
  let sortOrder = $state<'asc' | 'desc'>('desc');

  // サイドバー開閉
  let sidebarOpen = $state(true);

  // タグ関連
  let allTags: Tag[] = $state([]);
  let selectedTagIds: string[] = $state([]);

  // テンプレート関連
  let templates: Template[] = $state([]);
  let selectedTemplate: string = $state('');
  let templateIds: string[] = $state([]);

  // 編集フォーム
  let editTitle = $state('');
  let editBody = $state('');
  let editIsStarred = $state(false);
  let editIsLocked = $state(false);

  // Markdownをリアクティブに変換
  let renderedMarkdown = $derived(
    editBody ? marked(editBody) as string : ''
  );

  // ソート済みエントリリスト
  let sortedEntries = $derived(() => {
    const entriesCopy = [...entries];
    
    // ソート処理
    entriesCopy.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'title':
          const titleA = (a.title || '無題').toLowerCase();
          const titleB = (b.title || '無題').toLowerCase();
          comparison = titleA.localeCompare(titleB);
          break;
        
        case 'created':
          comparison = a.created_at - b.created_at;
          break;
        
        case 'updated':
          comparison = a.updated_at - b.updated_at;
          break;
        
        case 'starred':
          // スター付きを先に表示
          comparison = (b.is_starred ? 1 : 0) - (a.is_starred ? 1 : 0);
          // 同じスター状態なら更新日時で並べる
          if (comparison === 0) {
            comparison = b.updated_at - a.updated_at;
          }
          break;
      }
      
      // 昇順・降順の反映
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    return entriesCopy;
  });

  onMount(async () => {
    projectId = getProjectIdFromUrl();
    // プロジェクト情報を取得
    const result = await window.api.projects.list();
    projects = result.projects;
    const project = projects.find(p => p.id === projectId);
    if (project) {
      projectName = project.name;
    }
    await loadTags();
    await loadTemplates();
    await loadEntries();
  });

  async function loadTags() {
    try {
      const result = await electronApi.tags.list();
      allTags = result.tags;
    } catch (error) {
      console.error('Failed to load tags:', error);
    }
  }

  async function loadTemplates() {
    try {
      const result = await electronApi.templates.list();
      templates = result.templates;
      templateIds = templates.map(template => template.id);
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  }

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
      editIsLocked = result.entry.is_locked;
      selectedTagIds = result.entry.tag_ids || [];
      isNewEntry = false;
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
    editIsLocked = false;
    selectedTagIds = [];
    isNewEntry = true;
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

    // ロック中の場合は保存不可
    if (editIsLocked && !isNewEntry) {
      alert('ロック中のエントリは編集できません。先にロックを解除してください。');
      return;
    }

    try {
      const params = {
        id: isNewEntry ? undefined : (selectedEntry?.id ? String(selectedEntry.id) : undefined),
        project_id: String(projectId),
        title: editTitle ? String(editTitle) : undefined,
        body_markdown: String(editBody),
        is_starred: Boolean(editIsStarred),
        is_locked: Boolean(true),
        tag_ids: selectedTagIds.length > 0 ? [...selectedTagIds].map(id => String(id)) : undefined
      };
      
      const result = await electronApi.entries.upsert(params);

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
    if (editIsLocked && selectedEntry) {
      alert('ロック中のエントリは編集できません。先にロックを解除してください。');
      return;
    }
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

  async function toggleLock() {
    if (!selectedEntry) return;

    try {
      const newLocked = !editIsLocked;
      await electronApi.entries.toggleLock(selectedEntry.id, newLocked);
      editIsLocked = newLocked;
      await loadEntries();
    } catch (error) {
      console.error('Failed to toggle lock:', error);
      alert('ロック状態の変更に失敗しました');
    }
  }

  function toggleTag(tagId: string) {
    if (selectedTagIds.includes(tagId)) {
      selectedTagIds = selectedTagIds.filter(id => id !== tagId);
    } else {
      selectedTagIds = [...selectedTagIds, tagId];
    }
  }

  function getTagsByCategory(category: string): Tag[] {
    return allTags.filter(tag => tag.category === category);
  }

  function applyTemplate() {
    if (!confirm('現在の入力内容を上書きしますか？')) return;

    if (editIsLocked && selectedEntry) {
      alert('ロック中のエントリは編集できません。先にロックを解除してください。');
      return;
    }

    const template = templates.find(t => t.id === selectedTemplate);
    if (template) {
      editTitle = template.name;
      editBody = template.body_markdown;
    }
  }

  async function copyToClipboard() {
    try {
      electronApi.clipboard.writeText(editBody);
      alert('コピーしました');
    } catch (error) {
      alert('コピーに失敗しました');
    }
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

  async function exportEntry() {
    isExporting = true;

    try {
      if (!selectedEntry) {
        alert('出力対象を履歴から選択してください。');
        return;
      }

      const result = await electronApi.entries.export(selectedEntry?.id);
      if (result.success) {
        alert('エクスポートしました');
      } else{
        alert('エクスポートに失敗しました');
      }
    } finally {
      isExporting = false;
    }
  }

  async function exportProject() {
    isExporting = true;

    try {
      const result = await electronApi.projects.exportAll(projectId);
      if (result.success) {
        alert('エクスポートしました');
      } else{
        alert('エクスポートに失敗しました');
      }
    } finally {
      isExporting = false;
    }
  }

  function clearBody() {
    if (!confirm('現在の入力内容をクリアしますか？')) return;
    if (editIsLocked && selectedEntry) {
      alert('ロック中のエントリは編集できません。先にロックを解除してください。');
      return;
    }
    editBody = '';
  }

  // 検索時に再読み込み
  $effect(() => {
    if (searchQuery !== undefined) {
      loadEntries();
    }
  });
</script>

{#if isExporting}
  <div class="loading-overlay">
    <div class="loading-spinner">エクスポート中...</div>
  </div>
{/if}

<div class="project-detail">
  <header class="header">
    <button class="btn btn-secondary back-btn" onclick={() => window.location.href = '/'}>
      ← 戻る
    </button>

    <input class="project-title" type="text" value={projectName} disabled/>
    <input
      type="search"
      placeholder="プロジェクト内のプロンプトを全文検索..."
      bind:value={searchQuery}
      class="search-input"
    />
    <button class="btn btn-primary btn-sm" onclick={startNewEntry}>
      ＋ 新規
    </button>

    <div class="header-actions">
      <button class="btn btn-thirdly btn-sm" onclick={exportEntry}>⇓　エクスポート</button>
      <button class="btn btn-thirdly btn-sm" onclick={exportProject}>⇓　全件エクスポート</button>
    </div>
  </header>
    
  <div class="content">
    <!-- 左ペイン：履歴一覧 -->
    <aside class="sidebar" class:closed={!sidebarOpen}>
      <div class="sidebar-header">
        {#if sidebarOpen}
          <h2>履歴</h2>
          <button 
            class="sidebar-toggle-btn"
            onclick={() => sidebarOpen = !sidebarOpen}
            title="履歴を閉じる"
          >
            ◀
          </button>
        {:else}
          <button 
            class="sidebar-toggle-btn-collapsed"
            onclick={() => sidebarOpen = !sidebarOpen}
            title="履歴を開く"
          >
            ▶
          </button>
        {/if}
      </div>

      {#if sidebarOpen}
      <!-- ソート選択UI -->
      <div class="sort-controls">
        <select bind:value={sortBy} class="sort-select">
          <option value="created">作成日時</option>
          <option value="updated">更新日時</option>
          <option value="title">タイトル</option>
          <option value="starred">お気に入り</option>
        </select>
        <button 
          class="sort-order-btn"
          onclick={() => sortOrder = sortOrder === 'asc' ? 'desc' : 'asc'}
          title={sortOrder === 'asc' ? '昇順' : '降順'}
        >
          {sortOrder === 'asc' ? '↑' : '↓'}
        </button>
      </div>

      <div class="entries-list">
        {#if loading}
          <p class="loading">読み込み中...</p>
        {:else if sortedEntries().length === 0}
          <p class="empty">履歴がありません</p>
        {:else}
          {#each sortedEntries() as entry (entry.id)}
            <button
              class="entry-item"
              class:active={selectedEntry?.id === entry.id}
              onclick={() => selectEntry(entry.id)}
            >
              <div class="entry-header">
                {#if entry.is_starred}
                  <span class="star">⭐</span>
                {/if}
                {#if entry.is_locked}
                  <span class="lock-icon">🔒</span>
                {/if}
                <span class="entry-title">
                  {entry.title || '無題'}
                </span>
              </div>
              <div class="entry-meta">
                作成 : {formatDate(entry.created_at)}
                  /  更新 : {formatDate(entry.updated_at)}
              </div>
              <div class="entry-snippet">
                {entry.snippet}...
              </div>
            </button>
          {/each}
        {/if}
      </div>
      {/if}
    </aside>

    <!-- 中央ペイン：編集エリア -->
    <div class="editor-pane">
      <div class="pane-header">
        <h3>📝　編集</h3>
        <!-- ソート選択UI -->
        <div class="template-controls">
          <select bind:value={selectedTemplate} class="sort-select">
            <option value="">-- テンプレートを選択 --</option>
            {#each templates as template}
              <option value={template.id}>{template.name}</option>
            {/each}
          </select>
          <button class="btn btn-thirdly btn-sm" onclick={applyTemplate}>適用</button>
        </div>
      </div>
      <div class="edit-form">
        <input
          type="text"
          placeholder="タイトル（任意）"
          bind:value={editTitle}
          class="title-input"
          disabled={editIsLocked}
        />

        <textarea
          placeholder="プロンプトをMarkdown形式で入力..."
          bind:value={editBody}
          class="body-textarea"
          disabled={editIsLocked}
        ></textarea>

        <!-- タグ選択エリア -->
        <div class="tags-section">
          <h4>🏷️ タグ</h4>
          <div class="tags-container">
            {#each ['工程', '対象', '性質'] as category}
              <div class="tag-category">
                <div class="category-label">{category}</div>
                <div class="tag-list">
                  {#each getTagsByCategory(category) as tag}
                    <button
                      type="button"
                      class="tag-chip"
                      class:selected={selectedTagIds.includes(tag.id)}
                      style="--tag-color: {tag.color}"
                      onclick={() => toggleTag(tag.id)}
                      disabled={editIsLocked}
                    >
                      {tag.name}
                    </button>
                  {/each}
                </div>
              </div>
            {/each}
          </div>
        </div>

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
              <button 
                class="btn btn-secondary"
                class:btn-lock-active={editIsLocked}
                onclick={toggleLock}
              >
                {editIsLocked ? '🔒' : '🔓'} {editIsLocked ? 'ロック中' : 'ロック'}
              </button>
            {/if}
          </div>

          <div class="actions-right">
            {#if !isNewEntry}
              <button class="btn btn-danger" onclick={deleteEntry}>
                🗑️ 削除
              </button>
            {/if}
            <button class="btn btn-secondary" onclick={clearBody}>
              📄 クリア
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 右ペイン：プレビューエリア -->
    <div class="preview-pane">
      <div class="pane-header">
        <h3>👁　プレビュー</h3>
      </div>
      <div class="preview-content">
        <!-- {#if editTitle}
          <h1>{editTitle}</h1>
        {/if} -->
        <div class="markdown-body">
          {@html renderedMarkdown}
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .loading-overlay {
    position: fixed;
    top: 0; left: 0;
    width: 100%; height: 100%;
    background: rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
  }
  .loading-spinner {
    background: white;
    padding: 24px 48px;
    border-radius: 8px;
    font-size: 18px;
  }

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

  .project-title {
    min-width: 400px;
    max-width: 400px;
    padding: 5px 10px;
    /* border: none; */
    /* background: transparent; */
    font-size: 18px;
    font-weight: 600;
    color: #333;
    /* padding: 0; */
    cursor: default;
    flex-shrink: 0;
  }

  .header-actions {
    margin-left: auto;
    display: flex;
    gap: 8px;
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
    transition: width 0.3s ease;
  }

  .sidebar.closed {
    width: 48px;
  }

  .sidebar-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    min-height: 60px;
  }

  .sidebar.closed .sidebar-header {
    justify-content: center;
    padding: 0.5rem;
  }

  .sidebar-header h2 {
    font-size: 1.125rem;
    font-weight: 600;
  }

  /* サイドバートグルボタン（開いている時） */
  .sidebar-toggle-btn {
    padding: 0.25rem 0.5rem;
    background: none;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    cursor: pointer;
    font-size: 1rem;
    color: var(--color-text-secondary);
    transition: all 0.2s;
  }

  .sidebar-toggle-btn:hover {
    background-color: var(--color-bg);
    color: var(--color-text);
  }

  /* サイドバートグルボタン（閉じている時） */
  .sidebar-toggle-btn-collapsed {
    padding: 0.75rem 0.5rem;
    background-color: white;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    cursor: pointer;
    font-size: 1.125rem;
    color: var(--color-text-secondary);
    transition: all 0.2s;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }

  .sidebar-toggle-btn-collapsed:hover {
    background-color: var(--color-primary);
    color: white;
    transform: scale(1.1);
  }

  /* フローティングトグルボタンは削除 */

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

  /* 中央ペイン：編集エリア */
  .editor-pane {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border-right: 1px solid var(--color-border);
  }

  /* 右ペイン：プレビューエリア */
  .preview-pane {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background-color: var(--color-bg-secondary);
  }

  .pane-header {
    padding: 1rem 1.5rem;
    background-color: white;
    border-bottom: 1px solid var(--color-border);
    display: flex;
  }

  .pane-header h3 {
    font-size: 1rem;
    font-weight: 600;
    margin: 0;
    color: var(--color-text-secondary);
    display: flex;
    align-items: center;
  }

  .template-controls {
    margin-left: auto;
  }
  
  .edit-form {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 1.5rem;
    gap: 1rem;
    overflow: hidden;
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
  .preview-content {
    flex: 1;
    overflow-y: auto;
    padding: 1.5rem;
    background-color: white;
    margin: 1.5rem;
    border: 1px solid var(--color-border);
    border-radius: 4px;
  }

  .markdown-body {
    line-height: 1.8;
    color: var(--color-text);
  }

  /* Markdownスタイル */
  .markdown-body :global(h1) {
    font-size: 2em;
    font-weight: 600;
    margin-top: 1.5em;
    margin-bottom: 0.5em;
    border-bottom: 1px solid var(--color-border);
    padding-bottom: 0.3em;
  }

  .markdown-body :global(h2) {
    font-size: 1.5em;
    font-weight: 600;
    margin-top: 1.5em;
    margin-bottom: 0.5em;
    border-bottom: 1px solid var(--color-border);
    padding-bottom: 0.3em;
  }

  .markdown-body :global(h3) {
    font-size: 1.25em;
    font-weight: 600;
    margin-top: 1.5em;
    margin-bottom: 0.5em;
  }

  .markdown-body :global(h4),
  .markdown-body :global(h5),
  .markdown-body :global(h6) {
    font-weight: 600;
    margin-top: 1.5em;
    margin-bottom: 0.5em;
  }

  .markdown-body :global(p) {
    margin-bottom: 1em;
  }

  .markdown-body :global(ul),
  .markdown-body :global(ol) {
    margin-bottom: 1em;
    padding-left: 2em;
  }

  .markdown-body :global(li) {
    margin-bottom: 0.25em;
  }

  .markdown-body :global(code) {
    background-color: rgba(175, 184, 193, 0.2);
    padding: 0.2em 0.4em;
    border-radius: 3px;
    font-family: 'Courier New', monospace;
    font-size: 0.9em;
  }

  .markdown-body :global(pre) {
    background-color: #f6f8fa;
    padding: 1em;
    border-radius: 6px;
    overflow-x: auto;
    margin-bottom: 1em;
  }

  .markdown-body :global(pre code) {
    background-color: transparent;
    padding: 0;
  }

  .markdown-body :global(blockquote) {
    border-left: 4px solid var(--color-border);
    padding-left: 1em;
    margin-left: 0;
    margin-bottom: 1em;
    color: var(--color-text-secondary);
  }

  .markdown-body :global(a) {
    color: var(--color-primary);
    text-decoration: none;
  }

  .markdown-body :global(a:hover) {
    text-decoration: underline;
  }

  .markdown-body :global(table) {
    border-collapse: collapse;
    width: 100%;
    margin-bottom: 1em;
  }

  .markdown-body :global(table th),
  .markdown-body :global(table td) {
    border: 1px solid var(--color-border);
    padding: 0.5em;
    text-align: left;
  }

  .markdown-body :global(table th) {
    background-color: var(--color-bg-secondary);
    font-weight: 600;
  }

  .markdown-body :global(hr) {
    border: none;
    border-top: 1px solid var(--color-border);
    margin: 1.5em 0;
  }

  .markdown-body :global(img) {
    max-width: 100%;
    height: auto;
  }

  /* タグ選択エリア */
  .tags-section {
    margin-bottom: 1rem;
  }

  .tags-section h4 {
    font-size: 0.9rem;
    font-weight: 600;
    margin-bottom: 0.75rem;
    color: var(--color-text);
  }

  .tags-container {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .tag-category {
    display: flex;
    gap: 0.75rem;
    align-items: flex-start;
  }

  .category-label {
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--color-text-secondary);
    min-width: 50px;
    padding-top: 0.25rem;
  }

  .tag-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    flex: 1;
  }

  .tag-chip {
    padding: 0.375rem 0.75rem;
    border-radius: 16px;
    border: 1.5px solid var(--tag-color, #94A3B8);
    background-color: white;
    color: var(--tag-color, #64748B);
    font-size: 0.8125rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .tag-chip:hover:not(:disabled) {
    background-color: var(--tag-color, #94A3B8);
    color: white;
    transform: translateY(-1px);
  }

  .tag-chip.selected {
    background-color: var(--tag-color, #94A3B8);
    color: white;
    border-color: var(--tag-color, #94A3B8);
  }

  .tag-chip:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* ロックアイコン */
  .lock-icon {
    font-size: 0.9rem;
    margin-right: 0.25rem;
  }

  /* ロックボタン */
  .btn-lock-active {
    background-color: #EF4444;
    color: white;
  }

  .btn-lock-active:hover {
    background-color: #DC2626;
  }

  /* 無効化された入力欄 */
  .title-input:disabled,
  .body-textarea:disabled {
    background-color: #F3F4F6;
    cursor: not-allowed;
    opacity: 0.7;
  }

  /* ソートコントロール */
  .sort-controls {
    display: flex;
    gap: 0.5rem;
    padding: 0 1rem 0.75rem 1rem;
    border-bottom: 1px solid var(--color-border);
  }

  .sort-select {
    flex: 1;
    padding: 0.375rem 0.5rem;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background-color: white;
    font-size: 0.875rem;
    cursor: pointer;
  }

  .sort-select:focus {
    outline: none;
    border-color: var(--color-primary);
  }

  .sort-order-btn {
    width: 2rem;
    height: 2rem;
    padding: 0;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background-color: white;
    font-size: 1.125rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  }

  .sort-order-btn:hover {
    background-color: var(--color-bg-secondary);
  }

  .sort-order-btn:active {
    background-color: var(--color-border);
  }
</style>
