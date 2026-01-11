<script lang="ts">
  import { onMount } from 'svelte';
  import { electronApi } from '$lib/api';
  import type { Tag } from '../../../electron/api-types';

  let tags: Tag[] = $state([]);
  let loading = $state(true);

  // 新規タグ作成用
  let newTagName = $state('');
  let newTagCategory = $state<'工程' | '対象' | '性質'>('工程');
  let newTagColor = $state('#3B82F6');

  // カテゴリ別色のプリセット
  const categoryColors = {
    '工程': ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#6B7280'],
    '対象': ['#EC4899', '#14B8A6', '#F97316', '#8B5CF6', '#EAB308', '#DC2626', '#059669', '#0EA5E9'],
    '性質': ['#06B6D4', '#64748B', '#A855F7', '#F97316', '#10B981', '#0EA5E9']
  };

  onMount(async () => {
    await loadTags();
  });

  async function loadTags() {
    try {
      loading = true;
      const result = await electronApi.tags.list();
      tags = result.tags;
    } catch (error) {
      console.error('Failed to load tags:', error);
      alert('タグの読み込みに失敗しました');
    } finally {
      loading = false;
    }
  }

  async function createTag() {
    if (!newTagName.trim()) {
      alert('タグ名を入力してください');
      return;
    }

    try {
      await electronApi.tags.create(
        String(newTagName.trim()),
        String(newTagCategory),
        String(newTagColor)
      );
      
      // フォームをリセット
      newTagName = '';
      newTagCategory = '工程';
      newTagColor = '#3B82F6';
      
      // タグリストを再読み込み
      await loadTags();
    } catch (error) {
      console.error('Failed to create tag:', error);
      alert(`タグの作成に失敗しました\n\n${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async function deleteTag(tag: Tag) {
    if (tag.is_default) {
      alert('デフォルトタグは削除できません');
      return;
    }

    if (!confirm(`タグ「${tag.name}」を削除しますか？`)) {
      return;
    }

    try {
      await electronApi.tags.delete(String(tag.id));
      await loadTags();
    } catch (error) {
      console.error('Failed to delete tag:', error);
      alert('タグの削除に失敗しました');
    }
  }

  function getTagsByCategory(category: string): Tag[] {
    return tags.filter(tag => tag.category === category);
  }
</script>

<div class="tags-page">
  <header class="header">
    <button class="btn btn-secondary back-btn" onclick={() => window.location.href = '/'}>
      ← 戻る
    </button>
    <h1>タグ管理</h1>
  </header>

  <div class="content">
    <!-- 新規タグ作成フォーム -->
    <section class="create-section">
      <h2>新しいタグを作成</h2>
      <div class="create-form">
        <div class="form-row">
          <div class="form-group">
            <label for="tag-name">タグ名</label>
            <input
              id="tag-name"
              type="text"
              bind:value={newTagName}
              placeholder="例: レビュー"
              class="input"
            />
          </div>

          <div class="form-group">
            <label for="tag-category">カテゴリ</label>
            <select id="tag-category" bind:value={newTagCategory} class="input">
              <option value="工程">工程</option>
              <option value="対象">対象</option>
              <option value="性質">性質</option>
            </select>
          </div>

          <div class="form-group">
            <label for="tag-color">色</label>
            <div class="color-picker">
              <input
                id="tag-color"
                type="color"
                bind:value={newTagColor}
                class="color-input"
              />
              <div class="color-presets">
                {#each categoryColors[newTagCategory] as color}
                  <button
                    type="button"
                    class="color-preset"
                    style="background-color: {color}"
                    onclick={() => newTagColor = color}
                    title={color}
                  ></button>
                {/each}
              </div>
            </div>
          </div>
        </div>

        <button class="btn btn-primary" onclick={createTag}>
          ＋ タグを作成
        </button>
      </div>
    </section>

    <!-- タグ一覧 -->
    <section class="tags-list-section">
      <h2>既存のタグ</h2>

      {#if loading}
        <p class="loading">読み込み中...</p>
      {:else}
        {#each ['工程', '対象', '性質'] as category}
          <div class="category-section">
            <h3>{category}タグ</h3>
            <div class="tags-grid">
              {#each getTagsByCategory(category) as tag}
                <div class="tag-card" style="--tag-color: {tag.color}">
                  <div class="tag-info">
                    <span class="tag-name">{tag.name}</span>
                    {#if tag.is_default}
                      <span class="default-badge">デフォルト</span>
                    {/if}
                  </div>
                  <div class="tag-actions">
                    {#if !tag.is_default}
                      <button
                        class="btn-icon btn-delete"
                        onclick={() => deleteTag(tag)}
                        title="削除"
                      >
                        🗑️
                      </button>
                    {/if}
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {/each}
      {/if}
    </section>
  </div>
</div>

<style>
  .tags-page {
    min-height: 100vh;
    background-color: var(--color-bg);
  }

  .header {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem 2rem;
    background-color: white;
    border-bottom: 1px solid var(--color-border);
  }

  .header h1 {
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--color-text);
  }

  .back-btn {
    padding: 0.5rem 1rem;
  }

  .content {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
  }

  /* 新規作成フォーム */
  .create-section {
    background-color: white;
    border-radius: 8px;
    padding: 1.5rem;
    margin-bottom: 2rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .create-section h2 {
    font-size: 1.125rem;
    font-weight: 600;
    margin-bottom: 1rem;
    color: var(--color-text);
  }

  .create-form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .form-row {
    display: grid;
    grid-template-columns: 2fr 1fr 2fr;
    gap: 1rem;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .form-group label {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--color-text-secondary);
  }

  .input {
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    font-size: 0.875rem;
  }

  .input:focus {
    outline: none;
    border-color: var(--color-primary);
  }

  .color-picker {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .color-input {
    width: 100%;
    height: 2.5rem;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    cursor: pointer;
  }

  .color-presets {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .color-preset {
    width: 2rem;
    height: 2rem;
    border: 2px solid white;
    border-radius: 4px;
    cursor: pointer;
    box-shadow: 0 0 0 1px var(--color-border);
    transition: transform 0.2s;
  }

  .color-preset:hover {
    transform: scale(1.1);
  }

  /* タグ一覧 */
  .tags-list-section {
    background-color: white;
    border-radius: 8px;
    padding: 1.5rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .tags-list-section > h2 {
    font-size: 1.125rem;
    font-weight: 600;
    margin-bottom: 1.5rem;
    color: var(--color-text);
  }

  .category-section {
    margin-bottom: 2rem;
  }

  .category-section:last-child {
    margin-bottom: 0;
  }

  .category-section h3 {
    font-size: 1rem;
    font-weight: 600;
    margin-bottom: 0.75rem;
    color: var(--color-text-secondary);
  }

  .tags-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 0.75rem;
  }

  .tag-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    border: 2px solid var(--tag-color, #94A3B8);
    border-radius: 8px;
    background-color: white;
  }

  .tag-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .tag-name {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--tag-color, #64748B);
  }

  .default-badge {
    padding: 0.125rem 0.5rem;
    background-color: var(--color-bg-secondary);
    color: var(--color-text-secondary);
    font-size: 0.75rem;
    border-radius: 12px;
  }

  .tag-actions {
    display: flex;
    gap: 0.25rem;
  }

  .btn-icon {
    padding: 0.25rem 0.5rem;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 1rem;
    opacity: 0.6;
    transition: opacity 0.2s;
  }

  .btn-icon:hover {
    opacity: 1;
  }

  .btn-delete:hover {
    filter: brightness(0.8);
  }

  .loading {
    text-align: center;
    padding: 2rem;
    color: var(--color-text-secondary);
  }
</style>
