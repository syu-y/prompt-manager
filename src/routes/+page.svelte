<script lang="ts">
  import { onMount } from 'svelte';
  import { electronApi } from '$lib/api';
  import type { ProjectSummary } from '../../electron/api-types';

  let projects: ProjectSummary[] = $state([]);
  let loading = $state(true);
  let showCreateModal = $state(false);
  let newProjectName = $state('');
  let filteredProjects: ProjectSummary[] = $state([]);
  let searchQuery = $state('');
  let sortBy: 'name_asc' | 'name_desc' | 'updated_desc' | 'updated_asc' = $state('updated_desc');

  onMount(async () => {
    await loadProjects();
  });

  async function loadProjects() {
    try {
      loading = true;
      const result = await electronApi.projects.list();
      projects = result?.projects;
      applyFilterAndSort();
    } catch (error) {
      console.error('Failed to load projects:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        error
      });
      alert(`プロジェクトの読み込みに失敗しました\n\nエラー: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      loading = false;
    }
  }

  function applyFilterAndSort() {
    // フィルタリング
    let filtered = projects;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = projects.filter(p => 
        p.name.toLowerCase().includes(query)
      );
    }
    
    // ソート
    filteredProjects = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name_asc':
          return a.name.localeCompare(b.name);
        case 'name_desc':
          return b.name.localeCompare(a.name);
        case 'updated_asc':
          return a.updated_at - b.updated_at;
        case 'updated_desc':
        default:
          return b.updated_at - a.updated_at;
      }
    });
  }

  function search() {
    applyFilterAndSort();
  }

  function sortChange() {
    applyFilterAndSort();
  }

  async function createProject() {
    if (!newProjectName.trim()) return;

    try {
      await electronApi.projects.create(newProjectName);
      newProjectName = '';
      showCreateModal = false;
      await loadProjects();
    } catch (error) {
      console.error('Failed to create project:', error);
      alert('プロジェクトの作成に失敗しました');
    }
  }

  async function deleteProject(id: string, name: string) {
    if (!confirm(`プロジェクト「${name}」を削除しますか？`)) return;

    try {
      await electronApi.projects.delete(id);
      await loadProjects();
    } catch (error) {
      console.error('Failed to delete project:', error);
      alert('プロジェクトの削除に失敗しました');
    }
  }

  function formatDate(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
</script>

<div class="projects-page">
  <header class="header">
    <h1>プロジェクト一覧</h1>
    <div>
      <input 
      type="text" 
      class="search-input"
      bind:value={searchQuery}
      oninput={search}
      placeholder="プロジェクト名で絞り込み..."
      />
      
      <select bind:value={sortBy} onchange={sortChange} class="sort-select">
        <option value="updated_desc">更新日時（新しい順）</option>
        <option value="updated_asc">更新日時（古い順）</option>
        <option value="name_asc">名前（A-Z）</option>
        <option value="name_desc">名前（Z-A）</option>
      </select>
    </div>

    <div class="header-actions">
      <button class="btn btn-secondary" onclick={() => window.location.href = '/templates'}>テンプレート管理</button>
      <button class="btn btn-secondary" onclick={() => window.location.href = '/tags'}>
        🏷️ タグ管理
      </button>
      <button class="btn btn-primary" onclick={() => showCreateModal = true}>
        ＋ 新規プロジェクト
      </button>
    </div>
  </header>


  <main class="main">
    {#if loading}
      <p>読み込み中...</p>
    {:else if projects.length === 0}
      <div class="empty-state">
        <p>プロジェクトがありません</p>
        <p>新規プロジェクトを作成して始めましょう</p>
      </div>
    {:else}
      <div class="projects-grid">
        {#each filteredProjects as project (project.id)}
          <div class="project-card">
            <a href="/projects/{project.id}" class="project-link">
              <h2>{project.name}</h2>
              <div class="project-meta">
                <span>最終更新: {formatDate(project.updated_at)}</span>
                {#if project.entry_count !== undefined}
                  <span>履歴: {project.entry_count}件</span>
                {/if}
              </div>
            </a>
            <button
              class="delete-btn"
              onclick={() => deleteProject(project.id, project.name)}
              title="削除"
            >
              🗑️
            </button>
          </div>
        {/each}
      </div>
    {/if}
  </main>
</div>

<!-- svelte-ignore legacy_code -->
{#if showCreateModal}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="modal-overlay" onclick={() => showCreateModal = false}>
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="modal" onclick={(e) => e.stopPropagation()}>
      <h2>新規プロジェクト</h2>
      <form onsubmit={(e) => { e.preventDefault(); createProject(); }}>
        <!-- svelte-ignore a11y-autofocus -->
        <!-- svelte-ignore a11y_autofocus -->
        <input
          type="text"
          placeholder="プロジェクト名"
          bind:value={newProjectName}
          class="input"
          autofocus
        />
        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" onclick={() => showCreateModal = false}>
            キャンセル
          </button>
          <button type="submit" class="btn btn-primary">
            作成
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<style>
  .projects-page {
    min-height: 100vh;
    background-color: var(--color-bg-secondary);
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    padding: 16px;
    /* padding: 1.5rem 2rem; */
    background-color: white;
    border-bottom: 1px solid var(--color-border);
  }

  .header h1 {
    font-size: 1.25rem;
    font-weight: 600;

    margin: 0;
    flex-shrink: 0;
  }

  .search-input {
    width: 250px;
    padding: 6px 12px;
    margin-left: 10px;
    border: 1px solid #ccc;
    border-radius: 4px;
  }

  .sort-select {
    padding: 6px 12px;
    margin-left: 10px;
    border: 1px solid #ccc;
    border-radius: 4px;
    background: white;
  }

  .header-actions {
    display: flex;
    gap: 8px;
    margin-left: auto;
  }

  .main {
    padding: 2rem;
  }

  .empty-state {
    text-align: center;
    padding: 4rem 2rem;
    color: var(--color-text-secondary);
  }

  .empty-state p:first-child {
    font-size: 1.25rem;
    margin-bottom: 0.5rem;
  }

  .projects-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1.5rem;
  }

  .project-card {
    position: relative;
    background-color: white;
    border: 1px solid var(--color-border);
    border-radius: 8px;
    padding: 1.5rem;
    transition: box-shadow 0.2s;
  }

  .project-card:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .project-link {
    text-decoration: none;
    color: inherit;
    display: block;
  }

  .project-card h2 {
    font-size: 1.25rem;
    font-weight: 600;
    margin-bottom: 0.75rem;
  }

  .project-meta {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    font-size: 0.875rem;
    color: var(--color-text-secondary);
  }

  .delete-btn {
    position: absolute;
    top: 1rem;
    right: 1rem;
    background: none;
    border: none;
    font-size: 1.25rem;
    opacity: 0.6;
    transition: opacity 0.2s;
  }

  .delete-btn:hover {
    opacity: 1;
  }

  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .modal {
    background-color: white;
    border-radius: 8px;
    padding: 2rem;
    width: 90%;
    max-width: 400px;
  }

  .modal h2 {
    font-size: 1.25rem;
    margin-bottom: 1.5rem;
  }

  .input {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    font-size: 1rem;
    margin-bottom: 1.5rem;
  }

  .modal-actions {
    display: flex;
    gap: 0.75rem;
    justify-content: flex-end;
  }
</style>
