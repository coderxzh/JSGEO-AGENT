# 全局错误处理与 API 重试机制

## 1. 概述

本文档描述了 GEO Agent Studio 项目中全局错误处理和 API 重试机制的实现方案。

### 1.1 解决的问题

| 问题 | 影响 | 解决方案 |
|------|------|----------|
| 没有全局错误处理机制 | React 渲染错误导致白屏 | ErrorBoundary 组件 |
| API 调用无超时保护 | 请求无限挂起 | AbortController 超时 |
| 没有网络重试机制 | 瞬时故障导致操作失败 | 指数退避重试 |
| 错误信息直接暴露 | 可能泄露敏感信息 | 错误消息脱敏 |
| 缺少 ErrorBoundary | 应用崩溃无降级 UI | React 错误边界 |

### 1.2 架构图

```
┌─────────────────────────────────────────────────────────────┐
│                      渲染进程 (React)                        │
├─────────────────────────────────────────────────────────────┤
│  App.tsx                                                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ErrorToastProvider (全局通知)                       │   │
│  │  ┌─────────────────────────────────────────────┐   │   │
│  │  │  ErrorBoundary (错误边界)                    │   │   │
│  │  │  ┌─────────────────────────────────────┐   │   │   │
│  │  │  │  EnterpriseProvider                  │   │   │   │
│  │  │  │  ┌─────────────────────────────┐   │   │   │   │
│  │  │  │  │  业务组件                     │   │   │   │   │
│  │  │  │  │  (使用 useToast 显示错误)     │   │   │   │   │
│  │  │  │  └─────────────────────────────┘   │   │   │   │
│  │  │  └─────────────────────────────────────┘   │   │   │
│  │  └─────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ IPC
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      主进程 (Node.js)                        │
├─────────────────────────────────────────────────────────────┤
│  index.cjs                                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  全局异常捕获 (uncaughtException/unhandledRejection) │   │
│  └─────────────────────────────────────────────────────┘   │
│                              │                              │
│                              ▼                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  API Client (apiClient.cjs)                         │   │
│  │  ┌─────────────────────────────────────────────┐   │   │
│  │  │  fetchWithRetry()                           │   │   │
│  │  │  - 超时控制 (AbortController)               │   │   │
│  │  │  - 自动重试 (指数退避)                      │   │   │
│  │  │  - 错误脱敏                                 │   │   │
│  │  └─────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────┘   │
│                              │                              │
│                              ▼                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  外部 API                                           │   │
│  │  - LLM API (OpenAI/DeepSeek/Doubao)                │   │
│  │  - 超级媒介 API                                     │   │
│  │  - Embedding API                                    │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. 实现细节

### 2.1 API 客户端工具

**文件：** `src/main/services/apiClient.cjs`

#### 2.1.1 fetchWithRetry()

带超时和重试的 fetch 封装：

```javascript
const { fetchWithRetry, sanitizeErrorMessage } = require('./apiClient.cjs');

// 使用示例
const response = await fetchWithRetry('https://api.example.com/data', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ key: 'value' }),
}, {
  timeout: 30000,      // 30 秒超时
  maxRetries: 3,       // 最多重试 3 次
  retryDelay: 1000,    // 初始重试延迟 1 秒
  retryBackoff: 2,     // 指数退避倍数
});
```

#### 2.1.2 重试策略

| 错误类型 | 是否重试 | 说明 |
|----------|----------|------|
| 网络错误 (ENOTFOUND, ECONNRESET) | ✅ | 网络不稳定时自动重试 |
| 超时错误 (AbortController) | ✅ | 请求超时后自动重试 |
| HTTP 408 (请求超时) | ✅ | 服务端超时 |
| HTTP 429 (请求过多) | ✅ | 限流时自动重试 |
| HTTP 5xx (服务器错误) | ✅ | 服务端故障时重试 |
| HTTP 4xx (客户端错误) | ❌ | 除 408 外不重试 |

#### 2.1.3 指数退避

重试间隔按指数增长：

```
第 1 次重试：1 秒
第 2 次重试：2 秒
第 3 次重试：4 秒
第 4 次重试：8 秒
...
```

---

### 2.2 React ErrorBoundary

**文件：** `src/renderer/components/ErrorBoundary.jsx`

#### 2.2.1 功能

- 捕获 React 渲染错误
- 显示友好的降级 UI（而非白屏）
- 提供"重试"和"刷新页面"按钮
- 自动脱敏错误消息
- 开发模式下显示详细错误信息

#### 2.2.2 使用方式

```jsx
import { ErrorBoundary } from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <MyApp />
    </ErrorBoundary>
  );
}
```

#### 2.2.3 自定义 Fallback

```jsx
<ErrorBoundary fallback={<div>自定义错误 UI</div>}>
  <MyApp />
</ErrorBoundary>
```

---

### 2.3 全局错误通知

**文件：** `src/renderer/components/ErrorToast.tsx`

#### 2.3.1 功能

- 支持 error/success/warning/info 四种类型
- 右下角弹窗显示
- 自动消失（可配置时长）
- 支持堆叠多个通知
- 自动脱敏错误消息

#### 2.3.2 使用方式

```tsx
import { useToast } from '../components/ErrorToast';

