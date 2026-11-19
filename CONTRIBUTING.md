# 参与贡献

小工具，大快乐。欢迎提 Issue 和 PR。

## 本地开发
纯静态文件，无需构建：
```bash
python3 -m http.server 8000
```

## 约定
- `index.html` + `assets/` 即是全部源码
- 不引入构建工具、不引入依赖 —— 保持「打开就能跑」
- 提交信息格式：`iter-NN: 做了什么`

## 检查

提交前跑 `python3 tests/check_site.py`（CI 同一条）。新增皮肤：按钮 `data-template` 必须与 `app.js` 白名单一致，并更新 README/llms.txt。
