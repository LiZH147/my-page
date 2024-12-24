import React from 'react'
import { Avatar } from "antd";
import './index.css'

export default function MyAvatar(props) {
    const goToLink = () => {
        window.open(props.link, '_blank')
    }
    return (
        <div className='main' onClick={goToLink} >
            <Avatar size={48} src={props.avatarSrc} />
        </div>
    )
}
