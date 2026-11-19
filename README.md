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
| 十一种皮肤 | 存钱罐（默认）/ 充电 / 刻度 / 像素 / 霓虹 / 极简 / 纸墨 / 终端 / 心电 / 水球 / 温度 |

## 深链分享

把月薪和皮肤写进链接，发给朋友开箱即用：

```
https://xd.syal.site/?salary=30000&template=pig&demo=1
```

| 参数 | 取值 |
| --- | --- |
| `salary` | 月薪数字，如 `15000` |
| `template` | `pig` / `charge` / `meter` / `pixel` / `neon` / `mono` / `paper` / `term` / `ecg` / `wave` / `therm` / `receipt`（`skin` 同义，`random`/`daily` 特殊值） |
| `currency` | `CNY` / `USD` / `EUR` / `JPY` / `KRW` / `HKD` / `VND` / `IDR` / `GBP` / `SGD` / `AUD` / `ZIM` |
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
| `quote` | `1` 每日打工人语录，或自定义文本 `?quote=摸鱼万岁`（`q` 键切换，记忆） |
| `clock` | `12` 使用 12 小时制时钟 |
| `keys` | `0` 禁用全部快捷键（嵌入场景） |
| `milestone` | `25,100` 自定义破额提醒阈值；`0` 关闭（默认 10/20/50/100/200/500/1000） |
| `light` | `1` 浅色模式（`l` 键切换，记忆本地） |
| `symbol` | 自定义货币符号，≤3 字符，如 `?symbol=€` `?symbol=💰` |
| `theme` | `light` / `dark` / `auto`（auto 跟随系统） |
| `brand` | 自定义左上角品牌名，≤12 字符 |
| `dir` | `down` 倒计时模式：显示距离目标还差多少 |
| `size` | `0.4–2.5` 数字区缩放（电视/投屏用） |
| `fx` | `snow` / `sakura` / `rain` / `matrix` 全屏氛围特效（配专注模式绝配） |
| `vibrate` | `1` 里程碑/达标时手机震动 |
| `compact` | `0` 关闭 万/亿 大数缩写，始终显示完整数字 |
| `ms` | `1` 显示"距下个里程碑还差多少"徽章 |
| `luck` | `1` 每日财运签徽章（按日期抽签） |
| `bgimg` | 背景图 URL（https://），如 `?bgimg=https://…` |
| `badge` | 自定义徽章文字，≤20 字（`?badge=老板别点`） |
| `caption` | 自定义数字下方说明文字，≤40 字 |
| `ss` | 秒数，无操作 N 秒后自动进入专注模式（数字相框） |
| `mirror` | `1` 页面水平镜像（投到镜子/玻璃上用） |
| `streak` | `1` 显示连续打卡天数徽章（🔥） |
| `earn` | 目标金额，`?earn=100` → 倒计时「再 H:MM:SS 到手 ¥100」 |
| `kiosk` | 秒数，每隔 N 秒自动轮换皮肤（`?kiosk=1` 默认 15s），电视/展示模式 |
| `favicon` | 自定义标签页图标 emoji，如 `?favicon=🔥` |
| `crt` | `1` CRT 扫描线滤镜（复古显示器质感） |
| `invert` | `1` 反色滤镜（投影/特殊显示用） |
| `anni` | 纪念日倒计时 `?anni=12-25`，配 `?anniname=名字` 自定义 |
| `year` | `1` 显示今年进度徽章（百分比） |
| `speed` | 演示模式时间流速倍率 `1`–`200`（配 `?demo=`） |
| `toast` | 打开时弹一条自定义提示，≤40 字（`?toast=欢迎老板`） |
| `cn` | `1` 金额旁显示中文数字读法（一二三点四五） |
| `glass` | `1` 毛玻璃面板（配 `?bgimg=` 绝配） |
| `pomodoro` | 番茄钟 `?pomodoro=25` 或 `25,5`（搬砖/摸鱼轮换提醒） |
| `rgb` | `1` 彩虹流转强调色（电竞氛围） |
| `breath` | `1` 仪表盘呼吸灯发光 |
| `notify` | `1` 里程碑到账时发系统通知（需授权） |
| `bw` / `sepia` | `1` 黑白 / 怀旧棕色滤镜 |
| `season` | `auto` 按季节自动特效（冬雪·春樱·夏雨） |
| `friday` | `1` 周五倒计时徽章 |
| `bday` | `MM-DD` 生日倒计时徽章（当天🎂） |
| `spark` | `1` 今日收入迷你走势图 |
| `dim` | `22-6` 该时段自动调暗 55%（夜间保护） |
| `contrast` | `1` 高对比模式（无障碍） |
| `visits` | `1` 累计打开次数徽章（localStorage 计数） |
| `chime` | `1` 整点报时音（需先开 `?sound=1`） |
| `logo` | emoji 自定义左上角图标（如 `?logo=🐷`） |
| `grad` | `1` 缓慢流动的渐变背景 |
| `from` | 名字，访客打开时弹「xxx 喊你一起来数钱」（分享链接会自动保留 `utm_*`/`from`） |
| `moon` | `1` 月相徽章（朔望盈亏 emoji） |
| `all` | `1` 累计入账徽章（本机逐日记录求和） |
| `shake` | `1` 手机摇一摇彩蛋（抖出钱来） |
| `ticker` | 文本，金额下方滚动字幕（≤80 字符） |
| `count` | `1` 打开时数字从 0 滚动到当前金额 |
| `bg` | 十六进制颜色，自定义背景（如 `?bg=1a2b3c`） |
| `hourly` | 时薪数字，自动换算成月薪填入（按当前工时） |
| `week` | `1` 本周进度徽章 |
| `glow` | `1` 金额辉光 + 状态点脉冲 |
| `shift` | 工作时段，如 `9-18` 或 `9-12,13-18`（覆盖排班，最多 4 段） |
| `light` | `1` 浅色 / `0` 深色 / `auto` 白天（7–19 点）浅色 |
| `eink` | `1` 墨水屏模式：去色 + 关掉所有动画 |
| `daily` | 日薪数字，自动换算成月薪填入 |
| `quarter` | `1` 本季度进度徽章（Q1–Q4） |
| `font` | `mono`/`serif`/`round` 切换金额字体 |
| `zodiac` | `1` 当年生肖徽章 |
| `jieqi` | `1` 二十四节气倒计时徽章 |
| `days` | 工作日覆盖，如 `1-5` 或 `0,1,2`（0=周日，本次会话生效） |

皮肤共 12 套，新「收据」皮：`?template=receipt`。

币种现在共 12 种：CNY/USD/EUR/JPY/KRW/HKD/VND/IDR/GBP/SGD/AUD + ZIM 趣味。

`fx` 可选 `snow`/`sakura`/`rain`/`matrix`（字符雨）/`stars`（闪烁星空）。

彩蛋：页面里按 ↑↑↓↓←→←→BA 解锁暴富模式（KONAMI）。

小技巧：双击（或手机长按）金额数字可复制当前金额到剪贴板。

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