function MyComponent() {
  const { showError, showSuccess, showWarning, showInfo } = useToast();

  const handleAction = async () => {
    try {
      await someApiCall();
      showSuccess('操作成功');
    } catch (error) {
      showError(error.message, { title: '操作失败' });
    }
  };

  return <button onClick={handleAction}>执行操作</button>;
}
```

#### 2.3.3 配置选项

```tsx
showError('错误消息', {
  title: '自定义标题',    // 默认：'错误'
  duration: 10000,       // 默认：8000ms (错误), 3000ms (成功)
});
```

---

### 2.4 全局异常捕获

#### 2.4.1 渲染端

**文件：** `src/renderer/main.tsx`

```javascript
window.addEventListener('error', (event) => {
  console.error('[渲染端] 全局错误:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('[渲染端] 未处理的 Promise rejection:', event.reason);
});
```

#### 2.4.2 主进程

**文件：** `src/main/index.cjs`

```javascript
process.on('uncaughtException', (error) => {
  console.error('[主进程] 未捕获的异常:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[主进程] 未处理的 Promise rejection:', reason);
});
```

---

### 2.5 错误消息脱敏

**文件：** `src/main/services/apiClient.cjs`

```javascript
function sanitizeErrorMessage(message) {
  if (!message) return message;

  // 移除 Bearer token
  let sanitized = message.replace(/Bearer\s+[A-Za-z0-9._-]+/g, 'Bearer [REDACTED]');

  // 移除 API key
  sanitized = sanitized.replace(/api[_-]?key[=:]\s*[A-Za-z0-9._-]+/gi, 'api_key=[REDACTED]');

  return sanitized;
}
```

---

## 3. 服务集成

### 3.1 LLM Gateway

**文件：** `src/main/services/llmGateway.cjs`

| API 调用 | 超时 | 重试次数 |
|----------|------|----------|
| chatCompletion | 60 秒 | 2 次 |
| chatCompletionStream | 60 秒 | 2 次 |
| responsesCompletion | 60 秒 | 2 次 |
| responsesStream | 60 秒 | 2 次 |

```javascript
const { fetchWithRetry, sanitizeErrorMessage } = require('./apiClient.cjs');

// 修改前
const response = await fetch(url, { method: 'POST', headers, body });

// 修改后
const response = await fetchWithRetry(url, {
  method: 'POST',
  headers,
  body,
}, {
  timeout: 60000,
  maxRetries: 2,
});
```

---

### 3.2 超级媒介服务

**文件：** `src/main/services/chaojimeijieService.cjs`

| 配置项 | 值 |
|--------|-----|
| 超时 | 15 秒 |
| 重试次数 | 2 次 |

```javascript
const { fetchWithRetry, sanitizeErrorMessage } = require('./apiClient.cjs');

async function request(resourceType, action, params = {}, method = 'GET') {
  // ... 现有代码 ...
  const response = await fetchWithRetry(url, init, {
    timeout: 15000,
    maxRetries: 2,
  });
  // ... 后续处理 ...
}
```

---

### 3.3 Embedding 服务

**文件：** `src/main/services/embeddingService.cjs`

| 配置项 | 值 |
|--------|-----|
| 超时 | 30 秒 |
| 重试次数 | 2 次 |

```javascript
const { fetchWithRetry, sanitizeErrorMessage } = require('./apiClient.cjs');

const response = await fetchWithRetry(url, {
  method: 'POST',
  headers,
  body,
}, {
  timeout: 30000,
  maxRetries: 2,
});
```

---

## 4. 文件清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/main/services/apiClient.cjs` | 新建 | 带超时重试的 fetch 封装 |
| `src/renderer/components/ErrorBoundary.jsx` | 新建 | React 错误边界 |
| `src/renderer/components/ErrorToast.tsx` | 新建 | 全局错误通知组件 |
| `src/renderer/main.tsx` | 修改 | 添加全局错误监听 |
| `src/renderer/App.tsx` | 修改 | 包裹 ErrorBoundary 和 ErrorToast |
| `src/main/index.cjs` | 修改 | 添加主进程全局异常捕获 |
| `src/main/services/llmGateway.cjs` | 修改 | 使用 fetchWithRetry |
| `src/main/services/chaojimeijieService.cjs` | 修改 | 使用 fetchWithRetry |
| `src/main/services/embeddingService.cjs` | 修改 | 使用 fetchWithRetry |

---

## 5. 验证方案

### 5.1 ErrorBoundary 测试

```tsx
// 在组件中抛出渲染错误
function BuggyComponent() {
  throw new Error('测试错误');
}

// 验证降级 UI 显示
<ErrorBoundary>
  <BuggyComponent />
</ErrorBoundary>
```

### 5.2 超时测试

```javascript
// 模拟 API 无响应
const response = await fetchWithRetry('https://httpbin.org/delay/60', {}, {
  timeout: 5000,  // 5 秒超时
  maxRetries: 0,  // 不重试
});
// 预期：抛出 AbortError
```

### 5.3 重试测试

```javascript
// 模拟网络错误
const response = await fetchWithRetry('https://invalid.example.com', {}, {
  timeout: 5000,
  maxRetries: 2,
  retryDelay: 100,
});
// 预期：重试 2 次后抛出错误
```

---

## 6. 注意事项

### 6.1 重试策略

- 网络错误（ENOTFOUND、ECONNRESET）自动重试
- HTTP 408/429/5xx 自动重试
- HTTP 4xx（除 408）不重试（客户端错误）
- 指数退避避免雪崩

### 6.2 超时设置

| 服务 | 超时 | 原因 |
|------|------|------|
| LLM API | 60 秒 | 响应可能较慢 |
| 超级媒介 API | 15 秒 | 相对较快 |
| Embedding API | 30 秒 | 批量处理较慢 |

### 6.3 错误脱敏

- 在 ErrorBoundary 和 ErrorToast 中自动过滤敏感信息
- 不显示 API key、token 等
- 错误消息截断到 200-300 字符
