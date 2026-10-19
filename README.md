# 时间线

这是一个独立的静态站点，发布内容位于 `site/`。GitHub Actions 会把它发布到 `gh-pages` 分支，站点使用 `hushuikun.com` 域名。

## 更新时间线

1. 编辑 `site/data/memories.js`，在数组中添加记录。
2. 如果需要配图，将图片放到 `site/assets/`，并给记录添加 `image` 和 `alt` 字段。
3. 推送到 `master`，GitHub Actions 会自动发布。

纯文字记录示例：

```js
window.MEMORIES = [
  {
    date: "2026-10-19",
    title: "记录标题",
    text: "第一行记录。\n第二行记录。",
  },
];
```

日期使用 `YYYY-MM-DD` 格式，时间线会按日期倒序排列，并根据日期生成年份筛选。`title` 和 `text` 至少填写一项；`time`（如 `16:23`）、`location`、`image` 和 `alt` 均可选。不填 `image` 时，节点只显示文字，不保留图片占位。正文按纯文本显示，保留换行。

示例图片及记录已清理，当前没有记录时显示“暂无记录”。
