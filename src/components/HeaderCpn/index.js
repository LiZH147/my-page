import React from 'react'
import MyAvatar from "../myAvatar";
import { Avatar } from "antd";
import "./index.css"

export default function HeaderCpn() {
  const JikeAvatar = require('../../asset/JikeAvatar.png');
  const WeixinAvatar = require('../../asset/WeixinAvatar.js').WeixinAvatar;
  const QQAvatar = require('../../asset/QQAvatar.png')

  return (
    <div className='headerWrapper'>
      <div className='webAvatar'>
        <Avatar style={{ marginLeft: '50px', marginRight: '10px' }} size={48} src={require('../../asset/WeixinAvatar.jpg')} />
        <span>Zihan Home</span>
      </div>
      <div className='myLinks'>
        <div className='leftBox'>
          <MyAvatar title={'即刻'} avatarSrc={JikeAvatar} link={'https://okjk.co/ac6lkY'} />
          <MyAvatar title={'微信'} avatarSrc={WeixinAvatar} modalSrc={require('../../asset/WeixinCode.jpg')} />
          <MyAvatar title={'QQ'} avatarSrc={QQAvatar} modalSrc={require('../../asset/QQCode.jpg')} />
        </div>
      </div>
    </div>
  )
}
