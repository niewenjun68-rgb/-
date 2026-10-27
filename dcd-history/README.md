# 懂车帝历史补充数据

`tools/dcd-import.js` 使用懂车帝公开车型接口，导出车系的年款、停售车型、指导价以及能查询到的配置字段。它不需要登录 Cookie，但需要网络能访问懂车帝接口。

```bash
set DCD_PROXY=http://127.0.0.1:7897
node tools/dcd-import.js --series-id 4539 --name "宋PLUS"
```

输出文件位于 `dcd-history/<车系ID>.json`。车系 ID 可以先从懂车帝搜索或车系接口获得。

数据层次：

- `autohome-main/data`：汽车之家当前配置 CSV，作为主配置源。
- `dcd-history`：懂车帝年款/停售车型补充源，保留 `source`、`series_id`、`car_id` 和更新时间。

懂车帝的历史停售车型并不保证都有完整参数配置，因此导入器不会伪造缺失字段。后续合并时按“品牌 + 车系 + 年款 + 配置名称”去重，并保留数据来源。
