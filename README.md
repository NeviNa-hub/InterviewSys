# InterviewSys 前端

| 使用场景 | 启动方式 | API 来源 |
|---|---|---|
| 本地演示 | npm ci，然后 npm run dev | Vite 内置的 HTTP 模拟服务，无需 Python、数据库或模型密钥 |
| 本地页面连接服务器 | 在 .env.server.local 设置 INTERVIEW_API_TARGET=https://你的后端域名，然后 npm run dev:server | Vite 将同源 /api 请求代理至服务器 |
| 正式部署 | 在服务器执行 npm ci 和 npm run build，将 dist 部署到 Web 服务器 | 默认同源 /api，通过反向代理连接 FastAPI |

演示服务默认只监听本机。首次打开自动进入模拟管理员工作台，刷新保留当前会话，退出后可使用虚构资料模拟登录。演示上传仅取文件名，聊天、追问、评分和报告为示例数据。服务重启会清空演示记录。演示模式仅用于 Vite 开发服务；正式静态站点连接真实 API。

生产环境建议使用同源反向代理以支持会话 Cookie。Nginx 示例（将 upstream 地址换成实际服务器地址，前端域名启用 HTTPS）：

```nginx
location /api/ {
    proxy_pass http://interview-api:8080;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_buffering off;
    proxy_read_timeout 300s;
    client_max_body_size 16m;
}
location / {
    try_files $uri $uri/ /index.html;
}
```

可选数字人独立运行，配置 VITE_LIVE2D_URL 后加载。
