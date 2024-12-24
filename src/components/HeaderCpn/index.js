import React from 'react'
import MyAvatar from "../myAvatar";
import { Avatar } from "antd";
import "./index.css"

export default function HeaderCpn() {
  const JikeAvatar = require('../../asset/JikeAvatar.png')
  return (
    <div className='headerWrapper'>
      <div className='webAvatar'>
        <Avatar style={{ marginLeft: '50px', marginRight: '10px' }} size={48} src={require('../../asset/WeixinAvatar.jpg')} />
        <span>Zihan Home</span>
      </div>
      <div className='myLinks'>
        <div className='leftBox'>
          <MyAvatar avatarSrc={JikeAvatar} link = {'https://okjk.co/ac6lkY'} />
          <MyAvatar avatarSrc={JikeAvatar} />
          <MyAvatar avatarSrc={JikeAvatar} />
        </div>
      </div>
    </div>
  )
}
