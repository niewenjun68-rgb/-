# 搜车王 · 配置定位工具

手机浏览器打开 `app/` 即可使用。它是纯静态网页：搜索车系后读取对应 CSV，自动挑选最能区分配置的参数，回答 3～8 个问题后给出具体配置，并可展开完整配置对比表。

## 本地预览

在项目根目录运行任意静态服务器（不要直接双击 HTML，因为浏览器会拦截 CSV 读取），例如：

```bash
npx serve .
```

然后打开 `/app/`。

## 零成本部署

把整个项目推到 GitHub，在仓库 Settings → Pages 选择 `Deploy from a branch`、`/(root)`，访问生成的 `https://用户名.github.io/仓库名/app/`。也可以把 `app` 文件夹单独作为 Pages 根目录，但要同时保留 `autohome-main/data` 数据目录，或把 `DATA_BASE` 改成你的数据地址。

## 数据更新

当前页面使用项目内的 `autohome-main/data` 和自动生成的 `app/models.json`，不会在用户手机上联网抓取汽车之家。上游仓库 README 说明其数据按月维护，但不等于你的部署会自动更新。更新时重新下载上游数据并运行 `node build-index.js`，再提交即可。实际报价前建议人工复核铭牌和实车配置，开源数据可能存在缺项或发布时间差异。
