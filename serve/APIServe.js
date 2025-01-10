const http = require('http');
const axios = require('axios');
const cheerio = require('cheerio');
require('dotenv').config();

// const HOST = "https://xui.ai-wallpaper.cn/xui";
const HOST = "localhost";
const PORT = 63105;

async function getDir(dirName, res) {
    try {
        // 发送GET请求到外部API
        const response = await axios.get(`https://gitee.com/lizihan147/Obsidian-depository/tree/main/${dirName}`);
        const $ = cheerio.load(response.data);
        let dirNames = [];
        $('.tree-folder-item').each((index, element) => {
            // console.log('标题：', $(element).text())
            let eleText = $(element).text();
            // console.log(eleText, eleText.length, eleText[eleText.length - 1])
            if (eleText[eleText.length - 1] == 'd' && eleText[eleText.length - 2] == 'm') {
                dirNames.push(eleText)
            }
        })
        res.writeHead(200);
        res.end(JSON.stringify({
            success: true,
            data: dirNames
        }));
    } catch (error) {
        res.writeHead(500);
        res.end(JSON.stringify({
            success: false,
            error: error.message
        }));
    }
}

async function getArticle(dirName, articleName, res) {
    try {
        // 发送GET请求到外部API
        const response = await axios.get(`https://gitee.com/lizihan147/Obsidian-depository/blob/main/${dirName}/${articleName}`);

        const $ = cheerio.load(response.data);
        let article = '';
        $('blob-markdown-renderer').each((index, element) => {
            // console.log('文章内容：', $(element).html());
            article = $(element).html();
        })

        res.writeHead(200);
        res.end(JSON.stringify({
            success: true,
            data: article
        }));
    } catch (error) {
        res.writeHead(500);
        res.end(JSON.stringify({
            success: false,
            error: error.message
        }));
    }
}

const server = http.createServer(async (req, res) => {
    // 设置响应头，支持跨域
    // 解析 URL
    const url = new URL(req.url, `http://${req.headers.host}`);

    // 获取查询参数
    const params = new URLSearchParams(url.search);

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'GET') {
        let reqURL = url.pathname;
        switch (reqURL) {
            case '/api/getDep':
                try {
                    // 发送GET请求到外部API
                    const response = await axios.get('https://gitee.com/lizihan147/Obsidian-depository');

                    const $ = cheerio.load(response.data);
                    let dirNames = [];
                    $('.tree-folder-item').each((index, element) => {
                        let eleText = $(element).text();
                        dirNames.push(eleText)
                    })
                    res.writeHead(200);
                    res.end(JSON.stringify({
                        success: true,
                        data: dirNames
                    }));
                } catch (error) {
                    res.writeHead(500);
                    res.end(JSON.stringify({
                        success: false,
                        error: error.message
                    }));
                }
                break;
            case '/api/getDir':
                console.log('参数值：', params.get('name'))
                getDir(params.get('name'), res);
                break;
            case '/api/getArticle':
                console.log(params)
                console.log(params.get('dirName'));
                console.log(params.get('articleName'));
                getArticle(params.get('dirName'), params.get('articleName'), res);
                break;
            default:
                // 处理未知路径
                res.writeHead(404);
                res.end(JSON.stringify({
                    success: false,
                    message: '未找到路径'
                }))
                break;
        }
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
