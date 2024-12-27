import React, { useEffect } from 'react'
import { Card, List } from "antd";
import axios from 'axios';
import { Link } from 'react-router-dom';

const datas = [
  {
    id: '0',
    name: 'article1',
    date: '4个月前',
    outline: 'GitHub仓库初始化 本地未git初始化文件夹提交到github仓库main分支'
  },
  {
    id: '1',
    name: 'article2',
    date: '4个月前',
    outline: 'GitHub仓库初始化 本地未git初始化文件夹提交到github仓库main分支'
  },
  {
    id: '2',
    name: 'article3',
    date: '4个月前',
    outline: 'GitHub仓库初始化 本地未git初始化文件夹提交到github仓库main分支'
  },
  {
    id: '3',
    name: 'article4',
    date: '4个月前',
    outline: 'GitHub仓库初始化 本地未git初始化文件夹提交到github仓库main分支'
  },
  {
    id: '4',
    name: 'article5',
    date: '4个月前',
    outline: 'GitHub仓库初始化 本地未git初始化文件夹提交到github仓库main分支'
  },
  {
    id: '5',
    name: 'article6',
    date: '4个月前',
    outline: 'GitHub仓库初始化 本地未git初始化文件夹提交到github仓库main分支'
  },
  {
    id: '6',
    name: 'article7',
    date: '4个月前',
    outline: 'GitHub仓库初始化 本地未git初始化文件夹提交到github仓库main分支'
  },
  {
    id: '7',
    name: 'article8',
    date: '4个月前',
    outline: 'GitHub仓库初始化 本地未git初始化文件夹提交到github仓库main分支'
  },
  {
    id: '8',
    name: 'article9',
    date: '4个月前',
    outline: 'GitHub仓库初始化 本地未git初始化文件夹提交到github仓库main分支'
  },
  {
    id: '9',
    name: 'article10',
    date: '4个月前',
    outline: 'GitHub仓库初始化 本地未git初始化文件夹提交到github仓库main分支'
  },
  {
    id: '10',
    name: 'article11',
    date: '4个月前',
    outline: 'GitHub仓库初始化 本地未git初始化文件夹提交到github仓库main分支'
  },
  {
    id: '11',
    name: 'article12',
    date: '4个月前',
    outline: 'GitHub仓库初始化 本地未git初始化文件夹提交到github仓库main分支'
  },
  {
    id: '12',
    name: 'article13',
    date: '4个月前',
    outline: 'GitHub仓库初始化 本地未git初始化文件夹提交到github仓库main分支'
  }
]

// axios.defaults.baseURL = "https://gitee.com/lizihan147/Obsidian-depository"
// axios.defaults.timeout = 5000;

export default function MainCpn() {
  useEffect(() => {
    axios.get("http://localhost:3001/api/get").then(res => {
      console.log(res);
    }).catch(err => console.log(err))
  })
  return (
    <>
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
          <Link to={`/detail/${data.id}`}>
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
