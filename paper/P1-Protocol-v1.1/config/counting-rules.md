# 图片计数规则（四层）

## 字段定义

| 字段 | 定义 | 判定方法 |
|---|---|---|
| `raw_count` | 返回的文件数量 | 直接计数 `inlineData` part |
| `decodable_count` | 能正常解码的图片数量 | 文件头校验 + 完整解码 |
| `unique_count` | 排除重复后的独立图片数量 | 完全重复用 SHA256；近似重复按下方标准 |
| `task_conforming_count` | 符合原始任务要求的独立图片数量 | 内容为「卧室女孩看书」且非拼图 |

## 主要终点

**`task_conforming_count` 是 D1 vs B 的主要终点。**

## 判定细则

### 拼图

一张文件内含多个画面（三联、九宫格等）：
- `raw_count` +1
- `decodable_count` +1
- `unique_count` +1
- `task_conforming_count` +0

### 完全重复

两个文件 SHA256 相同 → 只算 1 张 unique。

### 近似重复

不使用主观判断。判定标准（须在阶段一验证可行）：

1. 计算图片感知哈希（pHash 或 dHash）
2. 汉明距离 ≤ 5 视为近似重复
3. 近似重复只算 1 张 unique
4. 判定脚本与阈值写入 `counting-rules.md`，不得事后修改

**如果感知哈希在阶段一被证明不可靠，则放弃近似重复判定，只保留完全重复判定，并在协议中注明。**

### 主题偏离

图片可解码、非拼图、非重复，但内容不是「卧室女孩看书」：
- `task_conforming_count` +0
- 标记 `topic_drift: true`

主题偏离**不并入欠交付**，单独报告「主题保持率」。

### 损坏图片

无法解码：
- `decodable_count` +0
- 后续计数均 +0
- 标记 `corrupt: true`

### 部分成功

一次调用返回 6 张，其中 1 张损坏：
- raw=6, decodable=5, unique=5, task_conforming=5（假设无重复无偏离）

## 示例

返回 6 张：1 张损坏、1 张完全重复、1 张主题偏离、其余 3 张符合要求。

| 字段 | 值 |
|---|---:|
| raw_count | 6 |
| decodable_count | 5 |
| unique_count | 4 |
| task_conforming_count | 3 |

## 失败调用

`error` 类运行：
- 全部计数记 0
- 保留在 ITT 分母中
- 单独报告失败率

## 文本产物计数（T-D1 / T-B）

- 按编号标记计数：`版本一/二/三`、`描述 1/2/3`、`第N份`、行首有序编号
- 取所有模式中的最大计数
- 无编号标记时按段落结构人工判断
- 超额（>9）记 `over`，不封顶