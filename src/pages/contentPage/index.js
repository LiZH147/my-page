import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { md } from "./markdownText";

import './index.css'

export default function MainPage() {
    const { path, name } = useParams();
    const [content, setContent] = useState('');

    useEffect(() => {
        axios.get(`https://zihan-page-api.vercel.app/api/getArticle?dirName=${path}&articleName=${name}`)
            .then(res => {
                // 假设返回的数据中包含 markdown 文本
                console.log(res)
                let originText = res.data.data, begin = 0, end = 0;
                for(let i = 0; i < originText.length - 1; i++){
                    if(originText[i] === '>')
                        begin = i;
                    if(originText[i] === '<' && originText[i + 1] === '/'){
                        end = i;
                        break;
                    }
                }
                const markdownText = originText.substring(begin, end);
                // 将 markdown 转换为 HTML
                const htmlContent = md.render(markdownText);
                setContent(htmlContent);
            })
            .catch(err => console.log(err))
    }, [path, name])

    return (
        <div style={{ margin: '0 auto', width: '80%' }}>
            {/* 使用 dangerouslySetInnerHTML 来渲染 HTML */}
            <div 
                className="markdown-content"
                dangerouslySetInnerHTML={{ __html: content }} 
            />
        </div>
    )
}
