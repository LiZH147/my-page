import React, { useEffect, useState } from 'react'
import { Card, List } from "antd";
import axios from 'axios';
import { Link, useParams } from 'react-router-dom';

export default function MainCpn() {
  const [datas, setDatas] = useState([]);
  const { dirName } = useParams();
  const axiosUrl = dirName
    ? `https://zihan-page-api.vercel.app/api/getDir?name=${dirName}`
    : "https://zihan-page-api.vercel.app/api/getAllArticle"

  useEffect(() => {
    axios.get(axiosUrl).then(res => {
      // !dirName ? console.log("allArticles:", res) : console.log("dirName:", res)

      let tempDatas = [];
      let resDatas = dirName ? res.data.data : res.data.data.articles
      resDatas.forEach((item, index) => {
        let tempObj = {
          id: index,
          path: '/',
          name: item,
          date: '4个月前',
          outline: item
        }

        tempDatas.unshift(tempObj)
      });

      for (let key in res.data.data.directories) {
        const e = res.data.data.directories[key];
        e.articles.forEach((item, index) => {
          let tempObj = {
            id: index,
            path: key,
            name: item,
            date: '4个月前',
            outline: item
          };
          tempDatas.unshift(tempObj)
        })
      }

      // console.log("tempDatas:", tempDatas)
      setDatas(tempDatas)
    }).catch(err => console.log(err))

    // axios.get("https://zihan-page-api.vercel.app/api/getDep").then(res => {
    //   console.log(res);
    //   let tempDatas = [];
    //   res.data.data.article.forEach((item, index) => {
    //     let tempObj = {
    //       id: index,
    //       name: item,
    //       date: '4个月前',
    //       outline: item
    //     }

    //     tempDatas.push(tempObj)
    //   });

    //   setDatas(tempDatas)
    // }).catch(err => console.log(err))
  }, [axiosUrl, dirName])
  return (
    <>
    <img src={require('../../asset/headerIMG.png')} style={{width:'100%', marginBottom:'8px'}} alt='headerIMG' />
      <List
        itemLayout='vertical'
        pagination={{
          onChange: page => {
            console.log(page)
          },
          pageSize: 6,
          align: 'left'
        }}
        dataSource={datas}
        footer={null}
        renderItem={data => (
          <Link to={`/detail/${data.path}/${data.name}`}>
            <Card
              key={data.id}
              title={data.name}
              extra={data.date}
              style={{
                width: '80%',
                marginBottom: 16
              }}
              hoverable={true}
            >
              {data.outline}
            </Card>
          </Link>
        )}
      />
      <div style={{ height: 20 }}></div>
    </>
  )
}
