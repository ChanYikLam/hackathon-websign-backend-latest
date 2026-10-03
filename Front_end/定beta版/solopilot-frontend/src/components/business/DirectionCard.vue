<template>
  <div :class="['direction-card', { 'direction-card--expanded': expanded }]">
    <div class="direction-card__header" @click="toggle">
      <div class="direction-card__rank">推荐 {{ rank }}</div>
      <div class="direction-card__info">
        <h3 class="direction-card__title">{{ title }}</h3>
        <div class="direction-card__match">
          <MatchProgress :percentage="matchRate" />
          <span class="direction-card__match-text">匹配度 {{ matchRate }}%</span>
        </div>
      </div>
      <Icon :icon="expanded ? 'mdi:chevron-up' : 'mdi:chevron-down'" class="direction-card__arrow" />
    </div>
    <Transition name="expand">
      <div v-if="expanded" class="direction-card__body">
        <div class="direction-card__section">
          <h4 class="direction-card__section-title">为什么适合你</h4>
          <p class="direction-card__section-content">{{ reason }}</p>
        </div>
        <div class="direction-card__section">
          <h4 class="direction-card__section-title">预期收入</h4>
          <p class="direction-card__section-content direction-card__income">{{ incomeRange }}</p>
        </div>
        <div class="direction-card__section">
          <h4 class="direction-card__section-title">参考案例</h4>
          <p class="direction-card__section-content">{{ caseBrief }}</p>
        </div>
        <div class="direction-card__section">
          <h4 class="direction-card__section-title">启动建议</h4>
          <ul class="direction-card__tips">
            <li v-for="(tip, index) in startupTips" :key="index">{{ tip }}</li>
          </ul>
        </div>
        <div class="direction-card__section">
          <h4 class="direction-card__section-title">了解更多</h4>
          <div class="direction-card__ai-btn-wrapper">
            <button class="direction-card__ai-btn" @click.stop="showAiExplanation = !showAiExplanation">
              <Icon icon="mdi:robot-happy" />
              <span>{{ showAiExplanation ? '收起 AI 解读' : '让 AI 详细解释为什么适合我' }}</span>
            </button>
            <div v-if="showAiExplanation" class="direction-card__ai-panel">
              <AiInline
                title="为什么推荐这个方向？"
                trigger-text="开始对话"
                icon="mdi:robot-happy"
                prompt-type="result"
                :system-context="aiSystemPrompt"
                :initial-prompt="aiInitialPrompt"
                @close="showAiExplanation = false"
              />
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Icon } from '@iconify/vue'
import MatchProgress from './MatchProgress.vue'
import AiInline from '@/components/ui/AiInline.vue'
import { useMbtiStore } from '@/stores/mbti'
import { useResultStore } from '@/stores/result'

interface Props {
  title: string
  rank: number
  matchRate: number
  reason: string
  incomeRange: string
  caseBrief?: string
  startupTips?: string[]
  expanded?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  caseBrief: '',
  startupTips: () => [],
  expanded: false
})

const emit = defineEmits<{
  toggle: []
}>()

const mbtiStore = useMbtiStore()
const resultStore = useResultStore()

const showAiExplanation = ref(false)

const toggle = () => {
  emit('toggle')
}

// AI 解释的 System Prompt
const aiSystemPrompt = computed(() => {
  const mbti = mbtiStore.result?.mbti_type || ''
  const profile = resultStore.profile
  const profileDesc = profile?.description || ''

  return `你是 SoloPilot AI，一位专注于一人公司（Solopreneur）创业的智能助手，专注于解读创业方向推荐结果。

你的职责是根据用户的信息，解释为什么某个创业方向适合他们。要用通俗易懂的语言，有温度地解释，让用户感受到这个方向确实是为他们量身定制的。

## 用户信息
- MBTI类型: ${mbti}
- 用户画像描述: ${profileDesc}
- 推荐的创业方向: ${props.title}
- 匹配度: ${props.matchRate}%
- 推荐理由: ${props.reason}

## 回答要求
1. 解释这个方向如何匹配用户的性格特点
2. 强调用户的独特优势如何在这个方向上发挥
3. 给出实用的行动建议
4. 保持积极鼓励的语气
5. 回答控制在200字以内

涉及法律问题时提醒用户"如有疑问建议咨询专业律师"`
})

// AI 初始 prompt
const aiInitialPrompt = computed(() => {
  return `为什么"${props.title}"这个创业方向适合我？请详细解释一下。`
})
</script>

