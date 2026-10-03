<template>
  <div class="ai-search">
    <!-- 搜索输入框 -->
    <div class="ai-search__input-wrapper">
      <Icon icon="mdi:magnify" class="ai-search__icon" />
      <input
        v-model="query"
        class="ai-search__input"
        placeholder="用自然语言搜索法律条款..."
        @keydown.enter="search"
      />
      <button v-if="query" class="ai-search__clear" @click="clear">
        <Icon icon="mdi:close-circle" />
      </button>
    </div>

    <!-- 搜索按钮 -->
    <div class="ai-search__actions">
      <button
        class="ai-search__btn ai-search__btn--primary"
        :disabled="!query || isLoading"
        @click="search"
      >
        <Icon v-if="isLoading" icon="mdi:loading" class="ai-search__loading-icon" />
        <Icon v-else icon="mdi:robot-happy" />
        <span>{{ isLoading ? 'AI 搜索中...' : 'AI 智能搜索' }}</span>
      </button>
      <button
        v-if="hasSearched"
        class="ai-search__btn"
        @click="clear"
      >
        <Icon icon="mdi:refresh" />
        <span>清除搜索</span>
      </button>
    </div>

    <!-- 加载状态 -->
    <div v-if="isLoading" class="ai-search__loading">
      <div class="ai-search__loading-spinner"></div>
      <p>AI 正在分析您的法律问题...</p>
    </div>

    <!-- AI 搜索结果 -->
    <div v-else-if="aiResults.length > 0" class="ai-search__results">
      <div class="ai-search__results-header">
        <span class="ai-search__results-count">找到 {{ aiResults.length }} 条相关条款</span>
      </div>
      <div
        v-for="result in aiResults"
        :key="result.id"
        class="ai-search__result"
        @click="$emit('select', result)"
      >
        <div class="ai-search__result-header">
          <span class="ai-search__result-law">{{ result.lawName }}</span>
          <span :class="['ai-search__risk', `ai-search__risk--${result.riskLevel}`]">
            {{ result.riskLevel === '高' ? '⚠️ 高风险' : result.riskLevel === '中' ? '中风险' : '低风险' }}
          </span>
        </div>
        <h4 class="ai-search__result-title">{{ result.title }}</h4>
        <p class="ai-search__result-content">{{ result.content }}</p>
        <p class="ai-search__result-guide">{{ result.practicalGuide }}</p>
      </div>
    </div>

    <!-- 搜索历史 / 空状态 -->
    <div v-else-if="hasSearched" class="ai-search__empty">
      <Icon icon="mdi:file-search-outline" class="ai-search__empty-icon" />
      <p class="ai-search__empty-title">没有找到精确匹配的法律条款</p>
      <p class="ai-search__empty-desc">AI 助手可能知道相关答案，您可以尝试提问</p>
      <button class="ai-search__ask-ai" @click="$emit('ask-ai', query)">
        <Icon icon="mdi:robot-happy" />
        <span>向 AI 助手提问</span>
      </button>
    </div>

    <!-- 默认提示 -->
    <div v-else class="ai-search__hints">
      <p class="ai-search__hints-title">试试这样问：</p>
      <div class="ai-search__hints-list">
        <button
          v-for="hint in hints"
          :key="hint"
          class="ai-search__hint"
          @click="query = hint; search()"
        >
          {{ hint }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Icon } from '@iconify/vue'
import type { ComplianceArticle } from '@/data/complianceData'

interface AiSearchResult extends ComplianceArticle {
  relevanceScore?: number
  matchedReason?: string
}

interface Props {
  articles?: ComplianceArticle[]
}

const props = withDefaults(defineProps<Props>(), {
  articles: () => []
})

const emit = defineEmits<{
  select: [article: ComplianceArticle]
  'ask-ai': [query: string]
}>()

// 状态
const query = ref('')
const isLoading = ref(false)
const aiResults = ref<AiSearchResult[]>([])
const hasSearched = ref(false)

// 提示问题
const hints = [
  '注册公司需要准备什么？',
  '个人如何纳税？',
  '不签劳动合同有什么风险？',
  '如何保护我的创意？'
]

// 搜索方法
const search = async () => {
  if (!query.value.trim() || isLoading.value) return

  isLoading.value = true
  hasSearched.value = true

  try {
    // 简单的关键词匹配 + AI 相关性排序
    const results = await searchArticlesWithAI(query.value, props.articles)
    aiResults.value = results
  } catch (error) {
    console.error('搜索失败:', error)
    aiResults.value = []
  } finally {
    isLoading.value = false
  }
}

const clear = () => {
  query.value = ''
  aiResults.value = []
  hasSearched.value = false
}

