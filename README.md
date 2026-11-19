# 薪动 · 每一秒，都算数

> 输入月薪，看着收入按秒跳动。一个免费、免注册、纯本地的实时工资秒表。

![薪动 · 存钱罐主题（默认）](docs/screenshot-pig.png)

[![在线体验](https://img.shields.io/badge/在线体验-xd.syal.site-3ddc84)](https://xd.syal.site/)
[![site-check](https://github.com/LCYLYM/test-devin/actions/workflows/site-check.yml/badge.svg)](https://github.com/LCYLYM/test-devin/actions/workflows/site-check.yml)
![零依赖](https://img.shields.io/badge/依赖-0-3ddc84)
![无需注册](https://img.shields.io/badge/注册-不需要-blue)
![数据](https://img.shields.io/badge/数据-只存本地-blue)

## 它能做什么

| 能力 | 说明 |
| --- | --- |
| 实时秒表 | 月薪按当月实际工作日分摊到每一秒，工作时段内数字滚动 |
| 中国节假日 | 内置 2025/2026 法定节假日与调休补班，自动扣假、自动补班 |
| 自定义排班 | 固定双休、自定义每周工作日、单日期手动调整 |
| 加班 | 加班计时器 + 按天补记，算出真实时薪 |
| 多币种 | Frankfurter 实时汇率换算，含「津巴布韦 · 亿万富翁」趣味模式 |
| 分享海报 | 一键生成 1080×1440 收入海报 + 二维码 |
| 七种皮肤 | 存钱罐（默认）/ 充电 / 刻度 / 像素 / 霓虹 / 极简 / 纸墨 |

## 深链分享

把月薪和皮肤写进链接，发给朋友开箱即用：

```
https://xd.syal.site/?salary=30000&template=pig&demo=1
```

| 参数 | 取值 |
| --- | --- |
| `salary` | 月薪数字，如 `15000` |
| `template` | `pig` / `charge` / `meter` / `pixel` / `neon` / `mono` / `paper` / `term` / `ecg` / `wave`（`skin` 同义，`random`/`daily` 特殊值） |
| `currency` | `CNY` / `USD` / `EUR` / `JPY` / `KRW` / `HKD` / `VND` / `IDR` / `ZIM` |
| `period` | `day` / `month` |
| `demo` | `1` 开启演示模式（数字可设倍速，如 `60`） |
| `focus` | `salary` 打开时聚焦月薪输入 |
| `zen` | `1` 进入专注模式 |
| `sound` | `1` 开启音效 |
| `accent` | 自定义强调色（hex 或 CSS 颜色名），`off` 清除（记忆） |
| `dialog` | `share\|about\|settings\|goal\|calendar\|currency\|overtime` 直接打开面板 |
| `title` | `0` 关闭标签页金额跳动 |
| `payday` | `1`–`31` 发薪日倒计时（记忆，`0` 清除） |
| `work` | 工作时段，如 `0900-1200,1330-1800` |
| `goal` | 金额，配合 `goalname` 预填小目标 |
| `hide` | 隐藏区块：`header,footer,faq,utility,summary,overtime,bottom,toolbar,foot,badges` |
| `embed` | `1` 隐藏页头页脚 FAQ，适合 iframe 嵌入 |
| `vs` | 等价物换算徽章：`?vs=奶茶@15` 显示「≈ N 杯奶茶」 |
| `avg` | 时薪对比徽章：`?avg=8000` 显示你的时薪 vs 均值 |
| `pet` | 给存钱罐小猪起名：`?pet=旺财` |
| `confetti` | `0` 关闭达成 100% 时的撒花 |
| `dec` | 金额小数位 `2`–`6`（配 `?demo=` 高速演示更爽） |
| `rate` | 费率单位：`sec`/`min`/`hour`（同点按费率胶囊，记忆） |
| `bg` | 自定义页面背景（hex 或 CSS 颜色名），`off` 清除（记忆） |
| `emoji` | 状态角标 emoji：`?emoji=🔥` |
| `quote` | `1` 显示打工人语录，`0` 关闭（`q` 键切换，记忆） |
| `clock` | `12` 使用 12 小时制时钟 |

## 本地跑

纯静态文件，无构建：

```bash
python3 -m http.server 8000
# 打开 http://localhost:8000
```

## 隐私

没有账号、没有后端、没有追踪。所有数据只保存在浏览器的 `localStorage`。

## 作者

[生鱼安乐](https://github.com/LCYLYM) · 更多小工具 → [tool.syal.site](https://tool.syal.site/)

> 首次访问跟随系统明暗主题：浅色系统默认纸墨皮，深色默认存钱罐；之后记住你的选择。
