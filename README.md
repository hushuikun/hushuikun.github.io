# 漫画回忆录

这是一个独立的静态站点，发布内容位于 `site/`。GitHub Actions 会把它发布到 `gh-pages` 分支，站点使用 `hushuikun.com` 域名。

## 更新时间线

1. 将照片或处理好的漫画图片放到 `site/assets/`，建议先压缩为 WebP。
2. 编辑 `site/data/memories.js`，复制一条记录并更新日期、标题和图片路径。
3. 推送到 `master`，GitHub Actions 会自动发布。

日期使用 `YYYY-MM-DD` 格式，时间线会按日期倒序排列，并根据日期生成年份筛选。当前页面里的三幅 SVG 是标注过的视觉样例，之后可以替换成自己的图片。