<style lang="scss" scoped>
.direction-card {
  background: white;
  border-radius: $radius-xl;
  box-shadow: $shadow-md;
  overflow: hidden;
  transition: all $transition-fast;
  border: 1px solid rgba($color-brand-primary, 0.06);

  [data-theme="dark"] & {
    background: #1E293B;
    border-color: rgba(255, 255, 255, 0.1);
  }

  &:hover {
    box-shadow: $shadow-lg;
    transform: translateY(-2px);
  }

  &__header {
    display: flex;
    align-items: center;
    gap: $space-lg;
    padding: $space-lg $space-xl;
    cursor: pointer;
  }

  &__rank {
    font-size: $text-xs;
    font-weight: 700;
    color: white;
    background: linear-gradient(135deg, $color-brand-primary 0%, #818CF8 100%);
    padding: $space-sm $space-md;
    border-radius: $radius-full;
    white-space: nowrap;
    box-shadow: 0 2px 8px rgba($color-brand-primary, 0.3);
  }

  &__info {
    flex: 1;
  }

  &__title {
    font-size: $text-lg;
    font-weight: 700;
    color: $color-gray-900;
    margin-bottom: $space-sm;

    [data-theme="dark"] & {
      color: #F8FAFC;
    }
  }

  &__match {
    display: flex;
    align-items: center;
    gap: $space-md;
  }

  &__match-text {
    font-size: $text-sm;
    font-weight: 600;
    color: $color-brand-accent;
  }

  &__arrow {
    font-size: 22px;
    color: $color-gray-400;
    transition: transform $transition-fast;

    [data-theme="dark"] & {
      color: #94A3B8;
    }
  }

  &--expanded &__arrow {
    transform: rotate(180deg);
  }

  &__body {
    padding: 0 $space-xl $space-xl;
  }

  &__section {
    & + & {
      margin-top: $space-lg;
      padding-top: $space-lg;
      border-top: 1px solid $color-gray-100;

      [data-theme="dark"] & {
        border-color: rgba(255, 255, 255, 0.1);
      }
    }
  }

  &__section-title {
    font-size: $text-sm;
    font-weight: 700;
    color: $color-gray-700;
    margin-bottom: $space-sm;
    text-transform: uppercase;
    letter-spacing: 0.5px;

    [data-theme="dark"] & {
      color: #E2E8F0;
    }
  }

  &__section-content {
    font-size: $text-sm;
    color: $color-gray-600;
    line-height: 1.7;

    [data-theme="dark"] & {
      color: #94A3B8;
    }
  }

  &__income {
    color: $color-brand-accent;
    font-weight: 600;
  }

  &__tips {
    li {
      font-size: $text-sm;
      color: $color-gray-600;
      line-height: 1.8;
      padding-left: $space-lg;
      position: relative;

      [data-theme="dark"] & {
        color: #94A3B8;
      }

      &::before {
        content: '';
        position: absolute;
        left: 0;
        top: 10px;
        width: 6px;
        height: 6px;
        background: $color-brand-primary;
        border-radius: 50%;
      }
    }
  }

  &__ai-btn-wrapper {
    margin-top: $space-sm;
  }

  &__ai-panel {
    margin-top: $space-md;
    animation: fadeIn 0.3s ease;
  }

  &__ai-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: $space-sm;
    width: 100%;
    padding: $space-md $space-lg;
    background: linear-gradient(135deg, rgba($color-brand-primary, 0.08) 0%, rgba(#818CF8, 0.08) 100%);
    border: 2px solid rgba($color-brand-primary, 0.2);
    border-radius: $radius-xl;
    color: $color-brand-primary;
    font-size: $text-sm;
    font-weight: 600;
    cursor: pointer;
    transition: all $transition-fast;

    [data-theme="dark"] & {
      background: rgba(99, 102, 241, 0.15);
      border-color: rgba(99, 102, 241, 0.3);
      color: #818CF8;
    }

    &:hover {
      background: linear-gradient(135deg, rgba($color-brand-primary, 0.15) 0%, rgba(#818CF8, 0.15) 100%);
      border-color: $color-brand-primary;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba($color-brand-primary, 0.15);

      [data-theme="dark"] & {
        background: rgba(99, 102, 241, 0.25);
      }
    }

    svg {
      font-size: 18px;
    }
  }
}

.expand-enter-active,
.expand-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
}
</style>
