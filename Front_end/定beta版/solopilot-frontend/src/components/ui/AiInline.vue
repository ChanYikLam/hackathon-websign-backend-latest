<template>
  <div class="ai-inline">
    <!-- 收起状态: 触发按钮 -->
    <button
      v-if="!isExpanded"
      :class="['ai-inline__trigger', triggerClass]"
      @click="expand"
    >
      <Icon :icon="icon" />
      <span>{{ triggerText }}</span>
    </button>

    <!-- 展开状态: 完整 AI 交互面板 -->
    <div v-else class="ai-inline__panel">
      <div class="ai-inline__header">
        <div class="ai-inline__header-left">
          <Icon icon="mdi:robot-happy" class="ai-inline__avatar" />
          <span class="ai-inline__title">{{ title }}</span>
        </div>
        <button class="ai-inline__close" @click="collapse">
          <Icon icon="mdi:close" />
        </button>
      </div>

      <div ref="messagesRef" class="ai-inline__messages">
        <!-- 欢迎提示 -->
        <div v-if="messages.length === 0" class="ai-inline__welcome">
          <p>{{ welcomeText }}</p>
        </div>

        <!-- 消息列表 -->
        <div
          v-for="(msg, idx) in messages"
          :key="idx"
          :class="['ai-inline__message', `ai-inline__message--${msg.role}`]"
        >
          <div v-if="msg.role === 'assistant'" class="ai-inline__bubble-avatar">
            <Icon icon="mdi:robot-happy" />
          </div>
          <div class="ai-inline__bubble">
            <div class="ai-inline__bubble-content" v-html="renderMarkdown(msg.content)"></div>
          </div>
        </div>

        <!-- 打字指示器 -->
        <div v-if="isStreaming && streamingContent" class="ai-inline__message ai-inline__message--assistant">
          <div class="ai-inline__bubble-avatar">
            <Icon icon="mdi:robot-happy" />
          </div>
          <div class="ai-inline__bubble">
            <div class="ai-inline__bubble-content" v-html="renderMarkdown(streamingContent)"></div>
            <span class="ai-inline__cursor"></span>
          </div>
        </div>

        <div v-else-if="isStreaming" class="ai-inline__message ai-inline__message--assistant">
          <div class="ai-inline__bubble-avatar">
            <Icon icon="mdi:robot-happy" />
          </div>
          <div class="ai-inline__bubble ai-inline__typing">
            <span></span><span></span><span></span>
          </div>
        </div>
      </div>

      <!-- 输入区域 -->
      <div class="ai-inline__input-area">
        <div class="ai-inline__input-wrapper">
          <input
            v-model="inputText"
            class="ai-inline__input"
            :placeholder="placeholder"
            :disabled="isStreaming"
            @keydown.enter="send"
          />
          <button
            :class="['ai-inline__send', { 'ai-inline__send--active': canSend }]"
            :disabled="!canSend"
            @click="send"
          >
            <Icon icon="mdi:send" />
          </button>
        </div>
        <p class="ai-inline__disclaimer">AI 回复仅供参考</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { Icon } from '@iconify/vue'
import { streamChat, renderMarkdown, type AiMessage, type PromptType } from '@/services/aiService'

interface Props {
  title?: string
  triggerText?: string
  triggerClass?: string
  icon?: string
  placeholder?: string
  welcomeText?: string
  promptType?: PromptType
  initialPrompt?: string
  systemContext?: string
}

const props = withDefaults(defineProps<Props>(), {
  title: 'AI 助手',
  triggerText: '问问 AI',
  triggerClass: '',
  icon: 'mdi:robot-happy',
  placeholder: '输入您的问题...',
  welcomeText: '有什么问题？直接问我就好',
  promptType: 'default',
  systemContext: ''
})

const emit = defineEmits<{
  close: []
}>()

// 状态
const isExpanded = ref(false)
const inputText = ref('')
const messages = ref<AiMessage[]>([])
const isStreaming = ref(false)
const streamingContent = ref('')
const messagesRef = ref<HTMLElement | null>(null)

// 计算属性
const canSend = computed(() => inputText.value.trim().length > 0 && !isStreaming.value)

// 方法
const expand = async () => {
  isExpanded.value = true
  await nextTick()

  // 如果有初始 prompt，自动发送
  if (props.initialPrompt) {
    inputText.value = props.initialPrompt
    await send()
  }

  scrollToBottom()
}

