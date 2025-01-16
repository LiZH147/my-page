const http = require('http');
const axios = require('axios');
const cheerio = require('cheerio');
require('dotenv').config();

// const HOST = "https://xui.ai-wallpaper.cn/xui";
const HOST = "localhost";
const PORT = 63105;

function getDepOrDir(response, flag = 2) {
    const $ = cheerio.load(response.data);
    let dirNames = [], artNames = [];
    $('.tree-folder-item').each((index, element) => {
        // console.log('标题：', $(element).text())
        let eleText = $(element).text();
        // console.log(eleText, eleText.length, eleText[eleText.length - 1])
        if (!(eleText[0] === '.' || eleText === 'LICENSE' || eleText === '预推免相关\n\n' || eleText.toLowerCase().endsWith('.png') || eleText.toLowerCase().endsWith('.jpg'))) {
            eleText.includes('.') ? artNames.push(eleText) : dirNames.push(eleText)
        };
    })

    switch (flag) {
        case 0:
            return artNames;
        case 1:
            return {
                "dir": dirNames,
                "art": artNames
            };
        default:
            return dirNames;
    }
}

async function getDir(dirName, res) {
    try {
        // 发送GET请求到外部API
        const response = await axios.get(`https://gitee.com/lizihan147/Obsidian-depository/tree/main/${dirName}`);

        let dirNames = getDepOrDir(response);

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

async function getAllArticle(res) {
    async function getDirectoryContent(path = '') {
        try {
            const url = path ? 
                `https://gitee.com/lizihan147/Obsidian-depository/tree/main/${path}` :
                'https://gitee.com/lizihan147/Obsidian-depository';
                
            const response = await axios.get(url);
            const content = getDepOrDir(response, 1);
            
            let result = {
                articles: content["art"],
                directories: {}
            };
            
            // 递归获取每个子目录的内容
            for (let dir of content["dir"]) {
                const dirPath = path ? `${path}/${dir}` : dir;
                result.directories[dir] = await getDirectoryContent(dirPath);
            }
            
            return result;
        } catch (error) {
            console.error(`获取路径 ${path} 内容失败:`, error.message);
            return { articles: [], directories: {} };
        }
    }

    try {
        const result = await getDirectoryContent();
        res.writeHead(200);
        res.end(JSON.stringify({
            success: true,
            data: result
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
                    let dirNames = [], articleNames = [];
                    $('.tree-folder-item').each((index, element) => {
                        let eleText = $(element).text();
                        // let dateDiv = $(element).parent().parent();
                        // dateDiv.each((i, child) => {
                        //     console.log(`子元素文本内容 (${i + 1}):`, $(child).text(), $(child).attr('class'));
                        // })
                        let tempObj = {
                            id: index,
                            name: eleText,
                            date: '4个月前',
                            outline: eleText
                        }
                        if (!(eleText[0] === '.' || eleText === 'LICENSE')) {
                            eleText.includes('.') ? articleNames.push(eleText) : dirNames.push(eleText)
                        };

                        console.log("链接：", $(element).attr('href'))
                    })
                    res.writeHead(200);
                    res.end(JSON.stringify({
                        success: true,
                        data: {
                            "dir": dirNames,
                            "article": articleNames
                        }
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
            case '/api/getAllArticle':
                getAllArticle(res);
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
