import React, { useEffect, useState } from 'react'
import axios from 'axios';
import SiderLink from '../SiderLink';

export default function SiderCpn() {
  const [datas, setDatas] = useState([])

  useEffect(() => {
    axios.get("https://zihan-page-api.vercel.app/api/getDep").then(res => {
      // console.log(res);
      let tempDatas = [];
      res.data.data.dir.forEach((item, index) => {
        tempDatas.push(item)
      });

      setDatas(tempDatas)
    }).catch(err => console.log(err))
  }, [])
  return (
    <div style={{ flexGrow: 1 }}>
      <h2>分类</h2>
      <ul>
        <div>
          <SiderLink path={''} />
        </div>
        {
          datas.map((item, idx) => {
            return (
              <div>
                <SiderLink key={idx} path={item} />
              </div>
            )
          })
        }
      </ul>
    </div>
  )
}