const collapse = () => {
  isExpanded.value = false
  emit('close')
}

const send = async () => {
  if (!canSend.value) return

  const userMessage = inputText.value.trim()
  inputText.value = ''
  streamingContent.value = ''

  // 添加用户消息
  messages.value.push({ role: 'user', content: userMessage })
  scrollToBottom()

  // 构建 API 消息
  const systemPrompt = props.systemContext ||
    (props.promptType === 'result' ? '你是一位创业规划顾问，基于用户的MBTI类型、分析结果、用户画像，为用户解释为什么推荐特定方向。' :
     props.promptType === 'compliance' ? '你是一位专业的创业法律顾问。你需要根据用户的问题，给出实用、可操作的建议。' :
     props.promptType === 'scenario' ? '你是一位熟悉中国创业合规场景的专家。用户正在查看特定的合规场景，你需要给出实用的建议和下一步行动。' :
     '你是 SoloPilot AI，一位专注于一人公司创业的智能助手。')

  const apiMessages: AiMessage[] = [
    { role: 'system', content: systemPrompt },
    ...messages.value
  ]

  // 开始流式请求
  isStreaming.value = true

  try {
    for await (const chunk of streamChat(apiMessages)) {
      streamingContent.value += chunk
      scrollToBottom()
    }

    // 流式结束，将内容存入消息列表
    if (streamingContent.value) {
      messages.value.push({ role: 'assistant', content: streamingContent.value })
      streamingContent.value = ''
    }
  } catch (error) {
    console.error('AI 请求失败:', error)
    messages.value.push({
      role: 'assistant',
      content: '抱歉，网络不太好，稍后再试一次吧'
    })
  } finally {
    isStreaming.value = false
    scrollToBottom()
  }
}

const scrollToBottom = () => {
  nextTick(() => {
    if (messagesRef.value) {
      messagesRef.value.scrollTop = messagesRef.value.scrollHeight
    }
  })
}
</script>