// AI 搜索实现（简化版 - 使用关键词匹配 + 相关性排序）
async function searchArticlesWithAI(
  queryText: string,
  articles: ComplianceArticle[]
): Promise<AiSearchResult[]> {
  // 提取查询关键词
  const keywords = extractKeywords(queryText)

  // 计算每篇文章的相关性得分
  const scoredArticles = articles.map(article => {
    let score = 0
    let matchedReasons: string[] = []

    // 标题匹配
    keywords.forEach(keyword => {
      if (article.title.includes(keyword)) {
        score += 3
        matchedReasons.push(`标题匹配: ${keyword}`)
      }
    })

    // 内容匹配
    keywords.forEach(keyword => {
      if (article.content.includes(keyword)) {
        score += 1
      }
    })

    // 法律名称匹配
    keywords.forEach(keyword => {
      if (article.lawName.includes(keyword)) {
        score += 2
      }
    })

    // 实务指南匹配
    keywords.forEach(keyword => {
      if (article.practicalGuide.includes(keyword)) {
        score += 2
      }
    })

    return {
      ...article,
      relevanceScore: score,
      matchedReason: matchedReasons.join('; ')
    }
  })

  // 按得分排序，返回前10条
  return scoredArticles
    .filter(a => a.relevanceScore && a.relevanceScore > 0)
    .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0))
    .slice(0, 10)
}

// 提取关键词
function extractKeywords(text: string): string[] {
  // 停用词
  const stopWords = ['我', '的', '了', '是', '吗', '呢', '怎么', '如何', '什么', '需要', '可以', '应该']

  // 分词并过滤
  const words = text
    .toLowerCase()
    .replace(/[^\u4e00-\u9fa5a-z0-9]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length >= 2 && !stopWords.includes(word))

  return [...new Set(words)]
}
</script>

