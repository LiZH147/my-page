const http = require('http');
const axios = require('axios');
require('dotenv').config();

// const HOST = "https://xui.ai-wallpaper.cn/xui";
const HOST = "localhost";
const PORT = 63105;

const server = http.createServer(async (req, res) => {
    // 设置响应头，支持跨域
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');

    // 示例：处理incoming请求
    if (req.url === '/api/get' && req.method === 'GET') {
        try {
            // 发送GET请求到外部API
            const response = await axios.get('https://gitee.com/lizihan147/Obsidian-depository');

            res.writeHead(200);
            res.end(JSON.stringify({
                success: true,
                data: response.data
            }));
        } catch (error) {
            res.writeHead(500);
            res.end(JSON.stringify({
                success: false,
                error: error.message
            }));
        }
    } else {
        // 处理未知路径
        res.writeHead(404);
        res.end(JSON.stringify({
            success: false,
            message: '未找到路径'
        }));
    }
});

if (HOST === 'localhost') {
    server.listen(PORT, () => {
        console.log(`服务器运行在 ${HOST}:${PORT}`);
    });
} else {
    server.listen(HOST, PORT, () => {
        console.log(`服务器运行在 ${HOST}:${PORT}`);
    });
}  
