import React, { useEffect, useState } from 'react'
import axios from 'axios';

export default function SiderCpn() {
  const [datas, setDatas] = useState([])

  useEffect(() => {
    axios.get("https://zihan-page-api.vercel.app/api/getDep").then(res => {
      console.log(res);
      let tempDatas = [];
      res.data.data.dir.forEach((item, index) => {
        tempDatas.push(item)
      });

      setDatas(tempDatas)
    }).catch(err => console.log(err))
  }, [])
  return (
    <div style={{ flexGrow: 1 }}>
      <ul>
        {
          datas.map(item => {
            console.log(item)
            return <li>{item}</li>
          })
        }
      </ul>
    </div>
  )
}
