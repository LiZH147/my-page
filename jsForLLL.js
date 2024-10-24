// const axios = require('axios');
// const cheerio = require('cheerio');
// const fs = require('fs');
// const path = require('path');

// const outputDir = "lianglianglee_pages";
// if (!fs.existsSync(outputDir)) {
//     fs.mkdirSync(outputDir);
// }

// // 爬取网页
// const url = 'https://lianglianglee.com/%E4%B8%93%E6%A0%8F/10x%E7%A8%8B%E5%BA%8F%E5%91%98%E5%B7%A5%E4%BD%9C%E6%B3%95/00%20%E5%BC%80%E7%AF%87%E8%AF%8D%20%E7%A8%8B%E5%BA%8F%E5%91%98%E8%A7%A3%E5%86%B3%E7%9A%84%E9%97%AE%E9%A2%98%EF%BC%8C%E5%A4%A7%E5%A4%9A%E4%B8%8D%E6%98%AF%E7%A8%8B%E5%BA%8F%E9%97%AE%E9%A2%98.md';

// let directory = '';

// axios.get(url)
//     .then(response => {
//         const $ = cheerio.load(response.data);

//         // 删除指定的div元素
//         directory = $('uncollapsible');
//         $('.book-sidebar').remove();
//         $('.sidebar-toggle').remove();
//         $('.copyright').remove();
//         // $('div:contains("因收到Google相关通知")').remove();

//         const basename = decodeURIComponent(path.basename(url));
//         const dirName = basename.replace('.md', '');

//         // 保存HTML内容
//         const htmlFile = path.join(outputDir, dirName + '.html');
//         fs.writeFileSync(htmlFile, $.html(), 'utf-8');

//         // 下载图片
//         $('img').each((i, img) => {
//             const imgSrc = $(img).attr('src');
//             const fatherUrl = url.split('/').slice(0, -1).join('/');
//             const imgUrl = imgSrc.startsWith('http') ? imgSrc : `${fatherUrl}/${imgSrc}`;
//             const imgName = path.basename(imgUrl);
//             const imgPath = path.join(outputDir, 'assets/' + imgName);
//             console.log(imgUrl);
//             axios({
//                 url: imgUrl,
//                 responseType: 'stream',
//             }).then(imgResponse => {
//                 imgResponse.data.pipe(fs.createWriteStream(imgPath));
//             }).catch(err => {
//                 console.error(`无法下载图片: ${imgUrl}`, err.message);
//             });
//         });

//         console.log("网页内容爬取完成！");
//     })
//     .catch(error => {
//         console.error(`抓取网页失败: ${error}`);
//     });


const clickDays = () => {
    const divs = document.getElementsByClassName('g-clearfix AuPKyz open-enable');
    for (let i = 100; i < 120; i++) {
        const filename = divs[i].querySelector('.filename').textContent;
        const spanElement = divs[i].querySelector('span.EOGexf');
        // console.log(spanElement.length);
        if (spanElement) {
            spanElement.click();
            console.log(`点击了${filename}`);
        }
    }
    const btn = document.querySelector('em.icon.noicon-zhuancun_bai[title="保存到网盘"]');
    btn.click();
    console.log(`弹出窗口`);
    setTimeout(() => {
        const dirPath = document.querySelector('span.save-chk-io');
        dirPath.click();
        console.log(`选择目录`);
        const saveBtn = document.querySelector('a[title="确定"]');
        saveBtn.click();
        console.log(`保存成功`);
    }, 1000);

}

clickDays();