<style lang="scss" scoped>
.ai-inline {
  &__trigger {
    display: inline-flex;
    align-items: center;
    gap: $space-sm;
    padding: $space-sm $space-md;
    border: 1.5px solid rgba($color-brand-primary, 0.3);
    border-radius: $radius-full;
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

    &:hover {
      background: $color-brand-primary-light;
      border-color: $color-brand-primary;
      transform: translateY(-1px);

      [data-theme="dark"] & {
        background: rgba(99, 102, 241, 0.2);
      }
    }

    &[data-variant="primary"] {
      background: linear-gradient(135deg, $color-brand-primary 0%, #818CF8 100%);
      color: white;
      border: none;
      box-shadow: 0 2px 8px rgba($color-brand-primary, 0.3);

      &:hover {
        box-shadow: 0 4px 12px rgba($color-brand-primary, 0.4);
      }
    }
  }

  &__panel {
    background: white;
    border-radius: $radius-xl;
    border: 1px solid rgba($color-brand-primary, 0.08);
    box-shadow: $shadow-lg;
    overflow: hidden;

    [data-theme="dark"] & {
      background: #1E293B;
      border-color: rgba(255, 255, 255, 0.1);
    }
  }

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: $space-md $space-lg;
    background: linear-gradient(135deg, $color-brand-primary 0%, #818CF8 100%);
    color: white;
  }

  &__header-left {
    display: flex;
    align-items: center;
    gap: $space-sm;
  }

  &__avatar {
    font-size: 20px;
  }

  &__title {
    font-size: $text-sm;
    font-weight: 700;
  }

  &__close {
    width: 28px;
    height: 28px;
    border-radius: $radius-full;
    border: none;
    background: rgba(255, 255, 255, 0.2);
    color: white;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    transition: background $transition-fast;

    &:hover {
      background: rgba(255, 255, 255, 0.3);
    }
  }

  &__messages {
    max-height: 300px;
    min-height: 120px;
    overflow-y: auto;
    padding: $space-md $space-lg;
    display: flex;
    flex-direction: column;
    gap: $space-md;

    &::-webkit-scrollbar {
      width: 4px;
    }

    &::-webkit-scrollbar-thumb {
      background: rgba($color-brand-primary, 0.15);
      border-radius: $radius-full;
    }
  }

  &__welcome {
    text-align: center;
    padding: $space-lg;
    color: $color-gray-500;
    font-size: $text-sm;

    [data-theme="dark"] & {
      color: #94A3B8;
    }
  }

  &__message {
    display: flex;
    gap: $space-sm;
    max-width: 90%;

    &--user {
      align-self: flex-end;
      flex-direction: row-reverse;
    }

    &--assistant {
      align-self: flex-start;
    }
  }

  &__bubble-avatar {
    width: 24px;
    height: 24px;
    border-radius: $radius-full;
    background: $color-brand-primary-light;
    color: $color-brand-primary;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    flex-shrink: 0;

    [data-theme="dark"] & {
      background: rgba(99, 102, 241, 0.2);
      color: #818CF8;
    }
  }

  &__bubble {
    padding: $space-sm $space-md;
    border-radius: $radius-lg;
    font-size: $text-sm;
    line-height: 1.5;

    .ai-inline__message--user & {
      background: linear-gradient(135deg, $color-brand-primary 0%, #818CF8 100%);
      color: white;
      border-bottom-right-radius: $radius-sm;
    }

    .ai-inline__message--assistant & {
      background: $color-gray-100;
      color: $color-gray-900;

      [data-theme="dark"] & {
        background: #334155;
        color: #F8FAFC;
      }
    }
  }

  &__bubble-content {
    :deep(strong) {
      font-weight: 700;
    }

    :deep(em) {
      font-style: italic;
    }

    :deep(.ai-chat__md-h) {
      font-weight: 700;
      margin: $space-xs 0;
      font-size: $text-xs;
    }

    :deep(.ai-chat__md-li) {
      padding-left: $space-sm;
      position: relative;

      &::before {
        content: '·';
        position: absolute;
        left: 0;
      }
    }

    :deep(.ai-chat__code) {
      background: rgba(0, 0, 0, 0.06);
      border-radius: $radius-sm;
      padding: $space-xs $space-sm;
      font-size: $text-xs;
      font-family: monospace;

      [data-theme="dark"] & {
        background: rgba(0, 0, 0, 0.3);
      }
    }
  }

  &__cursor {
    display: inline-block;
    width: 2px;
    height: 12px;
    background: $color-brand-primary;
    margin-left: 2px;
    vertical-align: text-bottom;
    animation: blink-cursor 0.8s step-end infinite;
  }

  &__typing {
    display: flex;
    gap: 4px;
    padding: $space-xs 0;

    span {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: $color-gray-400;
      animation: typing-bounce 1.4s ease-in-out infinite;

      &:nth-child(2) { animation-delay: 0.2s; }
      &:nth-child(3) { animation-delay: 0.4s; }
    }
  }

  &__input-area {
    padding: $space-sm $space-md $space-md;
    border-top: 1px solid $color-gray-100;

    [data-theme="dark"] & {
      border-top-color: #334155;
    }
  }

  &__input-wrapper {
    display: flex;
    align-items: center;
    gap: $space-sm;
    background: $color-gray-100;
    border-radius: $radius-lg;
    padding: $space-xs $space-sm $space-xs $space-md;

    [data-theme="dark"] & {
      background: #0F172A;
    }
  }

  &__input {
    flex: 1;
    border: none;
    background: transparent;
    font-size: $text-sm;
    color: $color-gray-900;
    outline: none;
    padding: $space-xs 0;

    [data-theme="dark"] & {
      color: #F8FAFC;
    }

    &::placeholder {
      color: $color-gray-400;
    }

    &:disabled {
      opacity: 0.6;
    }
  }

  &__send {
    width: 32px;
    height: 32px;
    border-radius: $radius-full;
    border: none;
    background: $color-gray-200;
    color: $color-gray-500;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    transition: all $transition-fast;
    flex-shrink: 0;

    [data-theme="dark"] & {
      background: #334155;
      color: #64748B;
    }

    &--active {
      background: linear-gradient(135deg, $color-brand-primary 0%, #818CF8 100%);
      color: white;

      &:hover {
        transform: scale(1.05);
      }
    }

    &:disabled {
      cursor: not-allowed;
    }
  }

  &__disclaimer {
    font-size: 10px;
    color: $color-gray-400;
    text-align: center;
    margin: $space-xs 0 0;

    [data-theme="dark"] & {
      color: #475569;
    }
  }
}

@keyframes blink-cursor {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

@keyframes typing-bounce {
  0%, 60%, 100% { transform: translateY(0); }
  30% { transform: translateY(-4px); }
}
</style>
