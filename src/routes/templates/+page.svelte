<script lang="ts">
    import { electronApi } from '$lib/api';
  import { onMount } from 'svelte';

  let templates: any[] = [];
  let editingTemplate: any = null;
  let isCreating = false;

  onMount(async () => {
    await loadTemplates();
  });

  async function loadTemplates() {
    const result = await electronApi.templates.list();
    templates = result.templates;
  }

  function startCreate() {
    isCreating = true;
    editingTemplate = { name: '', body_markdown: '' };
  }

  function startEdit(template: any) {
    isCreating = false;
    editingTemplate = { ...template };
  }

  function cancelEdit() {
    editingTemplate = null;
    isCreating = false;
  }

  async function saveTemplate() {
    if (!editingTemplate.name.trim() || !editingTemplate.body_markdown.trim()) {
      alert('名前と本文を入力してください');
      return;
    }

    await electronApi.templates.upsert(editingTemplate);
    await loadTemplates();
    cancelEdit();
  }

  async function deleteTemplate(id: string) {
    if (!confirm('このテンプレートを削除しますか？')) return;
    await electronApi.templates.delete(id);
    await loadTemplates();
    startCreate();
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

</script>

<div class="container">
  <div class="header">
    <button class="btn btn-secondary back-btn" onclick={() => window.location.href = '/'}>
      ← 戻る
    </button>
    <h1>テンプレート管理</h1>
    <button class="btn btn-primary" onclick={startCreate}>＋新規テンプレート</button>
  </div>

  <div class="content">
    <div class="templates-list">
      <h2>テンプレート一覧</h2>
      {#each templates as template}
        <div class="template-card">
          <h3>{template.name}</h3>
          <div class="template-meta">
            作成 : {formatDate(template.created_at)}
              /  更新 : {formatDate(template.updated_at)}
          </div>
          <p>{template.body_markdown.slice(0, 100)}...</p>
          <div class="template-actions">
            <button class="edit-btn" onclick={() => startEdit(template)}>🖋</button>
            <button class="delete-btn" onclick={() => deleteTemplate(template.id)}>🗑️</button>
          </div>
        </div>
      {/each}
    </div>

    {#if editingTemplate}
      <div class="editor">
        <h2>{isCreating ? '新規テンプレート' : 'テンプレート編集'}</h2>
        <input 
          type="text" 
          bind:value={editingTemplate.name}
          placeholder="テンプレート名"
          class="template-name"
        />
        <textarea 
          bind:value={editingTemplate.body_markdown}
          placeholder="テンプレート本文"
          class="template-body"
        ></textarea>
        <div class="editor-actions">
          <button class="btn btn-primary" onclick={saveTemplate}>保存</button>
          <button class="btn btn-secondary" onclick={cancelEdit}>キャンセル</button>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .container {
    height: 100vh;
    display: flex;
    flex-direction: column;
  }

  .header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px;
    border-bottom: 1px solid #e0e0e0;
  }

  h1 {
    margin: 0;
    flex: 1;
  }

  .content {
    display: flex;
    flex: 1;
    overflow: hidden;
  }

  .templates-list {
    width: 300px;
    border-right: 1px solid #e0e0e0;
    padding: 16px;
    overflow-y: auto;
  }

  .template-card {
    position: relative;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    padding: 12px;
    margin-bottom: 12px;
  }

  .template-card h3 {
    margin: 0 0 8px 0;
  }

  .template-card p {
    margin: 0 0 8px 0;
    font-size: 14px;
    color: #666;
  }

  .template-actions {
    display: flex;
    gap: 8px;
  }

  .editor {
    flex: 1;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .template-name {
    padding: 8px;
    font-size: 16px;
    border: 1px solid #ccc;
    border-radius: 4px;
  }

  .template-meta {
    font-size: 0.75rem;
    color: var(--color-text-secondary);
    margin-bottom: 0.25rem;
  }

  .template-body {
    flex: 1;
    padding: 8px;
    font-family: monospace;
    border: 1px solid #ccc;
    border-radius: 4px;
    resize: none;
  }

  .editor-actions {
    display: flex;
    gap: 8px;
  }

  .edit-btn {
    position: absolute;
    top: 1rem;
    right: 3rem;
    background: none;
    border: none;
    font-size: 1.25rem;
    opacity: 0.6;
    transition: opacity 0.2s;
  }

  .edit-btn:hover {
    opacity: 1;
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
</style>