<style lang="scss" scoped>
.ai-search {
  &__input-wrapper {
    display: flex;
    align-items: center;
    gap: $space-sm;
    background: $color-gray-100;
    border-radius: $radius-xl;
    padding: $space-md $space-lg;
    border: 2px solid transparent;
    transition: all $transition-fast;

    [data-theme="dark"] & {
      background: #1E293B;
    }

    &:focus-within {
      border-color: $color-brand-primary;
      background: white;

      [data-theme="dark"] & {
        background: #0F172A;
      }
    }
  }

  &__icon {
    font-size: 20px;
    color: $color-gray-400;
    flex-shrink: 0;
  }

  &__input {
    flex: 1;
    border: none;
    background: transparent;
    font-size: $text-sm;
    color: $color-gray-900;
    outline: none;

    [data-theme="dark"] & {
      color: #F8FAFC;
    }

    &::placeholder {
      color: $color-gray-400;
    }
  }

  &__clear {
    width: 24px;
    height: 24px;
    border-radius: $radius-full;
    border: none;
    background: transparent;
    color: $color-gray-400;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    transition: all $transition-fast;

    &:hover {
      color: $color-gray-600;
      background: $color-gray-200;
    }
  }

  &__actions {
    display: flex;
    gap: $space-sm;
    margin-top: $space-md;
  }

  &__btn {
    display: inline-flex;
    align-items: center;
    gap: $space-xs;
    padding: $space-sm $space-md;
    border: 1.5px solid rgba($color-brand-primary, 0.3);
    border-radius: $radius-lg;
    background: white;
    color: $color-brand-primary;
    font-size: $text-xs;
    font-weight: 600;
    cursor: pointer;
    transition: all $transition-fast;

    [data-theme="dark"] & {
      background: #1E293B;
      border-color: rgba(99, 102, 241, 0.4);
      color: #818CF8;
    }

    &:hover:not(:disabled) {
      border-color: $color-brand-primary;
      background: $color-brand-primary-light;

      [data-theme="dark"] & {
        background: rgba(99, 102, 241, 0.2);
      }
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    &--primary {
      background: linear-gradient(135deg, $color-brand-primary 0%, #818CF8 100%);
      color: white;
      border: none;
      box-shadow: 0 2px 8px rgba($color-brand-primary, 0.3);

      &:hover:not(:disabled) {
        box-shadow: 0 4px 12px rgba($color-brand-primary, 0.4);
        transform: translateY(-1px);
      }
    }
  }

  &__loading-icon {
    animation: spin 1s linear infinite;
  }

  &__loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: $space-2xl;
    text-align: center;

    p {
      margin-top: $space-md;
      color: $color-gray-500;
      font-size: $text-sm;

      [data-theme="dark"] & {
        color: #94A3B8;
      }
    }
  }

  &__loading-spinner {
    width: 32px;
    height: 32px;
    border: 3px solid $color-gray-200;
    border-top-color: $color-brand-primary;
    border-radius: 50%;
    animation: spin 1s linear infinite;

    [data-theme="dark"] & {
      border-color: #334155;
      border-top-color: #818CF8;
    }
  }

  &__results {
    margin-top: $space-xl;
  }

  &__results-header {
    margin-bottom: $space-md;
  }

  &__results-count {
    font-size: $text-sm;
    color: $color-gray-500;
    font-weight: 500;

    [data-theme="dark"] & {
      color: #94A3B8;
    }
  }

  &__result {
    background: white;
    border-radius: $radius-lg;
    padding: $space-lg;
    margin-bottom: $space-md;
    border: 1px solid rgba($color-brand-primary, 0.08);
    cursor: pointer;
    transition: all $transition-fast;

    [data-theme="dark"] & {
      background: #1E293B;
      border-color: rgba(255, 255, 255, 0.1);
    }

    &:hover {
      border-color: $color-brand-primary;
      box-shadow: $shadow-md;
      transform: translateY(-2px);
    }
  }

  &__result-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: $space-sm;
  }

  &__result-law {
    font-size: $text-xs;
    color: $color-gray-500;
    font-weight: 500;

    [data-theme="dark"] & {
      color: #94A3B8;
    }
  }

  &__risk {
    font-size: $text-xs;
    padding: 2px $space-sm;
    border-radius: $radius-full;
    font-weight: 600;

    &--高 {
      background: rgba(#EF4444, 0.1);
      color: #EF4444;
    }

    &--中 {
      background: rgba(#F59E0B, 0.1);
      color: #F59E0B;
    }

    &--低 {
      background: rgba(#10B981, 0.1);
      color: #10B981;
    }
  }

  &__result-title {
    font-size: $text-base;
    font-weight: 700;
    color: $color-gray-900;
    margin: 0 0 $space-sm;

    [data-theme="dark"] & {
      color: #F8FAFC;
    }
  }

  &__result-content {
    font-size: $text-sm;
    color: $color-gray-600;
    line-height: 1.6;
    margin: 0 0 $space-sm;

    [data-theme="dark"] & {
      color: #94A3B8;
    }
  }

  &__result-guide {
    font-size: $text-xs;
    color: $color-brand-primary;
    background: $color-brand-primary-light;
    padding: $space-sm;
    border-radius: $radius-sm;
    margin: 0;

    [data-theme="dark"] & {
      background: rgba(99, 102, 241, 0.15);
      color: #818CF8;
    }
  }

  &__empty {
    text-align: center;
    padding: $space-2xl;
  }

  &__empty-icon {
    font-size: 48px;
    color: $color-gray-300;
    margin-bottom: $space-md;

    [data-theme="dark"] & {
      color: #475569;
    }
  }

  &__empty-title {
    font-size: $text-base;
    font-weight: 600;
    color: $color-gray-700;
    margin: 0 0 $space-xs;

    [data-theme="dark"] & {
      color: #E2E8F0;
    }
  }

  &__empty-desc {
    font-size: $text-sm;
    color: $color-gray-500;
    margin: 0 0 $space-lg;

    [data-theme="dark"] & {
      color: #94A3B8;
    }
  }

  &__ask-ai {
    display: inline-flex;
    align-items: center;
    gap: $space-sm;
    padding: $space-sm $space-lg;
    background: linear-gradient(135deg, $color-brand-primary 0%, #818CF8 100%);
    color: white;
    border: none;
    border-radius: $radius-full;
    font-size: $text-sm;
    font-weight: 600;
    cursor: pointer;
    transition: all $transition-fast;
    box-shadow: 0 2px 8px rgba($color-brand-primary, 0.3);

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba($color-brand-primary, 0.4);
    }
  }

  &__hints {
    margin-top: $space-xl;
    text-align: center;
  }

  &__hints-title {
    font-size: $text-sm;
    color: $color-gray-500;
    margin: 0 0 $space-md;

    [data-theme="dark"] & {
      color: #94A3B8;
    }
  }

  &__hints-list {
    display: flex;
    flex-wrap: wrap;
    gap: $space-sm;
    justify-content: center;
  }

  &__hint {
    padding: $space-sm $space-md;
    background: $color-gray-100;
    border: 1px solid $color-gray-200;
    border-radius: $radius-full;
    font-size: $text-xs;
    color: $color-gray-600;
    cursor: pointer;
    transition: all $transition-fast;

    [data-theme="dark"] & {
      background: #1E293B;
      border-color: #334155;
      color: #94A3B8;
    }

    &:hover {
      border-color: $color-brand-primary;
      color: $color-brand-primary;
      background: $color-brand-primary-light;

      [data-theme="dark"] & {
        background: rgba(99, 102, 241, 0.15);
        color: #818CF8;
      }
    }
  }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
