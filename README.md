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
| `template` | `pig` / `charge` / `meter` / `pixel` / `neon` / `mono` / `paper`（`skin` 同义） |
| `currency` | `CNY` / `USD` / `EUR` / `JPY` / `KRW` / `HKD` / `VND` / `IDR` / `ZIM` |
| `period` | `day` / `month` |
| `demo` | `1` 开启演示模式 |
| `focus` | `salary` 打开时聚焦月薪输入 |
| `zen` | `1` 进入专注模式 |
| `sound` | `1` 开启音效 |
| `title` | `0` 关闭标签页金额跳动 |

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
